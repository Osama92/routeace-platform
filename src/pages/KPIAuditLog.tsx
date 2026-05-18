import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface Row {
  id: string;
  computed_at: string;
  user_id: string;
  role_tag: string;
  metric_key: string;
  source_module: string;
  period_start: string;
  period_end: string;
  actual_value: number;
  target_value: number;
  performance_pct: number;
  inputs: Record<string, unknown>;
  formula: string | null;
}

export default function KPIAuditLog() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("kpi_audit_log")
      .select("*")
      .order("computed_at", { ascending: false })
      .limit(300);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  }

  const filtered = filter
    ? rows.filter((r) => r.metric_key.includes(filter) || r.role_tag.includes(filter) || r.user_id.includes(filter))
    : rows;

  return (
    <DashboardLayout title="KPI Audit Log" subtitle="Immutable record of every KPI computation - source, inputs, formula, score.">
      <div className="container mx-auto px-4 py-6 space-y-4 max-w-6xl">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Append-only. Visible to Admin & Super Admin only.
          </p>
          <div className="flex gap-2">
            <Input placeholder="Filter by metric / role / user id" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-72" />
            <Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Latest 300 entries</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              <div className="divide-y">
                {filtered.map((r) => (
                  <details key={r.id} className="py-2">
                    <summary className="cursor-pointer flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{r.metric_key}</Badge>
                        <span className="text-muted-foreground">{r.role_tag}</span>
                        <span className="text-xs text-muted-foreground">{r.source_module}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{new Date(r.computed_at).toLocaleString()}</span>
                        <Badge variant="outline">{r.performance_pct}%</Badge>
                      </div>
                    </summary>
                    <div className="mt-2 ml-2 p-3 rounded bg-muted/40 text-xs space-y-1">
                      <div><strong>User:</strong> <code>{r.user_id}</code></div>
                      <div><strong>Period:</strong> {r.period_start} → {r.period_end}</div>
                      <div><strong>Actual:</strong> {r.actual_value} · <strong>Target:</strong> {r.target_value}</div>
                      {r.formula && <div><strong>Formula:</strong> <code>{r.formula}</code></div>}
                      <div><strong>Inputs:</strong></div>
                      <pre className="bg-background border rounded p-2 overflow-x-auto">{JSON.stringify(r.inputs, null, 2)}</pre>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
