
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS csat_link_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS csat_link_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS csat_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS csat_submitted_at timestamptz;

CREATE INDEX IF NOT EXISTS support_tickets_csat_pending_idx
  ON public.support_tickets(organization_id, resolved_at)
  WHERE status IN ('resolved','closed') AND csat IS NULL;

CREATE TABLE IF NOT EXISTS public.support_csat_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  csat_rating integer NOT NULL CHECK (csat_rating BETWEEN 1 AND 5),
  csat_pct numeric(5,2) NOT NULL,
  comment text,
  submitter_ip text,
  user_agent text,
  submitted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS support_csat_audit_ticket_idx ON public.support_csat_audit(ticket_id);
CREATE INDEX IF NOT EXISTS support_csat_audit_org_time_idx ON public.support_csat_audit(organization_id, submitted_at DESC);
ALTER TABLE public.support_csat_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "csat_audit_select_org" ON public.support_csat_audit;
CREATE POLICY "csat_audit_select_org" ON public.support_csat_audit
  FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.set_csat_link_expiry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('resolved','closed')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND NEW.csat IS NULL
     AND NEW.csat_link_expires_at IS NULL THEN
    NEW.csat_link_expires_at := now() + interval '14 days';
    NEW.csat_link_sent_at := now();
    IF NEW.resolved_at IS NULL THEN NEW.resolved_at := now(); END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_csat_link_expiry ON public.support_tickets;
CREATE TRIGGER trg_set_csat_link_expiry
  BEFORE UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_csat_link_expiry();

UPDATE public.support_tickets
   SET csat_link_expires_at = COALESCE(resolved_at, now()) + interval '14 days',
       csat_link_sent_at = COALESCE(csat_link_sent_at, resolved_at, now())
 WHERE status IN ('resolved','closed') AND csat IS NULL AND csat_link_expires_at IS NULL;

DROP FUNCTION IF EXISTS public.submit_support_csat(uuid, integer, text);
CREATE OR REPLACE FUNCTION public.submit_support_csat(
  p_token uuid, p_rating integer, p_comment text DEFAULT NULL,
  p_ip text DEFAULT NULL, p_user_agent text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_t public.support_tickets%ROWTYPE; v_pct numeric(5,2);
BEGIN
  IF p_rating IS NULL OR p_rating < 1 OR p_rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  SELECT * INTO v_t FROM public.support_tickets WHERE public_token = p_token;
  IF v_t.id IS NULL THEN RAISE EXCEPTION 'Ticket not found'; END IF;
  IF v_t.status NOT IN ('resolved','closed') THEN RAISE EXCEPTION 'Ticket not yet resolved'; END IF;
  IF v_t.csat IS NOT NULL THEN
    RETURN jsonb_build_object('already_rated', true, 'csat', v_t.csat,
      'csat_pct', round((v_t.csat::numeric/5.0)*100, 1));
  END IF;
  IF v_t.csat_link_expires_at IS NOT NULL AND v_t.csat_link_expires_at < now() THEN
    RAISE EXCEPTION 'CSAT link expired';
  END IF;
  v_pct := round((p_rating::numeric / 5.0) * 100, 2);
  UPDATE public.support_tickets
     SET csat = p_rating, csat_submitted_at = now(), updated_at = now()
   WHERE id = v_t.id;
  INSERT INTO public.support_csat_audit(ticket_id, organization_id, csat_rating, csat_pct, comment, submitter_ip, user_agent)
  VALUES (v_t.id, v_t.organization_id, p_rating, v_pct,
    NULLIF(trim(coalesce(p_comment,'')), ''),
    NULLIF(trim(coalesce(p_ip,'')), ''),
    NULLIF(trim(coalesce(p_user_agent,'')), ''));
  IF p_comment IS NOT NULL AND length(trim(p_comment)) > 0 THEN
    INSERT INTO public.support_ticket_messages(ticket_id, sender, message, is_internal)
    VALUES (v_t.id, 'customer', '[CSAT feedback] ' || left(p_comment, 4000), false);
  END IF;
  RETURN jsonb_build_object('ok', true, 'csat', p_rating, 'csat_pct', v_pct);
END;
$$;
GRANT EXECUTE ON FUNCTION public.submit_support_csat(uuid, integer, text, text, text) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.get_public_ticket_status(uuid);
CREATE OR REPLACE FUNCTION public.get_public_ticket_status(p_token uuid)
RETURNS TABLE(ref text, subject text, status text, priority text,
  created_at timestamptz, updated_at timestamptz, resolved_at timestamptz,
  organization_name text, csat integer, csat_pct numeric, csat_link_expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT t.ref, t.subject, t.status, t.priority,
    t.created_at, t.updated_at, t.resolved_at,
    o.name AS organization_name, t.csat,
    CASE WHEN t.csat IS NULL THEN NULL ELSE round((t.csat::numeric/5.0)*100, 1) END,
    t.csat_link_expires_at
  FROM public.support_tickets t
  LEFT JOIN public.organizations o ON o.id = t.organization_id
  WHERE t.public_token = p_token;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_ticket_status(uuid) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.support_center_kpis(uuid);
DROP FUNCTION IF EXISTS public.support_center_kpis(uuid, timestamptz, timestamptz);
CREATE OR REPLACE FUNCTION public.support_center_kpis(
  p_org_id uuid, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result jsonb;
  v_from timestamptz := COALESCE(p_from, now() - interval '30 days');
  v_to   timestamptz := COALESCE(p_to, now());
BEGIN
  IF NOT public.is_org_member(auth.uid(), p_org_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  WITH t AS (SELECT * FROM public.support_tickets WHERE organization_id = p_org_id),
  recent AS (SELECT * FROM t WHERE created_at BETWEEN v_from AND v_to),
  rated AS (SELECT * FROM t WHERE csat IS NOT NULL AND csat_submitted_at BETWEEN v_from AND v_to)
  SELECT jsonb_build_object(
    'csat_pct', (SELECT round(avg((csat::numeric/5.0)*100)::numeric, 1) FROM rated),
    'csat_count', (SELECT count(*) FROM rated),
    'csat_response_rate_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE csat IS NOT NULL) / count(*), 1) END
      FROM recent WHERE status IN ('resolved','closed')),
    'nps_score', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * (count(*) FILTER (WHERE csat >= 5)::numeric
                          - count(*) FILTER (WHERE csat <= 3)::numeric) / count(*), 1)
      END FROM rated),
    'fcr_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE status IN ('resolved','closed')
          AND first_response_at IS NOT NULL
          AND first_response_at <= resolved_at + interval '5 minutes') / count(*), 1)
      END FROM recent WHERE status IN ('resolved','closed')),
    'avg_handle_seconds', (
      SELECT round(extract(epoch FROM avg(resolved_at - created_at))::numeric)
      FROM recent WHERE resolved_at IS NOT NULL),
    'sla_compliance_pct', (
      SELECT CASE WHEN count(*) = 0 THEN NULL
        ELSE round(100.0 * count(*) FILTER (WHERE resolved_at IS NOT NULL AND resolved_at <= sla_deadline) / count(*), 1)
      END FROM recent WHERE status IN ('resolved','closed')),
    'agents_online', (
      SELECT count(DISTINCT om.user_id) FROM public.organization_members om
      JOIN public.user_roles ur ON ur.user_id = om.user_id
      WHERE om.organization_id = p_org_id AND om.is_active = true
        AND ur.role IN ('support','ops_manager','admin','org_admin','super_admin')),
    'escalation_rate_pct', (
      SELECT CASE WHEN count(*) = 0 THEN 0
        ELSE round(100.0 * count(*) FILTER (WHERE status = 'escalated') / count(*), 1) END
      FROM recent),
    'open_count', (SELECT count(*) FROM t WHERE status = 'open'),
    'escalated_count', (SELECT count(*) FROM t WHERE status = 'escalated'),
    'resolved_today', (SELECT count(*) FROM t WHERE status IN ('resolved','closed') AND resolved_at::date = current_date),
    'volume_by_channel', (
      SELECT jsonb_object_agg(channel, c) FROM (SELECT channel, count(*) c FROM recent GROUP BY channel) s),
    'csat_segments', (
      SELECT jsonb_build_object(
        'promoters', count(*) FILTER (WHERE csat >= 5),
        'passives',  count(*) FILTER (WHERE csat = 4),
        'detractors',count(*) FILTER (WHERE csat <= 3)
      ) FROM rated),
    'weekly_trends', (
      SELECT jsonb_agg(jsonb_build_object('week', wk, 'resolved', resolved, 'escalated', escalated) ORDER BY wk)
      FROM (
        SELECT date_trunc('week', created_at)::date AS wk,
          count(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved,
          count(*) FILTER (WHERE status = 'escalated') AS escalated
        FROM recent GROUP BY 1) w)
  ) INTO result;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
GRANT EXECUTE ON FUNCTION public.support_center_kpis(uuid, timestamptz, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.support_pending_csat_reminders()
RETURNS TABLE(ticket_id uuid, organization_id uuid, ref text, subject text,
  complainant_email text, customer_name text, public_token uuid, resolved_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, organization_id, ref, subject, complainant_email, customer_name, public_token, resolved_at
    FROM public.support_tickets
   WHERE status IN ('resolved','closed') AND csat IS NULL
     AND complainant_email IS NOT NULL AND resolved_at IS NOT NULL
     AND resolved_at < now() - interval '24 hours'
     AND csat_reminder_sent_at IS NULL
     AND (csat_link_expires_at IS NULL OR csat_link_expires_at > now())
   LIMIT 200;
$$;
REVOKE ALL ON FUNCTION public.support_pending_csat_reminders() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mark_csat_reminder_sent(p_ticket_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.support_tickets SET csat_reminder_sent_at = now() WHERE id = p_ticket_id;
$$;
REVOKE ALL ON FUNCTION public.mark_csat_reminder_sent(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_export_data(
  p_org_id uuid, p_from timestamptz DEFAULT NULL, p_to timestamptz DEFAULT NULL
) RETURNS TABLE(
  ref text, created_at timestamptz, resolved_at timestamptz, status text, priority text,
  channel text, tag text, subject text, customer_name text, complainant_email text,
  order_id text, sla_deadline timestamptz, sla_met boolean, resolution_minutes integer,
  csat integer, csat_pct numeric, nps_band text, csat_submitted_at timestamptz,
  dispatch_number text, route_id uuid, driver_name text, transporter_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH guard AS (SELECT 1 WHERE public.is_org_member(auth.uid(), p_org_id))
  SELECT t.ref, t.created_at, t.resolved_at, t.status, t.priority, t.channel, t.tag,
    t.subject, t.customer_name, t.complainant_email, t.order_id, t.sla_deadline,
    (t.resolved_at IS NOT NULL AND t.resolved_at <= t.sla_deadline) AS sla_met,
    CASE WHEN t.resolved_at IS NULL THEN NULL
         ELSE (extract(epoch FROM t.resolved_at - t.created_at)/60)::int END AS resolution_minutes,
    t.csat,
    CASE WHEN t.csat IS NULL THEN NULL ELSE round((t.csat::numeric/5.0)*100,1) END AS csat_pct,
    CASE WHEN t.csat IS NULL THEN NULL
         WHEN t.csat >= 5 THEN 'promoter'
         WHEN t.csat = 4 THEN 'passive'
         ELSE 'detractor' END AS nps_band,
    t.csat_submitted_at,
    d.dispatch_number, d.route_id,
    p.full_name AS driver_name,
    c.company_name AS transporter_name
  FROM public.support_tickets t
  LEFT JOIN public.dispatches d ON d.id = t.dispatch_id
  LEFT JOIN public.profiles p ON p.user_id = d.driver_id
  LEFT JOIN public.customers c ON c.id = d.customer_id
  WHERE EXISTS (SELECT 1 FROM guard)
    AND t.organization_id = p_org_id
    AND t.created_at BETWEEN COALESCE(p_from, now() - interval '90 days') AND COALESCE(p_to, now())
  ORDER BY t.created_at DESC;
$$;
GRANT EXECUTE ON FUNCTION public.support_export_data(uuid, timestamptz, timestamptz) TO authenticated;
