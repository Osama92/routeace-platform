-- ─────────────────────────────────────────────────────────────────────────────
-- Fix cross-tenant data leakage in notification tables
--
-- Root cause: email_notifications, email_activity_log, sla_risk_notifications,
-- and sla_breach_records were created before the multi-tenant org-isolation
-- hardening pass. Their RLS SELECT policies check role only (has_any_role /
-- role IN (...)) with no organization_id guard, so any authenticated user who
-- has *any* role in *any* org can read every row across all tenants.
--
-- This migration:
--   1. Adds organization_id to email_notifications + backfills from dispatches
--   2. Replaces all leaking RLS policies with org-scoped equivalents
--   3. Fixes email_activity_log SELECT policy
--   4. Fixes sla_risk_notifications
--   5. Fixes sla_breach_records (denormalises org_id from dispatch)
--   6. Fixes vendor_performance_snapshots
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. email_notifications — add org column + backfill ───────────────────────

ALTER TABLE public.email_notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill from the linked dispatch where dispatch_id is set
UPDATE public.email_notifications en
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE en.dispatch_id = d.id
  AND en.organization_id IS NULL;

-- For approval / invoice notification rows (dispatch_id IS NULL), backfill from
-- the user who sent them via organization_members.
UPDATE public.email_notifications en
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE en.dispatch_id IS NULL
  AND en.organization_id IS NULL
  AND en.sent_by IS NOT NULL
  AND om.user_id = en.sent_by
  AND om.is_active = true;

-- Index for the org-scoped queries that will follow
CREATE INDEX IF NOT EXISTS idx_email_notifications_org_id
  ON public.email_notifications (organization_id);

-- Drop the old leaking policies
DROP POLICY IF EXISTS "Staff can view email notifications"  ON public.email_notifications;
DROP POLICY IF EXISTS "Staff can insert email notifications" ON public.email_notifications;
DROP POLICY IF EXISTS "Admins can manage email notifications" ON public.email_notifications;

-- SELECT: super_admin sees all; org members see only their org
CREATE POLICY "Org members can view own email notifications"
  ON public.email_notifications
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = email_notifications.organization_id
          AND om.is_active = true
      )
    )
  );

-- INSERT: the row's org must match the caller's org (or super_admin)
CREATE POLICY "Org members can insert own email notifications"
  ON public.email_notifications
  FOR INSERT
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = email_notifications.organization_id
          AND om.is_active = true
      )
    )
  );

-- UPDATE / DELETE: admin/support within the same org only
CREATE POLICY "Org admins can update own email notifications"
  ON public.email_notifications
  FOR UPDATE
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = email_notifications.organization_id
          AND om.is_active = true
          AND om.role IN ('admin', 'org_admin', 'super_admin', 'support')
      )
    )
  );

-- ── 2. email_activity_log — fix role-only SELECT policy ─────────────────────

-- The table already has dispatch_id / invoice_id FKs; add org_id for direct lookup
ALTER TABLE public.email_activity_log
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill from dispatch
UPDATE public.email_activity_log eal
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE eal.dispatch_id = d.id
  AND eal.organization_id IS NULL;

-- Backfill from invoice
UPDATE public.email_activity_log eal
SET organization_id = i.organization_id
FROM public.invoices i
WHERE eal.invoice_id = i.id
  AND eal.organization_id IS NULL;

DROP POLICY IF EXISTS "Admins can view email logs"        ON public.email_activity_log;
DROP POLICY IF EXISTS "System can insert email logs"      ON public.email_activity_log;
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_activity_log;

CREATE POLICY "Org admins can view own email logs"
  ON public.email_activity_log
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = email_activity_log.organization_id
          AND om.is_active = true
          AND om.role IN ('admin', 'org_admin', 'super_admin', 'finance_manager', 'support')
      )
    )
  );

-- INSERT: restrict to authenticated users (edge functions run as service_role and bypass RLS)
CREATE POLICY "Authenticated users can insert email logs"
  ON public.email_activity_log
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- ── 3. sla_risk_notifications — add org column + fix policies ────────────────

ALTER TABLE public.sla_risk_notifications
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill from dispatch
UPDATE public.sla_risk_notifications srn
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE srn.dispatch_id = d.id
  AND srn.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sla_risk_notifications_org_id
  ON public.sla_risk_notifications (organization_id);

DROP POLICY IF EXISTS "Admins can manage risk notifications" ON public.sla_risk_notifications;

CREATE POLICY "Org members can view own sla risk notifications"
  ON public.sla_risk_notifications
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = sla_risk_notifications.organization_id
          AND om.is_active = true
      )
    )
  );

CREATE POLICY "Org admins can manage own sla risk notifications"
  ON public.sla_risk_notifications
  FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = sla_risk_notifications.organization_id
          AND om.is_active = true
          AND om.role IN ('admin', 'org_admin', 'super_admin', 'ops_manager')
      )
    )
  );

-- ── 4. sla_breach_records — add org column + fix policies ────────────────────

ALTER TABLE public.sla_breach_records
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill from linked dispatch
UPDATE public.sla_breach_records sbr
SET organization_id = d.organization_id
FROM public.dispatches d
WHERE sbr.dispatch_id = d.id
  AND sbr.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sla_breach_records_org_id
  ON public.sla_breach_records (organization_id);

DROP POLICY IF EXISTS "Admins can manage SLA breach records" ON public.sla_breach_records;
DROP POLICY IF EXISTS "Admins can view SLA breach records"   ON public.sla_breach_records;

CREATE POLICY "Org members can view own sla breach records"
  ON public.sla_breach_records
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = sla_breach_records.organization_id
          AND om.is_active = true
      )
    )
  );

CREATE POLICY "Org admins can manage own sla breach records"
  ON public.sla_breach_records
  FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = sla_breach_records.organization_id
          AND om.is_active = true
          AND om.role IN ('admin', 'org_admin', 'super_admin', 'ops_manager', 'finance_manager')
      )
    )
  );

-- ── 5. vendor_performance_snapshots — fix role-only policies ─────────────────
-- vendor_id references public.partners which has no organization_id column,
-- so we cannot backfill via a JOIN. New rows will carry organization_id going
-- forward; existing rows remain NULL and are visible to super_admin only until
-- they age out naturally.

ALTER TABLE public.vendor_performance_snapshots
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Admins can view snapshots"   ON public.vendor_performance_snapshots;
DROP POLICY IF EXISTS "Admins can manage snapshots" ON public.vendor_performance_snapshots;

CREATE POLICY "Org members can view own vendor snapshots"
  ON public.vendor_performance_snapshots
  FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = vendor_performance_snapshots.organization_id
          AND om.is_active = true
      )
    )
  );

CREATE POLICY "Org admins can manage own vendor snapshots"
  ON public.vendor_performance_snapshots
  FOR ALL
  USING (
    public.is_super_admin(auth.uid())
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = vendor_performance_snapshots.organization_id
          AND om.is_active = true
          AND om.role IN ('admin', 'org_admin', 'super_admin', 'finance_manager', 'operations')
      )
    )
  );
