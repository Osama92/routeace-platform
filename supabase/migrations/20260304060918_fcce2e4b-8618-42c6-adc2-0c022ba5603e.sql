
-- PortoDash ExportTech Tables
CREATE TABLE public.export_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_country TEXT NOT NULL,
  buyer_verified BOOLEAN DEFAULT false,
  product_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  contract_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft',
  compliance_status TEXT DEFAULT 'pending',
  exporter_of_record TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.export_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own export contracts" ON public.export_contracts FOR ALL USING (auth.uid() = operator_id) WITH CHECK (auth.uid() = operator_id);

CREATE TABLE public.export_aggregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.export_contracts(id) ON DELETE CASCADE,
  supplier_name TEXT NOT NULL,
  supplier_verified BOOLEAN DEFAULT false,
  product_type TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.export_aggregations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage export aggregations" ON public.export_aggregations FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

CREATE TABLE public.fx_repatriation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.export_contracts(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_usd NUMERIC NOT NULL,
  amount_ngn NUMERIC NOT NULL,
  fx_rate NUMERIC NOT NULL,
  bank_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  repatriated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fx_repatriation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own fx logs" ON public.fx_repatriation_log FOR SELECT USING (auth.uid() = operator_id);
CREATE POLICY "Admins manage fx logs" ON public.fx_repatriation_log FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Regulatory Rules Engine
CREATE TABLE public.regulatory_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'NG',
  regulation_code TEXT NOT NULL,
  regulation_name TEXT NOT NULL,
  requirement_list JSONB NOT NULL DEFAULT '[]',
  enforcement_action TEXT NOT NULL DEFAULT 'warn',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.regulatory_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read regulatory rules" ON public.regulatory_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage regulatory rules" ON public.regulatory_rules FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Liquor Age Verification Log
CREATE TABLE public.liquor_age_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  outlet_id UUID,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  id_photo_url TEXT,
  dob_extracted DATE,
  age_at_sale INTEGER,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  consent_captured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.liquor_age_verification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage age verification" ON public.liquor_age_verification_log FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Agri Input Compliance
CREATE TABLE public.agri_input_compliance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  batch_approval_number TEXT,
  safety_certificate_url TEXT,
  farm_geo_lat NUMERIC,
  farm_geo_lng NUMERIC,
  is_compliant BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agri_input_compliance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage agri compliance" ON public.agri_input_compliance FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'ops_manager')
);

-- Predictive Intelligence Forecasts
CREATE TABLE public.predictive_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  predicted_value NUMERIC NOT NULL,
  confidence_score NUMERIC NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  factors JSONB DEFAULT '{}',
  forecast_period TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.predictive_forecasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users read forecasts" ON public.predictive_forecasts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage forecasts" ON public.predictive_forecasts FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Buyer/Supplier Verification (Trust Model)
CREATE TABLE public.trade_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_name TEXT NOT NULL,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL,
  score NUMERIC DEFAULT 0,
  documents JSONB DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trade_verifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read trade verifications" ON public.trade_verifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage trade verifications" ON public.trade_verifications FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')
);

-- Add triggers for updated_at
CREATE TRIGGER update_export_contracts_updated_at BEFORE UPDATE ON public.export_contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_regulatory_rules_updated_at BEFORE UPDATE ON public.regulatory_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_trade_verifications_updated_at BEFORE UPDATE ON public.trade_verifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
