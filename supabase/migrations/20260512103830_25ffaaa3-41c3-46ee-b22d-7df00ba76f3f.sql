
-- =====================================================================
-- Phase 13b — Cross-tenant RLS lockdown (parent-aware, per-table)
-- =====================================================================

-- Helper: org IDs the caller belongs to.
CREATE OR REPLACE FUNCTION public.caller_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.caller_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_org_ids() TO authenticated;

-- Helper: commerce IDs (RCIDs) the caller's orgs control. Used by trade tables.
CREATE OR REPLACE FUNCTION public.caller_rcids()
RETURNS SETOF text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rcid::text
  FROM public.commerce_identities
  WHERE organization_id IN (SELECT public.caller_org_ids());
$$;
REVOKE EXECUTE ON FUNCTION public.caller_rcids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_rcids() TO authenticated;

-- Drop ALL existing SELECT policies on a list of tables (helper inline DO blocks).
DO $$
DECLARE
  t text;
  pol record;
  targets text[] := ARRAY[
    'trade_contracts','revenue_contracts','chart_of_accounts','legal_entities',
    'fraud_detection_events','compliance_registry','reconciliation_items',
    'inventory_reconciliations','shelf_audits','order_delivery_tracking',
    'parts_inventory','parts_orders','sensor_alerts','fleet_downtime_log',
    'freight_performance_notes','predictive_forecasts','insurance_claims_predictions',
    'demand_forecasts','decision_outcomes','autonomous_rules','trade_verifications',
    'exchange_trade_matches','trade_disputes','ecosystem_nodes','trust_badges',
    'warehouse_bins','warehouse_zones','warehouse_returns','warehouse_return_items',
    'picklist_items','picklists','cycle_counts','cycle_count_items',
    'fmcg_field_returns','liquor_compliance_audit','performance_obligations','vat_rules'
  ];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Finance / accounting (org-scoped)
-- ---------------------------------------------------------------------

-- revenue_contracts (tenant_id)
CREATE POLICY "Org members read revenue_contracts" ON public.revenue_contracts
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.is_org_member(auth.uid(), tenant_id));

-- performance_obligations (joined via revenue_contracts.tenant_id)
CREATE POLICY "Org members read performance_obligations" ON public.performance_obligations
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.revenue_contracts rc
      WHERE rc.id = performance_obligations.contract_id
        AND public.is_org_member(auth.uid(), rc.tenant_id)
    )
  );

-- chart_of_accounts, legal_entities, vat_rules: no org column; treat as
-- super-admin managed reference data. Operators don't need direct table reads.
CREATE POLICY "Super admin reads chart_of_accounts" ON public.chart_of_accounts
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads legal_entities" ON public.legal_entities
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads vat_rules" ON public.vat_rules
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Compliance & commerce identity-based tables (RCID participants)
-- ---------------------------------------------------------------------
CREATE POLICY "RCID participants read compliance_registry" ON public.compliance_registry
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR rcid IN (SELECT public.caller_rcids())
  );

CREATE POLICY "RCID parties read trade_contracts" ON public.trade_contracts
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR party_a_rcid IN (SELECT public.caller_rcids())
    OR party_b_rcid IN (SELECT public.caller_rcids())
  );

CREATE POLICY "RCID parties read trade_disputes" ON public.trade_disputes
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR complainant_rcid IN (SELECT public.caller_rcids())
    OR respondent_rcid IN (SELECT public.caller_rcids())
  );

CREATE POLICY "RCID participants read trust_badges" ON public.trust_badges
  FOR SELECT TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR rcid IN (SELECT public.caller_rcids())
  );

-- trade_verifications, exchange_trade_matches: no direct rcid column on each
-- row across orgs; restrict to super_admin pending domain refactor.
CREATE POLICY "Super admin reads trade_verifications" ON public.trade_verifications
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads exchange_trade_matches" ON public.exchange_trade_matches
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Warehouse-chained tables (warehouse_id → warehouses.organization_id)
-- ---------------------------------------------------------------------
CREATE POLICY "Org members read inventory_reconciliations" ON public.inventory_reconciliations
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = inventory_reconciliations.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read reconciliation_items" ON public.reconciliation_items
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.inventory_reconciliations ir
      JOIN public.warehouses w ON w.id = ir.warehouse_id
      WHERE ir.id = reconciliation_items.reconciliation_id
        AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "Org members read order_delivery_tracking" ON public.order_delivery_tracking
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = order_delivery_tracking.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read warehouse_returns" ON public.warehouse_returns
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = warehouse_returns.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read warehouse_return_items" ON public.warehouse_return_items
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.warehouse_returns wr
      JOIN public.warehouses w ON w.id = wr.warehouse_id
      WHERE wr.id = warehouse_return_items.return_id
        AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "Org members read warehouse_zones" ON public.warehouse_zones
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = warehouse_zones.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read warehouse_bins" ON public.warehouse_bins
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.warehouse_zones z
      JOIN public.warehouses w ON w.id = z.warehouse_id
      WHERE z.id = warehouse_bins.zone_id
        AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "Org members read picklists" ON public.picklists
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = picklists.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read picklist_items" ON public.picklist_items
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.picklists p
      JOIN public.warehouses w ON w.id = p.warehouse_id
      WHERE p.id = picklist_items.picklist_id
        AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "Org members read cycle_counts" ON public.cycle_counts
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.warehouses w
               WHERE w.id = cycle_counts.warehouse_id
                 AND public.is_org_member(auth.uid(), w.organization_id))
  );

CREATE POLICY "Org members read cycle_count_items" ON public.cycle_count_items
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.cycle_counts c
      JOIN public.warehouses w ON w.id = c.warehouse_id
      WHERE c.id = cycle_count_items.cycle_count_id
        AND public.is_org_member(auth.uid(), w.organization_id)
    )
  );

-- parts_inventory has no warehouse_id column (only warehouse_location text);
-- restrict to super admin pending schema cleanup.
CREATE POLICY "Super admin reads parts_inventory" ON public.parts_inventory
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Vehicle-chained tables
-- ---------------------------------------------------------------------
CREATE POLICY "Org members read parts_orders" ON public.parts_orders
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.vehicles v
               WHERE v.id = parts_orders.vehicle_id
                 AND public.is_org_member(auth.uid(), v.organization_id))
  );

CREATE POLICY "Org members read sensor_alerts" ON public.sensor_alerts
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.vehicles v
               WHERE v.id = sensor_alerts.vehicle_id
                 AND public.is_org_member(auth.uid(), v.organization_id))
  );

CREATE POLICY "Org members read fleet_downtime_log" ON public.fleet_downtime_log
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.vehicles v
               WHERE v.id = fleet_downtime_log.vehicle_id
                 AND public.is_org_member(auth.uid(), v.organization_id))
  );

-- ---------------------------------------------------------------------
-- Dispatch-chained
-- ---------------------------------------------------------------------
CREATE POLICY "Org members read freight_performance_notes" ON public.freight_performance_notes
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (SELECT 1 FROM public.dispatches d
               WHERE d.id = freight_performance_notes.dispatch_id
                 AND public.is_org_member(auth.uid(), d.organization_id))
  );

-- ---------------------------------------------------------------------
-- Tables with creator-only or super-admin scope
-- ---------------------------------------------------------------------
CREATE POLICY "Owner or super admin reads autonomous_rules" ON public.autonomous_rules
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR (tenant_id IS NOT NULL AND public.is_org_member(auth.uid(), tenant_id))
    OR created_by = auth.uid()
  );

CREATE POLICY "Owner or super admin reads ecosystem_nodes" ON public.ecosystem_nodes
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid()) OR created_by = auth.uid()
  );

CREATE POLICY "Org members read liquor_compliance_audit" ON public.liquor_compliance_audit
  FOR SELECT TO authenticated USING (
    public.is_super_admin(auth.uid())
    OR public.is_org_member(auth.uid(), organization_id)
  );

-- Tables with no exploitable link to caller — restrict to super admin.
CREATE POLICY "Super admin reads fraud_detection_events" ON public.fraud_detection_events
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads predictive_forecasts" ON public.predictive_forecasts
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads insurance_claims_predictions" ON public.insurance_claims_predictions
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads demand_forecasts" ON public.demand_forecasts
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads decision_outcomes" ON public.decision_outcomes
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads shelf_audits" ON public.shelf_audits
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admin reads fmcg_field_returns" ON public.fmcg_field_returns
  FOR SELECT TO authenticated USING (public.is_super_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- Storage: company-assets read scoped by folder = organization_id
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read company assets" ON storage.objects;
CREATE POLICY "Org members read company-assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'company-assets'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- Storage: transporter buckets — uploader must own the folder org
DROP POLICY IF EXISTS "Transporters upload PODs" ON storage.objects;
CREATE POLICY "Org members upload transporter PODs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transporter-pod-photos'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Authenticated users upload onboarding docs" ON storage.objects;
CREATE POLICY "Org members upload transporter onboarding docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transporter-onboarding-docs'
    AND (
      public.is_super_admin(auth.uid())
      OR (storage.foldername(name))[1] IN (
        SELECT organization_id::text FROM public.organization_members WHERE user_id = auth.uid()
      )
    )
  );
