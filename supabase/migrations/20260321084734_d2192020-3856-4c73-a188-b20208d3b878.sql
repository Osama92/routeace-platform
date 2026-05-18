
DROP POLICY IF EXISTS "System insert security_events" ON public.security_events;
CREATE POLICY "Admin insert security_events" ON public.security_events
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.is_core_team(auth.uid())
  );
