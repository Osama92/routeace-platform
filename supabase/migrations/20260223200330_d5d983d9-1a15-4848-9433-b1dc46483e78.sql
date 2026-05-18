
-- Approval engine tables
CREATE TABLE public.approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  approval_level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  requested_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  rejected_by UUID REFERENCES auth.users(id),
  super_admin_override BOOLEAN DEFAULT FALSE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.approval_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  min_amount_threshold NUMERIC DEFAULT 0,
  approval_levels_required INTEGER DEFAULT 1,
  roles_allowed TEXT[] DEFAULT '{}',
  requires_super_admin_override BOOLEAN DEFAULT FALSE,
  auto_approve_if_below_threshold BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  original_data JSONB NOT NULL,
  modified_data JSONB NOT NULL,
  changed_fields TEXT[] DEFAULT '{}',
  requested_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending_super_admin' CHECK (status IN ('pending_super_admin', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edit_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for approvals
CREATE POLICY "Authenticated users can view approvals" ON public.approvals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users with roles can create approvals" ON public.approvals
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Approvers can update approvals" ON public.approvals
  FOR UPDATE TO authenticated USING (
    public.is_super_admin(auth.uid()) OR
    public.is_org_admin(auth.uid()) OR
    public.is_finance_manager(auth.uid()) OR
    public.is_ops_manager(auth.uid())
  );

-- RLS policies for approval_policies
CREATE POLICY "Authenticated users can view policies" ON public.approval_policies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage policies" ON public.approval_policies
  FOR ALL TO authenticated USING (
    public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid())
  );

-- RLS policies for edit_requests
CREATE POLICY "Authenticated users can view edit requests" ON public.edit_requests
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users with roles can create edit requests" ON public.edit_requests
  FOR INSERT TO authenticated WITH CHECK (public.has_any_role(auth.uid()));

CREATE POLICY "Super admins can update edit requests" ON public.edit_requests
  FOR UPDATE TO authenticated USING (
    public.is_super_admin(auth.uid()) OR public.is_org_admin(auth.uid())
  );

-- Seed default approval policies
INSERT INTO public.approval_policies (entity_type, min_amount_threshold, approval_levels_required, roles_allowed, requires_super_admin_override, auto_approve_if_below_threshold) VALUES
  ('invoice', 0, 1, '{org_admin,finance_manager,super_admin}', false, false),
  ('expense', 0, 1, '{org_admin,finance_manager,super_admin}', false, true),
  ('payment', 5000000, 2, '{org_admin,super_admin}', true, false),
  ('dispatch', 0, 1, '{org_admin,ops_manager,super_admin}', false, true),
  ('journal_entry', 0, 1, '{finance_manager,super_admin}', false, false),
  ('vendor_onboarding', 0, 1, '{org_admin,ops_manager,super_admin}', false, false),
  ('wallet_transfer', 20000000, 2, '{super_admin}', true, false),
  ('credit_note', 0, 1, '{finance_manager,org_admin,super_admin}', false, false),
  ('rate_approval', 0, 1, '{org_admin,super_admin}', false, false),
  ('tax_filing', 0, 1, '{finance_manager,super_admin}', true, false);

-- Enable realtime for approvals
ALTER PUBLICATION supabase_realtime ADD TABLE public.approvals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.edit_requests;
