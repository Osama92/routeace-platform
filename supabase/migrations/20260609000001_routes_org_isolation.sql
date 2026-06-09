-- Add organization_id to routes table and enforce tenant isolation

-- 1. Add the column (nullable initially to allow backfill)
ALTER TABLE public.routes
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2. Backfill: assign each route to its creator's organization
UPDATE public.routes r
SET organization_id = om.organization_id
FROM public.organization_members om
WHERE om.user_id = r.created_by
  AND om.is_active = true
  AND r.organization_id IS NULL;

-- 3. Index for tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_routes_org ON public.routes(organization_id);

-- 4. Drop the existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view routes" ON public.routes;
DROP POLICY IF EXISTS "Users can create routes" ON public.routes;
DROP POLICY IF EXISTS "Users can update routes" ON public.routes;
DROP POLICY IF EXISTS "Users can delete routes" ON public.routes;

-- 5. Org-scoped RLS policies (mirrors the dispatches pattern)
CREATE POLICY "routes_select_org"
  ON public.routes FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR organization_id IS NULL  -- keep legacy un-scoped rows visible to their creator
       AND created_by = auth.uid()
  );

CREATE POLICY "routes_insert_org"
  ON public.routes FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "routes_update_org"
  ON public.routes FOR UPDATE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "routes_delete_org"
  ON public.routes FOR DELETE TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- 6. Also scope route_waypoints to the parent route's org (they have no org_id themselves)
-- route_waypoints inherits visibility via route_id FK, so no separate policy needed as long
-- as routes RLS gates route_id access. But add select policy if one exists that's too open:
DROP POLICY IF EXISTS "Authenticated users can view route waypoints" ON public.route_waypoints;
DROP POLICY IF EXISTS "Users can manage route waypoints" ON public.route_waypoints;

CREATE POLICY "route_waypoints_select_org"
  ON public.route_waypoints FOR SELECT TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "route_waypoints_insert_org"
  ON public.route_waypoints FOR INSERT TO authenticated
  WITH CHECK (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "route_waypoints_update_org"
  ON public.route_waypoints FOR UPDATE TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "route_waypoints_delete_org"
  ON public.route_waypoints FOR DELETE TO authenticated
  USING (
    route_id IN (
      SELECT id FROM public.routes
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );
