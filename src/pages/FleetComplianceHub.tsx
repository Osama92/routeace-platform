import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format, differenceInDays, startOfMonth } from "date-fns";
import { ClipboardCheck, Wrench, Fuel, AlertTriangle, FileText, Car } from "lucide-react";

const sb = supabase as any;

const useOrgId = () => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["om-org", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("organization_members").select("organization_id").eq("user_id", user!.id).eq("is_active", true).limit(1).maybeSingle();
      return (data as any)?.organization_id ?? null;
    },
  });
  return data as string | null;
};

export default function FleetComplianceHub() {
  const orgId = useOrgId();
  return (
    <DashboardLayout title="Fleet Compliance Hub" subtitle="Pre/post-trip checks, fuel, fines, incidents & document compliance">
      {!orgId ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Loading organisation context…</CardContent></Card>
      ) : (
        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="flex flex-wrap gap-1 h-auto">
            <TabsTrigger value="dashboard">Compliance Dashboard</TabsTrigger>
            <TabsTrigger value="supervisory">Supervisory Checks</TabsTrigger>
            <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
            <TabsTrigger value="fuel">Fuel Logs</TabsTrigger>
            <TabsTrigger value="fines">Fines & Incidents</TabsTrigger>
            <TabsTrigger value="documents">Document Compliance</TabsTrigger>
          </TabsList>
          <TabsContent value="dashboard"><Dashboard orgId={orgId} /></TabsContent>
          <TabsContent value="supervisory"><Supervisory orgId={orgId} /></TabsContent>
          <TabsContent value="work-orders"><WorkOrders orgId={orgId} /></TabsContent>
          <TabsContent value="fuel"><FuelLogs orgId={orgId} /></TabsContent>
          <TabsContent value="fines"><FinesAndIncidents orgId={orgId} /></TabsContent>
          <TabsContent value="documents"><Documents orgId={orgId} /></TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
}

const useVehicles = (orgId: string) => useQuery({
  queryKey: ["fch-vehicles", orgId],
  queryFn: async () => {
    const { data } = await supabase.from("vehicles").select("id, registration_number, vehicle_type, status").eq("organization_id", orgId).neq("status", "retired");
    return data ?? [];
  },
});

/* ---------- Tab 1 Dashboard ---------- */
function Dashboard({ orgId }: { orgId: string }) {
  const { data: vehicles = [] } = useVehicles(orgId);
  const today = new Date().toISOString().split("T")[0];
  const { data: todayChecks = [] } = useQuery({
    queryKey: ["fch-today-checks", orgId, today],
    queryFn: async () => {
      const { data } = await sb.from("vehicle_checklists").select("vehicle_id, checklist_type, overall_result").eq("organization_id", orgId).eq("checklist_date", today);
      return data ?? [];
    },
  });
  const { data: openWO = [] } = useQuery({
    queryKey: ["fch-open-wo", orgId],
    queryFn: async () => {
      const { data } = await sb.from("work_orders").select("id, vehicle_id").eq("organization_id", orgId).in("status", ["open","in_progress"]);
      return data ?? [];
    },
  });

  const vehicleIds = vehicles.map((v: any) => v.id);
  const { data: docs = [] } = useQuery({
    queryKey: ["fch-docs", orgId, vehicleIds.length],
    enabled: vehicleIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("vehicle_documents").select("vehicle_id, expiry_date").in("vehicle_id", vehicleIds);
      return data ?? [];
    },
  });

  const total = vehicles.length;
  const blocked = todayChecks.filter((c: any) => c.overall_result === "fail").length;
  const completion = total > 0 ? Math.round((new Set(todayChecks.filter((c: any) => c.checklist_type === "pre_trip").map((c: any) => c.vehicle_id)).size / total) * 100) : 0;
  const expiringSoon = (docs as any[]).filter(d => d.expiry_date && differenceInDays(new Date(d.expiry_date), new Date()) <= 30 && differenceInDays(new Date(d.expiry_date), new Date()) >= 0).length;
  const available = vehicles.filter((v: any) => v.status === "active" || v.status === "available").length;
  const availPct = total > 0 ? Math.round((available / total) * 100) : 0;

  const Kpi = ({ label, value, color }: any) => (
    <Card><CardContent className="pt-4 pb-4 text-center">
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Kpi label="Pre-trip done today" value={`${completion}%`} />
        <Kpi label="Blocked by safety" value={blocked} color={blocked > 0 ? "hsl(var(--destructive))" : undefined} />
        <Kpi label="Open work orders" value={openWO.length} />
        <Kpi label="Docs expiring ≤30d" value={expiringSoon} />
        <Kpi label="Fleet availability" value={`${availPct}%`} />
      </div>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr>
            <th className="text-left p-2">Vehicle</th><th className="text-left p-2">Type</th><th className="text-left p-2">Status</th>
            <th className="text-left p-2">Pre-trip</th><th className="text-left p-2">Post-trip</th><th className="text-left p-2">Open WO</th>
          </tr></thead>
          <tbody>
            {vehicles.map((v: any) => {
              const pre = (todayChecks as any[]).find(c => c.vehicle_id === v.id && c.checklist_type === "pre_trip");
              const post = (todayChecks as any[]).find(c => c.vehicle_id === v.id && c.checklist_type === "post_trip");
              const wo = openWO.filter((w: any) => w.vehicle_id === v.id).length;
              const cell = (c: any) => c ? <Badge variant="outline" className={c.overall_result === "pass" ? "bg-green-500/15 text-green-700" : c.overall_result === "pass_with_issues" ? "bg-amber-500/15 text-amber-700" : "bg-red-500/15 text-red-700"}>{c.overall_result.replace(/_/g," ")}</Badge> : <span className="text-muted-foreground text-xs">missing</span>;
              return (<tr key={v.id} className="border-t">
                <td className="p-2 font-medium">{v.registration_number}</td>
                <td className="p-2">{v.vehicle_type}</td>
                <td className="p-2"><Badge variant="outline">{v.status}</Badge></td>
                <td className="p-2">{cell(pre)}</td>
                <td className="p-2">{cell(post)}</td>
                <td className="p-2">{wo > 0 ? <Badge variant="destructive">{wo}</Badge> : <span className="text-muted-foreground">-</span>}</td>
              </tr>);
            })}
            {vehicles.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No vehicles in this organisation.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ---------- Tab 2 Supervisory check ---------- */
const CATEGORIES = ["Engine & Fluids","Brakes","Tyres","Lights & Signals","Safety Equipment","Body & Mirrors","Fuel & Gauges","Documents"];
function Supervisory({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: vehicles = [] } = useVehicles(orgId);
  const [vehicleId, setVehicleId] = useState("");
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");
  const [conds, setConds] = useState<Record<string, string>>(Object.fromEntries(CATEGORIES.map(c => [c, "good"])));

  const { data: history = [] } = useQuery({
    queryKey: ["sup-history", orgId],
    queryFn: async () => {
      const { data } = await sb.from("vehicle_checklists").select("id, vehicle_id, checklist_date, overall_result, submitted_by").eq("organization_id", orgId).eq("checklist_type", "supervisory").order("checklist_date", { ascending: false }).limit(30);
      return data ?? [];
    },
  });

  const submit = async () => {
    if (!vehicleId || !user) { toast({ title: "Vehicle required", variant: "destructive" }); return; }
    const hasCritical = Object.values(conds).includes("critical");
    const hasPoor = Object.values(conds).includes("poor");
    const result = hasCritical ? "fail" : hasPoor ? "pass_with_issues" : "pass";
    const { data: cl, error } = await sb.from("vehicle_checklists").insert({
      organization_id: orgId, vehicle_id: vehicleId, submitted_by: user.id,
      checklist_type: "supervisory", odometer_reading: parseFloat(odometer) || null,
      overall_result: result, safety_critical_fail: hasCritical, notes: notes || null,
      completed_at: new Date().toISOString(),
    }).select("id").single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    await sb.from("vehicle_checklist_items").insert(CATEGORIES.map(c => ({ checklist_id: cl.id, category: c, item_name: c, condition: conds[c], is_safety_critical: true })));
    toast({ title: "Supervisory check recorded" });
    setVehicleId(""); setOdometer(""); setNotes(""); setConds(Object.fromEntries(CATEGORIES.map(c => [c, "good"])));
    qc.invalidateQueries({ queryKey: ["sup-history"] });
  };

  return (
    <div className="space-y-4">
      <Card><CardContent className="pt-4 pb-4 space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Vehicle</Label>
            <Select value={vehicleId} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
              <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Odometer (km)</Label><Input type="number" value={odometer} onChange={e => setOdometer(e.target.value)} /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {CATEGORIES.map(c => (
            <div key={c} className="flex items-center justify-between gap-2 border rounded-md p-2">
              <span className="text-sm">{c}</span>
              <Select value={conds[c]} onValueChange={v => setConds(prev => ({ ...prev, [c]: v }))}>
                <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["good","fair","poor","critical"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
        <Textarea placeholder="Inspector notes" value={notes} onChange={e => setNotes(e.target.value)} />
        <Button onClick={submit}>Submit Supervisory Check</Button>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Vehicle</th><th className="text-left p-2">Result</th></tr></thead>
          <tbody>
            {(history as any[]).map(h => {
              const v = (vehicles as any[]).find(x => x.id === h.vehicle_id);
              return <tr key={h.id} className="border-t"><td className="p-2">{h.checklist_date}</td><td className="p-2">{v?.registration_number ?? h.vehicle_id}</td><td className="p-2">{h.overall_result}</td></tr>;
            })}
            {history.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No supervisory checks yet.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ---------- Tab 3 Work Orders ---------- */
function WorkOrders({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: vehicles = [] } = useVehicles(orgId);
  const { data: orders = [] } = useQuery({
    queryKey: ["wo", orgId],
    queryFn: async () => {
      const { data } = await sb.from("work_orders").select("*").eq("organization_id", orgId).order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ vehicle_id: "", title: "", description: "", category: "mechanical", priority: "medium", due_by: "", assigned_to: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.vehicle_id || !form.title || !user) throw new Error("Vehicle and title required");
      const { error } = await sb.from("work_orders").insert({
        organization_id: orgId, vehicle_id: form.vehicle_id, title: form.title, description: form.description || null,
        category: form.category, priority: form.priority, raised_by: user.id, assigned_to: form.assigned_to || null,
        due_by: form.due_by || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Work order created" }); setOpen(false); qc.invalidateQueries({ queryKey: ["wo"] }); setForm({ vehicle_id: "", title: "", description: "", category: "mechanical", priority: "medium", due_by: "", assigned_to: "" }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const resolve = async (id: string) => {
    const notes = window.prompt("Resolution notes (optional)") ?? "";
    await sb.from("work_orders").update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_notes: notes }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["wo"] });
  };

  const open_ = (orders as any[]).filter(o => !["resolved","closed","cancelled"].includes(o.status));
  const closed = (orders as any[]).filter(o => ["resolved","closed","cancelled"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Wrench className="w-4 h-4 mr-2" />New Work Order</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent>
              </Select>
              <Input placeholder="Title *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <Textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["mechanical","electrical","body_damage","tires","fuel_system","safety_equipment","documentation","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["immediate","24_hours","48_hours","scheduled","medium","low"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Input type="datetime-local" value={form.due_by} onChange={e => setForm({ ...form, due_by: e.target.value })} />
              <Input placeholder="Assigned to (workshop / mechanic)" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} />
              <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {[{ title: "Open", rows: open_, allowResolve: true }, { title: "Resolved / Closed", rows: closed, allowResolve: false }].map(group => (
        <Card key={group.title}><CardContent className="p-0 overflow-x-auto">
          <p className="p-3 font-semibold text-sm">{group.title} ({group.rows.length})</p>
          <table className="w-full text-sm">
            <thead className="bg-muted/40"><tr><th className="text-left p-2">WO #</th><th className="text-left p-2">Vehicle</th><th className="text-left p-2">Title</th><th className="text-left p-2">Priority</th><th className="text-left p-2">Status</th><th className="text-left p-2">Due</th><th className="p-2"></th></tr></thead>
            <tbody>
              {group.rows.map((o: any) => {
                const v = (vehicles as any[]).find(x => x.id === o.vehicle_id);
                return (<tr key={o.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{o.work_order_number}</td>
                  <td className="p-2">{v?.registration_number ?? "-"}</td>
                  <td className="p-2">{o.title}</td>
                  <td className="p-2"><Badge variant="outline">{o.priority}</Badge></td>
                  <td className="p-2">{o.sla_breached ? <Badge variant="destructive">SLA Breach</Badge> : <Badge variant="outline">{o.status}</Badge>}</td>
                  <td className="p-2 text-xs">{o.due_by ? format(new Date(o.due_by), "PP p") : "-"}</td>
                  <td className="p-2">{group.allowResolve && <Button size="sm" variant="outline" onClick={() => resolve(o.id)}>Resolve</Button>}</td>
                </tr>);
              })}
              {group.rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">None</td></tr>}
            </tbody>
          </table>
        </CardContent></Card>
      ))}
    </div>
  );
}

/* ---------- Tab 4 Fuel ---------- */
function FuelLogs({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: vehicles = [] } = useVehicles(orgId);
  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const { data: logs = [] } = useQuery({
    queryKey: ["fuel-logs", orgId, monthStart],
    queryFn: async () => {
      const { data } = await sb.from("fuel_logs").select("*").eq("organization_id", orgId).gte("log_date", monthStart).order("log_date", { ascending: false });
      return data ?? [];
    },
  });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<any>({ vehicle_id: "", log_date: new Date().toISOString().split("T")[0], odometer_reading: "", litres_dispensed: "", cost_per_litre: "", fuel_station: "", receipt_number: "", fuel_type: "diesel", km_since_last_fill: "" });

  const create = useMutation({
    mutationFn: async () => {
      if (!f.vehicle_id || !user) throw new Error("Vehicle required");
      const total = (parseFloat(f.cost_per_litre) || 0) * (parseFloat(f.litres_dispensed) || 0);
      const { error } = await sb.from("fuel_logs").insert({
        organization_id: orgId, vehicle_id: f.vehicle_id, logged_by: user.id,
        log_date: f.log_date, odometer_reading: parseFloat(f.odometer_reading) || 0,
        litres_dispensed: parseFloat(f.litres_dispensed) || 0,
        cost_per_litre: parseFloat(f.cost_per_litre) || null,
        total_cost: total || null, fuel_station: f.fuel_station || null,
        receipt_number: f.receipt_number || null, fuel_type: f.fuel_type,
        km_since_last_fill: f.km_since_last_fill ? parseFloat(f.km_since_last_fill) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast({ title: "Fuel log added" }); setOpen(false); qc.invalidateQueries({ queryKey: ["fuel-logs"] }); },
    onError: (e: any) => toast({ title: e.message, variant: "destructive" }),
  });

  const totalLitres = (logs as any[]).reduce((s, l) => s + Number(l.litres_dispensed || 0), 0);
  const totalCost = (logs as any[]).reduce((s, l) => s + Number(l.total_cost || 0), 0);
  const flagged = (logs as any[]).filter(l => l.is_flagged).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{Math.round(totalLitres)}</p><p className="text-xs text-muted-foreground">Litres MTD</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">₦{totalCost.toLocaleString()}</p><p className="text-xs text-muted-foreground">Cost MTD</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold">{logs.length}</p><p className="text-xs text-muted-foreground">Fill-ups</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-4 text-center"><p className="text-2xl font-bold text-amber-600">{flagged}</p><p className="text-xs text-muted-foreground">Flagged</p></CardContent></Card>
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Fuel className="w-4 h-4 mr-2" />Log Fuel Fill-up</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Fuel Fill-up</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Select value={f.vehicle_id} onValueChange={v => setF({ ...f, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Vehicle" /></SelectTrigger>
                <SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={f.log_date} onChange={e => setF({ ...f, log_date: e.target.value })} />
                <Input placeholder="Odometer" type="number" value={f.odometer_reading} onChange={e => setF({ ...f, odometer_reading: e.target.value })} />
                <Input placeholder="Litres" type="number" value={f.litres_dispensed} onChange={e => setF({ ...f, litres_dispensed: e.target.value })} />
                <Input placeholder="Cost / litre" type="number" value={f.cost_per_litre} onChange={e => setF({ ...f, cost_per_litre: e.target.value })} />
                <Input placeholder="Km since last fill" type="number" value={f.km_since_last_fill} onChange={e => setF({ ...f, km_since_last_fill: e.target.value })} />
                <Input placeholder="Fuel station" value={f.fuel_station} onChange={e => setF({ ...f, fuel_station: e.target.value })} />
                <Input placeholder="Receipt number" value={f.receipt_number} onChange={e => setF({ ...f, receipt_number: e.target.value })} />
                <Select value={f.fuel_type} onValueChange={v => setF({ ...f, fuel_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["diesel","petrol","cng","electric","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending}>Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40"><tr><th className="text-left p-2">Date</th><th className="text-left p-2">Vehicle</th><th className="text-left p-2">Litres</th><th className="text-left p-2">₦/L</th><th className="text-left p-2">Total</th><th className="text-left p-2">km/L</th><th className="text-left p-2">Flag</th></tr></thead>
          <tbody>
            {(logs as any[]).map(l => {
              const v = (vehicles as any[]).find(x => x.id === l.vehicle_id);
              return (<tr key={l.id} className="border-t">
                <td className="p-2">{l.log_date}</td>
                <td className="p-2">{v?.registration_number ?? "-"}</td>
                <td className="p-2">{l.litres_dispensed}</td>
                <td className="p-2">{l.cost_per_litre ?? "-"}</td>
                <td className="p-2">₦{Number(l.total_cost ?? 0).toLocaleString()}</td>
                <td className="p-2">{l.km_per_litre ?? "-"}</td>
                <td className="p-2">{l.is_flagged ? <Badge variant="destructive">{l.flag_reason ?? "Flagged"}</Badge> : <Button size="sm" variant="ghost" onClick={async () => { const r = window.prompt("Flag reason"); if (r) { await sb.from("fuel_logs").update({ is_flagged: true, flag_reason: r }).eq("id", l.id); qc.invalidateQueries({ queryKey: ["fuel-logs"] }); } }}>Flag</Button>}</td>
              </tr>);
            })}
            {logs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No fuel logs this month.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

/* ---------- Tab 5 Fines & Incidents ---------- */
function FinesAndIncidents({ orgId }: { orgId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: vehicles = [] } = useVehicles(orgId);
  const { data: fines = [] } = useQuery({ queryKey: ["fines", orgId], queryFn: async () => (await sb.from("vehicle_fines").select("*").eq("organization_id", orgId).order("fine_date", { ascending: false })).data ?? [] });
  const { data: incidents = [] } = useQuery({ queryKey: ["incidents", orgId], queryFn: async () => (await sb.from("vehicle_incidents").select("*").eq("organization_id", orgId).order("incident_date", { ascending: false })).data ?? [] });
  const [fineOpen, setFineOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [fine, setFine] = useState<any>({ vehicle_id: "", fine_date: new Date().toISOString().split("T")[0], fine_type: "speeding", fine_amount: "", issuing_authority: "", fine_reference: "", paid_by: "company" });
  const [inc, setInc] = useState<any>({ vehicle_id: "", incident_date: new Date().toISOString().split("T")[0], incident_type: "collision_at_fault", severity: "minor", description: "", location: "", repair_cost_estimate: "" });

  const submitFine = async () => {
    if (!fine.vehicle_id || !user) { toast({ title: "Vehicle required", variant: "destructive" }); return; }
    const { error } = await sb.from("vehicle_fines").insert({ ...fine, fine_amount: parseFloat(fine.fine_amount) || 0, organization_id: orgId, logged_by: user.id });
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: "Fine logged" }); setFineOpen(false); qc.invalidateQueries({ queryKey: ["fines"] });
  };
  const submitInc = async () => {
    if (!inc.vehicle_id || !user || !inc.description) { toast({ title: "Vehicle & description required", variant: "destructive" }); return; }
    const { error } = await sb.from("vehicle_incidents").insert({ ...inc, repair_cost_estimate: parseFloat(inc.repair_cost_estimate) || 0, organization_id: orgId, logged_by: user.id });
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    toast({ title: "Incident logged" }); setIncOpen(false); qc.invalidateQueries({ queryKey: ["incidents"] });
  };

  return (
    <Tabs defaultValue="fines" className="space-y-3">
      <TabsList><TabsTrigger value="fines">Fines</TabsTrigger><TabsTrigger value="incidents">Incidents</TabsTrigger></TabsList>
      <TabsContent value="fines" className="space-y-3">
        <div className="flex justify-end">
          <Dialog open={fineOpen} onOpenChange={setFineOpen}>
            <DialogTrigger asChild><Button><AlertTriangle className="w-4 h-4 mr-2" />Log Fine</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Fine</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Select value={fine.vehicle_id} onValueChange={v => setFine({ ...fine, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Vehicle" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={fine.fine_date} onChange={e => setFine({ ...fine, fine_date: e.target.value })} />
                <Select value={fine.fine_type} onValueChange={v => setFine({ ...fine, fine_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["speeding","overloading","wrong_route","documentation","traffic_violation","parking","safety_violation","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Input placeholder="Amount ₦" type="number" value={fine.fine_amount} onChange={e => setFine({ ...fine, fine_amount: e.target.value })} />
                <Input placeholder="Authority" value={fine.issuing_authority} onChange={e => setFine({ ...fine, issuing_authority: e.target.value })} />
                <Input placeholder="Reference" value={fine.fine_reference} onChange={e => setFine({ ...fine, fine_reference: e.target.value })} />
                <Select value={fine.paid_by} onValueChange={v => setFine({ ...fine, paid_by: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["company","driver","insurance","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Button className="w-full" onClick={submitFine}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Vehicle</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Amount</th><th className="p-2 text-left">Status</th></tr></thead><tbody>
          {(fines as any[]).map(f => { const v = (vehicles as any[]).find(x => x.id === f.vehicle_id); return <tr key={f.id} className="border-t"><td className="p-2">{f.fine_date}</td><td className="p-2">{v?.registration_number ?? "-"}</td><td className="p-2">{f.fine_type}</td><td className="p-2">₦{Number(f.fine_amount).toLocaleString()}</td><td className="p-2"><Badge variant="outline">{f.payment_status}</Badge></td></tr>; })}
          {fines.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No fines logged.</td></tr>}
        </tbody></table></CardContent></Card>
      </TabsContent>
      <TabsContent value="incidents" className="space-y-3">
        <div className="flex justify-end">
          <Dialog open={incOpen} onOpenChange={setIncOpen}>
            <DialogTrigger asChild><Button><AlertTriangle className="w-4 h-4 mr-2" />Log Incident</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Incident</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Select value={inc.vehicle_id} onValueChange={v => setInc({ ...inc, vehicle_id: v })}><SelectTrigger><SelectValue placeholder="Vehicle" /></SelectTrigger><SelectContent>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={inc.incident_date} onChange={e => setInc({ ...inc, incident_date: e.target.value })} />
                <Select value={inc.incident_type} onValueChange={v => setInc({ ...inc, incident_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["collision_at_fault","collision_no_fault","parking_damage","load_damage","theft","vandalism","flood","fire","other"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Select value={inc.severity} onValueChange={v => setInc({ ...inc, severity: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["minor","moderate","major","total_loss"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                <Textarea placeholder="Description *" value={inc.description} onChange={e => setInc({ ...inc, description: e.target.value })} />
                <Input placeholder="Location" value={inc.location} onChange={e => setInc({ ...inc, location: e.target.value })} />
                <Input placeholder="Repair cost estimate ₦" type="number" value={inc.repair_cost_estimate} onChange={e => setInc({ ...inc, repair_cost_estimate: e.target.value })} />
                <Button className="w-full" onClick={submitInc}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <Card><CardContent className="p-0 overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">Date</th><th className="p-2 text-left">Vehicle</th><th className="p-2 text-left">Type</th><th className="p-2 text-left">Severity</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Cost</th></tr></thead><tbody>
          {(incidents as any[]).map(i => { const v = (vehicles as any[]).find(x => x.id === i.vehicle_id); return <tr key={i.id} className="border-t"><td className="p-2">{i.incident_date}</td><td className="p-2">{v?.registration_number ?? "-"}</td><td className="p-2">{i.incident_type}</td><td className="p-2">{i.severity}</td><td className="p-2"><Badge variant="outline">{i.status}</Badge></td><td className="p-2">₦{Number(i.repair_cost_estimate ?? 0).toLocaleString()}</td></tr>; })}
          {incidents.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No incidents logged.</td></tr>}
        </tbody></table></CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}

/* ---------- Tab 6 Documents ---------- */
function Documents({ orgId }: { orgId: string }) {
  const { data: vehicles = [] } = useVehicles(orgId);
  const ids = vehicles.map((v: any) => v.id);
  const { data: docs = [] } = useQuery({
    queryKey: ["docs", orgId, ids.length],
    enabled: ids.length > 0,
    queryFn: async () => (await supabase.from("vehicle_documents").select("*").in("vehicle_id", ids).order("expiry_date", { ascending: true })).data ?? [],
  });

  const status = (d: any) => {
    if (!d.expiry_date) return { label: "No expiry", color: "bg-muted text-foreground" };
    const days = differenceInDays(new Date(d.expiry_date), new Date());
    if (days < 0) return { label: `Expired ${-days}d`, color: "bg-red-500/20 text-red-700" };
    if (days <= 7) return { label: `URGENT ${days}d`, color: "bg-red-500/20 text-red-700" };
    if (days <= 30) return { label: `Soon ${days}d`, color: "bg-amber-500/20 text-amber-700" };
    return { label: `Valid ${days}d`, color: "bg-green-500/20 text-green-700" };
  };

  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40"><tr><th className="p-2 text-left">Vehicle</th><th className="p-2 text-left">Document</th><th className="p-2 text-left">Expiry</th><th className="p-2 text-left">Status</th></tr></thead>
        <tbody>
          {(docs as any[]).map(d => { const v = (vehicles as any[]).find(x => x.id === d.vehicle_id); const s = status(d); return <tr key={d.id} className="border-t"><td className="p-2">{v?.registration_number ?? "-"}</td><td className="p-2">{(d as any).document_type ?? (d as any).document_name ?? "-"}</td><td className="p-2">{d.expiry_date ?? "-"}</td><td className="p-2"><span className={`text-xs px-2 py-0.5 rounded ${s.color}`}>{s.label}</span></td></tr>; })}
          {docs.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No vehicle documents.</td></tr>}
        </tbody>
      </table>
    </CardContent></Card>
  );
}
