-- ============================================================
-- Per-Vehicle Subscription Proration & Tracking
-- ============================================================
-- Per-vehicle plans (heavy_fleet, mixed_fleet) bill ₦5,000 per
-- active vehicle per calendar month. When a vehicle is registered
-- mid-month it is prorated by the number of days remaining in the
-- month (inclusive of the registration day).
--
--   prorated_charge = monthly_rate × (days_active_this_month / days_in_month)
--
-- Where days_active_this_month =
--   (last day of month − max(registration_date, first day of month)) + 1
--
-- This migration provides a function that returns per-vehicle line
-- items for an org for a given month, used by the billing dashboard.
-- ============================================================

-- Per-vehicle monthly rate in naira (mirror of lcPricingPlans monthlyBaseKobo/100)
-- Kept as a function so it has one authoritative value on the DB side.
CREATE OR REPLACE FUNCTION public.vehicle_monthly_rate_naira()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
  SELECT 5000::numeric;
$$;

-- Returns per-vehicle prorated charges for an organization for the month
-- containing p_ref_date (defaults to today). One row per billable vehicle.
CREATE OR REPLACE FUNCTION public.get_vehicle_subscription_charges(
  p_org_id   uuid,
  p_ref_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  vehicle_id          uuid,
  registration_number text,
  vehicle_type        text,
  registered_on       date,
  month_start         date,
  month_end           date,
  days_in_month       int,
  days_active         int,
  is_prorated         boolean,
  monthly_rate        numeric,
  prorated_charge     numeric,
  next_renewal        date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT
      date_trunc('month', p_ref_date)::date                               AS m_start,
      (date_trunc('month', p_ref_date) + interval '1 month - 1 day')::date AS m_end,
      extract(day FROM (date_trunc('month', p_ref_date) + interval '1 month - 1 day'))::int AS d_in_month,
      (date_trunc('month', p_ref_date) + interval '1 month')::date        AS next_month_start
  )
  SELECT
    v.id                                                        AS vehicle_id,
    v.registration_number,
    v.vehicle_type,
    v.created_at::date                                          AS registered_on,
    b.m_start                                                   AS month_start,
    b.m_end                                                     AS month_end,
    b.d_in_month                                                AS days_in_month,
    -- days active this month, inclusive of registration day
    (b.m_end - GREATEST(v.created_at::date, b.m_start) + 1)     AS days_active,
    -- prorated only when the vehicle was registered after the month started
    (v.created_at::date > b.m_start)                           AS is_prorated,
    public.vehicle_monthly_rate_naira()                        AS monthly_rate,
    ROUND(
      public.vehicle_monthly_rate_naira()
      * (b.m_end - GREATEST(v.created_at::date, b.m_start) + 1)::numeric
      / b.d_in_month::numeric
    , 2)                                                        AS prorated_charge,
    b.next_month_start                                          AS next_renewal
  FROM public.vehicles v
  CROSS JOIN bounds b
  WHERE v.organization_id = p_org_id
    AND COALESCE(v.status, 'available') <> 'retired'
    AND v.created_at::date <= b.m_end
  ORDER BY v.created_at DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_vehicle_subscription_charges(uuid, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_vehicle_subscription_charges(uuid, date) TO authenticated, service_role;

-- Convenience: monthly total for an org (sum of prorated charges).
CREATE OR REPLACE FUNCTION public.get_vehicle_subscription_total(
  p_org_id   uuid,
  p_ref_date date DEFAULT CURRENT_DATE
)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(prorated_charge), 0)
  FROM public.get_vehicle_subscription_charges(p_org_id, p_ref_date);
$$;

REVOKE EXECUTE ON FUNCTION public.get_vehicle_subscription_total(uuid, date) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_vehicle_subscription_total(uuid, date) TO authenticated, service_role;
