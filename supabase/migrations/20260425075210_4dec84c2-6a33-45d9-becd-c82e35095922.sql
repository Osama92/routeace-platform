
-- 1) Per-vehicle pricing rows for the three logistics tiers
INSERT INTO public.billing_plans (plan_code, plan_name, base_price, price_per_drop, pricing_model, billing_cycle, currency, is_active)
VALUES
  ('heavy_truck', 'Heavy Truck / Haulage', 5000, 0,  'per_vehicle',         'monthly', 'NGN', true),
  ('bikes_vans',  'Bikes / Vans / Buses', 0,    50, 'per_drop',             'monthly', 'NGN', true),
  ('mixed',       'Mixed Fleet',          5000, 50, 'per_vehicle_plus_drop','monthly', 'NGN', true)
ON CONFLICT (plan_code) DO UPDATE
SET plan_name      = EXCLUDED.plan_name,
    base_price     = EXCLUDED.base_price,
    price_per_drop = EXCLUDED.price_per_drop,
    pricing_model  = EXCLUDED.pricing_model,
    billing_cycle  = EXCLUDED.billing_cycle,
    currency       = EXCLUDED.currency,
    is_active      = EXCLUDED.is_active;

-- 2) Non-recursive helper for organization_members policies
CREATE OR REPLACE FUNCTION public.is_org_member_of(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND is_active = true
      AND is_owner  = true
  );
$$;

-- 3) Replace the self-referencing UPDATE policy
DROP POLICY IF EXISTS "Org owners can update members" ON public.organization_members;

CREATE POLICY "Org owners can update members"
ON public.organization_members
FOR UPDATE
USING (public.is_org_member_of(auth.uid(), organization_id))
WITH CHECK (public.is_org_member_of(auth.uid(), organization_id));
