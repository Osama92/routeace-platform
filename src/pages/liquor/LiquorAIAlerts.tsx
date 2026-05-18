import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, TrendingUp, MapPin, Package, ShieldAlert, Flame, Clock } from "lucide-react";

type AlertType = "stockout" | "expansion" | "trend" | "credit" | "promotion";

const alerts: { type: AlertType; title: string; message: string; time: string; severity: "critical" | "high" | "medium" | "info" }[] = [
  { type: "stockout", title: "Stockout Risk - Bar Central Lagos", message: "Tequila inventory predicted to deplete in 3 days. Current stock: 6 bottles. Weekly velocity: 14 bottles. Recommend immediate reorder of 24 units.", time: "12 min ago", severity: "critical" },
  { type: "expansion", title: "Expansion Opportunity - Abuja", message: "High demand for craft beer detected in Abuja CBD. 12 bars requesting stock. No distributor presence in segment. Estimated ₦1.4M monthly opportunity.", time: "1 hr ago", severity: "high" },
  { type: "trend", title: "Brand Surge - Premium Whiskey", message: "Premium whiskey demand growing 28% in nightlife venues across Lagos and PH. Hennessy VS leading at 34% growth. Consider increasing allocation.", time: "2 hrs ago", severity: "medium" },
  { type: "credit", title: "Credit Risk Alert - Nite Owl Ibadan", message: "Payment behavior deteriorating. 4 late payments in 60 days. Credit utilization at 84%. Risk score increased to 82/100. Recommend credit review.", time: "3 hrs ago", severity: "critical" },
  { type: "promotion", title: "Campaign Opportunity - Aperol", message: "Aperol organic demand growing 52% without active promotion. AI predicts 4.2x ROI for a Lagos nightlife campaign targeting 160 venues.", time: "4 hrs ago", severity: "info" },
  { type: "stockout", title: "Low Inventory - Ocean Bar PH", message: "Smirnoff Vodka 1L at 2 days of stock. Auto-reorder recommendation triggered for 30 units.", time: "5 hrs ago", severity: "critical" },
  { type: "trend", title: "Emerging Category - Aperitifs", message: "Aperitif category growing 48% across restaurant segment. 28 new outlets added the category this month.", time: "6 hrs ago", severity: "medium" },
  { type: "expansion", title: "Territory Gap - Enugu", message: "42 unserved retailers identified in Enugu metropolitan area. Nearest distributor is 180km away. Revenue potential: ₦3.8M/month.", time: "8 hrs ago", severity: "high" },
];

const iconMap: Record<AlertType, React.ComponentType<{ className?: string }>> = {
  stockout: Package,
  expansion: MapPin,
  trend: Flame,
  credit: ShieldAlert,
  promotion: TrendingUp,
};

const severityColor = {
  critical: "border-red-500/30 bg-red-500/5",
  high: "border-orange-500/30 bg-orange-500/5",
  medium: "border-yellow-500/30 bg-yellow-500/5",
  info: "border-blue-500/30 bg-blue-500/5",
};

const LiquorAIAlerts = () => (
  <IndustryLayout industryCode="liquor">
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-6 h-6 text-primary" /> Intelligence Alerts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">AI-generated alerts from the Network Intelligence Brain</p>
        </div>
        <div className="flex gap-2">
          <Badge variant="destructive">{alerts.filter(a => a.severity === "critical").length} Critical</Badge>
          <Badge variant="secondary">{alerts.filter(a => a.severity === "high").length} High</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["stockout", "expansion", "trend", "credit", "promotion"] as AlertType[]).map((type) => {
          const Icon = iconMap[type];
          const count = alerts.filter(a => a.type === type).length;
          return (
            <Card key={type}>
              <CardContent className="p-3 flex items-center gap-3">
                <Icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-lg font-bold text-foreground">{count}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{type}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Alert Feed</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((a, i) => {
              const Icon = iconMap[a.type];
              return (
                <div key={i} className={`p-4 rounded-lg border ${severityColor[a.severity]}`}>
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm text-foreground">{a.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "high" ? "secondary" : "outline"} className="text-[10px]">{a.severity}</Badge>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{a.time}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{a.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  </IndustryLayout>
);

export default LiquorAIAlerts;
