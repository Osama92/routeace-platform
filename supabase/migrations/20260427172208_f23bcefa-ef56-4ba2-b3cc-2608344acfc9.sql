
-- ============================================================
-- WORKFORCE LEAVE SYSTEM (Modules 2-6)
-- ============================================================

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE public.leave_type AS ENUM ('annual', 'sick', 'emergency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'modification_requested');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.leave_impact_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. LEAVE POLICIES (per-org defaults)
CREATE TABLE IF NOT EXISTS public.leave_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  default_annual_days int NOT NULL DEFAULT 21,
  default_sick_days int NOT NULL DEFAULT 12,
  default_emergency_days int NOT NULL DEFAULT 5,
  auto_approve_low_impact boolean NOT NULL DEFAULT false,
  allow_admin_override boolean NOT NULL DEFAULT true,
  annual_pay_rate numeric(5,2) NOT NULL DEFAULT 100.00,
  sick_pay_rate numeric(5,2) NOT NULL DEFAULT 100.00,
  emergency_pay_rate numeric(5,2) NOT NULL DEFAULT 50.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- 3. LEAVE BALANCES (per user, per year)
CREATE TABLE IF NOT EXISTS public.leave_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  year int NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  leave_type leave_type NOT NULL,
  allocated_days int NOT NULL DEFAULT 0,
  used_days numeric(5,1) NOT NULL DEFAULT 0,
  pending_days numeric(5,1) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year, leave_type)
);

CREATE INDEX IF NOT EXISTS idx_leave_balances_user ON public.leave_balances(user_id, year);

-- 4. LEAVE REQUESTS
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  total_days numeric(5,1) NOT NULL,
  reason text NOT NULL,
  status leave_status NOT NULL DEFAULT 'pending',
  impact_level leave_impact_level,
  impact_details jsonb DEFAULT '{}'::jsonb,
  active_dispatches_count int DEFAULT 0,
  open_tickets_count int DEFAULT 0,
  reassignment_confirmed boolean NOT NULL DEFAULT false,
  admin_override boolean NOT NULL DEFAULT false,
  override_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  CHECK (total_days > 0)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);

-- 5. REASSIGNMENT SUGGESTIONS
CREATE TABLE IF NOT EXISTS public.leave_reassignment_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid NOT NULL REFERENCES public.leave_requests(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  resource_label text,
  suggested_assignee_id uuid,
  suggested_assignee_label text,
  status text NOT NULL DEFAULT 'pending',
  confirmed_at timestamptz,
  confirmed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (resource_type IN ('dispatch','support_ticket','driver_trip')),
  CHECK (status IN ('pending','confirmed','rejected','executed'))
);

CREATE INDEX IF NOT EXISTS idx_reassign_request ON public.leave_reassignment_suggestions(leave_request_id);

-- 6. AUDIT LOG (read-only)
CREATE TABLE IF NOT EXISTS public.leave_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  leave_request_id uuid REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  user_id uuid,
  actor_id uuid,
  action text NOT NULL,
  old_state jsonb,
  new_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_audit_request ON public.leave_audit_log(leave_request_id, created_at DESC);

-- 7. ENABLE RLS
ALTER TABLE public.leave_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_reassignment_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_audit_log ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES

-- leave_policies: admins manage, all authenticated read
CREATE POLICY "policies_read_all" ON public.leave_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "policies_admin_write" ON public.leave_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

-- leave_balances: own + admins/managers
CREATE POLICY "balances_self_read" ON public.leave_balances FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'org_admin')
    OR public.has_role(auth.uid(),'ops_manager')
    OR public.has_role(auth.uid(),'finance_manager'));
CREATE POLICY "balances_admin_write" ON public.leave_balances FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

-- leave_requests: own + admins/managers read; user creates own; admins approve/reject
CREATE POLICY "requests_select" ON public.leave_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'org_admin')
    OR public.has_role(auth.uid(),'ops_manager')
    OR public.has_role(auth.uid(),'finance_manager'));
CREATE POLICY "requests_insert_own" ON public.leave_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests_update_own_pending" ON public.leave_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "requests_admin_update" ON public.leave_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin'));

-- reassignment suggestions
CREATE POLICY "reassign_select" ON public.leave_reassignment_suggestions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.leave_requests lr WHERE lr.id = leave_request_id AND (
    lr.user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
    OR public.has_role(auth.uid(),'org_admin')
    OR public.has_role(auth.uid(),'ops_manager'))));
CREATE POLICY "reassign_admin_write" ON public.leave_reassignment_suggestions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin') OR public.has_role(auth.uid(),'ops_manager'));

-- audit log: read-only for admins; system writes via SECURITY DEFINER trigger
CREATE POLICY "audit_admin_read" ON public.leave_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin') OR public.has_role(auth.uid(),'org_admin')
    OR user_id = auth.uid());

-- 9. TRIGGERS

-- Auto-create balances for new user (on first leave request) helper
CREATE OR REPLACE FUNCTION public.ensure_leave_balance(p_user_id uuid, p_org_id uuid, p_year int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy public.leave_policies%ROWTYPE;
BEGIN
  SELECT * INTO v_policy FROM public.leave_policies WHERE organization_id IS NOT DISTINCT FROM p_org_id LIMIT 1;
  IF NOT FOUND THEN
    SELECT * INTO v_policy FROM public.leave_policies WHERE organization_id IS NULL LIMIT 1;
  END IF;

  INSERT INTO public.leave_balances(user_id, organization_id, year, leave_type, allocated_days)
  VALUES
    (p_user_id, p_org_id, p_year, 'annual', COALESCE(v_policy.default_annual_days, 21)),
    (p_user_id, p_org_id, p_year, 'sick', COALESCE(v_policy.default_sick_days, 12)),
    (p_user_id, p_org_id, p_year, 'emergency', COALESCE(v_policy.default_emergency_days, 5))
  ON CONFLICT (user_id, year, leave_type) DO NOTHING;
END $$;

-- Validate balance + log on insert/update
CREATE OR REPLACE FUNCTION public.validate_and_log_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance public.leave_balances%ROWTYPE;
  v_year int := EXTRACT(YEAR FROM NEW.start_date);
BEGIN
  -- Ensure balance row exists
  PERFORM public.ensure_leave_balance(NEW.user_id, NEW.organization_id, v_year);

  SELECT * INTO v_balance FROM public.leave_balances
  WHERE user_id = NEW.user_id AND year = v_year AND leave_type = NEW.leave_type;

  IF TG_OP = 'INSERT' THEN
    IF NOT NEW.admin_override AND (v_balance.allocated_days - v_balance.used_days - v_balance.pending_days) < NEW.total_days THEN
      RAISE EXCEPTION 'Insufficient % leave balance: % days available, % requested',
        NEW.leave_type,
        (v_balance.allocated_days - v_balance.used_days - v_balance.pending_days),
        NEW.total_days;
    END IF;

    UPDATE public.leave_balances
    SET pending_days = pending_days + NEW.total_days, updated_at = now()
    WHERE id = v_balance.id;

    INSERT INTO public.leave_audit_log(leave_request_id, user_id, actor_id, action, new_state)
    VALUES (NEW.id, NEW.user_id, auth.uid(), 'created', to_jsonb(NEW));
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- Approved: move pending -> used
    IF NEW.status = 'approved' THEN
      UPDATE public.leave_balances
      SET pending_days = GREATEST(0, pending_days - NEW.total_days),
          used_days = used_days + NEW.total_days,
          updated_at = now()
      WHERE user_id = NEW.user_id AND year = v_year AND leave_type = NEW.leave_type;
    END IF;
    -- Rejected/cancelled: release pending
    IF NEW.status IN ('rejected','cancelled') AND OLD.status = 'pending' THEN
      UPDATE public.leave_balances
      SET pending_days = GREATEST(0, pending_days - NEW.total_days), updated_at = now()
      WHERE user_id = NEW.user_id AND year = v_year AND leave_type = NEW.leave_type;
    END IF;

    INSERT INTO public.leave_audit_log(leave_request_id, user_id, actor_id, action, old_state, new_state)
    VALUES (NEW.id, NEW.user_id, auth.uid(), 'status_changed:' || NEW.status,
      jsonb_build_object('status', OLD.status), jsonb_build_object('status', NEW.status, 'reviewer', NEW.reviewed_by, 'notes', NEW.review_notes));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_validate_leave_request ON public.leave_requests;
CREATE TRIGGER trg_validate_leave_request
  BEFORE INSERT OR UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_and_log_leave_request();

-- Block updates/deletes on audit log
CREATE OR REPLACE FUNCTION public.block_leave_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'leave_audit_log is append-only';
END $$;

DROP TRIGGER IF EXISTS trg_block_leave_audit ON public.leave_audit_log;
CREATE TRIGGER trg_block_leave_audit
  BEFORE UPDATE OR DELETE ON public.leave_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_leave_audit_mutation();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_leave_policies_updated ON public.leave_policies;
CREATE TRIGGER trg_leave_policies_updated BEFORE UPDATE ON public.leave_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leave_balances_updated ON public.leave_balances;
CREATE TRIGGER trg_leave_balances_updated BEFORE UPDATE ON public.leave_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_leave_requests_updated ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10. Seed a default global policy (org_id = NULL fallback)
INSERT INTO public.leave_policies (organization_id, default_annual_days, default_sick_days, default_emergency_days)
SELECT NULL, 21, 12, 5
WHERE NOT EXISTS (SELECT 1 FROM public.leave_policies WHERE organization_id IS NULL);
