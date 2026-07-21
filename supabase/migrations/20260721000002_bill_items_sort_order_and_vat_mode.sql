-- Fix 1: preserve line item order — add sort_order to bill_items
DO $$ BEGIN
  ALTER TABLE public.bill_items ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Back-fill existing rows with a stable order based on created_at within each bill
UPDATE public.bill_items bi
SET sort_order = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY bill_id ORDER BY created_at, id) - 1 AS rn
  FROM public.bill_items
) sub
WHERE bi.id = sub.id;

-- Fix 2: persist VAT inclusive/exclusive mode per bill
DO $$ BEGIN
  ALTER TABLE public.bills ADD COLUMN vat_inclusive boolean NOT NULL DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Fix 2: persist VAT inclusive/exclusive mode per bill