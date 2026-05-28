-- ============================================================
-- Trial Lifecycle Infrastructure
-- 7-day free trial on Starter tier for all new organisations.
-- Includes: anti-abuse flag, dedup table, auto-start trigger,
-- welcome email trigger, HTML email renderer, daily lifecycle
-- function (expiry + email sequence), and pg_cron schedule.
-- ============================================================

-- ─── 1. has_used_trial flag (prevents re-trialing) ───────────────
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT false;

-- Existing orgs already have or had a plan — mark them so they
-- don't accidentally get a new trial on next UPDATE.
UPDATE public.organizations
SET has_used_trial = true
WHERE has_used_trial = false
  AND (
    subscription_status IN ('active', 'trial', 'expired')
    OR subscription_tier IS NOT NULL
  );

-- ─── 2. Trial notifications dedup table ──────────────────────────
-- One row per org per notification type. UNIQUE PK prevents duplicate emails.
CREATE TABLE IF NOT EXISTS public.trial_notifications (
  organization_id  UUID    NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notification_type TEXT   NOT NULL,  -- welcome | day_2 | day_1 | day_0 | expired
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, notification_type)
);
ALTER TABLE public.trial_notifications ENABLE ROW LEVEL SECURITY;
-- Service role only — trial notifications are internal, never user-readable
CREATE POLICY "trial_notifications_service_role"
  ON public.trial_notifications FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ─── 3. HTML email renderer ──────────────────────────────────────
-- Returns a complete HTML email body for any trial notification type.
CREATE OR REPLACE FUNCTION public.render_trial_email(
  p_template    TEXT,
  p_user_name   TEXT,
  p_org_name    TEXT,
  p_days_left   INT,
  p_expires_at  TIMESTAMPTZ
)
RETURNS TEXT LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_urgency_color TEXT;
  v_headline      TEXT;
  v_body_text     TEXT;
  v_cta_text      TEXT;
  v_cta_url       TEXT;
  v_expiry_str    TEXT;
BEGIN
  v_expiry_str := to_char(p_expires_at AT TIME ZONE 'UTC', 'FMDay, FMMonth FMDD, YYYY');

  v_urgency_color := CASE
    WHEN p_template IN ('day_1', 'day_0', 'expired') THEN '#ef4444'
    WHEN p_template = 'day_2'                         THEN '#f59e0b'
    ELSE '#6366f1'
  END;

  v_headline := CASE p_template
    WHEN 'welcome' THEN 'Your 7-day free trial has started'
    WHEN 'day_2'   THEN '2 days left on your RouteAce trial'
    WHEN 'day_1'   THEN 'Your trial expires tomorrow'
    WHEN 'day_0'   THEN 'Your trial expires tonight'
    WHEN 'expired' THEN 'Your free trial has ended'
    ELSE 'Your RouteAce trial update'
  END;

  v_body_text := CASE p_template
    WHEN 'welcome' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Welcome to <strong>RouteAce</strong>! Your 7-day trial on the <strong>Starter plan</strong> is now live for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong>.<br><br>' ||
      'During your trial you have access to:<br>' ||
      '<ul style="margin:12px 0;padding-left:20px;color:#475569;">' ||
      '<li>Route planning &amp; advanced routes</li>' ||
      '<li>Fleet, vehicles &amp; driver management</li>' ||
      '<li>Dispatch creation &amp; waybills</li>' ||
      '<li>Customer management &amp; invoicing</li>' ||
      '<li>Operational reports &amp; live tracking</li>' ||
      '</ul>' ||
      'Your trial ends on <strong>' || v_expiry_str || '</strong>.'
    WHEN 'day_2' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your RouteAce trial for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong> ends in <strong>2 days</strong> (' || v_expiry_str || ').<br><br>' ||
      'Upgrade now to keep your operations running without interruption — all your data, dispatches, and fleet records will be preserved.'
    WHEN 'day_1' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your RouteAce trial expires <strong>tomorrow</strong> (' || v_expiry_str || ').<br><br>' ||
      'Upgrade today to ensure zero downtime for your team. Your full history and data stays intact.'
    WHEN 'day_0' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'This is your <strong>final day</strong> on the RouteAce free trial. Access will be restricted tonight.<br><br>' ||
      'Upgrade right now to stay live — it takes less than two minutes.'
    WHEN 'expired' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your 7-day RouteAce trial has ended.<br><br>' ||
      '<strong>Your data is completely safe</strong> — all dispatches, vehicles, customers, and history are preserved and will be instantly available the moment you upgrade.<br><br>' ||
      'Choose a plan that fits your fleet and resume where you left off.'
    ELSE 'Your RouteAce subscription update.'
  END;

  v_cta_text := CASE p_template
    WHEN 'welcome' THEN 'Go to Dashboard'
    WHEN 'expired' THEN 'Restore Access Now'
    ELSE 'Upgrade Now'
  END;

  v_cta_url := CASE p_template
    WHEN 'welcome' THEN 'https://routeace.app/'
    ELSE 'https://routeace.app/billing-engine'
  END;

  RETURN
'<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>' || v_headline || '</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,''Segoe UI'',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

  <!-- Top accent bar -->
  <tr><td style="background:' || v_urgency_color || ';height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>

  <!-- Header -->
  <tr><td style="padding:28px 36px 20px;">
    <div style="display:inline-block;background:#0f172a;border-radius:8px;padding:6px 14px;">
      <span style="font-size:16px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">RouteAce</span>
    </div>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:0 36px 32px;">
    <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">' || v_headline || '</h1>
    <div style="font-size:15px;line-height:1.7;color:#475569;">' || v_body_text || '</div>

    <div style="margin-top:28px;">
      <a href="' || v_cta_url || '"
         style="display:inline-block;background:' || v_urgency_color || ';color:#ffffff;text-decoration:none;
                font-size:15px;font-weight:600;padding:13px 30px;border-radius:8px;letter-spacing:-0.1px;"
      >' || v_cta_text || '</a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;">
      Questions? Reply to this email or visit
      <a href="https://routeace.app/support" style="color:#6366f1;text-decoration:none;">routeace.app/support</a>
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 36px;border-top:1px solid #f1f5f9;background:#fafafa;">
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
      <strong style="color:#64748b;">RouteAce</strong> · Distribution Intelligence Platform<br>
      Operated by <a href="https://routeace.app" style="color:#6366f1;text-decoration:none;">Glyde Systems</a><br>
      You are receiving this because you signed up for a RouteAce trial.
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>';
END $$;

-- ─── 4. Auto-start trial on new org creation (BEFORE INSERT) ─────
-- Sets subscription fields directly on the new row before it is written.
-- Skips if the org was created with an explicit subscription already
-- (e.g. provisioned by a reseller with an enterprise plan pre-assigned).
CREATE OR REPLACE FUNCTION public.auto_start_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  -- Already flagged or explicitly given a paid/active subscription → skip
  IF NEW.has_used_trial = true THEN RETURN NEW; END IF;
  IF NEW.subscription_status IN ('active', 'expired') THEN
    NEW.has_used_trial := true;
    RETURN NEW;
  END IF;

  NEW.subscription_tier       := 'starter';
  NEW.subscription_status     := 'trial';
  NEW.subscription_expires_at := NOW() + INTERVAL '7 days';
  NEW.has_used_trial          := true;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_auto_start_trial ON public.organizations;
CREATE TRIGGER trg_auto_start_trial
  BEFORE INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.auto_start_trial();

-- ─── 5. Send welcome email when first admin joins a trial org ─────
-- Fires AFTER INSERT on organization_members so auth.users already has
-- the new row and we can look up the email safely.
CREATE OR REPLACE FUNCTION public.send_trial_welcome_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org_status  TEXT;
  v_org_name    TEXT;
  v_expires_at  TIMESTAMPTZ;
  v_user_email  TEXT;
  v_user_name   TEXT;
BEGIN
  -- Only for admin/org_admin roles (owners, not ops/support team members)
  IF NEW.role NOT IN ('admin', 'org_admin', 'super_admin') THEN RETURN NEW; END IF;

  SELECT subscription_status, name, subscription_expires_at
  INTO v_org_status, v_org_name, v_expires_at
  FROM public.organizations WHERE id = NEW.organization_id;

  IF v_org_status <> 'trial' THEN RETURN NEW; END IF;

  -- Guard: don't send twice
  IF EXISTS (
    SELECT 1 FROM public.trial_notifications
    WHERE organization_id = NEW.organization_id AND notification_type = 'welcome'
  ) THEN RETURN NEW; END IF;

  -- Resolve email + name from auth.users
  SELECT email,
         coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
  INTO v_user_email, v_user_name
  FROM auth.users WHERE id = NEW.user_id;

  IF v_user_email IS NULL THEN RETURN NEW; END IF;

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', 'trial_welcome_' || NEW.organization_id::text,
    'to',         v_user_email,
    'subject',    'Your 7-day RouteAce trial has started',
    'html',       public.render_trial_email('welcome', v_user_name, v_org_name, 7, v_expires_at),
    'label',      'trial_welcome',
    'queued_at',  NOW()::text
  ));

  INSERT INTO public.trial_notifications(organization_id, notification_type)
  VALUES (NEW.organization_id, 'welcome')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW; -- never block member creation on email failure
END $$;

DROP TRIGGER IF EXISTS trg_send_trial_welcome ON public.organization_members;
CREATE TRIGGER trg_send_trial_welcome
  AFTER INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.send_trial_welcome_email();

-- ─── 6. Daily lifecycle function: expiry + email sequence ────────
-- Called by pg_cron every day at 00:05 UTC.
-- Returns a JSONB summary for logging/monitoring.
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
  -- ── 6a. Expire overdue trials ──────────────────────────────────
  UPDATE public.organizations
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial'
    AND subscription_expires_at < NOW();
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Downgrade tenant_config for newly-expired orgs to free-tier limits
  UPDATE public.tenant_config tc
  SET
    plan_tier              = 'free',
    max_users              = 3,
    max_vehicles           = 3,
    max_branches           = 1,
    max_monthly_dispatches = 10,
    max_api_calls          = 0,
    max_integrations       = 0,
    ai_credits_total       = 0
  FROM public.organizations o
  WHERE tc.organization_id = o.id
    AND o.subscription_status = 'expired'
    AND tc.plan_tier <> 'free';

  -- ── 6b. Expiry notification for orgs that expired in last 25h ──
  FOR v_org IN
    SELECT o.id, o.name, o.subscription_expires_at
    FROM public.organizations o
    WHERE o.subscription_status = 'expired'
      AND o.subscription_expires_at >= NOW() - INTERVAL '25 hours'
      AND NOT EXISTS (
        SELECT 1 FROM public.trial_notifications tn
        WHERE tn.organization_id = o.id AND tn.notification_type = 'expired'
      )
  LOOP
    SELECT au.email,
           coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
    INTO v_user_email, v_user_name
    FROM auth.users au
    JOIN public.organization_members om ON om.user_id = au.id
    WHERE om.organization_id = v_org.id
      AND om.is_active = true
      AND om.role IN ('admin', 'org_admin', 'super_admin')
    LIMIT 1;

    CONTINUE WHEN v_user_email IS NULL;

    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id', 'trial_expired_' || v_org.id::text,
      'to',         v_user_email,
      'subject',    'Your RouteAce trial has ended — your data is safe',
      'html',       public.render_trial_email('expired', v_user_name, v_org.name, 0, v_org.subscription_expires_at),
      'label',      'trial_expired',
      'queued_at',  NOW()::text
    ));

    INSERT INTO public.trial_notifications(organization_id, notification_type)
    VALUES (v_org.id, 'expired') ON CONFLICT DO NOTHING;

    v_emails_sent := v_emails_sent + 1;
  END LOOP;

  -- ── 6c. Urgency emails for active trials ───────────────────────
  FOR v_org IN
    SELECT
      o.id,
      o.name,
      o.subscription_expires_at,
      (o.subscription_expires_at::DATE - CURRENT_DATE)::INT AS days_left
    FROM public.organizations o
    WHERE o.subscription_status = 'trial'
      AND o.subscription_expires_at > NOW()
  LOOP
    v_days_left := v_org.days_left;

    v_notif_type := CASE v_days_left
      WHEN 2 THEN 'day_2'
      WHEN 1 THEN 'day_1'
      WHEN 0 THEN 'day_0'
      ELSE NULL
    END;

    CONTINUE WHEN v_notif_type IS NULL;

    -- Skip if already sent
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.trial_notifications
      WHERE organization_id = v_org.id AND notification_type = v_notif_type
    );

    -- Resolve admin email for this org
    SELECT au.email,
           coalesce(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1))
    INTO v_user_email, v_user_name
    FROM auth.users au
    JOIN public.organization_members om ON om.user_id = au.id
    WHERE om.organization_id = v_org.id
      AND om.is_active = true
      AND om.role IN ('admin', 'org_admin', 'super_admin')
    LIMIT 1;

    CONTINUE WHEN v_user_email IS NULL;

    v_subject := CASE v_notif_type
      WHEN 'day_2' THEN '2 days left on your RouteAce trial'
      WHEN 'day_1' THEN 'Your RouteAce trial expires tomorrow'
      WHEN 'day_0' THEN 'Last day — your RouteAce trial ends tonight'
    END;

    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id', 'trial_' || v_notif_type || '_' || v_org.id::text,
      'to',         v_user_email,
      'subject',    v_subject,
      'html',       public.render_trial_email(v_notif_type, v_user_name, v_org.name, v_days_left, v_org.subscription_expires_at),
      'label',      'trial_' || v_notif_type,
      'queued_at',  NOW()::text
    ));

    INSERT INTO public.trial_notifications(organization_id, notification_type)
    VALUES (v_org.id, v_notif_type) ON CONFLICT DO NOTHING;

    v_emails_sent := v_emails_sent + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'expired_count',  v_expired_count,
    'emails_sent',    v_emails_sent,
    'processed_at',   NOW()::text
  );
END $$;

-- Only service_role may call the lifecycle function
REVOKE EXECUTE ON FUNCTION public.process_trial_lifecycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_trial_lifecycle() TO service_role;

-- ─── 7. pg_cron: run lifecycle daily at 00:05 UTC ────────────────
DO $$
BEGIN
  -- Remove existing schedule if present (idempotent re-deploy)
  BEGIN
    PERFORM cron.unschedule('routeace-trial-lifecycle');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'routeace-trial-lifecycle',
    '5 0 * * *',   -- 00:05 UTC every day
    'SELECT public.process_trial_lifecycle()'
  );
END $$;
