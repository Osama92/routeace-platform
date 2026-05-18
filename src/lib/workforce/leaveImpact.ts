import { supabase } from "@/integrations/supabase/client";

export type ImpactLevel = "low" | "medium" | "high";

export interface ImpactReport {
  level: ImpactLevel;
  activeDispatches: number;
  openTickets: number;
  driverTrips: number;
  reasons: string[];
  resources: Array<{
    type: "dispatch" | "support_ticket" | "driver_trip";
    id: string;
    label: string;
  }>;
}

interface ComputeArgs {
  userId: string;
  userRole: string | null;
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

/**
 * Computes the operational impact of a leave request by scanning
 * dispatches, tickets and driver trips overlapping the leave window.
 *
 * Read-only - no mutations.
 */
export async function computeLeaveImpact({
  userId,
  userRole,
  startDate,
  endDate,
}: ComputeArgs): Promise<ImpactReport> {
  const reasons: string[] = [];
  const resources: ImpactReport["resources"] = [];

  // 1. Dispatches assigned to or created by this user that overlap the window
  let activeDispatches = 0;
  try {
    const driverIds = await driverIdsForUser(userId);
    const orFilter =
      driverIds !== "00000000-0000-0000-0000-000000000000"
        ? `created_by.eq.${userId},driver_id.in.(${driverIds})`
        : `created_by.eq.${userId}`;

    const { data: dispatches } = await supabase
      .from("dispatches")
      .select("id, dispatch_number, scheduled_pickup, scheduled_delivery, status, driver_id, created_by")
      .or(orFilter)
      .not("status", "in", "(delivered,closed,cancelled,settled)")
      .lte("scheduled_pickup", endDate + "T23:59:59")
      .gte("scheduled_delivery", startDate + "T00:00:00")
      .limit(50);

    activeDispatches = dispatches?.length ?? 0;
    dispatches?.forEach((d: any) => {
      resources.push({
        type: "dispatch",
        id: d.id,
        label: d.dispatch_number || `Dispatch ${d.id.slice(0, 8)}`,
      });
    });
  } catch {
    // table query may fail for some roles - degrade gracefully
  }

  // 2. Open support tickets owned by user
  let openTickets = 0;
  try {
    const { data: tickets } = await supabase
      .from("support_tickets" as any)
      .select("id, ref, subject, assignee, status")
      .eq("assignee", userId)
      .not("status", "in", "(closed,resolved)")
      .limit(50);
    openTickets = tickets?.length ?? 0;
    tickets?.forEach((t: any) => {
      resources.push({
        type: "support_ticket",
        id: t.id,
        label: t.ref ? `${t.ref} - ${t.subject ?? ""}` : t.subject ?? "Ticket",
      });
    });
  } catch {
    // ignore
  }

  // 3. Driver trips (already counted above for drivers)
  const driverTrips = userRole === "driver" ? activeDispatches : 0;

  // 4. Score
  const role = (userRole ?? "").toLowerCase();
  const isCritical = ["ops_manager", "driver", "dispatcher", "support"].includes(role);

  if (activeDispatches > 0) reasons.push(`${activeDispatches} active dispatch(es) during the window`);
  if (openTickets > 0) reasons.push(`${openTickets} open support ticket(s)`);
  if (isCritical) reasons.push(`Critical role: ${role}`);

  let level: ImpactLevel = "low";
  const total = activeDispatches + openTickets;
  if (total >= 5 || (isCritical && total >= 2)) {
    level = "high";
  } else if (total >= 1 && isCritical) {
    level = "medium";
  } else if (total >= 2) {
    level = "medium";
  }

  if (reasons.length === 0) reasons.push("No active commitments during the leave window.");

  return {
    level,
    activeDispatches,
    openTickets,
    driverTrips,
    reasons,
    resources,
  };
}

/** Returns a comma-separated list of driver_ids the user owns (or 'null') */
async function driverIdsForUser(userId: string): Promise<string> {
  try {
    const { data } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId);
    if (!data || data.length === 0) return "00000000-0000-0000-0000-000000000000";
    return data.map((d: any) => d.id).join(",");
  } catch {
    return "00000000-0000-0000-0000-000000000000";
  }
}

/** Suggest reassignees for each impacted resource (very simple v1: any same-role active user). */
export async function suggestReassignees(
  resources: ImpactReport["resources"],
  excludeUserId: string,
): Promise<Array<{ resource: ImpactReport["resources"][0]; assignee: { id: string; label: string } | null }>> {
  // Pull a small pool of candidates: profiles that aren't the requester
  const { data: candidates } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .neq("user_id", excludeUserId)
    .eq("is_active", true)
    .limit(20);

  const pool = candidates ?? [];
  return resources.map((r, i) => {
    const c = pool[i % Math.max(pool.length, 1)];
    return {
      resource: r,
      assignee: c
        ? { id: c.user_id, label: c.full_name || c.email || "Available staff" }
        : null,
    };
  });
}

export function impactColor(level: ImpactLevel): string {
  return level === "high" ? "bg-red-500" : level === "medium" ? "bg-amber-500" : "bg-emerald-500";
}

export function impactLabel(level: ImpactLevel): string {
  return level === "high" ? "🔴 High" : level === "medium" ? "🟡 Medium" : "🟢 Low";
}

export function diffDaysInclusive(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}
