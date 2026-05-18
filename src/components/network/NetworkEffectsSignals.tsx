import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Truck, ShoppingCart, Brain, DollarSign, Users, Activity } from "lucide-react";
import type { NetworkMetrics } from "@/pages/NetworkEffects";

const fmt = (v: number) => {
  if (v >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
  return `₦${v.toFixed(0)}`;
};

interface Props {
  metrics: NetworkMetrics;
  range: { label: string };
}

export default function NetworkEffectsSignals({ metrics, range }: Props) {
  const signals = [
    {
      icon: Truck,
      label: "Supply Density",
      value: `${metrics.totalFleets} vehicles × ${metrics.activeDrivers} drivers`,
      insight: "More supply → faster dispatch matching",
    },
    {
      icon: ShoppingCart,
      label: "Demand Intensity",
      value: `${metrics.totalDispatches} dispatches (${range.label})`,
      insight: "Higher demand → fleet utilization ↑",
    },
    {
      icon: Brain,
      label: "Data Advantage",
      value: `${metrics.aiPredictions} AI inferences`,
      insight: "More data → smarter routing & pricing",
    },
    {
      icon: DollarSign,
      label: "Financial Gravity",
      value: `${fmt(metrics.totalInvoiceVolume)} transacted`,
      insight: "Transaction volume → unlocks financing",
    },
    {
      icon: Users,
      label: "Network Density",
      value: `${metrics.totalCustomers} customers, ${metrics.totalPartners} partners`,
      insight: "More participants → stronger ecosystem gravity",
    },
    {
      icon: Activity,
      label: "Platform Velocity",
      value: `${metrics.totalOrders} orders this period`,
      insight: "Order velocity drives all four loops",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Network Growth Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {signals.map((s) => (
            <div key={s.label} className="p-4 rounded-lg border space-y-1">
              <div className="flex items-center gap-2">
                <s.icon className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
              <p className="text-lg font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.insight}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
