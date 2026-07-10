-- Grant ops_manager full SELECT/INSERT/UPDATE on dispatches and related tables.
-- ops_manager must NOT be able to DELETE dispatches (delete stays admin/super_admin/org_admin only).
--
-- Current state after prior migrations:
--   SELECT  → dispatches_org_select (is_org_member, no role gate) — already correct
--   INSERT  → Org members can insert dispatches — already includes ops_manager
--   UPDATE  → Org members can update dispatches — already includes ops_manager
--   DELETE  → Org admins can delete dispatches — correctly excludes ops_manager
--
-- The old "Role-restricted dispatch view" policy (from 20260128081455) did not include
-- ops_manager and may still exist alongside dispatches_org_select. Drop it to prevent
-- any ambiguity, and re-assert the correct SELECT, INSERT, UPDATE policies explicitly.

-- ── dispatches SELECT ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Role-restricted dispatch view" ON public.dispatches;
DROP POLICY IF EXISTS "dispatches_org_select" ON public.dispatches;

CREATE POLICY "dispatches_org_select"
  ON public.dispatches FOR SELECT TO authenticated
  USING (
    -- Super admins see all
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
    OR
    -- All org members (any role) see their own org's dispatches
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR
    -- Assigned driver sees their dispatches
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
    OR
    -- Customer portal users see their own dispatches
    (customer_id IS NOT NULL AND public.is_customer_user_for_customer(auth.uid(), customer_id))
  );

-- ── dispatches INSERT ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Org members can insert dispatches" ON public.dispatches;

CREATE POLICY "Org members can insert dispatches"
  ON public.dispatches FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
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
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support')
    )
  );

-- ── dispatches DELETE ─────────────────────────────────────────────────────────
-- ops_manager deliberately excluded — only admin-tier roles may delete.
DROP POLICY IF EXISTS "Org admins can delete dispatches" ON public.dispatches;

CREATE POLICY "Org admins can delete dispatches"
  ON public.dispatches FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ── dispatch_dropoffs: ops_manager access via org membership ──────────────────
-- dispatch_dropoffs has no organization_id; isolation is via the parent dispatch.
DROP POLICY IF EXISTS "Org members can view dispatch_dropoffs" ON public.dispatch_dropoffs;
CREATE POLICY "Org members can view dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR SELECT TO authenticated
  USING (
    dispatch_id IN (
      SELECT id FROM public.dispatches
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS "Org members can insert dispatch_dropoffs" ON public.dispatch_dropoffs;
CREATE POLICY "Org members can insert dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR INSERT TO authenticated
  WITH CHECK (
    dispatch_id IN (
      SELECT id FROM public.dispatches
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );

DROP POLICY IF EXISTS "Org members can update dispatch_dropoffs" ON public.dispatch_dropoffs;
CREATE POLICY "Org members can update dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR UPDATE TO authenticated
  USING (
    dispatch_id IN (
      SELECT id FROM public.dispatches
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support')
    )
  );

DROP POLICY IF EXISTS "Org members can delete dispatch_dropoffs" ON public.dispatch_dropoffs;
CREATE POLICY "Org members can delete dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR DELETE TO authenticated
  USING (
    dispatch_id IN (
      SELECT id FROM public.dispatches
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    AND EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher')
    )
  );
