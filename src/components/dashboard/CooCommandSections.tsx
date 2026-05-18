import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Activity, AlertTriangle, ArrowDown, ArrowUp, Bell, CheckCircle, FileText, Truck, Wrench, XCircle } from "lucide-react";
import { format, startOfMonth, subMonths, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const SEVERITY_VARIANT: Record<string, "destructive" | "default" | "secondary"> = {
  critical: "destructive",
  warning: "default",
  info: "secondary",
};

const SEVERITY_ICON: Record<string, string> = { critical: "🔴", warning: "🟡", info: "🟢" };

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND TAB
// ─────────────────────────────────────────────────────────────────────────────
export const CooCommandPanel = ({ organizationId }: { organizationId: string | null }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: kpis } = useQuery({
    queryKey: ["coo-command-kpis", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const [activeDispatch, payoutsPending, approvalsPending, vehiclesActive, alertsToday] = await Promise.all([
        supabase.from("dispatches").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).in("status", ["assigned", "in_transit"]),
        supabase.from("payout_approvals").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "pending_org_admin"),
        (supabase as any).from("approvals").select("id", { count: "exact", head: true })
          .eq("status", "pending")
          .eq("organization_id", organizationId ?? ""),
        supabase.from("vehicles").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "active"),
        supabase.from("coo_ai_alerts").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("is_read", false).gte("created_at", `${today}T00:00:00Z`),
      ]);
      return {
        activeDispatch: activeDispatch.count ?? 0,
        pendingApprovals: (payoutsPending.count ?? 0) + (approvalsPending.count ?? 0),
        fleetOnRoad: vehiclesActive.count ?? 0,
        alertsToday: alertsToday.count ?? 0,
      };
    },
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery({
    queryKey: ["coo-ai-alerts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("coo_ai_alerts")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("coo_ai_alerts")
        .update({ is_read: true, read_by: user?.id, read_at: new Date().toISOString() })
        .eq("id", id);
    },
    onSuccess: () => {
      refetchAlerts();
      queryClient.invalidateQueries({ queryKey: ["coo-command-kpis", organizationId] });
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Active Dispatches" value={kpis?.activeDispatch ?? 0} icon={<Truck className="w-5 h-5" />} />
        <KpiCard label="Pending Approvals" value={kpis?.pendingApprovals ?? 0} icon={<CheckCircle className="w-5 h-5" />} />
        <KpiCard label="Fleet On Road" value={kpis?.fleetOnRoad ?? 0} icon={<Activity className="w-5 h-5" />} />
        <KpiCard label="AI Alerts Today" value={kpis?.alertsToday ?? 0} icon={<Bell className="w-5 h-5" />} accent />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5" /> AI Insight Panel</CardTitle>
          <CardDescription>Latest AI-generated operational alerts</CardDescription>
        </CardHeader>
        <CardContent>
          {(!alerts || alerts.length === 0) ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No alerts yet - the engine will surface signals as data flows in.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((a: any) => (
                <div key={a.id} className={`p-3 rounded-lg border ${a.is_read ? "opacity-60" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{SEVERITY_ICON[a.severity] || "🟢"}</span>
                        <Badge variant={SEVERITY_VARIANT[a.severity] || "secondary"}>{a.severity}</Badge>
                        <span className="font-medium">{a.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{a.message}</p>
                      {a.recommended_action && (
                        <p className="text-xs mt-1 text-primary">→ {a.recommended_action}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(a.created_at), "MMM d, HH:mm")}</p>
                    </div>
                    {!a.is_read && (
                      <Button size="sm" variant="outline" onClick={() => markRead.mutate(a.id)}>Mark read</Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KpiCard = ({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: boolean }) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${accent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>{icon}</div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// APPROVALS TAB
// ─────────────────────────────────────────────────────────────────────────────
export const CooApprovalQueue = ({ organizationId }: { organizationId: string | null }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<{ kind: "payout" | "invoice" | "maintenance"; id: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const payouts = useQuery({
    queryKey: ["coo-pending-payouts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("payout_approvals").select("*")
        .eq("organization_id", organizationId).eq("status", "pending_org_admin")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const invoices = useQuery({
    queryKey: ["coo-pending-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("invoices").select("*")
        .eq("organization_id", organizationId).eq("approval_status", "pending_first_approval")
        .order("created_at", { ascending: false });
      return (data as any[]) ?? [];
    },
  });

  const maintenance = useQuery({
    queryKey: ["coo-pending-maintenance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      // maintenance_decisions joins via vehicle to org
      const { data: vehs } = await supabase.from("vehicles").select("id").eq("organization_id", organizationId);
      const ids = (vehs ?? []).map(v => v.id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("maintenance_decisions").select("*, vehicles!inner(registration_number)")
        .eq("approval_status", "pending_approval").in("vehicle_id", ids)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const approvePayout = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payout_approvals").update({
        status: "pending_super_admin",
        org_admin_approved_by: user?.id,
        org_admin_approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Approved", description: "Escalated to Super Admin" }); payouts.refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({
        approval_status: "pending_second_approval",
        first_approver_id: user?.id,
        first_approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Approved", description: "Sent to second approver" }); invoices.refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const approveMaintenance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_decisions").update({
        approval_status: "approved",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Approved" }); maintenance.refetch(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const submitReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return;
    try {
      if (rejectTarget.kind === "payout") {
        await supabase.from("payout_approvals").update({
          status: "rejected", rejected_by: user?.id, rejected_at: new Date().toISOString(), rejection_reason: rejectReason,
        }).eq("id", rejectTarget.id);
        payouts.refetch();
      } else if (rejectTarget.kind === "invoice") {
        await supabase.from("invoices").update({
          approval_status: "rejected", rejection_reason: rejectReason,
        }).eq("id", rejectTarget.id);
        invoices.refetch();
      } else {
        await supabase.from("maintenance_decisions").update({
          approval_status: "rejected", rejected_reason: rejectReason,
        }).eq("id", rejectTarget.id);
        maintenance.refetch();
      }
      toast({ title: "Rejected" });
      setRejectTarget(null); setRejectReason("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payouts Pending COO Approval</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Amount</TableHead><TableHead>Type</TableHead><TableHead>Finance Notes</TableHead>
              <TableHead>Requested</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {payouts.data?.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">₦{Number(p.amount).toLocaleString("en-NG")}</TableCell>
                  <TableCell className="capitalize">{p.payout_type?.replace("_", " ")}</TableCell>
                  <TableCell className="max-w-xs truncate">{p.finance_notes || "-"}</TableCell>
                  <TableCell>{format(new Date(p.created_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approvePayout.mutate(p.id)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectTarget({ kind: "payout", id: p.id })}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!payouts.data || payouts.data.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No pending payouts</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Invoices Pending First Approval</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Invoice #</TableHead><TableHead>Amount</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {invoices.data?.map((i: any) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>₦{Number(i.total_amount || i.amount || 0).toLocaleString("en-NG")}</TableCell>
                  <TableCell>{format(new Date(i.created_at), "MMM d, yyyy")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveInvoice.mutate(i.id)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectTarget({ kind: "invoice", id: i.id })}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!invoices.data || invoices.data.length === 0) && (
                <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No pending invoices</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Maintenance Decisions Pending COO</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Vehicle</TableHead><TableHead>Decision</TableHead><TableHead>Confidence</TableHead><TableHead>Created</TableHead><TableHead>Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {maintenance.data?.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.vehicles?.registration_number ?? m.vehicle_id?.slice(0, 8)}</TableCell>
                  <TableCell className="capitalize">{m.decision_type}</TableCell>
                  <TableCell>{m.confidence_score ?? "-"}%</TableCell>
                  <TableCell>{format(new Date(m.created_at), "MMM d")}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveMaintenance.mutate(m.id)}><CheckCircle className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="destructive" onClick={() => setRejectTarget({ kind: "maintenance", id: m.id })}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!maintenance.data || maintenance.data.length === 0) && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No pending maintenance decisions</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reason for rejection</DialogTitle></DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Explain why this is being rejected..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason.trim()} onClick={submitReject}>Confirm Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// KPI BOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
export const CooKpiBoard = ({ organizationId }: { organizationId: string | null }) => {
  const { data } = useQuery({
    queryKey: ["coo-kpi-board", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();
      const sevenDaysAgo = subDays(new Date(), 6);

      const [
        dispatchesThis, dispatchesLast, deliveredThis, drivers, vehicles,
        payoutsThis, payoutsLast, payoutsPending, invoicesAll, invoicesApproved,
        maintenanceCosts, dispatches7d
      ] = await Promise.all([
        supabase.from("dispatches").select("id, on_time_flag, status, created_at, cost", { count: "exact" })
          .eq("organization_id", organizationId).gte("created_at", monthStart),
        supabase.from("dispatches").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).gte("created_at", lastMonthStart).lt("created_at", monthStart),
        supabase.from("dispatches").select("on_time_flag")
          .eq("organization_id", organizationId).eq("status", "delivered").gte("created_at", monthStart),
        supabase.from("drivers").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "active"),
        supabase.from("vehicles").select("id, status")
          .eq("organization_id", organizationId),
        supabase.from("payout_approvals").select("amount")
          .eq("organization_id", organizationId).eq("status", "approved").gte("created_at", monthStart),
        supabase.from("payout_approvals").select("amount")
          .eq("organization_id", organizationId).eq("status", "approved").gte("created_at", lastMonthStart).lt("created_at", monthStart),
        supabase.from("payout_approvals").select("amount")
          .eq("organization_id", organizationId).in("status", ["pending_org_admin", "pending_super_admin"]),
        (supabase as any).from("invoices").select("id, approval_status")
          .eq("organization_id", organizationId),
        (supabase as any).from("invoices").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("approval_status", "approved"),
        (supabase as any).from("maintenance_decisions")
          .select("id, metadata, created_at, approval_status, vehicle_id, vehicles!inner(organization_id)")
          .eq("approval_status", "approved")
          .gte("created_at", monthStart)
          .eq("vehicles.organization_id", organizationId ?? ""),
        supabase.from("dispatches").select("created_at")
          .eq("organization_id", organizationId).gte("created_at", sevenDaysAgo.toISOString()),
      ]);

      const deliveredCount = deliveredThis.data?.length ?? 0;
      const onTimeCount = deliveredThis.data?.filter((d: any) => d.on_time_flag).length ?? 0;
      const onTimeRate = deliveredCount > 0 ? Math.round((onTimeCount / deliveredCount) * 100) : 0;

      const totalVehicles = vehicles.data?.length ?? 0;
      const activeVehicles = vehicles.data?.filter((v: any) => v.status === "active").length ?? 0;
      const groundedVehicles = vehicles.data?.filter((v: any) => v.status === "grounded" || v.status === "maintenance").length ?? 0;
      const fleetUtil = totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;

      const sumPayoutsThis = (payoutsThis.data ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const sumPayoutsLast = (payoutsLast.data ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
      const sumPayoutsPending = (payoutsPending.data ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);

      const totalInvoices = invoicesAll.data?.length ?? 0;
      const approvedInvoices = invoicesApproved.count ?? 0;
      const invoiceRate = totalInvoices > 0 ? Math.round((approvedInvoices / totalInvoices) * 100) : 0;

      const maintCosts = (maintenanceCosts.data ?? [])
        .map((m: any) => Number(m.metadata?.estimated_cost || m.metadata?.cost || 0))
        .filter((n) => n > 0);
      const avgMaintCost = maintCosts.length > 0 ? Math.round(maintCosts.reduce((s, n) => s + n, 0) / maintCosts.length) : 0;

      const revenuePerVehicle = totalVehicles > 0 ? Math.round(sumPayoutsThis / totalVehicles) : 0;

      const pctChange = (cur: number, prev: number) => prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);

      // 7-day chart
      const buckets: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = subDays(new Date(), 6 - i);
        buckets[format(d, "MMM d")] = 0;
      }
      (dispatches7d.data ?? []).forEach((d: any) => {
        const key = format(new Date(d.created_at), "MMM d");
        if (key in buckets) buckets[key]++;
      });
      const chart = Object.entries(buckets).map(([day, count]) => ({ day, count }));

      return {
        totalDispatchesMonth: dispatchesThis.count ?? 0,
        dispatchTrend: pctChange(dispatchesThis.count ?? 0, dispatchesLast.count ?? 0),
        onTimeRate, activeDrivers: drivers.count ?? 0, revenuePerVehicle,
        fleetUtil, groundedVehicles, avgMaintCost,
        sumPayoutsThis, payoutTrend: pctChange(sumPayoutsThis, sumPayoutsLast),
        sumPayoutsPending, invoiceRate,
        chart,
      };
    },
  });

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Operations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTrendCard label="Dispatches (Month)" value={data?.totalDispatchesMonth ?? 0} change={data?.dispatchTrend} />
          <KpiTrendCard label="On-Time Rate" value={`${data?.onTimeRate ?? 0}%`} />
          <KpiTrendCard label="Active Drivers" value={data?.activeDrivers ?? 0} />
          <KpiTrendCard label="Revenue / Vehicle" value={`₦${(data?.revenuePerVehicle ?? 0).toLocaleString("en-NG")}`} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Fleet</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiTrendCard label="Fleet Utilisation" value={`${data?.fleetUtil ?? 0}%`} />
          <KpiTrendCard label="Vehicles Grounded" value={data?.groundedVehicles ?? 0} />
          <KpiTrendCard label="Avg Maintenance Cost" value={`₦${(data?.avgMaintCost ?? 0).toLocaleString("en-NG")}`} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Financial</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiTrendCard label="Total Payouts (Month)" value={`₦${(data?.sumPayoutsThis ?? 0).toLocaleString("en-NG")}`} change={data?.payoutTrend} />
          <KpiTrendCard label="Pending Payout Value" value={`₦${(data?.sumPayoutsPending ?? 0).toLocaleString("en-NG")}`} />
          <KpiTrendCard label="Invoice Approval Rate" value={`${data?.invoiceRate ?? 0}%`} />
        </div>
      </section>

      <Card>
        <CardHeader><CardTitle>Daily Dispatches - Last 7 Days</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data?.chart ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

const KpiTrendCard = ({ label, value, change }: { label: string; value: number | string; change?: number }) => (
  <Card>
    <CardContent className="p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {typeof change === "number" && change !== 0 && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${change >= 0 ? "text-green-600" : "text-destructive"}`}>
          {change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {Math.abs(change)}% vs last month
        </div>
      )}
    </CardContent>
  </Card>
);

// ─────────────────────────────────────────────────────────────────────────────
// TRANSPORT KPI SUITE - World-class fleet/transport KPIs (additive view)
// ─────────────────────────────────────────────────────────────────────────────
export const CooTransportKPISuite = ({ organizationId }: { organizationId: string | null }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["coo-transport-kpis", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1)).toISOString();

      const [
        deliveredThis, deliveredLast, allDispatchThis, vehicles, drivers,
        maintThis, fuelThis, payoutsThis,
      ] = await Promise.all([
        supabase.from("dispatches")
          .select("id, distance_km, cost, on_time_flag, scheduled_delivery, actual_delivery, created_at")
          .eq("organization_id", organizationId).eq("status", "delivered").gte("created_at", monthStart),
        supabase.from("dispatches")
          .select("id, distance_km, cost, on_time_flag")
          .eq("organization_id", organizationId).eq("status", "delivered")
          .gte("created_at", lastMonthStart).lt("created_at", monthStart),
        supabase.from("dispatches").select("id, status", { count: "exact" })
          .eq("organization_id", organizationId).gte("created_at", monthStart),
        supabase.from("vehicles").select("id, status").eq("organization_id", organizationId),
        supabase.from("drivers").select("id, status").eq("organization_id", organizationId),
        (supabase as any).from("maintenance_decisions")
          .select("id, metadata, created_at, vehicles!inner(organization_id)")
          .eq("approval_status", "approved")
          .gte("created_at", monthStart)
          .eq("vehicles.organization_id", organizationId ?? ""),
        (supabase as any).from("expenses").select("amount, category, created_at")
          .eq("organization_id", organizationId).eq("category", "fuel").gte("created_at", monthStart),
        supabase.from("payout_approvals").select("amount")
          .eq("organization_id", organizationId).eq("status", "approved").gte("created_at", monthStart),
      ]);

      const dThis = deliveredThis.data ?? [];
      const dLast = deliveredLast.data ?? [];

      const totalKm = dThis.reduce((s: number, d: any) => s + Number(d.distance_km || 0), 0);
      const totalCost = dThis.reduce((s: number, d: any) => s + Number(d.cost || 0), 0);
      const onTime = dThis.filter((d: any) => d.on_time_flag).length;
      const onTimeRate = dThis.length > 0 ? Math.round((onTime / dThis.length) * 100) : 0;
      const onTimeLast = dLast.length > 0
        ? Math.round((dLast.filter((d: any) => d.on_time_flag).length / dLast.length) * 100)
        : 0;

      const costPerKm = totalKm > 0 ? Math.round(totalCost / totalKm) : 0;
      const costPerDrop = dThis.length > 0 ? Math.round(totalCost / dThis.length) : 0;
      const avgKmPerTrip = dThis.length > 0 ? Math.round(totalKm / dThis.length) : 0;

      // Cycle time (hours between dispatch creation and actual delivery)
      const cycleHours = dThis
        .filter((d: any) => d.actual_delivery && d.created_at)
        .map((d: any) => (new Date(d.actual_delivery).getTime() - new Date(d.created_at).getTime()) / 3_600_000);
      const avgCycleH = cycleHours.length > 0
        ? Math.round((cycleHours.reduce((s, n) => s + n, 0) / cycleHours.length) * 10) / 10
        : 0;

      const totalVeh = vehicles.data?.length ?? 0;
      const activeVeh = vehicles.data?.filter((v: any) => v.status === "active").length ?? 0;
      const groundedVeh = vehicles.data?.filter((v: any) => v.status === "grounded" || v.status === "maintenance").length ?? 0;
      const fleetUtil = totalVeh > 0 ? Math.round((activeVeh / totalVeh) * 100) : 0;

      const totalDriv = drivers.data?.length ?? 0;
      const activeDriv = drivers.data?.filter((d: any) => d.status === "active").length ?? 0;
      const driverUtil = totalDriv > 0 ? Math.round((activeDriv / totalDriv) * 100) : 0;

      const maintCost = (maintThis.data ?? [])
        .reduce((s: number, m: any) => s + Number(m.metadata?.estimated_cost || m.metadata?.cost || 0), 0);
      const maintPerVehicle = totalVeh > 0 ? Math.round(maintCost / totalVeh) : 0;

      const fuelCost = (fuelThis.data ?? []).reduce((s: number, f: any) => s + Number(f.amount || 0), 0);
      const fuelPerKm = totalKm > 0 ? Math.round(fuelCost / totalKm) : 0;

      const revenue = (payoutsThis.data ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const opCosts = totalCost + maintCost + fuelCost;
      const grossMargin = revenue > 0 ? Math.round(((revenue - opCosts) / revenue) * 100) : 0;
      const revenuePerKm = totalKm > 0 ? Math.round(revenue / totalKm) : 0;

      const completionRate = (allDispatchThis.count ?? 0) > 0
        ? Math.round((dThis.length / (allDispatchThis.count ?? 1)) * 100) : 0;

      const otdTrend = onTimeRate - onTimeLast;

      return {
        onTimeRate, otdTrend, completionRate, avgCycleH, avgKmPerTrip,
        costPerKm, costPerDrop, fuelPerKm, maintPerVehicle,
        fleetUtil, groundedVeh, driverUtil, activeDriv, totalDriv,
        revenuePerKm, grossMargin, totalKm, totalDeliveries: dThis.length,
      };
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading transport KPIs…</p>;
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Service Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTrendCard label="On-Time Delivery" value={`${data?.onTimeRate ?? 0}%`} change={data?.otdTrend} />
          <KpiTrendCard label="Completion Rate" value={`${data?.completionRate ?? 0}%`} />
          <KpiTrendCard label="Avg Cycle Time" value={`${data?.avgCycleH ?? 0} h`} />
          <KpiTrendCard label="Avg Km / Trip" value={`${data?.avgKmPerTrip ?? 0} km`} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Cost Efficiency</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTrendCard label="Cost per Km" value={`₦${(data?.costPerKm ?? 0).toLocaleString("en-NG")}`} />
          <KpiTrendCard label="Cost per Drop" value={`₦${(data?.costPerDrop ?? 0).toLocaleString("en-NG")}`} />
          <KpiTrendCard label="Fuel Cost / Km" value={`₦${(data?.fuelPerKm ?? 0).toLocaleString("en-NG")}`} />
          <KpiTrendCard label="Maintenance / Vehicle" value={`₦${(data?.maintPerVehicle ?? 0).toLocaleString("en-NG")}`} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Asset & Workforce</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTrendCard label="Fleet Utilisation" value={`${data?.fleetUtil ?? 0}%`} />
          <KpiTrendCard label="Vehicles Grounded" value={data?.groundedVeh ?? 0} />
          <KpiTrendCard label="Driver Utilisation" value={`${data?.driverUtil ?? 0}%`} />
          <KpiTrendCard label="Active Drivers" value={`${data?.activeDriv ?? 0} / ${data?.totalDriv ?? 0}`} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Profitability</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiTrendCard label="Revenue per Km" value={`₦${(data?.revenuePerKm ?? 0).toLocaleString("en-NG")}`} />
          <KpiTrendCard label="Gross Margin" value={`${data?.grossMargin ?? 0}%`} />
          <KpiTrendCard label="Total Distance" value={`${(data?.totalKm ?? 0).toLocaleString("en-NG")} km`} />
          <KpiTrendCard label="Deliveries (Month)" value={data?.totalDeliveries ?? 0} />
        </div>
      </section>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TEAM PERFORMANCE - Per-role roll-up for the COO organogram view
// ─────────────────────────────────────────────────────────────────────────────
export const CooTeamPerformancePanel = ({ organizationId }: { organizationId: string | null }) => {
  const { data, isLoading } = useQuery({
    queryKey: ["coo-team-performance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();

      const [members, dispatches, payouts, driverScores] = await Promise.all([
        supabase.from("organization_members")
          .select("user_id, role, is_active, profiles!inner(full_name, email)")
          .eq("organization_id", organizationId).eq("is_active", true),
        supabase.from("dispatches").select("driver_id, status, on_time_flag, created_at")
          .eq("organization_id", organizationId).gte("created_at", monthStart),
        supabase.from("payout_approvals").select("status, finance_approved_by, org_admin_approved_by, created_at")
          .eq("organization_id", organizationId).gte("created_at", monthStart),
        supabase.from("fleet_driver_scores").select("overall_score, score_date")
          .gte("score_date", monthStart.split("T")[0]),
      ]);

      const all = members.data ?? [];
      const byRole: Record<string, any[]> = {};
      all.forEach((m: any) => {
        const r = m.role || "unassigned";
        (byRole[r] = byRole[r] || []).push(m);
      });

      const totalDispatches = dispatches.data?.length ?? 0;
      const delivered = dispatches.data?.filter((d: any) => d.status === "delivered") ?? [];
      const onTime = delivered.filter((d: any) => d.on_time_flag).length;
      const driverOTD = delivered.length > 0 ? Math.round((onTime / delivered.length) * 100) : 0;

      const financeApprovals = payouts.data?.filter((p: any) => p.finance_approved_by).length ?? 0;
      const orgAdminApprovals = payouts.data?.filter((p: any) => p.org_admin_approved_by).length ?? 0;

      const avgDriverScore = (driverScores.data ?? []).length > 0
        ? Math.round((driverScores.data ?? []).reduce((s: number, r: any) => s + Number(r.overall_score || 0), 0) / (driverScores.data ?? []).length)
        : 0;

      const roles = Object.entries(byRole).map(([role, list]) => {
        let kpiLabel = "Members";
        let kpiValue: number | string = list.length;
        let healthPct = 100;
        if (role === "driver") {
          kpiLabel = "On-Time %";
          kpiValue = `${driverOTD}%`;
          healthPct = driverOTD;
        } else if (role === "ops_manager" || role === "dispatcher") {
          kpiLabel = "Dispatches Handled";
          kpiValue = totalDispatches;
          healthPct = totalDispatches > 0 ? 90 : 40;
        } else if (role === "finance_manager") {
          kpiLabel = "Payouts Processed";
          kpiValue = financeApprovals;
          healthPct = financeApprovals > 0 ? 90 : 50;
        } else if (role === "org_admin") {
          kpiLabel = "Approvals Signed";
          kpiValue = orgAdminApprovals;
          healthPct = orgAdminApprovals > 0 ? 95 : 60;
        }
        return { role, count: list.length, kpiLabel, kpiValue, healthPct };
      }).sort((a, b) => b.count - a.count);

      return { roles, totalMembers: all.length, avgDriverScore };
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading team performance…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Active Members" value={data?.totalMembers ?? 0} icon={<Activity className="w-5 h-5" />} />
        <KpiCard label="Distinct Roles" value={data?.roles.length ?? 0} icon={<FileText className="w-5 h-5" />} />
        <KpiCard label="Avg Driver Safety Score" value={data?.avgDriverScore ?? 0} icon={<Truck className="w-5 h-5" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Performance by Role</CardTitle>
          <CardDescription>Roll-up of headcount and live KPI per role this month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Headcount</TableHead>
                <TableHead>Primary KPI</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.roles ?? []).map((r) => (
                <TableRow key={r.role}>
                  <TableCell className="font-medium capitalize">{r.role.replace(/_/g, " ")}</TableCell>
                  <TableCell>{r.count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.kpiLabel}</TableCell>
                  <TableCell className="font-semibold">{r.kpiValue}</TableCell>
                  <TableCell>
                    <Badge variant={r.healthPct >= 80 ? "default" : r.healthPct >= 60 ? "secondary" : "destructive"}>
                      {r.healthPct}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.roles || data.roles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No active team members yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN GOVERNANCE - Final-authority overview (only renders for SA)
// ─────────────────────────────────────────────────────────────────────────────
export const SaGovernancePanel = ({ organizationId }: { organizationId: string | null }) => {
  const { isSuperAdmin } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["sa-governance", organizationId],
    enabled: !!organizationId && isSuperAdmin,
    queryFn: async () => {
      const monthStart = startOfMonth(new Date()).toISOString();

      const [
        pendingUsers, pendingPayoutsSA, pendingPayoutsOrg, rejectedPayouts,
        invoicesPending, maintPending, alertsCritical, members,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true })
          .eq("approval_status", "pending"),
        supabase.from("payout_approvals").select("id, amount", { count: "exact" })
          .eq("organization_id", organizationId).eq("status", "pending_super_admin"),
        supabase.from("payout_approvals").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "pending_org_admin"),
        supabase.from("payout_approvals").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("status", "rejected").gte("created_at", monthStart),
        (supabase as any).from("invoices").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).in("approval_status", ["pending_first_approval", "pending_second_approval"]),
        supabase.from("maintenance_decisions").select("id", { count: "exact", head: true })
          .eq("approval_status", "pending_approval"),
        supabase.from("coo_ai_alerts").select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId).eq("severity", "critical").eq("is_read", false),
        supabase.from("organization_members").select("role")
          .eq("organization_id", organizationId).eq("is_active", true),
      ]);

      const escalatedAmount = (pendingPayoutsSA.data ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

      return {
        pendingUsers: pendingUsers.count ?? 0,
        escalatedPayoutCount: pendingPayoutsSA.count ?? 0,
        escalatedPayoutAmount: escalatedAmount,
        orgAdminQueueCount: pendingPayoutsOrg.count ?? 0,
        rejectedThisMonth: rejectedPayouts.count ?? 0,
        invoicesPending: invoicesPending.count ?? 0,
        maintPending: maintPending.count ?? 0,
        criticalAlerts: alertsCritical.count ?? 0,
        totalMembers: members.data?.length ?? 0,
      };
    },
  });

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          Super Admin only. Contact your Company Owner for access.
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading governance dashboard…</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" /> Super Admin Governance
          </CardTitle>
          <CardDescription>Final-authority queue across this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Pending User Approvals" value={data?.pendingUsers ?? 0} icon={<CheckCircle className="w-5 h-5" />} accent={(data?.pendingUsers ?? 0) > 0} />
            <KpiCard label="Payouts Awaiting SA" value={data?.escalatedPayoutCount ?? 0} icon={<FileText className="w-5 h-5" />} accent={(data?.escalatedPayoutCount ?? 0) > 0} />
            <KpiCard label="Critical AI Alerts" value={data?.criticalAlerts ?? 0} icon={<Bell className="w-5 h-5" />} accent={(data?.criticalAlerts ?? 0) > 0} />
            <KpiCard label="Active Members" value={data?.totalMembers ?? 0} icon={<Activity className="w-5 h-5" />} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval Pipeline Snapshot</CardTitle>
          <CardDescription>Where work is currently held this month</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead>Open Items</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Payouts → Org Admin (COO)</TableCell>
                <TableCell>{data?.orgAdminQueueCount ?? 0}</TableCell>
                <TableCell className="text-muted-foreground text-sm">Awaiting COO sign-off</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Payouts → Super Admin</TableCell>
                <TableCell>{data?.escalatedPayoutCount ?? 0}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  ₦{(data?.escalatedPayoutAmount ?? 0).toLocaleString("en-NG")} escalated
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Invoices in approval flow</TableCell>
                <TableCell>{data?.invoicesPending ?? 0}</TableCell>
                <TableCell className="text-muted-foreground text-sm">Two-level invoice approvals pending</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Maintenance decisions</TableCell>
                <TableCell>{data?.maintPending ?? 0}</TableCell>
                <TableCell className="text-muted-foreground text-sm">Awaiting authorisation</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Rejected this month</TableCell>
                <TableCell>{data?.rejectedThisMonth ?? 0}</TableCell>
                <TableCell className="text-muted-foreground text-sm">Audit trail preserved</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
