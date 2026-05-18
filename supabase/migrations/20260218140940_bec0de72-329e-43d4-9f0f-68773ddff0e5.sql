
-- Country configuration table for global expansion
CREATE TABLE public.country_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  currency_code TEXT NOT NULL DEFAULT 'NGN',
  currency_symbol TEXT NOT NULL DEFAULT '₦',
  locale TEXT NOT NULL DEFAULT 'en-NG',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  
  -- Pricing tiers (per vehicle/month)
  starter_price NUMERIC NOT NULL DEFAULT 0,
  growth_price NUMERIC NOT NULL DEFAULT 0,
  enterprise_price NUMERIC NOT NULL DEFAULT 0,
  per_drop_price NUMERIC NOT NULL DEFAULT 0,
  ai_addon_price NUMERIC DEFAULT 0,
  
  -- Tax config
  tax_engine_type TEXT NOT NULL DEFAULT 'nigerian_paye',
  vat_rate NUMERIC NOT NULL DEFAULT 7.5,
  requires_gdpr BOOLEAN NOT NULL DEFAULT false,
  requires_ccpa BOOLEAN NOT NULL DEFAULT false,
  requires_data_localization BOOLEAN NOT NULL DEFAULT false,
  
  -- SLA defaults
  sla_zones JSONB DEFAULT '[]'::jsonb,
  
  -- Payment provider
  payment_provider TEXT NOT NULL DEFAULT 'paystack',
  
  -- Map provider
  map_provider TEXT NOT NULL DEFAULT 'google',
  map_fallback_provider TEXT DEFAULT NULL,
  
  -- Route weights
  route_weight_snow BOOLEAN NOT NULL DEFAULT false,
  route_weight_mountain BOOLEAN NOT NULL DEFAULT false,
  route_weight_toll BOOLEAN NOT NULL DEFAULT false,
  route_weight_border BOOLEAN NOT NULL DEFAULT false,
  
  -- FX
  fx_buffer_percent NUMERIC NOT NULL DEFAULT 0,
  settlement_currency TEXT NOT NULL DEFAULT 'NGN',
  
  -- Annual prepay discount months
  annual_free_months INTEGER NOT NULL DEFAULT 2,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.country_configs ENABLE ROW LEVEL SECURITY;

-- Readable by all authenticated users, writable by admins
CREATE POLICY "Anyone can read country configs"
  ON public.country_configs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage country configs"
  ON public.country_configs FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- Add country_code to organizations table
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS country_code TEXT NOT NULL DEFAULT 'NG';

-- Seed default countries
INSERT INTO public.country_configs (country_code, country_name, currency_code, currency_symbol, locale, is_active, is_default, starter_price, growth_price, enterprise_price, per_drop_price, ai_addon_price, tax_engine_type, vat_rate, payment_provider, sla_zones, fx_buffer_percent, settlement_currency, route_weight_snow, route_weight_mountain, route_weight_toll, route_weight_border, requires_gdpr, map_fallback_provider) VALUES
('NG', 'Nigeria', 'NGN', '₦', 'en-NG', true, true, 0, 5000, 20000, 50, 0, 'nigerian_paye', 7.5, 'paystack', '[{"zone":"Lagos & Southwest","days_min":1,"days_max":2},{"zone":"South East","days_min":3,"days_max":3},{"zone":"South South","days_min":3,"days_max":3},{"zone":"North","days_min":4,"days_max":5}]', 0, 'NGN', false, false, false, false, false, null),
('GB', 'United Kingdom', 'GBP', '£', 'en-GB', true, false, 99, 199, 499, 0.20, 79, 'uk_vat', 20, 'stripe', '[{"zone":"Standard","days_min":1,"days_max":1},{"zone":"Express","days_min":0,"days_max":0}]', 6, 'GBP', true, false, true, false, true, null),
('US', 'United States', 'USD', '$', 'en-US', true, false, 129, 249, 499, 0.25, 79, 'us_state_tax', 0, 'stripe', '[{"zone":"Standard","days_min":2,"days_max":2},{"zone":"Express","days_min":1,"days_max":1}]', 5, 'USD', true, true, true, false, false, 'mapbox'),
('AE', 'United Arab Emirates', 'AED', 'د.إ', 'en-AE', true, false, 450, 850, 1500, 0.60, 100, 'uae_zero_vat', 5, 'stripe', '[{"zone":"Same Day","days_min":0,"days_max":0},{"zone":"Standard","days_min":1,"days_max":1}]', 7, 'AED', false, false, true, true, false, null),
('CA', 'Canada', 'CAD', 'C$', 'en-CA', true, false, 140, 260, 450, 0.22, 69, 'ca_gst', 5, 'stripe', '[{"zone":"Standard","days_min":2,"days_max":2},{"zone":"Remote","days_min":4,"days_max":5}]', 5, 'CAD', true, true, true, true, false, 'mapbox');

-- Trigger for updated_at
CREATE TRIGGER update_country_configs_updated_at
  BEFORE UPDATE ON public.country_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
