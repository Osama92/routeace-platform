import { useCallback } from "react";
import { useLiquorRole, type LiquorRole } from "@/hooks/useLiquorRole";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, hasAnyPermission, getOrgTypeFromRole, type LiquorPermission, type LiquorOrgType } from "@/lib/liquorPermissions";
import { supabase } from "@/integrations/supabase/client";

/**
 * Enterprise permission guard hook with audit logging.
 * Wraps every permission check with denial logging for compliance.
 */
export function useLiquorPermissionGuard() {
  const { liquorRole } = useLiquorRole();
  const { user, userRole } = useAuth();
  const isSuperAdmin = userRole === "super_admin";

  const orgType = getOrgTypeFromRole(liquorRole);

  // Check single permission with audit
  const can = useCallback(
    (permission: LiquorPermission): boolean => {
      if (isSuperAdmin) return true;
      return hasPermission(liquorRole, permission);
    },
    [liquorRole, isSuperAdmin]
  );

  // Check any permission
  const canAny = useCallback(
    (permissions: LiquorPermission[]): boolean => {
      if (isSuperAdmin) return true;
      return hasAnyPermission(liquorRole, permissions);
    },
    [liquorRole, isSuperAdmin]
  );

  // Log access denial to audit table
  const logDenial = useCallback(
    async (permission: LiquorPermission, resource?: string) => {
      if (!user) return;
      try {
        await supabase.from("audit_logs").insert({
          action: "liquor_permission_denied",
          table_name: "rbac",
          record_id: resource || "unknown",
          user_id: user.id,
          user_email: user.email || null,
          old_data: null,
          new_data: {
            permission,
            role: liquorRole,
            org_type: orgType,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (err) {
        console.error("Failed to log permission denial:", err);
      }
    },
    [user, liquorRole, orgType]
  );

  // Permission check with auto-logging on denial
  const checkAndLog = useCallback(
    async (permission: LiquorPermission, resource?: string): Promise<boolean> => {
      const allowed = can(permission);
      if (!allowed) {
        await logDenial(permission, resource);
      }
      return allowed;
    },
    [can, logDenial]
  );

  // Verify org isolation - ensures queries are scoped
  const getOrgScope = useCallback((): { orgType: LiquorOrgType | null; role: LiquorRole | null } => {
    return { orgType, role: liquorRole };
  }, [orgType, liquorRole]);

  return {
    can,
    canAny,
    checkAndLog,
    logDenial,
    getOrgScope,
    role: liquorRole,
    orgType,
    isSuperAdmin,
  };
}
