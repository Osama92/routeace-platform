import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle, Clock, TrendingUp, TrendingDown, DollarSign,
  AlertCircle, RefreshCw, Pencil, BarChart3, ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";

// A dispatch row joined with its optional dispatch_financials row
interface DispatchRow {
  // dispatches columns
  id: string;
  dispatch_number: string;
  organization_id: string;
  status: string;
  approval_status: string;
  pickup_address: string;
  delivery_address: string;
  scheduled_pickup: string | null;
  actual_delivery: string | null;
  distance_km: number | null;
  customers: { company_name: string } | null;
  drivers: { full_name: string } | null;
  vehicles: { registration_number: string } | null;
  // joined dispatch_financials (null if not yet created)
  dispatch_financials: {
    id: string;
    vendor_cost: number | null;
    client_revenue: number | null;
    gross_profit: number | null;
    roi_pct: number | null;
    finance_status: string;
    notes: string | null;
    entered_at: string | null;
  } | null;
}

const fmt = (n: number | null) =>
  n == null ? "—" : `NGN ${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const roiBadge = (roi: number | null) => {
  if (roi == null) return <span className="text-muted-foreground text-xs">—</span>;
  if (roi >= 20) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">{roi.toFixed(1)}% ROI</Badge>;
  if (roi >= 0)  return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20">{roi.toFixed(1)}% ROI</Badge>;
  return <Badge variant="destructive">{roi.toFixed(1)}% ROI</Badge>;
};

const dispatchStatusBadge = (status: string) => {
  const map: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    assigned: "bg-blue-500/10 text-blue-600",
    picked_up: "bg-indigo-500/10 text-indigo-600",
    in_transit: "bg-amber-500/10 text-amber-600",
    delivered: "bg-emerald-500/10 text-emerald-600",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
};

export default function DispatchFinanceQueue() {
  const { organizationId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = organizationId ?? "00000000-0000-0000-0000-000000000000";

  const [tab, setTab] = useState<"pending" | "complete">("pending");
  const [selected, setSelected] = useState<DispatchRow | null>(null);
  const [form, setForm] = useState({ vendor_cost: "", client_revenue: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Query dispatches that are approved (by ops_manager / super_admin / admin / org_admin),
  // scoped strictly to this org, left-joining dispatch_financials.
  // The org isolation is enforced both here (.eq organization_id) and by RLS on both tables.
  const { data: records, isLoading, error: queryError, refetch } = useQuery({
    queryKey: ["dispatch-finance-queue", orgId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, organization_id,
          status, approval_status,
          pickup_address, delivery_address,
          scheduled_pickup, actual_delivery, distance_km,
          customers ( company_name ),
          drivers ( full_name ),
          vehicles ( registration_number ),
          dispatch_financials (
            id, vendor_cost, client_revenue,
            gross_profit, roi_pct,
            finance_status, notes, entered_at
          )
        `)
        .eq("organization_id", orgId)          // hard org scope — no cross-org leaks
        .eq("approval_status", "approved")     // only approved dispatches surface to finance
        .neq("status", "cancelled")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Supabase returns dispatch_financials as an array (one-to-many shape).
      // Since the UNIQUE constraint guarantees at most one row, flatten it.
      return (data ?? []).map((d: any) => ({
        ...d,
        // derive finance_status from the joined row so we don't depend on
        // the dispatches.finance_status column (added by migration 20260710000002)
        dispatch_financials: Array.isArray(d.dispatch_financials)
          ? (d.dispatch_financials[0] ?? null)
          : d.dispatch_financials ?? null,
      })) as DispatchRow[];
    },
  });

  // Pending = approved dispatches with no finance entry OR finance_status = 'pending'
  const pending = records?.filter(r =>
    !r.dispatch_financials || r.dispatch_financials.finance_status === "pending"
  ) ?? [];

  // Complete = finance entry done
  const complete = records?.filter(r =>
    r.dispatch_financials?.finance_status === "complete"
  ) ?? [];

  // Flagged
  const flagged = records?.filter(r =>
    r.dispatch_financials?.finance_status === "flagged"
  ) ?? [];

  // KPI totals from completed rows
  const totalRevenue = complete.reduce((s, r) => s + (r.dispatch_financials?.client_revenue ?? 0), 0);
  const totalCost    = complete.reduce((s, r) => s + (r.dispatch_financials?.vendor_cost ?? 0), 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgRoi = complete.length
    ? complete.reduce((s, r) => s + (r.dispatch_financials?.roi_pct ?? 0), 0) / complete.length
    : null;

  const openForm = (row: DispatchRow) => {
    setSelected(row);
    const df = row.dispatch_financials;
    setForm({
      vendor_cost: df?.vendor_cost != null ? String(df.vendor_cost) : "",
      client_revenue: df?.client_revenue != null ? String(df.client_revenue) : "",
      notes: df?.notes ?? "",
    });
  };

  const handleSave = async () => {
    if (!selected) return;
    const vc = parseFloat(form.vendor_cost);
    const cr = parseFloat(form.client_revenue);
    if (isNaN(vc) || vc < 0) {
      toast({ title: "Invalid amount", description: "Enter a valid vendor cost", variant: "destructive" });
      return;
    }
    if (isNaN(cr) || cr < 0) {
      toast({ title: "Invalid amount", description: "Enter a valid client revenue", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        dispatch_id: selected.id,
        organization_id: orgId,
        vendor_cost: vc,
        client_revenue: cr,
        notes: form.notes || null,
        finance_status: "complete",
        entered_by: user?.id,
        entered_at: new Date().toISOString(),
      };

      // Upsert — works whether or not a dispatch_financials row already exists
      const { error } = await supabase
        .from("dispatch_financials")
        .upsert(payload, { onConflict: "dispatch_id" });

      if (error) throw error;

      // Sync finance_status on the dispatch (column added by migration 20260710000002)
      // Non-fatal — won't break save if migration hasn't run yet
      await supabase
        .from("dispatches")
        .update({ finance_status: "finance_complete" } as any)
        .eq("id", selected.id)
        .eq("organization_id", orgId);

      toast({ title: "Saved", description: "Financial figures recorded successfully." });
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["dispatch-finance-queue", orgId] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const previewProfit =
    form.vendor_cost && form.client_revenue
      ? parseFloat(form.client_revenue) - parseFloat(form.vendor_cost)
      : null;
  const previewRoi =
    previewProfit != null && parseFloat(form.vendor_cost) > 0
      ? (previewProfit / parseFloat(form.vendor_cost)) * 100
      : null;

  // If the dispatch_financials table doesn't exist yet (migration not applied),
  // show a clear prompt instead of a silent empty list.
  if (queryError) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6 text-center space-y-2">
        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
        <p className="font-semibold text-amber-700 dark:text-amber-400">Database migration required</p>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The Dispatch Finance integration requires a database migration to be applied.
          Run <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">20260710000002_dispatch_financials.sql</code> in
          the Supabase SQL Editor to enable this feature.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Awaiting Finance Entry", value: pending.length, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", sub: undefined },
          { label: "Total Revenue (Linked)", value: fmt(totalRevenue), icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-500/10", sub: undefined },
          { label: "Total Cost (Linked)", value: fmt(totalCost), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-500/10", sub: undefined },
          {
            label: "Gross Profit",
            value: fmt(totalProfit),
            icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
            color: totalProfit >= 0 ? "text-emerald-500" : "text-destructive",
            bg:    totalProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
            sub: avgRoi != null ? `Avg ROI ${avgRoi.toFixed(1)}%` : undefined,
          },
        ].map(k => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg} shrink-0`}>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-bold truncate">{k.value}</p>
                {k.sub && <p className="text-xs text-muted-foreground">{k.sub}</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Dispatch Finance Queue
              </CardTitle>
              <CardDescription>
                All approved dispatches — enter vendor cost and client revenue to record profit and ROI
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-1" />Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pending Entry
                {pending.length > 0 && (
                  <Badge className="ml-1 bg-amber-500 text-white text-[10px] h-4 px-1.5">
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="complete" className="gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Complete ({complete.length})
              </TabsTrigger>
              {flagged.length > 0 && (
                <TabsTrigger value="flagged" className="gap-1.5 text-destructive">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Flagged ({flagged.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="pending">
              <QueueTable rows={pending} isLoading={isLoading} onEdit={openForm} showFinance={false} />
            </TabsContent>
            <TabsContent value="complete">
              <QueueTable rows={complete} isLoading={isLoading} onEdit={openForm} showFinance />
            </TabsContent>
            {flagged.length > 0 && (
              <TabsContent value="flagged">
                <QueueTable rows={flagged} isLoading={isLoading} onEdit={openForm} showFinance />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Finance entry dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>
              Finance Entry — {selected?.dispatch_number}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Dispatch summary */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selected.customers?.company_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatch Status</span>
                  {dispatchStatusBadge(selected.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span>{selected.drivers?.full_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span>{selected.vehicles?.registration_number ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="text-right max-w-[58%] truncate text-xs">
                    {selected.pickup_address} → {selected.delivery_address}
                  </span>
                </div>
                {selected.actual_delivery && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivered</span>
                    <span>{format(new Date(selected.actual_delivery), "dd MMM yyyy, HH:mm")}</span>
                  </div>
                )}
                {selected.distance_km && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span>{selected.distance_km.toLocaleString()} km</span>
                  </div>
                )}
              </div>

              {/* Finance inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Vendor Cost (NGN) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.vendor_cost}
                    onChange={e => setForm(f => ({ ...f, vendor_cost: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Payout to vendor / 3PL</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Client Revenue (NGN) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={form.client_revenue}
                    onChange={e => setForm(f => ({ ...f, client_revenue: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">Amount charged to client</p>
                </div>
              </div>

              {/* Live profit preview */}
              {previewProfit != null && (
                <div className={`rounded-lg p-3 text-sm flex items-center justify-between border
                  ${previewProfit >= 0
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-destructive/10 border-destructive/20"}`}>
                  <div>
                    <p className="font-medium">Gross Profit: {fmt(previewProfit)}</p>
                    {previewRoi != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">ROI: {previewRoi.toFixed(1)}%</p>
                    )}
                  </div>
                  {previewProfit >= 0
                    ? <TrendingUp className="w-5 h-5 text-emerald-500" />
                    : <TrendingDown className="w-5 h-5 text-destructive" />
                  }
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="Any remarks about this dispatch's financials…"
                  rows={2}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save & Mark Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Queue table ───────────────────────────────────────────────────────────────
interface QueueTableProps {
  rows: DispatchRow[];
  isLoading: boolean;
  onEdit: (r: DispatchRow) => void;
  showFinance: boolean;
}

function QueueTable({ rows, isLoading, onEdit, showFinance }: QueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        {showFinance ? "No completed finance entries yet." : "No approved dispatches awaiting finance entry."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Dispatch #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Driver / Vehicle</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            {showFinance && (
              <>
                <TableHead className="text-right">Vendor Cost</TableHead>
                <TableHead className="text-right">Client Revenue</TableHead>
                <TableHead className="text-right">Profit / ROI</TableHead>
              </>
            )}
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(r => {
            const df = r.dispatch_financials;
            return (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-sm font-medium">{r.dispatch_number}</TableCell>
                <TableCell>{r.customers?.company_name ?? "—"}</TableCell>
                <TableCell className="text-sm">
                  <span>{r.drivers?.full_name ?? "—"}</span>
                  {r.vehicles?.registration_number && (
                    <span className="text-muted-foreground ml-1">· {r.vehicles.registration_number}</span>
                  )}
                </TableCell>
                <TableCell>{dispatchStatusBadge(r.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {r.actual_delivery
                    ? format(new Date(r.actual_delivery), "dd MMM yy")
                    : r.scheduled_pickup
                    ? format(new Date(r.scheduled_pickup), "dd MMM yy")
                    : "—"}
                </TableCell>
                {showFinance && (
                  <>
                    <TableCell className="text-right font-medium">{fmt(df?.vendor_cost ?? null)}</TableCell>
                    <TableCell className="text-right font-medium">{fmt(df?.client_revenue ?? null)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-sm font-semibold ${(df?.gross_profit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                          {fmt(df?.gross_profit ?? null)}
                        </span>
                        {roiBadge(df?.roi_pct ?? null)}
                      </div>
                    </TableCell>
                  </>
                )}
                <TableCell>
                  <Button size="sm" variant="outline" onClick={() => onEdit(r)}>
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    {showFinance ? "Edit" : "Enter"}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
