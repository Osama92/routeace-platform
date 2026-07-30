-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- (CLI push is blocked by an older non-idempotent migration;
--  these statements are all idempotent / safe to run directly.)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- PART A — Trial expiry now REVERTS TO FREE (no hard lockout)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.process_trial_lifecycle()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org            RECORD;
  v_user_email     TEXT;
  v_user_name      TEXT;
  v_days_left      INT;
  v_notif_type     TEXT;
  v_subject        TEXT;
  v_expired_count  INT := 0;
  v_emails_sent    INT := 0;
BEGIN
  -- Revert overdue trials to FREE (was 'expired')
  UPDATE public.organizations
  SET subscription_status = 'free',
      subscription_tier   = 'starter'
  WHERE subscription_status = 'trial'
    AND subscription_expires_at < NOW();
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  UPDATE public.tenant_config tc
  SET plan_tier = 'free', max_users = 3, max_vehicles = 3, max_branches = 1,
      max_monthly_dispatches = 10, max_api_calls = 0, max_integrations = 0, ai_credits_total = 0
  FROM public.organizations o
  WHERE tc.organization_id = o.id
    AND o.subscription_status = 'free'
    AND o.subscription_expires_at < NOW()
    AND tc.plan_tier <> 'free';

  -- Trial-ended notification (reverted in last 25h)
  FOR v_org IN
    SELECT o.id, o.name, o.subscription_expires_at
    FROM public.organizations o
    WHERE o.subscription_status = 'free'
      AND o.subscription_expires_at >= NOW() - INTERVAL '25 hours'
      AND o.subscription_expires_at < NOW()
      AND NOT EXISTS (SELECT 1 FROM public.trial_notifications tn
                      WHERE tn.organization_id = o.id AND tn.notification_type = 'expired')
  LOOP
    SELECT au.email, coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1))
    INTO v_user_email, v_user_name
    FROM auth.users au JOIN public.organization_members om ON om.user_id = au.id
    WHERE om.organization_id = v_org.id AND om.is_active = true
      AND om.role IN ('admin','org_admin','super_admin') LIMIT 1;
    CONTINUE WHEN v_user_email IS NULL;
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id','trial_expired_'||v_org.id::text, 'to',v_user_email,
      'subject','Your RouteAce trial has ended — you are now on the Free plan',
      'html',public.render_trial_email('expired',v_user_name,v_org.name,0,v_org.subscription_expires_at),
      'label','trial_expired','queued_at',NOW()::text));
    INSERT INTO public.trial_notifications(organization_id,notification_type)
    VALUES (v_org.id,'expired') ON CONFLICT DO NOTHING;
    v_emails_sent := v_emails_sent + 1;
  END LOOP;

  -- Urgency emails for active trials
  FOR v_org IN
    SELECT o.id, o.name, o.subscription_expires_at,
           (o.subscription_expires_at::DATE - CURRENT_DATE)::INT AS days_left
    FROM public.organizations o
    WHERE o.subscription_status = 'trial' AND o.subscription_expires_at > NOW()
  LOOP
    v_days_left := v_org.days_left;
    v_notif_type := CASE v_days_left WHEN 2 THEN 'day_2' WHEN 1 THEN 'day_1' WHEN 0 THEN 'day_0' ELSE NULL END;
    CONTINUE WHEN v_notif_type IS NULL;
    CONTINUE WHEN EXISTS (SELECT 1 FROM public.trial_notifications
                          WHERE organization_id = v_org.id AND notification_type = v_notif_type);
    SELECT au.email, coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email,'@',1))
    INTO v_user_email, v_user_name
    FROM auth.users au JOIN public.organization_members om ON om.user_id = au.id
    WHERE om.organization_id = v_org.id AND om.is_active = true
      AND om.role IN ('admin','org_admin','super_admin') LIMIT 1;
    CONTINUE WHEN v_user_email IS NULL;
    v_subject := CASE v_notif_type
      WHEN 'day_2' THEN '2 days left on your RouteAce trial'
      WHEN 'day_1' THEN 'Your RouteAce trial expires tomorrow'
      WHEN 'day_0' THEN 'Last day — your RouteAce trial ends tonight' END;
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id','trial_'||v_notif_type||'_'||v_org.id::text, 'to',v_user_email, 'subject',v_subject,
      'html',public.render_trial_email(v_notif_type,v_user_name,v_org.name,v_days_left,v_org.subscription_expires_at),
      'label','trial_'||v_notif_type,'queued_at',NOW()::text));
    INSERT INTO public.trial_notifications(organization_id,notification_type)
    VALUES (v_org.id,v_notif_type) ON CONFLICT DO NOTHING;
    v_emails_sent := v_emails_sent + 1;
  END LOOP;

  RETURN jsonb_build_object('reverted_to_free',v_expired_count,'emails_sent',v_emails_sent,'processed_at',NOW()::text);
END $$;
REVOKE EXECUTE ON FUNCTION public.process_trial_lifecycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_trial_lifecycle() TO service_role;


-- ─────────────────────────────────────────────────────────────
-- PART B — GOODWILL: +30 days for every currently-expired org
-- ─────────────────────────────────────────────────────────────
UPDATE public.organizations
SET subscription_status     = 'trial',
    subscription_tier       = 'starter',
    subscription_expires_at = NOW() + INTERVAL '30 days'
WHERE subscription_status = 'expired'
   OR (subscription_status = 'trial' AND subscription_expires_at < NOW());

UPDATE public.tenant_config tc
SET plan_tier = 'starter', max_users = 10, max_vehicles = 25, max_branches = 3,
    max_monthly_dispatches = 500, max_api_calls = 0, max_integrations = 2, ai_credits_total = 100
FROM public.organizations o
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND o.subscription_expires_at > NOW()
  AND tc.plan_tier = 'free';

DELETE FROM public.trial_notifications tn
USING public.organizations o
WHERE tn.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND o.subscription_expires_at > NOW()
  AND tn.notification_type IN ('day_2','day_1','day_0','expired');


-- ─────────────────────────────────────────────────────────────
-- PART C — Per-vehicle proration functions (billing tracker)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.vehicle_monthly_rate_naira()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 5000::numeric; $$;

CREATE OR REPLACE FUNCTION public.get_vehicle_subscription_charges(
  p_org_id uuid, p_ref_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  vehicle_id uuid, registration_number text, vehicle_type text, registered_on date,
  month_start date, month_end date, days_in_month int, days_active int,
  is_prorated boolean, monthly_rate numeric, prorated_charge numeric, next_renewal date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH bounds AS (
    SELECT date_trunc('month', p_ref_date)::date AS m_start,
           (date_trunc('month', p_ref_date) + interval '1 month - 1 day')::date AS m_end,
           extract(day FROM (date_trunc('month', p_ref_date) + interval '1 month - 1 day'))::int AS d_in_month,
           (date_trunc('month', p_ref_date) + interval '1 month')::date AS next_month_start)
  SELECT v.id, v.registration_number, v.vehicle_type, v.created_at::date,
         b.m_start, b.m_end, b.d_in_month,
         (b.m_end - GREATEST(v.created_at::date, b.m_start) + 1),
         (v.created_at::date > b.m_start),
         public.vehicle_monthly_rate_naira(),
         ROUND(public.vehicle_monthly_rate_naira()
               * (b.m_end - GREATEST(v.created_at::date, b.m_start) + 1)::numeric
               / b.d_in_month::numeric, 2),
         b.next_month_start
  FROM public.vehicles v CROSS JOIN bounds b
  WHERE v.organization_id = p_org_id
    AND COALESCE(v.status,'available') <> 'retired'
    AND v.created_at::date <= b.m_end
  ORDER BY v.created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.get_vehicle_subscription_charges(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_subscription_charges(uuid, date) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_vehicle_subscription_total(
  p_org_id uuid, p_ref_date date DEFAULT CURRENT_DATE)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(prorated_charge),0) FROM public.get_vehicle_subscription_charges(p_org_id, p_ref_date);
$$;
REVOKE EXECUTE ON FUNCTION public.get_vehicle_subscription_total(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_vehicle_subscription_total(uuid, date) TO authenticated, service_role;

-- Verify the goodwill extension worked:
-- SELECT id, name, subscription_status, subscription_expires_at FROM public.organizations
-- WHERE subscription_status = 'trial' ORDER BY subscription_expires_at DESC;
