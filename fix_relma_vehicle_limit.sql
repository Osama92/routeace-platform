-- ============================================================
-- FIX: Relma Haulage vehicle limit (26 vehicles registered, capped at 20)
-- Run in Supabase SQL Editor.
--
-- Root cause: verify-subscription-payment set tenant_config.max_vehicles
-- from a flat tier default (get_plan_limits), ignoring the vehicle_count
-- actually purchased at checkout. Fixed in code for future purchases
-- (supabase/functions/verify-subscription-payment/index.ts).
--
-- This script raises Relma's cap to 40 (headroom above their current 26)
-- so they can keep operating and adding vehicles immediately.
-- ============================================================

-- Find Relma's organization_id first (adjust the name filter if needed)
-- SELECT id, name FROM public.organizations WHERE name ILIKE '%relma%';

UPDATE public.tenant_config tc
SET max_vehicles = 40
FROM public.organizations o
WHERE tc.organization_id = o.id
  AND o.name ILIKE '%relma%';

-- Verify:
-- SELECT o.name, tc.max_vehicles, tc.plan_tier
-- FROM public.tenant_config tc
-- JOIN public.organizations o ON o.id = tc.organization_id
-- WHERE o.name ILIKE '%relma%';
