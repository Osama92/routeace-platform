
-- Tighten RLS on trip_profitability: restrict insert/update to admin roles
DROP POLICY IF EXISTS "Authenticated users can insert trip profitability" ON public.trip_profitability;
DROP POLICY IF EXISTS "Authenticated users can update trip profitability" ON public.trip_profitability;

CREATE POLICY "Admin roles can insert trip profitability"
  ON public.trip_profitability FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager')
  );

CREATE POLICY "Admin roles can update trip profitability"
  ON public.trip_profitability FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'finance_manager') OR
    public.has_role(auth.uid(), 'ops_manager')
  );
