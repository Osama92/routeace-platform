import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, ShieldAlert, ShieldCheck, ShieldX, Truck, AlertTriangle,
  CheckCircle, XCircle, Clock, Wrench, Activity, TrendingDown,
  ArrowLeft, RefreshCw, ClipboardCheck, Ban, Gauge,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─── Types ─────────────────────────────────────────
interface Vehicle { id: string; plate_number: string | null; registration_number?: string | null; status: string; current_mileage: number; truck_type: string; }
interface Inspection { id: string; vehicle_id: string; inspection_type: string; status: string; overall_score: number | null; inspector_notes: string | null; blocked_dispatch: boolean; completed_at: string | null; created_at: string; vehicle_inspection_items?: InspectionItem[]; }
interface InspectionItem { id: string; category: string; item_name: string; condition: string; is_safety_critical: boolean; notes: string | null; }
interface Prediction { id: string; vehicle_id: string; component: string; failure_probability: number; confidence_score: number; predicted_failure_date: string; urgency: string; risk_factors: any[]; recommended_action: string; auto_blocked: boolean; resolved_at: string | null; }
interface SafetyGate { id: string; vehicle_id: string; gate_type: string; decision: string; reason: string; created_at: string; }

// ─── Helpers ─────────────────────────────────────────
const urgencyColor = (u: string) => u === "critical" ? "text-destructive" : u === "high" ? "text-amber-500" : u === "medium" ? "text-yellow-500" : "text-emerald-500";
const urgencyBg = (u: string) => u === "critical" ? "bg-destructive/10" : u === "high" ? "bg-amber-500/10" : u === "medium" ? "bg-yellow-500/10" : "bg-emerald-500/10";
const decisionIcon = (d: string) => d === "approved" ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : d === "conditional" ? <ShieldAlert className="w-5 h-5 text-amber-500" /> : <ShieldX className="w-5 h-5 text-destructive" />;
const conditionColor = (c: string) => c === "good" ? "text-emerald-500" : c === "fair" ? "text-yellow-500" : c === "poor" ? "text-amber-500" : c === "critical" ? "text-destructive" : "text-muted-foreground";

const CHECKLIST_TEMPLATE = [
  { category: "Engine", items: ["Oil Level", "Coolant Level", "Belt Condition", "Engine Noise"], critical: [false, false, true, true] },
  { category: "Brakes", items: ["Brake Pads", "Brake Fluid", "Handbrake", "ABS Warning"], critical: [true, true, true, true] },
  { category: "Tires", items: ["Front Left Tread", "Front Right Tread", "Rear Left Tread", "Rear Right Tread", "Tire Pressure"], critical: [true, true, true, true, true] },
  { category: "Lights", items: ["Headlights", "Tail Lights", "Indicators", "Brake Lights"], critical: [true, true, true, true] },
  { category: "Safety", items: ["Fire Extinguisher", "First Aid Kit", "Reflective Triangle", "Seat Belts"], critical: [true, true, true, true] },
  { category: "Body", items: ["Windshield", "Mirrors", "Doors/Locks", "Load Securing"], critical: [false, true, false, true] },
  { category: "Fuel", items: ["Fuel Level", "Fuel Cap", "No Leaks"], critical: [false, false, true] },
  { category: "Documentation", items: ["Vehicle License", "Insurance", "Road Worthiness"], critical: [true, true, true] },
];

export default function FleetInspectionEngine() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [safetyGates, setSafetyGates] = useState<SafetyGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [inspectionDialog, setInspectionDialog] = useState(false);
  const [inspType, setInspType] = useState<"pre_trip" | "post_trip">("pre_trip");
  const [inspVehicle, setInspVehicle] = useState("");
  const [checklistState, setChecklistState] = useState<Record<string, string>>({});
  const [inspNotes, setInspNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [vRes, iRes, pRes, gRes] = await Promise.all([
      supabase.from("vehicles").select("id, plate_number, registration_number, status, current_mileage, truck_type").order("plate_number"),
      supabase.from("vehicle_inspections").select("*, vehicle_inspection_items(*)").order("created_at", { ascending: false }).limit(100),
      supabase.from("maintenance_predictions").select("*").is("resolved_at", null).order("failure_probability", { ascending: false }),
      supabase.from("dispatch_safety_gates").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (vRes.data) setVehicles(vRes.data as any);
    if (iRes.data) setInspections(iRes.data as any);
    if (pRes.data) setPredictions(pRes.data as any);
    if (gRes.data) setSafetyGates(gRes.data as any);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runFleetScan = async () => {
    setScanning(true);
    try {
      for (const v of vehicles.slice(0, 20)) {
        await supabase.functions.invoke("fleet-inspection-engine", { body: { action: "predict_maintenance", vehicle_id: v.id } });
      }
      toast.success("Fleet scan complete - predictions updated");
      await fetchData();
    } catch { toast.error("Fleet scan failed"); }
    setScanning(false);
  };

  const evaluateGate = async (vehicleId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("fleet-inspection-engine", { body: { action: "evaluate_dispatch_gate", vehicle_id: vehicleId } });
      if (error) throw error;
      toast[data.decision === "blocked" ? "error" : data.decision === "conditional" ? "warning" : "success"](data.reason);
      await fetchData();
    } catch { toast.error("Gate evaluation failed"); }
  };

  const submitInspection = async () => {
    if (!inspVehicle) { toast.error("Select a vehicle"); return; }
    setSubmitting(true);
    try {
      const items = CHECKLIST_TEMPLATE.flatMap((cat) =>
        cat.items.map((item, i) => ({
          category: cat.category,
          item_name: item,
          condition: checklistState[`${cat.category}-${item}`] || "not_checked",
          is_safety_critical: cat.critical[i],
        }))
      );

      const hasCriticalFail = items.some(i => i.is_safety_critical && (i.condition === "critical" || i.condition === "poor"));
      const hasAttention = items.some(i => i.condition === "poor" || i.condition === "critical");
      const allChecked = items.every(i => i.condition !== "not_checked");
      const goodCount = items.filter(i => i.condition === "good" || i.condition === "fair").length;
      const score = Math.round((goodCount / items.length) * 100);

      let status = "passed";
      if (hasCriticalFail) status = "failed";
      else if (hasAttention) status = "attention_needed";
      if (!allChecked) status = "in_progress";

      const { data: insp, error } = await supabase.from("vehicle_inspections").insert({
        vehicle_id: inspVehicle,
        inspection_type: inspType,
        status,
        overall_score: score,
        inspector_notes: inspNotes || null,
        blocked_dispatch: hasCriticalFail,
        completed_at: allChecked ? new Date().toISOString() : null,
        inspector_id: (await supabase.auth.getUser()).data.user?.id,
      }).select("id").single();

      if (error) throw error;

      // Insert items
      await supabase.from("vehicle_inspection_items").insert(items.map(i => ({ ...i, inspection_id: insp.id })));

      toast[status === "failed" ? "error" : status === "attention_needed" ? "warning" : "success"](
        status === "failed" ? "INSPECTION FAILED - Vehicle blocked from dispatch" :
        status === "attention_needed" ? "Inspection passed with concerns" : "Inspection passed"
      );

      setInspectionDialog(false);
      setChecklistState({});
      setInspNotes("");
      await fetchData();
    } catch (e: any) { toast.error(e.message || "Failed to submit inspection"); }
    setSubmitting(false);
  };

  // ─── Computed Stats ─────────────────────────────────────────
  const totalInspections = inspections.length;
  const passedCount = inspections.filter(i => i.status === "passed").length;
  const failedCount = inspections.filter(i => i.status === "failed").length;
  const passRate = totalInspections > 0 ? Math.round((passedCount / totalInspections) * 100) : 0;
  const criticalPredictions = predictions.filter(p => p.urgency === "critical");
  const highPredictions = predictions.filter(p => p.urgency === "high");
  const blockedVehicles = predictions.filter(p => p.auto_blocked);
  const fleetHealth = predictions.length > 0 ? Math.max(0, 100 - Math.round(predictions.reduce((s, p) => s + p.failure_probability, 0) / predictions.length)) : 100;

  if (loading) return (
    <DashboardLayout title="Fleet Inspection & Predictive Maintenance" subtitle="Autonomous safety enforcement + failure prevention engine">
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title="Fleet Inspection & Predictive Maintenance" subtitle="Autonomous safety enforcement + failure prevention engine">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="w-6 h-6 text-primary" /> Fleet Inspection & Predictive Maintenance</h1>
            <p className="text-sm text-muted-foreground">Autonomous safety enforcement + failure prevention engine</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={inspectionDialog} onOpenChange={setInspectionDialog}>
            <DialogTrigger asChild>
              <Button><ClipboardCheck className="w-4 h-4 mr-2" /> New Inspection</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Vehicle Inspection</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Select value={inspVehicle} onValueChange={setInspVehicle}>
                    <SelectTrigger><SelectValue placeholder="Select Vehicle" /></SelectTrigger>
                    <SelectContent>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.registration_number || v.plate_number || v.id}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={inspType} onValueChange={(v: any) => setInspType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pre_trip">Pre-Trip Inspection</SelectItem>
                      <SelectItem value="post_trip">Post-Trip Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {CHECKLIST_TEMPLATE.map(cat => (
                  <div key={cat.category}>
                    <h4 className="font-semibold text-sm mb-2">{cat.category}</h4>
                    <div className="space-y-1.5">
                      {cat.items.map((item, i) => (
                        <div key={item} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/30">
                          <span className="text-sm flex items-center gap-1.5">
                            {item} {cat.critical[i] && <Badge variant="outline" className="text-[9px] text-destructive">SAFETY</Badge>}
                          </span>
                          <Select value={checklistState[`${cat.category}-${item}`] || "not_checked"} onValueChange={v => setChecklistState(prev => ({ ...prev, [`${cat.category}-${item}`]: v }))}>
                            <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_checked">Not Checked</SelectItem>
                              <SelectItem value="good">Good</SelectItem>
                              <SelectItem value="fair">Fair</SelectItem>
                              <SelectItem value="poor">Poor</SelectItem>
                              <SelectItem value="critical">Critical</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Textarea placeholder="Inspector notes..." value={inspNotes} onChange={e => setInspNotes(e.target.value)} />
                <Button onClick={submitInspection} disabled={submitting} className="w-full">{submitting ? "Submitting..." : "Submit Inspection"}</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={runFleetScan} disabled={scanning}>
            <RefreshCw className={`w-4 h-4 mr-2 ${scanning ? "animate-spin" : ""}`} /> {scanning ? "Scanning..." : "Run Fleet Scan"}
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Fleet Health", value: `${fleetHealth}%`, icon: Gauge, color: fleetHealth >= 80 ? "text-emerald-500" : fleetHealth >= 60 ? "text-amber-500" : "text-destructive" },
          { label: "Inspection Pass Rate", value: `${passRate}%`, icon: CheckCircle, color: passRate >= 90 ? "text-emerald-500" : "text-amber-500" },
          { label: "Critical Alerts", value: criticalPredictions.length, icon: XCircle, color: "text-destructive" },
          { label: "High Risk", value: highPredictions.length, icon: AlertTriangle, color: "text-amber-500" },
          { label: "Vehicles Blocked", value: blockedVehicles.length, icon: Ban, color: "text-destructive" },
        ].map((kpi, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                </div>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="predictions">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="inspections">Inspections</TabsTrigger>
          <TabsTrigger value="gates">Safety Gates</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicle Health</TabsTrigger>
        </TabsList>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-3 mt-4">
          {predictions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No active predictions. Run a fleet scan to generate predictions.</CardContent></Card>
          ) : predictions.map(p => (
            <Card key={p.id} className={`border-l-4 ${p.urgency === "critical" ? "border-l-destructive" : p.urgency === "high" ? "border-l-amber-500" : "border-l-emerald-500"}`}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${urgencyBg(p.urgency)}`}>
                      <Activity className={`w-5 h-5 ${urgencyColor(p.urgency)}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm capitalize">{p.component} - {vehicles.find(v => v.id === p.vehicle_id)?.registration_number || vehicles.find(v => v.id === p.vehicle_id)?.plate_number || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{p.recommended_action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge className={urgencyBg(p.urgency) + " " + urgencyColor(p.urgency)}>{p.urgency.toUpperCase()}</Badge>
                      {p.auto_blocked && <Badge variant="destructive">BLOCKED</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Failure risk: {p.failure_probability}% • Confidence: {p.confidence_score}%</p>
                    <p className="text-xs text-muted-foreground">Predicted by: {p.predicted_failure_date}</p>
                  </div>
                </div>
                {p.risk_factors && (p.risk_factors as any[]).length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {(p.risk_factors as any[]).map((f: any, i: number) => (
                      <Badge key={i} variant="outline" className="text-[10px]">{f.factor}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-3 mt-4">
          {inspections.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No inspections recorded yet. Create a new inspection to get started.</CardContent></Card>
          ) : inspections.slice(0, 20).map(insp => (
            <Card key={insp.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {insp.status === "passed" ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> :
                     insp.status === "failed" ? <ShieldX className="w-5 h-5 text-destructive" /> :
                     insp.status === "attention_needed" ? <ShieldAlert className="w-5 h-5 text-amber-500" /> :
                     <Clock className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <p className="font-semibold text-sm">
                        {vehicles.find(v => v.id === insp.vehicle_id)?.registration_number || vehicles.find(v => v.id === insp.vehicle_id)?.plate_number || "Unknown"} - {insp.inspection_type === "pre_trip" ? "Pre-Trip" : "Post-Trip"}
                      </p>
                      <p className="text-xs text-muted-foreground">{new Date(insp.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={insp.status === "passed" ? "default" : insp.status === "failed" ? "destructive" : "secondary"}>
                      {insp.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    {insp.overall_score !== null && <p className="text-xs mt-1">Score: {insp.overall_score}%</p>}
                    {insp.blocked_dispatch && <Badge variant="destructive" className="text-[10px] mt-1">DISPATCH BLOCKED</Badge>}
                  </div>
                </div>
                {insp.inspector_notes && <p className="text-xs text-muted-foreground mt-2 italic">"{insp.inspector_notes}"</p>}
                {insp.vehicle_inspection_items && insp.vehicle_inspection_items.length > 0 && (
                  <div className="mt-2 flex gap-1.5 flex-wrap">
                    {insp.vehicle_inspection_items.filter((it: any) => it.condition === "critical" || it.condition === "poor").map((it: any) => (
                      <Badge key={it.id} variant="outline" className={`text-[10px] ${conditionColor(it.condition)}`}>
                        {it.category}: {it.item_name} ({it.condition})
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Safety Gates Tab */}
        <TabsContent value="gates" className="space-y-3 mt-4">
          {safetyGates.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No safety gate decisions recorded.</CardContent></Card>
          ) : safetyGates.map(g => (
            <Card key={g.id}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {decisionIcon(g.decision)}
                  <div>
                    <p className="font-semibold text-sm">{vehicles.find(v => v.id === g.vehicle_id)?.registration_number || vehicles.find(v => v.id === g.vehicle_id)?.plate_number || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{g.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={g.decision === "approved" ? "default" : g.decision === "blocked" ? "destructive" : "secondary"}>
                    {g.decision.toUpperCase()}
                  </Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(g.created_at).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Vehicle Health Tab */}
        <TabsContent value="vehicles" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {vehicles.slice(0, 20).map(v => {
              const vPreds = predictions.filter(p => p.vehicle_id === v.id);
              const vHealth = vPreds.length > 0 ? Math.max(0, 100 - Math.round(vPreds.reduce((s, p) => s + p.failure_probability, 0) / vPreds.length)) : 100;
              const hasCritical = vPreds.some(p => p.urgency === "critical");
              const latestInsp = inspections.find(i => i.vehicle_id === v.id);
              return (
                <Card key={v.id} className={hasCritical ? "border-destructive/50" : ""}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="font-mono font-semibold text-sm">{v.registration_number || v.plate_number}</span>
                        <Badge variant="outline" className="text-[10px]">{v.truck_type || v.status}</Badge>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => evaluateGate(v.id)}>
                          <Shield className="w-3 h-3 mr-1" /> Gate Check
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground w-16">Health</span>
                      <Progress value={vHealth} className="h-2 flex-1" />
                      <span className={`text-xs font-semibold ${vHealth >= 80 ? "text-emerald-500" : vHealth >= 60 ? "text-amber-500" : "text-destructive"}`}>{vHealth}%</span>
                    </div>
                    <div className="flex gap-3 text-[10px] text-muted-foreground">
                      <span>Mileage: {(v.current_mileage || 0).toLocaleString()} km</span>
                      <span>Alerts: {vPreds.filter(p => p.urgency === "critical" || p.urgency === "high").length}</span>
                      <span>Last Inspection: {latestInsp ? latestInsp.status : "None"}</span>
                    </div>
                    {vPreds.filter(p => p.urgency === "critical" || p.urgency === "high").length > 0 && (
                      <div className="mt-1.5 flex gap-1 flex-wrap">
                        {vPreds.filter(p => p.urgency === "critical" || p.urgency === "high").map(p => (
                          <Badge key={p.id} className={`text-[9px] ${urgencyBg(p.urgency)} ${urgencyColor(p.urgency)}`}>
                            {p.component}: {p.failure_probability}%
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}
