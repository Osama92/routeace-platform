CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_org_slug text, p_subject text, p_message text,
  p_complainant_name text, p_complainant_email text,
  p_complainant_phone text DEFAULT NULL,
  p_channel text DEFAULT 'live_chat',
  p_tag text DEFAULT 'complaint',
  p_order_id text DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb
) RETURNS TABLE (ticket_ref text, public_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org_id uuid; v_ticket_id uuid; v_ref text; v_token uuid; v_att jsonb;
BEGIN
  IF length(coalesce(p_subject,'')) < 3 OR length(coalesce(p_message,'')) < 10 THEN
    RAISE EXCEPTION 'subject and message required';
  END IF;
  SELECT o.id INTO v_org_id FROM public.organizations o WHERE o.slug = p_org_slug AND o.is_active = true;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization not found'; END IF;

  v_ref := 'TKT-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  INSERT INTO public.support_tickets(
    organization_id, ref, channel, subject, customer_name, complainant_email, complainant_phone,
    tag, priority, order_id, submitted_via, status, sla_deadline
  ) VALUES (
    v_org_id, v_ref, p_channel, left(p_subject,200), left(coalesce(p_complainant_name,'Anonymous'),120),
    p_complainant_email, p_complainant_phone, coalesce(p_tag,'complaint'), 'medium',
    nullif(p_order_id,''), 'public_form', 'open', now() + interval '4 hours'
  ) RETURNING support_tickets.id, support_tickets.public_token INTO v_ticket_id, v_token;

  INSERT INTO public.support_ticket_messages(ticket_id, sender, message)
    VALUES (v_ticket_id, 'customer', left(p_message,5000));

  IF jsonb_array_length(coalesce(p_attachments,'[]'::jsonb)) > 0 THEN
    FOR v_att IN SELECT * FROM jsonb_array_elements(p_attachments) LOOP
      INSERT INTO public.support_ticket_attachments(
        ticket_id, organization_id, storage_path, file_name, mime_type, size_bytes, uploaded_via
      ) VALUES (
        v_ticket_id, v_org_id,
        v_att->>'storage_path', v_att->>'file_name', v_att->>'mime_type',
        nullif(v_att->>'size_bytes','')::bigint, 'public_form'
      );
    END LOOP;
  END IF;

  ticket_ref := v_ref;
  public_token := v_token;
  RETURN NEXT;
END $$;