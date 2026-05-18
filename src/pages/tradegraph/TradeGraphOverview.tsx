import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Globe, Store, Truck, Package, Warehouse, MapPin, Factory,
  Ship, Users, TrendingUp, Activity, Zap, ArrowRight, Network, Loader2,
} from "lucide-react";

const TradeGraphOverview = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["trade-graph-stats"],
    queryFn: async () => {
      const [dispatches, customers, drivers, vehicles, identities, supplyListings] = await Promise.all([
        supabase.from("dispatches").select("id, status, cost, created_at", { count: "exact" }),
        supabase.from("customers").select("id", { count: "exact", head: true }),
        supabase.from("drivers").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("commerce_identities").select("id", { count: "exact", head: true }),
        supabase.from("exchange_supply_listings").select("id", { count: "exact", head: true }),
      ]);

      const dispatchData = dispatches.data || [];
      const delivered = dispatchData.filter(d => d.status === "delivered" || d.status === "closed");
      const totalRevenue = dispatchData.reduce((s, d) => s + (d.cost || 0), 0);

      return {
        totalDispatches: dispatches.count || 0,
        deliveredCount: delivered.length,
        customerCount: customers.count || 0,
        driverCount: drivers.count || 0,
        vehicleCount: vehicles.count || 0,
        identityCount: identities.count || 0,
        supplyListings: supplyListings.count || 0,
        totalRevenue,
      };
    },
  });

  const graphStats = [
    { label: "Customers", count: stats?.customerCount?.toLocaleString() || "0", icon: Store, color: "text-emerald-500", delta: "Active accounts" },
    { label: "Drivers", count: stats?.driverCount?.toLocaleString() || "0", icon: Truck, color: "text-primary", delta: "Registered" },
    { label: "Vehicles", count: stats?.vehicleCount?.toLocaleString() || "0", icon: Package, color: "text-purple-500", delta: "In fleet" },
    { label: "Commerce IDs", count: stats?.identityCount?.toLocaleString() || "0", icon: Users, color: "text-info", delta: "RCID registered" },
    { label: "Dispatches", count: stats?.totalDispatches?.toLocaleString() || "0", icon: Factory, color: "text-amber-500", delta: "Total created" },
    { label: "Exchange Listings", count: stats?.supplyListings?.toLocaleString() || "0", icon: Globe, color: "text-rose-500", delta: "Active supply" },
  ];

  const liveEdges = [
    { type: "Deliveries Completed", daily: stats?.deliveredCount?.toLocaleString() || "0", color: "text-emerald-500" },
    { type: "Active Dispatches", daily: stats ? (stats.totalDispatches - stats.deliveredCount).toLocaleString() : "0", color: "text-primary" },
    { type: "Revenue Volume", daily: `₦${((stats?.totalRevenue || 0) / 1000).toFixed(0)}K`, color: "text-amber-500" },
  ];

  if (isLoading) {
    return (
      <DashboardLayout title="Global Trade Graph" subtitle="Loading...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Global Trade Graph" subtitle="Real-time digital map of Africa's trade & distribution networks">
      <div className="space-y-6">
        {/* Graph Node Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {graphStats.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <Card className="hover:border-primary/30 transition-all">
                <CardContent className="p-4 text-center">
                  <s.icon className={`w-7 h-7 mx-auto mb-2 ${s.color}`} />
                  <p className="text-xl font-bold text-foreground">{s.count}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-[9px] text-emerald-500 mt-1">{s.delta}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Live Network Visualization */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Network className="w-4 h-4 text-primary" /> Continental Trade Network
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live • {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative bg-muted/20 rounded-xl p-4 min-h-[420px] overflow-hidden">
              <svg viewBox="0 0 900 420" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                <ellipse cx="350" cy="210" rx="140" ry="170" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
                <text x="350" y="215" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="14" fontWeight="700">AFRICA</text>

                {[
                  { x: 310, y: 140, label: "Lagos", r: 8, pulse: true },
                  { x: 360, y: 120, label: "Abuja", r: 5, pulse: false },
                  { x: 390, y: 90, label: "Kano", r: 4, pulse: false },
                  { x: 380, y: 210, label: "PH", r: 4, pulse: false },
                  { x: 260, y: 130, label: "Accra", r: 5, pulse: true },
                  { x: 450, y: 180, label: "Nairobi", r: 6, pulse: true },
                  { x: 470, y: 220, label: "Mombasa", r: 5, pulse: false },
                  { x: 420, y: 340, label: "Joburg", r: 6, pulse: true },
                  { x: 400, y: 120, label: "Addis", r: 4, pulse: false },
                  { x: 310, y: 200, label: "Douala", r: 4, pulse: false },
                ].map(city => (
                  <g key={city.label}>
                    <circle cx={city.x} cy={city.y} r={city.r} fill="hsl(var(--primary))" />
                    {city.pulse && (
                      <circle cx={city.x} cy={city.y} r={city.r} fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4">
                        <animate attributeName="r" from={city.r} to={city.r + 12} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    <text x={city.x} y={city.y - city.r - 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8" fontWeight="500">{city.label}</text>
                  </g>
                ))}

                {[
                  { x: 620, y: 70, label: "Europe" },
                  { x: 700, y: 180, label: "Middle East" },
                  { x: 780, y: 300, label: "Asia" },
                  { x: 120, y: 80, label: "Americas" },
                ].map(dest => (
                  <g key={dest.label}>
                    <circle cx={dest.x} cy={dest.y} r="28" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--primary) / 0.25)" />
                    <text x={dest.x} y={dest.y + 4} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9" fontWeight="500">{dest.label}</text>
                  </g>
                ))}

                {[
                  { x1: 400, y1: 140, x2: 590, y2: 70, color: "hsl(var(--primary))" },
                  { x1: 420, y1: 200, x2: 670, y2: 180, color: "hsl(142 76% 36%)" },
                  { x1: 440, y1: 300, x2: 750, y2: 300, color: "hsl(45 93% 47%)" },
                  { x1: 260, y1: 100, x2: 150, y2: 80, color: "hsl(262 83% 58%)" },
                  { x1: 310, y1: 140, x2: 360, y2: 120, color: "hsl(var(--primary) / 0.4)" },
                  { x1: 310, y1: 140, x2: 260, y2: 130, color: "hsl(var(--primary) / 0.4)" },
                  { x1: 450, y1: 180, x2: 470, y2: 220, color: "hsl(var(--primary) / 0.4)" },
                  { x1: 450, y1: 180, x2: 420, y2: 340, color: "hsl(199 89% 48%)" },
                ].map((l, i) => (
                  <g key={i}>
                    <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5">
                      <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <circle r="2.5" fill={l.color}>
                      <animateMotion dur="3s" repeatCount="indefinite" path={`M${l.x1},${l.y1} L${l.x2},${l.y2}`} />
                    </circle>
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="edges" className="space-y-4">
          <TabsList>
            <TabsTrigger value="edges">Live Network Activity</TabsTrigger>
            <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="edges">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {liveEdges.map(e => (
                <Card key={e.type}>
                  <CardContent className="p-4 text-center">
                    <Zap className={`w-5 h-5 mx-auto mb-2 ${e.color}`} />
                    <p className="text-lg font-bold text-foreground">{e.daily}</p>
                    <p className="text-[10px] text-muted-foreground">{e.type}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="data-sources">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { source: "Dispatches", table: "dispatches", count: stats?.totalDispatches || 0 },
                { source: "Customers", table: "customers", count: stats?.customerCount || 0 },
                { source: "Drivers", table: "drivers", count: stats?.driverCount || 0 },
                { source: "Vehicles", table: "vehicles", count: stats?.vehicleCount || 0 },
                { source: "Commerce IDs", table: "commerce_identities", count: stats?.identityCount || 0 },
                { source: "Exchange Listings", table: "exchange_supply_listings", count: stats?.supplyListings || 0 },
              ].map(s => (
                <Card key={s.source}>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold">{s.source}</p>
                    <p className="text-xs text-muted-foreground font-mono">{s.table}</p>
                    <p className="text-lg font-bold text-primary mt-1">{s.count.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TradeGraphOverview;
