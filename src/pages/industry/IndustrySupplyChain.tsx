import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Warehouse, RefreshCw, Brain, AlertTriangle, TrendingUp, Clock } from "lucide-react";

const IndustrySupplyChain = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const stockLevels = [
    { location: "Central Warehouse", type: "warehouse", health: 92, turnover: 8.2, aging: "3 days", utilization: 78 },
    { location: "Alpha Distribution", type: "distributor", health: 74, turnover: 6.1, aging: "7 days", utilization: 65 },
    { location: "Metro Logistics", type: "distributor", health: 68, turnover: 5.4, aging: "12 days", utilization: 82 },
    { location: "Retail Aggregate", type: "retail", health: 56, turnover: 4.2, aging: "5 days", utilization: 45 },
  ];

  const aiForecast = [
    { product: `${config.terminology.product} A-001`, currentStock: 2400, forecastDemand: 3100, restockDate: "3 days", action: "Auto-replenish triggered" },
    { product: `${config.terminology.product} B-045`, currentStock: 1800, forecastDemand: 1600, restockDate: "-", action: "Sufficient stock" },
    { product: `${config.terminology.product} C-012`, currentStock: 200, forecastDemand: 900, restockDate: "Urgent", action: "Critical: PO recommended" },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Supply Chain Intelligence</h1>
            <p className="text-sm text-muted-foreground">Inventory tracking across warehouse → distributor → {config.terminology.outlet.toLowerCase()}</p>
          </div>
        </div>

        <Tabs defaultValue="health" className="space-y-4">
          <TabsList>
            <TabsTrigger value="health">Stock Health</TabsTrigger>
            <TabsTrigger value="forecast">AI Forecasting</TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-5 text-center">
                <Warehouse className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">78%</p>
                <p className="text-xs text-muted-foreground">Warehouse Util.</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <RefreshCw className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-2xl font-bold">6.0x</p>
                <p className="text-xs text-muted-foreground">Avg Turnover</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-2xl font-bold">6.8 days</p>
                <p className="text-xs text-muted-foreground">Avg Stock Age</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold">2</p>
                <p className="text-xs text-muted-foreground">Stock-Out Alerts</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>Stock Health by Location</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {stockLevels.map((s) => (
                  <div key={s.location} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{s.location}</p>
                        <Badge variant="outline" className="text-xs capitalize">{s.type}</Badge>
                      </div>
                      <Badge variant={s.health > 80 ? "default" : s.health > 60 ? "secondary" : "destructive"} className="text-xs">{s.health}% health</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Turnover:</span>
                        <span className="font-medium ml-1">{s.turnover}x</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aging:</span>
                        <span className="font-medium ml-1">{s.aging}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Utilization:</span>
                        <Progress value={s.utilization} className="h-1.5 inline-block w-16 align-middle mx-1" />
                        <span className="font-medium">{s.utilization}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="forecast">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Brain className="w-4 h-4" /> AI Demand Forecasting & Auto-Replenishment</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {aiForecast.map((f) => (
                  <div key={f.product} className={`p-4 rounded-xl border ${f.restockDate === "Urgent" ? "border-destructive/30 bg-destructive/5" : "border-border/40 bg-muted/10"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{f.product}</p>
                      <Badge variant={f.restockDate === "Urgent" ? "destructive" : f.restockDate === "-" ? "outline" : "secondary"} className="text-xs">
                        {f.restockDate === "-" ? "OK" : `Restock: ${f.restockDate}`}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div><span className="text-muted-foreground">Current:</span> <span className="font-medium">{f.currentStock.toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Forecast:</span> <span className="font-medium">{f.forecastDemand.toLocaleString()}</span></div>
                      <div className="flex items-center gap-1"><Brain className="w-3 h-3" /> <span className="italic">{f.action}</span></div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </IndustryLayout>
  );
};

export default IndustrySupplyChain;
