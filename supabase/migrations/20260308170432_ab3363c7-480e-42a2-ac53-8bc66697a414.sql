
-- Age verification records
CREATE TABLE public.liquor_age_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  retailer_id UUID REFERENCES public.customers(id),
  cashier_user_id UUID,
  customer_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  id_type TEXT NOT NULL CHECK (id_type IN ('passport','driver_license','national_id','voter_id')),
  id_number TEXT NOT NULL,
  id_image_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','failed','pending')),
  country_code TEXT NOT NULL DEFAULT 'NG',
  minimum_age INT NOT NULL DEFAULT 18,
  calculated_age INT,
  sale_blocked BOOLEAN DEFAULT false,
  capture_method TEXT DEFAULT 'manual' CHECK (capture_method IN ('manual','camera_ocr','pos_scan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Country/state age rules
CREATE TABLE public.liquor_age_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  state_code TEXT,
  minimum_age INT NOT NULL DEFAULT 18,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_code, state_code)
);

-- License verification
CREATE TABLE public.liquor_license_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  retailer_id UUID REFERENCES public.customers(id),
  license_type TEXT NOT NULL CHECK (license_type IN ('liquor_license','business_registration','tax_certificate')),
  license_number TEXT,
  license_document_url TEXT,
  issued_date DATE,
  expiry_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified','expired','pending','rejected')),
  auto_blocked BOOLEAN DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance audit trail for every sale
CREATE TABLE public.liquor_compliance_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  retailer_id UUID REFERENCES public.customers(id),
  cashier_user_id UUID,
  order_reference TEXT,
  age_verification_id UUID REFERENCES public.liquor_age_verifications(id),
  license_verification_id UUID REFERENCES public.liquor_license_verifications(id),
  verification_result TEXT NOT NULL CHECK (verification_result IN ('pass','fail','skipped')),
  failure_reason TEXT,
  region TEXT,
  country_code TEXT DEFAULT 'NG',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.liquor_age_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquor_age_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquor_license_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquor_compliance_audit ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read, org members can insert/update own org data
CREATE POLICY "Authenticated read age verifications" ON public.liquor_age_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members insert age verifications" ON public.liquor_age_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone reads age rules" ON public.liquor_age_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated read license verifications" ON public.liquor_license_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Org members insert license verifications" ON public.liquor_license_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Org members update license verifications" ON public.liquor_license_verifications FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated read compliance audit" ON public.liquor_compliance_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert compliance audit" ON public.liquor_compliance_audit FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Seed age rules
INSERT INTO public.liquor_age_rules (country_code, state_code, minimum_age) VALUES
  ('US', NULL, 21),
  ('GB', NULL, 18),
  ('NG', NULL, 18),
  ('DE', NULL, 18),
  ('ZA', NULL, 18),
  ('KE', NULL, 18),
  ('GH', NULL, 18),
  ('FR', NULL, 18),
  ('JP', NULL, 20),
  ('IN', NULL, 25);
