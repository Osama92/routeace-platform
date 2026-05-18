
ALTER TABLE public.organization_members
  DROP CONSTRAINT IF EXISTS organization_members_organization_id_fkey;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_organization_id_fkey
  FOREIGN KEY (organization_id)
  REFERENCES public.organizations(id)
  ON DELETE CASCADE;
