
-- Performance scores table (daily snapshots)
CREATE TABLE public.fm_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  score_date DATE NOT NULL DEFAULT CURRENT_DATE,
  workflow_efficiency NUMERIC DEFAULT 0 CHECK (workflow_efficiency >= 0 AND workflow_efficiency <= 100),
  automation_level NUMERIC DEFAULT 0 CHECK (automation_level >= 0 AND automation_level <= 100),
  decision_accuracy NUMERIC DEFAULT 0 CHECK (decision_accuracy >= 0 AND decision_accuracy <= 100),
  cash_flow_health NUMERIC DEFAULT 0 CHECK (cash_flow_health >= 0 AND cash_flow_health <= 100),
  risk_score NUMERIC DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  execution_score NUMERIC DEFAULT 0 CHECK (execution_score >= 0 AND execution_score <= 100),
  total_score NUMERIC GENERATED ALWAYS AS (
    workflow_efficiency * 0.25 +
    automation_level * 0.20 +
    decision_accuracy * 0.20 +
    cash_flow_health * 0.15 +
    risk_score * 0.10 +
    execution_score * 0.10
  ) STORED,
  rank_level TEXT GENERATED ALWAYS AS (
    CASE
      WHEN (workflow_efficiency * 0.25 + automation_level * 0.20 + decision_accuracy * 0.20 + cash_flow_health * 0.15 + risk_score * 0.10 + execution_score * 0.10) >= 85 THEN 'Elite Operator'
      WHEN (workflow_efficiency * 0.25 + automation_level * 0.20 + decision_accuracy * 0.20 + cash_flow_health * 0.15 + risk_score * 0.10 + execution_score * 0.10) >= 65 THEN 'Advanced Operator'
      WHEN (workflow_efficiency * 0.25 + automation_level * 0.20 + decision_accuracy * 0.20 + cash_flow_health * 0.15 + risk_score * 0.10 + execution_score * 0.10) >= 40 THEN 'Operator'
      ELSE 'Beginner'
    END
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, score_date)
);

ALTER TABLE public.fm_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scores" ON public.fm_performance_scores
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scores" ON public.fm_performance_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own scores" ON public.fm_performance_scores
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all scores" ON public.fm_performance_scores
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'org_admin')
  );

-- 28-Day Transformation tracker
CREATE TABLE public.fm_transformation_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 28),
  week_number INTEGER GENERATED ALWAYS AS (CEIL(day_number::NUMERIC / 7)) STORED,
  task_title TEXT NOT NULL,
  task_description TEXT,
  category TEXT NOT NULL DEFAULT 'optimization',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_minutes INTEGER DEFAULT 0,
  impact_score NUMERIC DEFAULT 0,
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, day_number)
);

ALTER TABLE public.fm_transformation_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own transformation" ON public.fm_transformation_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all transformations" ON public.fm_transformation_days
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.has_role(auth.uid(), 'admin')
  );

-- AI Tasks for finance managers
CREATE TABLE public.fm_ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual', 'system')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'dismissed')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  impact_score NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.fm_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own tasks" ON public.fm_ai_tasks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_fm_scores_user_date ON public.fm_performance_scores(user_id, score_date DESC);
CREATE INDEX idx_fm_transform_user ON public.fm_transformation_days(user_id, day_number);
CREATE INDEX idx_fm_tasks_user_status ON public.fm_ai_tasks(user_id, status);
