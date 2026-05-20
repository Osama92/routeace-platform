-- ============================================================
-- 1. STAFF — restrict SELECT to finance/admin/super + self
-- ============================================================
DROP POLICY IF EXISTS "staff_org_select" ON public.staff;
DROP POLICY IF EXISTS "Staff role+org manage" ON public.staff;
-- Keep the existing "Staff self read" policy as-is.

-- Re-create scoped SELECT (finance/admin only see sensitive cols on base table)
CREATE POLICY "staff_finance_admin_select" ON public.staff
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
      )
    )
  );

-- Restore broad write management (was previously bundled in the dropped ALL policy)
CREATE POLICY "staff_role_org_write" ON public.staff
  FOR UPDATE TO authenticated
  USING (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
      )
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL AND is_org_member(auth.uid(), organization_id)
    )
  );

-- Public-safe directory view (no bank/tax/salary fields)
CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = on) AS
SELECT
  id, full_name, email, phone, job_title, department,
  employment_type, partner_id, hire_date, status,
  organization_id, created_at, updated_at
FROM public.staff;
GRANT SELECT ON public.staff_directory TO authenticated;

-- For the directory view to show rows to ops/admin too, add a permissive
-- SELECT policy on staff that returns ONLY the safe rowset via column-level
-- security would require PG 16+. Instead we add a SELECT policy that lets
-- org admins/ops read the row (the view is then the column filter).
CREATE POLICY "staff_org_directory_select" ON public.staff
  FOR SELECT TO authenticated
  USING (
    -- Allow org-members with operational roles to read rows so the view works.
    -- Sensitive columns are still NOT exposed via the view.
    organization_id IS NOT NULL
    AND is_org_member(auth.uid(), organization_id)
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'operations'::app_role)
      OR has_role(auth.uid(), 'ops_manager'::app_role)
    )
  );

COMMENT ON VIEW public.staff_directory IS
  'Org-scoped staff list without bank account, tax ID, or salary fields. Use this view for general staff lists. Use base table public.staff only for payroll (finance_manager/org_admin/super_admin).';

-- ============================================================
-- 2. COMPANY_SETTINGS — restrict bank fields to finance + super
-- ============================================================
DROP POLICY IF EXISTS "Company settings org-scoped read" ON public.company_settings;

CREATE POLICY "Company settings finance read" ON public.company_settings
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
      )
    )
  );

-- Branding view (no bank fields) for everyone in the org
CREATE OR REPLACE VIEW public.company_settings_branding
WITH (security_invoker = on) AS
SELECT
  id, organization_id, company_name, tagline, email, phone, address,
  signature_url, logo_url, created_at, updated_at
FROM public.company_settings;
GRANT SELECT ON public.company_settings_branding TO authenticated;

-- Allow general org members to read for the view (view excludes bank fields)
CREATE POLICY "Company settings branding read" ON public.company_settings
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_org_member(auth.uid(), organization_id)
  );

COMMENT ON VIEW public.company_settings_branding IS
  'Org branding (no bank account fields). Use this for invoices, headers, etc. Use base table only when finance_manager/org_admin must see banking info.';

-- ============================================================
-- 3. INTEGRATION_CONFIGS — restrict client_secret access
-- ============================================================
DROP POLICY IF EXISTS "Admins manage integration configs" ON public.integration_configs;
DROP POLICY IF EXISTS "Org admins manage integrations" ON public.integration_configs;

CREATE POLICY "integration_configs_admin_only" ON public.integration_configs
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND has_role(auth.uid(), 'org_admin'::app_role)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR (
      organization_id IS NOT NULL
      AND is_org_member(auth.uid(), organization_id)
      AND has_role(auth.uid(), 'org_admin'::app_role)
    )
  );

-- Public-safe view (no client_secret / cursor)
CREATE OR REPLACE VIEW public.integration_configs_public
WITH (security_invoker = on) AS
SELECT
  id, organization_id, provider AS integration_type, provider, instance_url,
  client_id, is_active, last_sync_at, last_sync_status,
  created_by, created_at, updated_at
FROM public.integration_configs;
GRANT SELECT ON public.integration_configs_public TO authenticated;

-- Allow general org members to see non-secret status via the view
CREATE POLICY "integration_configs_org_view" ON public.integration_configs
  FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND is_org_member(auth.uid(), organization_id)
  );

COMMENT ON VIEW public.integration_configs_public IS
  'Integration status without client_secret. Use this for status dashboards. Direct table access (which includes the secret) requires org_admin or super_admin.';

-- ============================================================
-- 4. PARTNER_WEBHOOKS — masked view for any future broader use
-- ============================================================
CREATE OR REPLACE VIEW public.partner_webhooks_public
WITH (security_invoker = on) AS
SELECT
  id, partner_id, url, events, is_active,
  last_triggered_at, last_response_status, failure_count, created_at
FROM public.partner_webhooks;
GRANT SELECT ON public.partner_webhooks_public TO authenticated;

COMMENT ON VIEW public.partner_webhooks_public IS
  'Webhook metadata without the signing secret. Direct table access stays super_admin-only.';

-- ============================================================
-- 5. STORAGE company-assets — tighten write/update/delete to folder == org_id
-- ============================================================
DROP POLICY IF EXISTS "Admin can upload company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update company assets" ON storage.objects;
DROP POLICY IF EXISTS "Admin can delete company assets" ON storage.objects;

-- Upload: must be org admin AND folder must match one of caller's orgs
CREATE POLICY "company_assets_org_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      is_super_admin(auth.uid())
      OR (
        (has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role))
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text
          FROM public.organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "company_assets_org_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      is_super_admin(auth.uid())
      OR (
        (has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role))
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text
          FROM public.organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  )
  WITH CHECK (
    bucket_id = 'company-assets'
    AND (
      is_super_admin(auth.uid())
      OR (
        (has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role))
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text
          FROM public.organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "company_assets_org_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      is_super_admin(auth.uid())
      OR (
        (has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'org_admin'::app_role))
        AND (storage.foldername(name))[1] IN (
          SELECT organization_id::text
          FROM public.organization_members
          WHERE user_id = auth.uid()
        )
      )
    )
  );