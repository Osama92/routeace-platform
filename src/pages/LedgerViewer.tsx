import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Hash, Link2, AlertTriangle, CheckCircle2 } from "lucide-react";

type LedgerRow = {
  id: string;
  sequence_number: number;
  tenant_id: string | null;
  module: string;
  action_type: string;
  reference_type: string | null;
  reference_id: string | null;
  amount: number | null;
  currency_code: string | null;
  description: string | null;
  metadata: any;
  actor_user_id: string | null;
  previous_hash: string | null;
  entry_hash: string;
  created_at: string;
};

const fmt = (n: number, c = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n);

export default function LedgerViewer() {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantFilter, setTenantFilter] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [modules, setModules] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("immutable_financial_ledger")
      .select("*")
      .order("sequence_number", { ascending: false })
      .limit(200);

    if (tenantFilter) q = q.eq("tenant_id", tenantFilter);
    if (moduleFilter !== "all") q = q.eq("module", moduleFilter);
    if (fromDate) q = q.gte("created_at", fromDate);
    if (toDate) q = q.lte("created_at", toDate + "T23:59:59");

    const { data } = await q;
    const list = (data || []) as LedgerRow[];
    setRows(list);
    setModules(Array.from(new Set(list.map((r) => r.module))).sort());
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // Verify chain integrity per loaded window (top→bottom expects each row's previous_hash to equal the next row's entry_hash, since ordered DESC)
  const verify = (i: number) => {
    if (i === rows.length - 1) return true; // bottom - assume genesis or earlier batch
    return rows[i].previous_hash === rows[i + 1].entry_hash;
  };

  return (
    <DashboardLayout title="Immutable Ledger Viewer" subtitle="SHA256 hash-chained financial entries - append-only, verifiable">
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" /> Filters
            </CardTitle>
            <CardDescription>Tenant ID, module, and date range</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <Input
              placeholder="Tenant UUID (optional)"
              value={tenantFilter}
              onChange={(e) => setTenantFilter(e.target.value)}
            />
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger><SelectValue placeholder="Module" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modules</SelectItem>
                {modules.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Apply"}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Entries</CardTitle>
            <CardDescription>
              Showing latest {rows.length} entries · each row's hash links to the previous in the chain
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading ledger…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No ledger entries match these filters.</div>
            ) : (
              <div className="space-y-1 max-h-[60vh] overflow-auto">
                {rows.map((r, i) => {
                  const intact = verify(i);
                  return (
                    <div key={r.id} className="border border-border/50 rounded-md px-3 py-2 text-sm">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="outline" className="text-[10px] font-mono shrink-0">#{r.sequence_number}</Badge>
                          <Badge variant="outline" className="text-[10px] shrink-0">{r.module}</Badge>
                          <Badge variant="outline" className="text-[10px] shrink-0 bg-primary/10 text-primary border-primary/30">
                            {r.action_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate">{r.description || "-"}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {r.amount != null && Number(r.amount) !== 0 && (
                            <span className="font-medium text-sm">{fmt(Number(r.amount), r.currency_code || "NGN")}</span>
                          )}
                          {intact ? (
                            <Badge variant="outline" className="gap-1 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              <CheckCircle2 className="w-2.5 h-2.5" /> Chain intact
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1 text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                              <AlertTriangle className="w-2.5 h-2.5" /> Hash mismatch
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 grid grid-cols-1 md:grid-cols-2 gap-1 text-[10px] font-mono text-muted-foreground">
                        <div className="flex items-center gap-1 truncate" title={r.entry_hash}>
                          <Hash className="w-2.5 h-2.5 shrink-0" /> {r.entry_hash.slice(0, 32)}…
                        </div>
                        <div className="flex items-center gap-1 truncate" title={r.previous_hash || ""}>
                          <Link2 className="w-2.5 h-2.5 shrink-0" /> prev: {(r.previous_hash || "GENESIS").slice(0, 32)}…
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(r.created_at).toLocaleString()}
                        {r.tenant_id && <> · tenant {r.tenant_id.slice(0, 8)}</>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
