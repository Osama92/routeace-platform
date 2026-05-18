
-- =========================================================
-- WORKFORCE INTELLIGENCE — PHASE 2 (Modules 7-15)
-- Non-destructive: only CREATE statements, no ALTERs to existing.
-- =========================================================

-- ---------- 1. staff_signins ----------
CREATE TABLE IF NOT EXISTS public.staff_signins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid,
  signin_date date NOT NULL DEFAULT CURRENT_DATE,
  signin_at timestamptz,
  signout_at timestamptz,
  signin_lat numeric(10,6),
  signin_lng numeric(10,6),
  signout_lat numeric(10,6),
  signout_lng numeric(10,6),
  selfie_url text,
  status text NOT NULL DEFAULT 'on_time' CHECK (status IN ('on_time','late','absent','half_day','remote')),
  notes text,
  device_info jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, signin_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_signins_user_date ON public.staff_signins(user_id, signin_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_signins_org_date  ON public.staff_signins(organization_id, signin_date DESC);

ALTER TABLE public.staff_signins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own signins"
  ON public.staff_signins FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users create own signins"
  ON public.staff_signins FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own signins same day"
  ON public.staff_signins FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND signin_date = CURRENT_DATE);

CREATE POLICY "Managers view all signins"
  ON public.staff_signins FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid()) OR is_ops_manager(auth.uid())
    OR has_role(auth.uid(),'operations')
  );

CREATE POLICY "Managers manage signins"
  ON public.staff_signins FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid())
  );

CREATE TRIGGER trg_staff_signins_updated
  BEFORE UPDATE ON public.staff_signins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. staff_kpi_entries ----------
CREATE TABLE IF NOT EXISTS public.staff_kpi_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid,
  role_tag text,                       -- e.g. 'driver','support','sales'
  metric_key text NOT NULL,            -- e.g. 'deliveries_completed','tickets_resolved'
  metric_label text,
  metric_value numeric NOT NULL DEFAULT 0,
  target_value numeric,
  unit text DEFAULT 'count',
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  source text DEFAULT 'manual',        -- 'manual' | 'auto_dispatch' | 'auto_ticket' | 'system'
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_entries_user_date ON public.staff_kpi_entries(user_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_entries_metric    ON public.staff_kpi_entries(metric_key, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_entries_org       ON public.staff_kpi_entries(organization_id, entry_date DESC);

ALTER TABLE public.staff_kpi_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kpi"
  ON public.staff_kpi_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own kpi"
  ON public.staff_kpi_entries FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Managers view all kpi"
  ON public.staff_kpi_entries FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid()) OR is_ops_manager(auth.uid())
    OR has_role(auth.uid(),'operations')
  );

CREATE POLICY "Managers manage kpi"
  ON public.staff_kpi_entries FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()));

CREATE TRIGGER trg_kpi_entries_updated
  BEFORE UPDATE ON public.staff_kpi_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 3. staff_performance_scores ----------
CREATE TABLE IF NOT EXISTS public.staff_performance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  organization_id uuid,
  period_type text NOT NULL DEFAULT 'weekly' CHECK (period_type IN ('daily','weekly','monthly','quarterly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  score numeric(5,2) NOT NULL DEFAULT 0,        -- 0-100
  tier text NOT NULL DEFAULT 'developing'       -- 'top','strong','developing','at_risk'
       CHECK (tier IN ('top','strong','developing','at_risk')),
  attendance_score numeric(5,2) DEFAULT 0,
  productivity_score numeric(5,2) DEFAULT 0,
  quality_score numeric(5,2) DEFAULT 0,
  strengths jsonb DEFAULT '[]'::jsonb,
  gaps jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  ai_summary text,
  computed_by text DEFAULT 'system',            -- 'system' | 'ai' | 'manager'
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_perf_user_period ON public.staff_performance_scores(user_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_perf_org_period  ON public.staff_performance_scores(organization_id, period_start DESC);

ALTER TABLE public.staff_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own performance"
  ON public.staff_performance_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers view all performance"
  ON public.staff_performance_scores FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid()) OR is_ops_manager(auth.uid())
  );

CREATE POLICY "Managers write performance"
  ON public.staff_performance_scores FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()))
  WITH CHECK (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()) OR is_org_admin(auth.uid()));

CREATE TRIGGER trg_perf_scores_updated
  BEFORE UPDATE ON public.staff_performance_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 4. workforce_audit_log (append-only) ----------
CREATE TABLE IF NOT EXISTS public.workforce_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  target_user_id uuid,
  organization_id uuid,
  action text NOT NULL,                       -- 'salary_view','signin_override','perf_publish', etc.
  entity_type text,
  entity_id uuid,
  pin_confirmed boolean NOT NULL DEFAULT false,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workforce_audit_actor   ON public.workforce_audit_log(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workforce_audit_target  ON public.workforce_audit_log(target_user_id, created_at DESC);

ALTER TABLE public.workforce_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read workforce audit"
  ON public.workforce_audit_log FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR is_super_admin(auth.uid()));

CREATE POLICY "Authenticated insert workforce audit"
  ON public.workforce_audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

CREATE OR REPLACE FUNCTION public.block_workforce_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'workforce_audit_log is append-only';
END $$;

CREATE TRIGGER trg_block_workforce_audit_update
  BEFORE UPDATE OR DELETE ON public.workforce_audit_log
  FOR EACH ROW EXECUTE FUNCTION public.block_workforce_audit_mutation();
