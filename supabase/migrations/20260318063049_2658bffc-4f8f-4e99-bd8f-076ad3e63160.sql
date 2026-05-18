
CREATE TABLE IF NOT EXISTS public.dispatch_delay_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  notes TEXT,
  reported_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dispatch_delay_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view delay reasons"
ON public.dispatch_delay_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert delay reasons"
ON public.dispatch_delay_reasons FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX idx_delay_reasons_category ON public.dispatch_delay_reasons(category);
CREATE INDEX idx_delay_reasons_dispatch ON public.dispatch_delay_reasons(dispatch_id);
