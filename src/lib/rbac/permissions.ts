// RBAC Permission Matrix for RouteAce
// Defines all permissions and which roles have access to them

export type AppRole = 
  | "super_admin" 
  | "org_admin" 
  | "ops_manager" 
  | "finance_manager" 
  | "dispatcher" 
  | "driver" 
  | "customer"
  | "admin"
  | "operations"
  | "support"
  // Core System roles (internal only)
  | "internal_team"
  | "core_founder"
  | "core_cofounder"
  | "core_builder"
  | "core_product"
  | "core_engineer"
  | "core_analyst";

export type PermissionCategory = 
  | "platform"
  | "organization"
  | "users"
  | "dispatch"
  | "fleet"
  | "drivers"
  | "invoices"
  | "expenses"
  | "payouts"
  | "tracking"
  | "analytics"
  | "settings";

export type PermissionAction = 
  | "view"
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "export"
  | "sync";

export interface Permission {
  category: PermissionCategory;
  action: PermissionAction;
  description: string;
}

// Define all permissions
export const PERMISSIONS = {
  // Platform (Super Admin only)
  PLATFORM_VIEW: { category: "platform", action: "view", description: "View platform dashboard" },
  PLATFORM_MANAGE_ORGS: { category: "platform", action: "update", description: "Manage organizations" },
  PLATFORM_MANAGE_SUBSCRIPTIONS: { category: "platform", action: "update", description: "Manage subscriptions" },
  PLATFORM_SUSPEND_ORGS: { category: "platform", action: "delete", description: "Suspend organizations" },

  // Organization
  ORG_VIEW: { category: "organization", action: "view", description: "View organization details" },
  ORG_UPDATE: { category: "organization", action: "update", description: "Update organization settings" },
  ORG_MANAGE_SETTINGS: { category: "settings", action: "update", description: "Manage company settings" },

  // Users
  USERS_VIEW: { category: "users", action: "view", description: "View users" },
  USERS_CREATE: { category: "users", action: "create", description: "Create users" },
  USERS_UPDATE: { category: "users", action: "update", description: "Update users" },
  USERS_DELETE: { category: "users", action: "delete", description: "Delete users" },
  USERS_APPROVE: { category: "users", action: "approve", description: "Approve user registrations" },
  USERS_SUSPEND: { category: "users", action: "delete", description: "Suspend users" },

  // Dispatch/Trips
  DISPATCH_VIEW: { category: "dispatch", action: "view", description: "View dispatches" },
  DISPATCH_CREATE: { category: "dispatch", action: "create", description: "Create dispatches" },
  DISPATCH_UPDATE: { category: "dispatch", action: "update", description: "Update dispatches" },
  DISPATCH_DELETE: { category: "dispatch", action: "delete", description: "Delete dispatches" },
  DISPATCH_ASSIGN: { category: "dispatch", action: "update", description: "Assign drivers/vehicles" },
  DISPATCH_APPROVE: { category: "dispatch", action: "approve", description: "Approve dispatches" },
  DISPATCH_UPDATE_STATUS: { category: "dispatch", action: "update", description: "Update dispatch status" },

  // Fleet
  FLEET_VIEW: { category: "fleet", action: "view", description: "View fleet" },
  FLEET_CREATE: { category: "fleet", action: "create", description: "Add vehicles" },
  FLEET_UPDATE: { category: "fleet", action: "update", description: "Update vehicles" },
  FLEET_DELETE: { category: "fleet", action: "delete", description: "Remove vehicles" },

  // Drivers
  DRIVERS_VIEW: { category: "drivers", action: "view", description: "View drivers" },
  DRIVERS_CREATE: { category: "drivers", action: "create", description: "Add drivers" },
  DRIVERS_UPDATE: { category: "drivers", action: "update", description: "Update drivers" },
  DRIVERS_DELETE: { category: "drivers", action: "delete", description: "Remove drivers" },

  // Invoices
  INVOICES_VIEW: { category: "invoices", action: "view", description: "View invoices" },
  INVOICES_CREATE: { category: "invoices", action: "create", description: "Create invoices" },
  INVOICES_UPDATE: { category: "invoices", action: "update", description: "Update invoices" },
  INVOICES_DELETE: { category: "invoices", action: "delete", description: "Delete invoices" },
  INVOICES_APPROVE: { category: "invoices", action: "approve", description: "Approve invoices" },
  INVOICES_EXPORT: { category: "invoices", action: "export", description: "Export invoices" },
  INVOICES_SYNC: { category: "invoices", action: "sync", description: "Sync to Zoho" },

  // Expenses
  EXPENSES_VIEW: { category: "expenses", action: "view", description: "View expenses" },
  EXPENSES_CREATE: { category: "expenses", action: "create", description: "Create expenses" },
  EXPENSES_UPDATE: { category: "expenses", action: "update", description: "Update expenses" },
  EXPENSES_DELETE: { category: "expenses", action: "delete", description: "Delete expenses" },
  EXPENSES_APPROVE: { category: "expenses", action: "approve", description: "Approve expenses" },

  // Payouts
  PAYOUTS_VIEW: { category: "payouts", action: "view", description: "View payouts" },
  PAYOUTS_CREATE: { category: "payouts", action: "create", description: "Create payouts" },
  PAYOUTS_APPROVE_FINANCE: { category: "payouts", action: "approve", description: "Finance approval for payouts" },
  PAYOUTS_APPROVE_FINAL: { category: "payouts", action: "approve", description: "Final approval for payouts" },
  PAYOUTS_PROCESS: { category: "payouts", action: "update", description: "Process payouts" },

  // Tracking
  TRACKING_VIEW: { category: "tracking", action: "view", description: "View tracking" },
  TRACKING_VIEW_OWN: { category: "tracking", action: "view", description: "View own shipments only" },

  // Analytics
  ANALYTICS_VIEW: { category: "analytics", action: "view", description: "View analytics" },
  ANALYTICS_EXPORT: { category: "analytics", action: "export", description: "Export reports" },
  ANALYTICS_VIEW_FINANCIAL: { category: "analytics", action: "view", description: "View financial analytics" },
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// Role-Permission Matrix
// Defines exactly which permissions each role has
export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  // Super Admin - Platform level only
  super_admin: [
    "PLATFORM_VIEW",
    "PLATFORM_MANAGE_ORGS",
    "PLATFORM_MANAGE_SUBSCRIPTIONS",
    "PLATFORM_SUSPEND_ORGS",
    "ORG_VIEW",
    "USERS_VIEW",
    "ANALYTICS_VIEW",
  ],

  // Org Admin - Full organization control
  org_admin: [
    "ORG_VIEW",
    "ORG_UPDATE",
    "ORG_MANAGE_SETTINGS",
    "USERS_VIEW",
    "USERS_CREATE",
    "USERS_UPDATE",
    "USERS_DELETE",
    "USERS_APPROVE",
    "USERS_SUSPEND",
    "DISPATCH_VIEW",
    "DISPATCH_APPROVE",
    "FLEET_VIEW",
    "FLEET_CREATE",
    "FLEET_UPDATE",
    "FLEET_DELETE",
    "DRIVERS_VIEW",
    "DRIVERS_CREATE",
    "DRIVERS_UPDATE",
    "DRIVERS_DELETE",
    "INVOICES_VIEW",
    "INVOICES_APPROVE",
    "EXPENSES_VIEW",
    "EXPENSES_APPROVE",
    "PAYOUTS_VIEW",
    "PAYOUTS_APPROVE_FINAL", // Final approval for payouts
    "TRACKING_VIEW",
    "ANALYTICS_VIEW",
    "ANALYTICS_EXPORT",
    "ANALYTICS_VIEW_FINANCIAL",
  ],

  // Ops Manager - Full operations control
  ops_manager: [
    "ORG_VIEW",
    "DISPATCH_VIEW",
    "DISPATCH_CREATE",
    "DISPATCH_UPDATE",
    "DISPATCH_DELETE",
    "DISPATCH_ASSIGN",
    "DISPATCH_APPROVE",
    "DISPATCH_UPDATE_STATUS",
    "FLEET_VIEW",
    "FLEET_CREATE",
    "FLEET_UPDATE",
    "FLEET_DELETE",
    "DRIVERS_VIEW",
    "DRIVERS_CREATE",
    "DRIVERS_UPDATE",
    "DRIVERS_DELETE",
    "INVOICES_VIEW",
    "INVOICES_CREATE",
    "EXPENSES_VIEW",
    "EXPENSES_CREATE",
    "TRACKING_VIEW",
    "ANALYTICS_VIEW",
    "ANALYTICS_EXPORT",
    // EXPLICITLY NO: PAYOUTS_*, INVOICES_APPROVE, INVOICES_SYNC
  ],

  // Finance Manager - Finance focus, NO dispatch
  finance_manager: [
    "ORG_VIEW",
    "INVOICES_VIEW",
    "INVOICES_CREATE",
    "INVOICES_UPDATE",
    "INVOICES_APPROVE",
    "INVOICES_EXPORT",
    "INVOICES_SYNC",
    "EXPENSES_VIEW",
    "EXPENSES_UPDATE",
    "EXPENSES_APPROVE",
    "PAYOUTS_VIEW",
    "PAYOUTS_CREATE",
    "PAYOUTS_APPROVE_FINANCE", // First stage approval only
    "ANALYTICS_VIEW",
    "ANALYTICS_EXPORT",
    "ANALYTICS_VIEW_FINANCIAL",
    // EXPLICITLY NO: DISPATCH_*, FLEET_*, DRIVERS_UPDATE
  ],

  // Dispatcher - Trip execution
  dispatcher: [
    "DISPATCH_VIEW",
    "DISPATCH_CREATE",
    "DISPATCH_UPDATE",
    "DISPATCH_ASSIGN",
    "DRIVERS_VIEW",
    "FLEET_VIEW",
    "TRACKING_VIEW",
    // EXPLICITLY NO: INVOICES_*, PAYOUTS_*, EXPENSES_APPROVE
  ],

  // Driver - Execute trips only
  driver: [
    "DISPATCH_VIEW", // Own dispatches only
    "DISPATCH_UPDATE_STATUS", // Update own dispatch status
    "TRACKING_VIEW_OWN", // View own tracking
    // EXPLICITLY NO: Everything else
  ],

  // Customer - Read-only tracking
  customer: [
    "TRACKING_VIEW_OWN", // View own shipments only
    "INVOICES_VIEW", // View own invoices only
    // EXPLICITLY NO: Create/Update/Delete anything
  ],

  // Legacy roles (mapped to new structure)
  admin: [
    "ORG_VIEW",
    "ORG_UPDATE",
    "ORG_MANAGE_SETTINGS",
    "USERS_VIEW",
    "USERS_CREATE",
    "USERS_UPDATE",
    "USERS_DELETE",
    "USERS_APPROVE",
    "USERS_SUSPEND",
    "DISPATCH_VIEW",
    "DISPATCH_CREATE",
    "DISPATCH_UPDATE",
    "DISPATCH_DELETE",
    "DISPATCH_ASSIGN",
    "DISPATCH_APPROVE",
    "FLEET_VIEW",
    "FLEET_CREATE",
    "FLEET_UPDATE",
    "FLEET_DELETE",
    "DRIVERS_VIEW",
    "DRIVERS_CREATE",
    "DRIVERS_UPDATE",
    "DRIVERS_DELETE",
    "INVOICES_VIEW",
    "INVOICES_CREATE",
    "INVOICES_UPDATE",
    "INVOICES_DELETE",
    "INVOICES_APPROVE",
    "INVOICES_EXPORT",
    "INVOICES_SYNC",
    "EXPENSES_VIEW",
    "EXPENSES_CREATE",
    "EXPENSES_UPDATE",
    "EXPENSES_DELETE",
    "EXPENSES_APPROVE",
    "PAYOUTS_VIEW",
    "PAYOUTS_CREATE",
    "PAYOUTS_APPROVE_FINANCE",
    "PAYOUTS_APPROVE_FINAL",
    "PAYOUTS_PROCESS",
    "TRACKING_VIEW",
    "ANALYTICS_VIEW",
    "ANALYTICS_EXPORT",
    "ANALYTICS_VIEW_FINANCIAL",
  ],

  operations: [
    "DISPATCH_VIEW",
    "DISPATCH_CREATE",
    "DISPATCH_UPDATE",
    "TRACKING_VIEW",
    "INVOICES_VIEW",
    "INVOICES_CREATE",
    "EXPENSES_VIEW",
    "EXPENSES_CREATE",
  ],

  support: [
    "DISPATCH_VIEW",
    "TRACKING_VIEW",
    "INVOICES_VIEW",
    "USERS_VIEW",
  ],

  // Core System roles - No access to customer data via standard permissions
  // These roles use separate Core System dashboards
  internal_team: [],
  core_founder: [],
  core_cofounder: [],
  core_builder: [],
  core_product: [],
  core_engineer: [],
  core_analyst: [],
};

// Separation of Duties - Define conflicting permissions
export const SEPARATION_OF_DUTIES: Array<[PermissionKey, PermissionKey]> = [
  // Finance cannot dispatch
  ["PAYOUTS_APPROVE_FINANCE", "DISPATCH_CREATE"],
  ["PAYOUTS_APPROVE_FINANCE", "DISPATCH_ASSIGN"],
  ["INVOICES_SYNC", "DISPATCH_CREATE"],
  
  // Ops cannot process payouts
  ["DISPATCH_ASSIGN", "PAYOUTS_PROCESS"],
  ["DISPATCH_APPROVE", "PAYOUTS_APPROVE_FINAL"],
];

// Check if a role has a specific permission
export function hasPermission(role: AppRole | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  const rolePermissions = ROLE_PERMISSIONS[role];
  if (!rolePermissions) return false;
  return rolePermissions.includes(permission);
}

// Check if a role has any of the specified permissions
export function hasAnyPermission(role: AppRole | null | undefined, permissions: PermissionKey[]): boolean {
  if (!role) return false;
  return permissions.some(p => hasPermission(role, p));
}

// Check if a role has all of the specified permissions
export function hasAllPermissions(role: AppRole | null | undefined, permissions: PermissionKey[]): boolean {
  if (!role) return false;
  return permissions.every(p => hasPermission(role, p));
}

// Get all permissions for a role
export function getRolePermissions(role: AppRole | null | undefined): PermissionKey[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] || [];
}

// Check for separation of duties violation
export function checkSeparationOfDuties(role: AppRole): { isViolated: boolean; conflicts: string[] } {
  const rolePermissions = getRolePermissions(role);
  const conflicts: string[] = [];

  for (const [perm1, perm2] of SEPARATION_OF_DUTIES) {
    if (rolePermissions.includes(perm1) && rolePermissions.includes(perm2)) {
      conflicts.push(`${perm1} conflicts with ${perm2}`);
    }
  }

  return {
    isViolated: conflicts.length > 0,
    conflicts
  };
}
