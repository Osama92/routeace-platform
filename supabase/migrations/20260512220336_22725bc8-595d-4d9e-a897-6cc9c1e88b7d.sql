
-- 1. Add new status value
ALTER TYPE public.leave_status ADD VALUE IF NOT EXISTS 'pending_super_admin' BEFORE 'approved';

-- 2. Per-role allocation defaults
CREATE TABLE IF NOT EXISTS public.role_leave_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  annual_days int NOT NULL DEFAULT 21,
  sick_days int NOT NULL DEFAULT 12,
  emergency_days int NOT NULL DEFAULT 5,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS role_leave_defaults_org_role_uniq
  ON public.role_leave_defaults (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), role);

ALTER TABLE public.role_leave_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rld_read" ON public.role_leave_defaults
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "rld_admin_write" ON public.role_leave_defaults
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'admin'))
  WITH CHECK (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_rld_updated BEFORE UPDATE ON public.role_leave_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed global defaults
INSERT INTO public.role_leave_defaults (organization_id, role, annual_days, sick_days, emergency_days) VALUES
  (NULL, 'super_admin', 30, 12, 8),
  (NULL, 'org_admin',   21, 12, 5),
  (NULL, 'ops_manager', 20, 12, 5),
  (NULL, 'finance_manager', 21, 12, 5),
  (NULL, 'admin',       21, 12, 5),
  (NULL, 'dispatcher',  18, 12, 5),
  (NULL, 'driver',      15, 10, 5),
  (NULL, 'support',     18, 12, 5),
  (NULL, 'customer',    0,  0,  0)
ON CONFLICT DO NOTHING;

-- 3. Updated ensure_leave_balance: use role defaults first
CREATE OR REPLACE FUNCTION public.ensure_leave_balance(p_user_id uuid, p_org_id uuid, p_year integer)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_def public.role_leave_defaults%ROWTYPE;
  v_policy public.leave_policies%ROWTYPE;
  v_annual int; v_sick int; v_emerg int;
BEGIN
  SELECT role INTO v_role FROM public.user_roles
    WHERE user_id = p_user_id
    ORDER BY CASE role
      WHEN 'super_admin' THEN 1 WHEN 'org_admin' THEN 2
      WHEN 'admin' THEN 3 WHEN 'ops_manager' THEN 4
      WHEN 'finance_manager' THEN 5 ELSE 9 END
    LIMIT 1;

  IF v_role IS NOT NULL THEN
    SELECT * INTO v_def FROM public.role_leave_defaults
      WHERE role = v_role
        AND (organization_id = p_org_id OR organization_id IS NULL)
      ORDER BY (organization_id IS NULL) ASC LIMIT 1;
  END IF;

  IF v_def.id IS NULL THEN
    SELECT * INTO v_policy FROM public.leave_policies
      WHERE organization_id IS NOT DISTINCT FROM p_org_id LIMIT 1;
    IF NOT FOUND THEN
      SELECT * INTO v_policy FROM public.leave_policies WHERE organization_id IS NULL LIMIT 1;
    END IF;
    v_annual := COALESCE(v_policy.default_annual_days, 21);
    v_sick   := COALESCE(v_policy.default_sick_days, 12);
    v_emerg  := COALESCE(v_policy.default_emergency_days, 5);
  ELSE
    v_annual := v_def.annual_days;
    v_sick   := v_def.sick_days;
    v_emerg  := v_def.emergency_days;
  END IF;

  INSERT INTO public.leave_balances(user_id, organization_id, year, leave_type, allocated_days)
  VALUES
    (p_user_id, p_org_id, p_year, 'annual', v_annual),
    (p_user_id, p_org_id, p_year, 'sick', v_sick),
    (p_user_id, p_org_id, p_year, 'emergency', v_emerg)
  ON CONFLICT (user_id, year, leave_type) DO NOTHING;
END $$;

-- 4. Backfill all existing org members for the current year
DO $$
DECLARE r record; v_year int := EXTRACT(YEAR FROM CURRENT_DATE);
BEGIN
  FOR r IN
    SELECT DISTINCT om.user_id, om.organization_id
    FROM public.organization_members om
    WHERE om.is_active = true
  LOOP
    PERFORM public.ensure_leave_balance(r.user_id, r.organization_id, v_year);
  END LOOP;
END $$;

-- 5. Update validation trigger for two-stage flow
CREATE OR REPLACE FUNCTION public.validate_and_log_leave_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_balance public.leave_balances%ROWTYPE;
  v_year int := EXTRACT(YEAR FROM NEW.start_date);
BEGIN
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
    -- Final approval: only when reaching 'approved'
    IF NEW.status = 'approved' THEN
      UPDATE public.leave_balances
        SET pending_days = GREATEST(0, pending_days - NEW.total_days),
            used_days = used_days + NEW.total_days,
            updated_at = now()
        WHERE user_id = NEW.user_id AND year = v_year AND leave_type = NEW.leave_type;
    END IF;
    -- Rejection / cancellation at any stage releases pending
    IF NEW.status IN ('rejected','cancelled')
       AND OLD.status IN ('pending','pending_super_admin','modification_requested') THEN
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

-- 6. Editor RPC for super_admin / org_admin
CREATE OR REPLACE FUNCTION public.set_user_leave_allocation(
  target_user_id uuid,
  p_leave_type public.leave_type,
  p_allocated_days int,
  p_year int DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year int := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
  v_org uuid;
BEGIN
  IF NOT (has_role(auth.uid(),'super_admin') OR has_role(auth.uid(),'org_admin') OR has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Only Super Admin or Organization Admin can edit leave allocations';
  END IF;
  IF p_allocated_days < 0 OR p_allocated_days > 365 THEN
    RAISE EXCEPTION 'allocated_days out of range';
  END IF;

  SELECT organization_id INTO v_org FROM public.organization_members
    WHERE user_id = target_user_id AND is_active = true LIMIT 1;

  PERFORM public.ensure_leave_balance(target_user_id, v_org, v_year);

  UPDATE public.leave_balances
    SET allocated_days = p_allocated_days, updated_at = now()
    WHERE user_id = target_user_id AND year = v_year AND leave_type = p_leave_type;

  INSERT INTO public.leave_audit_log(user_id, actor_id, action, new_state)
  VALUES (target_user_id, auth.uid(), 'allocation_edited',
    jsonb_build_object('leave_type', p_leave_type, 'allocated_days', p_allocated_days, 'year', v_year));
END $$;

-- 7. Update approval policy to 2 levels
UPDATE public.approval_policies
   SET approval_levels_required = 2,
       roles_allowed = ARRAY['super_admin','org_admin']::text[],
       requires_super_admin_override = true
 WHERE entity_type = 'leave_request';
