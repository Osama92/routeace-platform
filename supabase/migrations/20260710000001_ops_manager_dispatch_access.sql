-- Grant ops_manager full SELECT/INSERT/UPDATE on dispatches.
-- ops_manager must NOT be able to DELETE dispatches.
--
-- Root cause of previous attempt failing: policies checked public.user_roles but
-- the authoritative role store for multi-tenant users is organization_members.role.
-- All checks below use organization_members directly.

-- ── dispatches SELECT ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Role-restricted dispatch view"        ON public.dispatches;
DROP POLICY IF EXISTS "dispatches_org_select"               ON public.dispatches;
DROP POLICY IF EXISTS "Org members read own dispatches"     ON public.dispatches;
DROP POLICY IF EXISTS "Customer users read own dispatches"  ON public.dispatches;

CREATE POLICY "dispatches_org_select"
  ON public.dispatches FOR SELECT TO authenticated
  USING (
    -- Org members (any active role) see their org's dispatches
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Assigned driver sees their own dispatches
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR
    -- Customer portal
    (customer_id IS NOT NULL AND public.is_customer_user_for_customer(auth.uid(), customer_id))
  );

-- Restore customer portal policy as a separate named policy
CREATE POLICY "Customer users read own dispatches"
  ON public.dispatches FOR SELECT TO authenticated
  USING (
    customer_id IS NOT NULL
    AND public.is_customer_user_for_customer(auth.uid(), customer_id)
  );

-- ── dispatches INSERT ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can insert dispatches" ON public.dispatches;

CREATE POLICY "Org members can insert dispatches"
  ON public.dispatches FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );

-- ── dispatches UPDATE ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can update dispatches" ON public.dispatches;

CREATE POLICY "Org members can update dispatches"
  ON public.dispatches FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support')
    )
  );

-- ── dispatches DELETE — ops_manager deliberately excluded ─────────────────────
DROP POLICY IF EXISTS "Org admins can delete dispatches" ON public.dispatches;

CREATE POLICY "Org admins can delete dispatches"
  ON public.dispatches FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid()
        AND is_active = true
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ── dispatch_dropoffs ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can view dispatch_dropoffs"   ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can insert dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can update dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can delete dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Authenticated users can view dropoffs"    ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Operations can manage dropoffs"           ON public.dispatch_dropoffs;

CREATE POLICY "Org members can view dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR SELECT TO authenticated
  USING (
    dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.organization_members om
        ON om.organization_id = d.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

CREATE POLICY "Org members can insert dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR INSERT TO authenticated
  WITH CHECK (
    dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.organization_members om
        ON om.organization_id = d.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );

CREATE POLICY "Org members can update dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR UPDATE TO authenticated
  USING (
    dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.organization_members om
        ON om.organization_id = d.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support')
    )
  );

CREATE POLICY "Org members can delete dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR DELETE TO authenticated
  USING (
    dispatch_id IN (
      SELECT d.id FROM public.dispatches d
      INNER JOIN public.organization_members om
        ON om.organization_id = d.organization_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
        AND om.role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );
