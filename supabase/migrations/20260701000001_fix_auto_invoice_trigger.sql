-- Fix auto_create_invoice_on_close trigger:
-- 1. Wrap invoice INSERT in EXCEPTION handler so a failure never blocks dispatch status updates
-- 2. Include organization_id from the dispatch row to satisfy the unique partial index
-- 3. Use a sequence-based invoice number instead of random to avoid collisions

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
  -- Only trigger when status changes to 'closed' or 'delivered'
  IF NEW.status IN ('closed', 'delivered') AND OLD.status NOT IN ('closed', 'delivered', 'invoiced') THEN
    -- Check if invoice already exists for this dispatch
    SELECT id INTO v_existing_invoice
    FROM invoices
    WHERE dispatch_id = NEW.id
      AND status NOT IN ('cancelled');

    IF v_existing_invoice IS NULL AND NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      BEGIN
        -- Use sequence for unique invoice number to avoid random collisions
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
        -- Log but never block the dispatch status update
        RAISE NOTICE 'auto_create_invoice_on_close: failed to create invoice for dispatch %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
