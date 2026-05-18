// RBAC Permission Middleware for Edge Functions
// Validates user permissions before executing API requests

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

// Permission types
type PermissionKey = 
  | "PLATFORM_VIEW" | "PLATFORM_MANAGE_ORGS" | "PLATFORM_MANAGE_SUBSCRIPTIONS" | "PLATFORM_SUSPEND_ORGS"
  | "ORG_VIEW" | "ORG_UPDATE" | "ORG_MANAGE_SETTINGS"
  | "USERS_VIEW" | "USERS_CREATE" | "USERS_UPDATE" | "USERS_DELETE" | "USERS_APPROVE" | "USERS_SUSPEND"
  | "DISPATCH_VIEW" | "DISPATCH_CREATE" | "DISPATCH_UPDATE" | "DISPATCH_DELETE" | "DISPATCH_ASSIGN" | "DISPATCH_APPROVE" | "DISPATCH_UPDATE_STATUS"
  | "FLEET_VIEW" | "FLEET_CREATE" | "FLEET_UPDATE" | "FLEET_DELETE"
  | "DRIVERS_VIEW" | "DRIVERS_CREATE" | "DRIVERS_UPDATE" | "DRIVERS_DELETE"
  | "INVOICES_VIEW" | "INVOICES_CREATE" | "INVOICES_UPDATE" | "INVOICES_DELETE" | "INVOICES_APPROVE" | "INVOICES_EXPORT" | "INVOICES_SYNC"
  | "EXPENSES_VIEW" | "EXPENSES_CREATE" | "EXPENSES_UPDATE" | "EXPENSES_DELETE" | "EXPENSES_APPROVE"
  | "PAYOUTS_VIEW" | "PAYOUTS_CREATE" | "PAYOUTS_APPROVE_FINANCE" | "PAYOUTS_APPROVE_FINAL" | "PAYOUTS_PROCESS"
  | "TRACKING_VIEW" | "TRACKING_VIEW_OWN"
  | "ANALYTICS_VIEW" | "ANALYTICS_EXPORT" | "ANALYTICS_VIEW_FINANCIAL";

type AppRole = "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "dispatcher" | "driver" | "customer" | "admin" | "operations" | "support";

// Role-Permission Matrix (server-side copy for validation)
const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  super_admin: [
    "PLATFORM_VIEW", "PLATFORM_MANAGE_ORGS", "PLATFORM_MANAGE_SUBSCRIPTIONS", "PLATFORM_SUSPEND_ORGS",
    "ORG_VIEW", "USERS_VIEW", "ANALYTICS_VIEW"
  ],
  org_admin: [
    "ORG_VIEW", "ORG_UPDATE", "ORG_MANAGE_SETTINGS",
    "USERS_VIEW", "USERS_CREATE", "USERS_UPDATE", "USERS_DELETE", "USERS_APPROVE", "USERS_SUSPEND",
    "DISPATCH_VIEW", "DISPATCH_APPROVE",
    "FLEET_VIEW", "FLEET_CREATE", "FLEET_UPDATE", "FLEET_DELETE",
    "DRIVERS_VIEW", "DRIVERS_CREATE", "DRIVERS_UPDATE", "DRIVERS_DELETE",
    "INVOICES_VIEW", "INVOICES_APPROVE",
    "EXPENSES_VIEW", "EXPENSES_APPROVE",
    "PAYOUTS_VIEW", "PAYOUTS_APPROVE_FINAL",
    "TRACKING_VIEW", "ANALYTICS_VIEW", "ANALYTICS_EXPORT", "ANALYTICS_VIEW_FINANCIAL"
  ],
  ops_manager: [
    "ORG_VIEW", "DISPATCH_VIEW", "DISPATCH_CREATE", "DISPATCH_UPDATE", "DISPATCH_ASSIGN", "DISPATCH_APPROVE",
    "FLEET_VIEW", "FLEET_UPDATE", "DRIVERS_VIEW", "DRIVERS_UPDATE", "TRACKING_VIEW", "ANALYTICS_VIEW"
  ],
  finance_manager: [
    "ORG_VIEW",
    "INVOICES_VIEW", "INVOICES_CREATE", "INVOICES_UPDATE", "INVOICES_APPROVE", "INVOICES_EXPORT", "INVOICES_SYNC",
    "EXPENSES_VIEW", "EXPENSES_UPDATE", "EXPENSES_APPROVE",
    "PAYOUTS_VIEW", "PAYOUTS_CREATE", "PAYOUTS_APPROVE_FINANCE",
    "ANALYTICS_VIEW", "ANALYTICS_EXPORT", "ANALYTICS_VIEW_FINANCIAL"
  ],
  dispatcher: [
    "DISPATCH_VIEW", "DISPATCH_CREATE", "DISPATCH_UPDATE", "DISPATCH_ASSIGN",
    "DRIVERS_VIEW", "FLEET_VIEW", "TRACKING_VIEW"
  ],
  driver: ["DISPATCH_VIEW", "DISPATCH_UPDATE_STATUS", "TRACKING_VIEW_OWN"],
  customer: ["TRACKING_VIEW_OWN", "INVOICES_VIEW"],
  admin: [
    "ORG_VIEW", "ORG_UPDATE", "ORG_MANAGE_SETTINGS",
    "USERS_VIEW", "USERS_CREATE", "USERS_UPDATE", "USERS_DELETE", "USERS_APPROVE", "USERS_SUSPEND",
    "DISPATCH_VIEW", "DISPATCH_CREATE", "DISPATCH_UPDATE", "DISPATCH_DELETE", "DISPATCH_ASSIGN", "DISPATCH_APPROVE",
    "FLEET_VIEW", "FLEET_CREATE", "FLEET_UPDATE", "FLEET_DELETE",
    "DRIVERS_VIEW", "DRIVERS_CREATE", "DRIVERS_UPDATE", "DRIVERS_DELETE",
    "INVOICES_VIEW", "INVOICES_CREATE", "INVOICES_UPDATE", "INVOICES_DELETE", "INVOICES_APPROVE", "INVOICES_EXPORT", "INVOICES_SYNC",
    "EXPENSES_VIEW", "EXPENSES_CREATE", "EXPENSES_UPDATE", "EXPENSES_DELETE", "EXPENSES_APPROVE",
    "PAYOUTS_VIEW", "PAYOUTS_CREATE", "PAYOUTS_APPROVE_FINANCE", "PAYOUTS_APPROVE_FINAL", "PAYOUTS_PROCESS",
    "TRACKING_VIEW", "ANALYTICS_VIEW", "ANALYTICS_EXPORT", "ANALYTICS_VIEW_FINANCIAL"
  ],
  operations: ["DISPATCH_VIEW", "DISPATCH_CREATE", "DISPATCH_UPDATE", "TRACKING_VIEW", "INVOICES_VIEW", "INVOICES_CREATE", "EXPENSES_VIEW", "EXPENSES_CREATE"],
  support: ["DISPATCH_VIEW", "TRACKING_VIEW", "INVOICES_VIEW", "USERS_VIEW"]
};

interface AuthResult {
  user: any;
  role: AppRole | null;
  organizationId: string | null;
}

interface PermissionCheckResult {
  allowed: boolean;
  user?: any;
  role?: AppRole;
  organizationId?: string;
  error?: string;
}

/**
 * Validate JWT and get user info
 */
export async function validateAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.replace("Bearer ", "");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    throw new Error("Invalid token");
  }

  // Get user role
  const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  // Get organization membership
  const { data: orgData } = await supabaseAdmin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return {
    user,
    role: roleData?.role as AppRole || null,
    organizationId: orgData?.organization_id || null
  };
}

/**
 * Check if user has required permission(s)
 */
export function hasPermission(role: AppRole | null, permission: PermissionKey): boolean {
  if (!role) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions?.includes(permission) || false;
}

/**
 * Check if user has any of the required permissions
 */
export function hasAnyPermission(role: AppRole | null, permissions: PermissionKey[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

/**
 * Main middleware function - validates auth and permission
 */
export async function checkPermission(
  req: Request,
  requiredPermission: PermissionKey | PermissionKey[]
): Promise<PermissionCheckResult> {
  try {
    const { user, role, organizationId } = await validateAuth(req);

    const permissions = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    const allowed = hasAnyPermission(role, permissions);

    if (!allowed) {
      // Log permission denial
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin.from("audit_logs").insert({
        action: "permission_denied",
        table_name: "api_middleware",
        record_id: req.url,
        user_id: user.id,
        user_email: user.email,
        new_data: {
          required_permissions: permissions,
          user_role: role,
          endpoint: new URL(req.url).pathname,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      });

      return {
        allowed: false,
        error: `Permission denied. Required: ${permissions.join(" or ")}`
      };
    }

    return {
      allowed: true,
      user,
      role: role!,
      organizationId: organizationId || undefined
    };
  } catch (error) {
    return {
      allowed: false,
      error: error instanceof Error ? error.message : "Authentication failed"
    };
  }
}

/**
 * Multi-tenant isolation check - ensures user can only access their org's data
 */
export async function checkOrgAccess(
  req: Request,
  targetOrgId: string
): Promise<PermissionCheckResult> {
  try {
    const { user, role, organizationId } = await validateAuth(req);

    // Super admins can access all orgs
    if (role === "super_admin") {
      return { allowed: true, user, role, organizationId: targetOrgId };
    }

    // Regular users can only access their own org
    if (organizationId !== targetOrgId) {
      // Log cross-org access attempt
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin.from("audit_logs").insert({
        action: "cross_org_access_denied",
        table_name: "api_middleware",
        record_id: targetOrgId,
        user_id: user.id,
        user_email: user.email,
        new_data: {
          user_org: organizationId,
          target_org: targetOrgId,
          endpoint: new URL(req.url).pathname,
          method: req.method,
          timestamp: new Date().toISOString()
        }
      });

      return {
        allowed: false,
        error: "Access denied: Cannot access data from another organization"
      };
    }

    return { allowed: true, user, role: role!, organizationId };
  } catch (error) {
    return {
      allowed: false,
      error: error instanceof Error ? error.message : "Authentication failed"
    };
  }
}

/**
 * Create permission denied response
 */
export function permissionDeniedResponse(message: string = "Permission denied"): Response {
  return new Response(
    JSON.stringify({ error: message, code: "PERMISSION_DENIED" }),
    { status: 403, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message: string = "Unauthorized"): Response {
  return new Response(
    JSON.stringify({ error: message, code: "UNAUTHORIZED" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}
