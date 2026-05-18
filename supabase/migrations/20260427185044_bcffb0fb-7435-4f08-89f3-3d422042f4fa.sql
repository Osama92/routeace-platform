
-- =========================================================
-- AI PERFORMANCE COACH — recommendations on top of kpi_snapshots
-- =========================================================

CREATE TABLE IF NOT EXISTS public.kpi_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organization_id uuid,
  role_tag text NOT NULL,
  metric_key text NOT NULL REFERENCES public.kpi_definitions(metric_key) ON DELETE CASCADE,
  snapshot_id uuid REFERENCES public.kpi_snapshots(id) ON DELETE SET NULL,
  severity text NOT NULL CHECK (severity IN ('critical','moderate','strong')),
  performance_pct numeric NOT NULL DEFAULT 0,
  recommendation text NOT NULL,
  action_type text NOT NULL DEFAULT 'behavior',  -- behavior|process|tool|escalate
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','adopted','dismissed','improved','expired')),
  adopted_at timestamptz,
  dismissed_at timestamptz,
  outcome_pct numeric,                            -- snapshot pct after follow-up
  outcome_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_reco_user ON public.kpi_recommendations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_reco_org  ON public.kpi_recommendations(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_reco_status ON public.kpi_recommendations(status, created_at DESC);

ALTER TABLE public.kpi_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own recommendations"
  ON public.kpi_recommendations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Managers view all recommendations"
  ON public.kpi_recommendations FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin') OR is_super_admin(auth.uid())
    OR is_org_admin(auth.uid()) OR is_ops_manager(auth.uid())
    OR is_finance_manager(auth.uid())
  );

CREATE POLICY "Users update own reco status"
  ON public.kpi_recommendations FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_kpi_reco_updated
  BEFORE UPDATE ON public.kpi_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Recommendation generator ----------
CREATE OR REPLACE FUNCTION public.generate_recommendations(p_user_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := COALESCE(p_user_id, auth.uid());
  v_snap record;
  v_severity text;
  v_recos text[];
  v_count int := 0;
  v_org uuid;
  r text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT organization_id INTO v_org FROM public.organization_members
   WHERE user_id = v_user AND is_active = true LIMIT 1;

  -- Loop latest snapshot per metric for this user
  FOR v_snap IN
    SELECT DISTINCT ON (s.metric_key) s.*
    FROM public.kpi_snapshots s
    WHERE s.user_id = v_user
    ORDER BY s.metric_key, s.period_start DESC
  LOOP
    -- Classify
    IF v_snap.performance_pct >= 90 THEN v_severity := 'strong';
    ELSIF v_snap.performance_pct >= 70 THEN v_severity := 'moderate';
    ELSE v_severity := 'critical';
    END IF;

    -- Skip strong performers (no recommendations needed)
    IF v_severity = 'strong' THEN CONTINUE; END IF;

    -- Role+metric specific advice
    v_recos := ARRAY[]::text[];

    CASE v_snap.metric_key
      WHEN 'driver_on_time_delivery_rate' THEN
        v_recos := ARRAY[
          'Start scheduled trips 15 minutes earlier to absorb traffic delays.',
          'Reduce idle time at pickup — confirm load readiness before arriving.',
          'Follow the optimized route in the Driver App; avoid unplanned detours.'
        ];
      WHEN 'driver_trip_completion_rate' THEN
        v_recos := ARRAY[
          'Acknowledge new dispatches within 30 seconds of assignment.',
          'Flag blockers (vehicle/customer issues) immediately so Ops can re-route.'
        ];
      WHEN 'driver_deliveries_completed' THEN
        v_recos := ARRAY[
          'Aim for at least 2 additional deliveries per shift this week.',
          'Stack pickups in the same area to reduce dead miles.'
        ];
      WHEN 'driver_inspection_compliance' THEN
        v_recos := ARRAY[
          'Complete the pre-trip inspection before tapping "Start Trip".',
          'Submit post-trip photos within 5 minutes of delivery.'
        ];
      WHEN 'support_tickets_resolved' THEN
        v_recos := ARRAY[
          'Pick up unassigned tickets in your queue at the start of each shift.',
          'Use saved replies for top 5 recurring issues to cut handling time.'
        ];
      WHEN 'support_resolution_rate' THEN
        v_recos := ARRAY[
          'Escalate stuck tickets after 2 hours instead of holding them.',
          'Close the loop with the customer before marking a ticket resolved.'
        ];
      WHEN 'support_first_response_hours' THEN
        v_recos := ARRAY[
          'Respond within 2 minutes of new ticket creation, even if just to acknowledge.',
          'Enable desktop notifications so you do not miss new tickets.'
        ];
      WHEN 'ops_fleet_utilization' THEN
        v_recos := ARRAY[
          'Identify vehicles idle >24h and assign them in the next dispatch round.',
          'Rebalance drivers across active routes to free up under-used trucks.'
        ];
      WHEN 'ops_delivery_success_rate' THEN
        v_recos := ARRAY[
          'Review cancelled dispatches this week to find a root cause.',
          'Add a pre-dispatch confirmation call for high-value loads.'
        ];
      WHEN 'ops_sla_adherence' THEN
        v_recos := ARRAY[
          'Tighten dispatch cutoff times for far-zone deliveries.',
          'Auto-escalate dispatches at 80% of SLA window to a senior dispatcher.'
        ];
      WHEN 'fin_ar_collection_rate' THEN
        v_recos := ARRAY[
          'Send follow-up reminders on every invoice >7 days overdue today.',
          'Prioritize the top 5 debtors by outstanding balance for direct contact.'
        ];
      WHEN 'fin_outstanding_receivables' THEN
        v_recos := ARRAY[
          'Issue payment plans for receivables aged >30 days.',
          'Block new credit dispatches for customers above their credit limit.'
        ];
      WHEN 'fin_overdue_invoice_count' THEN
        v_recos := ARRAY[
          'Run the overdue-invoice batch and send reminder emails today.',
          'Schedule automatic 7/14/30-day reminders on all new invoices.'
        ];
      ELSE
        v_recos := ARRAY['Review your latest performance and identify the largest gap to target.'];
    END CASE;

    -- Cancel previous open recommendations for this metric so we don't pile up duplicates
    UPDATE public.kpi_recommendations
       SET status = 'expired', updated_at = now()
     WHERE user_id = v_user AND metric_key = v_snap.metric_key AND status = 'pending';

    -- Insert new ones
    FOREACH r IN ARRAY v_recos LOOP
      INSERT INTO public.kpi_recommendations(
        user_id, organization_id, role_tag, metric_key, snapshot_id,
        severity, performance_pct, recommendation, action_type
      ) VALUES (
        v_user, v_org, v_snap.role_tag, v_snap.metric_key, v_snap.id,
        v_severity, v_snap.performance_pct, r, 'behavior'
      );
      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('user_id', v_user, 'recommendations_created', v_count);
END $$;

-- ---------- Adopt / dismiss helpers ----------
CREATE OR REPLACE FUNCTION public.adopt_recommendation(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.kpi_recommendations
     SET status='adopted', adopted_at=now(), updated_at=now()
   WHERE id = p_id AND user_id = auth.uid();
END $$;

CREATE OR REPLACE FUNCTION public.dismiss_recommendation(p_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.kpi_recommendations
     SET status='dismissed', dismissed_at=now(), updated_at=now()
   WHERE id = p_id AND user_id = auth.uid();
END $$;

REVOKE EXECUTE ON FUNCTION public.generate_recommendations(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adopt_recommendation(uuid)    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dismiss_recommendation(uuid)  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_recommendations(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adopt_recommendation(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_recommendation(uuid)  TO authenticated;
