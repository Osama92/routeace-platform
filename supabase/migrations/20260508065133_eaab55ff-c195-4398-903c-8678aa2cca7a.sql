
-- ============================================================================
-- 1. STORAGE BACKFILL: company-assets → org-prefixed paths
-- ============================================================================
UPDATE storage.objects so
SET name = o.id::text || '/' || so.name
FROM public.organizations o
WHERE so.bucket_id = 'company-assets'
  AND so.name !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  AND o.owner_user_id = so.owner;

-- ============================================================================
-- 2. SUPPORT TICKETS — multi-tenant + public intake hardening
-- ============================================================================
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS submitted_via text NOT NULL DEFAULT 'agent' CHECK (submitted_via IN ('agent','public_form','api','email_inbound','widget')),
  ADD COLUMN IF NOT EXISTS complainant_email text,
  ADD COLUMN IF NOT EXISTS complainant_phone text,
  ADD COLUMN IF NOT EXISTS public_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolution_notes text;

CREATE INDEX IF NOT EXISTS support_tickets_org_idx ON public.support_tickets(organization_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_public_token_idx ON public.support_tickets(public_token);

-- Backfill org_id for existing rows (best effort: from creator's primary org)
UPDATE public.support_tickets st
SET organization_id = (
  SELECT om.organization_id FROM public.organization_members om
  WHERE om.user_id = st.created_by AND om.is_active = true
  ORDER BY om.joined_at ASC NULLS LAST LIMIT 1
)
WHERE st.organization_id IS NULL AND st.created_by IS NOT NULL;

-- Trigger: stamp organization_id from creator
CREATE OR REPLACE FUNCTION public.set_support_ticket_org()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.created_by IS NOT NULL THEN
    SELECT om.organization_id INTO NEW.organization_id
    FROM public.organization_members om
    WHERE om.user_id = NEW.created_by AND om.is_active = true
    ORDER BY om.joined_at ASC NULLS LAST LIMIT 1;
  END IF;
  IF NEW.ref IS NULL OR NEW.ref = '' THEN
    NEW.ref := 'TKT-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_support_ticket_org ON public.support_tickets;
CREATE TRIGGER trg_set_support_ticket_org
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_support_ticket_org();

-- Trigger: auto-stamp resolved_at and first_response_at
CREATE OR REPLACE FUNCTION public.support_ticket_lifecycle()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.status IN ('resolved','closed') AND OLD.status NOT IN ('resolved','closed') THEN
    NEW.resolved_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_support_ticket_lifecycle ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_lifecycle
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_ticket_lifecycle();

-- Stamp first_response_at on first agent message
CREATE OR REPLACE FUNCTION public.stamp_first_response()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.sender = 'agent' AND NOT NEW.is_internal THEN
    UPDATE public.support_tickets
    SET first_response_at = COALESCE(first_response_at, now())
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_stamp_first_response ON public.support_ticket_messages;
CREATE TRIGGER trg_stamp_first_response
  AFTER INSERT ON public.support_ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.stamp_first_response();

-- ============================================================================
-- 3. STRICT TENANT-ISOLATED RLS
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Creator or support/admin view support_tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "support_tickets_update" ON public.support_tickets;

CREATE POLICY "support_tickets_select_org"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (
    organization_id IS NOT NULL
    AND public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "support_tickets_insert_org"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NULL OR public.is_org_member(auth.uid(), organization_id)
  );

CREATE POLICY "support_tickets_update_org"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (
    organization_id IS NOT NULL AND public.is_org_member(auth.uid(), organization_id)
  );

-- Messages: tighten by ticket org
DROP POLICY IF EXISTS "support_msgs_select" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "support_msgs_insert" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can view ticket messages" ON public.support_ticket_messages;
DROP POLICY IF EXISTS "Users can create ticket messages" ON public.support_ticket_messages;

CREATE POLICY "support_msgs_select_org"
  ON public.support_ticket_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.organization_id IS NOT NULL
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

CREATE POLICY "support_msgs_insert_org"
  ON public.support_ticket_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id
        AND t.organization_id IS NOT NULL
        AND public.is_org_member(auth.uid(), t.organization_id)
    )
  );

-- ============================================================================
-- 4. PUBLIC INTAKE RPCs (anonymous complainant flow)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_public_support_ticket(
  p_org_slug text,
  p_subject text,
  p_message text,
  p_complainant_name text,
  p_complainant_email text,
  p_complainant_phone text DEFAULT NULL,
  p_channel text DEFAULT 'live_chat',
  p_tag text DEFAULT 'complaint',
  p_order_id text DEFAULT NULL
)
RETURNS TABLE(ticket_id uuid, ticket_ref text, public_token uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org_id uuid;
  v_ticket public.support_tickets%ROWTYPE;
BEGIN
  -- Validate org exists
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = p_org_slug AND is_active = true;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found' USING ERRCODE='P0002';
  END IF;

  -- Validate inputs (server-side hard limits)
  IF length(coalesce(p_subject,'')) < 3 OR length(p_subject) > 200 THEN
    RAISE EXCEPTION 'Subject must be 3-200 characters';
  END IF;
  IF length(coalesce(p_message,'')) < 10 OR length(p_message) > 5000 THEN
    RAISE EXCEPTION 'Message must be 10-5000 characters';
  END IF;
  IF length(coalesce(p_complainant_name,'')) < 2 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  IF p_complainant_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;
  IF p_channel NOT IN ('phone','whatsapp','email','instagram','live_chat') THEN
    p_channel := 'live_chat';
  END IF;

  INSERT INTO public.support_tickets (
    organization_id, channel, subject, status, priority, tag,
    customer_name, complainant_email, complainant_phone, order_id,
    submitted_via, sla_deadline
  ) VALUES (
    v_org_id, p_channel, p_subject, 'open', 'medium', p_tag,
    p_complainant_name, p_complainant_email, p_complainant_phone, p_order_id,
    'public_form', now() + interval '4 hours'
  ) RETURNING * INTO v_ticket;

  INSERT INTO public.support_ticket_messages (ticket_id, sender, message, is_internal)
  VALUES (v_ticket.id, 'customer', p_message, false);

  RETURN QUERY SELECT v_ticket.id, v_ticket.ref, v_ticket.public_token;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_public_support_ticket(text,text,text,text,text,text,text,text,text) TO anon, authenticated;

-- Public status lookup (no PII beyond what they submitted)
CREATE OR REPLACE FUNCTION public.get_public_ticket_status(p_token uuid)
RETURNS TABLE(
  ref text, subject text, status text, priority text,
  created_at timestamptz, updated_at timestamptz, resolved_at timestamptz,
  organization_name text
)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT t.ref, t.subject, t.status, t.priority,
         t.created_at, t.updated_at, t.resolved_at,
         o.name
  FROM public.support_tickets t
  JOIN public.organizations o ON o.id = t.organization_id
  WHERE t.public_token = p_token
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(uuid) TO anon, authenticated;

-- Public message thread (only customer + non-internal agent messages)
CREATE OR REPLACE FUNCTION public.get_public_ticket_messages(p_token uuid)
RETURNS TABLE(sender text, message text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
  SELECT m.sender, m.message, m.created_at
  FROM public.support_ticket_messages m
  JOIN public.support_tickets t ON t.id = m.ticket_id
  WHERE t.public_token = p_token AND m.is_internal = false
  ORDER BY m.created_at ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ticket_messages(uuid) TO anon, authenticated;

-- Public reply (complainant adds message to their ticket)
CREATE OR REPLACE FUNCTION public.add_public_ticket_message(p_token uuid, p_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ticket_id uuid; v_msg_id uuid;
BEGIN
  IF length(coalesce(p_message,'')) < 1 OR length(p_message) > 5000 THEN
    RAISE EXCEPTION 'Message must be 1-5000 characters';
  END IF;
  SELECT id INTO v_ticket_id FROM public.support_tickets WHERE public_token = p_token AND status NOT IN ('closed');
  IF v_ticket_id IS NULL THEN RAISE EXCEPTION 'Ticket not found or closed'; END IF;
  INSERT INTO public.support_ticket_messages (ticket_id, sender, message, is_internal)
  VALUES (v_ticket_id, 'customer', p_message, false) RETURNING id INTO v_msg_id;
  UPDATE public.support_tickets SET updated_at = now() WHERE id = v_ticket_id;
  RETURN v_msg_id;
END $$;

GRANT EXECUTE ON FUNCTION public.add_public_ticket_message(uuid,text) TO anon, authenticated;

-- ============================================================================
-- 5. LIVE KPI helper for current org
-- ============================================================================
CREATE OR REPLACE FUNCTION public.support_center_kpis(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  WITH t AS (
    SELECT * FROM public.support_tickets WHERE organization_id = p_org_id
  ),
  recent AS (SELECT * FROM t WHERE created_at > now() - interval '30 days')
  SELECT jsonb_build_object(
    'csat_avg', (SELECT round(avg(csat)::numeric, 1) FROM t WHERE csat IS NOT NULL),
    'csat_count', (SELECT count(*) FROM t WHERE csat IS NOT NULL),
    'fcr_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE status IN ('resolved','closed')
          AND first_response_at IS NOT NULL
          AND first_response_at <= resolved_at + interval '5 minutes') / count(*), 1)
      END FROM recent WHERE status IN ('resolved','closed')
    ),
    'avg_handle_seconds', (
      SELECT round(extract(epoch FROM avg(resolved_at - created_at))::numeric)
      FROM recent WHERE resolved_at IS NOT NULL
    ),
    'sla_compliance_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= sla_deadline) / count(*), 1)
      END FROM recent WHERE status IN ('resolved','closed')
    ),
    'agents_online', (
      SELECT count(DISTINCT om.user_id) FROM public.organization_members om
      JOIN public.user_roles ur ON ur.user_id = om.user_id
      WHERE om.organization_id = p_org_id AND om.is_active = true
        AND ur.role IN ('support','ops_manager','admin','org_admin','super_admin')
    ),
    'escalation_rate_pct', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'escalated') / count(*), 1) END
      FROM recent
    ),
    'open_count', (SELECT count(*) FROM t WHERE status = 'open'),
    'escalated_count', (SELECT count(*) FROM t WHERE status = 'escalated'),
    'resolved_today', (SELECT count(*) FROM t WHERE status IN ('resolved','closed') AND resolved_at::date = current_date),
    'volume_by_channel', (
      SELECT jsonb_object_agg(channel, c) FROM (
        SELECT channel, count(*) c FROM recent GROUP BY channel
      ) s
    ),
    'weekly_trends', (
      SELECT jsonb_agg(jsonb_build_object('week', wk, 'resolved', resolved, 'escalated', escalated) ORDER BY wk)
      FROM (
        SELECT date_trunc('week', created_at)::date AS wk,
          count(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved,
          count(*) FILTER (WHERE status = 'escalated') AS escalated
        FROM recent GROUP BY 1
      ) w
    )
  ) INTO result;
  RETURN COALESCE(result, '{}'::jsonb);
END $$;

GRANT EXECUTE ON FUNCTION public.support_center_kpis(uuid) TO authenticated;

-- Live agents activity
CREATE OR REPLACE FUNCTION public.support_center_agents(p_org_id uuid)
RETURNS TABLE(
  user_id uuid, full_name text, role text,
  tickets_today bigint, avg_handle_seconds numeric, csat_avg numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
  SELECT p.user_id, p.full_name, ur.role::text,
    (SELECT count(DISTINCT m.ticket_id) FROM public.support_ticket_messages m
       JOIN public.support_tickets t ON t.id = m.ticket_id
       WHERE m.sent_by = p.user_id AND t.organization_id = p_org_id
         AND m.created_at::date = current_date) AS tickets_today,
    (SELECT round(extract(epoch FROM avg(t.resolved_at - t.created_at))::numeric)
       FROM public.support_tickets t
       WHERE t.organization_id = p_org_id AND t.created_by = p.user_id
         AND t.resolved_at IS NOT NULL AND t.created_at > now() - interval '30 days') AS avg_handle_seconds,
    (SELECT round(avg(t.csat)::numeric, 1) FROM public.support_tickets t
       WHERE t.organization_id = p_org_id AND t.created_by = p.user_id AND t.csat IS NOT NULL) AS csat_avg
  FROM public.organization_members om
  JOIN public.profiles p ON p.user_id = om.user_id
  LEFT JOIN public.user_roles ur ON ur.user_id = om.user_id
  WHERE om.organization_id = p_org_id AND om.is_active = true
    AND ur.role IN ('support','ops_manager','admin','org_admin','super_admin')
  ORDER BY tickets_today DESC NULLS LAST
  LIMIT 24;
END $$;

GRANT EXECUTE ON FUNCTION public.support_center_agents(uuid) TO authenticated;
