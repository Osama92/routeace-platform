import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Wrench, Truck, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { recordCfoEvent } from "@/lib/cfoAudit";
import type { TripProfit } from "@/hooks/useProfitabilityEngine";

const fmt = (n: number) => `₦${Math.round(n).toLocaleString()}`;

interface VehicleRow {
  vehicle_id: string;
  plate: string;
  trips: number;
  revenue: number;
  total_cost: number;
  maintenance_cost: number;
  fuel_cost: number;
  profit: number;
  margin: number;
  maint_to_rev_pct: number;
  recommendation: "healthy" | "monitor" | "repair" | "replace";
  reasoning: string;
}

function classify(r: { revenue: number; profit: number; margin: number; maint_to_rev_pct: number }): {
  recommendation: VehicleRow["recommendation"];
  reasoning: string;
} {
  if (r.revenue <= 0) return { recommendation: "monitor", reasoning: "Insufficient revenue history to assess." };
  if (r.maint_to_rev_pct >= 60 && r.profit < 0) {
    return {
      recommendation: "replace",
      reasoning: `Maintenance is ${r.maint_to_rev_pct.toFixed(0)}% of revenue and the truck is loss-making - replacement recovers margin faster than repair.`,
    };
  }
  if (r.maint_to_rev_pct >= 40) {
    return {
      recommendation: "repair",
      reasoning: `Maintenance/revenue ratio is ${r.maint_to_rev_pct.toFixed(0)}% (>40% leak threshold). Consolidated repair recommended before next dispatch.`,
    };
  }
  if (r.margin < 10) {
    return {
      recommendation: "monitor",
      reasoning: `Margin is ${r.margin.toFixed(1)}% - below healthy band. Monitor fuel & driver cost trends.`,
    };
  }
  return { recommendation: "healthy", reasoning: "Within healthy profitability band." };
}

export default function TruckProfitabilityPanel({ trips }: { trips: TripProfit[] }) {
  const qc = useQueryClient();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const vehicleIds = useMemo(
    () => Array.from(new Set(trips.map((t) => t.vehicle_id).filter(Boolean))) as string[],
    [trips]
  );

  const vehiclesQ = useQuery({
    queryKey: ["truck-profit-plates", vehicleIds],
    enabled: vehicleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, plate_number")
        .in("id", vehicleIds);
      if (error) throw error;
      return data || [];
    },
  });

  const decisionsQ = useQuery({
    queryKey: ["maintenance-decisions-pending", vehicleIds],
    enabled: vehicleIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_decisions")
        .select("vehicle_id, decision_type, approval_status")
        .in("vehicle_id", vehicleIds)
        .eq("approval_status", "pending_approval");
      if (error) throw error;
      return data || [];
    },
  });

  const rows: VehicleRow[] = useMemo(() => {
    const plateMap = new Map((vehiclesQ.data || []).map((v: any) => [v.id, v.plate_number || v.id.slice(0, 8)]));
    const m = new Map<string, VehicleRow>();
    trips.forEach((t) => {
      if (!t.vehicle_id) return;
      const cur = m.get(t.vehicle_id) || {
        vehicle_id: t.vehicle_id,
        plate: plateMap.get(t.vehicle_id) || t.vehicle_id.slice(0, 8),
        trips: 0, revenue: 0, total_cost: 0, maintenance_cost: 0, fuel_cost: 0,
        profit: 0, margin: 0, maint_to_rev_pct: 0,
        recommendation: "healthy" as const, reasoning: "",
      };
      cur.trips += 1;
      cur.revenue += Number(t.revenue);
      cur.total_cost += Number(t.total_cost);
      cur.maintenance_cost += Number(t.maintenance_cost);
      cur.fuel_cost += Number(t.fuel_cost);
      cur.profit = cur.revenue - cur.total_cost;
      cur.margin = cur.revenue > 0 ? (cur.profit / cur.revenue) * 100 : 0;
      cur.maint_to_rev_pct = cur.revenue > 0 ? (cur.maintenance_cost / cur.revenue) * 100 : 0;
      m.set(t.vehicle_id, cur);
    });
    return Array.from(m.values()).map((r) => {
      const c = classify(r);
      return { ...r, recommendation: c.recommendation, reasoning: c.reasoning };
    }).sort((a, b) => b.maint_to_rev_pct - a.maint_to_rev_pct);
  }, [trips, vehiclesQ.data]);

  const leaks = rows.filter((r) => r.maint_to_rev_pct >= 40);
  const replaceCandidates = rows.filter((r) => r.recommendation === "replace");
  const pendingByVehicle = new Map((decisionsQ.data || []).map((d: any) => [d.vehicle_id, d.decision_type]));

  const proposeMutation = useMutation({
    mutationFn: async (row: VehicleRow) => {
      const decision_type = row.recommendation === "replace" ? "dispose" : "schedule_repair";
      const confidence = row.recommendation === "replace" ? 88 : row.maint_to_rev_pct >= 50 ? 82 : 70;

      const { data, error } = await (supabase as any)
        .from("maintenance_decisions")
        .insert({
          vehicle_id: row.vehicle_id,
          decision_type,
          recommended_action: row.recommendation === "replace"
            ? "Retire vehicle and reallocate capital - repair ROI negative"
            : "Consolidate repairs into single workshop visit before next dispatch",
          reasoning: row.reasoning,
          confidence_score: confidence,
          approval_status: "pending_approval",
          triggered_by: "profitability_engine",
          metadata: {
            source: "TruckProfitabilityPanel",
            trips: row.trips,
            revenue: row.revenue,
            maintenance_cost: row.maintenance_cost,
            maint_to_rev_pct: Number(row.maint_to_rev_pct.toFixed(2)),
            margin_pct: Number(row.margin.toFixed(2)),
            profit: row.profit,
          },
        })
        .select()
        .single();
      if (error) throw error;
      await recordCfoEvent({
        moduleKey: "profitability_engine",
        eventType: "recommendation_shown",
        recommendation: `${decision_type} for vehicle ${row.plate}`,
        metadata: {
          vehicle_id: row.vehicle_id,
          decision_id: data?.id,
          decision_type,
          confidence,
          maint_to_rev_pct: row.maint_to_rev_pct,
        },
      }).catch(() => undefined);
      return data;
    },
    onMutate: (row) => setSubmitting(row.vehicle_id),
    onSuccess: (_d, row) => {
      toast.success(`Proposed ${row.recommendation === "replace" ? "replacement" : "repair"} - pending approval`);
      qc.invalidateQueries({ queryKey: ["maintenance-decisions-pending"] });
    },
    onError: (err: any) => toast.error(err?.message || "Failed to submit recommendation"),
    onSettled: () => setSubmitting(null),
  });

  if (trips.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          <Truck className="w-12 h-12 mx-auto mb-4 opacity-50" />
          No trip-level vehicle data yet. Per-truck profitability appears as dispatches close.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {leaks.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Profit-leak detected</AlertTitle>
          <AlertDescription>
            {leaks.length} vehicle{leaks.length > 1 ? "s have" : " has"} maintenance &gt; 40% of revenue.
            {replaceCandidates.length > 0 && ` ${replaceCandidates.length} candidate(s) for replacement.`}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wrench className="w-4 h-4 text-primary" />
            Per-Truck Profitability & Repair-vs-Replace
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Vehicle</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Trips</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Revenue</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Maint.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Maint/Rev</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Profit</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Margin</TableHead>
                  <TableHead className="min-w-[260px]">Recommendation</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const pending = pendingByVehicle.get(r.vehicle_id);
                  const variant =
                    r.recommendation === "replace" ? "destructive" :
                    r.recommendation === "repair" ? "secondary" :
                    r.recommendation === "monitor" ? "outline" : "default";
                  return (
                    <TableRow key={r.vehicle_id}>
                      <TableCell className="font-medium whitespace-nowrap">{r.plate}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{r.trips}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{fmt(r.revenue)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{fmt(r.maintenance_cost)}</TableCell>
                      <TableCell className={`text-right whitespace-nowrap tabular-nums ${r.maint_to_rev_pct >= 40 ? "text-destructive font-semibold" : ""}`}>
                        {r.maint_to_rev_pct.toFixed(0)}%
                      </TableCell>
                      <TableCell className={`text-right whitespace-nowrap tabular-nums ${r.profit < 0 ? "text-destructive" : "text-green-600"}`}>
                        {fmt(r.profit)}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap tabular-nums">{r.margin.toFixed(1)}%</TableCell>
                      <TableCell className="min-w-[260px]">
                        <div className="flex flex-col gap-1">
                          <Badge variant={variant as any} className="w-fit capitalize">{r.recommendation}</Badge>
                          <span className="text-[11px] text-muted-foreground leading-snug max-w-xs">{r.reasoning}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {pending ? (
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Pending approval
                          </Badge>
                        ) : (r.recommendation === "repair" || r.recommendation === "replace") ? (
                          <Button
                            size="sm"
                            variant={r.recommendation === "replace" ? "destructive" : "secondary"}
                            disabled={submitting === r.vehicle_id}
                            onClick={() => proposeMutation.mutate(r)}
                          >
                            {submitting === r.vehicle_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              r.recommendation === "replace" ? "Propose replace" : "Propose repair"
                            )}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Approval-gated: proposals are written to the maintenance decision queue and require sign-off in <code>/maintenance-intelligence</code> before any grounding or work order is created.
      </p>
    </div>
  );
}
