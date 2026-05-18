-- Reseller client lock: prevents direct signup for 6 months after provisioning
CREATE TABLE IF NOT EXISTS public.reseller_client_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_email TEXT NOT NULL,
  client_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  reseller_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  locked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rcl_email ON public.reseller_client_locks(lower(client_email));
ALTER TABLE public.reseller_client_locks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only" ON public.reseller_client_locks;
CREATE POLICY "Service role only" ON public.reseller_client_locks
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- Reseller price floors
CREATE TABLE IF NOT EXISTS public.reseller_price_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE,
  floor_price_ngn NUMERIC NOT NULL DEFAULT 0,
  floor_price_usd NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);
INSERT INTO public.reseller_price_floors (tier, floor_price_ngn, floor_price_usd) VALUES
  ('starter', 0, 0),
  ('professional', 5000, 99),
  ('enterprise', 10000, 149)
ON CONFLICT (tier) DO NOTHING;
ALTER TABLE public.reseller_price_floors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated read" ON public.reseller_price_floors;
CREATE POLICY "Authenticated read" ON public.reseller_price_floors
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "Super admin write" ON public.reseller_price_floors;
CREATE POLICY "Super admin write" ON public.reseller_price_floors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
  );

-- Reseller price column on organizations
DO $$ BEGIN
  ALTER TABLE public.organizations ADD COLUMN reseller_price NUMERIC;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;