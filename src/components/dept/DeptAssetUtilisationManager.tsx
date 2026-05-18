import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, isWithinInterval } from "date-fns";
import { Truck, AlertTriangle, Clock, TrendingDown, Wrench, Activity, DollarSign, XCircle } from "lucide-react";

const IDLE_REASONS: Record<string, string> = {
  no_load_available: "No load available",
  client_delay: "Client delay",
  dispatch_failure: "Dispatch failure",
  payment_issue: "Payment issue",
  driver_issue: "Driver issue",
  other: "Other",
};

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

interface Props { orgId: string; canLog: boolean; }

const DeptAssetUtilisationManager = ({ orgId, canLog }: Props) => {
  const qc = useQueryClient();
  const [maintOpen, setMaintOpen] = useState(false);
  const [idleOpen, setIdleOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [maintForm, setMaintForm] = useState({ start_date: "", end_date: "", maintenance_type: "preventive", description: "" });
  const [idleForm, setIdleForm] = useState({ idle_date: "", reason_code: "no_load_available", notes: "" });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d, yyyy")}`;

  const { data: vehicles = [] } = useQuery({
    queryKey: ["dept-vehicles-util", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicles") as any)
        .select("id, registration_number, vehicle_type, status, expected_daily_revenue, organization_id")
        .eq("organization_id", orgId)
        .neq("status", "retired");
      return data ?? [];
    },
  });

  const { data: dispatches = [] } = useQuery({
    queryKey: ["dept-dispatches-util", orgId, weekStart.toISOString()],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from("dispatches")
        .select("id, vehicle_id, scheduled_pickup, actual_delivery, actual_pickup, status")
        .eq("organization_id", orgId)
        .gte("scheduled_pickup", format(weekStart, "yyyy-MM-dd"))
        .lte("scheduled_pickup", format(weekEnd, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  const { data: maintenanceEvents = [] } = useQuery({
    queryKey: ["dept-maint-util", orgId, weekStart.toISOString()],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("asset_maintenance_events") as any)
        .select("id, vehicle_id, start_date, end_date, maintenance_type")
        .eq("organization_id", orgId)
        .lte("start_date", format(weekEnd, "yyyy-MM-dd"))
        .gte("end_date", format(weekStart, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  const { data: idleLogs = [] } = useQuery({
    queryKey: ["dept-idle-util", orgId, weekStart.toISOString()],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase.from("asset_idle_logs") as any)
        .select("id, vehicle_id, idle_date, reason_code")
        .eq("organization_id", orgId)
        .gte("idle_date", format(weekStart, "yyyy-MM-dd"))
        .lte("idle_date", format(weekEnd, "yyyy-MM-dd"));
      return data ?? [];
    },
  });

  const stats = (vehicles as any[]).map((v: any) => {
    const vDispatches = (dispatches as any[]).filter((d: any) => d.vehicle_id === v.id && d.status !== "cancelled");
    const transitDates = new Set<string>();
    let trips = 0;
    for (const d of vDispatches) {
      const dStart = d.actual_pickup ? parseISO(d.actual_pickup) : d.scheduled_pickup ? parseISO(d.scheduled_pickup) : null;
      const dEnd = d.actual_delivery ? parseISO(d.actual_delivery) : null;
      if (!dStart) continue;
      const rangeEnd = dEnd ?? new Date(dStart.getTime() + 86400000);
      const days = eachDayOfInterval({
        start: dStart > weekStart ? dStart : weekStart,
        end: rangeEnd < weekEnd ? rangeEnd : weekEnd,
      });
      if (days.length > 0) trips++;
      days.forEach((day) => transitDates.add(format(day, "yyyy-MM-dd")));
    }
    const transitDays = Math.min(7, transitDates.size);

    const maintDates = new Set<string>();
    for (const ev of (maintenanceEvents as any[]).filter((e: any) => e.vehicle_id === v.id)) {
      eachDayOfInterval({ start: parseISO(ev.start_date), end: parseISO(ev.end_date) })
        .filter((d) => isWithinInterval(d, { start: weekStart, end: weekEnd }))
        .forEach((d) => maintDates.add(format(d, "yyyy-MM-dd")));
    }
    const maintenanceDays = Math.min(7, maintDates.size);
    const idleDays = Math.max(0, 7 - transitDays - maintenanceDays);

    const loggedIdleDates = new Set(
      (idleLogs as any[]).filter((l: any) => l.vehicle_id === v.id).map((l: any) => l.idle_date)
    );
    const allWeekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const missingIdleReasons = allWeekDays
      .map((d) => format(d, "yyyy-MM-dd"))
      .filter((d) => !transitDates.has(d) && !maintDates.has(d) && !loggedIdleDates.has(d));

    const dailyCost = v.expected_daily_revenue ?? 0;
    const utilisationPct = Math.round((transitDays / 7) * 100);
    const idleWastedBudget = idleDays * dailyCost;
    const excessMaintWaste = Math.max(0, maintenanceDays - 2) * dailyCost;
    const totalWastedBudget = idleWastedBudget + excessMaintWaste;
    const flag: "green" | "yellow" | "red" =
      utilisationPct >= 75 ? "green" : utilisationPct >= 60 ? "yellow" : "red";

    return { vehicle: v, transitDays, maintenanceDays, idleDays, trips, utilisationPct, idleWastedBudget, excessMaintWaste, totalWastedBudget, missingIdleReasons, flag };
  }).sort((a, b) => b.totalWastedBudget - a.totalWastedBudget);

  const addMaintenance = useMutation({
    mutationFn: async () => {
      if (!selectedVehicleId || !maintForm.start_date || !maintForm.end_date) throw new Error("All fields required");
      const { error } = await (supabase.from("asset_maintenance_events") as any).insert({
        organization_id: orgId,
        vehicle_id: selectedVehicleId,
        start_date: maintForm.start_date,
        end_date: maintForm.end_date,
        maintenance_type: maintForm.maintenance_type,
        description: maintForm.description || null,
        logged_by: (await supabase.auth.getUser()).data.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maintenance event logged");
      setMaintOpen(false);
      setMaintForm({ start_date: "", end_date: "", maintenance_type: "preventive", description: "" });
      qc.invalidateQueries({ queryKey: ["dept-maint-util", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const logIdle = useMutation({
    mutationFn: async () => {
      if (!selectedVehicleId || !idleForm.idle_date) throw new Error("Vehicle and date required");
      const { error } = await (supabase.from("asset_idle_logs") as any).upsert(
        {
          organization_id: orgId,
          vehicle_id: selectedVehicleId,
          idle_date: idleForm.idle_date,
          reason_code: idleForm.reason_code,
          notes: idleForm.notes || null,
          logged_by: (await supabase.auth.getUser()).data.user?.id,
        },
        { onConflict: "vehicle_id,idle_date" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Idle day reason logged");
      setIdleOpen(false);
      setIdleForm({ idle_date: "", reason_code: "no_load_available", notes: "" });
      qc.invalidateQueries({ queryKey: ["dept-idle-util", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalWastedBudget = stats.reduce((s, w) => s + w.totalWastedBudget, 0);
  const avgUtil = stats.length > 0 ? Math.round(stats.reduce((s, w) => s + w.utilisationPct, 0) / stats.length) : 0;
  const criticalCount = stats.filter((w) => w.flag === "red").length;
  const uncodeCount = stats.filter((w) => w.missingIdleReasons.length > 0).length;

  if ((vehicles as any[]).length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Truck className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="font-medium text-sm">No internal fleet configured</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            Asset utilisation tracking applies only to internal vehicles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-2 p-3 rounded-lg border text-sm ${canLog ? "bg-primary/5 border-primary/20 text-primary" : "bg-muted/50 border-border text-muted-foreground"}`}>
        <Activity className="w-4 h-4 shrink-0" />
        {canLog ? (
          <span><strong>Logistics Manager view</strong> - You can log maintenance events and idle reason codes.</span>
        ) : (
          <span><strong>Head of Logistics view</strong> - Strategic read-only.</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {uncodeCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 font-medium">
            <AlertTriangle className="w-3.5 h-3.5" />
            {uncodeCount} asset{uncodeCount > 1 ? "s" : ""} with unlogged idle days
          </div>
        )}
        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-700 font-medium">
            <XCircle className="w-3.5 h-3.5" />
            {criticalCount} Critical asset{criticalCount > 1 ? "s" : ""} - utilisation below 60%
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Assets Tracked", val: String((vehicles as any[]).length), icon: Truck, color: "text-primary", sub: `Week of ${weekLabel}` },
          { label: "Avg Utilisation", val: `${avgUtil}%`, icon: Activity, color: avgUtil >= 75 ? "text-green-600" : avgUtil >= 60 ? "text-amber-500" : "text-red-500", sub: "Transit days ÷ 7" },
          { label: "Wasted Budget (Week)", val: NGN(totalWastedBudget), icon: TrendingDown, color: "text-red-500", sub: "Idle + excess maint" },
          { label: "Monthly Projection", val: NGN(totalWastedBudget * 4.33), icon: DollarSign, color: "text-amber-500", sub: "× 4.33 weeks" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <k.icon className={`w-4 h-4 ${k.color}`} />
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
              <p className={`text-xl font-black ${k.color}`}>{k.val}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Asset Utilisation - Week of {weekLabel}</CardTitle>
          <CardDescription>{canLog ? "Click 'Log' to add maintenance or idle reason codes." : "Contact the Logistics Manager to update."}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead className="text-center">Transit</TableHead>
                <TableHead className="text-center">Maintenance</TableHead>
                <TableHead className="text-center">Idle</TableHead>
                <TableHead className="text-center">Utilisation</TableHead>
                <TableHead className="text-right">Wasted Budget</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {canLog && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map((w) => {
                const flagClass =
                  w.flag === "green" ? "bg-green-500/20 text-green-700 border-green-500/30"
                  : w.flag === "yellow" ? "bg-amber-500/20 text-amber-700 border-amber-500/30"
                  : "bg-red-500/20 text-red-700 border-red-500/30";
                const flagLabel = w.flag === "green" ? "On Track" : w.flag === "yellow" ? "Monitor" : "Critical";
                return (
                  <TableRow key={w.vehicle.id} className={w.missingIdleReasons.length > 0 ? "bg-amber-500/5" : ""}>
                    <TableCell>
                      <p className="font-semibold text-sm">{w.vehicle.registration_number}</p>
                      <p className="text-xs text-muted-foreground">{w.vehicle.vehicle_type}</p>
                      {w.vehicle.expected_daily_revenue === 0 && (
                        <p className="text-xs text-amber-600">Daily cost not set</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center text-teal-600 font-medium">{w.transitDays}d</TableCell>
                    <TableCell className="text-center">
                      <span className={w.maintenanceDays > 2 ? "text-amber-600 font-medium" : ""}>{w.maintenanceDays}d</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div>
                        <span className={w.idleDays > 2 ? "text-red-500 font-medium" : ""}>{w.idleDays}d</span>
                        {w.missingIdleReasons.length > 0 && (
                          <p className="text-[10px] text-amber-600">⚠ {w.missingIdleReasons.length} uncoded</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <p className="font-semibold text-sm">{w.utilisationPct}%</p>
                      <Progress value={w.utilisationPct} className="h-1.5 mt-1 w-16 mx-auto" />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={w.totalWastedBudget > 0 ? "text-red-500 font-semibold" : "text-green-600 font-semibold"}>
                        {NGN(w.totalWastedBudget)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${flagClass} text-[10px]`} variant="outline">{flagLabel}</Badge>
                    </TableCell>
                    {canLog && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs"
                            onClick={() => { setSelectedVehicleId(w.vehicle.id); setMaintOpen(true); }}>
                            <Wrench className="w-3 h-3 mr-1" />Maint
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" disabled={w.idleDays === 0}
                            onClick={() => {
                              setSelectedVehicleId(w.vehicle.id);
                              if (w.missingIdleReasons.length > 0) setIdleForm((f) => ({ ...f, idle_date: w.missingIdleReasons[0] }));
                              setIdleOpen(true);
                            }}>
                            <Clock className="w-3 h-3 mr-1" />Idle
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {canLog && (
        <>
          <Dialog open={maintOpen} onOpenChange={setMaintOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Maintenance Event</DialogTitle>
                <DialogDescription>Maintenance beyond 2 days/week counts as wasted budget.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Asset</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                    <SelectContent>
                      {(vehicles as any[]).map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.registration_number} - {v.vehicle_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Start Date *</Label>
                    <Input type="date" value={maintForm.start_date} onChange={(e) => setMaintForm((f) => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date *</Label>
                    <Input type="date" value={maintForm.end_date} onChange={(e) => setMaintForm((f) => ({ ...f, end_date: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Type *</Label>
                  <Select value={maintForm.maintenance_type} onValueChange={(v) => setMaintForm((f) => ({ ...f, maintenance_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="breakdown">Breakdown</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Description (optional)</Label>
                  <Textarea value={maintForm.description} onChange={(e) => setMaintForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMaintOpen(false)}>Cancel</Button>
                <Button onClick={() => addMaintenance.mutate()} disabled={addMaintenance.isPending || !selectedVehicleId || !maintForm.start_date || !maintForm.end_date}>
                  {addMaintenance.isPending ? "Saving…" : "Log Maintenance"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={idleOpen} onOpenChange={setIdleOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log Idle Day Reason</DialogTitle>
                <DialogDescription>Every idle day must have a reason code.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Asset</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                    <SelectContent>
                      {(vehicles as any[]).map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>{v.registration_number} - {v.vehicle_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date *</Label>
                  <Input type="date" value={idleForm.idle_date}
                    onChange={(e) => setIdleForm((f) => ({ ...f, idle_date: e.target.value }))}
                    min={format(weekStart, "yyyy-MM-dd")} max={format(weekEnd, "yyyy-MM-dd")} />
                </div>
                <div className="space-y-1.5">
                  <Label>Reason *</Label>
                  <Select value={idleForm.reason_code} onValueChange={(v) => setIdleForm((f) => ({ ...f, reason_code: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(IDLE_REASONS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {idleForm.reason_code === "other" && (
                  <div className="space-y-1.5">
                    <Label>Notes (required for Other)</Label>
                    <Textarea value={idleForm.notes} onChange={(e) => setIdleForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIdleOpen(false)}>Cancel</Button>
                <Button onClick={() => logIdle.mutate()} disabled={logIdle.isPending || !selectedVehicleId || !idleForm.idle_date}>
                  {logIdle.isPending ? "Saving…" : "Log Idle Day"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default DeptAssetUtilisationManager;
