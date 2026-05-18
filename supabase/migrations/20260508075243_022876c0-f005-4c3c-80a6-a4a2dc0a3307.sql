
-- =========================================================
-- 1. Org slug auto-generation
-- =========================================================
CREATE OR REPLACE FUNCTION public.slugify(p_text text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT trim(both '-' FROM regexp_replace(lower(coalesce(p_text,'')), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION public.ensure_unique_org_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE base text; candidate text; n int := 0;
BEGIN
  IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN RETURN NEW; END IF;
  base := nullif(public.slugify(NEW.name),'');
  IF base IS NULL THEN base := 'org-' || substr(NEW.id::text,1,8); END IF;
  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = candidate AND id <> NEW.id) LOOP
    n := n + 1; candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_org_slug_autogen ON public.organizations;
CREATE TRIGGER trg_org_slug_autogen BEFORE INSERT OR UPDATE OF name, slug ON public.organizations
  FOR EACH ROW WHEN (NEW.slug IS NULL OR NEW.slug = '') EXECUTE FUNCTION public.ensure_unique_org_slug();

-- Backfill
UPDATE public.organizations SET slug = NULL WHERE slug = '';
WITH gen AS (
  SELECT id, public.slugify(name) AS s, row_number() OVER (PARTITION BY public.slugify(name) ORDER BY created_at) AS rn
  FROM public.organizations WHERE slug IS NULL
)
UPDATE public.organizations o
SET slug = CASE WHEN g.rn=1 THEN COALESCE(NULLIF(g.s,''),'org-'||substr(o.id::text,1,8))
                ELSE COALESCE(NULLIF(g.s,''),'org')||'-'||g.rn END
FROM gen g WHERE g.id = o.id;

-- =========================================================
-- 2. Attachments table
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  uploaded_by uuid,
  uploaded_via text NOT NULL DEFAULT 'agent',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sta_ticket ON public.support_ticket_attachments(ticket_id);
ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members read attachments" ON public.support_ticket_attachments
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members insert attachments" ON public.support_ticket_attachments
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members delete attachments" ON public.support_ticket_attachments
  FOR DELETE USING (public.is_org_member(auth.uid(), organization_id));

-- =========================================================
-- 3. Audit timeline
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  event_type text NOT NULL, -- created, status_changed, assigned, message, resolved, attachment_added, csat_recorded
  actor_id uuid,
  actor_label text,
  from_value text,
  to_value text,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sta_audit_ticket ON public.support_ticket_audit(ticket_id, created_at DESC);
ALTER TABLE public.support_ticket_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read audit" ON public.support_ticket_audit
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));

-- Audit trigger on tickets
CREATE OR REPLACE FUNCTION public.support_ticket_audit_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, actor_id, to_value, meta)
    VALUES (NEW.id, NEW.organization_id, 'created', v_actor, NEW.status,
            jsonb_build_object('subject', NEW.subject, 'channel', NEW.channel, 'submitted_via', NEW.submitted_via));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, actor_id, from_value, to_value)
      VALUES (NEW.id, NEW.organization_id, 'status_changed', v_actor, OLD.status, NEW.status);
    END IF;
    IF NEW.assignee IS DISTINCT FROM OLD.assignee THEN
      INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, actor_id, from_value, to_value)
      VALUES (NEW.id, NEW.organization_id, 'assigned', v_actor, OLD.assignee, NEW.assignee);
    END IF;
    IF NEW.resolved_at IS DISTINCT FROM OLD.resolved_at AND NEW.resolved_at IS NOT NULL THEN
      INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, actor_id, to_value, meta)
      VALUES (NEW.id, NEW.organization_id, 'resolved', v_actor, NEW.status,
              jsonb_build_object('resolution_notes', NEW.resolution_notes));
    END IF;
    IF NEW.csat IS DISTINCT FROM OLD.csat AND NEW.csat IS NOT NULL THEN
      INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, to_value)
      VALUES (NEW.id, NEW.organization_id, 'csat_recorded', NEW.csat::text);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_ticket_audit ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_audit AFTER INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_audit_trg();

-- Audit on messages
CREATE OR REPLACE FUNCTION public.support_message_audit_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org uuid;
BEGIN
  SELECT organization_id INTO v_org FROM public.support_tickets WHERE id = NEW.ticket_id;
  INSERT INTO public.support_ticket_audit(ticket_id, organization_id, event_type, actor_id, actor_label, to_value, meta)
  VALUES (NEW.ticket_id, v_org, 'message', NEW.sent_by, NEW.sender, left(NEW.message, 240),
          jsonb_build_object('is_internal', NEW.is_internal));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_support_message_audit ON public.support_ticket_messages;
CREATE TRIGGER trg_support_message_audit AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.support_message_audit_trg();

-- =========================================================
-- 4. Storage bucket for attachments (private, org-prefixed)
-- =========================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('support-attachments','support-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "org members read support attachments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'support-attachments'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );
CREATE POLICY "org members upload support attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'support-attachments'
    AND public.is_org_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- =========================================================
-- 5. SLA breach view + RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.support_breached_tickets(p_org_id uuid)
RETURNS TABLE (id uuid, ref text, subject text, status text, sla_deadline timestamptz, minutes_overdue int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT id, ref, subject, status, sla_deadline,
         GREATEST(0, EXTRACT(EPOCH FROM (now() - sla_deadline))/60)::int
  FROM public.support_tickets
  WHERE organization_id = p_org_id
    AND resolved_at IS NULL
    AND sla_deadline < now()
    AND public.is_org_member(auth.uid(), p_org_id);
$$;

-- =========================================================
-- 6. Delivery CSAT surveys (LC only)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.delivery_csat_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  dispatch_id uuid REFERENCES public.dispatches(id) ON DELETE CASCADE,
  customer_email text,
  customer_name text,
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  rating int CHECK (rating BETWEEN 1 AND 5),
  nps int CHECK (nps BETWEEN 0 AND 10),
  comment text,
  sent_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);
CREATE INDEX IF NOT EXISTS idx_dcs_org ON public.delivery_csat_surveys(organization_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_dcs_dispatch ON public.delivery_csat_surveys(dispatch_id);
ALTER TABLE public.delivery_csat_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members read csat surveys" ON public.delivery_csat_surveys
  FOR SELECT USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org members create csat surveys" ON public.delivery_csat_surveys
  FOR INSERT WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- Public RPC to submit a rating (no auth)
CREATE OR REPLACE FUNCTION public.rate_delivery_csat(
  p_token uuid, p_rating int, p_nps int DEFAULT NULL, p_comment text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_id uuid; v_org uuid;
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  UPDATE public.delivery_csat_surveys
     SET rating = p_rating, nps = p_nps, comment = left(coalesce(p_comment,''),2000), responded_at = now()
   WHERE public_token = p_token AND responded_at IS NULL AND expires_at > now()
   RETURNING id, organization_id INTO v_id, v_org;
  IF v_id IS NULL THEN RAISE EXCEPTION 'survey not found or expired'; END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
GRANT EXECUTE ON FUNCTION public.rate_delivery_csat(uuid,int,int,text) TO anon, authenticated;

-- Public RPC to fetch survey context
CREATE OR REPLACE FUNCTION public.get_delivery_csat_context(p_token uuid)
RETURNS TABLE (organization_name text, dispatch_number text, customer_name text, already_rated boolean, expired boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT o.name, d.dispatch_number, s.customer_name,
         (s.responded_at IS NOT NULL), (s.expires_at < now())
  FROM public.delivery_csat_surveys s
  LEFT JOIN public.organizations o ON o.id = s.organization_id
  LEFT JOIN public.dispatches d ON d.id = s.dispatch_id
  WHERE s.public_token = p_token;
$$;
GRANT EXECUTE ON FUNCTION public.get_delivery_csat_context(uuid) TO anon, authenticated;

-- =========================================================
-- 7. Email notifications via existing queue
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_support_ticket_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_org_name text; v_subject text; v_body text; v_to text;
BEGIN
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;
  IF TG_OP = 'INSERT' THEN
    v_to := NEW.complainant_email;
    IF v_to IS NOT NULL THEN
      v_subject := '[' || coalesce(v_org_name,'Support') || '] Ticket received: ' || NEW.ref;
      v_body := 'Hi ' || coalesce(NEW.customer_name,'there') || E',\n\nWe have received your support ticket "' || NEW.subject ||
                E'".\nReference: ' || NEW.ref || E'\nTrack status: ' || coalesce(current_setting('app.public_url', true),'') ||
                '/support/track/' || NEW.public_token::text || E'\n\nThank you,\n' || coalesce(v_org_name,'Support Team');
      PERFORM public.enqueue_email(v_to, v_subject, v_body, NULL::jsonb);
    END IF;
  ELSIF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.complainant_email IS NOT NULL THEN
    v_subject := '[' || coalesce(v_org_name,'Support') || '] Ticket ' || NEW.ref || ' is now ' || NEW.status;
    v_body := 'Your ticket "' || NEW.subject || '" status changed to ' || NEW.status || E'.\nTrack: ' ||
              coalesce(current_setting('app.public_url', true),'') || '/support/track/' || NEW.public_token::text;
    PERFORM public.enqueue_email(NEW.complainant_email, v_subject, v_body, NULL::jsonb);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;  -- never block ticket ops on email failure
END $$;
DROP TRIGGER IF EXISTS trg_notify_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_support_ticket AFTER INSERT OR UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_ticket_event();

CREATE OR REPLACE FUNCTION public.notify_support_message_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t public.support_tickets%ROWTYPE; v_org_name text; v_to text; v_subject text; v_body text;
BEGIN
  IF NEW.is_internal THEN RETURN NEW; END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  SELECT name INTO v_org_name FROM public.organizations WHERE id = t.organization_id;
  IF NEW.sender = 'agent' AND t.complainant_email IS NOT NULL THEN
    v_to := t.complainant_email;
    v_subject := '[' || coalesce(v_org_name,'Support') || '] New reply on ' || t.ref;
    v_body := 'You have a new reply:' || E'\n\n' || NEW.message || E'\n\nTrack: ' ||
              coalesce(current_setting('app.public_url', true),'') || '/support/track/' || t.public_token::text;
    PERFORM public.enqueue_email(v_to, v_subject, v_body, NULL::jsonb);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_notify_support_message ON public.support_ticket_messages;
CREATE TRIGGER trg_notify_support_message AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_support_message_event();

-- =========================================================
-- 8. Auto-create CSAT survey on dispatch completion (LC)
-- =========================================================
CREATE OR REPLACE FUNCTION public.auto_create_delivery_csat()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_email text; v_name text; v_token uuid; v_org_name text;
BEGIN
  IF NEW.status <> 'completed' OR coalesce(OLD.status,'') = 'completed' THEN RETURN NEW; END IF;
  IF NEW.organization_id IS NULL OR NEW.customer_id IS NULL THEN RETURN NEW; END IF;
  SELECT email, coalesce(name, company_name) INTO v_email, v_name
  FROM public.customers WHERE id = NEW.customer_id;
  IF v_email IS NULL THEN RETURN NEW; END IF;
  -- avoid duplicates
  IF EXISTS (SELECT 1 FROM public.delivery_csat_surveys WHERE dispatch_id = NEW.id) THEN RETURN NEW; END IF;
  INSERT INTO public.delivery_csat_surveys(organization_id, dispatch_id, customer_email, customer_name)
    VALUES (NEW.organization_id, NEW.id, v_email, v_name)
    RETURNING public_token INTO v_token;
  SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;
  PERFORM public.enqueue_email(
    v_email,
    'How was your delivery from ' || coalesce(v_org_name,'us') || '?',
    'Hi ' || coalesce(v_name,'there') || E',\n\nYour delivery is complete. Please rate your experience:\n' ||
      coalesce(current_setting('app.public_url', true),'') || '/rate-delivery/' || v_token::text || E'\n\nThank you!',
    NULL::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_auto_csat_dispatch ON public.dispatches;
CREATE TRIGGER trg_auto_csat_dispatch AFTER UPDATE OF status ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_delivery_csat();

-- guard: customers may not have name/company_name; use exception-safe alias
-- Replace the function above defensively if those columns absent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='customers' AND column_name='name') THEN
    EXECUTE $f$
      CREATE OR REPLACE FUNCTION public.auto_create_delivery_csat()
      RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $body$
      DECLARE v_email text; v_name text; v_token uuid; v_org_name text;
      BEGIN
        IF NEW.status <> 'completed' OR coalesce(OLD.status,'') = 'completed' THEN RETURN NEW; END IF;
        IF NEW.organization_id IS NULL OR NEW.customer_id IS NULL THEN RETURN NEW; END IF;
        SELECT email INTO v_email FROM public.customers WHERE id = NEW.customer_id;
        IF v_email IS NULL THEN RETURN NEW; END IF;
        IF EXISTS (SELECT 1 FROM public.delivery_csat_surveys WHERE dispatch_id = NEW.id) THEN RETURN NEW; END IF;
        INSERT INTO public.delivery_csat_surveys(organization_id, dispatch_id, customer_email, customer_name)
          VALUES (NEW.organization_id, NEW.id, v_email, NULL)
          RETURNING public_token INTO v_token;
        SELECT name INTO v_org_name FROM public.organizations WHERE id = NEW.organization_id;
        PERFORM public.enqueue_email(
          v_email,
          'How was your delivery from ' || coalesce(v_org_name,'us') || '?',
          E'Your delivery is complete. Please rate your experience:\n' ||
            coalesce(current_setting('app.public_url', true),'') || '/rate-delivery/' || v_token::text,
          NULL::jsonb
        );
        RETURN NEW;
      EXCEPTION WHEN OTHERS THEN RETURN NEW;
      END $body$;
    $f$;
  END IF;
END $$;

-- =========================================================
-- 9. Updated public submission RPC supporting attachments + audit
-- =========================================================
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
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug AND is_active = true;
  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization not found'; END IF;

  v_ref := 'TKT-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  INSERT INTO public.support_tickets(
    organization_id, ref, channel, subject, customer_name, complainant_email, complainant_phone,
    tag, priority, order_id, submitted_via, status, sla_deadline
  ) VALUES (
    v_org_id, v_ref, p_channel, left(p_subject,200), left(coalesce(p_complainant_name,'Anonymous'),120),
    p_complainant_email, p_complainant_phone, coalesce(p_tag,'complaint'), 'medium',
    nullif(p_order_id,''), 'public_form', 'open', now() + interval '4 hours'
  ) RETURNING id, public_token INTO v_ticket_id, v_token;

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

  RETURN QUERY SELECT v_ref, v_token;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text,jsonb) TO anon, authenticated;

-- Get audit trail (org-scoped only)
CREATE OR REPLACE FUNCTION public.support_ticket_audit_list(p_ticket_id uuid)
RETURNS TABLE (event_type text, actor_label text, from_value text, to_value text, meta jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.event_type, a.actor_label, a.from_value, a.to_value, a.meta, a.created_at
  FROM public.support_ticket_audit a
  JOIN public.support_tickets t ON t.id = a.ticket_id
  WHERE a.ticket_id = p_ticket_id
    AND public.is_org_member(auth.uid(), t.organization_id)
  ORDER BY a.created_at ASC;
$$;
