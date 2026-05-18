
-- Trip-level profitability (per dispatch)
CREATE TABLE IF NOT EXISTS public.trip_profitability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID REFERENCES public.dispatches(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  driver_id UUID REFERENCES public.drivers(id),
  route_key TEXT,
  revenue NUMERIC DEFAULT 0,
  fuel_cost NUMERIC DEFAULT 0,
  driver_cost NUMERIC DEFAULT 0,
  maintenance_cost NUMERIC DEFAULT 0,
  toll_cost NUMERIC DEFAULT 0,
  loading_cost NUMERIC DEFAULT 0,
  third_party_cost NUMERIC DEFAULT 0,
  other_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC GENERATED ALWAYS AS (fuel_cost + driver_cost + maintenance_cost + toll_cost + loading_cost + third_party_cost + other_cost) STORED,
  profit NUMERIC GENERATED ALWAYS AS (revenue - (fuel_cost + driver_cost + maintenance_cost + toll_cost + loading_cost + third_party_cost + other_cost)) STORED,
  margin_percent NUMERIC GENERATED ALWAYS AS (
    CASE WHEN revenue > 0 
      THEN ((revenue - (fuel_cost + driver_cost + maintenance_cost + toll_cost + loading_cost + third_party_cost + other_cost)) / revenue) * 100
      ELSE 0 
    END
  ) STORED,
  period_month INTEGER,
  period_year INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(dispatch_id)
);

ALTER TABLE public.trip_profitability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trip profitability"
  ON public.trip_profitability FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert trip profitability"
  ON public.trip_profitability FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update trip profitability"
  ON public.trip_profitability FOR UPDATE TO authenticated
  USING (true);

-- Schema versioning table
CREATE TABLE IF NOT EXISTS public.schema_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  description TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  applied_by TEXT,
  is_reversible BOOLEAN DEFAULT true,
  rollback_sql TEXT,
  status TEXT DEFAULT 'applied'
);

ALTER TABLE public.schema_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view schema versions"
  ON public.schema_versions FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admins can manage schema versions"
  ON public.schema_versions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

INSERT INTO public.schema_versions (version, description, applied_by, status)
VALUES ('1.0.0', 'Initial platform schema with Logistics OS, Finance, and Identity', 'system', 'applied');

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_profitability;
