import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Play, ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Run = {
  id: string;
  run_at: string;
  total_checks: number;
  passed: number;
  failed: number;
  duration_ms: number | null;
  notes: string | null;
};
type Finding = {
  id: string;
  table_name: string;
  scope: string;
  test_user_email: string | null;
  test_org_id: string | null;
  observed_other_org_rows: number;
  observed_total_rows: number;
  status: string;
  error_message: string | null;
};

export default function RLSSmokeTestPanel() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [selected, setSelected] = useState<Run | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  const loadRuns = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("core_rls_smoke_runs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(25);
    if (error) toast.error(error.message);
    setRuns((data as Run[]) || []);
    if (data && data.length > 0 && !selected) loadFindings(data[0]);
    setLoading(false);
  };

  const loadFindings = async (run: Run) => {
    setSelected(run);
    const { data, error } = await (supabase as any)
      .from("core_rls_smoke_findings")
      .select("*")
      .eq("run_id", run.id)
      .order("status", { ascending: false })
      .order("table_name", { ascending: true });
    if (error) toast.error(error.message);
    setFindings((data as Finding[]) || []);
  };

  const runTests = async () => {
    setRunning(true);
    const { error } = await (supabase as any).rpc("run_rls_smoke_tests");
    setRunning(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Smoke run complete");
    await loadRuns();
  };

  useEffect(() => { loadRuns(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Multi-Tenant RLS Smoke Tests
          </h2>
          <p className="text-sm text-muted-foreground">Verifies LD, LC and Transporter users cannot read other organisations' data.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadRuns} className="gap-2"><RefreshCw className="w-4 h-4" />Refresh</Button>
          <Button onClick={runTests} disabled={running} className="gap-2">
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Running…" : "Run Smoke Tests"}
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle className="text-base">Recent Runs</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-auto">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No runs yet - click Run Smoke Tests.</p>
            ) : runs.map(r => {
              const ok = r.failed === 0;
              return (
                <button
                  key={r.id}
                  onClick={() => loadFindings(r)}
                  className={`w-full text-left p-3 rounded border transition-colors ${selected?.id === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{format(new Date(r.run_at), "MMM dd HH:mm:ss")}</span>
                    <Badge className={ok ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}>
                      {ok ? <ShieldCheck className="w-3 h-3 mr-1" /> : <ShieldAlert className="w-3 h-3 mr-1" />}
                      {r.passed}/{r.total_checks}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {r.failed} failed · {r.duration_ms ?? "-"}ms
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Findings</CardTitle>
            <CardDescription>
              {selected ? `Run ${format(new Date(selected.run_at), "PPpp")} - ${selected.passed} pass / ${selected.failed} fail` : "Select a run"}
            </CardDescription>
            {(() => {
              const leaks = findings.filter(f => f.status === "fail" && f.observed_other_org_rows > 0);
              if (leaks.length === 0) return null;
              return (
                <div className="mt-2 p-3 rounded border border-destructive/40 bg-destructive/5 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-destructive mt-0.5" />
                  <div className="text-xs">
                    <div className="font-semibold text-destructive">
                      Cross-tenant leakage detected on {leaks.length} probe(s)
                    </div>
                    <div className="text-muted-foreground mt-1">
                      Tables: {Array.from(new Set(leaks.map(l => l.table_name))).join(", ")}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardHeader>
          <CardContent className="max-h-[480px] overflow-auto">
            {findings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No findings.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead className="text-right">Other-Org Rows</TableHead>
                    <TableHead className="text-right">Total Visible</TableHead>
                    <TableHead>User / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {findings.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <Badge className={
                          f.status === "pass" ? "bg-emerald-500/15 text-emerald-600" :
                          f.status === "fail" ? "bg-destructive/15 text-destructive" :
                          "bg-amber-500/15 text-amber-600"
                        }>{f.status}</Badge>
                      </TableCell>
                      <TableCell><Badge variant="outline">{f.scope}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{f.table_name}</TableCell>
                      <TableCell className="text-right font-bold">{f.observed_other_org_rows}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{f.observed_total_rows}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.test_user_email || f.test_org_id?.slice(0, 8)}
                        {f.error_message && <div className="text-destructive mt-1">{f.error_message}</div>}
                      </TableCell>
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
