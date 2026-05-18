import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Clock } from "lucide-react";

const DAILY_CHECKLIST = [
  { category: "Engine & Fluids", safety_critical: false, items: ["Oil Level","Coolant Level","Brake Fluid Level","No Engine Leaks"], critical_items: [false,false,true,true] },
  { category: "Brakes", safety_critical: true, items: ["Brake Response (Test)","Handbrake Works","No Grinding Noise"], critical_items: [true,true,true] },
  { category: "Tyres", safety_critical: true, items: ["Front Left Tread & Pressure","Front Right Tread & Pressure","Rear Left Tread & Pressure","Rear Right Tread & Pressure","Spare Tyre Present"], critical_items: [true,true,true,true,false] },
  { category: "Lights & Signals", safety_critical: true, items: ["Headlights (Low & High)","Tail Lights","Indicators (Left & Right)","Brake Lights","Reverse Light & Siren"], critical_items: [true,true,true,true,true] },
  { category: "Safety Equipment", safety_critical: true, items: ["Fire Extinguisher (in date)","Reflective Triangle","Seat Belt (Driver)","First Aid Kit"], critical_items: [true,true,true,false] },
  { category: "Body & Mirrors", safety_critical: false, items: ["Windscreen (No Cracks)","Driver Mirror","Passenger Mirror","All Doors Close Properly"], critical_items: [false,true,true,false] },
  { category: "Fuel & Gauges", safety_critical: false, items: ["Fuel Level (Record Below)","No Fuel Leaks","All Dashboard Gauges Normal"], critical_items: [false,true,false] },
  { category: "Documents", safety_critical: true, items: ["Vehicle Licence (In Cab)","Insurance Certificate (In Cab)","Road Worthiness (In Cab)"], critical_items: [true,true,true] },
];

const CONDITION_OPTIONS = [
  { value: "good", label: "✅ Good" },
  { value: "fair", label: "⚠️ Fair" },
  { value: "poor", label: "🔶 Poor" },
  { value: "critical", label: "🔴 Critical/Failed" },
];

interface Props {
  driverId: string | null;
  vehicleId: string | null;
  organizationId: string | null;
}

const DriverDailyChecks = ({ driverId, vehicleId, organizationId }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCheckType, setActiveCheckType] = useState<"pre_trip" | "post_trip" | null>(null);
  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: todayChecks = [] } = useQuery({
    queryKey: ["my-today-checks", driverId, organizationId],
    enabled: !!driverId && !!organizationId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await (supabase.from("vehicle_checklists" as any) as any)
        .select("id, checklist_type, overall_result, completed_at, safety_critical_fail")
        .eq("driver_id", driverId)
        .eq("organization_id", organizationId)
        .eq("checklist_date", today)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recentChecks = [] } = useQuery({
    queryKey: ["my-recent-checks", driverId, organizationId],
    enabled: !!driverId && !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicle_checklists" as any) as any)
        .select("id, checklist_type, overall_result, checklist_date, safety_critical_fail")
        .eq("driver_id", driverId)
        .eq("organization_id", organizationId)
        .order("checklist_date", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  const todayPre  = todayChecks.find((c: any) => c.checklist_type === "pre_trip");
  const todayPost = todayChecks.find((c: any) => c.checklist_type === "post_trip");

  const initChecklist = (type: "pre_trip" | "post_trip") => {
    if (!vehicleId) {
      toast({ title: "No vehicle assigned", description: "Contact your Ops Manager to assign your vehicle.", variant: "destructive" });
      return;
    }
    setActiveCheckType(type);
    const initial: Record<string, string> = {};
    DAILY_CHECKLIST.forEach((cat) => cat.items.forEach((item) => { initial[`${cat.category}::${item}`] = "good"; }));
    setConditions(initial);
    setNotes(""); setOdometer(""); setFuelLevel("");
  };

  const submitChecklist = async () => {
    if (!activeCheckType || !organizationId || !user || !vehicleId) return;
    if (!odometer) { toast({ title: "Odometer reading required", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      let hasCritical = false, hasPoor = false;
      const items: { category: string; item_name: string; condition: string; is_safety_critical: boolean }[] = [];
      DAILY_CHECKLIST.forEach((cat) => {
        cat.items.forEach((item, ii) => {
          const key = `${cat.category}::${item}`;
          const cond = conditions[key] ?? "good";
          const isCritical = cat.critical_items[ii] ?? false;
          if (cond === "critical") hasCritical = true;
          if (cond === "poor") hasPoor = true;
          items.push({ category: cat.category, item_name: item, condition: cond, is_safety_critical: isCritical });
        });
      });
      const overallResult = hasCritical ? "fail" : hasPoor ? "pass_with_issues" : "pass";
      const safetyFail = hasCritical;
      const blocked = hasCritical && activeCheckType === "pre_trip";

      const { data: checklist, error: clErr } = await (supabase.from("vehicle_checklists" as any) as any).insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        submitted_by: user.id,
        checklist_type: activeCheckType,
        checklist_date: new Date().toISOString().split("T")[0],
        odometer_reading: parseFloat(odometer) || null,
        fuel_level_pct: fuelLevel ? parseInt(fuelLevel) : null,
        overall_result: overallResult,
        safety_critical_fail: safetyFail,
        dispatch_blocked: blocked,
        notes: notes || null,
        completed_at: new Date().toISOString(),
      }).select("id").single();
      if (clErr || !checklist) throw clErr ?? new Error("Failed to create checklist");

      const { error: itemErr } = await (supabase.from("vehicle_checklist_items" as any) as any).insert(
        items.map((item) => ({ checklist_id: checklist.id, ...item }))
      );
      if (itemErr) throw itemErr;

      if (blocked && vehicleId) {
        await (supabase.from("vehicles") as any).update({ status: "maintenance" }).eq("id", vehicleId);
      }

      toast({
        title: safetyFail ? "⚠️ SAFETY ISSUE - Vehicle blocked from dispatch"
              : overallResult === "pass_with_issues" ? "Checklist submitted - issues flagged to Ops Manager"
              : "✅ Checklist submitted - vehicle cleared",
        variant: safetyFail ? "destructive" : "default",
      });
      setActiveCheckType(null);
      queryClient.invalidateQueries({ queryKey: ["my-today-checks"] });
      queryClient.invalidateQueries({ queryKey: ["my-recent-checks"] });
    } catch (e: any) {
      toast({ title: e.message ?? "Submission failed", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (activeCheckType) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{activeCheckType === "pre_trip" ? "🚛 Pre-Trip Check" : "🏁 Post-Trip Check"}</h3>
            <p className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setActiveCheckType(null)}>Cancel</Button>
        </div>

        <Card><CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Odometer Reading (km) *</Label>
              <Input type="number" placeholder="e.g. 142500" value={odometer} onChange={(e) => setOdometer(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fuel Level (%)</Label>
              <Input type="number" min="0" max="100" placeholder="e.g. 75" value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)} />
            </div>
          </div>
        </CardContent></Card>

        {DAILY_CHECKLIST.map((cat) => (
          <Card key={cat.category} className={cat.safety_critical ? "border-amber-500/30" : ""}>
            <CardContent className="pt-3 pb-3">
              <p className="font-semibold text-sm mb-3 flex items-center gap-1">
                {cat.safety_critical && <span className="text-amber-500 text-xs font-bold">SAFETY</span>}
                {cat.category}
              </p>
              <div className="space-y-2">
                {cat.items.map((item, idx) => {
                  const key = `${cat.category}::${item}`;
                  const cond = conditions[key] ?? "good";
                  return (
                    <div key={item} className="flex items-center justify-between gap-2">
                      <span className="text-sm flex-1">
                        {cat.critical_items[idx] && <span className="text-red-500 mr-1">*</span>}{item}
                      </span>
                      <Select value={cond} onValueChange={(v) => setConditions((prev) => ({ ...prev, [key]: v }))}>
                        <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        <div className="space-y-1.5">
          <Label>Additional Notes (optional)</Label>
          <Textarea placeholder="Any additional issues or observations..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        <Button className="w-full" onClick={submitChecklist} disabled={submitting || !odometer}>
          {submitting ? "Submitting…" : `Submit ${activeCheckType === "pre_trip" ? "Pre-Trip" : "Post-Trip"} Check`}
        </Button>
        <p className="text-xs text-muted-foreground text-center">* Red star items are safety-critical. Poor or critical condition will flag your vehicle.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-bold">Daily Vehicle Checks</h3>
        <p className="text-xs text-muted-foreground">Required every day - pre-trip before departure, post-trip on return</p>
      </div>
      {!vehicleId && (
        <Card className="border-amber-500/40"><CardContent className="pt-3 pb-3 text-sm text-amber-700">
          No vehicle is currently assigned to your driver profile. Daily checks will be enabled once an Ops Manager assigns you a vehicle.
        </CardContent></Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className={`border-2 ${todayPre ? "border-green-500/50" : "border-amber-500/50"}`}>
          <CardContent className="pt-4 pb-4 text-center">
            {todayPre ? (<>
              <CheckCircle className="w-7 h-7 text-green-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-green-600">Pre-Trip Done</p>
              <p className="text-xs text-muted-foreground capitalize">{todayPre.overall_result?.replace(/_/g," ")}</p>
            </>) : (<>
              <AlertTriangle className="w-7 h-7 text-amber-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-amber-600">Pre-Trip Pending</p>
              <Button size="sm" className="mt-2 h-7 text-xs w-full" onClick={() => initChecklist("pre_trip")}>Start Check</Button>
            </>)}
          </CardContent>
        </Card>
        <Card className={`border-2 ${todayPost ? "border-green-500/50" : "border-muted"}`}>
          <CardContent className="pt-4 pb-4 text-center">
            {todayPost ? (<>
              <CheckCircle className="w-7 h-7 text-green-500 mx-auto mb-1" />
              <p className="text-xs font-bold text-green-600">Post-Trip Done</p>
              <p className="text-xs text-muted-foreground capitalize">{todayPost.overall_result?.replace(/_/g," ")}</p>
            </>) : (<>
              <Clock className="w-7 h-7 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Post-Trip</p>
              <Button size="sm" variant="outline" className="mt-2 h-7 text-xs w-full" onClick={() => initChecklist("post_trip")}>Start Check</Button>
            </>)}
          </CardContent>
        </Card>
      </div>

      {recentChecks.length > 0 && (
        <Card><CardContent className="pt-3 pb-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Recent Checks</p>
          <div className="space-y-2">
            {recentChecks.slice(0,6).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{c.checklist_type === "pre_trip" ? "Pre-Trip" : c.checklist_type === "post_trip" ? "Post-Trip" : "Supervisory"}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{c.checklist_date}</span>
                </div>
                <Badge variant="outline" className={
                  c.overall_result === "pass" ? "bg-green-500/20 text-green-700 border-green-500/30" :
                  c.overall_result === "pass_with_issues" ? "bg-amber-500/20 text-amber-700 border-amber-500/30" :
                  "bg-red-500/20 text-red-700 border-red-500/30"
                }>
                  {c.overall_result === "pass" ? "Pass" : c.overall_result === "pass_with_issues" ? "Issues" : "Fail"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}
    </div>
  );
};

export default DriverDailyChecks;
