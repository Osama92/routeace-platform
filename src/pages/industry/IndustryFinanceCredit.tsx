import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Receipt, DollarSign, AlertTriangle, CheckCircle, Brain, TrendingUp } from "lucide-react";

const IndustryFinanceCredit = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const creditAccounts = [
    { outlet: "Mainland Grocers", limit: "₦500K", utilized: 320000, utilPct: 64, riskScore: 22, paymentDays: 12 },
    { outlet: "Premium Outlet", limit: "₦1.2M", utilized: 180000, utilPct: 15, riskScore: 8, paymentDays: 5 },
    { outlet: "Quick Mart", limit: "₦200K", utilized: 195000, utilPct: 97, riskScore: 78, paymentDays: 28 },
    { outlet: "Wholesale Hub", limit: "₦800K", utilized: 450000, utilPct: 56, riskScore: 41, paymentDays: 18 },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Finance & Credit Engine</h1>
            <p className="text-sm text-muted-foreground">{config.terminology.outlet} credit management & reconciliation</p>
          </div>
        </div>

        <Tabs defaultValue="credit" className="space-y-4">
          <TabsList>
            <TabsTrigger value="credit">{config.terminology.outlet} Credit</TabsTrigger>
            <TabsTrigger value="kpis">Financial KPIs</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="credit" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-5 text-center">
                <DollarSign className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="text-2xl font-bold">₦2.7M</p>
                <p className="text-xs text-muted-foreground">Total Credit Limit</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <CreditCard className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p className="text-2xl font-bold">₦1.1M</p>
                <p className="text-xs text-muted-foreground">Total Utilized</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
                <p className="text-2xl font-bold">1</p>
                <p className="text-xs text-muted-foreground">High Risk</p>
              </CardContent></Card>
              <Card><CardContent className="pt-5 text-center">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
                <p className="text-2xl font-bold">87%</p>
                <p className="text-xs text-muted-foreground">Collection Rate</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle>{config.terminology.outlet} Credit Accounts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {creditAccounts.map((c) => (
                  <div key={c.outlet} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold text-sm">{c.outlet}</p>
                      <Badge variant={c.riskScore > 60 ? "destructive" : c.riskScore > 30 ? "secondary" : "outline"} className="text-xs">
                        Risk: {c.riskScore}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div><span className="text-muted-foreground">Limit:</span> <span className="font-medium">{c.limit}</span></div>
                      <div>
                        <span className="text-muted-foreground">Utilized:</span>
                        <Progress value={c.utilPct} className="h-1.5 mt-1" />
                        <span className="font-medium">{c.utilPct}%</span>
                      </div>
                      <div><span className="text-muted-foreground">Avg Payment:</span> <span className="font-medium">{c.paymentDays} days</span></div>
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        <span className="italic">{c.riskScore > 60 ? "Recommend: reduce limit" : c.riskScore > 30 ? "Monitor closely" : "Healthy account"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="kpis">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "AR Turnover", value: "8.2x", desc: "Net Credit Sales / Avg AR" },
                { label: "Credit Risk Score", value: "34", desc: "Portfolio-weighted risk" },
                { label: "Collection Efficiency", value: "87%", desc: "Collected / Due" },
                { label: "DSO", value: "14 days", desc: "Days Sales Outstanding" },
                { label: "Bad Debt Rate", value: "2.1%", desc: "Written-off / Total Credit" },
                { label: "Credit Utilization", value: "42%", desc: "Used / Available" },
              ].map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-5">
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="font-medium text-sm mt-1">{kpi.label}</p>
                    <p className="text-xs text-muted-foreground">{kpi.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reconciliation">
            <Card className="border-dashed border-2">
              <CardContent className="py-12 text-center">
                <Receipt className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <h3 className="text-lg font-semibold mb-2">Automated Reconciliation</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Payment matching, distributor ledger sync, and VAT calculations run automatically. Connect your payment gateway to enable real-time reconciliation.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </IndustryLayout>
  );
};

export default IndustryFinanceCredit;
