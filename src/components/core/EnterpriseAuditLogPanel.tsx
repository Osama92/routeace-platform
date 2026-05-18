import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollText, Search, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

type Row = {
  id: string;
  occurred_at: string;
  domain: string;
  table_name: string;
  record_id: string | null;
  action: string;
  organization_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  diff_keys: string[] | null;
  before_data: any;
  after_data: any;
};

const DOMAINS = ["all", "finance", "payroll", "dispatch", "maintenance", "ai", "feature_flag"] as const;

export default function EnterpriseAuditLogPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [domain, setDomain] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    let q = (supabase as any).from("enterprise_audit_log").select("*").order("occurred_at", { ascending: false }).limit(200);
    if (domain !== "all") q = q.eq("domain", domain);
    if (search.trim()) q = q.or(`table_name.ilike.%${search}%,actor_email.ilike.%${search}%`);
    const { data, error } = await q;
    if (error) toast.error(error.message); else setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [domain]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-primary" />
            Enterprise Audit Trail
          </h2>
          <p className="text-sm text-muted-foreground">Before/after capture across finance, payroll, dispatch, maintenance, AI.</p>
        </div>
        <div className="flex gap-2">
          <Select value={domain} onValueChange={setDomain}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOMAINS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Search table or actor…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === "Enter" && load()} />
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Refresh
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent events</CardTitle></CardHeader>
          <CardContent className="max-h-[560px] overflow-auto">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Domain</TableHead>
                    <TableHead>Table</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Changed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell className="text-xs">{format(new Date(r.occurred_at), "MMM dd HH:mm:ss")}</TableCell>
                      <TableCell><Badge variant="outline">{r.domain}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{r.table_name}</TableCell>
                      <TableCell><Badge>{r.action}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.actor_email || "-"}</TableCell>
                      <TableCell className="text-xs">{(r.diff_keys || []).slice(0, 3).join(", ") || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diff inspector</CardTitle>
            <CardDescription>{selected ? `${selected.table_name} · ${selected.action}` : "Select a row"}</CardDescription>
          </CardHeader>
          <CardContent className="max-h-[560px] overflow-auto space-y-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Click an event to inspect before/after values.</p>
            ) : (
              <>
                <div>
                  <p className="text-xs font-semibold mb-1">Before</p>
                  <pre className="text-[11px] bg-muted/40 p-2 rounded overflow-auto">{JSON.stringify(selected.before_data, null, 2)}</pre>
                </div>
                <div>
                  <p className="text-xs font-semibold mb-1">After</p>
                  <pre className="text-[11px] bg-muted/40 p-2 rounded overflow-auto">{JSON.stringify(selected.after_data, null, 2)}</pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
