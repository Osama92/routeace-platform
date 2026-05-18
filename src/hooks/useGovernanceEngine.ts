import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface GovernancePolicy {
  id: string;
  module_key: string;
  module_name: string;
  os_context: string;
  autonomy_mode: "manual" | "assisted" | "autonomous";
  approval_type: "none" | "single" | "multi_level" | "conditional";
  risk_threshold: number;
  value_threshold: number;
  ai_allowed: boolean;
  ai_can_execute: boolean;
  escalation_role: string;
  is_active: boolean;
  updated_at: string;
}

export interface GovernanceAuditEntry {
  id: string;
  module_key: string;
  action: string;
  autonomy_mode: string | null;
  decision: string;
  actor_email: string | null;
  ai_initiated: boolean;
  ai_confidence: number | null;
  override_reason: string | null;
  created_at: string;
}

export function useGovernanceEngine() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [auditLog, setAuditLog] = useState<GovernanceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPolicies = useCallback(async () => {
    const { data, error } = await supabase
      .from("governance_policies")
      .select("*")
      .order("module_name");
    if (!error && data) setPolicies(data as GovernancePolicy[]);
    return data;
  }, []);

  const fetchAuditLog = useCallback(async (limit = 50) => {
    const { data, error } = await supabase
      .from("governance_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) setAuditLog(data as GovernanceAuditEntry[]);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPolicies(), fetchAuditLog()]);
      setLoading(false);
    };
    load();
  }, [fetchPolicies, fetchAuditLog]);

  const updatePolicy = useCallback(
    async (id: string, updates: Partial<GovernancePolicy>) => {
      if (!isSuperAdmin) {
        toast({ title: "Access Denied", description: "Only Super Admin can modify governance policies.", variant: "destructive" });
        return false;
      }
      const { error } = await supabase
        .from("governance_policies")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return false;
      }
      // Audit log
      await supabase.from("governance_audit_log").insert({
        module_key: policies.find((p) => p.id === id)?.module_key || "",
        action: "policy_update",
        autonomy_mode: updates.autonomy_mode,
        decision: `Updated: ${Object.keys(updates).join(", ")}`,
        actor_id: user?.id,
        actor_email: user?.email,
      });
      toast({ title: "Policy Updated" });
      await fetchPolicies();
      return true;
    },
    [isSuperAdmin, user, policies, toast, fetchPolicies]
  );

  const setGlobalAutonomy = useCallback(
    async (mode: "manual" | "assisted" | "autonomous") => {
      if (!isSuperAdmin) return false;
      const { error } = await supabase
        .from("governance_policies")
        .update({ autonomy_mode: mode, updated_at: new Date().toISOString() })
        .neq("id", "");
      if (error) return false;
      await supabase.from("governance_audit_log").insert({
        module_key: "global",
        action: "global_autonomy_change",
        autonomy_mode: mode,
        decision: `All modules set to ${mode}`,
        actor_id: user?.id,
        actor_email: user?.email,
      });
      toast({ title: "Global Mode Updated", description: `All modules set to ${mode} mode.` });
      await fetchPolicies();
      return true;
    },
    [isSuperAdmin, user, toast, fetchPolicies]
  );

  const checkAction = useCallback(
    (moduleKey: string): { allowed: boolean; requiresApproval: boolean; mode: string } => {
      const policy = policies.find((p) => p.module_key === moduleKey);
      if (!policy || !policy.is_active) return { allowed: true, requiresApproval: false, mode: "manual" };
      if (policy.autonomy_mode === "autonomous") return { allowed: true, requiresApproval: false, mode: "autonomous" };
      if (policy.autonomy_mode === "assisted") return { allowed: true, requiresApproval: true, mode: "assisted" };
      return { allowed: true, requiresApproval: true, mode: "manual" };
    },
    [policies]
  );

  return {
    policies,
    auditLog,
    loading,
    updatePolicy,
    setGlobalAutonomy,
    checkAction,
    fetchPolicies,
    fetchAuditLog,
  };
}
