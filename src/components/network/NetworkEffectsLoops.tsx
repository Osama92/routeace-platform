import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, ShoppingCart, Brain, DollarSign, ArrowRight, Activity, Layers, Target } from "lucide-react";
import type { NetworkMetrics } from "@/pages/NetworkEffects";

interface Props {
  metrics: NetworkMetrics;
  range: { label: string };
}

const LOOPS = [
  {
    id: "logistics",
    title: "Logistics Density Loop",
    icon: Truck,
    color: "text-blue-500",
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    effect: "More fleets → more capacity → better routing → lower costs → attracts more fleets",
    features: ["Smart Load Matching", "Backhaul Optimization", "Shared Capacity Network"],
    signal: (m: NetworkMetrics) => `${m.totalFleets} vehicles × ${m.activeDrivers} drivers active`,
  },
  {
    id: "distribution",
    title: "Distribution Liquidity Loop",
    icon: ShoppingCart,
    color: "text-green-500",
    border: "border-green-500/30",
    bg: "bg-green-500/5",
    effect: "More retailers → more demand → more distributors → faster fulfillment → higher liquidity",
    features: ["Real-Time Demand Marketplace", "Smart Distributor Matching", "Cross-Distributor Fulfillment"],
    signal: (m: NetworkMetrics) => `${m.totalCustomers} customers, ${m.totalOrders} orders`,
  },
  {
    id: "data",
    title: "Data Intelligence Loop",
    icon: Brain,
    color: "text-amber-500",
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    effect: "More usage → better data → better decisions → better outcomes → attracts more users",
    features: ["Demand Intelligence Graph", "Route Intelligence Learning", "Sales Intelligence AI"],
    signal: (m: NetworkMetrics) => `${m.aiPredictions} AI inferences this period`,
  },
  {
    id: "financial",
    title: "Financial Trust Loop",
    icon: DollarSign,
    color: "text-purple-500",
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    effect: "More transactions → better credit scoring → more financing → more transactions",
    features: ["Commerce Identity Score (RCID)", "Embedded Credit Engine", "Instant Settlement Rails"],
    signal: (m: NetworkMetrics) => {
      const v = m.totalInvoiceVolume;
      if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M transacted`;
      if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K transacted`;
      return `₦${v.toFixed(0)} transacted`;
    },
  },
];

export default function NetworkEffectsLoops({ metrics, range }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {LOOPS.map((loop, i) => (
        <motion.div
          key={loop.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <Card className={`${loop.border} border`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${loop.bg}`}>
                  <loop.icon className={`w-5 h-5 ${loop.color}`} />
                </div>
                <div>
                  <CardTitle className="text-sm">{loop.title}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{loop.effect}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {loop.features.map((f) => (
                  <Badge key={f} variant="secondary" className="text-[10px]">{f}</Badge>
                ))}
              </div>
              <div className={`p-3 rounded-lg ${loop.bg} border ${loop.border}`}>
                <p className="text-xs text-muted-foreground">Live Signal</p>
                <p className="text-sm font-semibold mt-0.5">{loop.signal(metrics)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{range.label}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
