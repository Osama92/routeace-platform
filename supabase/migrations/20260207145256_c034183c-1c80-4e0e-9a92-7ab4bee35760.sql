-- Add new Core roles: core_cofounder and core_analyst
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_cofounder';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'core_analyst';

-- Add last_login tracking to core_team_members for activity visibility
ALTER TABLE public.core_team_members
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_core_team_members_user_id ON public.core_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_core_access_logs_user_id ON public.core_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_core_access_logs_action ON public.core_access_logs(action);

-- Create function to track core user login activity
CREATE OR REPLACE FUNCTION public.track_core_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update core_team_members when a core user logs in
  UPDATE public.core_team_members
  SET 
    last_login_at = now(),
    last_seen_at = now(),
    login_count = COALESCE(login_count, 0) + 1
  WHERE user_id = NEW.user_id
    AND NEW.action = 'login';
  
  RETURN NEW;
END;
$$;

-- Create trigger for login tracking
DROP TRIGGER IF EXISTS track_core_login_trigger ON public.core_access_logs;
CREATE TRIGGER track_core_login_trigger
AFTER INSERT ON public.core_access_logs
FOR EACH ROW
EXECUTE FUNCTION public.track_core_login();