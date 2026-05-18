import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package, DollarSign, TrendingUp, Shield, Truck, Fuel, BarChart3, Target
} from "lucide-react";

interface MetricsData {
  costPerDrop: number;
  revenuePerKm: number;
  driverProductivity: number;
  slaCompliance: number;
  fleetROI: number;
  fuelLeakage: number;
  tripProfitability: number;
  totalDrops: number;
}

const DropPerformanceMetrics = ({ data }: { data?: MetricsData }) => {
  const metrics = data || {
    costPerDrop: 3200,
    revenuePerKm: 450,
    driverProductivity: 87,
    slaCompliance: 94,
    fleetROI: 22,
    fuelLeakage: 3.2,
    tripProfitability: 78,
    totalDrops: 1247,
  };

  const items = [
    { label: "Cost/Drop", value: `₦${metrics.costPerDrop.toLocaleString()}`, icon: Package, color: "text-primary bg-primary/10" },
    { label: "Revenue/km", value: `₦${metrics.revenuePerKm.toLocaleString()}`, icon: DollarSign, color: "text-success bg-success/10" },
    { label: "Driver Productivity", value: `${metrics.driverProductivity}%`, icon: Target, color: "text-warning bg-warning/10" },
    { label: "SLA Compliance", value: `${metrics.slaCompliance}%`, icon: Shield, color: metrics.slaCompliance >= 90 ? "text-success bg-success/10" : "text-destructive bg-destructive/10" },
    { label: "Fleet ROI", value: `${metrics.fleetROI}%`, icon: Truck, color: "text-primary bg-primary/10" },
    { label: "Fuel Leakage", value: `${metrics.fuelLeakage}%`, icon: Fuel, color: metrics.fuelLeakage > 5 ? "text-destructive bg-destructive/10" : "text-success bg-success/10" },
    { label: "Trip Profitability", value: `${metrics.tripProfitability}%`, icon: TrendingUp, color: "text-success bg-success/10" },
    { label: "Total Drops", value: metrics.totalDrops.toLocaleString(), icon: BarChart3, color: "text-muted-foreground bg-muted" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Drop Performance Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-muted/30">
              <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center mx-auto mb-2`}>
                <item.icon className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DropPerformanceMetrics;
