-- Drop existing policies on user_presence to fix RLS violation
DROP POLICY IF EXISTS "Users can manage own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can view all presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can insert own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can update own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Users can delete own presence" ON public.user_presence;
DROP POLICY IF EXISTS "Anyone can view presence" ON public.user_presence;

-- Allow authenticated users to upsert their own presence
CREATE POLICY "Users can upsert own presence"
  ON public.user_presence
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow authenticated users to view all presence records
CREATE POLICY "Authenticated can view all presence"
  ON public.user_presence
  FOR SELECT
  TO authenticated
  USING (true);