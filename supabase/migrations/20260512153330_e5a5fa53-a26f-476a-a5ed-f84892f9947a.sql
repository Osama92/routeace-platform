ALTER TABLE public.transporter_invite_tokens
ALTER COLUMN token SET DEFAULT translate(rtrim(encode(extensions.gen_random_bytes(12), 'base64'), '='), '+/', '-_');