ALTER TABLE public.approval_policies
  DROP CONSTRAINT IF EXISTS uq_approval_policies_org_entity;

ALTER TABLE public.approval_policies
  ADD CONSTRAINT uq_approval_policies_org_entity
  UNIQUE (organization_id, entity_type);