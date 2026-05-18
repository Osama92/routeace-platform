
-- AI Employees (the virtual workforce)
CREATE TABLE public.ai_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_key TEXT NOT NULL CHECK (role_key IN ('ops_manager','finance_manager','support_agent','growth_agent')),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs_approval','action_required','paused')),
  autonomy_mode TEXT NOT NULL DEFAULT 'suggest_only' CHECK (autonomy_mode IN ('suggest_only','auto_with_approval','full_autonomous')),
  current_task TEXT,
  confidence_score NUMERIC DEFAULT 0,
  performance_level TEXT DEFAULT 'junior' CHECK (performance_level IN ('junior','operator','elite')),
  tasks_completed_today INTEGER DEFAULT 0,
  tasks_completed_total INTEGER DEFAULT 0,
  last_action_at TIMESTAMPTZ,
  last_action_summary TEXT,
  next_suggested_action TEXT,
  daily_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, role_key)
);
ALTER TABLE public.ai_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own AI employees" ON public.ai_employees FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Employee Actions (audit log)
CREATE TABLE public.ai_employee_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  employee_id UUID REFERENCES public.ai_employees(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL,
  reasoning TEXT,
  impact_summary TEXT,
  confidence_score NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','executed','failed')),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  execution_result JSONB,
  revenue_impact NUMERIC DEFAULT 0,
  cost_impact NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_employee_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own AI actions" ON public.ai_employee_actions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own AI actions" ON public.ai_employee_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own AI actions" ON public.ai_employee_actions FOR UPDATE USING (auth.uid() = user_id);

-- AI Hiring Recommendations
CREATE TABLE public.ai_hiring_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  trigger_reason TEXT NOT NULL,
  recommended_role TEXT NOT NULL,
  responsibilities TEXT[],
  expected_kpis TEXT[],
  salary_range_min NUMERIC,
  salary_range_max NUMERIC,
  urgency TEXT DEFAULT 'medium' CHECK (urgency IN ('low','medium','high','critical')),
  current_capacity_pct NUMERIC,
  projected_improvement_pct NUMERIC,
  cost_of_not_hiring NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','hired')),
  candidate_score_formula JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_hiring_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own hiring recs" ON public.ai_hiring_recommendations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Negotiations
CREATE TABLE public.ai_negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  negotiation_type TEXT NOT NULL CHECK (negotiation_type IN ('vendor_rate','client_rate','driver_rate','fuel_contract','maintenance_contract')),
  counterparty_name TEXT NOT NULL,
  route_or_context TEXT,
  market_benchmark NUMERIC,
  initial_quote NUMERIC,
  target_price NUMERIC,
  walkaway_price NUMERIC,
  final_price NUMERIC,
  savings_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','pending_approval','accepted','rejected','expired')),
  strategy_notes TEXT,
  messages JSONB DEFAULT '[]',
  vendor_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_negotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own negotiations" ON public.ai_negotiations FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Expansion Opportunities
CREATE TABLE public.ai_expansion_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  opportunity_type TEXT DEFAULT 'route' CHECK (opportunity_type IN ('route','city','region','service')),
  origin TEXT,
  destination TEXT,
  demand_signals JSONB DEFAULT '{}',
  missed_requests INTEGER DEFAULT 0,
  estimated_monthly_revenue NUMERIC,
  estimated_monthly_cost NUMERIC,
  estimated_profit_margin NUMERIC,
  confidence_level NUMERIC,
  risk_level TEXT DEFAULT 'medium' CHECK (risk_level IN ('low','medium','high','critical')),
  fleet_required INTEGER,
  drivers_required INTEGER,
  investment_required NUMERIC,
  recommendation TEXT CHECK (recommendation IN ('proceed','wait','avoid')),
  simulation_results JSONB DEFAULT '{}',
  status TEXT DEFAULT 'identified' CHECK (status IN ('identified','evaluating','approved','executing','completed','abandoned')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_expansion_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own expansion" ON public.ai_expansion_opportunities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Learning Logs
CREATE TABLE public.ai_learning_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_key TEXT NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_description TEXT NOT NULL,
  adaptation_made TEXT,
  accuracy_before NUMERIC,
  accuracy_after NUMERIC,
  data_points_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_learning_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own learning" ON public.ai_learning_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AI Workforce Config (per tenant)
CREATE TABLE public.ai_workforce_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  system_mode TEXT DEFAULT 'autonomous' CHECK (system_mode IN ('autonomous','hybrid')),
  approval_preference TEXT DEFAULT 'hybrid' CHECK (approval_preference IN ('full_auto','manual','hybrid')),
  ai_tier TEXT DEFAULT 'assist' CHECK (ai_tier IN ('assist','copilot','autonomous')),
  voice_preference TEXT DEFAULT 'female',
  daily_report_channels TEXT[] DEFAULT ARRAY['email'],
  onboarding_completed BOOLEAN DEFAULT false,
  business_profile JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ai_workforce_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own config" ON public.ai_workforce_config FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
