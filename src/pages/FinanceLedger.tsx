import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign, TrendingUp, AlertTriangle, CheckCircle, Search, RefreshCw, Plus,
  ShieldCheck, Clock, FileText, Scale, ArrowRightLeft, Lock, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(n);

const statusColor: Record<string, string> = {
  pending: "bg-warning/15 text-warning",
  matched: "bg-success/15 text-success",
  unmatched: "bg-destructive/15 text-destructive",
  exception: "bg-destructive/15 text-destructive",
  open: "bg-warning/15 text-warning",
  resolved: "bg-success/15 text-success",
  detected: "bg-warning/15 text-warning",
  accrued: "bg-info/15 text-info",
  approved: "bg-success/15 text-success",
  paid: "bg-success/15 text-success",
  failed: "bg-destructive/15 text-destructive",
};

const FinanceLedger = () => {
  const [ledger, setLedger] = useState<any[]>([]);
  const [reconBatches, setReconBatches] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [suspense, setSuspense] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [reconDialog, setReconDialog] = useState(false);
  const [suspenseDialog, setSuspenseDialog] = useState(false);
  const [periodDialog, setPeriodDialog] = useState(false);
  const [processing, setProcessing] = useState(false);
  const { user, organizationId } = useAuth();
  const { toast } = useToast();

  // Recon form
  const [reconForm, setReconForm] = useState({ source: "invoices", comparison: "payments", type: "daily" });
  // Suspense form
  const [suspenseForm, setSuspenseForm] = useState({ case_type: "unidentified_payment", value: "", severity: "medium", notes: "" });
  // Period form
  const [periodForm, setPeriodForm] = useState({ label: "", start: "", end: "" });

  const fetchAll = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    const orgEq = (q: any) => q.eq("organization_id", organizationId);
    const [l, rb, s, sp, fp, an, ap] = await Promise.all([
      orgEq(supabase.from("accounting_ledger").select("*").order("entry_date", { ascending: false }).limit(200)),
      orgEq(supabase.from("reconciliation_batches").select("*").order("created_at", { ascending: false }).limit(50)),
      orgEq(supabase.from("settlement_obligations").select("*").order("created_at", { ascending: false }).limit(100)),
      orgEq(supabase.from("suspense_cases").select("*").order("created_at", { ascending: false }).limit(50)),
      orgEq(supabase.from("finance_periods").select("*").order("period_start", { ascending: false }).limit(24)),
      orgEq(supabase.from("finance_anomaly_events").select("*").order("created_at", { ascending: false }).limit(50)),
      orgEq(supabase.from("finance_approval_requests").select("*").order("created_at", { ascending: false }).limit(50)),
    ]);
    setLedger(l.data || []);
    setReconBatches(rb.data || []);
    setSettlements(s.data || []);
    setSuspense(sp.data || []);
    setPeriods(fp.data || []);
    setAnomalies(an.data || []);
    setApprovals(ap.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [organizationId]);

  const totalDebits = ledger.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredits = ledger.reduce((s, e) => s + (e.credit || 0), 0);
  const openSuspense = suspense.filter(s => s.status === "open").length;
  const unreconciledValue = reconBatches.reduce((s, b) => s + (b.unmatched_value || 0), 0);
  const pendingApprovals = approvals.filter(a => a.status === "pending").length;
  const pendingSettlements = settlements.filter(s => s.status === "accrued" || s.status === "approved").reduce((t, s) => t + (s.net_payable || 0), 0);

  const runReconciliation = async () => {
    if (!organizationId) return;
    setProcessing(true);
    try {
      const orgEq = (q: any) => q.eq("organization_id", organizationId);
      // Fetch invoices and payments to auto-reconcile (org-scoped)
      const [invRes, payRes] = await Promise.all([
        orgEq(supabase.from("invoices").select("id, total_amount, status, amount_paid").not("status", "eq", "cancelled")),
        orgEq(supabase.from("ar_payments").select("id, amount, invoice_id")),
      ]);
      const invoices = invRes.data || [];
      const payments = payRes.data || [];

      const invoicePayMap = new Map<string, number>();
      payments.forEach(p => {
        if (p.invoice_id) invoicePayMap.set(p.invoice_id, (invoicePayMap.get(p.invoice_id) || 0) + p.amount);
      });

      let matched = 0, matchedVal = 0, unmatched = 0, unmatchedVal = 0;
      invoices.forEach(inv => {
        const paid = invoicePayMap.get(inv.id) || 0;
        if (Math.abs(inv.total_amount - paid) < 0.01 || inv.status === "paid") {
          matched++; matchedVal += inv.total_amount;
        } else {
          unmatched++; unmatchedVal += Math.abs(inv.total_amount - paid);
        }
      });

      await supabase.from("reconciliation_batches").insert({
        batch_type: reconForm.type,
        source_system: reconForm.source,
        comparison_system: reconForm.comparison,
        total_records: invoices.length,
        matched_count: matched,
        matched_value: matchedVal,
        unmatched_count: unmatched,
        unmatched_value: unmatchedVal,
        exception_count: unmatched > 0 ? Math.min(unmatched, 5) : 0,
        status: unmatched === 0 ? "matched" : "exception",
        owner_id: user?.id,
      });

      toast({ title: "Reconciliation Complete", description: `${matched} matched, ${unmatched} unmatched items found.` });
      setReconDialog(false);
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const createSuspenseCase = async () => {
    if (!suspenseForm.value) return;
    setProcessing(true);
    try {
      await supabase.from("suspense_cases").insert({
        case_type: suspenseForm.case_type,
        impacted_value: parseFloat(suspenseForm.value),
        severity: suspenseForm.severity,
        root_cause: suspenseForm.notes || null,
        assigned_to: user?.id,
        sla_due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
      });
      toast({ title: "Suspense Case Created" });
      setSuspenseDialog(false);
      setSuspenseForm({ case_type: "unidentified_payment", value: "", severity: "medium", notes: "" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const createPeriod = async () => {
    if (!periodForm.label || !periodForm.start || !periodForm.end) return;
    setProcessing(true);
    try {
      await supabase.from("finance_periods").insert({
        period_label: periodForm.label,
        period_start: periodForm.start,
        period_end: periodForm.end,
      });
      toast({ title: "Finance Period Created" });
      setPeriodDialog(false);
      setPeriodForm({ label: "", start: "", end: "" });
      fetchAll();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const lockPeriod = async (id: string) => {
    await supabase.from("finance_periods").update({ status: "locked", locked_by: user?.id, locked_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Period Locked" });
    fetchAll();
  };

  const resolveSuspense = async (id: string) => {
    await supabase.from("suspense_cases").update({ status: "resolved", resolved_at: new Date().toISOString(), resolution_notes: "Resolved by finance team" }).eq("id", id);
    toast({ title: "Case Resolved" });
    fetchAll();
  };

  const stats = [
    { label: "Total Debits", value: fmt(totalDebits), icon: TrendingUp, color: "bg-primary/15 text-primary" },
    { label: "Total Credits", value: fmt(totalCredits), icon: DollarSign, color: "bg-success/15 text-success" },
    { label: "Ledger Balance", value: fmt(totalDebits - totalCredits), icon: Scale, color: totalDebits - totalCredits === 0 ? "bg-success/15 text-success" : "bg-warning/15 text-warning" },
    { label: "Unreconciled", value: fmt(unreconciledValue), icon: AlertTriangle, color: unreconciledValue > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success" },
    { label: "Open Suspense", value: String(openSuspense), icon: Clock, color: openSuspense > 0 ? "bg-warning/15 text-warning" : "bg-success/15 text-success" },
    { label: "Pending Approvals", value: String(pendingApprovals), icon: FileText, color: pendingApprovals > 0 ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground" },
    { label: "Settlements Due", value: fmt(pendingSettlements), icon: ArrowRightLeft, color: "bg-info/15 text-info" },
    { label: "Anomalies", value: String(anomalies.filter(a => a.status === "detected").length), icon: ShieldCheck, color: "bg-destructive/15 text-destructive" },
  ];

  return (
    <DashboardLayout title="Finance Control Tower" subtitle="Internal ledger, reconciliation, settlements & audit controls">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
            <Card className="glass-card border-border/30">
              <CardContent className="p-3 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${s.color} flex items-center justify-center shrink-0`}>
                  <s.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <TabsList className="bg-secondary/50 flex-wrap">
            <TabsTrigger value="ledger">Ledger Explorer</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
            <TabsTrigger value="settlements">Settlements</TabsTrigger>
            <TabsTrigger value="suspense">Suspense</TabsTrigger>
            <TabsTrigger value="periods">Period Close</TabsTrigger>
            <TabsTrigger value="anomalies">Anomalies</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 bg-secondary/50 w-48" />
            </div>
            <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-3.5 h-3.5 mr-1" />Refresh</Button>
          </div>
        </div>

        {/* LEDGER EXPLORER */}
        <TabsContent value="ledger">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <Scale className="w-4 h-4" /> General Ledger - Double-Entry Journal
                {totalDebits - totalCredits === 0 && <Badge className="bg-success/15 text-success text-[10px]">BALANCED</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <div className="max-h-[500px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/30">
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs">Account</TableHead>
                        <TableHead className="text-xs">Description</TableHead>
                        <TableHead className="text-xs text-right">Debit</TableHead>
                        <TableHead className="text-xs text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No ledger entries. Post an invoice to generate entries.</TableCell></TableRow>
                      ) : ledger.filter(e => !search || JSON.stringify(e).toLowerCase().includes(search.toLowerCase())).map(e => (
                        <TableRow key={e.id} className="border-border/20">
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(e.entry_date), "dd MMM yy")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[9px]">{e.reference_type}</Badge></TableCell>
                          <TableCell className="text-xs font-medium">{e.account_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{e.description}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{e.debit > 0 ? fmt(e.debit) : "-"}</TableCell>
                          <TableCell className="text-xs text-right tabular-nums">{e.credit > 0 ? fmt(e.credit) : "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECONCILIATION */}
        <TabsContent value="reconciliation">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Reconciliation Workbench</CardTitle>
              <Button size="sm" onClick={() => setReconDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" />Run Reconciliation</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Source vs Compare</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Matched</TableHead>
                    <TableHead className="text-xs text-right">Unmatched</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reconBatches.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No reconciliation runs yet. Click "Run Reconciliation" to start.</TableCell></TableRow>
                  ) : reconBatches.map(b => (
                    <TableRow key={b.id} className="border-border/20">
                      <TableCell className="text-xs">{format(new Date(b.created_at), "dd MMM yy HH:mm")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{b.batch_type}</Badge></TableCell>
                      <TableCell className="text-xs">{b.source_system} ↔ {b.comparison_system}</TableCell>
                      <TableCell className="text-xs text-right">{b.total_records}</TableCell>
                      <TableCell className="text-xs text-right text-success">{b.matched_count} ({fmt(b.matched_value)})</TableCell>
                      <TableCell className="text-xs text-right text-destructive">{b.unmatched_count} ({fmt(b.unmatched_value)})</TableCell>
                      <TableCell><Badge className={`text-[9px] ${statusColor[b.status] || ""}`}>{b.status?.toUpperCase()}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SETTLEMENTS */}
        <TabsContent value="settlements">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><DollarSign className="w-4 h-4" /> Settlement Obligations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Reserve</TableHead>
                    <TableHead className="text-xs text-right">Net Payable</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {settlements.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No settlement obligations. Partner commissions will appear here.</TableCell></TableRow>
                  ) : settlements.map(s => (
                    <TableRow key={s.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{s.obligation_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(s.amount)}</TableCell>
                      <TableCell className="text-xs text-right text-warning">{fmt(s.reserve_amount)}</TableCell>
                      <TableCell className="text-xs text-right font-semibold">{fmt(s.net_payable)}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${statusColor[s.status] || ""}`}>{s.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(s.created_at), "dd MMM yy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUSPENSE */}
        <TabsContent value="suspense">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><Clock className="w-4 h-4" /> Suspense Cases</CardTitle>
              <Button size="sm" onClick={() => setSuspenseDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" />Create Case</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">SLA Due</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suspense.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No suspense cases. Unmatched payments and finance breaks appear here.</TableCell></TableRow>
                  ) : suspense.map(c => (
                    <TableRow key={c.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{c.case_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(c.impacted_value)}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${c.severity === "high" ? "bg-destructive/15 text-destructive" : c.severity === "medium" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}>{c.severity?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.sla_due_date ? format(new Date(c.sla_due_date), "dd MMM yy") : "-"}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${statusColor[c.status] || ""}`}>{c.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-right">
                        {c.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => resolveSuspense(c.id)}>
                            <CheckCircle className="w-3 h-3 mr-1" />Resolve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PERIOD CLOSE */}
        <TabsContent value="periods">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><Lock className="w-4 h-4" /> Finance Periods</CardTitle>
              <Button size="sm" onClick={() => setPeriodDialog(true)}><Plus className="w-3.5 h-3.5 mr-1" />New Period</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs">Start</TableHead>
                    <TableHead className="text-xs">End</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No finance periods defined. Create monthly periods for close control.</TableCell></TableRow>
                  ) : periods.map(p => (
                    <TableRow key={p.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{p.period_label}</TableCell>
                      <TableCell className="text-xs">{format(new Date(p.period_start), "dd MMM yy")}</TableCell>
                      <TableCell className="text-xs">{format(new Date(p.period_end), "dd MMM yy")}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${p.status === "locked" ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>{p.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-right">
                        {p.status === "open" && (
                          <Button size="sm" variant="outline" onClick={() => lockPeriod(p.id)}>
                            <Lock className="w-3 h-3 mr-1" />Lock Period
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANOMALIES */}
        <TabsContent value="anomalies">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Finance Anomalies</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Severity</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Value</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Detected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {anomalies.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No anomalies detected. The system monitors for unusual financial patterns.</TableCell></TableRow>
                  ) : anomalies.map(a => (
                    <TableRow key={a.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{a.anomaly_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${a.severity === "high" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>{a.severity?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.description}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(a.impacted_value)}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${statusColor[a.status] || ""}`}>{a.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd MMM yy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* APPROVALS */}
        <TabsContent value="approvals">
          <Card className="glass-card border-border/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-heading flex items-center gap-2"><FileText className="w-4 h-4" /> Finance Approval Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Requested</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvals.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">No approval requests. Write-offs, refunds, and overrides require approval.</TableCell></TableRow>
                  ) : approvals.map(a => (
                    <TableRow key={a.id} className="border-border/20">
                      <TableCell className="text-xs font-medium">{a.request_type?.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.description}</TableCell>
                      <TableCell className="text-xs text-right">{fmt(a.amount)}</TableCell>
                      <TableCell><Badge className={`text-[9px] ${statusColor[a.status] || ""}`}>{a.status?.toUpperCase()}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), "dd MMM yy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Reconciliation Dialog */}
      <Dialog open={reconDialog} onOpenChange={setReconDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Run Reconciliation</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Reconciliation Type</Label>
              <Select value={reconForm.type} onValueChange={v => setReconForm(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="monthly">Monthly Close</SelectItem>
                  <SelectItem value="adhoc">Ad Hoc</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source System</Label>
              <Select value={reconForm.source} onValueChange={v => setReconForm(p => ({ ...p, source: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="accounting_ledger">Accounting Ledger</SelectItem>
                  <SelectItem value="partner_invoices">Partner Invoices</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Comparison System</Label>
              <Select value={reconForm.comparison} onValueChange={v => setReconForm(p => ({ ...p, comparison: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="payments">Payments</SelectItem>
                  <SelectItem value="bank_statements">Bank Statements</SelectItem>
                  <SelectItem value="partner_commissions">Partner Commissions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconDialog(false)}>Cancel</Button>
            <Button onClick={runReconciliation} disabled={processing}>{processing ? "Running..." : "Run Reconciliation"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspense Dialog */}
      <Dialog open={suspenseDialog} onOpenChange={setSuspenseDialog}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>Create Suspense Case</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Case Type</Label>
              <Select value={suspenseForm.case_type} onValueChange={v => setSuspenseForm(p => ({ ...p, case_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidentified_payment">Unidentified Payment</SelectItem>
                  <SelectItem value="invoice_mismatch">Invoice Mismatch</SelectItem>
                  <SelectItem value="payout_mismatch">Payout Mismatch</SelectItem>
                  <SelectItem value="tax_mismatch">Tax Mismatch</SelectItem>
                  <SelectItem value="commission_error">Commission Error</SelectItem>
                  <SelectItem value="duplicate_entry">Duplicate Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Impacted Value *</Label>
              <Input type="number" value={suspenseForm.value} onChange={e => setSuspenseForm(p => ({ ...p, value: e.target.value }))} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={suspenseForm.severity} onValueChange={v => setSuspenseForm(p => ({ ...p, severity: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={suspenseForm.notes} onChange={e => setSuspenseForm(p => ({ ...p, notes: e.target.value }))} placeholder="Root cause hypothesis..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspenseDialog(false)}>Cancel</Button>
            <Button onClick={createSuspenseCase} disabled={processing}>{processing ? "Creating..." : "Create Case"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Period Dialog */}
      <Dialog open={periodDialog} onOpenChange={setPeriodDialog}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader><DialogTitle>Create Finance Period</DialogTitle></DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label>Period Label *</Label>
              <Input value={periodForm.label} onChange={e => setPeriodForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. March 2026" />
            </div>
            <div className="space-y-2">
              <Label>Start Date *</Label>
              <Input type="date" value={periodForm.start} onChange={e => setPeriodForm(p => ({ ...p, start: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>End Date *</Label>
              <Input type="date" value={periodForm.end} onChange={e => setPeriodForm(p => ({ ...p, end: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPeriodDialog(false)}>Cancel</Button>
            <Button onClick={createPeriod} disabled={processing}>{processing ? "Creating..." : "Create Period"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default FinanceLedger;
