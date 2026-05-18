-- 1. Fix permissive RLS on retail_credit_scores
DROP POLICY IF EXISTS "Authenticated users can insert credit scores" ON public.retail_credit_scores;
DROP POLICY IF EXISTS "Authenticated users can update credit scores" ON public.retail_credit_scores;

CREATE POLICY "Admins/finance can insert credit scores"
  ON public.retail_credit_scores FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admins/finance can update credit scores"
  ON public.retail_credit_scores FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 2. Fix permissive RLS on demand_forecasts
DROP POLICY IF EXISTS "Authenticated users can insert forecasts" ON public.demand_forecasts;
DROP POLICY IF EXISTS "Authenticated users can update forecasts" ON public.demand_forecasts;

CREATE POLICY "Admins/finance can insert forecasts"
  ON public.demand_forecasts FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'finance_manager')
  );

CREATE POLICY "Admins/finance can update forecasts"
  ON public.demand_forecasts FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'finance_manager')
  );

-- 3. Fix permissive RLS on fmcg_field_returns
DROP POLICY IF EXISTS "Authenticated users can update field returns" ON public.fmcg_field_returns;

CREATE POLICY "Admins/managers can update field returns"
  ON public.fmcg_field_returns FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'super_admin') OR 
    public.has_role(auth.uid(), 'org_admin') OR
    public.has_role(auth.uid(), 'ops_manager') OR
    sales_rep_id = auth.uid()
  );

-- 4. Create secure RPC for initial super admin creation
CREATE OR REPLACE FUNCTION public.create_initial_super_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (p_user_id, 'super_admin')
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;