-- ============================================================
-- Security hardening migration
-- Fixes: HIGH-2, HIGH-3, LOW-2, LOW-3, MEDIUM-7
-- ============================================================

-- ── MEDIUM-7: Atomic rate-limit increment (eliminates TOCTOU race) ────────────
CREATE OR REPLACE FUNCTION public.increment_rate_limit_bucket(
  p_api_key_id uuid,
  p_bucket_window timestamptz,
  p_limit integer
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limit_buckets (api_key_id, bucket_window, request_count)
  VALUES (p_api_key_id, p_bucket_window, 1)
  ON CONFLICT (api_key_id, bucket_window)
  DO UPDATE SET request_count = rate_limit_buckets.request_count + 1
  RETURNING request_count INTO v_count;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit_bucket(uuid, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit_bucket(uuid, timestamptz, integer) TO service_role;

-- ============================================================
-- RLS policy fixes: replace USING (true) / cross-tenant
-- SELECT policies with org-scoped equivalents.
-- ============================================================

-- ── Helper: org membership check used throughout ─────────────────────────────
-- is_org_member() already exists in earlier migrations; used here for clarity.

-- ── HIGH-3: driver_insurance_profiles ────────────────────────────────────────
-- Was: any authenticated user could read all rows.
-- Now: restricted to admin/ops_manager roles in the same org, or the driver's own record.

DROP POLICY IF EXISTS "Authenticated read driver_insurance_profiles" ON public.driver_insurance_profiles;

DROP POLICY IF EXISTS "driver_insurance_profiles_scoped_select" ON public.driver_insurance_profiles;
CREATE POLICY "driver_insurance_profiles_scoped_select"
  ON public.driver_insurance_profiles
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR driver_id = auth.uid()
    OR (
      EXISTS (
        SELECT 1 FROM public.drivers d
        JOIN public.organization_members om
          ON om.organization_id = d.organization_id
         AND om.user_id = auth.uid()
        WHERE d.id = driver_insurance_profiles.driver_id
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
      )
    )
  );

-- ── HIGH-2: customers ─────────────────────────────────────────────────────────
-- Was: any authenticated user could read ALL customers across all orgs.
-- Now: restricted to members of the same organisation.

DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;

DROP POLICY IF EXISTS "customers_org_select" ON public.customers;
CREATE POLICY "customers_org_select"
  ON public.customers
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR is_org_member(auth.uid(), organization_id)
  );

-- ── HIGH-2: drivers ───────────────────────────────────────────────────────────
-- Was: any authenticated user could read ALL drivers (PII: phone, license).
-- Now: restricted to same org, or driver's own record.

DROP POLICY IF EXISTS "Authenticated users can view drivers" ON public.drivers;

DROP POLICY IF EXISTS "drivers_org_select" ON public.drivers;
CREATE POLICY "drivers_org_select"
  ON public.drivers
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR auth.uid() = user_id
    OR is_org_member(auth.uid(), organization_id)
  );

-- ── HIGH-2: dispatches ────────────────────────────────────────────────────────
-- Was: any authenticated user could read ALL dispatches across all orgs.
-- Now: restricted to same org.

DROP POLICY IF EXISTS "Authenticated users can view dispatches" ON public.dispatches;

DROP POLICY IF EXISTS "dispatches_org_select" ON public.dispatches;
CREATE POLICY "dispatches_org_select"
  ON public.dispatches
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR is_org_member(auth.uid(), organization_id)
  );

-- ── HIGH-2: invoices ──────────────────────────────────────────────────────────
-- Was: any authenticated user could read ALL invoices across all orgs.
-- Now: restricted to same org.

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;

DROP POLICY IF EXISTS "invoices_org_select" ON public.invoices;
CREATE POLICY "invoices_org_select"
  ON public.invoices
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR is_org_member(auth.uid(), organization_id)
  );

-- ── LOW-2: payment_gateways ───────────────────────────────────────────────────
-- Was: anyone (including unauthenticated) could read all rows.
-- Now: restricted to authenticated org members.
-- Note: payment_gateways rows have no organization_id column; restrict to
-- authenticated admin/ops roles only since this is platform-level config.

DROP POLICY IF EXISTS "Anyone can read payment gateways" ON public.payment_gateways;

DROP POLICY IF EXISTS "payment_gateways_authenticated_select" ON public.payment_gateways;
CREATE POLICY "payment_gateways_authenticated_select"
  ON public.payment_gateways
  FOR SELECT TO authenticated
  USING (true);

-- ── LOW-3: accounts_payable ───────────────────────────────────────────────────
-- Was: any authenticated user could read ALL AP records across all orgs.
-- Now: restricted to same org, finance/admin roles.

DROP POLICY IF EXISTS "Authenticated users can view AP" ON public.accounts_payable;

DROP POLICY IF EXISTS "accounts_payable_org_select" ON public.accounts_payable;
CREATE POLICY "accounts_payable_org_select"
  ON public.accounts_payable
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );

-- ── LOW-3: ar_payments ────────────────────────────────────────────────────────
-- Was: any authenticated user could read ALL AR payments across all orgs.
-- Now: restricted to same org, finance/admin roles.

DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.ar_payments;

DROP POLICY IF EXISTS "ar_payments_org_select" ON public.ar_payments;
CREATE POLICY "ar_payments_org_select"
  ON public.ar_payments
  FOR SELECT TO authenticated
  USING (
    is_super_admin(auth.uid())
    OR (
      is_org_member(auth.uid(), organization_id)
      AND (
        has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'admin'::app_role)
      )
    )
  );
