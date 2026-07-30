-- ============================================================
-- Trial Expiry → Auto-revert to Free/Starter (no hard lockout)
-- ============================================================
-- Previously an expired trial set subscription_status = 'expired',
-- which the frontend used to hard-lock the account behind a
-- "Choose a Plan" screen. Product decision: instead soft-revert
-- the org to the free Starter plan so the user keeps working with
-- free-tier limits and an upgrade CTA, never a lockout.
--
-- This migration:
--   1. Rewrites process_trial_lifecycle() to set status = 'free'
--      (was 'expired') on trial expiry, keeping the tenant_config
--      downgrade to free-tier limits that already existed.
--   2. Backfills any currently-'expired' orgs to 'free' so existing
--      locked-out accounts are released to the free tier.
-- ============================================================

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
  -- ── 6a. Revert overdue trials to FREE (was 'expired') ──────────
  UPDATE public.organizations
  SET subscription_status = 'free',
      subscription_tier   = 'starter'
  WHERE subscription_status = 'trial'
    AND subscription_expires_at < NOW();
  GET DIAGNOSTICS v_expired_count = ROW_COUNT;

  -- Downgrade tenant_config for newly-reverted orgs to free-tier limits
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
    AND o.subscription_status = 'free'
    AND o.subscription_expires_at < NOW()
    AND tc.plan_tier <> 'free';

  -- ── 6b. Trial-ended notification for orgs reverted in last 25h ─
  FOR v_org IN
    SELECT o.id, o.name, o.subscription_expires_at
    FROM public.organizations o
    WHERE o.subscription_status = 'free'
      AND o.subscription_expires_at >= NOW() - INTERVAL '25 hours'
      AND o.subscription_expires_at < NOW()
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
      'subject',    'Your RouteAce trial has ended — you are now on the Free plan',
      'html',       public.render_trial_email('expired', v_user_name, v_org.name, 0, v_org.subscription_expires_at),
      'label',      'trial_expired',
      'queued_at',  NOW()::text
    ));

    INSERT INTO public.trial_notifications(organization_id, notification_type)
    VALUES (v_org.id, 'expired') ON CONFLICT DO NOTHING;

    v_emails_sent := v_emails_sent + 1;
  END LOOP;

  -- ── 6c. Urgency emails for active trials (unchanged) ───────────
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

    CONTINUE WHEN EXISTS (
      SELECT 1 FROM public.trial_notifications
      WHERE organization_id = v_org.id AND notification_type = v_notif_type
    );

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
    'reverted_to_free', v_expired_count,
    'emails_sent',      v_emails_sent,
    'processed_at',     NOW()::text
  );
END $$;

REVOKE EXECUTE ON FUNCTION public.process_trial_lifecycle() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_trial_lifecycle() TO service_role;

-- ── One-off goodwill: grant currently-expired/reverted orgs a fresh
--    30-day trial instead of leaving them on free. This releases every
--    locked-out account and gives them another full month of access.
--    Applies to orgs currently 'expired' OR trials already past expiry.
UPDATE public.organizations
SET subscription_status     = 'trial',
    subscription_tier       = 'starter',
    subscription_expires_at = NOW() + INTERVAL '30 days'
WHERE subscription_status = 'expired'
   OR (subscription_status = 'trial' AND subscription_expires_at < NOW());

-- Restore trial-tier (non-free) limits for those orgs so the extra 30 days
-- is a real working trial, not a crippled free tier. Trial mirrors 'starter'
-- plan caps; adjust here if your starter caps differ.
UPDATE public.tenant_config tc
SET
  plan_tier              = 'starter',
  max_users              = 10,
  max_vehicles           = 25,
  max_branches           = 3,
  max_monthly_dispatches = 500,
  max_api_calls          = 0,
  max_integrations       = 2,
  ai_credits_total       = 100
FROM public.organizations o
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND o.subscription_expires_at > NOW()
  AND tc.plan_tier = 'free';

-- Allow the goodwill-extended orgs to receive trial urgency + expired
-- emails again for this new cycle by clearing prior notification rows.
DELETE FROM public.trial_notifications tn
USING public.organizations o
WHERE tn.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND o.subscription_expires_at > NOW()
  AND tn.notification_type IN ('day_2', 'day_1', 'day_0', 'expired');
