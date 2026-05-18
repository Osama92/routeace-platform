import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import useIntelligenceAccessLog from "@/hooks/useIntelligenceAccessLog";
import { Brain, Shield, Users, AlertTriangle, TrendingUp, Fuel, Activity, Eye, RefreshCw, Loader2 } from "lucide-react";

const tierColors: Record<string, string> = {
  elite: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  risk_monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  blocked: "bg-red-500/20 text-red-400 border-red-500/30",
};

const riskTierColors: Record<string, string> = {
  low: "bg-emerald-500/20 text-emerald-400",
  medium: "bg-amber-500/20 text-amber-400",
  high: "bg-orange-500/20 text-orange-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function DriverIntelligence() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["driver-behavior-scores"],
    queryFn: async () => {
      const { data } = await supabase.from("driver_behavior_scores").select("*").order("overall_score", { ascending: false });
      return data || [];
    },
  });

  const { data: insuranceProfiles = [] } = useQuery({
    queryKey: ["driver-insurance-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("driver_insurance_profiles").select("*").order("insurance_risk_score", { ascending: false });
      return data || [];
    },
  });

  const { data: behaviorEvents = [] } = useQuery({
    queryKey: ["driver-behavior-events"],
    queryFn: async () => {
      const { data } = await supabase.from("driver_behavior_events").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: accidentRisks = [] } = useQuery({
    queryKey: ["accident-risk-scores"],
    queryFn: async () => {
      const { data } = await supabase.from("accident_risk_scores").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ["drivers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("drivers").select("id, full_name, phone, status").eq("status", "active");
      return data || [];
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.functions.invoke("driver-scoring-engine", { body: { action: "fleet_scan" } });
      return data;
    },
    onSuccess: () => {
      toast({ title: "Fleet scan complete", description: "All driver scores recalculated" });
      queryClient.invalidateQueries({ queryKey: ["driver-behavior-scores"] });
      queryClient.invalidateQueries({ queryKey: ["driver-insurance-profiles"] });
    },
    onError: (e) => toast({ title: "Scan failed", description: e.message, variant: "destructive" }),
  });

  const getDriverName = (driverId: string) => {
    const d = drivers.find((dr: any) => dr.id === driverId) as any;
    return d?.full_name || driverId.slice(0, 8);
  };

  const eliteCount = scores.filter((s: any) => s.dispatch_tier === "elite").length;
  const blockedCount = scores.filter((s: any) => s.dispatch_tier === "blocked").length;
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s: number, sc: any) => s + Number(sc.overall_score || 0), 0) / scores.length) : 0;
  const criticalInsurance = insuranceProfiles.filter((p: any) => p.risk_tier === "critical").length;

  // Audit-trail: record LC driver intelligence access
  useIntelligenceAccessLog({
    view_scope: "LC",
    module: "driver_intelligence",
    ownership_scope: "internal",
    internal_count: scores.length,
    third_party_count: 0,
    record_count: scores.length,
  });

  return (
    <DashboardLayout title="Driver Intelligence Engine">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Brain className="h-6 w-6 text-primary" /> Driver Intelligence Engine</h1>
            <p className="text-muted-foreground">AI-powered driver scoring, insurance risk, and accident prediction</p>
          </div>
          <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
            {scanMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Recalculate All
          </Button>
        </div>

        <Alert className="border-primary/30 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertTitle>Driver Intelligence - Scope Legend (Logistics Company)</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>This view governs <strong>internal-owned drivers</strong> on your fleet. It surfaces full asset-owner intelligence: behavior scoring, insurance risk, accident-risk prediction, and dispatch-tier blocking.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
              <div className="rounded border border-border/40 p-2">
                <div className="font-semibold mb-1">Internal (owned)</div>
                <p className="text-muted-foreground">Behavior, insurance risk, accident risk, dispatch tier, fuel efficiency, route compliance.</p>
              </div>
              <div className="rounded border border-border/40 p-2">
                <div className="font-semibold mb-1">3PL drivers</div>
                <p className="text-muted-foreground">Not shown here. 3PL transporter SLA &amp; exception attribution lives under the Department / 3PL Compliance view.</p>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 text-center">
            <Users className="h-5 w-5 mx-auto text-blue-400 mb-1" />
            <p className="text-2xl font-bold">{scores.length}</p>
            <p className="text-xs text-muted-foreground">Scored Drivers</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold">{avgScore}</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <Shield className="h-5 w-5 mx-auto text-emerald-400 mb-1" />
            <p className="text-2xl font-bold">{eliteCount}</p>
            <p className="text-xs text-muted-foreground">Elite Drivers</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 text-center">
            <AlertTriangle className="h-5 w-5 mx-auto text-red-400 mb-1" />
            <p className="text-2xl font-bold text-red-400">{blockedCount}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="scores">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="scores">Scores</TabsTrigger>
            <TabsTrigger value="insurance">Insurance</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="accidents">Accident Risk</TabsTrigger>
          </TabsList>

          <TabsContent value="scores" className="space-y-3 mt-4">
            {scoresLoading ? <p className="text-muted-foreground">Loading...</p> : scores.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No driver scores yet. Click "Recalculate All" to generate scores.</CardContent></Card>
            ) : scores.map((s: any) => (
              <Card key={s.id}>
                <CardContent className="py-3 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{getDriverName(s.driver_id)}</p>
                      <Badge className={tierColors[s.dispatch_tier] || ""}>{s.dispatch_tier?.replace("_", " ")}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Safety</span><Progress value={s.safety_score} className="h-1.5 mt-0.5" /></div>
                      <div><span className="text-muted-foreground">Fuel</span><Progress value={s.fuel_efficiency_score} className="h-1.5 mt-0.5" /></div>
                      <div><span className="text-muted-foreground">Route</span><Progress value={s.route_compliance_score} className="h-1.5 mt-0.5" /></div>
                      <div><span className="text-muted-foreground">Timing</span><Progress value={s.delivery_timeliness_score} className="h-1.5 mt-0.5" /></div>
                    </div>
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-2xl font-bold">{Math.round(s.overall_score)}</p>
                    <p className="text-[10px] text-muted-foreground">{s.total_trips} trips</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="insurance" className="space-y-3 mt-4">
            {insuranceProfiles.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No insurance profiles yet.</CardContent></Card>
            ) : insuranceProfiles.map((p: any) => (
              <Card key={p.id}>
                <CardContent className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{getDriverName(p.driver_id)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className={riskTierColors[p.risk_tier] || ""}>{p.risk_tier} risk</Badge>
                      <span className="text-xs text-muted-foreground">Premium: {p.premium_multiplier}x</span>
                      <span className="text-xs text-muted-foreground">Claim prob: {(p.claim_probability * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold">{Math.round(p.insurance_risk_score)}</p>
                    <p className="text-[10px] text-muted-foreground">Risk Score</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="events" className="space-y-2 mt-4">
            {behaviorEvents.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No behavior events recorded yet.</CardContent></Card>
            ) : behaviorEvents.map((e: any) => (
              <Card key={e.id}>
                <CardContent className="py-2 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{e.event_type?.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{getDriverName(e.driver_id)} • {new Date(e.created_at).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={e.severity === "critical" ? "destructive" : "outline"}>{e.severity}</Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="accidents" className="space-y-3 mt-4">
            {accidentRisks.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No accident risk assessments yet.</CardContent></Card>
            ) : accidentRisks.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="py-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-medium">{getDriverName(r.driver_id)}</p>
                    <Badge className={riskTierColors[r.risk_level] || ""}>{r.risk_level} • {r.dispatch_recommendation}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>Driver: {Math.round(r.driver_behavior_risk)}%</div>
                    <div>Vehicle: {Math.round(r.vehicle_condition_risk)}%</div>
                    <div>Route: {Math.round(r.route_risk)}%</div>
                    <div>Fatigue: {Math.round(r.fatigue_risk)}%</div>
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                    <span>Overall: {Math.round(r.overall_risk_score)}%</span>
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
