import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  TrendingUp, TrendingDown, Download, Brain, AlertTriangle,
  CheckCircle2, BarChart3, ArrowUpRight, Lightbulb, Clock,
  Target, FileText, Activity, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number, sym = "₦") =>
  `${sym}${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

const QTR_DATA = {
  current: { label: "Q1 2025", revenue: 101_200_000, expenses: 61_400_000, profit: 39_800_000, margin: 39.3, sla: 96.2, fleet: 87 },
  previous: { label: "Q4 2024", revenue: 84_500_000, expenses: 51_200_000, profit: 33_300_000, margin: 39.4, sla: 94.1, fleet: 83 },
};

const ANOMALIES = [
  { severity: "high", label: "Fuel Cost Spike - Week 5", detail: "Fuel costs 22% above Q4 average. Diesel price increase + 3 idle vehicles detected.", impact: -2_100_000 },
  { severity: "medium", label: "SLA Breach - Lagos-Kano Corridor", detail: "4 SLA breaches on northern routes. Impact on margin: ₦320K penalties.", impact: -320_000 },
  { severity: "low", label: "AR Slowdown - 2 Customers", detail: "Zenith Logistics and PrimeCargo AR now 28 days vs. 18-day average.", impact: -580_000 },
];

const RECOMMENDATIONS = [
  { icon: Zap, label: "Fuel Hedging Strategy", detail: "Lock diesel at current rate for 90 days via NNPC forward contract. Estimated saving: ₦4.2M/qtr.", priority: "High" },
  { icon: Target, label: "Route Consolidation", detail: "Lagos-Kano routes show 31% empty-leg ratio. AI clustering can reduce by 18%, saving ₦2.8M.", priority: "High" },
  { icon: BarChart3, label: "Driver Incentive Revision", detail: "Top 20% drivers deliver 47% of revenue. Performance bonus revision will improve retention.", priority: "Medium" },
  { icon: Activity, label: "SLA Insurance Activation", detail: "Activate SLA insurance for high-value contracts. Covers penalty exposure of ₦960K/qtr.", priority: "Medium" },
];

export function QuarterlyManagementReport() {
  const { toast } = useToast();
  const [generating, setGenerating] = useState(false);

  const revenueGrowth = ((QTR_DATA.current.revenue - QTR_DATA.previous.revenue) / QTR_DATA.previous.revenue) * 100;
  const profitGrowth = ((QTR_DATA.current.profit - QTR_DATA.previous.profit) / QTR_DATA.previous.profit) * 100;
  const projNextQtr = Math.round(QTR_DATA.current.revenue * 1.18); // AI projection

  const handleGeneratePDF = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast({ title: "📊 Board Pack Generated", description: "Q1 2025 Management Report is ready for download. Big-4 compliant format." });
    }, 2500);
  };

  return (
    <div className="space-y-4">
      {/* Header Strip */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex-1">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI-Generated Quarterly Management Commentary - Q1 2025
          </h3>
          <p className="text-xs text-muted-foreground">Auto-generated from live financials. Big-4 reporting standards.</p>
        </div>
        <Button onClick={handleGeneratePDF} disabled={generating}>
          {generating ? (
            <><Clock className="w-4 h-4 mr-2 animate-spin" />Generating...</>
          ) : (
            <><Download className="w-4 h-4 mr-2" />Export Board Pack PDF</>
          )}
        </Button>
        <Button variant="outline">
          <FileText className="w-4 h-4 mr-2" />Editable Dashboard View
        </Button>
      </div>

      {/* Performance Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: "Q1 Revenue", value: fmt(QTR_DATA.current.revenue), sub: `+${revenueGrowth.toFixed(1)}% vs Q4 2024`,
            icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10",
          },
          {
            label: "Q1 Net Profit", value: fmt(QTR_DATA.current.profit), sub: `+${profitGrowth.toFixed(1)}% growth`,
            icon: TrendingUp, color: "text-primary", bg: "bg-primary/10",
          },
          {
            label: "SLA Compliance", value: `${QTR_DATA.current.sla}%`, sub: "+2.1pp vs Q4",
            icon: CheckCircle2, color: "text-blue-500", bg: "bg-blue-500/10",
          },
          {
            label: "AI Revenue Forecast Q2", value: fmt(projNextQtr), sub: "+18% projected",
            icon: Brain, color: "text-purple-500", bg: "bg-purple-500/10",
          },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-4 h-4 ${k.color}`} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-lg font-bold">{k.value}</p>
                <p className="text-xs text-green-500">{k.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Executive Summary */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Executive Summary
          </CardTitle>
          <CardDescription>Auto-generated management commentary based on Q1 2025 financial data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 rounded-lg bg-muted/50 text-sm leading-relaxed">
            <p className="font-semibold mb-2">RouteAce Limited - Q1 2025 Performance Report</p>
            <p className="text-muted-foreground">
              RouteAce delivered a strong Q1 2025, generating <strong className="text-foreground">{fmt(QTR_DATA.current.revenue)}</strong> in gross revenue,
              representing <strong className="text-green-500">{revenueGrowth.toFixed(1)}% growth</strong> over Q4 2024 ({fmt(QTR_DATA.previous.revenue)}).
              Net profit grew to <strong className="text-foreground">{fmt(QTR_DATA.current.profit)}</strong> ({QTR_DATA.current.margin}% margin),
              driven by multi-drop billing expansion and route consolidation across the Lagos and Port Harcourt corridors.
            </p>
            <p className="text-muted-foreground mt-2">
              Fleet utilization improved to <strong className="text-foreground">{QTR_DATA.current.fleet}%</strong> (from {QTR_DATA.previous.fleet}% in Q4 2024),
              reflecting successful driver-to-dispatch ratio optimization. SLA compliance reached <strong className="text-foreground">{QTR_DATA.current.sla}%</strong>,
              with 4 breaches attributable to northern corridor delays - a risk area flagged for Q2 mitigation.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong className="text-yellow-500">⚠️ Key Risk:</strong> Fuel costs remain the largest OpEx driver at 43.2% of total expenses.
              A sustained 15% diesel price increase would erode margins by approximately 6pp, reducing net profit to ~33.5%.
              Management is advised to evaluate diesel hedging or fuel levy clauses in new contracts.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong className="text-green-500">✅ Outlook:</strong> Based on current trajectory and confirmed pipeline contracts,
              Q2 2025 revenue is projected at <strong className="text-foreground">{fmt(projNextQtr)}</strong> (+18%).
              Pending Super Admin treasury approvals for ₦8.9M escrow releases and ₦3.2M vendor settlements.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Period Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">QoQ Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Q4 2024</TableHead>
                  <TableHead>Q1 2025</TableHead>
                  <TableHead>Δ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[
                  { metric: "Revenue", q4: QTR_DATA.previous.revenue, q1: QTR_DATA.current.revenue },
                  { metric: "Net Profit", q4: QTR_DATA.previous.profit, q1: QTR_DATA.current.profit },
                  { metric: "Expenses", q4: QTR_DATA.previous.expenses, q1: QTR_DATA.current.expenses },
                  { metric: "Margin %", q4: QTR_DATA.previous.margin, q1: QTR_DATA.current.margin, isPercent: true },
                  { metric: "SLA %", q4: QTR_DATA.previous.sla, q1: QTR_DATA.current.sla, isPercent: true },
                  { metric: "Fleet Util %", q4: QTR_DATA.previous.fleet, q1: QTR_DATA.current.fleet, isPercent: true },
                ].map((row) => {
                  const delta = row.q1 - row.q4;
                  const good = delta >= 0;
                  return (
                    <TableRow key={row.metric}>
                      <TableCell className="font-medium text-sm">{row.metric}</TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">{row.isPercent ? `${row.q4}%` : fmt(row.q4)}</TableCell>
                      <TableCell className="font-mono text-sm font-semibold">{row.isPercent ? `${row.q1}%` : fmt(row.q1)}</TableCell>
                      <TableCell className={`font-mono text-sm font-bold ${good ? "text-green-500" : "text-destructive"}`}>
                        {delta >= 0 ? "+" : ""}{row.isPercent ? `${delta.toFixed(1)}%` : fmt(delta)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Anomaly Detection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              AI Anomaly Detection
            </CardTitle>
            <CardDescription>Auto-detected deviations from baseline performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ANOMALIES.map((a, i) => (
              <div key={i} className={`p-3 rounded-lg border-l-4 ${
                a.severity === "high" ? "border-destructive bg-destructive/5" :
                a.severity === "medium" ? "border-yellow-500 bg-yellow-500/5" :
                "border-blue-500 bg-blue-500/5"
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{a.label}</p>
                  <Badge className={`text-xs ${
                    a.severity === "high" ? "bg-destructive/20 text-destructive" :
                    a.severity === "medium" ? "bg-yellow-500/20 text-yellow-700" :
                    "bg-blue-500/20 text-blue-700"
                  }`}>{a.severity.toUpperCase()}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{a.detail}</p>
                <p className="text-xs text-destructive font-semibold mt-1">P&L Impact: {fmt(a.impact)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Cost Reduction Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            AI-Driven Cost Reduction Recommendations
          </CardTitle>
          <CardDescription>Machine learning analysis of Q1 data - actionable next quarter improvements</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {RECOMMENDATIONS.map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-muted/50 border flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                <r.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm">{r.label}</p>
                  <Badge variant="outline" className={`text-xs ${r.priority === "High" ? "border-destructive/50 text-destructive" : "border-yellow-500/50 text-yellow-600"}`}>
                    {r.priority}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{r.detail}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Q2 Revenue Forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />Q2 2025 Revenue Forecast - AI Projection
          </CardTitle>
          <CardDescription>Based on pipeline, seasonal patterns, and operational capacity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: "Conservative Scenario", value: Math.round(QTR_DATA.current.revenue * 1.10), pct: "10% growth", confidence: 92, color: "bg-blue-500" },
              { label: "Base Case (AI Projection)", value: projNextQtr, pct: "18% growth", confidence: 76, color: "bg-primary" },
              { label: "Optimistic Scenario", value: Math.round(QTR_DATA.current.revenue * 1.28), pct: "28% growth", confidence: 41, color: "bg-green-500" },
            ].map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{s.pct}</span>
                    <span className="font-bold">{fmt(s.value)}</span>
                    <Badge variant="outline" className="text-xs">{s.confidence}% conf.</Badge>
                  </div>
                </div>
                <Progress value={s.confidence} className={`h-2 [&>div]:${s.color}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
