DO $$
DECLARE
  keep_emails TEXT[] := ARRAY['shilaymindz@gmail.com', 'danielolashile@gmail.com'];
  victim_ids UUID[];
  victim_org_ids UUID[];
BEGIN
  -- Collect users to delete
  SELECT ARRAY_AGG(id) INTO victim_ids
  FROM auth.users
  WHERE LOWER(email) <> ALL (SELECT LOWER(unnest(keep_emails)));

  IF victim_ids IS NULL OR array_length(victim_ids, 1) IS NULL THEN
    RAISE NOTICE 'No users to delete';
    RETURN;
  END IF;

  -- Capture organizations owned by victim users (we'll delete orgs that no surviving admin uses)
  SELECT ARRAY_AGG(DISTINCT id) INTO victim_org_ids
  FROM public.organizations
  WHERE owner_user_id = ANY(victim_ids);

  -- Clean public-schema rows tied to these users
  DELETE FROM public.organization_members WHERE user_id = ANY(victim_ids);
  DELETE FROM public.user_roles WHERE user_id = ANY(victim_ids);
  DELETE FROM public.profiles WHERE user_id = ANY(victim_ids);

  -- Delete orphan organizations (no remaining members)
  IF victim_org_ids IS NOT NULL THEN
    DELETE FROM public.organizations o
    WHERE o.id = ANY(victim_org_ids)
      AND NOT EXISTS (
        SELECT 1 FROM public.organization_members m WHERE m.organization_id = o.id
      );
  END IF;

  -- Finally remove the auth users themselves
  DELETE FROM auth.users WHERE id = ANY(victim_ids);

  RAISE NOTICE 'Deleted % user(s)', array_length(victim_ids, 1);
END $$;