-- Fix dispatch RLS: the original FOR ALL policy had no organization_id isolation,
-- meaning an admin from Org A could INSERT/UPDATE/DELETE dispatches in Org B.
-- Replace with explicit per-operation policies that enforce org scoping.

-- ── Drop old policies ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin/Operations/Dispatcher can manage dispatches" ON public.dispatches;
DROP POLICY IF EXISTS "Support can update dispatch status" ON public.dispatches;

-- ── SELECT: already fixed in 20260520000001 (dispatches_org_select) ──────────
-- No change needed for SELECT.

-- ── INSERT: org members with appropriate roles ────────────────────────────────
DROP POLICY IF EXISTS "Org members can insert dispatches" ON public.dispatches;

CREATE POLICY "Org members can insert dispatches"
  ON public.dispatches FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher'
      )
    )
  );

-- ── UPDATE: org members with appropriate roles ────────────────────────────────
DROP POLICY IF EXISTS "Org members can update dispatches" ON public.dispatches;

CREATE POLICY "Org members can update dispatches"
  ON public.dispatches FOR UPDATE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support'
      )
    )
  );

-- ── DELETE: admin/org_admin/super_admin only ──────────────────────────────────
DROP POLICY IF EXISTS "Org admins can delete dispatches" ON public.dispatches;

CREATE POLICY "Org admins can delete dispatches"
  ON public.dispatches FOR DELETE
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
    AND (
      (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );

-- ── dispatch_dropoffs: ensure org isolation via parent dispatch ───────────────
-- dispatch_dropoffs doesn't have organization_id directly; it FKs to dispatches.
-- Policies below enforce isolation by joining through dispatches.

DROP POLICY IF EXISTS "Org members can insert dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can view dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can update dispatch_dropoffs" ON public.dispatch_dropoffs;
DROP POLICY IF EXISTS "Org members can delete dispatch_dropoffs" ON public.dispatch_dropoffs;

CREATE POLICY "Org members can view dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_dropoffs.dispatch_id
        AND d.organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
        )
    )
  );

CREATE POLICY "Org members can insert dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_dropoffs.dispatch_id
        AND d.organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
        )
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher'
      )
    )
  );

CREATE POLICY "Org members can update dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_dropoffs.dispatch_id
        AND d.organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
        )
    )
    AND (
      (auth.jwt() ->> 'user_role') IN (
        'admin', 'super_admin', 'org_admin', 'ops_manager', 'operations', 'dispatcher', 'support'
      )
    )
  );

CREATE POLICY "Org members can delete dispatch_dropoffs"
  ON public.dispatch_dropoffs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = dispatch_dropoffs.dispatch_id
        AND d.organization_id = (
          SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
        )
    )
    AND (
      (auth.jwt() ->> 'user_role') IN ('admin', 'super_admin', 'org_admin')
    )
  );
