import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, Search, Shield } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  user_email: string | null;
  organization_id: string | null;
  view_scope: "LD" | "LC";
  module: "driver_intelligence" | "fleet_intelligence";
  ownership_scope: "internal" | "third_party" | "mixed" | "none" | null;
  internal_count: number | null;
  third_party_count: number | null;
  record_count: number | null;
  route: string | null;
  accessed_at: string;
}

const PAGE_SIZE = 100;

const IntelligenceAccessLogs = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [userQuery, setUserQuery] = useState("");
  const [tenantQuery, setTenantQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [ownershipFilter, setOwnershipFilter] = useState<string>("all");
  const [scopeFilter, setScopeFilter] = useState<string>("all");

  const fetchRows = async () => {
    setLoading(true);
    let q: any = (supabase as any)
      .from("intelligence_access_logs")
      .select("*")
      .order("accessed_at", { ascending: false })
      .limit(PAGE_SIZE);

    if (moduleFilter !== "all") q = q.eq("module", moduleFilter);
    if (ownershipFilter !== "all") q = q.eq("ownership_scope", ownershipFilter);
    if (scopeFilter !== "all") q = q.eq("view_scope", scopeFilter);
    if (tenantQuery.trim()) q = q.eq("organization_id", tenantQuery.trim());
    if (userQuery.trim()) q = q.ilike("user_email", `%${userQuery.trim()}%`);

    const { data } = await q;
    setRows((data as Row[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleFilter, ownershipFilter, scopeFilter]);

  const downloadCsv = () => {
    const header = ["accessed_at","user_email","user_id","organization_id","view_scope","module","ownership_scope","internal_count","third_party_count","record_count","route"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push(header.map((h) => {
        const v = (r as any)[h];
        if (v == null) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `intelligence-access-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const summary = useMemo(() => {
    const ld = rows.filter(r => r.view_scope === "LD").length;
    const lc = rows.filter(r => r.view_scope === "LC").length;
    const internal = rows.filter(r => r.ownership_scope === "internal").length;
    const tp = rows.filter(r => r.ownership_scope === "third_party").length;
    return { ld, lc, internal, tp };
  }, [rows]);

  return (
    <DashboardLayout title="Intelligence Access Audit" subtitle="Search who viewed Driver/Fleet Intelligence and what scope they saw">
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">LD views</p><p className="text-2xl font-bold">{summary.ld}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">LC views</p><p className="text-2xl font-bold">{summary.lc}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Internal-scope</p><p className="text-2xl font-bold">{summary.internal}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">3PL-scope</p><p className="text-2xl font-bold">{summary.tp}</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <div className="md:col-span-2">
                <Label className="text-xs">User email</Label>
                <Input placeholder="search by email" value={userQuery} onChange={(e) => setUserQuery(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Tenant (organization id)</Label>
                <Input placeholder="paste org UUID" value={tenantQuery} onChange={(e) => setTenantQuery(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Module</Label>
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="driver_intelligence">Driver Intelligence</SelectItem>
                    <SelectItem value="fleet_intelligence">Fleet Intelligence</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Ownership</Label>
                <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="internal">Internal</SelectItem>
                    <SelectItem value="third_party">3PL</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Scope</Label>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="LD">LD</SelectItem>
                    <SelectItem value="LC">LC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-6 flex gap-2 justify-end">
                <Button onClick={fetchRows}><Search className="w-4 h-4 mr-1" /> Apply filters</Button>
                <Button variant="outline" onClick={downloadCsv} disabled={rows.length === 0}>
                  <Download className="w-4 h-4 mr-1" /> Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-auto max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>Ownership</TableHead>
                    <TableHead>Records</TableHead>
                    <TableHead>Route</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading…</TableCell></TableRow>
                  )}
                  {!loading && rows.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No access logs match these filters.</TableCell></TableRow>
                  )}
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(r.accessed_at), "PP p")}</TableCell>
                      <TableCell className="text-xs">{r.user_email || r.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="text-[10px] font-mono">{r.organization_id?.slice(0, 8) || "-"}</TableCell>
                      <TableCell className="text-xs">{r.module === "driver_intelligence" ? "Driver" : "Fleet"}</TableCell>
                      <TableCell><Badge variant="outline">{r.view_scope}</Badge></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {r.ownership_scope === "third_party" ? "3PL" : r.ownership_scope || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {(r.internal_count ?? 0) + (r.third_party_count ?? 0) || (r.record_count ?? 0)}
                        {(r.internal_count || r.third_party_count) ? (
                          <span className="text-[10px] text-muted-foreground ml-1">
                            ({r.internal_count}/{r.third_party_count})
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{r.route || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default IntelligenceAccessLogs;
