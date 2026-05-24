// Org-scoped live context builder for Zaza. Shared between LD and LC pages.
// All queries are filtered by `organization_id` so no cross-tenant or cross-
// scope data leaks. The function ONLY reads org-scoped operational data; it
// does not return any cross-workspace artefacts.
import { supabase } from "@/integrations/supabase/client";

export async function buildZazaOrgContext(opts: {
  organizationId: string;
  role: string | null | undefined;
}): Promise<string> {
  const { organizationId: orgId, role } = opts;
  if (!orgId) return "No organization context available.";
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since30Date = since30.split("T")[0];

  const isOpsLike = role === "ops_manager" || role === "dispatcher";
  const isFinance = role === "finance_manager";
  const isSupport = role === "support";

  const fetchDispatchesFull = () =>
    supabase.from("dispatches" as any)
      .select("id, status, sla_status, cost, distance_km, created_at, pod_confirmed, pickup_address, delivery_address, dispatch_number")
      .eq("organization_id", orgId).gte("created_at", since30)
      .order("created_at", { ascending: false }).limit(100);
  const fetchDispatchesFinance = () =>
    supabase.from("dispatches" as any)
      .select("id, status, sla_status, cost, distance_km, created_at, dispatch_number")
      .eq("organization_id", orgId).gte("created_at", since30)
      .order("created_at", { ascending: false }).limit(100);
  const fetchDispatchesSupport = () =>
    supabase.from("dispatches" as any)
      .select("status, sla_status, dispatch_number, delivery_address, pod_confirmed")
      .eq("organization_id", orgId).gte("created_at", since30)
      .order("created_at", { ascending: false }).limit(100);
  const fetchVehicles = () =>
    supabase.from("vehicles" as any).select("id, status, truck_type, registration_number")
      .eq("organization_id", orgId).limit(50);
  const fetchDrivers = () =>
    supabase.from("drivers" as any).select("id, status, full_name")
      .eq("organization_id", orgId).limit(50);
  const fetchBills = () =>
    supabase.from("bills" as any).select("id, vendor_name, total_amount, payment_status, bill_date")
      .eq("organization_id", orgId).limit(30);
  const fetchExpenses = () =>
    supabase.from("expenses" as any).select("id, amount, category, expense_date")
      .eq("organization_id", orgId).gte("expense_date", since30Date).limit(50);
  const fetchOutbound = () =>
    supabase.from("outbound_requests" as any).select("*")
      .eq("organization_id", orgId).limit(30);
  const fetchRateCards = () =>
    supabase.from("vendor_rate_cards" as any)
      .select("vendor_name, route_from, route_to, vehicle_type, rate_ngn, sla_days, status")
      .eq("organization_id", orgId).eq("status", "active").limit(30);
  const fetchRoutes = () =>
    supabase.from("routes" as any)
      .select("name, origin, destination, distance_km, estimated_cost, approval_status, vehicle_type")
      .eq("organization_id", orgId).limit(20);
  const fetchWarehouses = () =>
    supabase.from("warehouses" as any).select("name, location, is_active")
      .eq("organization_id", orgId).limit(20);
  const fetchOrg = () =>
    supabase.from("organizations" as any)
      .select("id, name, country, industry, tenant_mode, created_at")
      .eq("id", orgId).maybeSingle();
  const fetchTenantConfig = () =>
    supabase.from("tenant_config" as any)
      .select("company_name, country, operating_cities, operating_model, fleet_count, vehicle_count, vehicle_classes, branch_count, billing_currency, billing_cycle, plan_tier, ai_credits_total, ai_credits_used, max_users, max_vehicles, max_branches, enabled_modules, onboarding_completed")
      .eq("organization_id", orgId).limit(1).maybeSingle();
  const fetchMembers = () =>
    supabase.from("organization_members" as any)
      .select("user_id, role, is_active")
      .eq("organization_id", orgId).limit(100);

  const orgBlock = async () => {
    const [orgRes, tcRes, memRes] = await Promise.all([fetchOrg(), fetchTenantConfig(), fetchMembers()]);
    const o: any = orgRes.data ?? {};
    const tc: any = tcRes.data ?? {};
    const members: any[] = (memRes.data as any) ?? [];
    const byRole = members.reduce((acc: Record<string, number>, m) => {
      acc[m.role ?? "unknown"] = (acc[m.role ?? "unknown"] ?? 0) + 1; return acc;
    }, {});
    return `ORG & TENANT PROFILE:
- Organization: ${o.name ?? tc.company_name ?? "Unknown"} (id ${orgId})
- Country: ${o.country ?? tc.country ?? "-"} | Industry: ${o.industry ?? "-"} | Tenant mode: ${o.tenant_mode ?? "-"}
- Plan tier: ${tc.plan_tier ?? o.plan_tier ?? "-"} | Billing: ${tc.billing_currency ?? "-"} ${tc.billing_cycle ?? o.billing_cycle ?? ""}
- Operating model: ${tc.operating_model ?? "-"} | Operating cities: ${(tc.operating_cities ?? []).join(", ") || "-"}
- Fleet declared: ${tc.fleet_count ?? "-"} fleets / ${tc.vehicle_count ?? "-"} vehicles | Classes: ${(tc.vehicle_classes ?? []).join(", ") || "-"}
- Branches: ${tc.branch_count ?? "-"} | Onboarding completed: ${tc.onboarding_completed ? "yes" : "no"}
- Plan limits: ${tc.max_users ?? "-"} users / ${tc.max_vehicles ?? "-"} vehicles / ${tc.max_branches ?? "-"} branches
- AI credits: ${tc.ai_credits_used ?? 0} used of ${tc.ai_credits_total ?? 0}
- Enabled modules: ${(tc.enabled_modules ?? []).join(", ") || "-"}
- Team members: ${members.length} (${Object.entries(byRole).map(([r, n]) => `${r}:${n}`).join(", ") || "none"})
- Caller role: ${role ?? "unknown"}`;
  };

  const org = await orgBlock().catch(() => "ORG & TENANT PROFILE: unavailable");

  if (isSupport) {
    const dispatchesRes = await fetchDispatchesSupport();
    const d: any[] = (dispatchesRes.data as any) ?? [];
    const delivered = d.filter(x => x.status === "delivered");
    const breaches = d.filter(x => x.sla_status === "breached");
    const podMissing = delivered.filter(x => !x.pod_confirmed);
    return org + "\n\n" + `SUPPORT DELIVERY VIEW (last 30 days):
- Total dispatches: ${d.length} | Delivered: ${delivered.length} | SLA breaches: ${breaches.length}
- POD unconfirmed: ${podMissing.length}

OPEN SLA BREACHES (up to 10):
${breaches.slice(0, 10).map(b => `  ${b.dispatch_number} → ${b.delivery_address} [${b.status}]`).join("\n") || "  None"}

POD UNCONFIRMED (up to 10):
${podMissing.slice(0, 10).map(b => `  ${b.dispatch_number} → ${b.delivery_address}`).join("\n") || "  None"}`;
  }

  if (isFinance) {
    const [dispatchesRes, billsRes, expensesRes, rateCardsRes] = await Promise.all([
      fetchDispatchesFinance(), fetchBills(), fetchExpenses(), fetchRateCards(),
    ]);
    const d: any[] = (dispatchesRes.data as any) ?? [];
    const bills: any[] = (billsRes.data as any) ?? [];
    const expenses: any[] = (expensesRes.data as any) ?? [];
    const rateCards: any[] = (rateCardsRes.data as any) ?? [];
    const delivered = d.filter(x => x.status === "delivered");
    const totalDispatchCost = d.reduce((s, x) => s + Number(x.cost ?? 0), 0);
    const totalExpenses = expenses.reduce((s, x) => s + Number(x.amount ?? 0), 0);
    const totalCost = totalDispatchCost + totalExpenses;
    const totalKm = d.reduce((s, x) => s + Number(x.distance_km ?? 0), 0);
    const costPerKm = totalKm > 0 ? (totalCost / totalKm).toFixed(0) : "N/A";
    const costPerDel = delivered.length > 0 ? (totalCost / delivered.length).toFixed(0) : "N/A";
    const pendingBills = bills.filter(b => b.payment_status === "pending");
    const pendingTotal = pendingBills.reduce((s, b) => s + Number(b.total_amount ?? 0), 0);
    const expByCat = Object.entries(expenses.reduce((acc: Record<string, number>, e: any) => {
      const k = e.category ?? "uncategorised"; acc[k] = (acc[k] ?? 0) + Number(e.amount ?? 0); return acc;
    }, {})).map(([c, v]) => `  ${c}: ₦${(v as number).toLocaleString()}`).join("\n") || "  None";
    return org + "\n\n" + `FINANCE COST &  VENDOR SNAPSHOT (last 30 days):
- Total logistics cost: ₦${totalCost.toLocaleString()} (dispatches ₦${totalDispatchCost.toLocaleString()} + expenses ₦${totalExpenses.toLocaleString()})
- Cost/KM: ₦${costPerKm} | Cost/delivery: ₦${costPerDel}
- Pending vendor invoices: ${pendingBills.length} totalling ₦${pendingTotal.toLocaleString()}
- Active vendor rate cards: ${rateCards.length}

PENDING BILLS (up to 10):
${pendingBills.slice(0, 10).map(b => `  ${b.vendor_name}: ₦${Number(b.total_amount ?? 0).toLocaleString()} [${b.bill_date}]`).join("\n") || "  None"}

RATE CARD SAMPLE (up to 10):
${rateCards.slice(0, 10).map(r => `  ${r.vendor_name}: ${r.route_from} → ${r.route_to} @ ₦${r.rate_ngn}/${r.vehicle_type} (SLA ${r.sla_days}d)`).join("\n") || "  None"}

EXPENSE BREAKDOWN BY CATEGORY:
${expByCat}`;
  }

  if (isOpsLike) {
    const [dispatchesRes, vehiclesRes, driversRes, outboundRes, routesRes] = await Promise.all([
      fetchDispatchesFull(), fetchVehicles(), fetchDrivers(), fetchOutbound(), fetchRoutes(),
    ]);
    const d: any[] = (dispatchesRes.data as any) ?? [];
    const vehicles: any[] = (vehiclesRes.data as any) ?? [];
    const drivers: any[] = (driversRes.data as any) ?? [];
    const outbound: any[] = (outboundRes.data as any) ?? [];
    const routes: any[] = (routesRes.data as any) ?? [];
    const delivered = d.filter(x => x.status === "delivered");
    const active = d.filter(x => ["assigned","in_transit","picked_up"].includes(x.status ?? ""));
    const onTime = delivered.filter(x => x.sla_status === "met");
    const breaches = delivered.filter(x => x.sla_status === "breached");
    const otd = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 100) : null;
    return org + "\n\n" + `OPERATIONS &  SLA SNAPSHOT (last 30 days):
- Total dispatches: ${d.length} | Active now: ${active.length} | Delivered: ${delivered.length}
- OTD rate: ${otd !== null ? otd + "%" : "insufficient data"} | SLA breaches: ${breaches.length}
- Fleet: ${vehicles.length} vehicles | ${vehicles.filter(v => v.status === "available").length} available | ${vehicles.filter(v => v.status === "maintenance").length} in maintenance
- Drivers: ${drivers.length} total | ${drivers.filter(v => v.status === "available").length} available
- Active routes: ${routes.filter(r => r.approval_status === "approved").length} approved
- Outbound requests this period: ${outbound.length}
- POD unconfirmed: ${delivered.filter(x => !x.pod_confirmed).length}

TOP 10 RECENT BREACHES:
${breaches.slice(0, 10).map(b => `  ${b.dispatch_number}: ${b.pickup_address} → ${b.delivery_address}`).join("\n") || "  None"}

ACTIVE DISPATCHES (up to 10):
${active.slice(0, 10).map(b => `  ${b.dispatch_number} [${b.status}] ${b.pickup_address} → ${b.delivery_address}`).join("\n") || "  None"}`;
  }

  const [
    dispatchesRes, vehiclesRes, driversRes, billsRes, expensesRes,
    outboundRes, rateCardsRes, routesRes, warehousesRes,
  ] = await Promise.all([
    fetchDispatchesFull(), fetchVehicles(), fetchDrivers(), fetchBills(), fetchExpenses(),
    fetchOutbound(), fetchRateCards(), fetchRoutes(), fetchWarehouses(),
  ]);

  const d: any[] = (dispatchesRes.data as any) ?? [];
  const vehicles: any[] = (vehiclesRes.data as any) ?? [];
  const drivers: any[] = (driversRes.data as any) ?? [];
  const bills: any[] = (billsRes.data as any) ?? [];
  const expenses: any[] = (expensesRes.data as any) ?? [];
  const outbound: any[] = (outboundRes.data as any) ?? [];
  const rateCards: any[] = (rateCardsRes.data as any) ?? [];
  const routes: any[] = (routesRes.data as any) ?? [];
  const warehouses: any[] = (warehousesRes.data as any) ?? [];

  const delivered = d.filter(x => x.status === "delivered");
  const active = d.filter(x => ["assigned","in_transit","picked_up"].includes(x.status ?? ""));
  const onTime = delivered.filter(x => x.sla_status === "met");
  const breaches = delivered.filter(x => x.sla_status === "breached");
  const otd = delivered.length > 0 ? Math.round((onTime.length / delivered.length) * 100) : null;
  const totalCost = d.reduce((s, x) => s + Number(x.cost ?? 0), 0)
                  + expenses.reduce((s, x) => s + Number(x.amount ?? 0), 0);
  const totalKm = d.reduce((s, x) => s + Number(x.distance_km ?? 0), 0);
  const costPerKm = totalKm > 0 ? (totalCost / totalKm).toFixed(0) : "N/A";
  const costPerDel = delivered.length > 0 ? (totalCost / delivered.length).toFixed(0) : "N/A";
  const pendingBills = bills.filter(b => b.payment_status === "pending");

  return org + "\n\n" + `LIVE OPERATIONAL SNAPSHOT (last 30 days):
- Total dispatches: ${d.length} | Active now: ${active.length} | Delivered: ${delivered.length}
- OTD rate: ${otd !== null ? otd + "%" : "insufficient data"} | SLA breaches: ${breaches.length}
- Total logistics cost: ₦${totalCost.toLocaleString()} | Cost/KM: ₦${costPerKm} | Cost/delivery: ₦${costPerDel}
- Fleet: ${vehicles.length} vehicles | ${vehicles.filter(v => v.status === "available").length} available | ${vehicles.filter(v => v.status === "maintenance").length} in maintenance
- Drivers: ${drivers.length} total | ${drivers.filter(v => v.status === "available").length} available
- Vendors: ${rateCards.length} active rate cards
- Pending vendor invoices: ${pendingBills.length} totalling ₦${pendingBills.reduce((s, b) => s + Number(b.total_amount ?? 0), 0).toLocaleString()}
- Warehouses: ${warehouses.map(w => w.name).join(", ") || "none configured"}
- Active routes: ${routes.filter(r => r.approval_status === "approved").length} approved
- Outbound requests this period: ${outbound.length}
- POD unconfirmed: ${delivered.filter(x => !x.pod_confirmed).length}

TOP 5 RECENT BREACHES:
${breaches.slice(0, 5).map(b => `  ${b.dispatch_number}: ${b.pickup_address} → ${b.delivery_address}`).join("\n") || "  None"}

RATE CARD SAMPLE (up to 5):
${rateCards.slice(0, 5).map(r => `  ${r.vendor_name}: ${r.route_from} → ${r.route_to} @ ₦${r.rate_ngn}/${r.vehicle_type}`).join("\n") || "  None"}`;
}
