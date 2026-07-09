-- Add DELETE RLS policies for Fleet Compliance Hub tables.
-- Previously only SELECT, INSERT, UPDATE were defined; DELETE was missing,
-- causing silent no-op deletes (data: [], error: null) from the frontend.
-- Admins, org_admins, and super_admins may delete records within their org.

-- ─── vehicle_checklists ───────────────────────────────────────────────────────
CREATE POLICY "Admins delete checklists"
  ON public.vehicle_checklists FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

-- ─── work_orders ─────────────────────────────────────────────────────────────
CREATE POLICY "Admins delete work orders"
  ON public.work_orders FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

-- ─── fuel_logs ───────────────────────────────────────────────────────────────
CREATE POLICY "Admins delete fuel logs"
  ON public.fuel_logs FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

-- ─── vehicle_fines ───────────────────────────────────────────────────────────
CREATE POLICY "Admins delete vehicle fines"
  ON public.vehicle_fines FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

-- ─── vehicle_incidents ───────────────────────────────────────────────────────
CREATE POLICY "Admins delete vehicle incidents"
  ON public.vehicle_incidents FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );

-- ─── vehicle_documents ───────────────────────────────────────────────────────
CREATE POLICY "Admins delete vehicle documents"
  ON public.vehicle_documents FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      public.has_role(auth.uid(), 'super_admin')
      OR public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'org_admin')
      OR public.has_role(auth.uid(), 'ops_manager')
    )
  );
