-- Fix 1: Add 'skipped' and 'rate_limited' to email_send_log CHECK constraint
-- The process-email-queue function writes 'rate_limited'; send-transactional-email
-- was writing 'skipped' (now fixed to 'suppressed' in code, but keep for safety).
ALTER TABLE public.email_send_log
  DROP CONSTRAINT IF EXISTS email_send_log_status_check;

ALTER TABLE public.email_send_log
  ADD CONSTRAINT email_send_log_status_check
  CHECK (status IN ('pending','sent','suppressed','failed','bounced','complained','dlq','skipped','rate_limited'));

-- Fix 2: Clear any stuck rate-limit state that blocks all queue processing
UPDATE public.email_send_state
SET retry_after_until = NULL
WHERE id = 1 AND retry_after_until IS NOT NULL;

-- Fix 3: Recreate trigger helper functions that called enqueue_email with the wrong
-- 4-argument signature (email, subject, body, metadata) instead of the correct
-- 2-argument signature (queue_name, payload).
-- Affects: notify_support_ticket_event, notify_support_message_event, auto_create_delivery_csat

-- Support ticket created / status changed
CREATE OR REPLACE FUNCTION public.notify_support_ticket_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to        text;
  v_subject   text;
  v_body      text;
BEGIN
  -- Only fire on INSERT or meaningful status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  BEGIN
    SELECT email INTO v_to
    FROM public.profiles
    WHERE user_id = NEW.created_by
    LIMIT 1;

    IF v_to IS NULL THEN RETURN NEW; END IF;

    IF TG_OP = 'INSERT' THEN
      v_subject := 'Support ticket #' || NEW.ticket_number || ' created';
      v_body    := 'Your support ticket has been received. Our team will respond shortly.';
    ELSE
      v_subject := 'Support ticket #' || NEW.ticket_number || ' updated — ' || NEW.status;
      v_body    := 'The status of your support ticket has been updated to: ' || NEW.status || '.';
    END IF;

    PERFORM public.enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'to',       v_to,
        'subject',  v_subject,
        'html',     '<p>' || v_body || '</p>',
        'text',     v_body
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: log and continue
    RAISE WARNING 'notify_support_ticket_event failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- Support ticket message added
CREATE OR REPLACE FUNCTION public.notify_support_message_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to      text;
  v_subject text;
  v_body    text;
  v_ticket  record;
BEGIN
  BEGIN
    SELECT t.ticket_number, p.email
    INTO v_ticket
    FROM public.support_tickets t
    JOIN public.profiles p ON p.user_id = t.created_by
    WHERE t.id = NEW.ticket_id
    LIMIT 1;

    IF v_ticket.email IS NULL THEN RETURN NEW; END IF;

    -- Don't email the submitter their own message
    IF NEW.sender_id = (
      SELECT created_by FROM public.support_tickets WHERE id = NEW.ticket_id
    ) THEN
      RETURN NEW;
    END IF;

    v_subject := 'New reply on ticket #' || v_ticket.ticket_number;
    v_body    := 'A new reply has been added to your support ticket #' || v_ticket.ticket_number || '.';

    PERFORM public.enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'to',      v_ticket.email,
        'subject', v_subject,
        'html',    '<p>' || v_body || '</p>',
        'text',    v_body
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_support_message_event failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- CSAT auto-create on delivery completion
CREATE OR REPLACE FUNCTION public.auto_create_delivery_csat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_to      text;
  v_subject text;
  v_body    text;
BEGIN
  -- Only on status change to 'delivered'
  IF NEW.status IS DISTINCT FROM 'delivered' THEN RETURN NEW; END IF;
  IF OLD.status = 'delivered' THEN RETURN NEW; END IF;

  BEGIN
    -- Look up customer email via invoice/customer relationship
    SELECT c.email INTO v_to
    FROM public.dispatches d
    JOIN public.invoices i ON i.id = d.invoice_id
    JOIN public.customers c ON c.id = i.customer_id
    WHERE d.id = NEW.id
    LIMIT 1;

    IF v_to IS NULL THEN RETURN NEW; END IF;

    v_subject := 'How was your delivery? — ' || COALESCE(NEW.dispatch_number, '');
    v_body    := 'Thank you for using RouteAce. Please rate your delivery experience.';

    PERFORM public.enqueue_email(
      'transactional_emails',
      jsonb_build_object(
        'to',      v_to,
        'subject', v_subject,
        'html',    '<p>' || v_body || '</p>',
        'text',    v_body
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_create_delivery_csat failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
