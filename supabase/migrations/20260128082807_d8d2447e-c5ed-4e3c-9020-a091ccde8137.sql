-- Fix overly permissive RLS policies for driver bonus tables
-- Drop the permissive policies and replace with role-restricted access

-- Fix driver_bonus_config policies
DROP POLICY IF EXISTS "Anyone can read bonus config" ON public.driver_bonus_config;

CREATE POLICY "Role-restricted bonus config read access" 
ON public.driver_bonus_config 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role)
);

-- Fix driver_bonuses policies  
DROP POLICY IF EXISTS "Anyone can read bonuses" ON public.driver_bonuses;

CREATE POLICY "Role-restricted bonus read access" 
ON public.driver_bonuses 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'operations'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.drivers d 
    WHERE d.id = driver_bonuses.driver_id 
    AND d.user_id = auth.uid()
  )
);