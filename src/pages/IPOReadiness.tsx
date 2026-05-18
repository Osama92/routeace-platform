import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Shield, CheckCircle, XCircle, Lock, FileText, Users,
  BarChart3, Clock, AlertTriangle, Download, Plus
} from "lucide-react";

interface ClosePeriod {
  id: string;
  period_name: string;
  period_start: string;
  period_end: string;
  status: string;
  trial_balance_balanced: boolean;
  checklist_completed: string[];
  closed_at: string | null;
}

const CLOSE_CHECKLIST = [
  "All bank accounts reconciled",
  "AR aging reviewed and updated",
  "AP aging reviewed and updated",
  "Revenue recognition completed",
  "Accruals and prepayments adjusted",
  "Depreciation entries posted",
  "Intercompany balances eliminated",
  "VAT returns prepared",
  "WHT certificates reconciled",
  "Trial balance balanced",
  "P&L statement reviewed",
  "Balance sheet reviewed",
  "Cash flow statement generated",
  "Management review completed",
  "Audit trail exported",
];

const SOD_RULES = [
  { rule: "Invoice Creator ≠ Payment Approver", area: "Accounts Receivable", status: "enforced" },
  { rule: "Payment Approver ≠ Reconciliation Officer", area: "Treasury", status: "enforced" },
  { rule: "Dispatch Creator ≠ Invoice Poster", area: "Operations → Finance", status: "enforced" },
  { rule: "Payroll Preparer ≠ Payroll Approver", area: "Payroll", status: "enforced" },
  { rule: "Expense Submitter ≠ Expense Approver", area: "Expenses", status: "enforced" },
  { rule: "Wallet Debit Requester ≠ Wallet Debit Approver", area: "Treasury", status: "enforced" },
];

const IPOReadiness = () => {
  const [periods, setPeriods] = useState<ClosePeriod[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    const [periodsRes, auditRes] = await Promise.all([
      supabase.from("financial_close_periods").select("*").order("period_end", { ascending: false }),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPeriods((periodsRes.data as ClosePeriod[]) || []);
    setAuditLogs(auditRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createPeriod = async () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const name = `${start.toLocaleString("en", { month: "long" })} ${start.getFullYear()}`;

    const { error } = await supabase.from("financial_close_periods").insert({
      period_name: name,
      period_start: start.toISOString().split("T")[0],
      period_end: end.toISOString().split("T")[0],
      status: "open",
    } as never);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Period Created", description: name });
    fetchData();
  };

  const toggleChecklist = async (periodId: string, item: string, checked: boolean) => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return;
    const current = Array.isArray(period.checklist_completed) ? period.checklist_completed : [];
    const updated = checked ? [...current, item] : current.filter(i => i !== item);
    await supabase.from("financial_close_periods").update({
      checklist_completed: updated,
      trial_balance_balanced: updated.includes("Trial balance balanced"),
    } as never).eq("id", periodId);
    fetchData();
  };

  const closePeriod = async (periodId: string) => {
    const period = periods.find(p => p.id === periodId);
    if (!period) return;
    const completed = Array.isArray(period.checklist_completed) ? period.checklist_completed : [];
    if (completed.length < CLOSE_CHECKLIST.length) {
      toast({ title: "Cannot Close", description: `${CLOSE_CHECKLIST.length - completed.length} checklist items remaining`, variant: "destructive" });
      return;
    }
    await supabase.from("financial_close_periods").update({
      status: "locked",
      closed_by: user?.id,
      closed_at: new Date().toISOString(),
    } as never).eq("id", periodId);
    toast({ title: "Period Locked", description: "Financial records for this period are now immutable." });
    fetchData();
  };

  const controlScore = Math.round((SOD_RULES.filter(r => r.status === "enforced").length / SOD_RULES.length) * 100);

  return (
    <DashboardLayout title="IPO Readiness" subtitle="Institutional-grade financial controls and governance">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Internal Control Score</span></div>
          <p className="text-3xl font-bold text-primary">{controlScore}%</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Lock className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Locked Periods</span></div>
          <p className="text-2xl font-bold">{periods.filter(p => p.status === "locked").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Users className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">SoD Rules</span></div>
          <p className="text-2xl font-bold">{SOD_RULES.filter(r => r.status === "enforced").length}/{SOD_RULES.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><FileText className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Audit Entries</span></div>
          <p className="text-2xl font-bold">{auditLogs.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="controls" className="space-y-4">
        <TabsList>
          <TabsTrigger value="controls">Segregation of Duties</TabsTrigger>
          <TabsTrigger value="close">Financial Close</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        <TabsContent value="controls">
          <Card>
            <CardHeader>
              <CardTitle>Segregation of Duties Matrix</CardTitle>
              <CardDescription>Enforced controls preventing conflict of interest</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Rule</TableHead><TableHead>Area</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                <TableBody>
                  {SOD_RULES.map((rule, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{rule.rule}</TableCell>
                      <TableCell><Badge variant="outline">{rule.area}</Badge></TableCell>
                      <TableCell><Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" />{rule.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="close">
          <div className="flex justify-end mb-4">
            <Button onClick={createPeriod}><Plus className="w-4 h-4 mr-2" />Create Period</Button>
          </div>
          {periods.map((period) => {
            const completed = Array.isArray(period.checklist_completed) ? period.checklist_completed : [];
            const progress = Math.round((completed.length / CLOSE_CHECKLIST.length) * 100);
            return (
              <Card key={period.id} className="mb-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {period.period_name}
                        <Badge variant={period.status === "locked" ? "default" : "secondary"}>
                          {period.status === "locked" && <Lock className="w-3 h-3 mr-1" />}{period.status}
                        </Badge>
                      </CardTitle>
                      <CardDescription>{period.period_start} to {period.period_end}</CardDescription>
                    </div>
                    {period.status !== "locked" && (
                      <Button onClick={() => closePeriod(period.id)} disabled={completed.length < CLOSE_CHECKLIST.length}>
                        <Lock className="w-4 h-4 mr-2" />Lock Period
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1"><span>Progress</span><span>{completed.length}/{CLOSE_CHECKLIST.length}</span></div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {CLOSE_CHECKLIST.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <Checkbox checked={completed.includes(item)} onCheckedChange={(checked) => toggleChecklist(period.id, item, !!checked)} disabled={period.status === "locked"} />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {periods.length === 0 && <Card><CardContent className="py-12 text-center text-muted-foreground"><Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />No close periods yet.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div><CardTitle>Immutable Audit Trail</CardTitle><CardDescription>All changes logged with user context</CardDescription></div>
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Table</TableHead><TableHead>Action</TableHead><TableHead>Record</TableHead><TableHead>User</TableHead></TableRow></TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{new Date(log.created_at).toLocaleString()}</TableCell>
                      <TableCell><Badge variant="outline">{log.table_name}</Badge></TableCell>
                      <TableCell><Badge variant={log.action === "insert" ? "default" : log.action === "delete" ? "destructive" : "secondary"}>{log.action}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">{log.record_id?.slice(0, 8)}</TableCell>
                      <TableCell className="text-sm">{log.user_email || "System"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>SOX-Like Compliance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { control: "Segregation of Duties", status: true },
                  { control: "Immutable Audit Trail", status: true },
                  { control: "Financial Period Locking", status: true },
                  { control: "Multi-Stage Approvals", status: true },
                  { control: "Double-Entry Enforcement", status: true },
                  { control: "Invoice Mutation Prevention", status: true },
                  { control: "Treasury Dual-Control", status: true },
                  { control: "Role-Based Access Control", status: true },
                ].map((item) => (
                  <div key={item.control} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                    <span className="text-sm">{item.control}</span>
                    {item.status ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-destructive" />}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Revenue Recognition</CardTitle><CardDescription>Corridor-based completion recognition</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Recognition Method</p>
                  <p className="text-xs text-muted-foreground">Revenue recognized on delivery completion (point-in-time)</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Deferred Revenue</p>
                  <p className="text-xs text-muted-foreground">Advance payments held as liabilities until service delivery</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Accrual Support</p>
                  <p className="text-xs text-muted-foreground">Period-end accruals auto-generated for in-transit dispatches</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default IPOReadiness;
