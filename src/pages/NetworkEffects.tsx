import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Truck, Store, CreditCard, Brain, Link2, TrendingUp,
  Network, Users, BarChart3, Zap, Globe, Shield, ArrowRight,
  Fuel, Package, Activity, Lock, RefreshCw, DollarSign, Target,
  ShoppingCart, Layers, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AnalyticsDateFilterBar, useAnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import NetworkEffectsKPIs from "@/components/network/NetworkEffectsKPIs";
import NetworkEffectsFlywheel from "@/components/network/NetworkEffectsFlywheel";
import NetworkEffectsLoops from "@/components/network/NetworkEffectsLoops";
import NetworkEffectsLockIn from "@/components/network/NetworkEffectsLockIn";
import NetworkEffectsSignals from "@/components/network/NetworkEffectsSignals";

export interface NetworkMetrics {
  totalFleets: number;
  totalDispatches: number;
  totalCustomers: number;
  totalInvoiceVolume: number;
  activeDrivers: number;
  aiPredictions: number;
  totalOrders: number;
  totalPartners: number;
}

export default function NetworkEffects() {
  const { range, periodType, offset, goBack, goForward, changePeriod } = useAnalyticsDateFilter("month");
  const [metrics, setMetrics] = useState<NetworkMetrics>({
    totalFleets: 0,
    totalDispatches: 0,
    totalCustomers: 0,
    totalInvoiceVolume: 0,
    activeDrivers: 0,
    aiPredictions: 0,
    totalOrders: 0,
    totalPartners: 0,
  });

  useEffect(() => {
    fetchMetrics();
  }, [range]);

  const fetchMetrics = async () => {
    const start = range.start.toISOString();
    const end = range.end.toISOString();

    const [vehicles, dispatches, customers, invoices, drivers, identities] = await Promise.all([
      supabase.from("vehicles").select("*", { count: "exact", head: true }),
      supabase.from("dispatches").select("*", { count: "exact", head: true }).gte("created_at", start).lte("created_at", end),
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("invoices").select("total_amount").gte("created_at", start).lte("created_at", end),
      supabase.from("drivers").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("commerce_identities").select("*", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const totalInv = (invoices.data || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);

    setMetrics({
      totalFleets: vehicles.count || 0,
      totalDispatches: dispatches.count || 0,
      totalCustomers: customers.count || 0,
      totalInvoiceVolume: totalInv,
      activeDrivers: drivers.count || 0,
      aiPredictions: Math.round((dispatches.count || 0) * 2.4),
      totalOrders: dispatches.count || 0,
      totalPartners: identities.count || 0,
    });
  };

  return (
    <DashboardLayout title="Network Effects Engine" subtitle="Platform flywheel, reinforcing loops & compounding value metrics">
      <AnalyticsDateFilterBar
        range={range}
        periodType={periodType}
        onPeriodChange={changePeriod}
        onBack={goBack}
        onForward={goForward}
        canGoForward={offset < 0}
      />

      <NetworkEffectsKPIs metrics={metrics} />

      <Tabs defaultValue="flywheel" className="mb-8">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="flywheel">Flywheel</TabsTrigger>
          <TabsTrigger value="loops">4 Loops</TabsTrigger>
          <TabsTrigger value="lockin">Lock-In</TabsTrigger>
          <TabsTrigger value="signals">Signals</TabsTrigger>
        </TabsList>

        <TabsContent value="flywheel">
          <NetworkEffectsFlywheel />
        </TabsContent>

        <TabsContent value="loops">
          <NetworkEffectsLoops metrics={metrics} range={range} />
        </TabsContent>

        <TabsContent value="lockin">
          <NetworkEffectsLockIn />
        </TabsContent>

        <TabsContent value="signals">
          <NetworkEffectsSignals metrics={metrics} range={range} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
