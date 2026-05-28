-- ============================================================
-- Tenant-Mode-Aware Trial Durations + Enterprise Trial Access
--
-- LC (LOGISTICS_COMPANY)   → 30-day trial, enterprise limits
-- LD (LOGISTICS_DEPARTMENT) → 60-day trial, enterprise limits
--
-- After expiry: process_trial_lifecycle() downgrades to free.
-- Re-applies cleanly on top of migration 000001.
-- ============================================================

-- ─── 1. Update auto_start_trial: enterprise tier, 30-day default ─
-- tenant_mode isn't known at org creation time (it's set later in
-- tenant_config). We default to 30 days; the tenant_config trigger
-- below adjusts to 60 days for LOGISTICS_DEPARTMENT.
CREATE OR REPLACE FUNCTION public.auto_start_trial()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.has_used_trial = true THEN RETURN NEW; END IF;
  IF NEW.subscription_status IN ('active', 'expired') THEN
    NEW.has_used_trial := true;
    RETURN NEW;
  END IF;

  NEW.subscription_tier       := 'enterprise';
  NEW.subscription_status     := 'trial';
  NEW.subscription_expires_at := NOW() + INTERVAL '30 days';
  NEW.has_used_trial          := true;
  RETURN NEW;
END $$;

-- ─── 2. Trigger: apply correct trial duration + enterprise limits
--        when tenant_config is first created for a trial org ───────
CREATE OR REPLACE FUNCTION public.apply_trial_on_tenant_config()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org_status  TEXT;
  v_org_created TIMESTAMPTZ;
BEGIN
  -- Only act on orgs currently in trial
  SELECT subscription_status, created_at
  INTO v_org_status, v_org_created
  FROM public.organizations
  WHERE id = NEW.organization_id;

  IF v_org_status IS DISTINCT FROM 'trial' THEN RETURN NEW; END IF;

  -- Enterprise-level limits: nothing is blocked during the trial
  NEW.plan_tier              := 'enterprise';
  NEW.max_users              := 9999;
  NEW.max_vehicles           := 9999;
  NEW.max_branches           := 999;
  NEW.max_monthly_dispatches := 99999;
  NEW.max_api_calls          := 99999;
  NEW.max_integrations       := 99;
  NEW.ai_credits_total       := 2000;

  -- Adjust trial expiry based on mode
  IF NEW.tenant_mode = 'LOGISTICS_DEPARTMENT' THEN
    UPDATE public.organizations
    SET subscription_expires_at = v_org_created + INTERVAL '60 days'
    WHERE id = NEW.organization_id;
  ELSE
    -- LOGISTICS_COMPANY (default): 30 days from org creation
    UPDATE public.organizations
    SET subscription_expires_at = v_org_created + INTERVAL '30 days'
    WHERE id = NEW.organization_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_apply_trial_on_tenant_config ON public.tenant_config;
CREATE TRIGGER trg_apply_trial_on_tenant_config
  BEFORE INSERT ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.apply_trial_on_tenant_config();

-- ─── 3. Trigger: re-adjust if user changes tenant_mode during
--        onboarding while still in trial ───────────────────────────
CREATE OR REPLACE FUNCTION public.reapply_trial_on_mode_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_org_status  TEXT;
  v_org_created TIMESTAMPTZ;
BEGIN
  IF NEW.tenant_mode IS NOT DISTINCT FROM OLD.tenant_mode THEN RETURN NEW; END IF;

  SELECT subscription_status, created_at
  INTO v_org_status, v_org_created
  FROM public.organizations
  WHERE id = NEW.organization_id;

  IF v_org_status IS DISTINCT FROM 'trial' THEN RETURN NEW; END IF;

  -- Re-apply enterprise limits (in case a previous update lowered them)
  NEW.plan_tier              := 'enterprise';
  NEW.max_users              := 9999;
  NEW.max_vehicles           := 9999;
  NEW.max_branches           := 999;
  NEW.max_monthly_dispatches := 99999;
  NEW.max_api_calls          := 99999;
  NEW.max_integrations       := 99;
  NEW.ai_credits_total       := 2000;

  IF NEW.tenant_mode = 'LOGISTICS_DEPARTMENT' THEN
    UPDATE public.organizations
    SET subscription_expires_at = v_org_created + INTERVAL '60 days'
    WHERE id = NEW.organization_id;
  ELSE
    UPDATE public.organizations
    SET subscription_expires_at = v_org_created + INTERVAL '30 days'
    WHERE id = NEW.organization_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_reapply_trial_on_mode_change ON public.tenant_config;
CREATE TRIGGER trg_reapply_trial_on_mode_change
  BEFORE UPDATE OF tenant_mode ON public.tenant_config
  FOR EACH ROW EXECUTE FUNCTION public.reapply_trial_on_mode_change();

-- ─── 4. Backfill: upgrade all current trial orgs to enterprise ────
-- Existing trial orgs got starter limits from migration 000001.
-- Give them enterprise access for the remainder of their trial.

-- 4a. Bump subscription_tier to enterprise on the org
UPDATE public.organizations
SET subscription_tier = 'enterprise'
WHERE subscription_status = 'trial'
  AND subscription_tier != 'enterprise';

-- 4b. Sync tenant_config to enterprise limits for all active trials
UPDATE public.tenant_config tc
SET
  plan_tier              = 'enterprise',
  max_users              = 9999,
  max_vehicles           = 9999,
  max_branches           = 999,
  max_monthly_dispatches = 99999,
  max_api_calls          = 99999,
  max_integrations       = 99,
  ai_credits_total       = 2000
FROM public.organizations o
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial';

-- 4c. Apply correct trial durations for existing trial orgs that
--     already have a tenant_config with tenant_mode set.
UPDATE public.organizations o
SET subscription_expires_at = o.created_at + INTERVAL '60 days'
FROM public.tenant_config tc
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND tc.tenant_mode = 'LOGISTICS_DEPARTMENT';

UPDATE public.organizations o
SET subscription_expires_at = o.created_at + INTERVAL '30 days'
FROM public.tenant_config tc
WHERE tc.organization_id = o.id
  AND o.subscription_status = 'trial'
  AND tc.tenant_mode = 'LOGISTICS_COMPANY';

-- ─── 5. Update email renderer: dynamic trial duration copy ────────
-- Replaces the hardcoded "7-day" copy with duration-aware language.
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
    WHEN 'welcome' THEN 'Your free trial has started — everything is unlocked'
    WHEN 'day_2'   THEN '2 days left on your RouteAce trial'
    WHEN 'day_1'   THEN 'Your trial expires tomorrow'
    WHEN 'day_0'   THEN 'Your trial expires tonight'
    WHEN 'expired' THEN 'Your free trial has ended'
    ELSE 'Your RouteAce trial update'
  END;

  v_body_text := CASE p_template
    WHEN 'welcome' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Welcome to <strong>RouteAce</strong>! Your free trial is live for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong>.<br><br>' ||
      'During your trial you have <strong>full enterprise-level access</strong> — no caps on vehicles, team members, dispatches, or any feature:<br>' ||
      '<ul style="margin:12px 0;padding-left:20px;color:#475569;">' ||
      '<li>Unlimited vehicles, drivers &amp; fleet management</li>' ||
      '<li>Unlimited dispatches, waybills &amp; POD</li>' ||
      '<li>Advanced route planning &amp; AI operations</li>' ||
      '<li>Full finance suite — invoices, payroll, expenses</li>' ||
      '<li>All integrations — WhatsApp, webhooks, customer portal</li>' ||
      '</ul>' ||
      'Your trial ends on <strong>' || v_expiry_str || '</strong>. After that, choose a plan to keep your data and operations running.'
    WHEN 'day_2' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your RouteAce trial for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong> ends in <strong>2 days</strong> (' || v_expiry_str || ').<br><br>' ||
      'Upgrade now to keep your operations running without interruption — all your vehicles, dispatches, customers, and history will be preserved.'
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
      'Your RouteAce free trial has ended.<br><br>' ||
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
