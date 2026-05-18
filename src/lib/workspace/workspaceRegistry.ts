/**
 * RouteAce Workspace Registry
 * Central source of truth for all OS products, their sidebar configs,
 * default landing routes, and access rules.
 */

export type WorkspaceId =
  | "logistics"
  | "industry"
  | "portodash"
  | "trade-finance"
  | "distribution-exchange"
  | "commerce-identity"
  | "embedded-commerce"
  | "control-tower"
  | "partner-console"
  | "core-internal";

export interface WorkspaceDefinition {
  id: WorkspaceId;
  name: string;
  shortName: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color token
  defaultRoute: string;
  /** Roles that can access this workspace */
  allowedRoles: string[];
  /** If true, only super_admin or internal_team can see */
  internalOnly?: boolean;
  /** Route prefix for breadcrumb context */
  routePrefix: string;
  /** Sidebar group definitions */
  sidebarGroups: WorkspaceSidebarGroup[];
}

export interface WorkspaceSidebarGroup {
  title: string;
  icon: string;
  defaultOpen?: boolean;
  items: WorkspaceSidebarItem[];
}

export interface WorkspaceSidebarItem {
  name: string;
  href: string;
  icon: string;
  roles?: string[];
}

// ── Workspace Definitions ─────────────────────────────────────────

export const WORKSPACE_REGISTRY: Record<WorkspaceId, WorkspaceDefinition> = {
  logistics: {
    id: "logistics",
    name: "Logistics OS",
    shortName: "Logistics",
    description: "Fleet, dispatch, and transport operations",
    icon: "Truck",
    color: "emerald",
    defaultRoute: "/",
    routePrefix: "/",
    allowedRoles: ["admin", "operations", "support", "dispatcher", "driver", "super_admin", "org_admin", "ops_manager", "finance_manager", "customer"],
    sidebarGroups: [], // uses existing Sidebar.tsx
  },
  industry: {
    id: "industry",
    name: "Industry OS",
    shortName: "Industry",
    description: "Sales, distribution, and vertical commerce",
    icon: "Factory",
    color: "blue",
    defaultRoute: "/sales/dashboard",
    routePrefix: "/sales",
    allowedRoles: ["admin", "super_admin", "org_admin", "ops_manager"],
    sidebarGroups: [
      {
        title: "Sales Workspace",
        icon: "Target",
        defaultOpen: true,
        items: [
          { name: "Dashboard", href: "/sales/dashboard", icon: "LayoutDashboard" },
          { name: "Leads", href: "/sales/leads", icon: "UserPlus" },
          { name: "Pipeline", href: "/sales/pipeline", icon: "GitBranch" },
          { name: "Accounts", href: "/sales/accounts", icon: "Building2" },
          { name: "Activities", href: "/sales/activities", icon: "Activity" },
        ],
      },
      {
        title: "Catalog & Pricing",
        icon: "Tag",
        items: [
          { name: "Quotes", href: "/sales/quotes", icon: "FileText" },
        ],
      },
      {
        title: "Forecast & Performance",
        icon: "TrendingUp",
        items: [
          { name: "Forecast", href: "/sales/forecast", icon: "BarChart3" },
        ],
      },
    ],
  },
  portodash: {
    id: "portodash",
    name: "PortoDash ExportTech",
    shortName: "PortoDash",
    description: "Export trade, compliance, and shipment orchestration",
    icon: "Ship",
    color: "violet",
    defaultRoute: "/portodash",
    routePrefix: "/portodash",
    allowedRoles: ["admin", "super_admin"],
    sidebarGroups: [
      {
        title: "Export Workspace",
        icon: "Globe",
        defaultOpen: true,
        items: [
          { name: "Dashboard", href: "/portodash", icon: "LayoutDashboard" },
          { name: "Compliance Monitor", href: "/portodash/compliance", icon: "Shield" },
          { name: "Trade Data", href: "/portodash/trade-data", icon: "Database" },
          { name: "Commerce Identity", href: "/portodash/commerce-identity", icon: "Fingerprint" },
        ],
      },
    ],
  },
  "trade-finance": {
    id: "trade-finance",
    name: "Trade Finance Network",
    shortName: "Trade Finance",
    description: "Credit, financing, and trade settlement",
    icon: "Landmark",
    color: "amber",
    defaultRoute: "/trade-finance",
    routePrefix: "/trade-finance",
    allowedRoles: ["admin", "super_admin", "finance_manager"],
    sidebarGroups: [
      {
        title: "Finance Hub",
        icon: "Wallet",
        defaultOpen: true,
        items: [
          { name: "Applications", href: "/trade-finance", icon: "FileText" },
          { name: "Credit Decisions", href: "/trade-finance/decisions", icon: "CheckCircle" },
        ],
      },
    ],
  },
  "distribution-exchange": {
    id: "distribution-exchange",
    name: "Distribution Exchange",
    shortName: "Exchange",
    description: "Supply-demand marketplace and logistics capacity",
    icon: "ArrowLeftRight",
    color: "orange",
    defaultRoute: "/distribution-exchange",
    routePrefix: "/distribution-exchange",
    allowedRoles: ["admin", "super_admin"],
    sidebarGroups: [],
  },
  "commerce-identity": {
    id: "commerce-identity",
    name: "Commerce Identity & Trust",
    shortName: "Trust Network",
    description: "Identity verification and trust scoring",
    icon: "Fingerprint",
    color: "teal",
    defaultRoute: "/commerce-identity",
    routePrefix: "/commerce-identity",
    allowedRoles: ["admin", "super_admin"],
    sidebarGroups: [],
  },
  "embedded-commerce": {
    id: "embedded-commerce",
    name: "Embedded Commerce Layer",
    shortName: "APIs & SDKs",
    description: "Developer APIs, widgets, and embedded tools",
    icon: "Code",
    color: "slate",
    defaultRoute: "/embedded-commerce",
    routePrefix: "/embedded-commerce",
    allowedRoles: ["admin", "super_admin"],
    sidebarGroups: [],
  },
  "control-tower": {
    id: "control-tower",
    name: "Infrastructure Control Tower",
    shortName: "Control Tower",
    description: "Ecosystem governance and platform health - RouteAce Core internal only",
    icon: "Radio",
    color: "red",
    defaultRoute: "/product-control-tower",
    routePrefix: "/product-control-tower",
    internalOnly: true,
    allowedRoles: ["core_founder", "core_cofounder", "core_builder", "core_engineer", "internal_team"] as any,
    sidebarGroups: [
      {
        title: "Governance",
        icon: "Shield",
        defaultOpen: true,
        items: [
          { name: "Platform Registry", href: "/product-control-tower", icon: "Server" },
          { name: "Feature Ownership", href: "/product-control-tower/features", icon: "Layers" },
          { name: "Data Exchange", href: "/product-control-tower/data-exchange", icon: "ArrowLeftRight" },
        ],
      },
    ],
  },
  "partner-console": {
    id: "partner-console",
    name: "Partner Console",
    shortName: "Partners",
    description: "Reseller management and downstream provisioning",
    icon: "Handshake",
    color: "pink",
    defaultRoute: "/partner-console",
    routePrefix: "/partner-console",
    internalOnly: true,
    allowedRoles: ["core_founder", "core_cofounder", "internal_team"] as any,
    sidebarGroups: [
      {
        title: "Partner Hub",
        icon: "Users",
        defaultOpen: true,
        items: [
          { name: "Overview", href: "/partner-console", icon: "LayoutDashboard" },
          { name: "Customers", href: "/partner-console/customers", icon: "Building2" },
          { name: "Revenue", href: "/partner-console/revenue", icon: "TrendingUp" },
          { name: "API Products", href: "/partner-console/api-products", icon: "Code" },
        ],
      },
    ],
  },
  "core-internal": {
    id: "core-internal",
    name: "RouteAce Core",
    shortName: "Core",
    description: "Internal team workspace",
    icon: "Crown",
    color: "yellow",
    defaultRoute: "/core",
    routePrefix: "/core",
    allowedRoles: ["internal_team", "core_founder", "core_builder", "core_product", "core_engineer"],
    internalOnly: true,
    sidebarGroups: [],
  },
};

/**
 * Internal team roles - RouteAce Core staff. Tenant super_admin is NOT included.
 */
const INTERNAL_TEAM_ROLES = [
  "internal_team",
  "core_founder",
  "core_cofounder",
  "core_builder",
  "core_product",
  "core_engineer",
  "core_analyst",
];

export function isInternalTeamRole(role: string | null | undefined): boolean {
  if (!role) return false;
  return INTERNAL_TEAM_ROLES.includes(role) || role.startsWith("core_");
}

/**
 * Get workspaces a user can access based on role.
 * `internalOnly` workspaces are restricted to RouteAce Core staff - tenant
 * super_admins cannot see them.
 */
export function getAccessibleWorkspaces(
  userRole: string | null,
  isSuperAdmin: boolean
): WorkspaceDefinition[] {
  const internal = isInternalTeamRole(userRole);
  return Object.values(WORKSPACE_REGISTRY).filter((ws) => {
    if (ws.internalOnly) return internal;
    if (isSuperAdmin) return true;
    return userRole ? ws.allowedRoles.includes(userRole) : false;
  });
}

/**
 * Resolve which workspace a route belongs to
 */
export function resolveWorkspaceFromRoute(pathname: string): WorkspaceId {
  if (pathname.startsWith("/sales")) return "industry";
  if (pathname.startsWith("/portodash")) return "portodash";
  if (pathname.startsWith("/trade-finance")) return "trade-finance";
  if (pathname.startsWith("/distribution-exchange")) return "distribution-exchange";
  if (pathname.startsWith("/commerce-identity")) return "commerce-identity";
  if (pathname.startsWith("/embedded-commerce")) return "embedded-commerce";
  if (pathname.startsWith("/product-control-tower")) return "control-tower";
  if (pathname.startsWith("/partner-console")) return "partner-console";
  if (pathname.startsWith("/core")) return "core-internal";
  return "logistics";
}
