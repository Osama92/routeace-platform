import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, AlertTriangle, CheckCircle2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const TYPES = ["vehicle_breakdown","road_closure","accident","theft_or_loss","recipient_absent","incorrect_address","weather","customs_hold","driver_unavailable","overloading","other"];
const SEVERITIES = ["low","medium","high","critical"];

const SEV_COLOR: Record<string, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-amber-500 text-white",
  medium: "bg-blue-500 text-white",
  low: "bg-muted text-muted-foreground",
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
}

export default function DeptExceptionManagement() {
  const { organizationId, user, userRole } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSev, setFilterSev] = useState<string>("all");
  const [form, setForm] = useState({ dispatch_id: "", exception_type: "vehicle_breakdown", severity: "medium", description: "", sla_impact_hours: 0, cost_impact: 0 });

  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateTarget, setUpdateTarget] = useState<any | null>(null);
  const [statusVal, setStatusVal] = useState("");
  const [locationVal, setLocationVal] = useState("");
  const [notesVal, setNotesVal] = useState("");
  const [sendingUpdate, setSendingUpdate] = useState(false);

  const canNotify = ["ops_manager", "support", "org_admin", "super_admin", "admin"].includes(userRole as string);

  const handleSendClientUpdate = async () => {
    if (!updateTarget?.dispatch_id && !updateTarget?.id) return;
    if (!statusVal) return;
    setSendingUpdate(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-delivery-status", {
        body: {
          dispatch_id: updateTarget.dispatch_id ?? updateTarget.id,
          status: statusVal,
          location: locationVal.trim() || null,
          notes: notesVal.trim() || null,
        },
      });
      if (error) throw error;
      toast.success("Client notified", {
        description: (data as any)?.email_sent
          ? "Status updated and client emailed from routeaceglyde.app."
          : "Status updated. No client email on file.",
      });
      setUpdateOpen(false);
      setStatusVal("");
      setLocationVal("");
      setNotesVal("");
      setUpdateTarget(null);
    } catch (e: any) {
      toast.error("Failed to send update", { description: e.message });
    } finally {
      setSendingUpdate(false);
    }
  };


  useEffect(() => { if (organizationId) void load(); /* eslint-disable-next-line */ }, [organizationId]);

  async function load() {
    setLoading(true);
    if (!organizationId) { setLoading(false); return; }
    const [exRes, dRes] = await Promise.all([
      supabase.from("delivery_exceptions" as any).select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
      supabase.from("dispatches").select("id,dispatch_number").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200),
    ]);
    setItems((exRes.data as any) || []);
    setDispatches(dRes.data || []);
    setLoading(false);
  }

  async function submitException() {
    if (!organizationId || !form.description) { toast.error("Description required"); return; }
    const dispatch = dispatches.find((d: any) => d.id === form.dispatch_id);
    const { error } = await (supabase.from("delivery_exceptions" as any) as any).insert({
      organization_id: organizationId,
      dispatch_id: form.dispatch_id || null,
      dispatch_number: dispatch?.dispatch_number || null,
      exception_type: form.exception_type,
      severity: form.severity,
      description: form.description,
      sla_impact_hours: form.sla_impact_hours,
      cost_impact: form.cost_impact,
      reported_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Exception logged");
    setForm({ dispatch_id: "", exception_type: "vehicle_breakdown", severity: "medium", description: "", sla_impact_hours: 0, cost_impact: 0 });
    void load();
  }

  async function resolve(id: string, notes: string) {
    const { error } = await (supabase.from("delivery_exceptions" as any) as any).update({
      status: "resolved", resolution_notes: notes, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Resolved");
    void load();
  }

  const active = items.filter((i: any) => i.status !== "resolved" && i.status !== "closed");
  const filtered = active.filter((i: any) => (filterType === "all" || i.exception_type === filterType) && (filterSev === "all" || i.severity === filterSev));

  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      open: active.length,
      resolvedToday: items.filter((i: any) => i.status === "resolved" && (i.resolved_at || "").slice(0, 10) === today).length,
      criticalUnresolved: active.filter((i: any) => i.severity === "critical").length,
      slaHoursLost: items.reduce((s: number, i: any) => s + Number(i.sla_impact_hours || 0), 0),
    };
  }, [items, active]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i: any) => m.set(i.exception_type, (m.get(i.exception_type) || 0) + 1));
    return Array.from(m.entries()).map(([type, count]) => ({ type, count }));
  }, [items]);

  return (
    <DashboardLayout title="Exception Management" subtitle="Track and resolve delivery exceptions - scoped to your organization.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Open Exceptions" value={kpis.open.toString()} />
          <Kpi label="Resolved Today" value={kpis.resolvedToday.toString()} />
          <Kpi label="Critical Unresolved" value={kpis.criticalUnresolved.toString()} tone="destructive" />
          <Kpi label="Total SLA Hours Lost" value={kpis.slaHoursLost.toFixed(1)} />
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active Exceptions</TabsTrigger>
            <TabsTrigger value="log">Log Exception</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base mr-auto">Active Exceptions ({filtered.length})</CardTitle>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All Types</SelectItem>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={filterSev} onValueChange={setFilterSev}>
                    <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">No active exceptions.</div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((i: any) => (
                      <ExceptionRow
                        key={i.id}
                        item={i}
                        onResolve={resolve}
                        canNotify={canNotify}
                        onNotify={(row) => { setUpdateTarget(row); setUpdateOpen(true); }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="log">
            <Card>
              <CardHeader><CardTitle className="text-base">Log a New Exception</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-w-2xl">
                <div>
                  <label className="text-xs text-muted-foreground">Dispatch (optional)</label>
                  <Select value={form.dispatch_id} onValueChange={(v) => setForm({ ...form, dispatch_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select dispatch..." /></SelectTrigger>
                    <SelectContent>{dispatches.slice(0, 50).map((d: any) => <SelectItem key={d.id} value={d.id}>{d.dispatch_number}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Exception Type</label>
                    <Select value={form.exception_type} onValueChange={(v) => setForm({ ...form, exception_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Severity</label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{SEVERITIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">SLA Impact (hours)</label>
                    <Input type="number" value={form.sla_impact_hours} onChange={(e) => setForm({ ...form, sla_impact_hours: Number(e.target.value) })} /></div>
                  <div><label className="text-xs text-muted-foreground">Cost Impact (NGN)</label>
                    <Input type="number" value={form.cost_impact} onChange={(e) => setForm({ ...form, cost_impact: Number(e.target.value) })} /></div>
                </div>
                <Button onClick={submitException}><AlertTriangle className="h-4 w-4 mr-2" />Log Exception</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardHeader><CardTitle className="text-base">Exceptions by Type</CardTitle></CardHeader>
              <CardContent style={{ height: 320 }}>
                <ResponsiveContainer><BarChart data={byType}>
                  <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="type" /><YAxis /><Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart></ResponsiveContainer>
                <div className="mt-4 text-sm">Total cost impact: <span className="font-bold">{fmt(items.reduce((s: number, i: any) => s + Number(i.cost_impact || 0), 0))}</span></div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Client Delivery Update</DialogTitle>
            <DialogDescription>
              Client will receive a branded email from routeaceglyde.app with a tracking link.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Delivery Status</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned to Driver</SelectItem>
                  <SelectItem value="picked_up">Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Current Location <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Input
                value={locationVal}
                onChange={(e) => setLocationVal(e.target.value)}
                placeholder="e.g., Apapa checkpoint"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Note to Client <span className="text-xs text-muted-foreground">(optional)</span></Label>
              <Textarea
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                placeholder="Any additional information..."
                className="bg-secondary/50"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleSendClientUpdate} disabled={sendingUpdate || !statusVal}>
              {sendingUpdate ? "Sending..." : "Send Client Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "destructive" }) {
  return <Card><CardContent className="pt-6">
    <div className="text-xs text-muted-foreground uppercase">{label}</div>
    <div className={`text-2xl font-bold ${tone === "destructive" ? "text-destructive" : ""}`}>{value}</div>
  </CardContent></Card>;
}

function ExceptionRow({ item, onResolve, canNotify, onNotify }: { item: any; onResolve: (id: string, notes: string) => void; canNotify?: boolean; onNotify?: (row: any) => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const hasDispatch = !!(item.dispatch_id || item.id);
  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-center gap-3">
        <Badge className={SEV_COLOR[item.severity]}>{item.severity}</Badge>
        <div className="flex-1">
          <div className="font-medium text-sm">{item.dispatch_number || "-"} · {item.exception_type.replace(/_/g, " ")}</div>
          <div className="text-xs text-muted-foreground">{item.description}</div>
        </div>
        <Badge variant="outline">{item.status}</Badge>
        {canNotify && hasDispatch && onNotify && (
          <Button size="sm" variant="outline" onClick={() => onNotify(item)}>
            <Send className="h-4 w-4 mr-1" />Notify Client
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={() => setOpen(!open)}><CheckCircle2 className="h-4 w-4 mr-1" />Resolve</Button>
      </div>
      {open && (
        <div className="mt-3 space-y-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Resolution notes..." rows={2} />
          <Button size="sm" onClick={() => { onResolve(item.id, notes); setOpen(false); }}>Confirm Resolve</Button>
        </div>
      )}
    </div>
  );
}
