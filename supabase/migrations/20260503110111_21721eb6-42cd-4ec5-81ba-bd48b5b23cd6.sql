
-- Dept Route Approvals
CREATE TABLE public.dept_route_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  route_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  estimated_cost NUMERIC NOT NULL DEFAULT 0,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewer_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dept_route_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view route approvals"
ON public.dept_route_approvals FOR SELECT
USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE POLICY "Org members create route approvals"
ON public.dept_route_approvals FOR INSERT
WITH CHECK (
  requested_by = auth.uid()
  AND organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
);

CREATE POLICY "Approvers update route approvals"
ON public.dept_route_approvals FOR UPDATE
USING (
  organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid())
  AND (
    public.has_role(auth.uid(), 'super_admin'::app_role)
    OR public.has_role(auth.uid(), 'org_admin'::app_role)
    OR public.has_role(auth.uid(), 'finance_manager'::app_role)
    OR public.has_role(auth.uid(), 'ops_manager'::app_role)
  )
);

CREATE TRIGGER trg_dept_route_approvals_updated
BEFORE UPDATE ON public.dept_route_approvals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dept AI Advisor Threads
CREATE TABLE public.dept_ai_advisor_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT 'New conversation',
  context TEXT,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dept_ai_advisor_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own advisor threads"
ON public.dept_ai_advisor_threads FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

CREATE TRIGGER trg_dept_advisor_threads_updated
BEFORE UPDATE ON public.dept_ai_advisor_threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Dept AI Advisor Messages
CREATE TABLE public.dept_ai_advisor_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.dept_ai_advisor_threads(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dept_ai_advisor_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own advisor messages"
ON public.dept_ai_advisor_messages FOR ALL
USING (thread_id IN (SELECT id FROM public.dept_ai_advisor_threads WHERE user_id = auth.uid()))
WITH CHECK (thread_id IN (SELECT id FROM public.dept_ai_advisor_threads WHERE user_id = auth.uid()));

CREATE INDEX idx_dept_route_approvals_org ON public.dept_route_approvals(organization_id, status);
CREATE INDEX idx_dept_advisor_threads_user ON public.dept_ai_advisor_threads(user_id, updated_at DESC);
CREATE INDEX idx_dept_advisor_messages_thread ON public.dept_ai_advisor_messages(thread_id, created_at);
