-- Seed core developer user: danielolashile@gmail.com
-- Role: core_builder (access to Core + Tech & Product pages)
-- Password is temporary and should be changed on first login.

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if the user already exists in auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'danielolashile@gmail.com'
  LIMIT 1;

  -- Create the user if they don't exist
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      role,
      aud
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'danielolashile@gmail.com',
      crypt('RouteAce@Dev2026!', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"full_name": "Daniel Olashile"}',
      now(),
      now(),
      'authenticated',
      'authenticated'
    );

    -- Create a profile row
    INSERT INTO public.profiles (user_id, email, full_name, created_at, updated_at)
    VALUES (v_user_id, 'danielolashile@gmail.com', 'Daniel Olashile', now(), now())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Assign core_builder role (grants access to Core + Tech & Product pages)
  INSERT INTO public.user_roles (user_id, role, created_at)
  VALUES (v_user_id, 'core_builder', now())
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;
