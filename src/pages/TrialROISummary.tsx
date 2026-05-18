import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { differenceInDays } from "date-fns";
import {
  TrendingUp, Shield, FileCheck, Target, CheckCircle, Zap, Activity,
} from "lucide-react";

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

const FRAUD_RATE = 0.15;
const DISPUTE_RATE = 0.18;
const DISPUTE_COST = 15_000;
const SLA_PROTECTION = 50_000;
const MONTHLY_PER_VEHICLE = 5_000;

export default function TrialROISummary() {
  const { organizationId: orgId } = useAuth();

  const { data: org } = useQuery({
    queryKey: ["roi-org", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("organizations")
        .select("name, created_at")
        .eq("id", orgId!)
        .maybeSingle();
      return data;
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["roi-vehicles", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles")
        .select("id")
        .eq("organization_id", orgId!)
        .neq("status", "retired");
      return data ?? [];
    },
  });

  const { data: dispatches = [] } = useQuery({
    queryKey: ["roi-dispatches", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase.from("dispatches")
        .select("id, cost, status, sla_status, actual_delivery, scheduled_delivery")
        .eq("organization_id", orgId!)
        .order("created_at", { ascending: false })
        .limit(500);
      return data ?? [];
    },
  });

  const daysActive = org?.created_at
    ? Math.max(1, differenceInDays(new Date(), new Date(org.created_at)))
    : 1;
  const monthsActive = Math.max(1, Math.round(daysActive / 30));
  const vehicleCount = vehicles.length;
  const routeAceCost = vehicleCount * MONTHLY_PER_VEHICLE * monthsActive;

  const delivered = dispatches.filter((d: any) => d.status === "delivered");
  const totalTripRevenue = dispatches.reduce((s: any, d: any) => s + Number(d.cost ?? 0), 0);
  const fraudPrevented = Math.round(totalTripRevenue * FRAUD_RATE);
  const dispatchesWithCost = dispatches.filter((d: any) => Number(d.cost ?? 0) > 0).length;
  const disputesSaved = Math.round(dispatchesWithCost * DISPUTE_RATE);
  const disputeSavings = disputesSaved * DISPUTE_COST;
  const slaOnTime = delivered.filter(
    (d: any) => d.actual_delivery && d.scheduled_delivery &&
      new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
  ).length;
  const slaSavings = Math.round(slaOnTime * 0.05 * SLA_PROTECTION);
  const totalSavings = fraudPrevented + disputeSavings + slaSavings;
  const roiRatio = routeAceCost > 0 ? Math.round(totalSavings / routeAceCost) : 0;
  const annualised = Math.round((totalSavings / daysActive) * 365);

  const savingsItems = [
    {
      icon: Shield,
      label: "Driver Fraud Prevented",
      sublabel: `15% of ₦${(totalTripRevenue / 1000).toFixed(0)}k logistics spend (NARTO benchmark)`,
      value: fraudPrevented,
      color: "text-orange-500",
      border: "border-l-orange-500",
      bg: "bg-orange-500/10",
    },
    {
      icon: FileCheck,
      label: "Invoice Disputes Avoided",
      sublabel: `${disputesSaved} disputes × ₦15,000 avg resolution cost`,
      value: disputeSavings,
      color: "text-teal-500",
      border: "border-l-teal-500",
      bg: "bg-teal-500/10",
    },
    {
      icon: Target,
      label: "SLA Contracts Protected",
      sublabel: `${slaOnTime} on-time deliveries tracked and verifiable`,
      value: slaSavings,
      color: "text-green-500",
      border: "border-l-green-500",
      bg: "bg-green-500/10",
    },
  ];

  return (
    <DashboardLayout
      title="Your RouteAce Impact"
      subtitle={`${daysActive} days active · ${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""} · ${dispatches.length} dispatches tracked`}
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Estimated savings generated in {daysActive} days
            </p>
            <div className="flex items-end gap-4 flex-wrap">
              <p className="text-6xl font-black text-primary leading-none">{NGN(totalSavings)}</p>
              {roiRatio > 1 && (
                <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-sm px-3 py-1 mb-1" variant="outline">
                  {roiRatio}× ROI
                </Badge>
              )}
            </div>
            {annualised > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                Annualised estimate: <span className="font-semibold text-foreground">{NGN(annualised)}/year</span>
              </p>
            )}
          </div>
          <CardContent className="pt-4 pb-5">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">RouteAce cost</span>
              <span className="font-semibold">{NGN(routeAceCost)}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-muted-foreground">Estimated savings</span>
              <span className="font-semibold text-green-600">{NGN(totalSavings)}</span>
            </div>
            {routeAceCost > 0 && <Progress value={Math.min(100, roiRatio * 8)} className="h-2" />}
            <p className="text-xs text-muted-foreground mt-3 italic">
              * Estimates use Nigerian fleet industry benchmarks (NARTO, LSLGA). Fraud rate: 15%. Invoice dispute rate: 18%. Your actual savings may differ.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Where the savings come from
          </h3>
          {savingsItems.map((item) => (
            <Card key={item.label} className={`border-l-4 ${item.border}`}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${item.bg} shrink-0`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xl font-black ${item.color}`}>{NGN(item.value)}</p>
                    <p className="text-xs text-muted-foreground">estimated</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Dispatches tracked", val: dispatches.length, icon: Zap },
            { label: "Delivered", val: delivered.length, icon: CheckCircle },
            { label: "Vehicles active", val: vehicleCount, icon: Shield },
            { label: "Days active", val: daysActive, icon: Activity },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="w-3.5 h-3.5 text-primary" />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-2xl font-black text-foreground">{s.val}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-bold text-lg">
                  {NGN(MONTHLY_PER_VEHICLE * vehicleCount)}/month keeps all of this running.
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {vehicleCount} vehicle{vehicleCount !== 1 ? "s" : ""} × ₦5,000 · Unlimited dispatches · Full fraud protection · Zaza AI
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Button variant="outline" onClick={() => (window.location.href = "/")}>Back to Dashboard</Button>
                <Button onClick={() => (window.location.href = "/billing-engine")}>
                  <TrendingUp className="w-4 h-4 mr-1.5" />
                  Subscribe - Keep Saving
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
