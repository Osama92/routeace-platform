import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, ShieldCheck, MapPin, Package, CreditCard, AlertTriangle, Brain } from "lucide-react";

const IndustryDistributorIndex = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const distributors = [
    { name: "Alpha Distribution Ltd", salesGrowth: 18, stockHealth: 92, collectionEff: 94, coverage: 87, overallScore: 91, risk: "low" },
    { name: "Metro Logistics & Supply", salesGrowth: 12, stockHealth: 78, collectionEff: 82, coverage: 74, overallScore: 76, risk: "medium" },
    { name: "National Supply Co.", salesGrowth: -3, stockHealth: 65, collectionEff: 71, coverage: 62, overallScore: 58, risk: "high" },
    { name: "Mainland FMCG Partners", salesGrowth: 24, stockHealth: 88, collectionEff: 89, coverage: 81, overallScore: 85, risk: "low" },
  ];

  const marginAlerts = [
    { distributor: "National Supply Co.", issue: "Discount abuse detected - 14% above authorized discount", severity: "high" },
    { distributor: "Metro Logistics", issue: "Price violation: 3 SKUs sold below floor price", severity: "medium" },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Distributor Index</h1>
            <p className="text-sm text-muted-foreground">Performance benchmarking & margin protection</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Distributor Performance Ranking</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {distributors.map((d, i) => (
              <div key={d.name} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                    <div>
                      <p className="font-semibold text-sm">{d.name}</p>
                      <Badge variant={d.risk === "low" ? "outline" : d.risk === "medium" ? "secondary" : "destructive"} className="text-xs capitalize mt-0.5">{d.risk} risk</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: `hsl(${config.colorPrimary})` }}>{d.overallScore}</p>
                    <p className="text-xs text-muted-foreground">Overall Score</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Sales Growth", value: d.salesGrowth, icon: TrendingUp, suffix: "%" },
                    { label: "Stock Health", value: d.stockHealth, icon: Package, suffix: "%" },
                    { label: "Collection Eff.", value: d.collectionEff, icon: CreditCard, suffix: "%" },
                    { label: "Coverage", value: d.coverage, icon: MapPin, suffix: "%" },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex items-center gap-1 mb-1">
                        <m.icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{m.label}</span>
                      </div>
                      <Progress value={Math.max(0, m.value)} className="h-1.5" />
                      <span className="text-xs font-medium">{m.value > 0 ? "+" : ""}{m.value}{m.suffix}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Margin Protection Alerts</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {marginAlerts.map((a) => (
              <div key={a.distributor} className={`p-4 rounded-xl border ${a.severity === "high" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{a.distributor}</p>
                    <p className="text-xs text-muted-foreground">{a.issue}</p>
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

export default IndustryDistributorIndex;
