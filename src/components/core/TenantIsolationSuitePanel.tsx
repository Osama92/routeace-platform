import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldCheck, Play, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Run = { id: string; run_at: string; total_probes: number; passed: number; failed: number; duration_ms: number | null; notes: string | null };
type Finding = { id: string; surface: string; table_or_resource: string; source_org: string | null; target_org: string | null; attempted_action: string; status: string; observed_rows: number; detail: string | null };

export default function TenantIsolationSuitePanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [running, setRunning] = useState(false);

  const loadRuns = async () => {
    const { data, error } = await (supabase as any).from("tenant_isolation_runs").select("*").order("run_at", { ascending: false }).limit(20);
    if (error) toast.error(error.message); else {
      setRuns(data as Run[]);
      if (data?.length && !selected) loadFindings(data[0]);
    }
  };
  const loadFindings = async (run: Run) => {
    setSelected(run);
    const { data, error } = await (supabase as any).from("tenant_isolation_findings").select("*").eq("run_id", run.id).order("status", { ascending: false });
    if (error) toast.error(error.message); else setFindings(data as Finding[]);
  };
  const runSuite = async () => {
    setRunning(true);
    const { error } = await (supabase as any).rpc("run_tenant_isolation_suite");
    setRunning(false);
    if (error) return toast.error(error.message);
    toast.success("Isolation suite complete");
    await loadRuns();
  };
  useEffect(() => { loadRuns(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-500" />Tenant Isolation Regression Suite</h2>
          <p className="text-sm text-muted-foreground">Cross-tenant probes across DB, storage, AI outputs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRuns} className="gap-2"><RefreshCw className="w-4 h-4" />Refresh</Button>
          <Button onClick={runSuite} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}Run Suite
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recent runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-auto">
            {runs.length === 0 ? <p className="text-sm text-muted-foreground">No runs yet.</p> : runs.map(r => {
              const ok = r.failed === 0;
              return (
                <button key={r.id} onClick={() => loadFindings(r)} className={`w-full text-left p-3 rounded border ${selected?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">{format(new Date(r.run_at), "MMM dd HH:mm:ss")}</span>
                    <Badge className={ok ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}>{r.passed}/{r.total_probes}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">{r.failed} failed · {r.duration_ms ?? "-"}ms</div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Findings</CardTitle><CardDescription>{selected ? `${selected.passed} pass / ${selected.failed} fail` : "Select a run"}</CardDescription></CardHeader>
          <CardContent className="max-h-[480px] overflow-auto">
            {findings.length === 0 ? <p className="text-sm text-muted-foreground">No findings.</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Status</TableHead><TableHead>Surface</TableHead><TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead><TableHead className="text-right">Rows</TableHead><TableHead>Detail</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {findings.map(f => (
                    <TableRow key={f.id}>
                      <TableCell><Badge className={f.status === "pass" ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}>{f.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{f.surface}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{f.table_or_resource}</TableCell>
                      <TableCell className="text-xs">{f.attempted_action}</TableCell>
                      <TableCell className="text-right">{f.observed_rows}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
