
-- ============================================================
-- SECURITY HARDENING: Fix critical permissive RLS policies
-- ============================================================

-- 1. global_tax_rules: restrict ALL to admin/super_admin only
DROP POLICY IF EXISTS "tax_rules_admin_write" ON public.global_tax_rules;
CREATE POLICY "tax_rules_admin_write" ON public.global_tax_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 2. support_tickets: restrict UPDATE to admin/ops_manager/creator
DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;
CREATE POLICY "support_tickets_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'ops_manager')
  );

-- 3. historical_invoice_data: remove public anon read
DROP POLICY IF EXISTS "historical_data_select_policy" ON public.historical_invoice_data;

-- 4. liquor_age_verifications: restrict to admin/ops_manager or verifier
DROP POLICY IF EXISTS "Authenticated read age verifications" ON public.liquor_age_verifications;
CREATE POLICY "Role-restricted age verification read" ON public.liquor_age_verifications
  FOR SELECT TO authenticated
  USING (
    auth.uid() = cashier_user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'ops_manager')
  );

-- 5. staff: remove the broad has_any_role SELECT policy
DROP POLICY IF EXISTS "Users with roles can view staff" ON public.staff;

-- 6. staff_salaries: remove the broad has_any_role SELECT policy
DROP POLICY IF EXISTS "Users with roles can view staff salaries" ON public.staff_salaries;

-- 7. company_settings: restrict SELECT to admin/super_admin/finance_manager
DROP POLICY IF EXISTS "Admins can view company settings" ON public.company_settings;
CREATE POLICY "Role-restricted company settings read" ON public.company_settings
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'finance_manager')
  );

-- 8. driver_documents: change from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view driver documents" ON public.driver_documents;
CREATE POLICY "Authenticated users can view driver documents" ON public.driver_documents
  FOR SELECT TO authenticated
  USING (true);

-- 9. vehicle_documents: change from public to authenticated
DROP POLICY IF EXISTS "Authenticated users can view vehicle documents" ON public.vehicle_documents;
CREATE POLICY "Authenticated users can view vehicle documents" ON public.vehicle_documents
  FOR SELECT TO authenticated
  USING (true);

-- 10. kpi_metrics: change SELECT from public to authenticated with role check
DROP POLICY IF EXISTS "Users can view KPI metrics" ON public.kpi_metrics;
CREATE POLICY "Role-restricted KPI metrics read" ON public.kpi_metrics
  FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid()));

-- 11. commerce_identities: restrict tax_id/registration_number access
DROP POLICY IF EXISTS "Authenticated users can view commerce identities" ON public.commerce_identities;
CREATE POLICY "Role-restricted commerce identity read" ON public.commerce_identities
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true
    )
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

-- 12. waybill_items: restrict to ops/admin roles
DROP POLICY IF EXISTS "Allow access to waybill_items" ON public.waybill_items;
CREATE POLICY "Role-restricted waybill items access" ON public.waybill_items
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'ops_manager')
    OR public.has_role(auth.uid(), 'finance_manager')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'ops_manager')
  );
