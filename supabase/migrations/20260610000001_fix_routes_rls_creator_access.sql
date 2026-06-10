-- Fix routes RLS to allow access by creator regardless of org membership
-- (covers super_admin and users not yet in organization_members)

DROP POLICY IF EXISTS "routes_select_org" ON public.routes;

CREATE POLICY "routes_select_org"
  ON public.routes FOR SELECT TO authenticated
  USING (
    -- Org members can see all routes for their org
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    -- Route creator can always see their own routes (covers super_admin + migration gap)
    OR created_by = auth.uid()
  );

-- Same fix for INSERT — creator can insert into any org they belong to OR have created
DROP POLICY IF EXISTS "routes_insert_org" ON public.routes;

CREATE POLICY "routes_insert_org"
  ON public.routes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR organization_id IS NULL
  );

-- UPDATE and DELETE: org member OR creator
DROP POLICY IF EXISTS "routes_update_org" ON public.routes;

CREATE POLICY "routes_update_org"
  ON public.routes FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "routes_delete_org" ON public.routes;

CREATE POLICY "routes_delete_org"
  ON public.routes FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR created_by = auth.uid()
  );

-- Same fix for route_waypoints — inherit via route creator access
DROP POLICY IF EXISTS "route_waypoints_select_org" ON public.route_waypoints;

CREATE POLICY "route_waypoints_select_org"
  ON public.route_waypoints FOR SELECT TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "route_waypoints_insert_org" ON public.route_waypoints;

CREATE POLICY "route_waypoints_insert_org"
  ON public.route_waypoints FOR INSERT TO authenticated
  WITH CHECK (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "route_waypoints_update_org" ON public.route_waypoints;

CREATE POLICY "route_waypoints_update_org"
  ON public.route_waypoints FOR UPDATE TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "route_waypoints_delete_org" ON public.route_waypoints;

CREATE POLICY "route_waypoints_delete_org"
  ON public.route_waypoints FOR DELETE TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
      OR created_by = auth.uid()
    )
  );
