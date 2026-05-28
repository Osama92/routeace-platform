-- ============================================================
-- Subscription Quota Enforcement
-- Closes leakage gaps: quota triggers, plan-sync trigger,
-- expiry enforcement, and backfill for existing orgs.
-- Safe to apply while Glyde Systems (enterprise) is live:
-- backfill runs first, triggers only block NEW inserts.
-- ============================================================

-- ─── 1. Canonical plan limits function ───────────────────────────
-- Single source of truth for all tiers. professional = growth alias.
CREATE OR REPLACE FUNCTION public.get_plan_limits(tier TEXT)
RETURNS TABLE (
  max_users              INT,
  max_vehicles           INT,
  max_branches           INT,
  max_monthly_dispatches INT,
  max_api_calls          INT,
  max_integrations       INT,
  ai_credits_total       INT
) LANGUAGE sql IMMUTABLE AS $$
  SELECT t.max_users, t.max_vehicles, t.max_branches, t.max_monthly_dispatches,
         t.max_api_calls, t.max_integrations, t.ai_credits_total
  FROM (VALUES
    ('free',         3,    3,    1,   10,    0,      0,    0),
    ('starter',      10,   20,   3,   500,   1000,   2,    0),
    ('growth',       50,   100,  10,  5000,  10000,  5,    500),
    ('professional', 50,   100,  10,  5000,  10000,  5,    500),
    ('enterprise',   9999, 9999, 999, 99999, 99999,  99,   2000)
  ) AS t(tier, max_users, max_vehicles, max_branches,
         max_monthly_dispatches, max_api_calls, max_integrations, ai_credits_total)
  WHERE t.tier = $1;
$$;

-- ─── 2. Backfill: sync all existing orgs' tenant_config ──────────
-- Runs BEFORE triggers are created so existing data is never blocked.
UPDATE public.tenant_config tc
SET
  plan_tier              = o.subscription_tier::TEXT,
  max_users              = l.max_users,
  max_vehicles           = l.max_vehicles,
  max_branches           = l.max_branches,
  max_monthly_dispatches = l.max_monthly_dispatches,
  max_api_calls          = l.max_api_calls,
  max_integrations       = l.max_integrations,
  ai_credits_total       = l.ai_credits_total
FROM public.organizations o
CROSS JOIN LATERAL public.get_plan_limits(o.subscription_tier::TEXT) l
WHERE tc.organization_id = o.id
  AND o.subscription_tier IS NOT NULL
  AND tc.plan_tier IS DISTINCT FROM o.subscription_tier::TEXT;

-- ─── 3. Auto-sync tenant_config when subscription_tier changes ───
CREATE OR REPLACE FUNCTION public.sync_tenant_config_on_plan_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  limits RECORD;
BEGIN
  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    SELECT * INTO limits FROM public.get_plan_limits(NEW.subscription_tier::TEXT);
    IF FOUND THEN
      UPDATE public.tenant_config SET
        plan_tier              = NEW.subscription_tier::TEXT,
        max_users              = limits.max_users,
        max_vehicles           = limits.max_vehicles,
        max_branches           = limits.max_branches,
        max_monthly_dispatches = limits.max_monthly_dispatches,
        max_api_calls          = limits.max_api_calls,
        max_integrations       = limits.max_integrations,
        ai_credits_total       = limits.ai_credits_total
      WHERE organization_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_tenant_config_on_plan_change ON public.organizations;
CREATE TRIGGER trg_sync_tenant_config_on_plan_change
  AFTER UPDATE OF subscription_tier ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.sync_tenant_config_on_plan_change();

-- ─── 4. Vehicle quota enforcement ────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_vehicle_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_max   INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.vehicles
  WHERE organization_id = NEW.organization_id;

  SELECT GREATEST(COALESCE(tc.max_vehicles, 9999), COALESCE(tc.vehicle_quota, 0))
  INTO v_max
  FROM public.tenant_config tc
  WHERE tc.organization_id = NEW.organization_id;

  IF v_max IS NOT NULL AND v_max > 0 AND v_count >= v_max THEN
    RAISE EXCEPTION 'Vehicle quota exceeded (% of % used). Upgrade your plan.', v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_vehicle_quota ON public.vehicles;
CREATE TRIGGER trg_check_vehicle_quota
  BEFORE INSERT ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.check_vehicle_quota();

-- ─── 5. User (org member) quota enforcement ───────────────────────
CREATE OR REPLACE FUNCTION public.check_user_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_max   INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.organization_members
  WHERE organization_id = NEW.organization_id
    AND is_active = true;

  SELECT max_users INTO v_max
  FROM public.tenant_config
  WHERE organization_id = NEW.organization_id;

  IF v_max IS NOT NULL AND v_max > 0 AND v_count >= v_max THEN
    RAISE EXCEPTION 'User quota exceeded (% of % used). Upgrade your plan.', v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_user_quota ON public.organization_members;
CREATE TRIGGER trg_check_user_quota
  BEFORE INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.check_user_quota();

-- ─── 6. Monthly dispatch quota enforcement ────────────────────────
CREATE OR REPLACE FUNCTION public.check_dispatch_quota()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
  v_max   INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.dispatches
  WHERE organization_id = NEW.organization_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

  SELECT max_monthly_dispatches INTO v_max
  FROM public.tenant_config
  WHERE organization_id = NEW.organization_id;

  IF v_max IS NOT NULL AND v_max > 0 AND v_count >= v_max THEN
    RAISE EXCEPTION 'Monthly dispatch quota exceeded (% of % used). Upgrade your plan.', v_count, v_max
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_dispatch_quota ON public.dispatches;
CREATE TRIGGER trg_check_dispatch_quota
  BEFORE INSERT ON public.dispatches
  FOR EACH ROW EXECUTE FUNCTION public.check_dispatch_quota();

-- ─── 7. AI credit balance enforcement ────────────────────────────
CREATE OR REPLACE FUNCTION public.check_ai_credit_balance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_used    INT;
  v_total   INT;
  v_org_id  UUID;
BEGIN
  SELECT om.organization_id INTO v_org_id
  FROM public.organization_members om
  WHERE om.user_id = NEW.user_id AND om.is_active = true
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT ai_credits_used, ai_credits_total INTO v_used, v_total
  FROM public.tenant_config
  WHERE organization_id = v_org_id;

  IF v_total IS NOT NULL AND v_total > 0
     AND (COALESCE(v_used, 0) + NEW.credits_consumed) > v_total THEN
    RAISE EXCEPTION 'AI credit limit reached (% of % available). Upgrade your plan.', v_used, v_total
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_check_ai_credit_balance ON public.ai_credit_transactions;
CREATE TRIGGER trg_check_ai_credit_balance
  BEFORE INSERT ON public.ai_credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_ai_credit_balance();

-- ─── 8. Subscription expiry helper ───────────────────────────────
CREATE OR REPLACE FUNCTION public.org_subscription_active(org_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT (subscription_status IN ('active', 'trial'))
     AND (subscription_expires_at IS NULL OR subscription_expires_at > NOW())
  FROM public.organizations WHERE id = org_id;
$$;

-- ─── 9. Expiry enforcement: block dispatch INSERTs on expired subs ─
-- Drop if exists to allow clean re-apply
DROP POLICY IF EXISTS "block_dispatches_on_expired_subscription" ON public.dispatches;
CREATE POLICY "block_dispatches_on_expired_subscription"
  ON public.dispatches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.org_subscription_active(organization_id) = true);
