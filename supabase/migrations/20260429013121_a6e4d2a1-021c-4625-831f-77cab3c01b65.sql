-- 1) Reseller relationship column on organizations
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS reseller_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_reseller
  ON public.organizations(reseller_org_id);

-- 2) Seed billing_plans (replace the canonical 8 plans)
DELETE FROM public.billing_plans WHERE plan_code IN (
  'logistics_starter','logistics_bikes','logistics_haulage',
  'logistics_mixed','industry_free','industry_growth',
  'industry_enterprise','industry_custom'
);

INSERT INTO public.billing_plans (
  plan_code, plan_name, pricing_model, base_price,
  price_per_drop, price_per_api_call, currency,
  included_drops, included_api_calls, max_users,
  max_vehicles, billing_cycle, is_active, features
) VALUES
('logistics_starter',  'Starter',            'flat',        0,      0,    0, 'NGN', 0,    0,    1,    0,   'monthly', true,
 '{"single_user":true,"dispatch":true,"invoices":true,"expenses":true,"email_customers":true,"realtime_tracking":true,"rate_limits":"30req/min · 5000req/day"}'::jsonb),
('logistics_bikes',    'Bikes / Vans',       'per_drop',    0,     50,    0, 'NGN', 0,    0,    null, null,'monthly', true,
 '{"everything_in_starter":true,"dispatch":true,"tracking":true,"driver_management":true,"basic_analytics":true,"fleet_management":true,"sla_engine":true}'::jsonb),
('logistics_haulage',  'Heavy Truck/Haulage','per_vehicle', 5000,   0,    0, 'NGN', 0,    0,    null, null,'monthly', true,
 '{"everything_in_starter":true,"unlimited_dispatches":true,"fleet_management":true,"sla_engine":true,"resell_licenses":10}'::jsonb),
('logistics_mixed',    'Mixed Fleet',        'hybrid',      5000,  50,    0, 'NGN', 0,    0,    null, null,'monthly', true,
 '{"everything_in_haulage":true,"everything_in_bikes":true,"all_vehicle_types":true,"full_platform":true}'::jsonb),
('industry_free',      'Free',               'flat',        0,      0,    0, 'NGN', 0,    0,    2,    0,   'monthly', true,
 '{"lead_management":"basic","accounts":true,"manual_orders":true,"basic_reporting":true}'::jsonb),
('industry_growth',    'Growth',             'per_user',    15000,  0,    0, 'NGN', 0,    200,  null, null,'monthly', true,
 '{"lead_scoring":true,"pipeline":true,"whatsapp_email_sync":true,"ai_credits_per_user":200}'::jsonb),
('industry_enterprise','Enterprise',         'per_user',    35000,  0,    0, 'NGN', 0,    1000, null, null,'monthly', true,
 '{"advanced_forecasting":true,"partner_prm":true,"commission_engine":true,"ai_credits_per_user":1000}'::jsonb),
('industry_custom',    'Custom',             'custom',      0,      0,    0, 'NGN', 0,    0,    null, null,'monthly', true,
 '{"white_label":true,"dedicated_infra":true,"custom_ai":true,"data_isolation":true}'::jsonb);