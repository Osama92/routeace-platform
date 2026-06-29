-- Reset trial expiry for all existing trial organisations.
-- LC (LOGISTICS_COMPANY): 30 days from NOW
-- LD (LOGISTICS_DEPARTMENT): 60 days from NOW
-- This gives all current trial users a fresh window regardless of when they signed up.

-- LC orgs
UPDATE public.organizations o
SET subscription_expires_at = NOW() + INTERVAL '30 days',
    subscription_status     = 'trial',
    subscription_tier       = 'enterprise'
FROM public.tenant_config tc
WHERE tc.organization_id = o.id
  AND tc.tenant_mode = 'LOGISTICS_COMPANY'
  AND o.subscription_status IN ('trial', 'expired');

-- LD orgs
UPDATE public.organizations o
SET subscription_expires_at = NOW() + INTERVAL '60 days',
    subscription_status     = 'trial',
    subscription_tier       = 'enterprise'
FROM public.tenant_config tc
WHERE tc.organization_id = o.id
  AND tc.tenant_mode = 'LOGISTICS_DEPARTMENT'
  AND o.subscription_status IN ('trial', 'expired');

-- Orgs with no tenant_config yet (default to LC / 30 days)
UPDATE public.organizations o
SET subscription_expires_at = NOW() + INTERVAL '30 days',
    subscription_status     = 'trial',
    subscription_tier       = 'enterprise'
WHERE o.subscription_status IN ('trial', 'expired')
  AND NOT EXISTS (SELECT 1 FROM public.tenant_config tc WHERE tc.organization_id = o.id);

-- Ensure enterprise limits are applied to all reset orgs
UPDATE public.tenant_config tc
SET
  plan_tier              = 'enterprise',
  max_users              = 9999,
  max_vehicles           = 9999,
  max_branches           = 999,
  max_monthly_dispatches = 99999,
  max_api_calls          = 99999,
  max_integrations       = 99,
  ai_credits_total       = 2000
FROM public.organizations o
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial';
