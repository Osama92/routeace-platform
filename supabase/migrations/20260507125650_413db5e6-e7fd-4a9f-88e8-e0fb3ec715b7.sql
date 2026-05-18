
-- Auto-populate triggers
CREATE OR REPLACE FUNCTION public.auto_set_inspection_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_org_vehicle_inspection ON public.vehicle_inspections;
CREATE TRIGGER trg_auto_org_vehicle_inspection
  BEFORE INSERT ON public.vehicle_inspections
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_inspection_org();

CREATE OR REPLACE FUNCTION public.auto_set_safety_gate_org()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.organization_id IS NULL AND NEW.vehicle_id IS NOT NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_auto_org_safety_gate ON public.dispatch_safety_gates;
CREATE TRIGGER trg_auto_org_safety_gate
  BEFORE INSERT ON public.dispatch_safety_gates
  FOR EACH ROW EXECUTE FUNCTION public.auto_set_safety_gate_org();

-- Relax insert policies — allow NULL org_id (trigger fills it); require match if provided
DROP POLICY IF EXISTS "Org members create vehicle inspections" ON public.vehicle_inspections;
CREATE POLICY "Org members create vehicle inspections"
  ON public.vehicle_inspections FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NULL
    OR public.is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Org members create safety gates" ON public.dispatch_safety_gates;
CREATE POLICY "Org members create safety gates"
  ON public.dispatch_safety_gates FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IS NULL
    OR public.is_org_member(auth.uid(), organization_id)
  );

DROP POLICY IF EXISTS "Org members write inspection items" ON public.vehicle_inspection_items;
CREATE POLICY "Org members write inspection items"
  ON public.vehicle_inspection_items FOR INSERT TO authenticated
  WITH CHECK (
    inspection_id IN (
      SELECT id FROM public.vehicle_inspections
      WHERE organization_id IS NULL
        OR public.is_org_member(auth.uid(), organization_id)
    )
  );
