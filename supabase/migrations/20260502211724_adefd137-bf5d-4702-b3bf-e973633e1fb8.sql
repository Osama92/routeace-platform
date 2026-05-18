
DROP POLICY IF EXISTS "Auth can view whatsapp_orders" ON public.whatsapp_orders;
DROP POLICY IF EXISTS "Auth can view fmcg_fleet_tracking" ON public.fmcg_fleet_tracking;

DROP POLICY IF EXISTS "historical_data_insert_policy" ON public.historical_invoice_data;
DROP POLICY IF EXISTS "historical_data_update_policy" ON public.historical_invoice_data;
DROP POLICY IF EXISTS "historical_data_delete_policy" ON public.historical_invoice_data;
CREATE POLICY "Admin/finance insert historical_invoice_data" ON public.historical_invoice_data
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role));
CREATE POLICY "Admin/finance update historical_invoice_data" ON public.historical_invoice_data
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role));
CREATE POLICY "Admin/finance delete historical_invoice_data" ON public.historical_invoice_data
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role));

DROP POLICY IF EXISTS "diesel_rate_config_insert_policy" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "diesel_rate_config_update_policy" ON public.diesel_rate_config;
DROP POLICY IF EXISTS "diesel_rate_config_delete_policy" ON public.diesel_rate_config;

DROP POLICY IF EXISTS "Ops managers can create blocked orders" ON public.blocked_orders;
DROP POLICY IF EXISTS "Ops managers can update blocked orders" ON public.blocked_orders;

DROP POLICY IF EXISTS "Ops managers can create SOPs" ON public.ops_sops;
DROP POLICY IF EXISTS "Ops managers can update SOPs" ON public.ops_sops;
DROP POLICY IF EXISTS "Ops managers can delete SOPs" ON public.ops_sops;

DROP POLICY IF EXISTS "Ops managers can create route risks" ON public.route_risk_register;
DROP POLICY IF EXISTS "Ops managers can update route risks" ON public.route_risk_register;

DROP POLICY IF EXISTS "Org members insert age verifications" ON public.liquor_age_verifications;
CREATE POLICY "Cashier/ops insert age verifications" ON public.liquor_age_verifications
  FOR INSERT WITH CHECK (
    auth.uid() = cashier_user_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR has_role(auth.uid(), 'ops_manager'::app_role)
    )
    AND organization_id IN (
      SELECT om.organization_id FROM organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Org members insert license verifications" ON public.liquor_license_verifications;
DROP POLICY IF EXISTS "Org members update license verifications" ON public.liquor_license_verifications;
DROP POLICY IF EXISTS "Authenticated read license verifications" ON public.liquor_license_verifications;
CREATE POLICY "Org ops/admin read license verifications" ON public.liquor_license_verifications
  FOR SELECT USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'ops_manager'::app_role))
    AND organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)
  );
CREATE POLICY "Org ops/admin insert license verifications" ON public.liquor_license_verifications
  FOR INSERT WITH CHECK (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'ops_manager'::app_role))
    AND organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)
  );
CREATE POLICY "Org ops/admin update license verifications" ON public.liquor_license_verifications
  FOR UPDATE USING (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'ops_manager'::app_role))
    AND organization_id IN (SELECT om.organization_id FROM organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)
  );
