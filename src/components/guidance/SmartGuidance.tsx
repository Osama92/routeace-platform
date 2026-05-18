import React from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, HelpCircle, Lock, Info } from "lucide-react";
import usePermissions from "@/hooks/usePermissions";
import type { PermissionKey, AppRole } from "@/lib/rbac/permissions";

interface SmartGuidanceProps {
  permission?: PermissionKey;
  action: string;
  requiredRole?: AppRole | AppRole[];
  navigateTo?: string;
  navigateLabel?: string;
  children?: React.ReactNode;
}

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Organization Admin",
  ops_manager: "Operations Manager",
  finance_manager: "Finance Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  customer: "Customer",
  admin: "Admin",
  operations: "Operations",
  support: "Support",
  // Core System roles (internal only)
  internal_team: "Internal Team",
  core_founder: "Founder",
  core_cofounder: "Co-Founder",
  core_builder: "Builder",
  core_product: "Product Manager",
  core_engineer: "Engineer",
  core_analyst: "Data Analyst"
};

const ROLE_ROUTES: Record<AppRole, string> = {
  super_admin: "/super-admin",
  org_admin: "/org-admin",
  ops_manager: "/ops-manager",
  finance_manager: "/finance-manager",
  dispatcher: "/dispatch",
  driver: "/driver-dashboard",
  customer: "/customer-portal",
  admin: "/dashboard",
  operations: "/dispatch",
  support: "/tracking",
  // Core System routes (internal only)
  internal_team: "/core/dashboard",
  core_founder: "/core/dashboard",
  core_cofounder: "/core/dashboard",
  core_builder: "/core/dashboard",
  core_product: "/core/dashboard",
  core_engineer: "/core/dashboard",
  core_analyst: "/core/intelligence"
};

/**
 * Smart Guidance Component - Section H
 * Shows contextual help when user attempts unavailable actions
 */
export function SmartGuidance({
  permission,
  action,
  requiredRole,
  navigateTo,
  navigateLabel,
  children
}: SmartGuidanceProps) {
  const navigate = useNavigate();
  const { can, role } = usePermissions();

  // If user has permission, render children
  if (permission && can(permission)) {
    return <>{children}</>;
  }

  // If no permission required, render children
  if (!permission && !requiredRole) {
    return <>{children}</>;
  }

  // Check role-based access
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (role && roles.includes(role as AppRole)) {
      return <>{children}</>;
    }
  }

  // Determine where to redirect
  const targetRole = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
  const targetRoute = navigateTo || (targetRole ? ROLE_ROUTES[targetRole] : undefined);
  const targetLabel = navigateLabel || (targetRole ? `Go to ${ROLE_LABELS[targetRole]} Portal` : "Go to appropriate section");

  return (
    <Alert className="border-yellow-500/50 bg-yellow-500/10">
      <Lock className="h-4 w-4 text-yellow-500" />
      <AlertTitle className="text-yellow-600">Action Not Available</AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        <p className="text-sm text-muted-foreground">
          You cannot <strong>{action}</strong> with your current role.
        </p>
        
        {requiredRole && (
          <p className="text-sm">
            <span className="text-muted-foreground">Required role: </span>
            <span className="font-medium text-foreground">
              {Array.isArray(requiredRole) 
                ? requiredRole.map(r => ROLE_LABELS[r]).join(" or ")
                : ROLE_LABELS[requiredRole]
              }
            </span>
          </p>
        )}

        {role && (
          <p className="text-sm">
            <span className="text-muted-foreground">Your current role: </span>
            <span className="font-medium text-primary capitalize">
              {ROLE_LABELS[role as AppRole] || role}
            </span>
          </p>
        )}

        {targetRoute && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => navigate(targetRoute)}
          >
            {targetLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline guidance tooltip for disabled buttons
 */
export function GuidanceTooltip({
  action,
  requiredRole,
  children
}: {
  action: string;
  requiredRole?: AppRole | AppRole[];
  children: React.ReactNode;
}) {
  const { role } = usePermissions();
  
  const targetRole = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
  const roleLabel = targetRole ? ROLE_LABELS[targetRole] : "an authorized user";

  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-64">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Cannot {action}</p>
            <p className="text-muted-foreground">Contact {roleLabel} to perform this action.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Permission denied full-page component with guidance
 */
export function PermissionDeniedWithGuidance({
  action,
  requiredRole,
  currentRole
}: {
  action: string;
  requiredRole?: AppRole | AppRole[];
  currentRole?: string | null;
}) {
  const navigate = useNavigate();
  const targetRole = Array.isArray(requiredRole) ? requiredRole[0] : requiredRole;
  const targetRoute = targetRole ? ROLE_ROUTES[targetRole] : "/dashboard";

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-yellow-500" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
      <p className="text-muted-foreground max-w-md mb-4">
        You don't have permission to <strong>{action}</strong>.
      </p>
      
      <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md">
        {requiredRole && (
          <p className="text-sm mb-2">
            <span className="text-muted-foreground">Required: </span>
            <span className="font-medium">
              {Array.isArray(requiredRole) 
                ? requiredRole.map(r => ROLE_LABELS[r]).join(", ")
                : ROLE_LABELS[requiredRole]
              }
            </span>
          </p>
        )}
        {currentRole && (
          <p className="text-sm">
            <span className="text-muted-foreground">Your role: </span>
            <span className="font-medium text-primary capitalize">
              {ROLE_LABELS[currentRole as AppRole] || currentRole}
            </span>
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go Back
        </Button>
        <Button onClick={() => navigate(targetRoute)}>
          Go to Your Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default SmartGuidance;
