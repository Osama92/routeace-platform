-- Fix trial email CTA URL: /billing-engine (admin-only, broken on Netlify)
-- → /settings?tab=billing (accessible to all authenticated users)
--
-- Updates render_trial_email() which is defined in both
-- 20260528000001_trial_lifecycle.sql and 20260528000002_tenant_mode_trial_durations.sql.
-- The most-recently-created version wins at runtime, so patching it once here is sufficient.

CREATE OR REPLACE FUNCTION public.render_trial_email(
  p_template    TEXT,
  p_user_name   TEXT,
  p_org_name    TEXT,
  p_days_left   INT,
  p_expires_at  TIMESTAMPTZ
) RETURNS TEXT
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_expiry_str  TEXT;
  v_headline    TEXT;
  v_body        TEXT;
  v_cta_text    TEXT;
  v_cta_url     TEXT;
BEGIN
  v_expiry_str := TO_CHAR(p_expires_at AT TIME ZONE 'Africa/Lagos', 'Day, Month DD, YYYY');

  v_headline := CASE p_template
    WHEN 'welcome' THEN 'Your free trial has started — everything is unlocked'
    WHEN 'day_2'   THEN '2 days left on your RouteAce trial'
    WHEN 'day_1'   THEN 'Your trial expires tomorrow'
    WHEN 'day_0'   THEN 'Your trial expires tonight'
    WHEN 'expired' THEN 'Your free trial has ended'
    ELSE 'Your RouteAce trial update'
  END;

  v_body := CASE p_template
    WHEN 'welcome' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your RouteAce trial for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong> has started.<br><br>' ||
      'You have full access to:<br><ul>' ||
      '<li>Unlimited vehicles, dispatches, and fleet tracking</li>' ||
      '<li>AI-powered intelligence and route optimisation</li>' ||
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
      'Your RouteAce trial expires <strong>tonight</strong> (' || v_expiry_str || ').<br><br>' ||
      'Upgrade now to keep your team running without interruption.'
    WHEN 'expired' THEN
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'Your RouteAce trial for <strong>' || coalesce(p_org_name, 'your organisation') || '</strong> has ended.<br><br>' ||
      'Your data is safe and intact. Upgrade to restore full access instantly.'
    ELSE
      'Hi ' || coalesce(p_user_name, 'there') || ',<br><br>' ||
      'This is an update about your RouteAce trial.'
  END;

  v_cta_text := CASE p_template
    WHEN 'welcome' THEN 'Go to Dashboard'
    WHEN 'expired' THEN 'Restore Access Now'
    ELSE 'Upgrade Now'
  END;

  -- Fixed: was /billing-engine (admin-only route, 404 for regular users)
  -- Now points to Settings → Billing tab, accessible to all authenticated users
  v_cta_url := CASE p_template
    WHEN 'welcome' THEN 'https://routeace.app/'
    ELSE 'https://routeace.app/settings?tab=billing'
  END;

  RETURN
    '<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">' ||
    '<div style="background:#0f172a;padding:16px 24px;border-radius:8px 8px 0 0">' ||
    '<span style="color:#fff;font-weight:700;font-size:18px">RouteAce</span></div>' ||
    '<div style="border:1px solid #e2e8f0;border-top:none;padding:32px;border-radius:0 0 8px 8px">' ||
    '<h2 style="margin-top:0">' || v_headline || '</h2>' ||
    '<p>' || v_body || '</p>' ||
    '<a href="' || v_cta_url || '" style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;margin-top:16px">' ||
    v_cta_text || '</a>' ||
    '</div></body></html>';
END $$;
