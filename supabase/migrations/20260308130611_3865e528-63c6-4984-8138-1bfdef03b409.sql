
-- Field-level returns logged by sales reps
CREATE TABLE public.fmcg_field_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES public.fmcg_outlets(id),
  outlet_name TEXT NOT NULL,
  sales_rep_id UUID,
  items_count INTEGER DEFAULT 0,
  reason TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fmcg_field_returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read field returns"
  ON public.fmcg_field_returns FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert field returns"
  ON public.fmcg_field_returns FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update field returns"
  ON public.fmcg_field_returns FOR UPDATE TO authenticated USING (true);

CREATE INDEX idx_fmcg_field_returns_rep ON public.fmcg_field_returns(sales_rep_id);
CREATE INDEX idx_fmcg_field_returns_outlet ON public.fmcg_field_returns(outlet_id);
CREATE INDEX idx_fmcg_field_returns_status ON public.fmcg_field_returns(status);
