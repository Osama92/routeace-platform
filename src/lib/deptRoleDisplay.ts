/**
 * Department-aware role display layer.
 *
 * IMPORTANT: This is a UI-only translation. The DB role values
 * (super_admin, org_admin, ops_manager, etc.) and all RBAC/RLS logic
 * remain unchanged. We only swap the human-readable label shown to
 * users when their tenant operates in LOGISTICS_DEPARTMENT mode.
 */

export type RoleDisplay = {
  title: string;
  description: string;
  badge: string;
};

export const DEPT_ROLE_DISPLAY: Record<string, RoleDisplay> = {
  super_admin: {
    title: "Head of Logistics",
    description:
      "Director-level authority. Final approval on all logistics operations, budget, and vendor contracts.",
    badge: "Head of Logistics",
  },
  admin: {
    title: "Director of Logistics",
    description: "Strategic oversight. Manages department-wide operations and approvals.",
    badge: "Director, Logistics",
  },
  org_admin: {
    title: "Logistics Manager",
    description:
      "Runs daily logistics operations. Approves dispatches, vendor invoices, and team actions.",
    badge: "Logistics Manager",
  },
  ops_manager: {
    title: "Outbound & Inbound Officer",
    description:
      "Manages outbound dispatches and inbound receipts. Coordinates warehouse-to-delivery hand-offs.",
    badge: "Ops Officer",
  },
  fleet_manager: {
    title: "Fleet & Transport Supervisor",
    description: "Oversees vehicles, drivers, and 3PL carrier assignments.",
    badge: "Fleet Supervisor",
  },
  finance_manager: {
    title: "Finance Controller (Logistics)",
    description:
      "Reviews and approves vendor invoices, tracks logistics cost centre spend.",
    badge: "Finance Controller",
  },
  dispatcher: {
    title: "Dispatch Coordinator",
    description: "Creates and manages delivery orders, assigns carriers.",
    badge: "Dispatch Coordinator",
  },
  driver: {
    title: "Driver / Rider",
    description: "Executes deliveries. Mobile app access only.",
    badge: "Driver",
  },
  customer: {
    title: "Sales Department",
    description:
      "Read-only access. Tracks orders, delivery timelines, and OTD metrics.",
    badge: "Sales Dept",
  },
  operations: {
    title: "Operations Staff",
    description: "General operations access for logistics department staff.",
    badge: "Operations",
  },
  transporter: {
    title: "3PL Transporter",
    description: "External carrier. Accepts job assignments, confirms pickup, uploads POD.",
    badge: "3PL Transporter",
  },
};

function formatFallback(role: string): string {
  return role
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRoleDisplay(
  role: string | null | undefined,
  tenantMode: string | null | undefined,
): RoleDisplay {
  const r = (role || "").toLowerCase();
  if (tenantMode === "LOGISTICS_DEPARTMENT" && DEPT_ROLE_DISPLAY[r]) {
    return DEPT_ROLE_DISPLAY[r];
  }
  const formatted = formatFallback(r || "user");
  return { title: formatted, description: "", badge: formatted };
}
