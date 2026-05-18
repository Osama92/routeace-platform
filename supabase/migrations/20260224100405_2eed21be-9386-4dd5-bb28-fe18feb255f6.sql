
-- Approval Risk Scores
CREATE TABLE public.approval_risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  explainability_summary TEXT,
  model_version TEXT DEFAULT 'v1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_risk_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read risk scores" ON public.approval_risk_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert risk scores" ON public.approval_risk_scores FOR INSERT TO authenticated WITH CHECK (true);

-- Fraud Flags
CREATE TABLE public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  fraud_type TEXT NOT NULL,
  confidence_score INTEGER NOT NULL DEFAULT 0 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  trigger_source TEXT,
  explanation TEXT,
  flag_status TEXT NOT NULL DEFAULT 'active' CHECK (flag_status IN ('active', 'dismissed', 'escalated', 'confirmed')),
  dismissed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read fraud flags" ON public.fraud_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage fraud flags" ON public.fraud_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Approval Delay Predictions
CREATE TABLE public.approval_delay_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  predicted_approval_hours NUMERIC NOT NULL DEFAULT 0,
  confidence_level NUMERIC NOT NULL DEFAULT 0,
  delay_risk_level TEXT NOT NULL DEFAULT 'low' CHECK (delay_risk_level IN ('low', 'medium', 'high', 'critical')),
  factors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.approval_delay_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read delay predictions" ON public.approval_delay_predictions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert delay predictions" ON public.approval_delay_predictions FOR INSERT TO authenticated WITH CHECK (true);

-- Treasury Stress Index
CREATE TABLE public.treasury_stress_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  stress_score INTEGER NOT NULL DEFAULT 0 CHECK (stress_score >= 0 AND stress_score <= 100),
  liquidity_ratio NUMERIC DEFAULT 0,
  runway_days NUMERIC DEFAULT 0,
  fx_exposure NUMERIC DEFAULT 0,
  ar_pressure NUMERIC DEFAULT 0,
  ap_pressure NUMERIC DEFAULT 0,
  current_ratio NUMERIC DEFAULT 0,
  factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.treasury_stress_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read treasury stress" ON public.treasury_stress_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert treasury stress" ON public.treasury_stress_index FOR INSERT TO authenticated WITH CHECK (true);

-- Global Shipments (Diaspora Trade)
CREATE TABLE public.global_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_country TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  origin_logistics_partner TEXT,
  destination_logistics_partner TEXT,
  sender_user_id UUID REFERENCES auth.users(id),
  receiver_name TEXT,
  receiver_phone TEXT,
  receiver_address TEXT,
  customs_status TEXT DEFAULT 'pending' CHECK (customs_status IN ('pending', 'cleared_origin', 'in_transit', 'cleared_destination', 'delivered', 'held')),
  duty_estimate NUMERIC DEFAULT 0,
  vat_estimate NUMERIC DEFAULT 0,
  insurance_status TEXT DEFAULT 'none',
  total_landed_cost NUMERIC DEFAULT 0,
  escrow_wallet_id UUID,
  risk_score INTEGER DEFAULT 0,
  tracking_number TEXT,
  weight_kg NUMERIC,
  description TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'picked_up', 'export_clearance', 'in_transit_international', 'import_clearance', 'inland_dispatch', 'out_for_delivery', 'delivered', 'returned', 'cancelled')),
  currency TEXT DEFAULT 'USD',
  total_value NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.global_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own shipments" ON public.global_shipments FOR SELECT TO authenticated USING (sender_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can create shipments" ON public.global_shipments FOR INSERT TO authenticated WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "Admin can manage shipments" ON public.global_shipments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Agent Profiles (Diaspora Agent Network)
CREATE TABLE public.agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  country TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('pickup', 'dropoff', 'community_hub', 'inland_dispatch', 'clearance')),
  verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN ('unverified', 'basic', 'verified', 'premium')),
  rating NUMERIC DEFAULT 0,
  insurance_status TEXT DEFAULT 'none',
  wallet_id UUID,
  compliance_score INTEGER DEFAULT 0,
  reliability_score INTEGER DEFAULT 0,
  financial_trust_score INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  government_id_verified BOOLEAN DEFAULT false,
  address_verified BOOLEAN DEFAULT false,
  bank_verified BOOLEAN DEFAULT false,
  vehicle_registered BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agent_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read agent profiles" ON public.agent_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can manage own agent profile" ON public.agent_profiles FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Vendor Credit Ratings
CREATE TABLE public.vendor_credit_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  vendor_name TEXT NOT NULL,
  credit_score INTEGER NOT NULL DEFAULT 500 CHECK (credit_score >= 0 AND credit_score <= 1000),
  on_time_delivery_rate NUMERIC DEFAULT 0,
  damage_rate NUMERIC DEFAULT 0,
  claim_frequency NUMERIC DEFAULT 0,
  invoice_accuracy NUMERIC DEFAULT 0,
  fraud_flags_count INTEGER DEFAULT 0,
  corridor_risk_index NUMERIC DEFAULT 0,
  payout_speed_tier TEXT DEFAULT 'standard' CHECK (payout_speed_tier IN ('instant', 'fast', 'standard', 'slow', 'hold')),
  escrow_hold_days INTEGER DEFAULT 7,
  eligible_for_freight_finance BOOLEAN DEFAULT false,
  factors JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_credit_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read vendor ratings" ON public.vendor_credit_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage vendor ratings" ON public.vendor_credit_ratings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Freight Performance Notes (Structured Finance)
CREATE TABLE public.freight_performance_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID,
  dispatch_id UUID,
  note_value NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  yield_rate NUMERIC DEFAULT 0,
  insurance_coverage NUMERIC DEFAULT 0,
  escrow_locked BOOLEAN DEFAULT false,
  vendor_credit_score INTEGER DEFAULT 0,
  corridor_risk_index NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matured', 'defaulted', 'cancelled')),
  investor_type TEXT DEFAULT 'institutional',
  maturity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.freight_performance_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read freight notes" ON public.freight_performance_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage freight notes" ON public.freight_performance_notes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
