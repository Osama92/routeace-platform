import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, MapPin, Users, TrendingUp, Eye } from "lucide-react";

const territories = [
  { name: "Lagos Island", reps: 12, outlets: 340, coverage: 92, revenue: "₦14.2M" },
  { name: "Lagos Mainland", reps: 15, outlets: 480, coverage: 87, revenue: "₦18.6M" },
  { name: "Abuja", reps: 8, outlets: 220, coverage: 95, revenue: "₦9.8M" },
  { name: "Port Harcourt", reps: 6, outlets: 180, coverage: 78, revenue: "₦6.4M" },
  { name: "Kano", reps: 5, outlets: 150, coverage: 82, revenue: "₦5.1M" },
];

const SalesIntelligence = () => {
  return (
    <FMCGLayout title="Sales Intelligence" subtitle="AI-powered field sales visibility & optimization">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Outlets", value: "2,847", icon: MapPin },
          { label: "Active Reps", value: "89", icon: Users },
          { label: "Avg Visits/Day", value: "14.2", icon: Eye },
          { label: "Order Conversion", value: "73%", icon: Target },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="territories">
        <TabsList>
          <TabsTrigger value="territories">Territory Heat Map</TabsTrigger>
          <TabsTrigger value="outlet-health">Outlet Health</TabsTrigger>
          <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="territories">
          <Card>
            <CardHeader><CardTitle>Territory Performance</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {territories.map((t) => (
                  <div key={t.name} className="flex items-center gap-4 py-3 border-b last:border-0">
                    <div className="w-40 font-medium">{t.name}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">Coverage</span>
                        <span className="text-xs font-medium">{t.coverage}%</span>
                      </div>
                      <Progress value={t.coverage} className="h-2" />
                    </div>
                    <div className="text-sm">{t.reps} reps</div>
                    <div className="text-sm">{t.outlets} outlets</div>
                    <div className="text-sm font-bold text-green-600">{t.revenue}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outlet-health">
          <Card>
            <CardHeader><CardTitle>Outlet Segmentation</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { tier: "Platinum", count: 142, color: "bg-violet-100 text-violet-700" },
                  { tier: "Gold", count: 487, color: "bg-yellow-100 text-yellow-700" },
                  { tier: "Silver", count: 1204, color: "bg-gray-100 text-gray-700" },
                  { tier: "Bronze", count: 1014, color: "bg-orange-100 text-orange-700" },
                ].map((s) => (
                  <Card key={s.tier}>
                    <CardContent className="pt-6 text-center">
                      <Badge className={s.color}>{s.tier}</Badge>
                      <p className="text-3xl font-bold mt-2">{s.count}</p>
                      <p className="text-xs text-muted-foreground">outlets</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-insights">
          <Card>
            <CardHeader><CardTitle>AI-Powered Insights</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { insight: "23 outlets show high churn probability (>70%). Recommend priority visits within 48 hours.", priority: "critical" },
                  { insight: "SKU 'Indomie Chicken 70g' velocity increased 34% in Kano region. Consider stock rebalancing.", priority: "high" },
                  { insight: "Territory Lagos Mainland has 13% missed visit rate. Beat plan optimization recommended.", priority: "medium" },
                  { insight: "Competitor price drop detected on 'Peak Milk 400g' in PH. Margin impact: -2.1%.", priority: "high" },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 p-4 rounded-lg border">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${item.priority === "critical" ? "bg-red-500" : item.priority === "high" ? "bg-orange-500" : "bg-yellow-500"}`} />
                    <div>
                      <p className="text-sm">{item.insight}</p>
                      <Badge variant="outline" className="mt-2 text-xs">{item.priority}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default SalesIntelligence;
