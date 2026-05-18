
-- Add region_mode to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS region_mode TEXT DEFAULT 'NG' CHECK (region_mode IN ('NG', 'GLOBAL')),
ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'NG',
ADD COLUMN IF NOT EXISTS teleprompter_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS teleprompter_step INTEGER DEFAULT 0;

-- Add onboarding_progress table for tracking teleprompter state per module
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module_key)
);

ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own onboarding progress"
  ON public.onboarding_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON public.onboarding_progress(user_id);
