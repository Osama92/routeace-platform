CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Make extension functions available without schema prefix in all sessions
ALTER DATABASE postgres SET search_path TO public, extensions;
SET search_path TO public, extensions;
