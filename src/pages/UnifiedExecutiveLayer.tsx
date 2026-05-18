import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Shield, TrendingUp, Building2, AlertTriangle, DollarSign, Activity } from "lucide-react";

export default function UnifiedExecutiveLayer() {
  const { organizationId } = useAuth();
  // Strict org isolation - every role (including Super Admin) sees only their own org
  const ready = !!organizationId;

  const { data: dispatches = [] } = useQuery({
    queryKey: ["exec-dispatches", organizationId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from("dispatches").select("status, cost").eq("organization_id", organizationId!).limit(5000);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["exec-invoices", organizationId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from("invoices").select("status, total_amount").eq("organization_id", organizationId!).limit(5000);
      return data || [];
    },
  });

  const { data: savings = [] } = useQuery({
    queryKey: ["exec-savings", organizationId],
    enabled: ready,
    queryFn: async () => {
      const { data } = await supabase.from("fuel_savings_ledger").select("cost_saved").eq("organization_id", organizationId!).limit(1000);
      return data || [];
    },
  });

  const totalRevenue = invoices.reduce((a: number, i: any) => a + Number(i.total_amount || 0), 0);
  const collectedRevenue = invoices.filter((i: any) => i.status === "paid").reduce((a: number, i: any) => a + Number(i.total_amount || 0), 0);
  const totalDispatches = dispatches.length;
  const completedDispatches = dispatches.filter((d: any) => ["delivered", "closed"].includes(d.status)).length;
  const totalSaved = savings.reduce((a: number, s: any) => a + Number(s.cost_saved || 0), 0);

  // Only treat as "real activity" when there is monetary or operational throughput
  const hasActivity = totalRevenue > 0 || totalDispatches > 0;
  const collectionRate = totalRevenue > 0 ? (collectedRevenue / totalRevenue) * 100 : 0;
  const completionRate = totalDispatches > 0 ? (completedDispatches / totalDispatches) * 100 : 0;
  // Risk / profit only computed when there is activity; otherwise N/A
  const riskScore = hasActivity ? Math.max(0, Math.min(100, 100 - (collectionRate * 0.4 + completionRate * 0.6))) : null;
  const profitHealth = hasActivity ? Math.min(100, (collectionRate * 0.5) + (completionRate * 0.3) + Math.min(20, totalSaved / 100000)) : null;
  const grossMargin = totalRevenue > 0 ? ((collectedRevenue - dispatches.reduce((a: number, d: any) => a + Number(d.cost || 0) * 0.6, 0)) / collectedRevenue) * 100 : 0;

  return (
    <DashboardLayout title="Executive Command">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Building2 className="w-7 h-7 text-primary" /> Executive Command Layer</h1>
          <p className="text-muted-foreground">Unified Risk + Profit + Investor view</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="border-2 border-red-500/30 bg-gradient-to-br from-red-500/5 to-transparent">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Shield className="w-5 h-5 text-red-500" /> Risk Score</CardTitle></CardHeader>
            <CardContent>
              {riskScore === null ? (
                <><p className="text-3xl font-bold text-muted-foreground">-</p><p className="text-xs text-muted-foreground mt-2">No activity yet</p></>
              ) : (
                <><p className="text-4xl font-bold text-red-500">{Math.round(riskScore)}</p>
                <Progress value={riskScore} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">{riskScore < 30 ? "🟢 Healthy" : riskScore < 60 ? "🟡 Watch" : "🔴 Critical"}</p></>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="w-5 h-5 text-green-500" /> Profit Health</CardTitle></CardHeader>
            <CardContent>
              {profitHealth === null ? (
                <><p className="text-3xl font-bold text-muted-foreground">-</p><p className="text-xs text-muted-foreground mt-2">No activity yet</p></>
              ) : (
                <><p className="text-4xl font-bold text-green-600">{Math.round(profitHealth)}</p>
                <Progress value={profitHealth} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">Margin: {Math.round(grossMargin)}%</p></>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-5 h-5 text-primary" /> Investor KPI</CardTitle></CardHeader>
            <CardContent>
              {!hasActivity ? (
                <><p className="text-3xl font-bold text-muted-foreground">-</p><p className="text-xs text-muted-foreground mt-2">No deliveries yet</p></>
              ) : (
                <><p className="text-4xl font-bold">{Math.round(completionRate)}%</p>
                <Progress value={completionRate} className="mt-2 h-2" />
                <p className="text-xs text-muted-foreground mt-2">Delivery completion</p></>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="risk">
          <TabsList>
            <TabsTrigger value="risk">Risk Engine</TabsTrigger>
            <TabsTrigger value="profit">Profit Engine</TabsTrigger>
            <TabsTrigger value="investor">Investor View</TabsTrigger>
          </TabsList>

          <TabsContent value="risk" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>Risk Drivers</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Stat label="Outstanding Receivables" value={`₦${(totalRevenue - collectedRevenue).toLocaleString()}`} color="text-red-600" />
                <Stat label="Dispatch Failure Rate" value={hasActivity ? `${Math.round(100 - completionRate)}%` : "-"} color="text-orange-600" />
                <Stat label="Collection Rate" value={totalRevenue > 0 ? `${Math.round(collectionRate)}%` : "-"} color="text-blue-600" />
                <Stat label="Active Dispatches" value={`${totalDispatches - completedDispatches}`} color="text-foreground" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>Profit Levers</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Stat label="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} color="text-foreground" />
                <Stat label="Collected" value={`₦${collectedRevenue.toLocaleString()}`} color="text-green-600" />
                <Stat label="AI Savings (Fuel)" value={`₦${totalSaved.toLocaleString()}`} color="text-green-600" />
                <Stat label="Gross Margin" value={`${Math.round(grossMargin)}%`} color="text-foreground" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="investor" className="space-y-3">
            <Card>
              <CardHeader><CardTitle>Investor-Grade KPIs</CardTitle></CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <Stat label="Total Deliveries" value={totalDispatches.toLocaleString()} color="text-foreground" />
                <Stat label="Completion Rate" value={`${Math.round(completionRate)}%`} color="text-green-600" />
                <Stat label="Revenue (LTM)" value={`₦${totalRevenue.toLocaleString()}`} color="text-foreground" />
                <Stat label="Operational Efficiency" value={`${Math.round(profitHealth)}/100`} color="text-primary" />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="p-4 rounded-lg bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
