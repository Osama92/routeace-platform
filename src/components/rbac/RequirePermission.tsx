import React from "react";
import usePermissions from "@/hooks/usePermissions";
import { type PermissionKey, type AppRole } from "@/lib/rbac/permissions";

interface RequirePermissionProps {
  permission?: PermissionKey;
  permissions?: PermissionKey[];
  requireAll?: boolean;
  roles?: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onDenied?: () => void;
}

/**
 * Component wrapper that renders children only if user has required permission(s)
 * 
 * Usage:
 * <RequirePermission permission="DISPATCH_CREATE">
 *   <CreateDispatchButton />
 * </RequirePermission>
 * 
 * <RequirePermission permissions={["INVOICES_APPROVE", "INVOICES_SYNC"]} requireAll>
 *   <SyncToZohoButton />
 * </RequirePermission>
 * 
 * <RequirePermission roles={["org_admin", "super_admin"]}>
 *   <AdminPanel />
 * </RequirePermission>
 */
export function RequirePermission({
  permission,
  permissions,
  requireAll = false,
  roles,
  children,
  fallback = null,
  onDenied,
}: RequirePermissionProps) {
  const { can, canAny, canAll, role, isSuperAdmin } = usePermissions();

  // CRITICAL: Super Admin bypasses ALL permission checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let hasAccess = false;

  // Check by roles first if specified
  if (roles && roles.length > 0) {
    hasAccess = role ? roles.includes(role as AppRole) : false;
  }
  // Check by single permission
  else if (permission) {
    hasAccess = can(permission);
  }
  // Check by multiple permissions
  else if (permissions && permissions.length > 0) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  }
  // No permissions specified = allow access
  else {
    hasAccess = true;
  }

  if (!hasAccess) {
    onDenied?.();
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleGateProps {
  allowedRoles: AppRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Simple role-based gate component
 */
export function RoleGate({ allowedRoles, children, fallback = null }: RoleGateProps) {
  const { role, isSuperAdmin } = usePermissions();

  // CRITICAL: Super Admin bypasses ALL role checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  if (!role || !allowedRoles.includes(role as AppRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface PermissionDeniedProps {
  permission?: PermissionKey;
  message?: string;
}

/**
 * Standard permission denied message
 */
export function PermissionDenied({ permission, message }: PermissionDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Access Denied</h3>
      <p className="text-muted-foreground max-w-md">
        {message || "You don't have permission to access this feature. Contact your administrator if you believe this is an error."}
      </p>
      {permission && (
        <p className="text-xs text-muted-foreground mt-4">
          Required permission: <code className="bg-muted px-1 py-0.5 rounded">{permission}</code>
        </p>
      )}
    </div>
  );
}

/**
 * HOC to wrap a component with permission check
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  permission: PermissionKey,
  FallbackComponent?: React.ComponentType
) {
  return function PermissionWrappedComponent(props: P) {
    const { can } = usePermissions();

    if (!can(permission)) {
      return FallbackComponent ? <FallbackComponent /> : <PermissionDenied permission={permission} />;
    }

    return <WrappedComponent {...props} />;
  };
}

/**
 * HOC to wrap a component with role check
 */
export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  allowedRoles: AppRole[],
  FallbackComponent?: React.ComponentType
) {
  return function RoleWrappedComponent(props: P) {
    const { role } = usePermissions();

    if (!role || !allowedRoles.includes(role as AppRole)) {
      return FallbackComponent ? <FallbackComponent /> : <PermissionDenied />;
    }

    return <WrappedComponent {...props} />;
  };
}

export default RequirePermission;
