-- Fix 1: enterprise_audit_capture — "column k does not exist" on dispatches UPDATE
-- jsonb_each() returns columns named `key` and `value`, not `k`.
-- Trigger functions in PostgreSQL cannot have declared parameters —
-- arguments are read from TG_ARGV[]. The original function had the same signature.

CREATE OR REPLACE FUNCTION public.enterprise_audit_capture()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_domain    text := COALESCE(TG_ARGV[0], 'other');
  v_org_col   text := COALESCE(TG_ARGV[1], 'organization_id');
  v_action    text := lower(TG_OP);
  v_old       jsonb;
  v_new       jsonb;
  v_org       uuid;
  v_record_id uuid;
  v_email     text;
  v_role      text;
  v_diff      text[];
BEGIN
  IF TG_OP <> 'INSERT' THEN v_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_new := to_jsonb(NEW); END IF;

  BEGIN v_org := (COALESCE(v_new, v_old) ->> v_org_col)::uuid; EXCEPTION WHEN OTHERS THEN v_org := NULL; END;
  BEGIN v_record_id := (COALESCE(v_new, v_old) ->> 'id')::uuid; EXCEPTION WHEN OTHERS THEN v_record_id := NULL; END;

  IF v_old IS NOT NULL AND v_new IS NOT NULL THEN
    -- Fix: jsonb_each returns column `key`, not `k`
    SELECT array_agg(key) INTO v_diff
    FROM jsonb_each(v_new)
    WHERE v_new->key IS DISTINCT FROM v_old->key;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.enterprise_audit_log(
    domain, table_name, record_id, action, organization_id,
    actor_user_id, actor_email, actor_role,
    before_data, after_data, diff_keys, source
  ) VALUES (
    v_domain, TG_TABLE_NAME, v_record_id, v_action, v_org,
    auth.uid(), v_email, v_role,
    v_old, v_new, COALESCE(v_diff, '{}'::text[]), 'trigger'
  );
  RETURN COALESCE(NEW, OLD);
END $$;


-- ─── Fix 2: dispatches UPDATE RLS — replace JWT claim with user_roles table ───
-- Handles both tenant types:
--   Logistics Company  → organisation_members
--   Logistics Dept     → profiles.organization_id
-- Also ensures org_admin can approve/reject dispatches.

DROP POLICY IF EXISTS "Org members can update dispatches" ON public.dispatches;

CREATE POLICY "Org members can update dispatches"
  ON public.dispatches FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support')
    )
  );

-- Also fix dispatches INSERT RLS for both tenant types
DROP POLICY IF EXISTS "Org members can insert dispatches" ON public.dispatches;

CREATE POLICY "Org members can insert dispatches"
  ON public.dispatches FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );

-- Also fix dispatches DELETE RLS
DROP POLICY IF EXISTS "Org admins can delete dispatches" ON public.dispatches;

CREATE POLICY "Org admins can delete dispatches"
  ON public.dispatches FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );


-- ─── Fix 3: expense RLS — replace JWT claim with user_roles table ─────────────
-- Covers both Logistics Company and Logistics Department users.

DROP POLICY IF EXISTS "Org members can insert expenses" ON public.expenses;

CREATE POLICY "Org members can insert expenses"
  ON public.expenses FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Org members can update expenses" ON public.expenses;

CREATE POLICY "Org members can update expenses"
  ON public.expenses FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager')
    )
  );

DROP POLICY IF EXISTS "Org admins can delete expenses" ON public.expenses;

CREATE POLICY "Org admins can delete expenses"
  ON public.expenses FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- Fix expense SELECT RLS for both tenant types
DROP POLICY IF EXISTS "Org members can view expenses" ON public.expenses;

CREATE POLICY "Org members can view expenses"
  ON public.expenses FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
  );


-- ─── Fix 4: invoice RLS for both tenant types ─────────────────────────────────
-- 20260529000000 used only organization_members; Logistics Dept users are
-- tracked via profiles instead, so those updates were blocked.

DROP POLICY IF EXISTS "Org members can insert invoices" ON public.invoices;

CREATE POLICY "Org members can insert invoices"
  ON public.invoices FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Org members can update invoices" ON public.invoices;

CREATE POLICY "Org members can update invoices"
  ON public.invoices FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'finance_manager', 'operations')
    )
  );

DROP POLICY IF EXISTS "Org admins can delete invoices" ON public.invoices;

CREATE POLICY "Org admins can delete invoices"
  ON public.invoices FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
      UNION
      SELECT organization_id FROM public.profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );


-- ─── Fix 5: vehicle quota trigger — vehicle_quota is on organizations, not tenant_config ──
-- Migration 20260512064148 added vehicle_quota to organizations table.
-- The check_vehicle_quota function incorrectly queried it from tenant_config.

CREATE OR REPLACE FUNCTION public.check_vehicle_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_max   INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.vehicles
  WHERE organization_id = NEW.organization_id;

  -- max_vehicles from tenant_config is the plan limit;
  -- vehicle_quota on organizations is a legacy per-org override.
  -- Take the higher of the two so a manual override is never silently ignored.
  SELECT GREATEST(
    COALESCE(tc.max_vehicles, 9999),
    COALESCE(o.vehicle_quota, 0)
  ) INTO v_max
  FROM public.tenant_config tc
  JOIN public.organizations o ON o.id = NEW.organization_id
  WHERE tc.organization_id = NEW.organization_id;

  -- If no tenant_config row exists yet, default to permissive
  IF v_max IS NULL THEN
    v_max := 9999;
  END IF;

  IF v_max > 0 AND v_count >= v_max THEN
    RAISE EXCEPTION 'Vehicle quota exceeded (% of % used). Upgrade your plan.', v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

-- Re-attach trigger (DROP IF EXISTS is idempotent)
DROP TRIGGER IF EXISTS trg_check_vehicle_quota ON public.vehicles;
CREATE TRIGGER trg_check_vehicle_quota
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.check_vehicle_quota();


-- ─── Fix 6: dispatch_plans UPDATE RLS — ensure org_admin can approve plans ────
-- The DispatchApprovalPanel also writes to dispatch_plans; add an explicit UPDATE policy.

DROP POLICY IF EXISTS "Org admins can update dispatch_plans" ON public.dispatch_plans;

CREATE POLICY "Org admins can update dispatch_plans"
  ON public.dispatch_plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager')
    )
  );
