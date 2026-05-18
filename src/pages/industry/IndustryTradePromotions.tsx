import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Percent, Gift, Users, Brain, DollarSign, Target } from "lucide-react";

const IndustryTradePromotions = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const promotions = [
    { name: "Buy 10 Get 1 Free", type: "Bundle", status: "active", participation: 72, roi: 3.2, uplift: 28, budget: "₦1.2M", spent: "₦890K" },
    { name: "Display Incentive Q1", type: "Display", status: "active", participation: 45, roi: 2.1, uplift: 15, budget: "₦500K", spent: "₦320K" },
    { name: "Volume Rebate Program", type: "Rebate", status: "ended", participation: 88, roi: 4.5, uplift: 34, budget: "₦2M", spent: "₦2M" },
    { name: `${config.terminology.agent} Bonus Sprint`, type: "Incentive", status: "active", participation: 92, roi: 5.1, uplift: 42, budget: "₦800K", spent: "₦600K" },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Trade Promotions</h1>
            <p className="text-sm text-muted-foreground">Campaign management & ROI intelligence</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 text-center">
            <Target className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">{promotions.filter(p => p.status === "active").length}</p>
            <p className="text-xs text-muted-foreground">Active Campaigns</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">3.7x</p>
            <p className="text-xs text-muted-foreground">Avg ROI</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 text-violet-500" />
            <p className="text-2xl font-bold">74%</p>
            <p className="text-xs text-muted-foreground">Avg Participation</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <DollarSign className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">₦4.5M</p>
            <p className="text-xs text-muted-foreground">Total Budget</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Promotions</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {promotions.map((p) => (
              <div key={p.name} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <Badge variant="outline" className="text-xs">{p.type}</Badge>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{p.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Brain className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-bold">{p.roi}x ROI</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">{config.terminology.outlet} Participation</span>
                    <Progress value={p.participation} className="h-1.5 mt-1" />
                    <span className="font-medium">{p.participation}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sales Uplift</span>
                    <p className="text-lg font-bold text-emerald-500">+{p.uplift}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Budget</span>
                    <p className="font-medium">{p.budget}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Spent</span>
                    <p className="font-medium">{p.spent}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
};

export default IndustryTradePromotions;
