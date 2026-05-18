import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const kpiData = [
  { name: "Revenue vs Target", actual: 48.2, target: 55, unit: "₦M", pct: 87.6 },
  { name: "Outlet Coverage", actual: 2847, target: 3200, unit: "outlets", pct: 89.0 },
  { name: "SKU Penetration", actual: 74, target: 85, unit: "%", pct: 87.1 },
  { name: "Fill Rate", actual: 94.2, target: 98, unit: "%", pct: 96.1 },
  { name: "On-Time Delivery", actual: 88, target: 95, unit: "%", pct: 92.6 },
  { name: "Collection Efficiency", actual: 82, target: 90, unit: "%", pct: 91.1 },
];

const regionBreakdown = [
  { region: "Lagos", revenue: "₦18.4M", target: "₦20M", growth: "+18%", health: "good" },
  { region: "Abuja", revenue: "₦8.2M", target: "₦9M", growth: "+12%", health: "good" },
  { region: "Port Harcourt", revenue: "₦5.1M", target: "₦7M", growth: "+4%", health: "at_risk" },
  { region: "Kano", revenue: "₦4.8M", target: "₦6M", growth: "-2%", health: "critical" },
  { region: "Ibadan", revenue: "₦3.6M", target: "₦4.5M", growth: "+8%", health: "fair" },
];

const topSKUs = [
  { name: "Peak Milk 400g", velocity: 12400, revenue: "₦6.2M", trend: "+22%" },
  { name: "Indomie Chicken 70g", velocity: 18200, revenue: "₦4.5M", trend: "+15%" },
  { name: "Coca-Cola 50cl PET", velocity: 9800, revenue: "₦3.8M", trend: "+8%" },
  { name: "Golden Penny Semovita 2kg", velocity: 5400, revenue: "₦3.2M", trend: "+11%" },
  { name: "Dettol Original 200ml", velocity: 4200, revenue: "₦2.1M", trend: "-3%" },
];

const FMCGSalesKPI = () => (
  <FMCGLayout title="Sales KPI Engine" subtitle="Revenue performance, targets & SKU velocity analytics">
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">KPI Overview</TabsTrigger>
        <TabsTrigger value="regions">Regional Breakdown</TabsTrigger>
        <TabsTrigger value="skus">SKU Velocity</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {kpiData.map((kpi) => (
            <Card key={kpi.name}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.name}</p>
                  <Badge variant={kpi.pct >= 95 ? "default" : kpi.pct >= 85 ? "secondary" : "destructive"}>
                    {kpi.pct.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-2xl font-bold">{kpi.actual} <span className="text-sm text-muted-foreground font-normal">/ {kpi.target} {kpi.unit}</span></p>
                <Progress value={kpi.pct} className="h-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="regions">
        <Card>
          <CardHeader><CardTitle>Regional Revenue Performance</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionBreakdown.map((r) => (
                <div key={r.region} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <span className="w-32 font-medium">{r.region}</span>
                  <span className="w-24 text-sm">{r.revenue}</span>
                  <span className="w-24 text-sm text-muted-foreground">Target: {r.target}</span>
                  <span className={`w-16 text-sm font-medium ${r.growth.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{r.growth}</span>
                  <Badge variant={r.health === "good" ? "default" : r.health === "critical" ? "destructive" : "secondary"}>{r.health}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="skus">
        <Card>
          <CardHeader><CardTitle>Top SKU Velocity</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSKUs.map((sku, i) => (
                <div key={sku.name} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <span className="text-sm font-medium text-muted-foreground w-8">#{i + 1}</span>
                  <span className="flex-1 font-medium">{sku.name}</span>
                  <span className="text-sm w-28">{sku.velocity.toLocaleString()} units</span>
                  <span className="text-sm font-semibold w-20">{sku.revenue}</span>
                  <span className={`text-sm w-12 ${sku.trend.startsWith("+") ? "text-green-600" : "text-red-600"}`}>{sku.trend}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </FMCGLayout>
);

export default FMCGSalesKPI;
