-- Fix: add missing auth.identities record for danielolashile@gmail.com
-- Direct auth.users inserts require a corresponding identities row for
-- password-based login to work (GoTrue checks this on signInWithPassword).

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'danielolashile@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User danielolashile@gmail.com not found in auth.users';
  END IF;

  -- Insert the identity record if missing
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_user_id,
    'danielolashile@gmail.com',
    'email',
    jsonb_build_object(
      'sub',            v_user_id::text,
      'email',          'danielolashile@gmail.com',
      'email_verified', true,
      'provider',       'email'
    ),
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO NOTHING;

END $$;
