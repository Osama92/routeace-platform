
ALTER TABLE public.financial_targets ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.sla_breach_alerts ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.vendor_payables ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.fleet_maintenance_orders ADD COLUMN IF NOT EXISTS organization_id uuid;

UPDATE public.financial_targets ft
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = ft.created_by AND om.is_active = true
  ORDER BY om.joined_at LIMIT 1
)
WHERE ft.organization_id IS NULL AND ft.created_by IS NOT NULL;

UPDATE public.sla_breach_alerts s
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE s.dispatch_id = d.id AND s.organization_id IS NULL;

UPDATE public.journal_entries je
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = je.posted_by AND om.is_active = true
  ORDER BY om.joined_at LIMIT 1
)
WHERE je.organization_id IS NULL AND je.posted_by IS NOT NULL;

UPDATE public.vendor_payables vp
SET organization_id = e.organization_id
FROM public.expenses e
WHERE vp.expense_id = e.id AND vp.organization_id IS NULL;

UPDATE public.fleet_maintenance_orders fmo
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = fmo.created_by AND om.is_active = true
  ORDER BY om.joined_at LIMIT 1
)
WHERE fmo.organization_id IS NULL AND fmo.created_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_targets_org ON public.financial_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_sla_breach_alerts_org ON public.sla_breach_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_org ON public.journal_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payables_org ON public.vendor_payables(organization_id);
CREATE INDEX IF NOT EXISTS idx_fleet_maintenance_orders_org ON public.fleet_maintenance_orders(organization_id);

CREATE OR REPLACE FUNCTION public.set_org_id_from_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT om.organization_id INTO NEW.organization_id
    FROM public.organization_members om
    WHERE om.user_id = COALESCE(NEW.created_by, auth.uid())
      AND om.is_active = true
    ORDER BY om.joined_at LIMIT 1;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_financial_targets_set_org ON public.financial_targets;
CREATE TRIGGER trg_financial_targets_set_org BEFORE INSERT ON public.financial_targets
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_creator();

DROP TRIGGER IF EXISTS trg_fleet_maintenance_orders_set_org ON public.fleet_maintenance_orders;
CREATE TRIGGER trg_fleet_maintenance_orders_set_org BEFORE INSERT ON public.fleet_maintenance_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_org_id_from_creator();

CREATE OR REPLACE FUNCTION public.set_journal_entries_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL THEN
    SELECT om.organization_id INTO NEW.organization_id
    FROM public.organization_members om
    WHERE om.user_id = COALESCE(NEW.posted_by, auth.uid())
      AND om.is_active = true
    ORDER BY om.joined_at LIMIT 1;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_journal_entries_set_org ON public.journal_entries;
CREATE TRIGGER trg_journal_entries_set_org BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_journal_entries_org();

CREATE OR REPLACE FUNCTION public.set_vendor_payables_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.expense_id IS NOT NULL THEN
    SELECT e.organization_id INTO NEW.organization_id FROM public.expenses e WHERE e.id = NEW.expense_id;
  END IF;
  IF NEW.organization_id IS NULL THEN
    SELECT om.organization_id INTO NEW.organization_id
    FROM public.organization_members om
    WHERE om.user_id = COALESCE(NEW.created_by, auth.uid()) AND om.is_active = true
    ORDER BY om.joined_at LIMIT 1;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_vendor_payables_set_org ON public.vendor_payables;
CREATE TRIGGER trg_vendor_payables_set_org BEFORE INSERT ON public.vendor_payables
  FOR EACH ROW EXECUTE FUNCTION public.set_vendor_payables_org();

CREATE OR REPLACE FUNCTION public.set_sla_breach_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.dispatch_id IS NOT NULL THEN
    SELECT d.organization_id INTO NEW.organization_id FROM public.dispatches d WHERE d.id = NEW.dispatch_id;
  END IF;
  RETURN NEW;
END;$$;

DROP TRIGGER IF EXISTS trg_sla_breach_alerts_set_org ON public.sla_breach_alerts;
CREATE TRIGGER trg_sla_breach_alerts_set_org BEFORE INSERT ON public.sla_breach_alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_sla_breach_org();

DROP POLICY IF EXISTS "Finance roles can view financial targets" ON public.financial_targets;
CREATE POLICY "Org-scoped finance roles view financial targets"
  ON public.financial_targets FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.is_active = true
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "sla_breach_alerts_via_dispatch" ON public.sla_breach_alerts;
CREATE POLICY "Org-scoped sla breach alerts"
  ON public.sla_breach_alerts FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Org members manage sla breach alerts" ON public.sla_breach_alerts;
CREATE POLICY "Org members manage sla breach alerts"
  ON public.sla_breach_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS "Finance/admin select journal_entries" ON public.journal_entries;
CREATE POLICY "Org-scoped finance journal entries view"
  ON public.journal_entries FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.is_active = true
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Users with roles can view vendor payables" ON public.vendor_payables;
DROP POLICY IF EXISTS "Role-restricted vendor payables access" ON public.vendor_payables;
CREATE POLICY "Org-scoped vendor payables view"
  ON public.vendor_payables FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR (
      organization_id IN (
        SELECT om.organization_id FROM public.organization_members om
        WHERE om.user_id = auth.uid() AND om.is_active = true
      )
      AND (
        has_role(auth.uid(), 'admin'::app_role)
        OR has_role(auth.uid(), 'org_admin'::app_role)
        OR has_role(auth.uid(), 'finance_manager'::app_role)
        OR has_role(auth.uid(), 'ops_manager'::app_role)
      )
    )
  );

DROP POLICY IF EXISTS "Ops roles can view fleet_maintenance_orders" ON public.fleet_maintenance_orders;
DROP POLICY IF EXISTS "Ops/admin select fleet_maintenance_orders" ON public.fleet_maintenance_orders;
CREATE POLICY "Org-scoped fleet maintenance orders view"
  ON public.fleet_maintenance_orders FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR organization_id IN (
      SELECT om.organization_id FROM public.organization_members om
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );
