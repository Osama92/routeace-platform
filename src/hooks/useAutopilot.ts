import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AutopilotMode = "observe" | "recommend" | "autopilot";

export interface AutopilotSetting {
  id: string;
  module_key: string;
  module_name: string;
  mode: AutopilotMode;
  is_enabled: boolean;
  config: Record<string, any>;
  updated_at: string;
}

export interface AutopilotPrediction {
  id: string;
  module_key: string;
  prediction_type: string;
  title: string;
  description: string | null;
  confidence_score: number;
  status: string;
  created_at: string;
}

export interface AutopilotAction {
  id: string;
  module_key: string;
  action_type: string;
  title: string;
  description: string | null;
  executed_by: string;
  status: string;
  created_at: string;
}

export interface AutopilotLog {
  id: string;
  module_key: string;
  event_type: string;
  message: string;
  severity: string;
  created_at: string;
}

export function useAutopilotSettings() {
  return useQuery({
    queryKey: ["autopilot-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_settings")
        .select("*")
        .order("module_name");
      if (error) throw error;
      return data as AutopilotSetting[];
    },
  });
}

export function useUpdateAutopilotMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode }: { id: string; mode: AutopilotMode }) => {
      const { error } = await supabase
        .from("autopilot_settings")
        .update({ mode, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autopilot-settings"] });
      toast.success("Autopilot mode updated");
    },
    onError: () => toast.error("Failed to update mode"),
  });
}

export function useToggleAutopilot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from("autopilot_settings")
        .update({ is_enabled, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["autopilot-settings"] });
      toast.success("Module toggled");
    },
    onError: () => toast.error("Failed to toggle module"),
  });
}

export function useAutopilotPredictions() {
  return useQuery({
    queryKey: ["autopilot-predictions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_predictions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutopilotPrediction[];
    },
  });
}

export function useAutopilotActions() {
  return useQuery({
    queryKey: ["autopilot-actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as AutopilotAction[];
    },
  });
}

export function useAutopilotLogs() {
  return useQuery({
    queryKey: ["autopilot-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("autopilot_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as AutopilotLog[];
    },
  });
}

export function useAutopilotKPIs() {
  const { data: dispatches } = useQuery({
    queryKey: ["autopilot-kpi-dispatches"],
    queryFn: async () => {
      const { count } = await supabase.from("dispatches").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["autopilot-kpi-vehicles"],
    queryFn: async () => {
      const { count } = await supabase.from("vehicles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: invoiceRevenue } = useQuery({
    queryKey: ["autopilot-kpi-revenue"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("invoices")
        .select("total_amount")
        .gte("created_at", startOfMonth.toISOString());
      return (data || []).reduce((s, i) => s + (i.total_amount || 0), 0);
    },
  });

  const { data: activeUsers } = useQuery({
    queryKey: ["autopilot-kpi-users"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      return count || 0;
    },
  });

  return {
    totalDispatches: dispatches || 0,
    totalVehicles: vehicles || 0,
    mtdRevenue: invoiceRevenue || 0,
    activeUsers: activeUsers || 0,
  };
}
