import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to protect Super Admin operations
 * Returns helpers to check if current user can perform Super Admin actions
 */
export const useSuperAdminGuard = () => {
  const { userRole, isSuperAdmin, user } = useAuth();
  const { toast } = useToast();

  /**
   * Check if current user can promote/demote to a specific role
   */
  const canChangeToRole = (targetRole: string): boolean => {
    // Only Super Admin can assign/change to super_admin
    if (targetRole === "super_admin" && !isSuperAdmin) {
      return false;
    }

    // Only Super Admin can change org_admin roles
    if (targetRole === "org_admin" && !isSuperAdmin) {
      return false;
    }

    // Admin can manage non-admin roles
    if (userRole === "admin" || userRole === "org_admin") {
      return !["super_admin", "org_admin"].includes(targetRole);
    }

    return isSuperAdmin;
  };

  /**
   * Check if current user can modify another user's role
   */
  const canModifyUserRole = (targetUserRole: string | null | undefined): boolean => {
    // Super Admin can modify anyone
    if (isSuperAdmin) return true;

    // Nobody can modify Super Admin except another Super Admin
    if (targetUserRole === "super_admin") return false;

    // Org Admin can modify non-admin roles
    if (userRole === "org_admin" && targetUserRole !== "org_admin") {
      return true;
    }

    // Admin can modify non-admin roles
    if (userRole === "admin" && !["super_admin", "org_admin", "admin"].includes(targetUserRole || "")) {
      return true;
    }

    return false;
  };

  /**
   * Show error toast if action is blocked
   */
  const showBlockedError = (action: string) => {
    toast({
      title: "Permission Denied",
      description: `Only Super Admin / Company Owner can ${action}`,
      variant: "destructive",
    });
  };

  /**
   * Get available roles for assignment based on current user's role
   */
  const getAssignableRoles = (): string[] => {
    if (isSuperAdmin) {
      return [
        "super_admin",
        "org_admin",
        "admin",
        "ops_manager",
        "finance_manager",
        "dispatcher",
        "driver",
        "customer",
        "support",
      ];
    }

    if (userRole === "org_admin" || userRole === "admin") {
      return [
        "ops_manager",
        "finance_manager",
        "dispatcher",
        "driver",
        "customer",
        "support",
      ];
    }

    return [];
  };

  /**
   * Check if user is the primary Company Owner (first Super Admin)
   */
  const isCompanyOwner = async (userId: string): Promise<boolean> => {
    // In a real implementation, you'd check against the earliest super_admin in the database
    // For now, we check if the user has super_admin role
    return isSuperAdmin && user?.id === userId;
  };

  return {
    isSuperAdmin,
    canChangeToRole,
    canModifyUserRole,
    showBlockedError,
    getAssignableRoles,
    isCompanyOwner,
  };
};

export default useSuperAdminGuard;
