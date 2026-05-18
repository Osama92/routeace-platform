DROP FUNCTION IF EXISTS public.get_public_ticket_status(uuid);

CREATE OR REPLACE FUNCTION public.get_public_ticket_status(p_token uuid)
RETURNS TABLE(
  ref text, subject text, status text, priority text,
  created_at timestamptz, updated_at timestamptz, resolved_at timestamptz,
  organization_name text, csat int
)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT t.ref, t.subject, t.status, t.priority,
         t.created_at, t.updated_at, t.resolved_at,
         o.name, t.csat
  FROM public.support_tickets t
  JOIN public.organizations o ON o.id = t.organization_id
  WHERE t.public_token = p_token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_support_csat(
  p_token uuid,
  p_rating int,
  p_comment text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_t public.support_tickets%ROWTYPE;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  SELECT * INTO v_t FROM public.support_tickets WHERE public_token = p_token;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_t.status NOT IN ('resolved','closed') THEN
    RAISE EXCEPTION 'Ticket not yet resolved';
  END IF;
  IF v_t.csat IS NOT NULL THEN
    RETURN jsonb_build_object('already_rated', true, 'csat', v_t.csat);
  END IF;
  UPDATE public.support_tickets
     SET csat = p_rating, updated_at = now()
   WHERE id = v_t.id;
  IF p_comment IS NOT NULL AND length(trim(p_comment)) > 0 THEN
    INSERT INTO public.support_ticket_messages(ticket_id, sender, message, is_internal)
    VALUES (v_t.id, 'customer', '[CSAT feedback] ' || left(p_comment, 4000), false);
  END IF;
  RETURN jsonb_build_object('ok', true, 'csat', p_rating);
END $$;
GRANT EXECUTE ON FUNCTION public.submit_support_csat(uuid,int,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_support_ticket_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org_name text; v_subject text; v_body text; v_to text; v_url text;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;
  v_url := coalesce(current_setting('app.public_url', true),'');
  IF TG_OP = 'INSERT' THEN
    v_to := NEW.complainant_email;
    IF v_to IS NOT NULL THEN
      v_subject := '[' || coalesce(v_org_name,'Support') || '] Ticket received: ' || NEW.ref;
      v_body := 'Hi ' || coalesce(NEW.customer_name,'there') || E',\n\nWe have received your support ticket "' || NEW.subject ||
                E'".\nReference: ' || NEW.ref || E'\nTrack status: ' || v_url || '/support/track/' || NEW.public_token::text ||
                E'\n\nThank you,\n' || coalesce(v_org_name,'Support Team');
      PERFORM public.enqueue_email(v_to, v_subject, v_body, NULL::jsonb);
    END IF;
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.complainant_email IS NOT NULL THEN
    IF NEW.status = 'resolved' AND NEW.csat IS NULL THEN
      v_subject := '[' || coalesce(v_org_name,'Support') || '] Ticket ' || NEW.ref || ' resolved — please rate your experience';
      v_body := 'Hi ' || coalesce(NEW.customer_name,'there') || E',\n\nYour ticket "' || NEW.subject ||
                E'" has been marked resolved.\n\nPlease take 10 seconds to rate the support you received:\n' ||
                v_url || '/support/track/' || NEW.public_token::text ||
                E'\n\nYour feedback helps us improve.\n\nThank you,\n' || coalesce(v_org_name,'Support Team');
    ELSE
      v_subject := '[' || coalesce(v_org_name,'Support') || '] Ticket ' || NEW.ref || ' is now ' || NEW.status;
      v_body := 'Your ticket "' || NEW.subject || '" status changed to ' || NEW.status || E'.\nTrack: ' ||
                v_url || '/support/track/' || NEW.public_token::text;
    END IF;
    PERFORM public.enqueue_email(NEW.complainant_email, v_subject, v_body, NULL::jsonb);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;