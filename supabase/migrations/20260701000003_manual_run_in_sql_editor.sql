-- ============================================================
-- MANUAL RUN REQUIRED: Paste this entire file into
-- Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- FIX 1: auto_create_invoice_on_close trigger was crashing dispatch updates
-- to "delivered" status because the random invoice_number caused unique
-- constraint violations. Wrapping in EXCEPTION so it never blocks status updates.
CREATE OR REPLACE FUNCTION public.auto_create_invoice_on_close()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_invoice UUID;
  v_invoice_number TEXT;
  v_seq BIGINT;
BEGIN
  IF NEW.status IN ('closed', 'delivered') AND OLD.status NOT IN ('closed', 'delivered', 'invoiced') THEN
    SELECT id INTO v_existing_invoice
    FROM invoices
    WHERE dispatch_id = NEW.id
      AND status NOT IN ('cancelled');

    IF v_existing_invoice IS NULL AND NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      BEGIN
        SELECT nextval('invoice_number_seq') INTO v_seq;
        v_invoice_number := 'RA-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(v_seq::TEXT, 4, '0');

        INSERT INTO invoices (
          invoice_number,
          organization_id,
          customer_id,
          dispatch_id,
          amount,
          tax_amount,
          total_amount,
          status,
          created_by
        ) VALUES (
          v_invoice_number,
          NEW.organization_id,
          NEW.customer_id,
          NEW.id,
          NEW.cost,
          NEW.cost * 0.075,
          NEW.cost * 1.075,
          'draft',
          NEW.created_by
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'auto_create_invoice_on_close: failed for dispatch %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- FIX 2: Ensure company-assets bucket is public so logo/signature images load
UPDATE storage.buckets SET public = true WHERE id = 'company-assets';

DROP POLICY IF EXISTS "Public can view company assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view company assets" ON storage.objects;

CREATE POLICY "Public can view company assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'company-assets');
