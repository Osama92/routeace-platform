
-- 1. Sync the 4 logistics tiers in partner_tiers (idempotent)
UPDATE public.partner_tiers SET is_active = false
WHERE lower(name) NOT IN ('starter', 'bikes / vans', 'heavy truck / haulage', 'mixed fleet');

INSERT INTO public.partner_tiers (name, rate_limit_per_minute, rate_limit_per_day, monthly_price, features, is_active)
VALUES
  ('starter', 30, 5000, 0,
    '{"description":"Single operator access for basic logistics operations","price_label":"Free"}'::jsonb, true),
  ('bikes / vans', 120, 50000, 0,
    '{"description":"Pay-per-drop for last-mile & multi-drop delivery","price_label":"₦50/drop","unit_price":50,"unit":"drop"}'::jsonb, true),
  ('heavy truck / haulage', 300, 200000, 5000,
    '{"description":"VAT exclusive · per active vehicle · unlimited dispatches","price_label":"₦5,000/vehicle/mo","unit_price":5000,"unit":"vehicle/mo"}'::jsonb, true),
  ('mixed fleet', 600, 500000, 5000,
    '{"description":"Hybrid · ₦5,000/vehicle base + ₦50/drop usage","price_label":"₦5,000/vehicle + ₦50/drop","unit_price":5000,"unit":"vehicle/mo+drop"}'::jsonb, true)
ON CONFLICT (name) DO UPDATE
SET rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
    rate_limit_per_day    = EXCLUDED.rate_limit_per_day,
    monthly_price         = EXCLUDED.monthly_price,
    features              = EXCLUDED.features,
    is_active             = true;

-- 2. Auto-create an Expense when a vehicle fine is logged
CREATE OR REPLACE FUNCTION public.fn_fine_to_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert expense when fine is paid by company (or default behavior on insert)
  -- Always record so PNL reflects company-incurred fines; if driver-paid, mark zero amount.
  INSERT INTO public.expenses (
    expense_date, category, description, amount,
    vehicle_id, driver_id, organization_id,
    created_by, submitted_by, approval_status, notes
  )
  VALUES (
    NEW.fine_date,
    'other'::expense_category,
    'Vehicle fine: ' || NEW.fine_type || COALESCE(' (' || NEW.fine_reference || ')', ''),
    CASE WHEN NEW.deducted_from_driver THEN 0 ELSE COALESCE(NEW.fine_amount, 0) END,
    NEW.vehicle_id, NEW.driver_id, NEW.organization_id,
    NEW.logged_by, NEW.logged_by, 'approved',
    COALESCE(NEW.notes, '') ||
      CASE WHEN NEW.issuing_authority IS NOT NULL THEN ' | Authority: ' || NEW.issuing_authority ELSE '' END ||
      CASE WHEN NEW.location IS NOT NULL THEN ' | Location: ' || NEW.location ELSE '' END
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fine_to_expense ON public.vehicle_fines;
CREATE TRIGGER trg_fine_to_expense
AFTER INSERT ON public.vehicle_fines
FOR EACH ROW
EXECUTE FUNCTION public.fn_fine_to_expense();
