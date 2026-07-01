-- Fix tr_dispatch_email_notifications: references pod_recipient, pod_photo_url, pod_notes
-- columns that don't exist on dispatches. Add them (nullable) and wrap each email
-- dispatch block in EXCEPTION so a failure never blocks a status update.

ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS pod_recipient   TEXT,
  ADD COLUMN IF NOT EXISTS pod_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS pod_notes       TEXT,
  ADD COLUMN IF NOT EXISTS pod_confirmed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.tr_dispatch_email_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _customer record;
BEGIN
  BEGIN
    SELECT email, contact_name, company_name, email_delivery_updates
      INTO _customer FROM public.customers WHERE id = NEW.customer_id;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF _customer.email IS NULL OR COALESCE(_customer.email_delivery_updates, true) = false THEN
    RETURN NEW;
  END IF;

  -- Pickup confirmation
  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'picked_up')
     OR (OLD.actual_pickup IS NULL AND NEW.actual_pickup IS NOT NULL) THEN
    BEGIN
      PERFORM public._invoke_send_transactional_email(
        'pickup-confirmation', _customer.email, NEW.organization_id,
        'pickup-' || NEW.id::text,
        jsonb_build_object(
          'recipientName',    _customer.contact_name,
          'dispatchNumber',   NEW.dispatch_number,
          'pickupAddress',    NEW.pickup_address,
          'deliveryAddress',  NEW.delivery_address,
          'pickupTime',       COALESCE(NEW.actual_pickup, NEW.scheduled_pickup),
          'cargoDescription', NEW.cargo_description,
          'organizationName', _customer.company_name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'tr_dispatch_email_notifications pickup email failed: %', SQLERRM;
    END;
  END IF;

  -- Delivery proof / POD
  IF (OLD.pod_confirmed_at IS NULL AND NEW.pod_confirmed_at IS NOT NULL)
     OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    BEGIN
      PERFORM public._invoke_send_transactional_email(
        'delivery-proof', _customer.email, NEW.organization_id,
        'pod-' || NEW.id::text,
        jsonb_build_object(
          'recipientName',    _customer.contact_name,
          'dispatchNumber',   NEW.dispatch_number,
          'deliveryAddress',  NEW.delivery_address,
          'deliveredAt',      COALESCE(NEW.pod_confirmed_at, NEW.actual_delivery),
          'podRecipient',     NEW.pod_recipient,
          'podPhotoUrl',      NEW.pod_photo_url,
          'podNotes',         NEW.pod_notes,
          'organizationName', _customer.company_name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'tr_dispatch_email_notifications delivery-proof email failed: %', SQLERRM;
    END;
  END IF;

  -- SLA delay alert
  IF (OLD.sla_status IS DISTINCT FROM NEW.sla_status
      AND NEW.sla_status IN ('breached','at_risk')) THEN
    BEGIN
      PERFORM public._invoke_send_transactional_email(
        'delay-alert', _customer.email, NEW.organization_id,
        'delay-' || NEW.id::text || '-' || NEW.sla_status,
        jsonb_build_object(
          'recipientName',    _customer.contact_name,
          'dispatchNumber',   NEW.dispatch_number,
          'severity',         NEW.sla_status,
          'newEta',           NEW.estimated_arrival,
          'deliveryAddress',  NEW.delivery_address,
          'organizationName', _customer.company_name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'tr_dispatch_email_notifications delay-alert email failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
