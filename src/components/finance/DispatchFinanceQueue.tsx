import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface DispatchFinancial {
  id: string;
  dispatch_id: string;
  organization_id: string;
  vendor_cost: number | null;
  client_revenue: number | null;
  gross_profit: number | null;
  roi_pct: number | null;
  finance_status: "pending" | "complete" | "flagged";
  currency_code: string;
  notes: string | null;
  entered_by: string | null;
  entered_at: string | null;
  invoice_id: string | null;
  bill_id: string | null;
  created_at: string;
  updated_at: string;
  dispatches: {
    dispatch_number: string;
    status: string;
    finance_status: string;
    pickup_address: string;
    delivery_address: string;
    scheduled_pickup: string | null;
    actual_delivery: string | null;
    distance_km: number | null;
    customers: { company_name: string } | null;
    drivers: { name: string } | null;
    vehicles: { plate_number: string } | null;
  };
}

const fmt = (n: number | null, currency = "NGN") =>
  n == null ? "—" : `${currency} ${n.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const roiBadge = (roi: number | null) => {
  if (roi == null) return <span className="text-muted-foreground text-xs">—</span>;
  if (roi >= 20) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">{roi.toFixed(1)}% ROI</Badge>;
  if (roi >= 0) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20">{roi.toFixed(1)}% ROI</Badge>;
  return <Badge variant="destructive">{roi.toFixed(1)}% ROI</Badge>;
};

export default function DispatchFinanceQueue() {
  const { organizationId, user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgId = organizationId ?? "00000000-0000-0000-0000-000000000000";

  const [tab, setTab] = useState<"pending" | "complete">("pending");
  const [selected, setSelected] = useState<DispatchFinancial | null>(null);
  const [form, setForm] = useState({ vendor_cost: "", client_revenue: "", notes: "" });
  const [saving, setSaving] = useState(false);

  // Fetch all dispatch_financials for this org, joined to dispatch + customer + driver + vehicle
  const { data: records, isLoading, refetch } = useQuery({
    queryKey: ["dispatch-financials", orgId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_financials")
        .select(`
          *,
          dispatches (
            dispatch_number, status, finance_status,
            pickup_address, delivery_address,
            scheduled_pickup, actual_delivery, distance_km,
            customers ( company_name ),
            drivers ( name ),
            vehicles ( plate_number )
          )
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as DispatchFinancial[];
    },
  });

  const pending = records?.filter(r => r.finance_status === "pending") ?? [];
  const complete = records?.filter(r => r.finance_status === "complete") ?? [];
  const flagged = records?.filter(r => r.finance_status === "flagged") ?? [];

  // Summary stats from completed records
  const totalRevenue = complete.reduce((s, r) => s + (r.client_revenue ?? 0), 0);
  const totalCost    = complete.reduce((s, r) => s + (r.vendor_cost ?? 0), 0);
  const totalProfit  = totalRevenue - totalCost;
  const avgRoi       = complete.length
    ? complete.reduce((s, r) => s + (r.roi_pct ?? 0), 0) / complete.length
    : null;

  const openForm = (record: DispatchFinancial) => {
    setSelected(record);
    setForm({
      vendor_cost: record.vendor_cost != null ? String(record.vendor_cost) : "",
      client_revenue: record.client_revenue != null ? String(record.client_revenue) : "",
      notes: record.notes ?? "",
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
      const { error } = await supabase
        .from("dispatch_financials")
        .update({
          vendor_cost: vc,
          client_revenue: cr,
          notes: form.notes || null,
          finance_status: "complete",
          entered_by: user?.id,
          entered_at: new Date().toISOString(),
        })
        .eq("id", selected.id);

      if (error) throw error;

      // Sync finance_status on the dispatch record
      await supabase
        .from("dispatches")
        .update({ finance_status: "finance_complete" })
        .eq("id", selected.dispatch_id);

      toast({ title: "Saved", description: "Financial figures recorded successfully." });
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["dispatch-financials", orgId] });
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

  return (
    <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: "Pending Finance Entry",
            value: pending.length,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-500/10",
            suffix: "dispatches",
          },
          {
            label: "Total Revenue (Linked)",
            value: fmt(totalRevenue),
            icon: ArrowUpRight,
            color: "text-emerald-500",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Total Cost (Linked)",
            value: fmt(totalCost),
            icon: DollarSign,
            color: "text-blue-500",
            bg: "bg-blue-500/10",
          },
          {
            label: "Gross Profit",
            value: fmt(totalProfit),
            icon: totalProfit >= 0 ? TrendingUp : TrendingDown,
            color: totalProfit >= 0 ? "text-emerald-500" : "text-destructive",
            bg: totalProfit >= 0 ? "bg-emerald-500/10" : "bg-destructive/10",
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
                Record vendor cost and client revenue against completed dispatches
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
                Pending
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
              <QueueTable
                rows={pending}
                isLoading={isLoading}
                onEdit={openForm}
                showFinance={false}
              />
            </TabsContent>

            <TabsContent value="complete">
              <QueueTable
                rows={complete}
                isLoading={isLoading}
                onEdit={openForm}
                showFinance
              />
            </TabsContent>

            {flagged.length > 0 && (
              <TabsContent value="flagged">
                <QueueTable
                  rows={flagged}
                  isLoading={isLoading}
                  onEdit={openForm}
                  showFinance
                />
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
              Finance Entry — {selected?.dispatches?.dispatch_number}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              {/* Dispatch summary */}
              <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client</span>
                  <span className="font-medium">{selected.dispatches?.customers?.company_name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver</span>
                  <span>{selected.dispatches?.drivers?.name ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <span>{selected.dispatches?.vehicles?.plate_number ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Route</span>
                  <span className="text-right max-w-[60%] truncate">
                    {selected.dispatches?.pickup_address} → {selected.dispatches?.delivery_address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered</span>
                  <span>
                    {selected.dispatches?.actual_delivery
                      ? format(new Date(selected.dispatches.actual_delivery), "dd MMM yyyy, HH:mm")
                      : "—"}
                  </span>
                </div>
                {selected.dispatches?.distance_km && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distance</span>
                    <span>{selected.dispatches.distance_km.toLocaleString()} km</span>
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
                <div className={`rounded-lg p-3 text-sm flex items-center justify-between
                  ${previewProfit >= 0 ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
                  <div>
                    <p className="font-medium">
                      Gross Profit: {fmt(previewProfit)}
                    </p>
                    {previewRoi != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ROI: {previewRoi.toFixed(1)}%
                      </p>
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

// ── Queue table (shared between pending / complete tabs) ──────────────────────
interface QueueTableProps {
  rows: DispatchFinancial[];
  isLoading: boolean;
  onEdit: (r: DispatchFinancial) => void;
  showFinance: boolean;
}

function QueueTable({ rows, isLoading, onEdit, showFinance }: QueueTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        {showFinance ? "No completed entries yet." : "No dispatches pending finance entry."}
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
            <TableHead>Delivered</TableHead>
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
          {rows.map(r => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-sm font-medium">
                {r.dispatches?.dispatch_number}
              </TableCell>
              <TableCell>{r.dispatches?.customers?.company_name ?? "—"}</TableCell>
              <TableCell className="text-sm">
                <span>{r.dispatches?.drivers?.name ?? "—"}</span>
                {r.dispatches?.vehicles?.plate_number && (
                  <span className="text-muted-foreground ml-1">
                    · {r.dispatches.vehicles.plate_number}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {r.dispatches?.actual_delivery
                  ? format(new Date(r.dispatches.actual_delivery), "dd MMM yy")
                  : "—"}
              </TableCell>
              {showFinance && (
                <>
                  <TableCell className="text-right font-medium">{fmt(r.vendor_cost)}</TableCell>
                  <TableCell className="text-right font-medium">{fmt(r.client_revenue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className={`text-sm font-semibold ${(r.gross_profit ?? 0) >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                        {fmt(r.gross_profit)}
                      </span>
                      {roiBadge(r.roi_pct)}
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
