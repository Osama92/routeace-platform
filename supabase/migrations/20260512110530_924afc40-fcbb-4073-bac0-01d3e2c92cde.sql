-- ============================================================
-- Drop existing wide-open policies on these tables, then re-add scoped ones
-- ============================================================
DO $$
DECLARE t TEXT; pol RECORD;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'route_risk_register','sla_breach_alerts','ops_sops','email_templates',
    'trip_rate_config','diesel_rate_config','user_presence','role_permissions','tracking_tokens'
  ] LOOP
    FOR pol IN EXECUTE format('SELECT polname FROM pg_policy WHERE polrelid = %L::regclass', 'public.'||t) LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.polname, t);
    END LOOP;
  END LOOP;
END $$;

-- route_risk_register: reporter or super admin
CREATE POLICY "route_risk_register_owner" ON public.route_risk_register
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR reported_by = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR reported_by = auth.uid());

-- sla_breach_alerts: scope via parent dispatch organization
CREATE POLICY "sla_breach_alerts_via_dispatch" ON public.sla_breach_alerts
  FOR ALL TO authenticated
  USING (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = sla_breach_alerts.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  )
  WITH CHECK (
    is_super_admin(auth.uid()) OR EXISTS (
      SELECT 1 FROM public.dispatches d
      WHERE d.id = sla_breach_alerts.dispatch_id
        AND d.organization_id IS NOT NULL
        AND is_org_member(auth.uid(), d.organization_id)
    )
  );

-- ops_sops: creator or super admin
CREATE POLICY "ops_sops_owner_or_super" ON public.ops_sops
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()) OR created_by = auth.uid())
  WITH CHECK (is_super_admin(auth.uid()) OR created_by = auth.uid());

-- email_templates: super admin only
CREATE POLICY "email_templates_super_admin" ON public.email_templates
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- role_permissions: super admin only
CREATE POLICY "role_permissions_super_admin" ON public.role_permissions
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- diesel_rate_config: super admin only
CREATE POLICY "diesel_rate_config_super_admin" ON public.diesel_rate_config
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- trip_rate_config: super admin only (no org column)
CREATE POLICY "trip_rate_config_super_admin" ON public.trip_rate_config
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- user_presence: own presence (write & read) + super admin sees all
CREATE POLICY "user_presence_self_read" ON public.user_presence
  FOR SELECT TO authenticated
  USING (is_super_admin(auth.uid()) OR user_id = auth.uid());
CREATE POLICY "user_presence_self_write" ON public.user_presence
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_presence_self_update" ON public.user_presence
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- tracking_tokens: anonymous can read only by exact token (not enumerate); super admin all
CREATE POLICY "tracking_tokens_super_admin_all" ON public.tracking_tokens
  FOR ALL TO authenticated
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));
-- Note: public token-based lookup must now go through a SECURITY DEFINER RPC
-- (e.g. public.resolve_tracking_token(token text)) instead of direct table reads,
-- so anonymous users cannot enumerate the table.