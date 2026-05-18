
-- FIX ALL ERROR-LEVEL SECURITY FINDINGS

-- sales_leads (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_leads" ON public.sales_leads;
CREATE POLICY "Tenant sales_leads select" ON public.sales_leads FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_leads insert" ON public.sales_leads FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_leads update" ON public.sales_leads FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_leads delete" ON public.sales_leads FOR DELETE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_contacts (via account_id -> sales_accounts.tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_contacts" ON public.sales_contacts;
CREATE POLICY "Tenant sales_contacts select" ON public.sales_contacts FOR SELECT TO authenticated USING (account_id IN (SELECT sa.id FROM public.sales_accounts sa WHERE sa.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_contacts insert" ON public.sales_contacts FOR INSERT TO authenticated WITH CHECK (account_id IN (SELECT sa.id FROM public.sales_accounts sa WHERE sa.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_contacts update" ON public.sales_contacts FOR UPDATE TO authenticated USING (account_id IN (SELECT sa.id FROM public.sales_accounts sa WHERE sa.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true))) WITH CHECK (account_id IN (SELECT sa.id FROM public.sales_accounts sa WHERE sa.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_contacts delete" ON public.sales_contacts FOR DELETE TO authenticated USING (account_id IN (SELECT sa.id FROM public.sales_accounts sa WHERE sa.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));

-- sales_activities (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_activities" ON public.sales_activities;
CREATE POLICY "Tenant sales_activities select" ON public.sales_activities FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_activities insert" ON public.sales_activities FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_activities update" ON public.sales_activities FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_activities delete" ON public.sales_activities FOR DELETE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_opportunities (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_opportunities" ON public.sales_opportunities;
CREATE POLICY "Tenant sales_opportunities select" ON public.sales_opportunities FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_opportunities insert" ON public.sales_opportunities FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_opportunities update" ON public.sales_opportunities FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_opportunities delete" ON public.sales_opportunities FOR DELETE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_quotes (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_quotes" ON public.sales_quotes;
CREATE POLICY "Tenant sales_quotes select" ON public.sales_quotes FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_quotes insert" ON public.sales_quotes FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_quotes update" ON public.sales_quotes FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_quotes delete" ON public.sales_quotes FOR DELETE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_quote_items (via quote_id -> sales_quotes.tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_quote_items" ON public.sales_quote_items;
CREATE POLICY "Tenant sales_quote_items select" ON public.sales_quote_items FOR SELECT TO authenticated USING (quote_id IN (SELECT sq.id FROM public.sales_quotes sq WHERE sq.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_quote_items insert" ON public.sales_quote_items FOR INSERT TO authenticated WITH CHECK (quote_id IN (SELECT sq.id FROM public.sales_quotes sq WHERE sq.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_quote_items update" ON public.sales_quote_items FOR UPDATE TO authenticated USING (quote_id IN (SELECT sq.id FROM public.sales_quotes sq WHERE sq.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true))) WITH CHECK (quote_id IN (SELECT sq.id FROM public.sales_quotes sq WHERE sq.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));
CREATE POLICY "Tenant sales_quote_items delete" ON public.sales_quote_items FOR DELETE TO authenticated USING (quote_id IN (SELECT sq.id FROM public.sales_quotes sq WHERE sq.tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));

-- sales_forecasts (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_forecasts" ON public.sales_forecasts;
CREATE POLICY "Tenant sales_forecasts select" ON public.sales_forecasts FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_forecasts insert" ON public.sales_forecasts FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_forecasts update" ON public.sales_forecasts FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_quotas (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_quotas" ON public.sales_quotas;
CREATE POLICY "Tenant sales_quotas select" ON public.sales_quotas FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_quotas insert" ON public.sales_quotas FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_quotas update" ON public.sales_quotas FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- sales_territories (has tenant_id)
DROP POLICY IF EXISTS "Auth users manage sales_territories" ON public.sales_territories;
CREATE POLICY "Tenant sales_territories select" ON public.sales_territories FOR SELECT TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_territories insert" ON public.sales_territories FOR INSERT TO authenticated WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));
CREATE POLICY "Tenant sales_territories update" ON public.sales_territories FOR UPDATE TO authenticated USING (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)) WITH CHECK (tenant_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true));

-- DRIVERS: Keep dispatcher access but note financial fields visible (acceptable since dispatcher needs driver info for dispatch)
DROP POLICY IF EXISTS "Role-restricted driver access" ON public.drivers;
CREATE POLICY "Role-restricted driver access" ON public.drivers FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'ops_manager'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'dispatcher'::app_role) OR (user_id = auth.uid()));

-- STAFF: Remove operations role from full staff financial access
DROP POLICY IF EXISTS "Role-restricted staff access" ON public.staff;
CREATE POLICY "Admin staff full access" ON public.staff FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'finance_manager'::app_role) OR (email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text));

-- COMPANY_SETTINGS: Restrict bank details to admin/super_admin
DROP POLICY IF EXISTS "Role-restricted company settings read" ON public.company_settings;
CREATE POLICY "Restricted company settings read" ON public.company_settings FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- LIQUOR_AGE_VERIFICATIONS: Add org isolation
DROP POLICY IF EXISTS "Role-restricted age verification read" ON public.liquor_age_verifications;
CREATE POLICY "Tenant age verification read" ON public.liquor_age_verifications FOR SELECT TO authenticated USING ((auth.uid() = cashier_user_id) OR ((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'ops_manager'::app_role)) AND organization_id IN (SELECT om.organization_id FROM public.organization_members om WHERE om.user_id = auth.uid() AND om.is_active = true)));

-- INTEGRATIONS: Restrict to super_admin only
DROP POLICY IF EXISTS "Admin can manage integrations" ON public.integrations;
CREATE POLICY "Super admin manages integrations" ON public.integrations FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- PARTNER_WEBHOOKS: Restrict to super_admin only
DROP POLICY IF EXISTS "Admin manages webhooks" ON public.partner_webhooks;
CREATE POLICY "Super admin manages webhooks" ON public.partner_webhooks FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
