-- Add DELETE RLS policies for the two compliance tables that were missing them.
-- vehicle_checklists and fuel_logs only had SELECT/INSERT/UPDATE policies.
-- work_orders, vehicle_fines, vehicle_incidents already have FOR ALL policies (which cover DELETE).
-- vehicle_documents has no organization_id — already covered by its FOR ALL policy via vehicle_id.

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
