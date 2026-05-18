-- Harden Staff Management as an organization-scoped workforce registry.
-- Existing users are backfilled into staff and future org/user state changes keep staff status current.

-- 1) Link staff rows to app users for reliable leave/status sync.
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_user_id_unique
  ON public.staff(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_staff_org_user_status
  ON public.staff(organization_id, user_id, status);

-- 2) Backfill organization and user linkage for existing staff rows where possible.
UPDATE public.staff s
SET user_id = p.user_id,
    organization_id = COALESCE(s.organization_id, om.organization_id),
    updated_at = now()
FROM public.profiles p
LEFT JOIN public.organization_members om
  ON om.user_id = p.user_id
 AND om.is_active = true
WHERE s.user_id IS NULL
  AND s.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(s.email) = lower(p.email);

UPDATE public.staff s
SET organization_id = om.organization_id,
    updated_at = now()
FROM public.organization_members om
WHERE s.organization_id IS NULL
  AND s.created_by = om.user_id
  AND om.is_active = true;

-- 3) Backfill staff records for existing active org members that are LC/internal staff roles.
INSERT INTO public.staff (
  user_id,
  organization_id,
  full_name,
  email,
  phone,
  job_title,
  department,
  employment_type,
  salary_type,
  base_salary,
  status,
  created_by
)
SELECT
  om.user_id,
  om.organization_id,
  COALESCE(NULLIF(p.full_name, ''), p.email, 'Team member') AS full_name,
  p.email,
  p.phone,
  CASE om.role::text
    WHEN 'super_admin' THEN 'Company Owner'
    WHEN 'org_admin' THEN 'Organization Admin'
    WHEN 'admin' THEN 'Admin / Business Manager'
    WHEN 'ops_manager' THEN 'Operations Manager'
    WHEN 'operations' THEN 'Operations Manager'
    WHEN 'finance_manager' THEN 'Finance Manager'
    WHEN 'dispatcher' THEN 'Dispatcher'
    WHEN 'support' THEN 'Support'
    WHEN 'internal_team' THEN 'Internal Team'
    ELSE initcap(replace(om.role::text, '_', ' '))
  END AS job_title,
  'Operations' AS department,
  'owned' AS employment_type,
  'monthly' AS salary_type,
  0 AS base_salary,
  CASE
    WHEN p.approval_status = 'suspended' THEN 'terminated'
    WHEN EXISTS (
      SELECT 1
      FROM public.leave_requests lr
      WHERE lr.user_id = om.user_id
        AND lr.organization_id = om.organization_id
        AND lr.status = 'approved'
        AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
    ) THEN 'on_leave'
    ELSE 'active'
  END AS status,
  om.invited_by
FROM public.organization_members om
JOIN public.profiles p ON p.user_id = om.user_id
WHERE om.is_active = true
  AND om.role::text IN ('super_admin','org_admin','admin','ops_manager','operations','finance_manager','dispatcher','support','internal_team')
  AND NOT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.user_id = om.user_id
       OR (s.organization_id = om.organization_id AND s.email IS NOT NULL AND p.email IS NOT NULL AND lower(s.email) = lower(p.email))
  );

-- 4) Keep statuses accurate from approved leave windows, including return from leave.
CREATE OR REPLACE FUNCTION public.refresh_staff_status_for_user(_user_id uuid, _organization_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.staff s
  SET status = CASE
      WHEN EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = COALESCE(s.user_id, _user_id)
          AND p.approval_status = 'suspended'
      ) THEN 'terminated'
      WHEN EXISTS (
        SELECT 1
        FROM public.leave_requests lr
        WHERE lr.user_id = COALESCE(s.user_id, _user_id)
          AND (_organization_id IS NULL OR lr.organization_id = _organization_id)
          AND (s.organization_id IS NULL OR lr.organization_id = s.organization_id)
          AND lr.status = 'approved'
          AND CURRENT_DATE BETWEEN lr.start_date AND lr.end_date
      ) THEN 'on_leave'
      ELSE 'active'
    END,
    updated_at = now()
  WHERE status <> 'terminated'
    AND (
      s.user_id = _user_id
      OR (
        s.user_id IS NULL
        AND s.email IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = _user_id
            AND p.email IS NOT NULL
            AND lower(p.email) = lower(s.email)
        )
      )
    )
    AND (_organization_id IS NULL OR s.organization_id = _organization_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_staff_status_from_leave()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  v_org := COALESCE(NEW.organization_id, OLD.organization_id);
  PERFORM public.refresh_staff_status_for_user(COALESCE(NEW.user_id, OLD.user_id), v_org);

  INSERT INTO public.leave_audit_log(leave_request_id, user_id, actor_id, action, new_state)
  VALUES (
    COALESCE(NEW.id, OLD.id),
    COALESCE(NEW.user_id, OLD.user_id),
    auth.uid(),
    'staff_status_sync',
    jsonb_build_object('organization_id', v_org, 'status', COALESCE(NEW.status::text, OLD.status::text))
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_status_from_leave ON public.leave_requests;
CREATE TRIGGER trg_sync_staff_status_from_leave
  AFTER INSERT OR UPDATE OR DELETE ON public.leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_status_from_leave();

-- 5) User suspension/reactivation also flows into Staff Management.
CREATE OR REPLACE FUNCTION public.sync_staff_status_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_termination boolean;
BEGIN
  IF TG_OP = 'INSERT'
     OR OLD.approval_status IS DISTINCT FROM NEW.approval_status
     OR OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    v_is_termination := NEW.approval_status = 'suspended'
      AND COALESCE(NEW.suspension_reason, '') ~* '(terminat|resign|dismiss|exit|separat)';

    UPDATE public.staff s
    SET status = CASE
        WHEN NEW.approval_status = 'suspended' AND v_is_termination THEN 'terminated'
        WHEN NEW.approval_status = 'suspended' THEN 'terminated'
        ELSE s.status
      END,
      updated_at = now()
    WHERE s.status <> 'terminated'
      AND (
        s.user_id = NEW.user_id
        OR (
          s.user_id IS NULL
          AND s.email IS NOT NULL
          AND NEW.email IS NOT NULL
          AND lower(s.email) = lower(NEW.email)
        )
      );

    IF NEW.approval_status = 'approved' AND COALESCE(NEW.is_active, true) = true THEN
      PERFORM public.refresh_staff_status_for_user(NEW.user_id, NULL);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_status_from_profile ON public.profiles;
CREATE TRIGGER trg_sync_staff_status_from_profile
  AFTER INSERT OR UPDATE OF approval_status, is_active, suspension_reason ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_status_from_profile();

-- 6) Future org approvals/memberships create/update staff rows for LC workforce roles.
CREATE OR REPLACE FUNCTION public.sync_staff_from_org_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile record;
  v_job_title text;
BEGIN
  IF NEW.is_active = false OR NEW.role::text NOT IN ('super_admin','org_admin','admin','ops_manager','operations','finance_manager','dispatcher','support','internal_team') THEN
    RETURN NEW;
  END IF;

  SELECT user_id, email, full_name, phone, approval_status
  INTO v_profile
  FROM public.profiles
  WHERE user_id = NEW.user_id
  LIMIT 1;

  IF v_profile.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_job_title := CASE NEW.role::text
    WHEN 'super_admin' THEN 'Company Owner'
    WHEN 'org_admin' THEN 'Organization Admin'
    WHEN 'admin' THEN 'Admin / Business Manager'
    WHEN 'ops_manager' THEN 'Operations Manager'
    WHEN 'operations' THEN 'Operations Manager'
    WHEN 'finance_manager' THEN 'Finance Manager'
    WHEN 'dispatcher' THEN 'Dispatcher'
    WHEN 'support' THEN 'Support'
    WHEN 'internal_team' THEN 'Internal Team'
    ELSE initcap(replace(NEW.role::text, '_', ' '))
  END;

  INSERT INTO public.staff (
    user_id, organization_id, full_name, email, phone, job_title, department,
    employment_type, salary_type, base_salary, status, created_by
  ) VALUES (
    NEW.user_id,
    NEW.organization_id,
    COALESCE(NULLIF(v_profile.full_name, ''), v_profile.email, 'Team member'),
    v_profile.email,
    v_profile.phone,
    v_job_title,
    'Operations',
    'owned',
    'monthly',
    0,
    CASE WHEN v_profile.approval_status = 'suspended' THEN 'terminated' ELSE 'active' END,
    NEW.invited_by
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE
  SET organization_id = EXCLUDED.organization_id,
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      job_title = EXCLUDED.job_title,
      updated_at = now();

  PERFORM public.refresh_staff_status_for_user(NEW.user_id, NEW.organization_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_staff_from_org_member ON public.organization_members;
CREATE TRIGGER trg_sync_staff_from_org_member
  AFTER INSERT OR UPDATE OF role, is_active, organization_id ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_staff_from_org_member();

-- 7) Replace staff RLS with strict active-org scoping. Super Admin is org-scoped, not database-wide.
DROP POLICY IF EXISTS "Staff self read" ON public.staff;
DROP POLICY IF EXISTS "staff_finance_admin_select" ON public.staff;
DROP POLICY IF EXISTS "staff_org_directory_select" ON public.staff;
DROP POLICY IF EXISTS "staff_org_insert" ON public.staff;
DROP POLICY IF EXISTS "staff_org_update" ON public.staff;
DROP POLICY IF EXISTS "staff_role_org_write" ON public.staff;
DROP POLICY IF EXISTS "staff_org_delete" ON public.staff;
DROP POLICY IF EXISTS "Role-restricted staff access" ON public.staff;
DROP POLICY IF EXISTS "Admins and ops can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins and ops can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;
DROP POLICY IF EXISTS "Users with roles can view staff" ON public.staff;

CREATE POLICY "staff_self_read"
ON public.staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR (email IS NOT NULL AND email = public.current_user_email()));

CREATE POLICY "staff_org_scoped_select"
ON public.staff
FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "staff_org_scoped_insert"
ON public.staff
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
);

CREATE POLICY "staff_org_scoped_update"
ON public.staff
FOR UPDATE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
  )
)
WITH CHECK (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
);

CREATE POLICY "staff_org_scoped_delete"
ON public.staff
FOR DELETE
TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.is_org_member(auth.uid(), organization_id)
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 8) Keep staff_salaries org-aware where the column exists.
UPDATE public.staff_salaries ss
SET organization_id = s.organization_id
FROM public.staff s
WHERE ss.staff_id = s.id
  AND ss.organization_id IS NULL
  AND s.organization_id IS NOT NULL;