import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AutonomousRule {
  id: string;
  name: string;
  description: string | null;
  module_key: string;
  trigger_type: string;
  condition: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  severity: string;
  requires_approval: boolean;
  approval_level: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AutonomousDecision {
  id: string;
  rule_id: string | null;
  decision_type: string;
  trigger_source: string;
  trigger_data: Record<string, any>;
  recommendation: Record<string, any>;
  action: Record<string, any>;
  impact_summary: string | null;
  confidence_score: number | null;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  executed_at: string | null;
  rejected_reason: string | null;
  is_reversible: boolean;
  created_at: string;
}

export interface DecisionOutcome {
  id: string;
  decision_id: string;
  result_status: string;
  impact_metric: string | null;
  before_value: number | null;
  after_value: number | null;
  improvement_percent: number | null;
  notes: string | null;
  measured_at: string;
}

// ─── Rules ───
export function useAutonomousRules() {
  return useQuery({
    queryKey: ["autonomous-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autonomous_rules")
        .select("*")
        .order("module_key")
        .order("name");
      if (error) throw error;
      return data as AutonomousRule[];
    },
  });
}

export function useToggleRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("autonomous_rules")
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autonomous-rules"] });
      toast.success("Rule updated");
    },
  });
}

export function useCreateRule() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (rule: Omit<AutonomousRule, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase
        .from("autonomous_rules")
        .insert({ ...rule, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autonomous-rules"] });
      toast.success("Rule created");
    },
  });
}

// ─── Decisions ───
export function useAutonomousDecisions(status?: string) {
  return useQuery({
    queryKey: ["autonomous-decisions", status],
    queryFn: async () => {
      let query = supabase
        .from("autonomous_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw error;
      return data as AutonomousDecision[];
    },
  });
}

export function useApproveDecision() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("autonomous_decisions")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autonomous-decisions"] });
      toast.success("Decision approved");
    },
  });
}

export function useRejectDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("autonomous_decisions")
        .update({
          status: "rejected",
          rejected_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autonomous-decisions"] });
      toast.success("Decision rejected");
    },
  });
}

export function useExecuteDecision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("autonomous_decisions")
        .update({
          status: "executed",
          executed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autonomous-decisions"] });
      toast.success("Decision executed");
    },
  });
}

// ─── Outcomes ───
export function useDecisionOutcomes(decisionId?: string) {
  return useQuery({
    queryKey: ["decision-outcomes", decisionId],
    enabled: !!decisionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decision_outcomes")
        .select("*")
        .eq("decision_id", decisionId!)
        .order("measured_at", { ascending: false });
      if (error) throw error;
      return data as DecisionOutcome[];
    },
  });
}

// ─── KPIs ───
export function useDecisionKPIs() {
  const { data: decisions } = useAutonomousDecisions();
  const { data: rules } = useAutonomousRules();

  const pending = decisions?.filter((d) => d.status === "pending").length || 0;
  const executed = decisions?.filter((d) => d.status === "executed").length || 0;
  const approved = decisions?.filter((d) => d.status === "approved").length || 0;
  const rejected = decisions?.filter((d) => d.status === "rejected").length || 0;
  const activeRules = rules?.filter((r) => r.is_active).length || 0;

  return { pending, executed, approved, rejected, activeRules, totalRules: rules?.length || 0 };
}
