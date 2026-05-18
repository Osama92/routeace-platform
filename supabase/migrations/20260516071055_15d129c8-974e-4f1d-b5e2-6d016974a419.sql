
CREATE TABLE IF NOT EXISTS public.email_template_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  template_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  subject_override text,
  intro_text text,
  outro_text text,
  brand_color text,
  logo_url text,
  support_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_email_template_configs_org_key
  ON public.email_template_configs (organization_id, template_key);

ALTER TABLE public.email_template_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view email template configs"
ON public.email_template_configs FOR SELECT TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
  )
);

CREATE POLICY "Org admins can insert email template configs"
ON public.email_template_configs FOR INSERT TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
      AND (om.is_owner = true
           OR om.role IN ('admin','super_admin','org_admin','ops_manager','finance_manager'))
  )
);

CREATE POLICY "Org admins can update email template configs"
ON public.email_template_configs FOR UPDATE TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
      AND (om.is_owner = true
           OR om.role IN ('admin','super_admin','org_admin','ops_manager','finance_manager'))
  )
);

CREATE POLICY "Org admins can delete email template configs"
ON public.email_template_configs FOR DELETE TO authenticated
USING (
  organization_id IN (
    SELECT om.organization_id FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = true
      AND (om.is_owner = true OR om.role IN ('admin','super_admin','org_admin'))
  )
);

CREATE TRIGGER trg_email_template_configs_updated_at
BEFORE UPDATE ON public.email_template_configs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
CREATE OR REPLACE FUNCTION public._invoke_send_transactional_email(
  _template text,
  _recipient text,
  _organization_id uuid,
  _idempotency_key text,
  _template_data jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _url text;
  _service_key text;
BEGIN
  IF _recipient IS NULL OR _recipient = '' THEN RETURN; END IF;

  SELECT decrypted_secret INTO _service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key' LIMIT 1;

  IF _service_key IS NULL THEN RETURN; END IF;

  _url := 'https://mbybrzggrpyhvcnxhlua.supabase.co/functions/v1/send-transactional-email';

  PERFORM net.http_post(
    url := _url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _service_key
    ),
    body := jsonb_build_object(
      'templateName', _template,
      'recipientEmail', _recipient,
      'organizationId', _organization_id,
      'idempotencyKey', _idempotency_key,
      'templateData', COALESCE(_template_data, '{}'::jsonb)
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'failed to dispatch transactional email: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.tr_dispatch_email_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _customer record;
BEGIN
  SELECT email, contact_name, company_name, email_delivery_updates
    INTO _customer FROM public.customers WHERE id = NEW.customer_id;

  IF _customer.email IS NULL OR COALESCE(_customer.email_delivery_updates, true) = false THEN
    RETURN NEW;
  END IF;

  IF (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'picked_up')
     OR (OLD.actual_pickup IS NULL AND NEW.actual_pickup IS NOT NULL) THEN
    PERFORM public._invoke_send_transactional_email(
      'pickup-confirmation', _customer.email, NEW.organization_id,
      'pickup-' || NEW.id::text,
      jsonb_build_object(
        'recipientName', _customer.contact_name,
        'dispatchNumber', NEW.dispatch_number,
        'pickupAddress', NEW.pickup_address,
        'deliveryAddress', NEW.delivery_address,
        'pickupTime', COALESCE(NEW.actual_pickup, NEW.scheduled_pickup),
        'cargoDescription', NEW.cargo_description,
        'organizationName', _customer.company_name
      )
    );
  END IF;

  IF (OLD.pod_confirmed_at IS NULL AND NEW.pod_confirmed_at IS NOT NULL)
     OR (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'delivered') THEN
    PERFORM public._invoke_send_transactional_email(
      'delivery-proof', _customer.email, NEW.organization_id,
      'pod-' || NEW.id::text,
      jsonb_build_object(
        'recipientName', _customer.contact_name,
        'dispatchNumber', NEW.dispatch_number,
        'deliveryAddress', NEW.delivery_address,
        'deliveredAt', COALESCE(NEW.pod_confirmed_at, NEW.actual_delivery),
        'podRecipient', NEW.pod_recipient,
        'podPhotoUrl', NEW.pod_photo_url,
        'podNotes', NEW.pod_notes,
        'organizationName', _customer.company_name
      )
    );
  END IF;

  IF (OLD.sla_status IS DISTINCT FROM NEW.sla_status
      AND NEW.sla_status IN ('breached','at_risk')) THEN
    PERFORM public._invoke_send_transactional_email(
      'delay-alert', _customer.email, NEW.organization_id,
      'delay-' || NEW.id::text || '-' || NEW.sla_status,
      jsonb_build_object(
        'recipientName', _customer.contact_name,
        'dispatchNumber', NEW.dispatch_number,
        'severity', NEW.sla_status,
        'newEta', NEW.estimated_arrival,
        'deliveryAddress', NEW.delivery_address,
        'organizationName', _customer.company_name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dispatch_email_notifications ON public.dispatches;
CREATE TRIGGER trg_dispatch_email_notifications
AFTER UPDATE ON public.dispatches
FOR EACH ROW EXECUTE FUNCTION public.tr_dispatch_email_notifications();

CREATE OR REPLACE FUNCTION public.tr_invoice_payment_advice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _customer record;
BEGIN
  IF NOT (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid') THEN
    RETURN NEW;
  END IF;

  SELECT email, contact_name, company_name, email_invoice_reminders
    INTO _customer FROM public.customers WHERE id = NEW.customer_id;

  IF _customer.email IS NULL OR COALESCE(_customer.email_invoice_reminders, true) = false THEN
    RETURN NEW;
  END IF;

  PERFORM public._invoke_send_transactional_email(
    'payment-advice', _customer.email, NEW.organization_id,
    'pay-advice-' || NEW.id::text,
    jsonb_build_object(
      'recipientName', _customer.contact_name,
      'invoiceNumber', NEW.invoice_number,
      'amountPaid', COALESCE(NEW.amount_paid, NEW.total_amount),
      'totalAmount', NEW.total_amount,
      'balanceDue', NEW.balance_due,
      'currency', NEW.currency_code,
      'paidDate', COALESCE(NEW.paid_date, NEW.status_updated_at),
      'organizationName', _customer.company_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_invoice_payment_advice ON public.invoices;
CREATE TRIGGER trg_invoice_payment_advice
AFTER UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.tr_invoice_payment_advice();
