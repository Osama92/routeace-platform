
-- 1. core_access_logs INSERT
DROP POLICY IF EXISTS "System can insert access logs" ON public.core_access_logs;
CREATE POLICY "Role-restricted core access log insert" ON public.core_access_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.is_core_team(auth.uid())
  );

-- 2. cycle_count_items ALL
DROP POLICY IF EXISTS "Authenticated users can manage cycle count items" ON public.cycle_count_items;
CREATE POLICY "Role-restricted cycle count items" ON public.cycle_count_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 3. cycle_counts ALL
DROP POLICY IF EXISTS "Authenticated users can manage cycle counts" ON public.cycle_counts;
CREATE POLICY "Role-restricted cycle counts" ON public.cycle_counts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 4. email_activity_log INSERT
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_activity_log;
CREATE POLICY "Role-restricted email log insert" ON public.email_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 5. fmcg_field_returns INSERT
DROP POLICY IF EXISTS "Authenticated users can insert field returns" ON public.fmcg_field_returns;
CREATE POLICY "Role-restricted field returns insert" ON public.fmcg_field_returns
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'));

-- 6. fmcg_fleet_tracking ALL
DROP POLICY IF EXISTS "Auth can manage fmcg_fleet_tracking" ON public.fmcg_fleet_tracking;
CREATE POLICY "Role-restricted fmcg fleet tracking" ON public.fmcg_fleet_tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'));

-- 7. inventory_reconciliations ALL
DROP POLICY IF EXISTS "Authenticated users can manage reconciliations" ON public.inventory_reconciliations;
CREATE POLICY "Role-restricted inventory reconciliations" ON public.inventory_reconciliations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

-- 8. investor_access_logs INSERT
DROP POLICY IF EXISTS "System can insert investor_access_logs" ON public.investor_access_logs;
CREATE POLICY "Self-insert investor access logs" ON public.investor_access_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- 9. kpi_metrics INSERT
DROP POLICY IF EXISTS "System can insert KPI metrics" ON public.kpi_metrics;
CREATE POLICY "Role-restricted kpi metrics insert" ON public.kpi_metrics
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 10. order_delivery_tracking ALL
DROP POLICY IF EXISTS "Auth can manage order_delivery_tracking" ON public.order_delivery_tracking;
CREATE POLICY "Role-restricted order delivery tracking" ON public.order_delivery_tracking
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'));

-- 11. picklist_items ALL
DROP POLICY IF EXISTS "Authenticated users can manage picklist items" ON public.picklist_items;
CREATE POLICY "Role-restricted picklist items" ON public.picklist_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 12. picklists ALL
DROP POLICY IF EXISTS "Authenticated users can manage picklists" ON public.picklists;
CREATE POLICY "Role-restricted picklists" ON public.picklists
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 13. rate_limit_buckets ALL
DROP POLICY IF EXISTS "Edge functions manage rate limits" ON public.rate_limit_buckets;
CREATE POLICY "Role-restricted rate limit buckets" ON public.rate_limit_buckets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- 14. reconciliation_items ALL
DROP POLICY IF EXISTS "Authenticated users can manage reconciliation items" ON public.reconciliation_items;
CREATE POLICY "Role-restricted reconciliation items" ON public.reconciliation_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'finance_manager'));

-- 15. sales_call_logs ALL
DROP POLICY IF EXISTS "Auth can manage sales_call_logs" ON public.sales_call_logs;
CREATE POLICY "Role-restricted sales call logs" ON public.sales_call_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 16. shelf_audits ALL
DROP POLICY IF EXISTS "Auth can manage shelf_audits" ON public.shelf_audits;
CREATE POLICY "Role-restricted shelf audits" ON public.shelf_audits
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 17. support_ticket_messages INSERT
DROP POLICY IF EXISTS "ticket_messages_insert" ON public.support_ticket_messages;
CREATE POLICY "Role-restricted ticket message insert" ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- 18. support_tickets INSERT
DROP POLICY IF EXISTS "support_tickets_insert" ON public.support_tickets;
CREATE POLICY "Authenticated users can create tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid()));

-- 19. treasury_risk_logs INSERT
DROP POLICY IF EXISTS "risk_logs_insert" ON public.treasury_risk_logs;
CREATE POLICY "Role-restricted treasury risk log insert" ON public.treasury_risk_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- 20. treasury_stress_index INSERT
DROP POLICY IF EXISTS "Authenticated insert treasury stress" ON public.treasury_stress_index;
CREATE POLICY "Role-restricted treasury stress insert" ON public.treasury_stress_index
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'finance_manager'));

-- 21-26. Warehouse tables
DROP POLICY IF EXISTS "Authenticated users can manage bins" ON public.warehouse_bins;
CREATE POLICY "Role-restricted warehouse bins" ON public.warehouse_bins
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

DROP POLICY IF EXISTS "Authenticated users can manage inventory" ON public.warehouse_inventory;
CREATE POLICY "Role-restricted warehouse inventory" ON public.warehouse_inventory
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

DROP POLICY IF EXISTS "Authenticated users can manage return items" ON public.warehouse_return_items;
CREATE POLICY "Role-restricted warehouse return items" ON public.warehouse_return_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

DROP POLICY IF EXISTS "Authenticated users can manage returns" ON public.warehouse_returns;
CREATE POLICY "Role-restricted warehouse returns" ON public.warehouse_returns
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

DROP POLICY IF EXISTS "Authenticated users can manage zones" ON public.warehouse_zones;
CREATE POLICY "Role-restricted warehouse zones" ON public.warehouse_zones
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

DROP POLICY IF EXISTS "Authenticated users can manage warehouses" ON public.warehouses;
CREATE POLICY "Role-restricted warehouses" ON public.warehouses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager'));

-- 27. whatsapp_orders ALL
DROP POLICY IF EXISTS "Auth can manage whatsapp_orders" ON public.whatsapp_orders;
CREATE POLICY "Role-restricted whatsapp orders" ON public.whatsapp_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager') OR public.has_role(auth.uid(), 'dispatcher'));
