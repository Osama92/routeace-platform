import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Package, Users, MapPin,
  AlertTriangle, Brain, ShieldAlert, DollarSign, Activity, Target, Zap,
} from "lucide-react";

const IndustryDashboard = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");
  const Icon = config.icon;

  const kpis = [
    { label: "Revenue MTD", value: "₦14.2M", change: 12.4, icon: DollarSign, color: "text-emerald-500" },
    { label: `${config.terminology.order}s Today`, value: "342", change: 8.1, icon: Package, color: "text-blue-500" },
    { label: `Active ${config.terminology.agent}s`, value: "48", change: -2.3, icon: Users, color: "text-violet-500" },
    { label: `${config.terminology.outlet}s Covered`, value: "1,284", change: 5.6, icon: MapPin, color: "text-amber-500" },
    { label: "Stock Health", value: "87%", change: 3.2, icon: Activity, color: "text-teal-500" },
    { label: "Credit Exposure", value: "₦2.1M", change: -4.5, icon: ShieldAlert, color: "text-rose-500" },
    { label: "Route Efficiency", value: "91%", change: 1.8, icon: Target, color: "text-indigo-500" },
    { label: "Margin Protection", value: "94%", change: 0.5, icon: Zap, color: "text-orange-500" },
  ];

  const aiInsights = [
    { title: "Top Territory", detail: "Lagos Island - ₦3.2M revenue, 23% above target", type: "success" as const },
    { title: `Slow ${config.terminology.product}s`, detail: `3 ${config.terminology.product.toLowerCase()}s below velocity threshold this week`, type: "warning" as const },
    { title: "Distributor Risk", detail: "Mainland Dist. - 12-day payment delay pattern detected", type: "danger" as const },
    { title: `${config.terminology.outlet} Churn`, detail: `7 ${config.terminology.outlet.toLowerCase()}s predicted to churn within 30 days`, type: "warning" as const },
  ];

  const typeColors = { success: "border-emerald-500/30 bg-emerald-500/5", warning: "border-amber-500/30 bg-amber-500/5", danger: "border-destructive/30 bg-destructive/5" };
  const typeIcons = { success: TrendingUp, warning: AlertTriangle, danger: ShieldAlert };

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}
          >
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">{config.displayName}</h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
          <Badge className="ml-auto" style={{ backgroundColor: `hsl(${config.colorPrimary} / 0.15)`, color: `hsl(${config.colorPrimary})` }}>
            Live
          </Badge>
        </div>

        {/* Executive KPIs - 8 cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="border-border/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                  <span className={`text-xs font-medium ${kpi.change > 0 ? "text-emerald-500" : kpi.change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {kpi.change > 0 ? "+" : ""}{kpi.change}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* AI Insights Panel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: `hsl(${config.colorPrimary})` }} />
              AI Intelligence Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiInsights.map((insight) => {
                const InsightIcon = typeIcons[insight.type];
                return (
                  <div key={insight.title} className={`p-4 rounded-xl border ${typeColors[insight.type]}`}>
                    <div className="flex items-start gap-3">
                      <InsightIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-sm text-foreground">{insight.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{insight.detail}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Industry KPIs + Distributor Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Industry KPIs - {config.name}</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {config.kpiCategories.map((kpi) => (
                  <div key={kpi} className="p-4 rounded-xl bg-muted/30 border border-border/30">
                    <p className="text-lg font-bold text-foreground">-</p>
                    <p className="text-xs text-muted-foreground mt-1">{kpi}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distributor Performance</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Alpha Distribution", score: 87, revenue: "₦4.2M" },
                { name: "Metro Logistics", score: 74, revenue: "₦2.8M" },
                { name: "National Supply Co.", score: 62, revenue: "₦1.9M" },
              ].map((d) => (
                <div key={d.name} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">{d.revenue}</span>
                    </div>
                    <Progress value={d.score} className="h-2" />
                  </div>
                  <Badge variant={d.score > 80 ? "default" : d.score > 70 ? "secondary" : "destructive"} className="text-xs">
                    {d.score}%
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </IndustryLayout>
  );
};

export default IndustryDashboard;
