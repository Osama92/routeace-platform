-- ============================================================
-- AUDIT QUERY C — policy bodies for the 30 ungated org-bearing tables
-- Run ON ITS OWN. Read-only.
--
-- Query A showed these tables have organization_id but no
-- tenant_isolation_gate. That does NOT automatically mean they are
-- exposed — several may carry their own hand-written tenant policy.
--
-- This prints the actual USING clause of every SELECT-capable policy
-- so we can tell, per table, whether a tenant predicate exists.
--
-- READ THE 'verdict' COLUMN:
--   SCOPED       - policy references organization_id / get_user_organization
--   USER-SCOPED  - policy restricts by auth.uid() (fine for per-user tables)
--   NO TENANT PREDICATE  <-- exposed: any user passing the role check sees all orgs
-- ============================================================

SELECT
  p.tablename,
  p.policyname,
  p.cmd,
  CASE
    WHEN COALESCE(p.qual,'') ILIKE '%get_user_organization%'
      OR COALESCE(p.qual,'') ILIKE '%organization_id%'      THEN 'SCOPED'
    WHEN COALESCE(p.qual,'') ILIKE '%auth.uid()%'
      AND COALESCE(p.qual,'') NOT ILIKE '%has_role%'        THEN 'USER-SCOPED'
    WHEN COALESCE(p.qual,'') IN ('true','')                 THEN 'NO TENANT PREDICATE (open)'
    ELSE 'NO TENANT PREDICATE'
  END AS verdict,
  p.permissive,
  p.qual AS using_clause
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.tablename IN (
    'audit_logs','cash_balance_daily','cash_flow_projections','cashflow_forecasts',
    'cfo_brief_log_access_audit','client_notification_log','collections_reminders',
    'company_bank_details','dispatch_financials','driver_job_notifications',
    'driver_sensitive_details','email_activity_log','email_notifications',
    'email_template_configs','erp_connections','erp_sync_log','integrations',
    'investor_assessments','loan_lenders','loans','org_pricing_settings',
    'partner_sensitive_details','platform_errors','push_subscriptions','routes',
    'sla_risk_notifications','staff_sensitive_details','trial_notifications',
    'vendor_performance_snapshots','zaza_conversations'
  )
  AND p.cmd IN ('ALL','SELECT')
ORDER BY
  CASE
    WHEN COALESCE(p.qual,'') ILIKE '%get_user_organization%'
      OR COALESCE(p.qual,'') ILIKE '%organization_id%' THEN 2
    WHEN COALESCE(p.qual,'') ILIKE '%auth.uid()%'
      AND COALESCE(p.qual,'') NOT ILIKE '%has_role%'   THEN 3
    ELSE 1
  END,
  p.tablename, p.policyname;
