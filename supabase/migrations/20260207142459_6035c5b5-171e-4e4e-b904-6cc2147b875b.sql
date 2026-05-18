-- Add internal_team role to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'internal_team';