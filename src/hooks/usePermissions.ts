import { useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  hasPermission, 
  hasAnyPermission, 
  hasAllPermissions, 
  getRolePermissions,
  checkSeparationOfDuties,
  PERMISSIONS,
  type PermissionKey,
  type AppRole
} from "@/lib/rbac/permissions";
import { supabase } from "@/integrations/supabase/client";

export function usePermissions() {
  const { userRole, user, isSuperAdmin: authIsSuperAdmin } = useAuth();

  // Check single permission - Super Admin bypasses all
  const can = useCallback((permission: PermissionKey): boolean => {
    if (authIsSuperAdmin) return true;
    return hasPermission(userRole as AppRole, permission);
  }, [userRole, authIsSuperAdmin]);

  // Check any of multiple permissions - Super Admin bypasses all
  const canAny = useCallback((permissions: PermissionKey[]): boolean => {
    if (authIsSuperAdmin) return true;
    return hasAnyPermission(userRole as AppRole, permissions);
  }, [userRole, authIsSuperAdmin]);

  // Check all of multiple permissions - Super Admin bypasses all
  const canAll = useCallback((permissions: PermissionKey[]): boolean => {
    if (authIsSuperAdmin) return true;
    return hasAllPermissions(userRole as AppRole, permissions);
  }, [userRole, authIsSuperAdmin]);

  // Get all permissions for current role
  const permissions = useMemo(() => {
    return getRolePermissions(userRole as AppRole);
  }, [userRole]);

  // Check separation of duties
  const separationOfDuties = useMemo(() => {
    if (!userRole) return { isViolated: false, conflicts: [] };
    return checkSeparationOfDuties(userRole as AppRole);
  }, [userRole]);

  // Log permission denial for audit
  const logDenial = useCallback(async (
    permission: PermissionKey,
    resource?: string,
    context?: Record<string, any>
  ) => {
    if (!user) return;

    try {
      await supabase.from("audit_logs").insert({
        action: "permission_denied",
        table_name: "rbac",
        record_id: resource || "unknown",
        user_id: user.id,
        user_email: user.email,
        old_data: null,
        new_data: {
          permission,
          role: userRole,
          context,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error("Failed to log permission denial:", error);
    }
  }, [user, userRole]);

  // Check permission with auto-logging on denial
  const checkPermission = useCallback(async (
    permission: PermissionKey,
    resource?: string
  ): Promise<boolean> => {
    const allowed = can(permission);
    if (!allowed) {
      await logDenial(permission, resource);
    }
    return allowed;
  }, [can, logDenial]);

  // Role checks - isSuperAdmin from auth context
  const isSuperAdmin = authIsSuperAdmin;
  const isOrgAdmin = userRole === "org_admin";
  const isOpsManager = userRole === "ops_manager";
  const isFinanceManager = userRole === "finance_manager";
  const isDispatcher = userRole === "dispatcher";
  const isDriver = userRole === "driver";
  const isCustomer = userRole === "customer";
  const isAdmin = userRole === "admin";

  // Composite checks
  const canManageOrganization = canAny(["ORG_UPDATE", "ORG_MANAGE_SETTINGS"]);
  const canManageUsers = canAny(["USERS_CREATE", "USERS_UPDATE", "USERS_DELETE"]);
  const canManageFleet = canAny(["FLEET_CREATE", "FLEET_UPDATE", "FLEET_DELETE"]);
  const canManageDispatch = canAny(["DISPATCH_CREATE", "DISPATCH_UPDATE", "DISPATCH_ASSIGN"]);
  const canManageFinance = canAny(["INVOICES_APPROVE", "PAYOUTS_APPROVE_FINANCE", "PAYOUTS_APPROVE_FINAL"]);
  const canViewAnalytics = can("ANALYTICS_VIEW");
  const canExportData = canAny(["ANALYTICS_EXPORT", "INVOICES_EXPORT"]);

  return {
    // Core permission checks
    can,
    canAny,
    canAll,
    checkPermission,
    logDenial,

    // Current permissions
    permissions,
    role: userRole,
    separationOfDuties,

    // Role checks
    isSuperAdmin,
    isOrgAdmin,
    isOpsManager,
    isFinanceManager,
    isDispatcher,
    isDriver,
    isCustomer,
    isAdmin,

    // Composite permission checks
    canManageOrganization,
    canManageUsers,
    canManageFleet,
    canManageDispatch,
    canManageFinance,
    canViewAnalytics,
    canExportData,

    // Permission constants for reference
    PERMISSIONS,
  };
}

export default usePermissions;
