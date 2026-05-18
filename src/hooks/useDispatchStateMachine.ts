import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

export type DispatchState = Database["public"]["Enums"]["dispatch_state"];

interface StateTransition {
  from_state: DispatchState;
  to_state: DispatchState;
  allowed_roles: string[];
  requires_reason: boolean;
  sla_hours: number | null;
}

interface TransitionResult {
  success: boolean;
  error?: string;
  from_state?: string;
  to_state?: string;
  auto_trigger?: string;
}

interface StateHistory {
  id: string;
  dispatch_id: string;
  from_state: string | null;
  to_state: string;
  changed_by: string | null;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface RpcResult {
  valid?: boolean;
  success?: boolean;
  error?: string;
  from_state?: string;
  to_state?: string;
  auto_trigger?: string;
  sla_hours?: number;
}

export const useDispatchStateMachine = () => {
  const [loading, setLoading] = useState(false);
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  // Fetch allowed transitions from a given state
  const fetchAllowedTransitions = useCallback(
    async (currentState: DispatchState): Promise<StateTransition[]> => {
      try {
        const { data, error } = await supabase
          .from("dispatch_state_transitions")
          .select("*")
          .eq("from_state", currentState);

        if (error) throw error;

        // Filter by user role
        const allowedTransitions = (data || []).filter((t) =>
          userRole ? t.allowed_roles.includes(userRole) : false
        ) as StateTransition[];

        setTransitions(allowedTransitions);
        return allowedTransitions;
      } catch (error) {
        console.error("Error fetching transitions:", error);
        return [];
      }
    },
    [userRole]
  );

  // Validate a transition without executing it
  const validateTransition = useCallback(
    async (
      dispatchId: string,
      newState: DispatchState,
      reason?: string
    ): Promise<{ valid: boolean; error?: string }> => {
      if (!user) return { valid: false, error: "Not authenticated" };

      try {
        const { data, error } = await supabase.rpc("validate_dispatch_transition", {
          p_dispatch_id: dispatchId,
          p_new_state: newState,
          p_user_id: user.id,
          p_reason: reason || null,
        });

        if (error) throw error;

        const result = data as unknown as RpcResult;

        return {
          valid: result?.valid || false,
          error: result?.error,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Validation failed";
        return { valid: false, error: errorMessage };
      }
    },
    [user]
  );

  // Execute a state transition
  const executeTransition = useCallback(
    async (
      dispatchId: string,
      newState: DispatchState,
      reason?: string,
      metadata?: Record<string, unknown>
    ): Promise<TransitionResult> => {
      if (!user) {
        return { success: false, error: "Not authenticated" };
      }

      setLoading(true);

      try {
        const { data, error } = await supabase.rpc("execute_dispatch_transition", {
          p_dispatch_id: dispatchId,
          p_new_state: newState,
          p_user_id: user.id,
          p_reason: reason || null,
          p_metadata: metadata ? JSON.stringify(metadata) : "{}",
        });

        if (error) throw error;

        const result = data as unknown as RpcResult;

        if (!result?.success && !result?.valid) {
          throw new Error(result?.error || "Transition failed");
        }

        toast({
          title: "Status Updated",
          description: `Dispatch moved to ${newState.replace(/_/g, " ")}`,
        });

        return {
          success: true,
          from_state: result.from_state,
          to_state: result.to_state,
          auto_trigger: result.auto_trigger,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Transition failed";
        toast({
          title: "Transition Failed",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  // Get state history for a dispatch
  const getStateHistory = useCallback(
    async (dispatchId: string): Promise<StateHistory[]> => {
      try {
        const { data, error } = await supabase
          .from("dispatch_state_history")
          .select("*")
          .eq("dispatch_id", dispatchId)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return (data as StateHistory[]) || [];
      } catch (error) {
        console.error("Error fetching state history:", error);
        return [];
      }
    },
    []
  );

  // Check if dispatch is in a dead/stale state
  const checkDeadState = useCallback(
    async (dispatchId: string): Promise<{ isStale: boolean; hoursInState: number }> => {
      try {
        // Use direct query since view might not be accessible
        const { data, error } = await supabase
          .from("dispatches")
          .select("status, updated_at")
          .eq("id", dispatchId)
          .single();

        if (error) throw error;

        const hoursInState = data
          ? (Date.now() - new Date(data.updated_at).getTime()) / (1000 * 60 * 60)
          : 0;

        return {
          isStale: hoursInState > 24,
          hoursInState,
        };
      } catch (error) {
        console.error("Error checking dead state:", error);
        return { isStale: false, hoursInState: 0 };
      }
    },
    []
  );

  // Get SLA status for a dispatch
  const getSlaStatus = useCallback(async (dispatchId: string) => {
    try {
      const { data, error } = await supabase
        .from("dispatch_sla_timers")
        .select("*")
        .eq("dispatch_id", dispatchId)
        .is("completed_at", null)
        .maybeSingle();

      if (error) throw error;

      if (!data) return null;

      const now = new Date();
      const deadline = new Date(data.deadline_at);
      const remainingMs = deadline.getTime() - now.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);

      return {
        state: data.state,
        deadline: deadline,
        remainingHours: Math.max(0, remainingHours),
        isBreached: remainingMs < 0,
        breachedAt: data.breached_at,
      };
    } catch (error) {
      console.error("Error fetching SLA status:", error);
      return null;
    }
  }, []);

  // State display configuration
  const stateConfig: Record<
    DispatchState,
    { label: string; color: string; description: string }
  > = {
    created: {
      label: "Created",
      color: "bg-muted text-muted-foreground",
      description: "Dispatch has been created",
    },
    pending_approval: {
      label: "Pending Approval",
      color: "bg-warning/15 text-warning",
      description: "Awaiting manager approval",
    },
    approved: {
      label: "Approved",
      color: "bg-success/15 text-success",
      description: "Ready for driver assignment",
    },
    assigned: {
      label: "Assigned",
      color: "bg-info/15 text-info",
      description: "Driver and vehicle assigned",
    },
    enroute: {
      label: "Enroute",
      color: "bg-primary/15 text-primary",
      description: "Driver heading to pickup",
    },
    picked_up: {
      label: "Picked Up",
      color: "bg-primary/15 text-primary",
      description: "Cargo collected from origin",
    },
    in_transit: {
      label: "In Transit",
      color: "bg-primary/15 text-primary",
      description: "On the way to destination",
    },
    delivered: {
      label: "Delivered",
      color: "bg-success/15 text-success",
      description: "Cargo delivered to destination",
    },
    closed: {
      label: "Closed",
      color: "bg-muted text-muted-foreground",
      description: "Trip completed and verified",
    },
    invoiced: {
      label: "Invoiced",
      color: "bg-success/15 text-success",
      description: "Invoice generated",
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-destructive/15 text-destructive",
      description: "Dispatch was cancelled",
    },
  };

  return {
    loading,
    transitions,
    stateConfig,
    fetchAllowedTransitions,
    validateTransition,
    executeTransition,
    getStateHistory,
    checkDeadState,
    getSlaStatus,
  };
};

export default useDispatchStateMachine;
