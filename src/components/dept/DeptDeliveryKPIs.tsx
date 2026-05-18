/**
 * DeptDeliveryKPIs.tsx - DPO Delivery Pillar KPIs
 * Covers: IN Full breakdown, Delivery Quality Index (DQI), Refusals,
 * KM Deviation, Capacity Occupation. Used by Logistics Manager (canLog=true)
 * and Head of Logistics (canLog=false).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Target, TrendingDown, AlertTriangle, Package, Truck, CheckCircle, XCircle,
  Plus, BarChart3, Gauge,
} from "lucide-react";

const REFUSAL_REASONS: Record<string, string> = {
  stock_out: "Stock-Out",
  credit_issue: "Credit Issue",
  logistics_issue: "Logistics Issue",
  master_data: "Master Data",
  customer_refusal: "Customer Refusal",
  quality_issue: "Quality Issue",
  other: "Other",
};

const DAMAGE_TYPES: Record<string, string> = {
  handling: "Handling",
  breakage: "Breakage",
  temperature: "Temperature",
  contamination: "Contamination",
  crush: "Crush",
  expired: "Expired",
  packaging: "Packaging",
  other: "Other",
};

interface Props {
  orgId: string;
  canLog: boolean;
}

export default function DeptDeliveryKPIs({ orgId, canLog }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const monthStart = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString();
  }, []);

  const { data: dispatches = [] } = useQuery({
    queryKey: ["dept-dispatches-kpi", orgId, monthStart],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("dispatches")
        .select("id, dispatch_number, status, sla_status, cargo_weight_kg, km_planned, km_actual, km_deviation_pct, eta_promised, actual_arrival_time, eta_met, load_capacity_pct, created_at, completed_at")
        .eq("organization_id", orgId)
        .gte("created_at", monthStart)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: refusals = [] } = useQuery({
    queryKey: ["ld-refusals", orgId, monthStart],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ld_refusals")
        .select("*").eq("organization_id", orgId).gte("created_at", monthStart)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: dqiRecords = [] } = useQuery({
    queryKey: ["ld-dqi", orgId, monthStart],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ld_dqi_records")
        .select("*").eq("organization_id", orgId).gte("created_at", monthStart)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // ─── KPI calculations ───────────────────────────────────────────
  const totalOrders = dispatches.length;
  const refusedOrderIds = new Set(refusals.map((r: any) => r.dispatch_id));
  const inFullCount = totalOrders - refusedOrderIds.size;
  const inFullPct = totalOrders > 0 ? Math.round((inFullCount / totalOrders) * 1000) / 10 : 0;

  const refusalsByReason: Record<string, number> = {};
  refusals.forEach((r: any) => { refusalsByReason[r.reason_bucket] = (refusalsByReason[r.reason_bucket] ?? 0) + 1; });

  const totalVolume = dqiRecords.reduce((s: number, r: any) => s + Number(r.total_volume_kg ?? 0), 0);
  const damagedVolume = dqiRecords.reduce((s: number, r: any) => s + Number(r.damaged_volume_kg ?? 0), 0);
  const dqiPpm = totalVolume > 0 ? Math.round((damagedVolume / totalVolume) * 1_000_000) : 0;

  const withKm = dispatches.filter((d: any) => d.km_planned && d.km_actual);
  const avgKmDev = withKm.length
    ? Math.round((withKm.reduce((s: number, d: any) => s + Math.abs(Number(d.km_deviation_pct ?? 0)), 0) / withKm.length) * 10) / 10
    : 0;

  const withLoad = dispatches.filter((d: any) => d.load_capacity_pct != null);
  const avgLoad = withLoad.length
    ? Math.round(withLoad.reduce((s: number, d: any) => s + Number(d.load_capacity_pct ?? 0), 0) / withLoad.length)
    : 0;

  // ─── Refusal form ───────────────────────────────────────────────
  const [refOpen, setRefOpen] = useState(false);
  const [refForm, setRefForm] = useState({ dispatch_id: "", reason_bucket: "stock_out", volume_refused_kg: "", sku_description: "", notes: "" });
  const logRefusal = useMutation({
    mutationFn: async () => {
      if (!user || !refForm.dispatch_id) throw new Error("Pick a dispatch");
      const { error } = await (supabase as any).from("ld_refusals").insert({
        organization_id: orgId,
        dispatch_id: refForm.dispatch_id,
        reason_bucket: refForm.reason_bucket,
        volume_refused_kg: Number(refForm.volume_refused_kg) || 0,
        sku_description: refForm.sku_description || null,
        notes: refForm.notes || null,
        logged_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Refusal logged");
      setRefOpen(false);
      setRefForm({ dispatch_id: "", reason_bucket: "stock_out", volume_refused_kg: "", sku_description: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["ld-refusals", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── DQI form ───────────────────────────────────────────────────
  const [dqiOpen, setDqiOpen] = useState(false);
  const [dqiForm, setDqiForm] = useState({ dispatch_id: "", total_volume_kg: "", damaged_volume_kg: "", damage_type: "handling", occurred_at: "in_transit", damage_description: "" });
  const logDqi = useMutation({
    mutationFn: async () => {
      if (!user || !dqiForm.dispatch_id) throw new Error("Pick a dispatch");
      if (!dqiForm.total_volume_kg) throw new Error("Total volume required");
      const { error } = await (supabase as any).from("ld_dqi_records").insert({
        organization_id: orgId,
        dispatch_id: dqiForm.dispatch_id,
        total_volume_kg: Number(dqiForm.total_volume_kg),
        damaged_volume_kg: Number(dqiForm.damaged_volume_kg) || 0,
        damage_type: dqiForm.damage_type,
        occurred_at: dqiForm.occurred_at,
        damage_description: dqiForm.damage_description || null,
        logged_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("DQI logged");
      setDqiOpen(false);
      setDqiForm({ dispatch_id: "", total_volume_kg: "", damaged_volume_kg: "", damage_type: "handling", occurred_at: "in_transit", damage_description: "" });
      qc.invalidateQueries({ queryKey: ["ld-dqi", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const kpis = [
    { label: "IN Full", value: `${inFullPct}%`, target: "≥ 98%", ok: inFullPct >= 98, icon: CheckCircle, sub: `${inFullCount}/${totalOrders} orders` },
    { label: "DQI (ppm)", value: dqiPpm.toLocaleString(), target: "≤ 1,000 ppm", ok: dqiPpm <= 1000, icon: Package, sub: `${damagedVolume.toFixed(1)}kg damaged` },
    { label: "Refusals", value: refusals.length.toString(), target: "→ 0", ok: refusals.length === 0, icon: XCircle, sub: `${refusedOrderIds.size} orders refused` },
    { label: "Avg KM Deviation", value: `${avgKmDev}%`, target: "< 10%", ok: avgKmDev < 10, icon: TrendingDown, sub: "Actual vs planned" },
    { label: "Capacity Occupation", value: `${avgLoad}%`, target: "≥ 85%", ok: avgLoad >= 85, icon: Gauge, sub: `${withLoad.length} measured` },
  ];

  return (
    <div className="space-y-4">
      {/* ─── KPI overview ─── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`w-4 h-4 ${k.ok ? "text-emerald-600" : "text-amber-600"}`} />
                  <Badge variant={k.ok ? "default" : "secondary"} className="text-[9px]">{k.target}</Badge>
                </div>
                <p className={`text-2xl font-bold ${k.ok ? "text-emerald-700" : "text-amber-700"}`}>{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                <p className="text-[10px] text-muted-foreground">{k.sub}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="in_full" className="w-full">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="in_full"><Target className="w-3.5 h-3.5 mr-1" />IN Full</TabsTrigger>
          <TabsTrigger value="dqi"><Package className="w-3.5 h-3.5 mr-1" />DQI</TabsTrigger>
          <TabsTrigger value="refusals"><XCircle className="w-3.5 h-3.5 mr-1" />Refusals</TabsTrigger>
          <TabsTrigger value="km_dev"><TrendingDown className="w-3.5 h-3.5 mr-1" />KM Deviation</TabsTrigger>
          <TabsTrigger value="capacity"><Gauge className="w-3.5 h-3.5 mr-1" />Capacity</TabsTrigger>
        </TabsList>

        {/* IN FULL BREAKDOWN */}
        <TabsContent value="in_full" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4" />IN Full breakdown by reason bucket</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(REFUSAL_REASONS).map(([k, v]) => {
                const count = refusalsByReason[k] ?? 0;
                const pct = refusals.length ? Math.round((count / refusals.length) * 100) : 0;
                return (
                  <div key={k} className="flex items-center justify-between text-sm">
                    <span>{v}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                      </div>
                      <Badge variant="outline" className="text-[10px] w-14 justify-center">{count} ({pct}%)</Badge>
                    </div>
                  </div>
                );
              })}
              {refusals.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">All orders delivered IN Full this month - no refusals logged.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DQI */}
        <TabsContent value="dqi" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Delivery Quality Index records</h3>
            {canLog && (
              <Dialog open={dqiOpen} onOpenChange={setDqiOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Log DQI</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log damage / DQI</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Dispatch</Label>
                      <Select value={dqiForm.dispatch_id} onValueChange={(v) => setDqiForm((f) => ({ ...f, dispatch_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Pick dispatch" /></SelectTrigger>
                        <SelectContent>
                          {dispatches.slice(0, 50).map((d: any) => (
                            <SelectItem key={d.id} value={d.id}>{d.dispatch_number ?? d.id.slice(0, 8)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Total volume (kg)</Label><Input type="number" value={dqiForm.total_volume_kg} onChange={(e) => setDqiForm((f) => ({ ...f, total_volume_kg: e.target.value }))} /></div>
                      <div><Label>Damaged (kg)</Label><Input type="number" value={dqiForm.damaged_volume_kg} onChange={(e) => setDqiForm((f) => ({ ...f, damaged_volume_kg: e.target.value }))} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Damage type</Label>
                        <Select value={dqiForm.damage_type} onValueChange={(v) => setDqiForm((f) => ({ ...f, damage_type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{Object.entries(DAMAGE_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Where</Label>
                        <Select value={dqiForm.occurred_at} onValueChange={(v) => setDqiForm((f) => ({ ...f, occurred_at: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="loading">Loading</SelectItem>
                            <SelectItem value="in_transit">In Transit</SelectItem>
                            <SelectItem value="unloading">Unloading</SelectItem>
                            <SelectItem value="at_customer">At Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div><Label>Description</Label><Textarea value={dqiForm.damage_description} onChange={(e) => setDqiForm((f) => ({ ...f, damage_description: e.target.value }))} /></div>
                  </div>
                  <DialogFooter><Button onClick={() => logDqi.mutate()} disabled={logDqi.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card><CardContent className="pt-3">
            {dqiRecords.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No DQI records yet.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Dispatch</TableHead><TableHead>Type</TableHead><TableHead>Where</TableHead><TableHead className="text-right">Total kg</TableHead><TableHead className="text-right">Damaged</TableHead><TableHead className="text-right">PPM</TableHead></TableRow></TableHeader>
                <TableBody>
                  {dqiRecords.slice(0, 20).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.record_date}</TableCell>
                      <TableCell className="text-xs font-mono">{r.dispatch_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{DAMAGE_TYPES[r.damage_type] ?? r.damage_type}</TableCell>
                      <TableCell className="text-xs">{r.occurred_at}</TableCell>
                      <TableCell className="text-xs text-right">{Number(r.total_volume_kg).toFixed(1)}</TableCell>
                      <TableCell className="text-xs text-right">{Number(r.damaged_volume_kg).toFixed(1)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{Number(r.dqi_ppm).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* REFUSALS */}
        <TabsContent value="refusals" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Refusals log</h3>
            {canLog && (
              <Dialog open={refOpen} onOpenChange={setRefOpen}>
                <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Log refusal</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log a refusal</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>Dispatch</Label>
                      <Select value={refForm.dispatch_id} onValueChange={(v) => setRefForm((f) => ({ ...f, dispatch_id: v }))}>
                        <SelectTrigger><SelectValue placeholder="Pick dispatch" /></SelectTrigger>
                        <SelectContent>{dispatches.slice(0, 50).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.dispatch_number ?? d.id.slice(0, 8)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reason</Label>
                      <Select value={refForm.reason_bucket} onValueChange={(v) => setRefForm((f) => ({ ...f, reason_bucket: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(REFUSAL_REASONS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><Label>Volume (kg)</Label><Input type="number" value={refForm.volume_refused_kg} onChange={(e) => setRefForm((f) => ({ ...f, volume_refused_kg: e.target.value }))} /></div>
                      <div><Label>SKU</Label><Input value={refForm.sku_description} onChange={(e) => setRefForm((f) => ({ ...f, sku_description: e.target.value }))} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={refForm.notes} onChange={(e) => setRefForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  </div>
                  <DialogFooter><Button onClick={() => logRefusal.mutate()} disabled={logRefusal.isPending}>Save</Button></DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <Card><CardContent className="pt-3">
            {refusals.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No refusals - IN Full looking strong.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Dispatch</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">kg</TableHead><TableHead>Modulated?</TableHead></TableRow></TableHeader>
                <TableBody>
                  {refusals.slice(0, 20).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.refusal_date}</TableCell>
                      <TableCell className="text-xs font-mono">{r.dispatch_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{REFUSAL_REASONS[r.reason_bucket] ?? r.reason_bucket}</TableCell>
                      <TableCell className="text-xs text-right">{Number(r.volume_refused_kg ?? 0).toFixed(1)}</TableCell>
                      <TableCell>{r.modulated ? <Badge className="text-[9px]">Yes</Badge> : <Badge variant="outline" className="text-[9px]">No</Badge>}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* KM DEVIATION */}
        <TabsContent value="km_dev" className="mt-4">
          <Card><CardContent className="pt-3">
            {withKm.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No dispatches with planned + actual km recorded.</p> : (
              <Table>
                <TableHeader><TableRow><TableHead>Dispatch</TableHead><TableHead className="text-right">Planned km</TableHead><TableHead className="text-right">Actual km</TableHead><TableHead className="text-right">Δ %</TableHead></TableRow></TableHeader>
                <TableBody>
                  {withKm.slice(0, 20).map((d: any) => {
                    const dev = Number(d.km_deviation_pct ?? 0);
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs font-mono">{d.dispatch_number ?? d.id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs text-right">{Number(d.km_planned).toFixed(1)}</TableCell>
                        <TableCell className="text-xs text-right">{Number(d.km_actual).toFixed(1)}</TableCell>
                        <TableCell className={`text-xs text-right font-semibold ${Math.abs(dev) > 10 ? "text-amber-600" : "text-emerald-600"}`}>{dev > 0 ? "+" : ""}{dev}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        {/* CAPACITY */}
        <TabsContent value="capacity" className="mt-4">
          <Card><CardContent className="pt-3">
            <div className="flex items-center gap-3 mb-3">
              <Truck className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{avgLoad}%</p>
                <p className="text-xs text-muted-foreground">Average load capacity utilisation across {withLoad.length} dispatches</p>
              </div>
              {avgLoad < 85 && <Badge variant="outline" className="text-amber-600 border-amber-600 ml-auto"><AlertTriangle className="w-3 h-3 mr-1" />Below target</Badge>}
            </div>
            {withLoad.length > 0 && (
              <Table>
                <TableHeader><TableRow><TableHead>Dispatch</TableHead><TableHead className="text-right">Cargo (kg)</TableHead><TableHead className="text-right">Load %</TableHead></TableRow></TableHeader>
                <TableBody>
                  {withLoad.slice(0, 15).map((d: any) => (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs font-mono">{d.dispatch_number ?? d.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs text-right">{Number(d.cargo_weight_kg ?? 0).toFixed(1)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{Number(d.load_capacity_pct).toFixed(0)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
