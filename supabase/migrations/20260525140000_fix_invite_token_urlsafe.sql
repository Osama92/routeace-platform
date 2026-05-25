-- Fix: transporter_invite_tokens.token uses base64 which can produce '/' and '+'
-- characters. A '/' in the token breaks React Router path matching (useParams
-- decodes %2F back to '/'), causing the join page to receive a truncated token
-- and show "Invalid or Expired Link" for freshly-generated links.
--
-- Fix: change the default to hex encoding (gen_random_bytes(12) → 24 hex chars),
-- which is always URL-safe. Sanitize any existing tokens that contain '/'.

-- 1. Change the column default to hex-encoded random bytes (URL-safe)
ALTER TABLE public.transporter_invite_tokens
  ALTER COLUMN token SET DEFAULT encode(extensions.gen_random_bytes(12), 'hex');

-- 2. Replace any existing tokens that contain '/' or '+' (would break URL routing)
UPDATE public.transporter_invite_tokens
SET token = encode(extensions.gen_random_bytes(12), 'hex')
WHERE token ~ '[/+]';
