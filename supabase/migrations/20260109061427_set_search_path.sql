-- Ensure extension functions are resolvable without schema prefix in all sessions
ALTER DATABASE postgres SET search_path TO public, extensions;
