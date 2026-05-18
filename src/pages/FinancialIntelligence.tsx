import { useState, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, Brain,
  ShieldCheck, Wallet, BarChart3, Users, Inbox, Sliders
} from "lucide-react";
import { useFinancialIntelligence } from "@/hooks/useFinancialIntelligence";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import { RequirePermission } from "@/components/rbac/RequirePermission";

const fmt = (n: number) =>
  `${n < 0 ? "-" : ""}₦${Math.abs(n).toLocaleString("en-NG", { minimumFractionDigits: 0 })}`;

export default function FinancialIntelligence() {
  const fi = useFinancialIntelligence();
  const [simFactoringPct, setSimFactoringPct] = useState(0);
  const [simExpenseDelay, setSimExpenseDelay] = useState(0);
  const [simFundingInjection, setSimFundingInjection] = useState(0);

  // What-if simulation
  const simulated = useMemo(() => {
    const factoringCash = (fi.arAging.total * simFactoringPct) / 100 * 0.85;
    const delayedOutflow = (fi.monthlyExpenses * simExpenseDelay) / 100;
    const adjustedBalance = fi.cashPosition.currentBalance + factoringCash + simFundingInjection + delayedOutflow;
    const newRunway = fi.monthlyExpenses > 0 ? Math.round((adjustedBalance / fi.monthlyExpenses) * 10) / 10 : 0;
    return { adjustedBalance, newRunway, factoringCash, delayedOutflow };
  }, [fi, simFactoringPct, simExpenseDelay, simFundingInjection]);

  const forecastExportCols = [
    { key: "weekLabel", label: "Period" },
    { key: "projectedInflow", label: "Inflow (₦)", format: (v: number) => fmt(v) },
    { key: "projectedOutflow", label: "Outflow (₦)", format: (v: number) => fmt(v) },
    { key: "netFlow", label: "Net (₦)", format: (v: number) => fmt(v) },
    { key: "cumulativeBalance", label: "Cumulative (₦)", format: (v: number) => fmt(v) },
  ];

  const clientExportCols = [
    { key: "customerName", label: "Client" },
    { key: "outstanding", label: "Outstanding (₦)", format: (v: number) => fmt(v) },
    { key: "avgDaysOverdue", label: "Avg Days Overdue" },
    { key: "behavior", label: "Behavior" },
    { key: "riskScore", label: "Risk Score" },
  ];

  return (
    <DashboardLayout title="Financial Intelligence Engine" subtitle="Real-time cash flow, forecasting, risk detection & what-if analysis">
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <TabsList>
            <TabsTrigger value="overview">Cash Position</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
            <TabsTrigger value="simulator">What-If</TabsTrigger>
            <TabsTrigger value="clients">Client Intelligence</TabsTrigger>
            <TabsTrigger value="risks">Risk Alerts</TabsTrigger>
          </TabsList>
        </div>

        {/* ===== CASH POSITION ===== */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Cash Position", value: fmt(fi.cashPosition.currentBalance), icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
              { label: "Cash Runway", value: `${fi.cashRunwayMonths} months`, icon: Clock, color: fi.cashRunwayMonths < 3 ? "text-destructive" : "text-green-500", bg: fi.cashRunwayMonths < 3 ? "bg-destructive/10" : "bg-green-500/10" },
              { label: "AR Outstanding", value: fmt(fi.arAging.total), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "AP Outstanding", value: fmt(fi.totalAP), icon: TrendingDown, color: "text-orange-500", bg: "bg-orange-500/10" },
            ].map((k) => (
              <Card key={k.label} className="border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${k.bg}`}><k.icon className={`w-5 h-5 ${k.color}`} /></div>
                  <div><p className="text-xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Monthly Revenue", value: fmt(fi.monthlyRevenue) },
              { label: "Monthly Expenses", value: fmt(fi.monthlyExpenses) },
              { label: "Gross Margin", value: `${fi.grossMargin}%` },
              { label: "CCC", value: `${fi.ccc} days` },
            ].map((m) => (
              <Card key={m.label} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-lg font-bold mt-1">{m.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AR Aging */}
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">AR Aging Analysis</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Current", value: fi.arAging.current, color: "bg-green-500" },
                { label: "1-30 Days", value: fi.arAging.days30, color: "bg-blue-500" },
                { label: "31-60 Days", value: fi.arAging.days60, color: "bg-amber-500" },
                { label: "61-90 Days", value: fi.arAging.days90, color: "bg-orange-500" },
                { label: "90+ Days", value: fi.arAging.over90, color: "bg-destructive" },
              ].map((b) => (
                <div key={b.label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.label}</span>
                    <span className="font-medium">{fmt(b.value)}</span>
                  </div>
                  <Progress value={fi.arAging.total > 0 ? (b.value / fi.arAging.total) * 100 : 0} className={`h-2 [&>div]:${b.color}`} />
                </div>
              ))}
              <div className="mt-4 p-3 rounded-lg bg-muted/50 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-sm">Collection Probability: <strong>{fi.collectionProbability}%</strong></span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== FORECAST ===== */}
        <TabsContent value="forecast" className="space-y-6">
          <div className="flex justify-end">
            <ExportDropdown options={{ title: "Cash Flow Forecast", columns: forecastExportCols, data: fi.forecast }} />
          </div>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm">8-Week Rolling Forecast</CardTitle></CardHeader>
            <CardContent>
              {fi.forecast.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No forecast data</p>
                  <p className="text-xs text-muted-foreground mt-1">Create invoices and track receivables to generate cash flow projections.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Inflow</TableHead>
                      <TableHead className="text-right">Outflow</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead className="text-right">Cumulative</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fi.forecast.map((w) => (
                      <TableRow key={w.weekLabel}>
                        <TableCell className="font-medium">{w.weekLabel}</TableCell>
                        <TableCell className="text-right text-green-600">{fmt(w.projectedInflow)}</TableCell>
                        <TableCell className="text-right text-destructive">{fmt(w.projectedOutflow)}</TableCell>
                        <TableCell className={`text-right font-medium ${w.netFlow >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(w.netFlow)}</TableCell>
                        <TableCell className={`text-right font-bold ${w.cumulativeBalance >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(w.cumulativeBalance)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== WHAT-IF SIMULATOR ===== */}
        <TabsContent value="simulator" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Sliders className="w-4 h-4" /> Capital Allocation Simulator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Factor {simFactoringPct}% of AR (₦{fmt(fi.arAging.total)})</label>
                  <Slider value={[simFactoringPct]} onValueChange={(v) => setSimFactoringPct(v[0])} max={100} step={5} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Net proceeds (85% advance): {fmt(simulated.factoringCash)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Delay {simExpenseDelay}% of expenses</label>
                  <Slider value={[simExpenseDelay]} onValueChange={(v) => setSimExpenseDelay(v[0])} max={50} step={5} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Cash preserved: {fmt(simulated.delayedOutflow)}</p>
                </div>

                <div>
                  <label className="text-sm font-medium">Funding injection</label>
                  <Slider value={[simFundingInjection]} onValueChange={(v) => setSimFundingInjection(v[0])} max={50_000_000} step={1_000_000} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Amount: {fmt(simFundingInjection)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-xs text-muted-foreground">Current Balance</p>
                  <p className="text-xl font-bold">{fmt(fi.cashPosition.currentBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Runway: {fi.cashRunwayMonths}mo</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">Simulated Balance</p>
                  <p className={`text-xl font-bold ${simulated.adjustedBalance >= 0 ? "text-green-600" : "text-destructive"}`}>{fmt(simulated.adjustedBalance)}</p>
                  <p className="text-xs text-muted-foreground mt-1">Runway: {simulated.newRunway}mo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== CLIENT INTELLIGENCE ===== */}
        <TabsContent value="clients" className="space-y-6">
          <div className="flex justify-end">
            <ExportDropdown options={{ title: "Client Financial Intelligence", columns: clientExportCols, data: fi.clientRisks }} />
          </div>
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Client Receivables & Risk</CardTitle></CardHeader>
            <CardContent>
              {fi.clientRisks.length === 0 ? (
                <div className="text-center py-12">
                  <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No client data yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Create dispatches and invoices to build client financial profiles.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Avg Days</TableHead>
                      <TableHead>Behavior</TableHead>
                      <TableHead className="text-right">Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fi.clientRisks.map((c) => (
                      <TableRow key={c.customerId}>
                        <TableCell className="font-medium">{c.customerName}</TableCell>
                        <TableCell className="text-right">{fmt(c.outstanding)}</TableCell>
                        <TableCell className="text-right">{c.avgDaysOverdue}</TableCell>
                        <TableCell>
                          <Badge variant={c.behavior === "delinquent" ? "destructive" : c.behavior === "slow" ? "secondary" : "default"}>
                            {c.behavior}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={c.riskScore > 60 ? "text-destructive font-bold" : c.riskScore > 30 ? "text-amber-600" : "text-green-600"}>
                            {c.riskScore}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== RISK ALERTS ===== */}
        <TabsContent value="risks" className="space-y-6">
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4" /> AI Risk Intelligence</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {fi.riskAlerts.map((alert, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border flex items-start gap-3 ${
                    alert.type === "critical"
                      ? "bg-destructive/5 border-destructive/20"
                      : alert.type === "warning"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-green-500/5 border-green-500/20"
                  }`}
                >
                  <AlertTriangle
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      alert.type === "critical" ? "text-destructive" : alert.type === "warning" ? "text-amber-500" : "text-green-500"
                    }`}
                  />
                  <div className="flex-1">
                    <p className="text-sm">{alert.message}</p>
                    {alert.metric && <Badge variant="outline" className="mt-1 text-xs">{alert.metric}</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "DSO", value: `${fi.dso} days`, desc: "Days Sales Outstanding" },
              { label: "DPO", value: `${fi.dpo} days`, desc: "Days Payable Outstanding" },
              { label: "CCC", value: `${fi.ccc} days`, desc: "Cash Conversion Cycle" },
              { label: "Collection %", value: `${fi.collectionProbability}%`, desc: "Weighted probability" },
            ].map((m) => (
              <Card key={m.label} className="border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{m.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
