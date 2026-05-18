import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Star, CreditCard, TrendingUp, AlertTriangle, Brain } from "lucide-react";

const IndustryOutletManagement = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const outlets = [
    { name: "Mainland Grocers", location: "Lagos Mainland", creditScore: 88, growthScore: 76, churnRisk: 12, lastOrder: "2 days ago", totalRevenue: "₦1.2M" },
    { name: "Central Pharmacy", location: "Ikeja", creditScore: 72, growthScore: 84, churnRisk: 8, lastOrder: "Today", totalRevenue: "₦890K" },
    { name: "Quick Mart", location: "Victoria Island", creditScore: 45, growthScore: 32, churnRisk: 68, lastOrder: "21 days ago", totalRevenue: "₦340K" },
    { name: "Premium Outlet", location: "Lekki Phase 1", creditScore: 91, growthScore: 89, churnRisk: 5, lastOrder: "Yesterday", totalRevenue: "₦2.1M" },
    { name: "Wholesale Hub", location: "Oshodi", creditScore: 65, growthScore: 54, churnRisk: 34, lastOrder: "8 days ago", totalRevenue: "₦670K" },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold">{config.terminology.outlet} Management</h1>
              <p className="text-sm text-muted-foreground">{outlets.length} active {config.terminology.outlet.toLowerCase()}s</p>
            </div>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={`Search ${config.terminology.outlet.toLowerCase()}s...`} className="pl-10" />
          </div>
        </div>

        {/* AI Scores Summary */}
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-5 text-center">
            <Brain className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-2xl font-bold">72</p>
            <p className="text-xs text-muted-foreground">Avg Credit Score</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">67</p>
            <p className="text-xs text-muted-foreground">Avg Growth Score</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">High Churn Risk</p>
          </CardContent></Card>
        </div>

        {/* Outlet Cards */}
        <div className="space-y-3">
          {outlets.map((o) => (
            <Card key={o.name} className="hover:border-primary/30 transition-colors cursor-pointer">
              <CardContent className="py-4">
                <div className="flex items-center gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-sm">{o.name}</p>
                      <Badge variant="outline" className="text-xs">{o.location}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Last {config.terminology.order.toLowerCase()}: {o.lastOrder} · Revenue: {o.totalRevenue}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <CreditCard className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Credit</span>
                      </div>
                      <Progress value={o.creditScore} className="h-1.5 w-16" />
                      <p className="text-xs font-medium mt-0.5">{o.creditScore}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Star className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Growth</span>
                      </div>
                      <Progress value={o.growthScore} className="h-1.5 w-16" />
                      <p className="text-xs font-medium mt-0.5">{o.growthScore}</p>
                    </div>
                    <Badge variant={o.churnRisk > 50 ? "destructive" : o.churnRisk > 25 ? "secondary" : "outline"} className="text-xs">
                      {o.churnRisk}% churn
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </IndustryLayout>
  );
};

export default IndustryOutletManagement;
