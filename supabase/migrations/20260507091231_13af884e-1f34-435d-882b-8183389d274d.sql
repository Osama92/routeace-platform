-- ── 1. Extend dispatches ─────────────────────────────────────────
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN km_planned NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN km_actual NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.dispatches ADD COLUMN km_deviation_pct NUMERIC GENERATED ALWAYS AS (
    CASE WHEN km_planned > 0 AND km_actual IS NOT NULL
      THEN ROUND(((km_actual - km_planned) / km_planned) * 100, 1) ELSE NULL END
  ) STORED;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN eta_promised TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN actual_arrival_time TIMESTAMPTZ; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN eta_met BOOLEAN; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN load_capacity_pct NUMERIC; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN sequence_followed BOOLEAN; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE public.dispatches ADD COLUMN unplanned_stops INTEGER DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ── 2. Refusals ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_refusals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  refusal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason_bucket TEXT NOT NULL CHECK (reason_bucket IN
    ('stock_out','credit_issue','logistics_issue','master_data','customer_refusal','quality_issue','other')),
  volume_refused_kg NUMERIC DEFAULT 0,
  sku_description TEXT,
  notes TEXT,
  modulated BOOLEAN NOT NULL DEFAULT false,
  modulation_action TEXT,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_refusals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read refusals" ON public.ld_refusals FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Ops log refusals" ON public.ld_refusals FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true) AND logged_by = auth.uid());
CREATE POLICY "Managers update refusals" ON public.ld_refusals FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')));
CREATE INDEX IF NOT EXISTS idx_ld_refusals_org_date ON public.ld_refusals(organization_id, refusal_date DESC);

-- ── 3. DQI ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_dqi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_volume_kg NUMERIC NOT NULL DEFAULT 0,
  damaged_volume_kg NUMERIC NOT NULL DEFAULT 0 CHECK (damaged_volume_kg >= 0),
  damage_type TEXT NOT NULL DEFAULT 'handling' CHECK (damage_type IN
    ('handling','breakage','temperature','contamination','crush','expired','packaging','other')),
  damage_description TEXT,
  occurred_at TEXT NOT NULL DEFAULT 'in_transit' CHECK (occurred_at IN ('loading','in_transit','unloading','at_customer')),
  dqi_ppm NUMERIC GENERATED ALWAYS AS (
    CASE WHEN total_volume_kg > 0 THEN ROUND((damaged_volume_kg / total_volume_kg) * 1000000, 0) ELSE 0 END
  ) STORED,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_dqi_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read DQI" ON public.ld_dqi_records FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Ops log DQI" ON public.ld_dqi_records FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true) AND logged_by = auth.uid());
CREATE INDEX IF NOT EXISTS idx_ld_dqi_org_date ON public.ld_dqi_records(organization_id, record_date DESC);

-- ── 4. Complaints ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE SET NULL,
  complaint_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  complaint_type TEXT NOT NULL CHECK (complaint_type IN
    ('late_delivery','wrong_quantity','wrong_product','damaged_goods','driver_behaviour','billing','other')),
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  sla_hours INTEGER NOT NULL DEFAULT 24,
  sla_due_at TIMESTAMPTZ,
  sla_breached BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read complaints" ON public.ld_complaints FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Org members manage complaints" ON public.ld_complaints FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE INDEX IF NOT EXISTS idx_ld_complaints_org_date ON public.ld_complaints(organization_id, complaint_date DESC);

CREATE OR REPLACE FUNCTION public.manage_complaint_sla()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + (NEW.sla_hours || ' hours')::interval;
  END IF;
  IF NEW.sla_due_at < now() AND NEW.status NOT IN ('resolved','closed') THEN
    NEW.sla_breached := true;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_complaint_sla ON public.ld_complaints;
CREATE TRIGGER trg_complaint_sla BEFORE INSERT OR UPDATE ON public.ld_complaints
  FOR EACH ROW EXECUTE FUNCTION public.manage_complaint_sla();

-- ── 5. S&OP Meetings ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_sop_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meeting_type TEXT NOT NULL DEFAULT 'weekly_review' CHECK (meeting_type IN
    ('weekly_review','monthly_ops','peak_planning','emergency','s_and_op')),
  attendees TEXT[],
  kpis_reviewed TEXT[],
  red_kpis TEXT[],
  action_items JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  next_meeting_date DATE,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_sop_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read meetings" ON public.ld_sop_meetings FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Managers log meetings" ON public.ld_sop_meetings FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')));
CREATE INDEX IF NOT EXISTS idx_ld_sop_org_date ON public.ld_sop_meetings(organization_id, meeting_date DESC);

-- ── 6. Inventory DOI ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dept_inventory_doi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sku_code TEXT NOT NULL,
  sku_name TEXT,
  current_stock NUMERIC NOT NULL DEFAULT 0,
  avg_daily_usage NUMERIC NOT NULL DEFAULT 1,
  doi_current NUMERIC GENERATED ALWAYS AS (
    CASE WHEN avg_daily_usage > 0 THEN ROUND(current_stock / avg_daily_usage, 1) ELSE NULL END
  ) STORED,
  doi_minimum NUMERIC NOT NULL DEFAULT 3,
  doi_maximum NUMERIC NOT NULL DEFAULT 30,
  doi_status TEXT GENERATED ALWAYS AS (
    CASE
      WHEN avg_daily_usage <= 0 THEN 'unknown'
      WHEN (current_stock / NULLIF(avg_daily_usage,0)) < doi_minimum THEN 'below_minimum'
      WHEN (current_stock / NULLIF(avg_daily_usage,0)) > doi_maximum THEN 'above_maximum'
      ELSE 'in_range'
    END
  ) STORED,
  source_system TEXT DEFAULT 'manual',
  last_synced_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, sku_code)
);
ALTER TABLE public.dept_inventory_doi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read inventory DOI" ON public.dept_inventory_doi FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Managers write inventory DOI" ON public.dept_inventory_doi FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Service role write inventory DOI" ON public.dept_inventory_doi FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
CREATE INDEX IF NOT EXISTS idx_doi_org_sku ON public.dept_inventory_doi(organization_id, sku_code);
CREATE INDEX IF NOT EXISTS idx_doi_status ON public.dept_inventory_doi(organization_id, doi_status);

-- ── 7. Risk Register ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_risk_register (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  risk_title TEXT NOT NULL,
  risk_category TEXT NOT NULL CHECK (risk_category IN
    ('natural_disaster','health_safety','security','regulatory','political','labor','supplier','technology','financial','other')),
  risk_description TEXT,
  likelihood INTEGER NOT NULL DEFAULT 3 CHECK (likelihood BETWEEN 1 AND 5),
  impact INTEGER NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,
  risk_level TEXT GENERATED ALWAYS AS (
    CASE WHEN likelihood * impact >= 15 THEN 'critical'
         WHEN likelihood * impact >= 10 THEN 'high'
         WHEN likelihood * impact >= 5 THEN 'medium' ELSE 'low' END
  ) STORED,
  mitigation_plan TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','mitigating','resolved','accepted','monitoring')),
  owner TEXT,
  review_date DATE,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ld_risk_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read risks" ON public.ld_risk_register FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Managers manage risks" ON public.ld_risk_register FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE INDEX IF NOT EXISTS idx_ld_risks_org ON public.ld_risk_register(organization_id, risk_level, status);

-- ── 8. Peak Periods ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ld_peak_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  expected_volume_multiplier NUMERIC NOT NULL DEFAULT 1.3,
  capacity_plan TEXT,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning','active','completed','cancelled')),
  notes TEXT,
  logged_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT valid_peak_dates CHECK (end_date >= start_date)
);
ALTER TABLE public.ld_peak_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members read peak periods" ON public.ld_peak_periods FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Managers manage peak periods" ON public.ld_peak_periods FOR ALL TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','admin','org_admin')))
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND is_active = true));