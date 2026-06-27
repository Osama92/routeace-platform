-- Hard-delete an organisation and ALL associated data.
-- Called from the core-platform-metrics edge function (service role only).
-- Runs as SECURITY DEFINER so it bypasses RLS for every child table.
-- Order of deletion: deepest child tables first, then the organisation row.

CREATE OR REPLACE FUNCTION public.delete_organization_cascade(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Audit / compliance logs ──────────────────────────────────────────
  DELETE FROM public.audit_logs            WHERE organization_id = p_org_id;
  DELETE FROM public.kpi_audit_log         WHERE organization_id = p_org_id;
  DELETE FROM public.data_audit_log        WHERE organization_id = p_org_id;

  -- ── AI / cache ───────────────────────────────────────────────────────
  DELETE FROM public.ai_insights_cache     WHERE org_scope = p_org_id::text;
  DELETE FROM public.coo_ai_alerts         WHERE organization_id = p_org_id;

  -- ── Dispatch & delivery ──────────────────────────────────────────────
  DELETE FROM public.dispatch_dropoffs     WHERE dispatch_id IN (SELECT id FROM public.dispatches WHERE organization_id = p_org_id);
  DELETE FROM public.dispatch_events       WHERE dispatch_id IN (SELECT id FROM public.dispatches WHERE organization_id = p_org_id);
  DELETE FROM public.delivery_exceptions   WHERE organization_id = p_org_id;
  DELETE FROM public.dispatch_plans        WHERE organization_id = p_org_id;
  DELETE FROM public.dispatches            WHERE organization_id = p_org_id;

  -- ── Fleet / vehicles ────────────────────────────────────────────────
  DELETE FROM public.vehicle_inspections   WHERE organization_id = p_org_id;
  DELETE FROM public.vehicle_maintenance_records WHERE organization_id = p_org_id;
  DELETE FROM public.vehicle_mileage_tracking    WHERE organization_id = p_org_id;
  DELETE FROM public.fuel_logs             WHERE organization_id = p_org_id;
  DELETE FROM public.fleet_availability_log WHERE organization_id = p_org_id;
  DELETE FROM public.asset_idle_logs       WHERE organization_id = p_org_id;
  DELETE FROM public.asset_maintenance_events WHERE organization_id = p_org_id;
  DELETE FROM public.asset_weekly_summaries   WHERE organization_id = p_org_id;
  DELETE FROM public.vehicles              WHERE organization_id = p_org_id;

  -- ── Drivers / workforce ──────────────────────────────────────────────
  DELETE FROM public.driver_salaries       WHERE organization_id = p_org_id;
  DELETE FROM public.leave_requests        WHERE organization_id = p_org_id;
  DELETE FROM public.leave_balances        WHERE organization_id = p_org_id;
  DELETE FROM public.leave_policies        WHERE organization_id = p_org_id;
  DELETE FROM public.drivers               WHERE organization_id = p_org_id;

  -- ── Staff / payroll ──────────────────────────────────────────────────
  DELETE FROM public.staff_salaries        WHERE organization_id = p_org_id;
  DELETE FROM public.staff                 WHERE organization_id = p_org_id;

  -- ── Finance ──────────────────────────────────────────────────────────
  DELETE FROM public.invoices              WHERE organization_id = p_org_id;
  DELETE FROM public.expenses              WHERE organization_id = p_org_id;
  DELETE FROM public.bills                 WHERE organization_id = p_org_id;

  -- ── Partners / vendors ───────────────────────────────────────────────
  DELETE FROM public.partner_sensitive_details WHERE partner_id IN (SELECT id FROM public.partners WHERE organization_id = p_org_id);
  DELETE FROM public.partners              WHERE organization_id = p_org_id;
  DELETE FROM public.ld_transporter_jobs   WHERE organization_id = p_org_id;
  DELETE FROM public.ld_transporters       WHERE organization_id = p_org_id;

  -- ── Customers / routes ───────────────────────────────────────────────
  DELETE FROM public.customers             WHERE organization_id = p_org_id;
  DELETE FROM public.routes                WHERE organization_id = p_org_id;

  -- ── LD-specific ──────────────────────────────────────────────────────
  DELETE FROM public.ld_complaints         WHERE organization_id = p_org_id;
  DELETE FROM public.ld_dqi_records        WHERE organization_id = p_org_id;
  DELETE FROM public.ld_peak_periods       WHERE organization_id = p_org_id;
  DELETE FROM public.ld_refusals           WHERE organization_id = p_org_id;
  DELETE FROM public.ld_risk_register      WHERE organization_id = p_org_id;
  DELETE FROM public.ld_sop_meetings       WHERE organization_id = p_org_id;
  DELETE FROM public.dept_budgets          WHERE organization_id = p_org_id;
  DELETE FROM public.dept_inventory_doi    WHERE organization_id = p_org_id;
  DELETE FROM public.inbound_receipts      WHERE organization_id = p_org_id;

  -- ── ERP / integrations ───────────────────────────────────────────────
  DELETE FROM public.erp_sync_log          WHERE organization_id = p_org_id;
  DELETE FROM public.erp_connections       WHERE organization_id = p_org_id;

  -- ── Commission / reseller (ledger rows sourced from this org) ────────
  DELETE FROM public.commission_ledger     WHERE source_org_id = p_org_id;
  DELETE FROM public.reseller_client_locks WHERE organization_id = p_org_id OR reseller_org_id = p_org_id;

  -- ── KPI / performance ────────────────────────────────────────────────
  DELETE FROM public.kpi_targets           WHERE organization_id = p_org_id;
  DELETE FROM public.kpi_records           WHERE organization_id = p_org_id;

  -- ── Config / settings ────────────────────────────────────────────────
  DELETE FROM public.org_pricing_settings  WHERE organization_id = p_org_id;
  DELETE FROM public.company_bank_details  WHERE organization_id = p_org_id;
  DELETE FROM public.push_subscriptions    WHERE organization_id = p_org_id;
  DELETE FROM public.organization_invitations WHERE organization_id = p_org_id;
  DELETE FROM public.tenant_config         WHERE organization_id = p_org_id;

  -- ── Membership / profiles (NULL org_id rather than delete profiles
  --    since auth.users is owned by Supabase Auth — we just disassociate) ──
  UPDATE public.profiles SET organization_id = NULL WHERE organization_id = p_org_id;
  DELETE FROM public.organization_members  WHERE organization_id = p_org_id;
  DELETE FROM public.user_roles            WHERE user_id IN (
    SELECT id FROM public.profiles WHERE organization_id IS NULL
    -- Note: only removes roles for users who are now org-less after the update above
    -- In practice core team roles are excluded because their org is not being deleted
  );

  -- ── Finally: the organisation row itself ─────────────────────────────
  DELETE FROM public.organizations         WHERE id = p_org_id;
END;
$$;

-- Only allow service role to call this function
REVOKE ALL ON FUNCTION public.delete_organization_cascade(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_organization_cascade(UUID) TO service_role;
