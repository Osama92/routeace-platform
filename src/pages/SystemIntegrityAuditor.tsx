import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, CheckCircle2, Loader2, ShieldCheck, XCircle, Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  runFullAudit,
  computeHealthScore,
  type CheckResult,
} from "@/lib/integrity/auditChecks";

const CATEGORY_LABEL: Record<string, string> = {
  routes: "Routes & Reachability",
  data_flow: "Data Flow Continuity",
  ai_modules: "AI Modules",
  security: "Security & Access",
  performance: "Performance",
  workflows: "Workflows",
  ux: "UX",
};

export default function SystemIntegrityAuditor() {
  const [results, setResults] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

  const summary = computeHealthScore(results);

  const runAudit = async () => {
    setRunning(true);
    try {
      const r = await runFullAudit();
      setResults(r);
      setLastRunAt(new Date());
      const failed = r.filter((x) => x.status === "fail").length;
      if (failed === 0) toast.success("Audit complete - no critical failures.");
      else toast.warning(`Audit complete - ${failed} issue(s) found.`);
    } catch (e: any) {
      toast.error(`Audit failed: ${e?.message ?? "unknown"}`);
    } finally {
      setRunning(false);
    }
  };

  const grouped = results.reduce<Record<string, CheckResult[]>>((acc, r) => {
    (acc[r.category] ??= []).push(r);
    return acc;
  }, {});

  return (
    <DashboardLayout title="System Integrity Auditor">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" />
              System Integrity Auditor
            </h1>
            <p className="text-muted-foreground mt-1">
              Live audit of routes, data flow, AI engines, security & performance. Read-only - no system breakage.
            </p>
          </div>
          <Button onClick={runAudit} disabled={running} size="lg">
            {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
            {running ? "Auditing…" : "Run Full Audit"}
          </Button>
        </div>

        {results.length > 0 && (
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>System Health Score</span>
                <Badge
                  variant={summary.goLive ? "default" : "destructive"}
                  className="text-base px-3 py-1"
                >
                  {summary.goLive ? "✅ GO-LIVE READY" : "❌ NOT READY"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Last run: {lastRunAt?.toLocaleTimeString() ?? "-"} · {results.length} checks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold">{summary.score}%</div>
                <Progress value={summary.score} className="flex-1 h-3" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(summary.breakdown).map(([cat, pct]) => (
                  <div key={cat} className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">{CATEGORY_LABEL[cat] ?? cat}</div>
                    <div className="text-xl font-semibold mt-1">{pct}%</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {Object.entries(grouped).map(([cat, items]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle className="text-lg">{CATEGORY_LABEL[cat] ?? cat}</CardTitle>
              <CardDescription>{items.length} check(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-start gap-3 p-3 rounded-md border bg-card"
                    >
                      {r.status === "pass" && <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />}
                      {r.status === "warn" && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />}
                      {r.status === "fail" && <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{r.title}</span>
                          <Badge variant="outline" className="text-xs">{r.durationMs}ms</Badge>
                          {r.severity === "critical" && (
                            <Badge variant="destructive" className="text-xs">CRITICAL</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{r.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}

        {results.length === 0 && !running && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Click <strong>Run Full Audit</strong> to begin a non-destructive system scan.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
