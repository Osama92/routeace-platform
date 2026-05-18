CREATE OR REPLACE FUNCTION public.auto_create_invoice_on_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_invoice UUID;
  v_invoice_number TEXT;
  v_new_invoice_id UUID;
BEGIN
  -- Only trigger when status changes to 'closed' or 'delivered'
  IF NEW.status IN ('closed', 'delivered') AND OLD.status NOT IN ('closed', 'delivered', 'invoiced') THEN
    -- Check if invoice already exists
    SELECT id INTO v_existing_invoice
    FROM invoices
    WHERE dispatch_id = NEW.id
      AND status NOT IN ('cancelled');

    IF v_existing_invoice IS NULL AND NEW.cost IS NOT NULL AND NEW.cost > 0 THEN
      -- Generate invoice number
      v_invoice_number := 'RA-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD((FLOOR(RANDOM() * 9999) + 1)::TEXT, 4, '0');
      
      v_new_invoice_id := gen_random_uuid();
      
      -- Create invoice and auto-post it so AR gets created
      INSERT INTO invoices (
        id,
        invoice_number,
        customer_id,
        dispatch_id,
        amount,
        tax_amount,
        total_amount,
        subtotal,
        status,
        is_posted,
        posted_at,
        posted_by,
        invoice_date,
        created_by
      ) VALUES (
        v_new_invoice_id,
        v_invoice_number,
        NEW.customer_id,
        NEW.id,
        NEW.cost,
        NEW.cost * 0.075,
        NEW.cost * 1.075,
        NEW.cost,
        'pending',
        true,
        now(),
        NEW.created_by,
        CURRENT_DATE,
        NEW.created_by
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;