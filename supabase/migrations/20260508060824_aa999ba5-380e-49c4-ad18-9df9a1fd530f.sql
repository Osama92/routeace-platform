-- ============================================================
-- Phase 6: Enterprise Observability Foundation
-- ============================================================

-- 1. platform_audit_log: append-only platform-wide event log
CREATE TABLE IF NOT EXISTS public.platform_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_class text NOT NULL,        -- 'isolation_breach' | 'ld_finance_block' | 'role_change' | 'rls_smoke_failure' | 'feature_flag_change' | 'mass_action' | 'module_gate'
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  actor_user_id uuid,
  actor_email text,
  actor_role text,
  organization_id uuid,
  tenant_mode text,
  resource text,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'platform'  -- 'edge' | 'trigger' | 'rpc' | 'platform'
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_occurred_at ON public.platform_audit_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_class ON public.platform_audit_log(event_class, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_severity ON public.platform_audit_log(severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_org ON public.platform_audit_log(organization_id);

ALTER TABLE public.platform_audit_log ENABLE ROW LEVEL SECURITY;

-- Read: Core team or Super Admin only
DROP POLICY IF EXISTS "platform_audit_select_core" ON public.platform_audit_log;
CREATE POLICY "platform_audit_select_core"
  ON public.platform_audit_log
  FOR SELECT
  USING (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Insert: any authenticated user can append (the system writes events on their behalf).
-- The actor_user_id MUST equal auth.uid() OR be NULL (system-generated).
DROP POLICY IF EXISTS "platform_audit_insert_self" ON public.platform_audit_log;
CREATE POLICY "platform_audit_insert_self"
  ON public.platform_audit_log
  FOR INSERT
  WITH CHECK (actor_user_id IS NULL OR actor_user_id = auth.uid() OR public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Append-only: block updates and deletes
CREATE OR REPLACE FUNCTION public.block_platform_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'platform_audit_log is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_platform_audit_no_mutation ON public.platform_audit_log;
CREATE TRIGGER trg_platform_audit_no_mutation
  BEFORE UPDATE OR DELETE ON public.platform_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_platform_audit_mutation();

-- Helper RPC for edge functions / triggers to append safely
CREATE OR REPLACE FUNCTION public.log_platform_event(
  p_event_class text,
  p_message text,
  p_severity text DEFAULT 'info',
  p_organization_id uuid DEFAULT NULL,
  p_tenant_mode text DEFAULT NULL,
  p_resource text DEFAULT NULL,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_source text DEFAULT 'rpc'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_email text;
  v_role text;
BEGIN
  SELECT email INTO v_email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.platform_audit_log(
    event_class, severity, actor_user_id, actor_email, actor_role,
    organization_id, tenant_mode, resource, message, payload, source
  ) VALUES (
    p_event_class, p_severity, auth.uid(), v_email, v_role,
    p_organization_id, p_tenant_mode, p_resource, p_message, COALESCE(p_payload,'{}'::jsonb), p_source
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.log_platform_event(text,text,text,uuid,text,text,jsonb,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_platform_event(text,text,text,uuid,text,text,jsonb,text) TO authenticated;

-- 2. platform_feature_flags: controlled rollout switches
CREATE TABLE IF NOT EXISTS public.platform_feature_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key text NOT NULL,
  organization_id uuid,                -- NULL = global default
  enabled boolean NOT NULL DEFAULT false,
  rollout_pct int NOT NULL DEFAULT 0 CHECK (rollout_pct BETWEEN 0 AND 100),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (flag_key, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.platform_feature_flags(flag_key);

ALTER TABLE public.platform_feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read flags that apply to them (global, or their org)
DROP POLICY IF EXISTS "feature_flags_select_visible" ON public.platform_feature_flags;
CREATE POLICY "feature_flags_select_visible"
  ON public.platform_feature_flags
  FOR SELECT
  USING (
    public.is_core_team(auth.uid())
    OR public.is_super_admin(auth.uid())
    OR organization_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.organization_id = platform_feature_flags.organization_id
        AND om.is_active = true
    )
  );

-- Only Core team / Super Admin can write
DROP POLICY IF EXISTS "feature_flags_write_core" ON public.platform_feature_flags;
CREATE POLICY "feature_flags_write_core"
  ON public.platform_feature_flags
  FOR ALL
  USING (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_core_team(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Audit flag changes
CREATE OR REPLACE FUNCTION public.audit_feature_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.platform_audit_log(
    event_class, severity, actor_user_id, organization_id, resource, message, payload, source
  ) VALUES (
    'feature_flag_change',
    'warn',
    auth.uid(),
    COALESCE(NEW.organization_id, OLD.organization_id),
    COALESCE(NEW.flag_key, OLD.flag_key),
    format('Feature flag %s %s', COALESCE(NEW.flag_key, OLD.flag_key), lower(TG_OP)),
    jsonb_build_object(
      'op', TG_OP,
      'before', CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
      'after',  CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END
    ),
    'trigger'
  );
  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_feature_flag_audit ON public.platform_feature_flags;
CREATE TRIGGER trg_feature_flag_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.audit_feature_flag_change();

CREATE OR REPLACE FUNCTION public.touch_feature_flag_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_feature_flag_touch ON public.platform_feature_flags;
CREATE TRIGGER trg_feature_flag_touch
  BEFORE UPDATE ON public.platform_feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_feature_flag_updated_at();