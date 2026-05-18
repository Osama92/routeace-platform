import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, AlertOctagon, Loader2, PlayCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Finding {
  id: string;
  staff_salary_id: string;
  staff_id: string | null;
  severity: "clean" | "warning" | "critical";
  category: string;
  message: string;
  anomaly_score: number;
  detail: any;
  detected_at: string;
  resolved_at: string | null;
}

interface RunRow {
  id: string;
  rows_checked: number;
  clean_count: number;
  warning_count: number;
  critical_count: number;
  prevented_amount: number;
  created_at: string;
}

export default function PayrollAudit() {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<Finding | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: f }, { data: r }] = await Promise.all([
      supabase.from("payroll_audit_findings").select("*").is("resolved_at", null).order("detected_at", { ascending: false }).limit(200),
      supabase.from("payroll_audit_runs").select("*").order("created_at", { ascending: false }).limit(10),
    ]);
    setFindings((f as any) || []);
    setRuns((r as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runAudit = async () => {
    setRunning(true);
    const { data, error } = await supabase.rpc("audit_pending_payroll");
    setRunning(false);
    if (error) return toast.error(error.message);
    const d: any = data;
    toast.success(`Audited ${d.rows_checked} payroll rows · ${d.critical} critical · ₦${Number(d.prevented_amount).toLocaleString()} prevented`);
    load();
  };

  const resolve = async () => {
    if (!resolveTarget) return;
    const { error } = await supabase
      .from("payroll_audit_findings")
      .update({
        resolved_at: new Date().toISOString(),
        resolved_by: (await supabase.auth.getUser()).data.user?.id,
        resolved_note: note || "Resolved by admin",
      })
      .eq("id", resolveTarget.id);
    if (error) return toast.error(error.message);
    toast.success("Finding resolved");
    setResolveTarget(null);
    setNote("");
    load();
  };

  const last = runs[0];
  const open = {
    critical: findings.filter(f => f.severity === "critical").length,
    warning: findings.filter(f => f.severity === "warning").length,
  };

  const sevBadge = (s: string) => {
    if (s === "critical") return <Badge variant="destructive"><AlertOctagon className="h-3 w-3 mr-1" />Critical</Badge>;
    if (s === "warning") return <Badge className="bg-amber-500 text-white"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>;
    return <Badge variant="secondary"><CheckCircle2 className="h-3 w-3 mr-1" />Clean</Badge>;
  };

  return (
    <DashboardLayout title="Payroll Audit">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" /> AI Payroll Auditor
            </h1>
            <p className="text-muted-foreground">Catches errors, duplicates and anomalies before any salary is paid.</p>
          </div>
          <Button onClick={runAudit} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            Run audit on pending payroll
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Open critical</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold text-destructive">{open.critical}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Open warnings</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold text-amber-600">{open.warning}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Last batch checked</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold">{last?.rows_checked ?? 0}</CardContent></Card>
          <Card><CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Amount prevented</CardTitle></CardHeader>
            <CardContent className="text-3xl font-bold text-emerald-600">₦{Number(last?.prevented_amount ?? 0).toLocaleString()}</CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Open findings</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : findings.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                No open audit findings. Payroll is clean.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Severity</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Detected</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map(f => (
                    <tr key={f.id} className="border-t">
                      <td className="p-3">{sevBadge(f.severity)}</td>
                      <td className="p-3 font-mono text-xs">{f.category}</td>
                      <td className="p-3">{f.message}</td>
                      <td className="p-3">{f.anomaly_score}</td>
                      <td className="p-3 text-muted-foreground">{new Date(f.detected_at).toLocaleString()}</td>
                      <td className="p-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => setResolveTarget(f)}>Resolve</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent audit runs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr><th className="p-3">When</th><th className="p-3">Checked</th><th className="p-3">Clean</th><th className="p-3">Warnings</th><th className="p-3">Critical</th><th className="p-3 text-right">Prevented</th></tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-3">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-3">{r.rows_checked}</td>
                    <td className="p-3 text-emerald-600">{r.clean_count}</td>
                    <td className="p-3 text-amber-600">{r.warning_count}</td>
                    <td className="p-3 text-destructive">{r.critical_count}</td>
                    <td className="p-3 text-right">₦{Number(r.prevented_amount).toLocaleString()}</td>
                  </tr>
                ))}
                {runs.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No audit runs yet.</td></tr>}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!resolveTarget} onOpenChange={(o) => !o && setResolveTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve finding</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm"><strong>{resolveTarget?.category}</strong> - {resolveTarget?.message}</p>
            <Textarea placeholder="Resolution note (required for audit trail)" value={note} onChange={e => setNote(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolveTarget(null)}>Cancel</Button>
            <Button onClick={resolve} disabled={!note.trim()}>Mark resolved</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
