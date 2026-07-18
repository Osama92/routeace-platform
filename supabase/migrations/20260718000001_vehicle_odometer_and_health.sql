-- ─────────────────────────────────────────────────────────────────────────────
-- Vehicle Odometer + Health Score automation
-- 1. Odometer accumulation from delivered dispatches
-- 2. Health score recalculation from inspections + fuel efficiency
-- All queries are org-scoped to prevent cross-tenant data leakage
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Add initial_odometer column to vehicles ────────────────────────────────
-- Captures the vehicle's real-world KM reading at the time it was added to the
-- platform. All dispatch-accumulated KMs are added on top of this baseline.
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS initial_odometer NUMERIC DEFAULT 0;

-- ── 2. Ensure lifetime_km, weekly_km, monthly_km exist with correct defaults ──
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS lifetime_km    NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS weekly_km      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_km     NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_odometer NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_service_km  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health_score     INTEGER DEFAULT 100;

-- ── 3. Function: recalculate_vehicle_health ───────────────────────────────────
-- Called after each inspection save or fuel log save.
-- Weights: documents 30 | inspections 35 | fuel efficiency 20 | uptime 15
-- Returns new health_score and writes it to vehicles.health_score.
-- org_id parameter ensures no cross-tenant reads.
CREATE OR REPLACE FUNCTION public.recalculate_vehicle_health(p_vehicle_id UUID, p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status        TEXT;
  v_org_check     UUID;

  v_doc_score     NUMERIC := 100;
  v_insp_score    NUMERIC := 100;
  v_fuel_score    NUMERIC := 100;
  v_uptime_score  NUMERIC := 100;
  v_overall       INTEGER;
  v_days_left     NUMERIC;
  v_avg_insp      NUMERIC;
  v_failed_recent INTEGER;
  v_avg_kmpl      NUMERIC;
  v_expected_kmpl NUMERIC := 3.0;
  v_doc           RECORD;
BEGIN
  -- Verify vehicle belongs to this org (cross-tenant guard)
  SELECT organization_id, status
  INTO v_org_check, v_status
  FROM public.vehicles
  WHERE id = p_vehicle_id AND organization_id = p_org_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- ── Document validity score (30% weight) ──────────────────────────────────
  -- Documents live in vehicle_documents (document_type + expiry_date).
  -- We track 4 key types; each missing or expired costs -25, expiring <30d costs -10.
  v_doc_score := 100;

  FOR v_doc IN
    SELECT document_type, expiry_date
    FROM public.vehicle_documents
    WHERE vehicle_id = p_vehicle_id
      AND document_type IN ('insurance', 'registration', 'roadworthiness', 'inspection')
  LOOP
    IF v_doc.expiry_date IS NULL THEN
      v_doc_score := v_doc_score - 25;
    ELSE
      v_days_left := EXTRACT(EPOCH FROM (v_doc.expiry_date::TIMESTAMPTZ - NOW())) / 86400;
      IF    v_days_left < 0  THEN v_doc_score := v_doc_score - 25;
      ELSIF v_days_left < 30 THEN v_doc_score := v_doc_score - 10;
      END IF;
    END IF;
  END LOOP;

  -- Penalise for each of the 4 tracked doc types that is entirely absent
  v_doc_score := v_doc_score - (
    (4 - (
      SELECT COUNT(DISTINCT document_type)
      FROM public.vehicle_documents
      WHERE vehicle_id = p_vehicle_id
        AND document_type IN ('insurance', 'registration', 'roadworthiness', 'inspection')
    )) * 25
  );

  v_doc_score := GREATEST(0, v_doc_score);

  -- ── Inspection score (35% weight) ─────────────────────────────────────────
  SELECT AVG(overall_score)
  INTO v_avg_insp
  FROM (
    SELECT overall_score
    FROM public.vehicle_inspections
    WHERE vehicle_id = p_vehicle_id
      AND status IN ('passed', 'attention_needed', 'failed')
    ORDER BY completed_at DESC NULLS LAST, created_at DESC
    LIMIT 5
  ) sub;

  IF v_avg_insp IS NOT NULL THEN
    v_insp_score := v_avg_insp;
  END IF;

  -- Hard penalty for recent failures (-15 per failed inspection in last 30 days)
  SELECT COUNT(*) INTO v_failed_recent
  FROM public.vehicle_inspections
  WHERE vehicle_id = p_vehicle_id
    AND status = 'failed'
    AND created_at >= NOW() - INTERVAL '30 days';

  v_insp_score := GREATEST(0, v_insp_score - (v_failed_recent * 15));

  -- ── Fuel efficiency score (20% weight) ────────────────────────────────────
  SELECT AVG(km_per_litre)
  INTO v_avg_kmpl
  FROM (
    SELECT km_per_litre
    FROM public.fuel_logs
    WHERE vehicle_id = p_vehicle_id
      AND organization_id = p_org_id
      AND km_per_litre IS NOT NULL
      AND km_per_litre > 0
    ORDER BY log_date DESC, created_at DESC
    LIMIT 10
  ) sub;

  IF v_avg_kmpl IS NOT NULL THEN
    v_fuel_score := LEAST(100, GREATEST(0, (v_avg_kmpl / v_expected_kmpl) * 100));
  END IF;

  -- ── Uptime / status score (15% weight) ────────────────────────────────────
  v_uptime_score := CASE v_status
    WHEN 'available'   THEN 100
    WHEN 'in_use'      THEN 95
    WHEN 'maintenance' THEN 40
    WHEN 'retired'     THEN 0
    ELSE 70
  END;

  -- ── Weighted overall ──────────────────────────────────────────────────────
  v_overall := ROUND(
    (v_doc_score   * 0.30) +
    (v_insp_score  * 0.35) +
    (v_fuel_score  * 0.20) +
    (v_uptime_score * 0.15)
  );
  v_overall := GREATEST(0, LEAST(100, v_overall));

  -- Write back to vehicles table
  UPDATE public.vehicles
  SET health_score = v_overall
  WHERE id = p_vehicle_id AND organization_id = p_org_id;

  RETURN v_overall;
END;
$$;

-- ── 4. Trigger function: update odometer + health after dispatch delivered ────
CREATE OR REPLACE FUNCTION public.trg_fn_dispatch_delivered_km()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_km             NUMERIC;
  v_org_id         UUID;
  v_current_odo    NUMERIC;
BEGIN
  -- Only fire when status transitions TO 'delivered'
  IF NOT (NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered') THEN
    RETURN NEW;
  END IF;

  -- Use total_distance_km if set, fall back to distance_km
  v_km := COALESCE(NEW.total_distance_km, NEW.distance_km, 0);
  IF v_km <= 0 THEN
    RETURN NEW;
  END IF;

  -- The dispatch carries organization_id — use it directly (org-scoped)
  v_org_id := NEW.organization_id;

  -- Verify the vehicle belongs to the same org (prevents cross-tenant leakage)
  -- and grab current odometer as a scalar
  SELECT current_odometer INTO v_current_odo
  FROM public.vehicles
  WHERE id = NEW.vehicle_id AND organization_id = v_org_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Accumulate KM onto vehicle
  UPDATE public.vehicles
  SET
    current_odometer = COALESCE(current_odometer, 0) + v_km,
    lifetime_km      = COALESCE(lifetime_km, 0) + v_km,
    -- weekly_km: sum of dispatches completed in the current ISO week
    weekly_km = (
      SELECT COALESCE(SUM(COALESCE(d2.total_distance_km, d2.distance_km, 0)), 0)
      FROM public.dispatches d2
      WHERE d2.vehicle_id = NEW.vehicle_id
        AND d2.organization_id = v_org_id
        AND d2.status = 'delivered'
        AND d2.updated_at >= date_trunc('week', NOW())
    ) + v_km,
    -- monthly_km: sum of dispatches completed in the current calendar month
    monthly_km = (
      SELECT COALESCE(SUM(COALESCE(d3.total_distance_km, d3.distance_km, 0)), 0)
      FROM public.dispatches d3
      WHERE d3.vehicle_id = NEW.vehicle_id
        AND d3.organization_id = v_org_id
        AND d3.status = 'delivered'
        AND d3.updated_at >= date_trunc('month', NOW())
    ) + v_km
  WHERE id = NEW.vehicle_id AND organization_id = v_org_id;

  -- Insert into vehicle_mileage_tracking (one row per delivery, merge on same day)
  INSERT INTO public.vehicle_mileage_tracking (
    vehicle_id, odometer_reading, reading_date, reading_source, gps_distance_km, trip_count
  )
  VALUES (
    NEW.vehicle_id,
    COALESCE(v_current_odo, 0) + v_km,
    CURRENT_DATE,
    'dispatch',
    v_km,
    1
  )
  ON CONFLICT (vehicle_id, reading_date)
  DO UPDATE SET
    odometer_reading = EXCLUDED.odometer_reading,
    gps_distance_km  = COALESCE(vehicle_mileage_tracking.gps_distance_km, 0) + v_km,
    trip_count       = COALESCE(vehicle_mileage_tracking.trip_count, 0) + 1;

  -- Recalculate health score for this vehicle
  PERFORM public.recalculate_vehicle_health(NEW.vehicle_id, v_org_id);

  RETURN NEW;
END;
$$;

-- Create the trigger (drop first to avoid duplicate)
DROP TRIGGER IF EXISTS trg_dispatch_delivered_km ON public.dispatches;
CREATE TRIGGER trg_dispatch_delivered_km
  AFTER UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_dispatch_delivered_km();

-- ── 5. Trigger: recalculate health after inspection saved ─────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_inspection_health()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  -- Only act on completed inspections
  IF NEW.status NOT IN ('passed', 'attention_needed', 'failed') THEN
    RETURN NEW;
  END IF;

  -- Fetch org_id from the vehicle (org-scoped)
  SELECT organization_id INTO v_org_id
  FROM public.vehicles
  WHERE id = NEW.vehicle_id;

  IF v_org_id IS NOT NULL THEN
    PERFORM public.recalculate_vehicle_health(NEW.vehicle_id, v_org_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inspection_health ON public.vehicle_inspections;
CREATE TRIGGER trg_inspection_health
  AFTER INSERT OR UPDATE ON public.vehicle_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_inspection_health();

-- ── 6. Trigger: recalculate health after fuel log saved ───────────────────────
CREATE OR REPLACE FUNCTION public.trg_fn_fuel_log_health()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- km_per_litre is a generated column — only recalculate when it will be meaningful
  IF NEW.km_since_last_fill IS NOT NULL AND NEW.litres_dispensed > 0 THEN
    PERFORM public.recalculate_vehicle_health(NEW.vehicle_id, NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fuel_log_health ON public.fuel_logs;
CREATE TRIGGER trg_fuel_log_health
  AFTER INSERT OR UPDATE ON public.fuel_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_fuel_log_health();

-- ── 7. Backfill: recalculate health for all existing vehicles ─────────────────
-- Runs once at migration time so existing vehicles immediately get real scores
-- instead of sitting at the default 100.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, organization_id FROM public.vehicles WHERE organization_id IS NOT NULL
  LOOP
    PERFORM public.recalculate_vehicle_health(r.id, r.organization_id);
  END LOOP;
END;
$$;

-- ── 8. Backfill: accumulate historical dispatch KMs onto vehicles ──────────────
-- Totals all delivered dispatches per vehicle and writes the sum to lifetime_km
-- and current_odometer (on top of initial_odometer baseline).
-- weekly_km / monthly_km are set from the current period only.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      d.vehicle_id,
      v.organization_id,
      v.initial_odometer,
      SUM(COALESCE(d.total_distance_km, d.distance_km, 0)) AS total_km,
      SUM(CASE WHEN d.updated_at >= date_trunc('week',  NOW()) THEN COALESCE(d.total_distance_km, d.distance_km, 0) ELSE 0 END) AS wk_km,
      SUM(CASE WHEN d.updated_at >= date_trunc('month', NOW()) THEN COALESCE(d.total_distance_km, d.distance_km, 0) ELSE 0 END) AS mo_km
    FROM public.dispatches d
    JOIN public.vehicles v ON v.id = d.vehicle_id AND v.organization_id = d.organization_id
    WHERE d.status = 'delivered'
      AND d.vehicle_id IS NOT NULL
    GROUP BY d.vehicle_id, v.organization_id, v.initial_odometer
  LOOP
    UPDATE public.vehicles
    SET
      lifetime_km      = r.total_km,
      current_odometer = COALESCE(r.initial_odometer, 0) + r.total_km,
      weekly_km        = r.wk_km,
      monthly_km       = r.mo_km
    WHERE id = r.vehicle_id AND organization_id = r.organization_id;
  END LOOP;
END;
$$;

-- ── 9. RLS: grant execute on new functions to authenticated users ──────────────
-- recalculate_vehicle_health is SECURITY DEFINER (runs as owner), so we don't
-- need to grant it to authenticated — it's called only by triggers.
-- Expose it as an RPC for the frontend health refresh button:
GRANT EXECUTE ON FUNCTION public.recalculate_vehicle_health(UUID, UUID) TO authenticated;
