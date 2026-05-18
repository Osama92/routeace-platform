
-- ===== P3: Inspection org isolation =====
DO $$ BEGIN
  ALTER TABLE public.vehicle_inspections
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.dispatch_safety_gates
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

UPDATE public.vehicle_inspections vi
SET organization_id = v.organization_id
FROM public.vehicles v
WHERE vi.vehicle_id = v.id AND vi.organization_id IS NULL;

UPDATE public.dispatch_safety_gates dsg
SET organization_id = v.organization_id
FROM public.vehicles v
WHERE dsg.vehicle_id = v.id AND dsg.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_insp_org ON public.vehicle_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_dsg_org ON public.dispatch_safety_gates(organization_id);

DROP POLICY IF EXISTS "Leadership can view inspections" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Ops can create inspections" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Ops can update inspections" ON public.vehicle_inspections;
DROP POLICY IF EXISTS "Leadership can view inspection items" ON public.vehicle_inspection_items;
DROP POLICY IF EXISTS "Ops can create inspection items" ON public.vehicle_inspection_items;
DROP POLICY IF EXISTS "Leadership can view safety gates" ON public.dispatch_safety_gates;
DROP POLICY IF EXISTS "System can create safety gates" ON public.dispatch_safety_gates;

CREATE POLICY "Org members read vehicle inspections"
  ON public.vehicle_inspections FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members create vehicle inspections"
  ON public.vehicle_inspections FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members update vehicle inspections"
  ON public.vehicle_inspections FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members read inspection items"
  ON public.vehicle_inspection_items FOR SELECT TO authenticated
  USING (inspection_id IN (
    SELECT id FROM public.vehicle_inspections
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true)));

CREATE POLICY "Org members write inspection items"
  ON public.vehicle_inspection_items FOR INSERT TO authenticated
  WITH CHECK (inspection_id IN (
    SELECT id FROM public.vehicle_inspections
    WHERE organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true)));

CREATE POLICY "Org members read safety gates"
  ON public.dispatch_safety_gates FOR SELECT TO authenticated
  USING (organization_id IS NOT NULL AND organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members create safety gates"
  ON public.dispatch_safety_gates FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

CREATE POLICY "Org members update safety gates"
  ON public.dispatch_safety_gates FOR UPDATE TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- ===== P4: USING(true) lockdown =====
DO $$ BEGIN
  ALTER TABLE public.maintenance_cost_analysis
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.fuel_savings_ledger
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.breakdown_alerts
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.revenue_expansion_signals
    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DROP POLICY IF EXISTS "Auth read maintenance cost" ON public.maintenance_cost_analysis;
CREATE POLICY "Org members read maintenance cost"
  ON public.maintenance_cost_analysis FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Auth read fuel savings" ON public.fuel_savings_ledger;
CREATE POLICY "Org members read fuel savings"
  ON public.fuel_savings_ledger FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Auth read alerts" ON public.breakdown_alerts;
CREATE POLICY "Org members read breakdown alerts"
  ON public.breakdown_alerts FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Auth read expansion" ON public.revenue_expansion_signals;
CREATE POLICY "Org members read revenue signals"
  ON public.revenue_expansion_signals FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "Auth read autonomous config" ON public.autonomous_company_config;
CREATE POLICY "Org members read autonomous config"
  ON public.autonomous_company_config FOR SELECT TO authenticated
  USING (organization_id IS NULL OR organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

DROP POLICY IF EXISTS "policies_read_all" ON public.leave_policies;
CREATE POLICY "Org members read leave policies"
  ON public.leave_policies FOR SELECT TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true));

-- ===== P8: Hardening triggers =====
UPDATE public.ld_transporter_jobs j
SET organization_id = t.organization_id
FROM public.ld_transporters t
WHERE j.transporter_id = t.id
  AND j.organization_id IS DISTINCT FROM t.organization_id;

CREATE OR REPLACE FUNCTION public.validate_transporter_invite_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = NEW.organization_id AND tenant_mode = 'LOGISTICS_DEPARTMENT'
  ) THEN
    RAISE EXCEPTION 'Transporter invite tokens require a LOGISTICS_DEPARTMENT organisation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_transporter_invite ON public.transporter_invite_tokens;
CREATE TRIGGER trg_validate_transporter_invite
  BEFORE INSERT ON public.transporter_invite_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_transporter_invite_org();

CREATE OR REPLACE FUNCTION public.validate_ld_transporter_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = NEW.organization_id AND tenant_mode = 'LOGISTICS_DEPARTMENT'
  ) THEN
    RAISE EXCEPTION 'LD Transporters require a LOGISTICS_DEPARTMENT organisation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_ld_transporter ON public.ld_transporters;
CREATE TRIGGER trg_validate_ld_transporter
  BEFORE INSERT ON public.ld_transporters
  FOR EACH ROW EXECUTE FUNCTION public.validate_ld_transporter_org();

CREATE OR REPLACE FUNCTION public.validate_lc_only_table()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = NEW.organization_id AND tenant_mode = 'LOGISTICS_COMPANY'
  ) THEN
    RAISE EXCEPTION 'This table requires a LOGISTICS_COMPANY organisation';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_validate_asset_maint_lc ON public.asset_maintenance_events;
CREATE TRIGGER trg_validate_asset_maint_lc
  BEFORE INSERT ON public.asset_maintenance_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_lc_only_table();

DO $$ BEGIN
  ALTER TABLE public.integration_configs
    ADD COLUMN sync_cursor JSONB DEFAULT '{}'::jsonb;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ===== P6: Transporter billing automation =====
CREATE OR REPLACE FUNCTION public.generate_transporter_billing(
  p_billing_month DATE DEFAULT date_trunc('month', now() - interval '1 month')::date
)
RETURNS TABLE(org_id UUID, transporter_id UUID, vehicle_charge NUMERIC, drop_charge NUMERIC, total_charge NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_rec RECORD;
  v_drops INTEGER;
  v_vehicle_cost CONSTANT NUMERIC := 2000;
  v_drop_cost    CONSTANT NUMERIC := 50;
BEGIN
  FOR v_rec IN
    SELECT t.id AS transporter_id, t.organization_id, COALESCE(t.vehicle_count, 1) AS vehicle_count
    FROM public.ld_transporters t
    JOIN public.organizations o ON o.id = t.organization_id
    WHERE t.onboarding_status = 'approved' AND o.tenant_mode = 'LOGISTICS_DEPARTMENT'
  LOOP
    SELECT COUNT(*) INTO v_drops
    FROM public.ld_transporter_jobs j
    WHERE j.transporter_id = v_rec.transporter_id
      AND j.status IN ('delivered', 'pod_uploaded')
      AND date_trunc('month', j.delivered_at) = p_billing_month;

    INSERT INTO public.transporter_billing_records (
      organization_id, transporter_id, billing_month,
      vehicle_count, drop_count, vehicle_charge, drop_charge, status
    ) VALUES (
      v_rec.organization_id, v_rec.transporter_id, p_billing_month,
      v_rec.vehicle_count, v_drops,
      v_rec.vehicle_count * v_vehicle_cost, v_drops * v_drop_cost, 'pending'
    )
    ON CONFLICT (transporter_id, billing_month) DO UPDATE SET
      vehicle_count = EXCLUDED.vehicle_count,
      drop_count = EXCLUDED.drop_count,
      vehicle_charge = EXCLUDED.vehicle_charge,
      drop_charge = EXCLUDED.drop_charge;

    RETURN QUERY SELECT
      v_rec.organization_id, v_rec.transporter_id,
      v_rec.vehicle_count * v_vehicle_cost,
      v_drops * v_drop_cost,
      (v_rec.vehicle_count * v_vehicle_cost) + (v_drops * v_drop_cost);
  END LOOP;
END; $$;

DO $$
BEGIN
  PERFORM cron.unschedule('monthly-transporter-billing');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'monthly-transporter-billing',
  '0 1 1 * *',
  $$ SELECT public.generate_transporter_billing(); $$
);
