import { useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/rbac/permissions";

/**
 * Hook to ensure role persistence and rehydration
 * Prevents role wipe issues by:
 * 1. Rehydrating role on app reload
 * 2. Logging role mutation events
 * 3. Restoring default roles if missing
 */
export function useRoleGuard() {
  const { user, userRole, loading } = useAuth();

  // Rehydrate role from database on mount
  const rehydrateRole = useCallback(async () => {
    if (!user || loading) return null;

    try {
      const { data: rolesData, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const roles = (rolesData ?? []).map((r: any) => r.role as string);

      if (error || roles.length === 0) {
        console.warn("No role found for user, creating default role");
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "customer"
        });
        return "customer" as AppRole;
      }

      // Prefer core_ roles, otherwise take first
      const coreRole = roles.find((r) => r.startsWith("core_") || r === "internal_team");
      return (coreRole ?? roles[0]) as AppRole;
    } catch (err) {
      console.error("Error rehydrating role:", err);
      return null;
    }
  }, [user, loading]);

  // Validate role on mount and after auth changes
  useEffect(() => {
    if (user && !loading && !userRole) {
      rehydrateRole();
    }
  }, [user, loading, userRole, rehydrateRole]);

  return {
    rehydrateRole,
    isRoleValid: !!userRole,
    currentRole: userRole
  };
}

export default useRoleGuard;
