-- Add vat_rate numeric column to bill_items so the frontend can store and read
-- VAT as a number (0, 5, 7.5, 20) rather than only as the vat_type text tag.
-- Both columns are now present; vat_type remains for backwards compatibility.
DO $$ BEGIN
  ALTER TABLE public.bill_items ADD COLUMN vat_rate numeric NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Back-fill vat_rate from the existing vat_type text column for all existing rows.
UPDATE public.bill_items SET vat_rate =
  CASE vat_type
    WHEN 'vat_5'    THEN 5
    WHEN 'vat_7_5'  THEN 7.5
    WHEN 'vat_20'   THEN 20
    ELSE 0
  END
WHERE vat_rate = 0 AND vat_type != 'no_vat';
