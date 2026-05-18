import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, Store, CreditCard, Brain, Users, BarChart3, Package, Network } from "lucide-react";
import type { NetworkMetrics } from "@/pages/NetworkEffects";

const fmt = (v: number) => {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
  return `₦${v.toFixed(0)}`;
};

export default function NetworkEffectsKPIs({ metrics }: { metrics: NetworkMetrics }) {
  const kpis = [
    { label: "Fleet Vehicles", value: metrics.totalFleets, icon: Truck },
    { label: "Dispatches", value: metrics.totalDispatches, icon: BarChart3 },
    { label: "Active Customers", value: metrics.totalCustomers, icon: Store },
    { label: "Transaction Volume", value: fmt(metrics.totalInvoiceVolume), icon: CreditCard },
    { label: "Active Drivers", value: metrics.activeDrivers, icon: Users },
    { label: "Orders", value: metrics.totalOrders, icon: Package },
    { label: "Partners", value: metrics.totalPartners, icon: Network },
    { label: "AI Inferences", value: metrics.aiPredictions, icon: Brain },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
      {kpis.map((k, i) => (
        <motion.div key={k.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
          <Card>
            <CardContent className="p-3 text-center">
              <k.icon className="w-4 h-4 mx-auto mb-1.5 text-primary" />
              <p className="text-lg font-bold">{k.value}</p>
              <p className="text-[10px] text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
