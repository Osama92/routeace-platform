
-- =====================================================
-- ROUTEACE PLANET-SCALE EXPANSION: FOUNDATION TABLES
-- =====================================================

-- 1. SUPPORTED LANGUAGES
CREATE TABLE public.supported_languages (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr',
  is_active BOOLEAN NOT NULL DEFAULT true,
  coverage_percent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read supported languages"
  ON public.supported_languages FOR SELECT USING (true);

CREATE POLICY "Core team can manage languages"
  ON public.supported_languages FOR ALL USING (public.is_core_team(auth.uid()));

-- 2. GLOBAL REGIONS
CREATE TABLE public.global_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  continent TEXT NOT NULL,
  sub_region TEXT,
  currency_code TEXT NOT NULL DEFAULT 'USD',
  currency_symbol TEXT NOT NULL DEFAULT '$',
  currency_name TEXT NOT NULL DEFAULT 'US Dollar',
  default_language TEXT NOT NULL DEFAULT 'en' REFERENCES public.supported_languages(code),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  calling_code TEXT,
  flag_emoji TEXT,
  map_provider TEXT NOT NULL DEFAULT 'google',
  map_fallback_provider TEXT DEFAULT 'openstreetmap',
  payment_gateway TEXT NOT NULL DEFAULT 'stripe',
  payment_fallback_gateway TEXT,
  vat_type TEXT DEFAULT 'standard',
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_engine_type TEXT DEFAULT 'generic',
  requires_gdpr BOOLEAN NOT NULL DEFAULT false,
  requires_ccpa BOOLEAN NOT NULL DEFAULT false,
  requires_data_localization BOOLEAN NOT NULL DEFAULT false,
  requires_eld BOOLEAN NOT NULL DEFAULT false,
  requires_carbon_reporting BOOLEAN NOT NULL DEFAULT false,
  purchasing_power_index NUMERIC(5,3) NOT NULL DEFAULT 1.000,
  base_price_multiplier NUMERIC(5,3) NOT NULL DEFAULT 1.000,
  fx_buffer_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  settlement_currency TEXT NOT NULL DEFAULT 'USD',
  terrain_type TEXT DEFAULT 'standard',
  route_weight_snow BOOLEAN NOT NULL DEFAULT false,
  route_weight_mountain BOOLEAN NOT NULL DEFAULT false,
  route_weight_toll BOOLEAN NOT NULL DEFAULT false,
  route_weight_border BOOLEAN NOT NULL DEFAULT false,
  route_weight_congestion BOOLEAN NOT NULL DEFAULT false,
  road_quality_score INTEGER DEFAULT 70,
  offline_mode_priority BOOLEAN NOT NULL DEFAULT false,
  low_bandwidth_mode BOOLEAN NOT NULL DEFAULT false,
  cash_on_delivery_enabled BOOLEAN NOT NULL DEFAULT false,
  informal_workforce_mode BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_priority_market BOOLEAN NOT NULL DEFAULT false,
  launch_phase INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read global regions" ON public.global_regions FOR SELECT USING (true);
CREATE POLICY "Core team can manage global regions" ON public.global_regions FOR ALL USING (public.is_core_team(auth.uid()));

CREATE TRIGGER update_global_regions_updated_at
  BEFORE UPDATE ON public.global_regions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. REGULATORY MODULES
CREATE TABLE public.regulatory_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  country_code TEXT NOT NULL UNIQUE REFERENCES public.global_regions(country_code),
  driver_tax_rule TEXT DEFAULT 'generic',
  payroll_structure TEXT DEFAULT 'standard',
  data_privacy_rule TEXT DEFAULT 'none',
  transport_compliance_rule TEXT DEFAULT 'none',
  vat_logic TEXT DEFAULT 'standard',
  insurance_requirement TEXT DEFAULT 'optional',
  fuel_regulation TEXT DEFAULT 'none',
  carbon_reporting_rule TEXT DEFAULT 'none',
  eld_requirement TEXT DEFAULT 'none',
  customs_integration TEXT DEFAULT 'none',
  labor_classification TEXT DEFAULT 'employee',
  max_driving_hours INTEGER,
  rest_period_hours INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.regulatory_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read regulatory modules" ON public.regulatory_modules FOR SELECT USING (true);
CREATE POLICY "Core team can manage regulatory modules" ON public.regulatory_modules FOR ALL USING (public.is_core_team(auth.uid()));

CREATE TRIGGER update_regulatory_modules_updated_at
  BEFORE UPDATE ON public.regulatory_modules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. LANGUAGE PACKS
CREATE TABLE public.language_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language_code TEXT NOT NULL REFERENCES public.supported_languages(code),
  namespace TEXT NOT NULL DEFAULT 'common',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(language_code, namespace, key)
);

ALTER TABLE public.language_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read language packs" ON public.language_packs FOR SELECT USING (true);
CREATE POLICY "Core team can manage language packs" ON public.language_packs FOR ALL USING (public.is_core_team(auth.uid()));

-- 5. CONTINENTAL FEATURE FLAGS
CREATE TABLE public.continental_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  continent TEXT,
  country_code TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.continental_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read continental features" ON public.continental_features FOR SELECT USING (true);
CREATE POLICY "Core team can manage continental features" ON public.continental_features FOR ALL USING (public.is_core_team(auth.uid()));

CREATE UNIQUE INDEX idx_continental_features_unique ON public.continental_features(feature_key, COALESCE(continent, ''), COALESCE(country_code, ''));

-- 6. PAYMENT GATEWAYS REGISTRY
CREATE TABLE public.payment_gateways (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  supported_currencies TEXT[] NOT NULL DEFAULT '{}',
  supports_subscriptions BOOLEAN NOT NULL DEFAULT true,
  supports_per_drop_billing BOOLEAN NOT NULL DEFAULT false,
  supports_mobile_money BOOLEAN NOT NULL DEFAULT false,
  webhook_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read payment gateways" ON public.payment_gateways FOR SELECT USING (true);
CREATE POLICY "Core team can manage payment gateways" ON public.payment_gateways FOR ALL USING (public.is_core_team(auth.uid()));

-- Indexes
CREATE INDEX idx_global_regions_continent ON public.global_regions(continent);
CREATE INDEX idx_global_regions_active ON public.global_regions(is_active);
CREATE INDEX idx_global_regions_priority ON public.global_regions(is_priority_market);
CREATE INDEX idx_language_packs_lookup ON public.language_packs(language_code, namespace);
CREATE INDEX idx_continental_features_lookup ON public.continental_features(feature_key, continent);
CREATE INDEX idx_regulatory_modules_country ON public.regulatory_modules(country_code);

-- Seed languages
INSERT INTO public.supported_languages (code, name, native_name, direction, is_active, coverage_percent) VALUES
  ('en', 'English', 'English', 'ltr', true, 100),
  ('fr', 'French', 'Français', 'ltr', true, 85),
  ('ar', 'Arabic', 'العربية', 'rtl', true, 70),
  ('pt', 'Portuguese', 'Português', 'ltr', true, 65),
  ('es', 'Spanish', 'Español', 'ltr', true, 80),
  ('zh', 'Mandarin', '中文', 'ltr', true, 50),
  ('hi', 'Hindi', 'हिन्दी', 'ltr', true, 45),
  ('de', 'German', 'Deutsch', 'ltr', true, 60),
  ('sw', 'Swahili', 'Kiswahili', 'ltr', false, 20),
  ('ha', 'Hausa', 'Hausa', 'ltr', false, 15),
  ('yo', 'Yoruba', 'Yorùbá', 'ltr', false, 10),
  ('ig', 'Igbo', 'Igbo', 'ltr', false, 10);

-- Seed payment gateways
INSERT INTO public.payment_gateways (gateway_code, display_name, supported_currencies, supports_subscriptions, supports_per_drop_billing, supports_mobile_money, webhook_path) VALUES
  ('paystack', 'Paystack', ARRAY['NGN','GHS','ZAR','USD','KES'], true, true, false, '/webhooks/paystack'),
  ('flutterwave', 'Flutterwave', ARRAY['NGN','GHS','KES','ZAR','USD','GBP','EUR','TZS','UGX','XOF','XAF'], true, true, true, '/webhooks/flutterwave'),
  ('stripe', 'Stripe', ARRAY['USD','GBP','EUR','CAD','AED','AUD','SGD','HKD','JPY','CHF','SEK','NOK','DKK','NZD','MXN','BRL','INR'], true, true, false, '/webhooks/stripe'),
  ('stripe_sepa', 'Stripe (SEPA)', ARRAY['EUR'], true, false, false, '/webhooks/stripe'),
  ('razorpay', 'Razorpay', ARRAY['INR','USD'], true, true, true, '/webhooks/razorpay'),
  ('paypal', 'PayPal', ARRAY['USD','GBP','EUR','CAD','AUD','JPY','CHF','SEK','NOK','DKK','MXN','BRL','SGD','HKD','NZD'], true, false, false, '/webhooks/paypal'),
  ('mpesa', 'M-Pesa', ARRAY['KES','TZS','UGX','MZN','GHS'], false, true, true, '/webhooks/mpesa'),
  ('mtn_momo', 'MTN Mobile Money', ARRAY['GHS','UGX','RWF','ZMW'], false, true, true, '/webhooks/mtn-momo'),
  ('orange_money', 'Orange Money', ARRAY['XOF','XAF','MAD','GNF'], false, true, true, '/webhooks/orange-money');

-- Seed continental features
INSERT INTO public.continental_features (feature_key, feature_name, description, continent, is_enabled, config) VALUES
  ('carbon_calculator', 'Carbon Emission Calculator', 'Per-route carbon emission tracking and ESG reporting', 'Europe', true, '{"co2_per_km_diesel": 2.68, "reporting_standard": "EU_ETS"}'),
  ('esg_reporting', 'ESG Reporting Module', 'Environmental, Social, Governance compliance reporting', 'Europe', true, '{}'),
  ('eld_integration', 'ELD Integration', 'Electronic Logging Device compliance for DOT regulations', 'North America', true, '{"dot_compliant": true, "max_driving_hours": 11}'),
  ('mileage_tax', 'Mileage Tax Calculator', 'Per-mile/km tax calculation', 'North America', true, '{}'),
  ('terrain_scoring', 'African Terrain Optimization', 'Road quality scoring, rural delivery buffers', 'Africa', true, '{"road_quality_weight": 0.3}'),
  ('cod_reconciliation', 'Cash-on-Delivery Reconciliation', 'COD collection tracking', 'Africa', true, '{}'),
  ('fuel_scarcity_alerts', 'Fuel Scarcity Alert System', 'Real-time fuel availability monitoring', 'Africa', true, '{}'),
  ('megacity_clustering', 'Mega-City Clustering Engine', 'High-density urban route optimization', 'Asia', true, '{"min_density_threshold": 10000}'),
  ('traffic_heatmap', 'Traffic Heatmap Learning', 'AI-driven traffic pattern prediction', 'Asia', true, '{}'),
  ('currency_hedge', 'Dynamic Currency Hedge Module', 'Inflation-aware pricing and FX hedging', 'South America', true, '{"hedge_threshold_percent": 10}'),
  ('longhaul_maintenance', 'Long-Haul Predictive Maintenance', 'Predictive maintenance scoring for sparse geography', 'Oceania', true, '{"max_distance_km": 5000}'),
  ('offline_sync', 'Offline Synchronization', 'Full offline mode with sync-on-reconnect', NULL, true, '{}'),
  ('low_bandwidth', 'Low Bandwidth Optimization', 'Compressed data mode for limited connectivity', NULL, true, '{}');
