import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Row = {
  table_name: string;
  rls_enabled: boolean;
  policy_count: number;
  has_organization_id: boolean;
  has_tenant_id: boolean;
  has_user_id: boolean;
  has_indirect_link: boolean;
  verdict:
    | "CRITICAL_RLS_OFF"
    | "CRITICAL_NO_POLICIES"
    | "OK_TENANT_SCOPED"
    | "OK_INDIRECT_SCOPED"
    | "OK_USER_SCOPED"
    | "REVIEW_GLOBAL_OR_REFERENCE";
};

const verdictMeta: Record<Row["verdict"], { label: string; cls: string }> = {
  CRITICAL_RLS_OFF:           { label: "RLS off",            cls: "bg-destructive/15 text-destructive" },
  CRITICAL_NO_POLICIES:       { label: "No policies",        cls: "bg-destructive/15 text-destructive" },
  OK_TENANT_SCOPED:           { label: "Tenant-scoped",      cls: "bg-emerald-500/15 text-emerald-600" },
  OK_INDIRECT_SCOPED:         { label: "Indirect (FK)",      cls: "bg-sky-500/15 text-sky-600" },
  OK_USER_SCOPED:             { label: "User-scoped",        cls: "bg-violet-500/15 text-violet-600" },
  REVIEW_GLOBAL_OR_REFERENCE: { label: "Review",             cls: "bg-amber-500/15 text-amber-600" },
};

export default function TenantIsolationAuditPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [showOnly, setShowOnly] = useState<"all" | "critical" | "review">("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_tenant_isolation_audit");
    if (error) toast.error(error.message);
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const s = { total: rows.length, critical: 0, tenant: 0, indirect: 0, user: 0, review: 0 };
    rows.forEach(r => {
      if (r.verdict.startsWith("CRITICAL")) s.critical++;
      else if (r.verdict === "OK_TENANT_SCOPED") s.tenant++;
      else if (r.verdict === "OK_INDIRECT_SCOPED") s.indirect++;
      else if (r.verdict === "OK_USER_SCOPED") s.user++;
      else s.review++;
    });
    return s;
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (filter && !r.table_name.toLowerCase().includes(filter.toLowerCase())) return false;
      if (showOnly === "critical" && !r.verdict.startsWith("CRITICAL")) return false;
      if (showOnly === "review" && r.verdict !== "REVIEW_GLOBAL_OR_REFERENCE") return false;
      return true;
    });
  }, [rows, filter, showOnly]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            {stats.critical === 0 ? (
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-destructive" />
            )}
            Tenant Isolation Map
          </h2>
          <p className="text-sm text-muted-foreground">
            Read-only posture audit of every public table - RLS state, policy count, and tenant scope.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total tables" value={stats.total} />
        <StatCard label="Critical" value={stats.critical} tone={stats.critical > 0 ? "danger" : "ok"} />
        <StatCard label="Tenant-scoped" value={stats.tenant} tone="ok" />
        <StatCard label="Indirect (FK)" value={stats.indirect} tone="info" />
        <StatCard label="Review" value={stats.review} tone="warn" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tables</CardTitle>
          <CardDescription>Filter by name or focus on items needing review.</CardDescription>
          <div className="flex gap-2 pt-2">
            <Input placeholder="Search table name…" value={filter} onChange={e => setFilter(e.target.value)} className="max-w-xs" />
            <Button size="sm" variant={showOnly === "all" ? "default" : "outline"} onClick={() => setShowOnly("all")}>All</Button>
            <Button size="sm" variant={showOnly === "critical" ? "default" : "outline"} onClick={() => setShowOnly("critical")}>Critical</Button>
            <Button size="sm" variant={showOnly === "review" ? "default" : "outline"} onClick={() => setShowOnly("review")}>Review</Button>
          </div>
        </CardHeader>
        <CardContent className="max-h-[560px] overflow-auto">
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Table</TableHead>
                  <TableHead>Verdict</TableHead>
                  <TableHead className="text-center">RLS</TableHead>
                  <TableHead className="text-center">Policies</TableHead>
                  <TableHead className="text-center">org_id</TableHead>
                  <TableHead className="text-center">tenant_id</TableHead>
                  <TableHead className="text-center">user_id</TableHead>
                  <TableHead className="text-center">FK link</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => {
                  const m = verdictMeta[r.verdict];
                  return (
                    <TableRow key={r.table_name}>
                      <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                      <TableCell><Badge className={m.cls}>{m.label}</Badge></TableCell>
                      <TableCell className="text-center">{r.rls_enabled ? "✓" : "✗"}</TableCell>
                      <TableCell className="text-center">{r.policy_count}</TableCell>
                      <TableCell className="text-center">{r.has_organization_id ? "✓" : "-"}</TableCell>
                      <TableCell className="text-center">{r.has_tenant_id ? "✓" : "-"}</TableCell>
                      <TableCell className="text-center">{r.has_user_id ? "✓" : "-"}</TableCell>
                      <TableCell className="text-center">{r.has_indirect_link ? "✓" : "-"}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ok" | "warn" | "danger" | "info" | "neutral" }) {
  const cls =
    tone === "ok" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "danger" ? "text-destructive" :
    tone === "info" ? "text-sky-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}
