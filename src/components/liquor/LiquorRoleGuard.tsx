import { useNavigate } from "react-router-dom";
import { useLiquorRole, LIQUOR_ROLE_LABELS, type LiquorRole } from "@/hooks/useLiquorRole";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission, hasAnyPermission, type LiquorPermission, getOrgTypeFromRole } from "@/lib/liquorPermissions";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LiquorRoleGuardProps {
  children: React.ReactNode;
  /** Require at least one of these permissions */
  requiredPermissions?: LiquorPermission[];
  /** Require ALL of these permissions */
  requiredAllPermissions?: LiquorPermission[];
  /** Allow specific roles directly */
  allowedRoles?: LiquorRole[];
  /** Allow specific org types */
  allowedOrgTypes?: ReturnType<typeof getOrgTypeFromRole>[];
  /** Custom fallback component */
  fallback?: React.ReactNode;
}

/**
 * Role guard component for Liquor OS pages.
 * Wraps page content and blocks access for unauthorized roles.
 */
const LiquorRoleGuard = ({
  children,
  requiredPermissions,
  requiredAllPermissions,
  allowedRoles,
  allowedOrgTypes,
  fallback,
}: LiquorRoleGuardProps) => {
  const { liquorRole, loading } = useLiquorRole();
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = userRole === "super_admin";

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading access control...</div>
      </div>
    );
  }

  // Super admin bypasses all checks
  if (isSuperAdmin) return <>{children}</>;

  // No role assigned
  if (!liquorRole) {
    return fallback ? <>{fallback}</> : (
      <AccessDeniedCard
        title="No Role Assigned"
        description="You haven't been assigned a role in the Liquor OS. Please contact your administrator or complete onboarding."
        onBack={() => navigate("/industry/liquor/auth")}
        backLabel="Select Role"
      />
    );
  }

  // Check org type restriction
  if (allowedOrgTypes && allowedOrgTypes.length > 0) {
    const userOrgType = getOrgTypeFromRole(liquorRole);
    if (!userOrgType || !allowedOrgTypes.includes(userOrgType)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Organization Access Restricted"
          description={`This module is only available to ${allowedOrgTypes.join(", ")} organizations. Your role: ${LIQUOR_ROLE_LABELS[liquorRole]}.`}
          role={liquorRole}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  // Check specific roles
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(liquorRole)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Role Access Denied"
          description={`This module requires one of: ${allowedRoles.map(r => LIQUOR_ROLE_LABELS[r]).join(", ")}.`}
          role={liquorRole}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  // Check ANY permission
  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!hasAnyPermission(liquorRole, requiredPermissions)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Insufficient Permissions"
          description="You don't have the required permissions to access this module."
          role={liquorRole}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  // Check ALL permissions
  if (requiredAllPermissions && requiredAllPermissions.length > 0) {
    const hasAll = requiredAllPermissions.every(p => hasPermission(liquorRole, p));
    if (!hasAll) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Insufficient Permissions"
          description="You don't have all the required permissions to access this module."
          role={liquorRole}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  return <>{children}</>;
};

// Internal access denied card
const AccessDeniedCard = ({
  title,
  description,
  role,
  onBack,
  backLabel = "Go Back",
}: {
  title: string;
  description: string;
  role?: LiquorRole;
  onBack: () => void;
  backLabel?: string;
}) => (
  <div className="flex items-center justify-center min-h-[60vh] p-6">
    <Card className="max-w-md w-full border-destructive/30">
      <CardContent className="pt-8 pb-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        {role && (
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Current role: {LIQUOR_ROLE_LABELS[role]}
            </Badge>
          </div>
        )}
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default LiquorRoleGuard;
