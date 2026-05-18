import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldAlert, TrendingDown, Activity, Globe, AlertTriangle,
  RefreshCw, BarChart3, Landmark, DollarSign, MapPin
} from "lucide-react";

interface RiskScore {
  id: string;
  assessment_date: string;
  overall_risk_score: number;
  liquidity_coverage_ratio: number;
  debt_service_coverage_ratio: number;
  fx_exposure_percent: number;
  revenue_concentration_ratio: number;
  default_probability_percent: number;
  cash_runway_months: number;
  risk_category: string;
  liquidity_risk_score: number;
  fx_risk_score: number;
  counterparty_risk_score: number;
  corridor_risk_score: number;
  mitigation_suggestions: string[];
}

const riskColor = (score: number) => {
  if (score <= 25) return "text-green-500";
  if (score <= 50) return "text-yellow-500";
  if (score <= 75) return "text-orange-500";
  return "text-destructive";
};

const riskBadgeVariant = (cat: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (cat) {
    case "Low": return "default";
    case "Moderate": return "secondary";
    case "High": return "destructive";
    case "Critical": return "destructive";
    default: return "outline";
  }
};

const TreasuryRiskEngine = () => {
  const [scores, setScores] = useState<RiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const { user, organizationId } = useAuth();

  const fetchScores = useCallback(async () => {
    if (!organizationId) { setLoading(false); return; }
    const { data } = await supabase
      .from("treasury_risk_scores")
      .select("*")
      .eq("organization_id", organizationId)
      .order("assessment_date", { ascending: false })
      .limit(30);
    setScores((data as RiskScore[]) || []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { fetchScores(); }, [fetchScores]);

  const generateRiskAssessment = async () => {
    if (!organizationId) { toast({ title: "No organization", variant: "destructive" }); return; }
    setGenerating(true);
    try {
      const orgEq = (q: any) => q.eq("organization_id", organizationId);
      // Gather inputs from AR, AP, cash, loans (org-scoped)
      const [arRes, apRes, cashRes, loansRes, invoicesRes] = await Promise.all([
        orgEq(supabase.from("accounts_receivable").select("amount_due, balance, status, due_date")),
        orgEq(supabase.from("accounts_payable").select("amount_due, balance, status, due_date")),
        orgEq(supabase.from("accounting_ledger").select("debit, credit, account_name").eq("account_type", "asset").in("account_name", ["cash", "bank"])),
        orgEq(supabase.from("capital_funding").select("amount, total_repaid, status").eq("status", "active")),
        orgEq(supabase.from("invoices").select("total_amount, status, customer_id")),
      ]);

      const arData = arRes.data || [];
      const apData = apRes.data || [];
      const cashData = cashRes.data || [];
      const loansData = loansRes.data || [];
      const invoicesData = invoicesRes.data || [];

      // Calculate metrics
      const totalAR = arData.reduce((s, r) => s + (r.balance || 0), 0);
      const totalAP = apData.reduce((s, r) => s + (r.balance || 0), 0);
      const totalCash = cashData.reduce((s, r) => s + (r.debit || 0) - (r.credit || 0), 0);
      const totalDebt = loansData.reduce((s, r) => s + (r.amount || 0) - (r.total_repaid || 0), 0);
      const totalRevenue = invoicesData.reduce((s, r) => s + (r.total_amount || 0), 0);
      const monthlyBurn = totalAP > 0 ? totalAP : 1;

      // LCR = liquid assets / net outflows
      const lcr = monthlyBurn > 0 ? totalCash / monthlyBurn : 999;
      // DSCR = operating income / debt service
      const dscr = totalDebt > 0 ? totalRevenue / totalDebt : 999;
      // FX exposure (simplified - 0 for NGN-only)
      const fxExposure = 0;
      // Revenue concentration
      const customerCounts: Record<string, number> = {};
      invoicesData.forEach(inv => {
        if (inv.customer_id) customerCounts[inv.customer_id] = (customerCounts[inv.customer_id] || 0) + (inv.total_amount || 0);
      });
      const topCustomerRevenue = Math.max(...Object.values(customerCounts), 0);
      const concentrationRatio = totalRevenue > 0 ? (topCustomerRevenue / totalRevenue) * 100 : 0;
      // Cash runway
      const cashRunway = monthlyBurn > 0 ? totalCash / monthlyBurn : 99;
      // Default probability
      const overdueAR = arData.filter(r => r.status === "overdue").reduce((s, r) => s + (r.balance || 0), 0);
      const defaultProb = totalAR > 0 ? (overdueAR / totalAR) * 100 : 0;

      // Score components
      const liquidityScore = lcr >= 1.5 ? 15 : lcr >= 1 ? 35 : lcr >= 0.5 ? 65 : 90;
      const fxScore = fxExposure > 30 ? 80 : fxExposure > 15 ? 50 : 10;
      const counterpartyScore = defaultProb > 30 ? 85 : defaultProb > 15 ? 55 : defaultProb > 5 ? 30 : 10;
      const corridorScore = concentrationRatio > 60 ? 75 : concentrationRatio > 40 ? 50 : 20;
      const overall = Math.round((liquidityScore * 0.35) + (fxScore * 0.15) + (counterpartyScore * 0.3) + (corridorScore * 0.2));
      const category = overall <= 25 ? "Low" : overall <= 50 ? "Moderate" : overall <= 75 ? "High" : "Critical";

      // Mitigation suggestions
      const suggestions: string[] = [];
      if (liquidityScore > 50) suggestions.push("Accelerate AR collections to improve cash position");
      if (concentrationRatio > 40) suggestions.push("Diversify customer base to reduce revenue concentration risk");
      if (defaultProb > 10) suggestions.push("Review credit terms for high-risk customers with overdue balances");
      if (cashRunway < 3) suggestions.push("URGENT: Cash runway below 3 months - consider credit facility or equity injection");
      if (lcr < 1) suggestions.push("Liquidity Coverage Ratio below 1.0 - restructure short-term obligations");
      if (suggestions.length === 0) suggestions.push("Treasury health is strong. Maintain current cash management practices.");

      const { error } = await supabase.from("treasury_risk_scores").insert({
        assessment_date: new Date().toISOString().split("T")[0],
        overall_risk_score: overall,
        liquidity_coverage_ratio: Math.round(lcr * 100) / 100,
        debt_service_coverage_ratio: Math.round(dscr * 100) / 100,
        fx_exposure_percent: fxExposure,
        revenue_concentration_ratio: Math.round(concentrationRatio * 100) / 100,
        default_probability_percent: Math.round(defaultProb * 100) / 100,
        cash_runway_months: Math.round(cashRunway * 100) / 100,
        risk_category: category,
        liquidity_risk_score: liquidityScore,
        fx_risk_score: fxScore,
        counterparty_risk_score: counterpartyScore,
        corridor_risk_score: corridorScore,
        mitigation_suggestions: suggestions,
        data_inputs: { totalAR, totalAP, totalCash, totalDebt, totalRevenue, overdueAR },
        created_by: user?.id,
      } as never);

      if (error) throw error;
      toast({ title: "Assessment Complete", description: `Treasury Risk Score: ${overall}/100 (${category})` });
      fetchScores();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const latest = scores[0];

  return (
    <DashboardLayout title="Treasury Risk AI Engine" subtitle="Predictive treasury risk scoring and mitigation">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "Risk Score", value: latest?.overall_risk_score ?? "-", icon: ShieldAlert, color: latest ? riskColor(latest.overall_risk_score) : "" },
          { label: "LCR", value: latest?.liquidity_coverage_ratio?.toFixed(2) ?? "-", icon: Activity },
          { label: "DSCR", value: latest?.debt_service_coverage_ratio?.toFixed(2) ?? "-", icon: Landmark },
          { label: "FX Exposure", value: `${latest?.fx_exposure_percent?.toFixed(1) ?? 0}%`, icon: Globe },
          { label: "Default Prob", value: `${latest?.default_probability_percent?.toFixed(1) ?? 0}%`, icon: AlertTriangle },
          { label: "Cash Runway", value: `${latest?.cash_runway_months?.toFixed(1) ?? 0}mo`, icon: DollarSign },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color || "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={`text-2xl font-bold ${kpi.color || ""}`}>{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {latest && <Badge variant={riskBadgeVariant(latest.risk_category)}>{latest.risk_category} Risk</Badge>}
          {latest && <span className="text-sm text-muted-foreground">Last assessed: {new Date(latest.assessment_date).toLocaleDateString()}</span>}
        </div>
        <Button onClick={generateRiskAssessment} disabled={generating}>
          {generating ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <BarChart3 className="w-4 h-4 mr-2" />}
          Run Risk Assessment
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="components">Risk Components</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="mitigations">AI Mitigations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {latest ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle>Risk Breakdown</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Liquidity Risk", score: latest.liquidity_risk_score, weight: "35%" },
                    { label: "Counterparty Risk", score: latest.counterparty_risk_score, weight: "30%" },
                    { label: "Corridor Concentration", score: latest.corridor_risk_score, weight: "20%" },
                    { label: "FX Exposure", score: latest.fx_risk_score, weight: "15%" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{item.label} <span className="text-muted-foreground">({item.weight})</span></span>
                        <span className={`font-semibold ${riskColor(item.score)}`}>{item.score}/100</span>
                      </div>
                      <Progress value={item.score} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Financial Ratios</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Liquidity Coverage Ratio (LCR)", value: latest.liquidity_coverage_ratio, target: "≥ 1.0", pass: latest.liquidity_coverage_ratio >= 1 },
                    { label: "Debt Service Coverage (DSCR)", value: latest.debt_service_coverage_ratio, target: "≥ 1.25", pass: latest.debt_service_coverage_ratio >= 1.25 },
                    { label: "Revenue Concentration", value: `${latest.revenue_concentration_ratio}%`, target: "< 40%", pass: latest.revenue_concentration_ratio < 40 },
                    { label: "Default Probability", value: `${latest.default_probability_percent}%`, target: "< 10%", pass: latest.default_probability_percent < 10 },
                  ].map((ratio) => (
                    <div key={ratio.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                      <div>
                        <p className="text-sm font-medium">{ratio.label}</p>
                        <p className="text-xs text-muted-foreground">Target: {ratio.target}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{typeof ratio.value === "number" ? ratio.value.toFixed(2) : ratio.value}</span>
                        <Badge variant={ratio.pass ? "default" : "destructive"}>{ratio.pass ? "Pass" : "Fail"}</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No risk assessments yet. Click "Run Risk Assessment" to generate your first score.</p>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="components">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Liquidity Risk", icon: Activity, desc: "Measures ability to meet short-term obligations. Based on LCR and cash runway.", score: latest?.liquidity_risk_score },
              { title: "Counterparty Risk", icon: AlertTriangle, desc: "Probability of customer default based on AR aging and overdue patterns.", score: latest?.counterparty_risk_score },
              { title: "FX Exposure Risk", icon: Globe, desc: "Currency mismatch between revenue and costs. Currently NGN-denominated.", score: latest?.fx_risk_score },
              { title: "Corridor Concentration", icon: MapPin, desc: "Revenue dependency on top customers/routes. High concentration = higher risk.", score: latest?.corridor_risk_score },
            ].map((comp) => (
              <Card key={comp.title}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><comp.icon className="w-4 h-4" />{comp.title}</CardTitle>
                  <CardDescription>{comp.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <span className={`text-4xl font-bold ${riskColor(comp.score ?? 0)}`}>{comp.score ?? "-"}</span>
                    <Progress value={comp.score ?? 0} className="flex-1 h-3" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>LCR</TableHead>
                    <TableHead>DSCR</TableHead>
                    <TableHead>Default %</TableHead>
                    <TableHead>Runway</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{new Date(s.assessment_date).toLocaleDateString()}</TableCell>
                      <TableCell className={`font-bold ${riskColor(s.overall_risk_score)}`}>{s.overall_risk_score}</TableCell>
                      <TableCell><Badge variant={riskBadgeVariant(s.risk_category)}>{s.risk_category}</Badge></TableCell>
                      <TableCell>{s.liquidity_coverage_ratio?.toFixed(2)}</TableCell>
                      <TableCell>{s.debt_service_coverage_ratio?.toFixed(2)}</TableCell>
                      <TableCell>{s.default_probability_percent?.toFixed(1)}%</TableCell>
                      <TableCell>{s.cash_runway_months?.toFixed(1)}mo</TableCell>
                    </TableRow>
                  ))}
                  {scores.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No history yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mitigations">
          <Card>
            <CardHeader><CardTitle>AI Mitigation Suggestions</CardTitle><CardDescription>Auto-generated based on latest risk assessment</CardDescription></CardHeader>
            <CardContent>
              {latest?.mitigation_suggestions && Array.isArray(latest.mitigation_suggestions) ? (
                <div className="space-y-3">
                  {latest.mitigation_suggestions.map((suggestion, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30">
                      <TrendingDown className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">Run an assessment to generate AI mitigation suggestions.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default TreasuryRiskEngine;
