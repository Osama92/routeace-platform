
-- 1. Role Performance Scores (unified across all roles)
CREATE TABLE public.role_performance_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  workflow_efficiency NUMERIC DEFAULT 0,
  automation_level NUMERIC DEFAULT 0,
  decision_accuracy NUMERIC DEFAULT 0,
  role_kpi_score NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  execution_score NUMERIC DEFAULT 0,
  total_score NUMERIC DEFAULT 0,
  rank_level TEXT DEFAULT 'beginner',
  kpi_breakdown JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, score_date)
);

ALTER TABLE public.role_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own role scores" ON public.role_performance_scores
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users insert own role scores" ON public.role_performance_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own role scores" ON public.role_performance_scores
  FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_role_scores_ts BEFORE UPDATE ON public.role_performance_scores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Role Transformation Days
CREATE TABLE public.role_transformation_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 28),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  task_title TEXT NOT NULL,
  task_description TEXT,
  category TEXT NOT NULL DEFAULT 'optimization',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, day_number)
);

ALTER TABLE public.role_transformation_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transformation" ON public.role_transformation_days
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users manage own transformation" ON public.role_transformation_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Role AI Tasks
CREATE TABLE public.role_ai_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  due_date DATE,
  impact_score NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.role_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own role tasks" ON public.role_ai_tasks
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users manage own role tasks" ON public.role_ai_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_role_tasks_ts BEFORE UPDATE ON public.role_ai_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Decision Engine Log
CREATE TABLE public.decision_engine_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  affected_roles TEXT[] DEFAULT '{}',
  impact_operational NUMERIC DEFAULT 0,
  impact_financial NUMERIC DEFAULT 0,
  impact_customer NUMERIC DEFAULT 0,
  impact_system NUMERIC DEFAULT 0,
  total_impact_score NUMERIC DEFAULT 0,
  risk_score NUMERIC DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  recommendation TEXT,
  alternatives JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  was_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  outcome TEXT,
  outcome_accuracy NUMERIC,
  predicted_impact JSONB,
  actual_impact JSONB,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.decision_engine_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own decisions" ON public.decision_engine_log
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users create decisions" ON public.decision_engine_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own decisions" ON public.decision_engine_log
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_decision_log_ts BEFORE UPDATE ON public.decision_engine_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Cross-Role Impacts
CREATE TABLE public.cross_role_impacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES public.decision_engine_log(id) ON DELETE CASCADE,
  source_role TEXT NOT NULL,
  target_role TEXT NOT NULL,
  impact_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  description TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cross_role_impacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view impacts" ON public.cross_role_impacts
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System insert impacts" ON public.cross_role_impacts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users resolve impacts" ON public.cross_role_impacts
  FOR UPDATE USING (auth.uid() IS NOT NULL);
