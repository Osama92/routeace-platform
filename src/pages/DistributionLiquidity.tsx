import DemoDataBanner from "@/components/shared/DemoDataBanner";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Zap, Package, Truck, Warehouse, TrendingUp, ArrowRight,
  DollarSign, Activity, Target, BarChart3, RefreshCw,
} from "lucide-react";
import { ZeroState } from "@/components/ui/ZeroState";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Auto-matched trades are surfaced from real dispatch/matching engine activity.
// Until matching data is available the tab shows a zero-state.

const DistributionLiquidity = () => {
  const { organizationId } = useAuth();
  const [ticker, setTicker] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTicker((t) => t + 1), 5000);
    return () => clearInterval(interval);
  }, []);

  // Real 14-day dispatch flow — replaces Math.random series
  const { data: dispatchHistory = [] } = useQuery({
    queryKey: ["liquidity-dispatches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const since = new Date(Date.now() - 14 * 86400000).toISOString();
      const { data } = await supabase
        .from("dispatches")
        .select("created_at, status")
        .eq("organization_id", organizationId!)
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const liquidityData = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(Date.now() - (13 - i) * 86400000);
    const dayStr = day.toISOString().split("T")[0];
    const dayDispatches = (dispatchHistory as any[]).filter((d) =>
      d.created_at?.startsWith(dayStr)
    );
    const matched = dayDispatches.filter((d) => d.status !== "pending").length;
    return {
      day: `Day ${i + 1}`,
      supply: dayDispatches.length,
      demand: dayDispatches.length,
      matched,
    };
  });

  // Real idle vehicle counts — replaces hardcoded "127 trucks, 4,200 sqm, 340 tonnes"
  const { data: vehicleData } = useQuery({
    queryKey: ["idle-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("status")
        .eq("organization_id", organizationId!);
      return data ?? [];
    },
  });
  const idleCount = (vehicleData ?? []).filter(
    (v: any) => v.status === "idle" || v.status === "available"
  ).length;
  const idleAssets = [
    {
      type: "Idle Vehicles",
      count: String(idleCount),
      potential: `₦${(idleCount * 150_000).toLocaleString()}/mo`,
      icon: Truck,
      action: "Route Assignment",
    },
  ];


  return (
    <DashboardLayout title="Distribution Liquidity Engine" subtitle="Converting idle capacity into live trade transactions">
      <div className="space-y-6">
        <DemoDataBanner feature="Distribution Liquidity Engine" />
        {/* Liquidity Pulse */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Supply Liquidity", value: "2,847 listings", icon: Package, color: "text-emerald-500" },
            { label: "Demand Liquidity", value: "1,923 orders", icon: Target, color: "text-blue-500" },
            { label: "Matched Today", value: "63 trades", icon: Zap, color: "text-amber-500" },
            { label: "Idle → Active", value: "₦24.6M recovered", icon: RefreshCw, color: "text-purple-500" },
          ].map((s) => (
            <Card key={s.label} className="bg-card/80 border-border/50">
              <CardContent className="p-3 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Supply vs Demand Flow */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Supply → Demand Liquidity Flow (14-Day)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={liquidityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area type="monotone" dataKey="supply" stroke="hsl(142 76% 36%)" fill="hsl(142 76% 36% / 0.15)" name="Supply" />
                <Area type="monotone" dataKey="demand" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60% / 0.15)" name="Demand" />
                <Area type="monotone" dataKey="matched" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" name="Matched" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Tabs defaultValue="idle" className="space-y-4">
          <TabsList>
            <TabsTrigger value="idle">Idle Capacity Recovery</TabsTrigger>
            <TabsTrigger value="auto">Auto-Matched Trades</TabsTrigger>
            <TabsTrigger value="flywheel">Network Flywheel</TabsTrigger>
          </TabsList>

          <TabsContent value="idle" className="space-y-3">
            {(vehicleData ?? []).length === 0 ? (
              <ZeroState
                icon={Truck}
                title="No fleet to monetize yet"
                description="Once you register vehicles, idle capacity recovery suggestions and live revenue potential will appear here."
                actionLabel="Add Vehicles"
                actionHref="/fleet"
              />
            ) : (
              idleAssets.map((asset) => (
                <Card key={asset.type} className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <asset.icon className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{asset.type}</p>
                        <p className="text-sm text-muted-foreground">{asset.count} idle · Revenue potential: {asset.potential}</p>
                      </div>
                    </div>
                    <Button size="sm"><Zap className="w-3 h-3 mr-1" /> {asset.action}</Button>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="auto" className="space-y-3">
            <ZeroState
              icon={Zap}
              title="No auto-matched trades yet"
              description="As your dispatches and demand signals grow, the matching engine will surface live supply→demand trades here."
              actionLabel="View Dispatches"
              actionHref="/dispatch"
            />
          </TabsContent>

          <TabsContent value="flywheel">
            <Card>
              <CardContent className="py-10">
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="text-lg font-bold text-center">Network Effect Flywheel</h3>
                  <div className="space-y-3">
                    {[
                      { step: "More Suppliers", result: "→ More demand attracted", icon: Package },
                      { step: "More Demand", result: "→ More logistics activity", icon: Target },
                      { step: "More Logistics", result: "→ More distributors join", icon: Truck },
                      { step: "More Distributors", result: "→ More retailers served", icon: BarChart3 },
                      { step: "More Retailers", result: "→ More suppliers attracted", icon: TrendingUp },
                    ].map((f, i) => (
                      <motion.div key={f.step} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <f.icon className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <span className="font-semibold text-sm">{f.step}</span>
                          <span className="text-sm text-muted-foreground ml-2">{f.result}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};



const __InnerDemo_DistributionLiquidity = DistributionLiquidity;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_DistributionLiquidity = () => (
  <__DemoPreviewGate title="Distribution Liquidity" description="Distributor working-capital & credit-line view.">
    <__InnerDemo_DistributionLiquidity />
  </__DemoPreviewGate>
);
export default __WrappedDemo_DistributionLiquidity;
