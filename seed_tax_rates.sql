-- ============================================================
-- SEED public.tax_rates — run in Supabase SQL Editor.
--
-- Confirmed empty (0 rows) by the audit. This table is a GLOBAL
-- statutory reference table (no organization_id) — correct, since
-- tax rates are set by government, not per tenant.
--
-- Consumed by the Tax Automation Engine: country selector, the
-- displayed VAT rate, and the CIT fallback rate for countries
-- without modelled turnover banding.
--
-- Nigeria CIT note: the engine computes Nigeria's CIT rate
-- dynamically from turnover banding (0% up to N50m, 30% above)
-- per the Finance Act. The 30% row below is the reference/large-
-- company rate and the fallback for any non-banded path.
--
-- Safe to re-run: keyed on (country_code, tax_type, tax_name).
-- ============================================================

-- Idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS tax_rates_country_type_name_uniq
  ON public.tax_rates (country_code, tax_type, tax_name);

INSERT INTO public.tax_rates
  (country_code, tax_type, tax_name, rate_percentage, is_active, effective_from)
VALUES
  -- ── Nigeria ────────────────────────────────────────────────
  ('NG','VAT','Value Added Tax',                      7.500, true, '2020-02-01'),
  ('NG','CIT','Companies Income Tax (large)',        30.000, true, '2020-01-01'),
  ('NG','CIT','Companies Income Tax (medium)',       20.000, true, '2020-01-01'),
  ('NG','CIT','Companies Income Tax (small)',         0.000, true, '2020-01-01'),
  ('NG','WHT','WHT - Goods & Contracts',              2.000, true, '2020-01-01'),
  ('NG','WHT','WHT - Services',                       5.000, true, '2020-01-01'),
  ('NG','WHT','WHT - Rent',                          10.000, true, '2020-01-01'),
  ('NG','WHT','WHT - Dividends & Interest',          10.000, true, '2020-01-01'),
  ('NG','PAYE','Pay As You Earn (top band)',         24.000, true, '2020-01-01'),

  -- ── Ghana ──────────────────────────────────────────────────
  ('GH','VAT','Value Added Tax',                     15.000, true, '2023-01-01'),
  ('GH','CIT','Corporate Income Tax',                25.000, true, '2023-01-01'),
  ('GH','WHT','WHT - Services',                       7.500, true, '2023-01-01'),

  -- ── Kenya ──────────────────────────────────────────────────
  ('KE','VAT','Value Added Tax',                     16.000, true, '2023-07-01'),
  ('KE','CIT','Corporate Income Tax',                30.000, true, '2023-01-01'),
  ('KE','WHT','WHT - Professional Fees',              5.000, true, '2023-01-01'),

  -- ── South Africa ───────────────────────────────────────────
  ('ZA','VAT','Value Added Tax',                     15.000, true, '2018-04-01'),
  ('ZA','CIT','Corporate Income Tax',                27.000, true, '2023-04-01')
ON CONFLICT (country_code, tax_type, tax_name) DO UPDATE
  SET rate_percentage = EXCLUDED.rate_percentage,
      is_active       = EXCLUDED.is_active,
      effective_from  = EXCLUDED.effective_from;


-- ── VERIFY ────────────────────────────────────────────────────
SELECT country_code, tax_type, tax_name, rate_percentage, is_active
FROM public.tax_rates
ORDER BY country_code, tax_type, rate_percentage DESC;
