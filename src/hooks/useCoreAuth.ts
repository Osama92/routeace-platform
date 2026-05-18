import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CoreRole = "core_founder" | "core_cofounder" | "core_builder" | "core_product" | "core_engineer" | "core_analyst" | "internal_team";

interface CoreAuthState {
  user: any | null;
  coreRole: CoreRole | null;
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * Hook for managing Core System authentication
 * Completely separate from customer authentication
 */
export function useCoreAuth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [state, setState] = useState<CoreAuthState>({
    user: null,
    coreRole: null,
    loading: true,
    isAuthenticated: false,
  });

  const checkCoreAccess = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
        return false;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role as string;
      const isCoreTeam = role?.startsWith("core_") || role === "internal_team";

      if (!isCoreTeam) {
        setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
        return false;
      }

      setState({
        user,
        coreRole: role as CoreRole,
        loading: false,
        isAuthenticated: true,
      });

      return true;
    } catch (error) {
      console.error("Core auth check failed:", error);
      setState(prev => ({ ...prev, loading: false, isAuthenticated: false }));
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Log the logout
      if (state.user) {
        await supabase.from("core_access_logs").insert({
          user_id: state.user.id,
          core_role: state.coreRole,
          action: "logout",
          resource: "/core/logout",
          user_agent: navigator.userAgent,
        });
      }

      await supabase.auth.signOut();
      setState({
        user: null,
        coreRole: null,
        loading: false,
        isAuthenticated: false,
      });
      navigate("/core/login");
    } catch (error) {
      console.error("Sign out failed:", error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  }, [state.user, state.coreRole, navigate, toast]);

  const logAccess = useCallback(async (action: string, resource: string, metadata?: any) => {
    if (!state.user) return;

    try {
      await supabase.from("core_access_logs").insert({
        user_id: state.user.id,
        core_role: state.coreRole,
        action,
        resource,
        metadata,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error("Failed to log access:", error);
    }
  }, [state.user, state.coreRole]);

  // Check role permissions - expanded for new roles
  const canAccessRevenue = ["core_founder", "core_cofounder", "internal_team"].includes(state.coreRole || "");
  const canAccessProduct = ["core_founder", "core_cofounder", "core_product", "core_analyst", "internal_team"].includes(state.coreRole || "");
  const canAccessSystem = ["core_founder", "core_cofounder", "core_builder", "core_engineer", "internal_team"].includes(state.coreRole || "");
  const canAccessEngineering = ["core_founder", "core_cofounder", "core_engineer", "internal_team"].includes(state.coreRole || "");
  const canManageTeam = ["core_founder"].includes(state.coreRole || ""); // Only founder can invite/remove
  const canDeleteFounder = false; // Cofounder cannot delete founder
  const canAccessIntelligence = ["core_founder", "core_cofounder", "core_product", "core_analyst"].includes(state.coreRole || "");
  const canAccessAnalytics = ["core_founder", "core_cofounder", "core_analyst"].includes(state.coreRole || "");

  useEffect(() => {
    checkCoreAccess();
  }, [checkCoreAccess]);

  return {
    ...state,
    checkCoreAccess,
    signOut,
    logAccess,
    permissions: {
      canAccessRevenue,
      canAccessProduct,
      canAccessSystem,
      canAccessEngineering,
      canManageTeam,
      canDeleteFounder,
      canAccessIntelligence,
      canAccessAnalytics,
    },
  };
}

export default useCoreAuth;
