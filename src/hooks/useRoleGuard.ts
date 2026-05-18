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
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        console.warn("No role found for user, creating default role");
        // Auto-restore with pending customer role
        await supabase.from("user_roles").insert({
          user_id: user.id,
          role: "customer" // Default safe role
        });
        
        // Log the auto-restore
        await supabase.from("audit_logs").insert({
          action: "role_auto_restored",
          table_name: "user_roles",
          record_id: user.id,
          new_data: { role: "customer", reason: "missing_role" },
          user_id: user.id,
          user_email: user.email
        });
        
        return "customer" as AppRole;
      }

      return data.role as AppRole;
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
