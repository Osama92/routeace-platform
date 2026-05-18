import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, AlertTriangle, RefreshCcw, ArrowLeft, Search, Inbox } from "lucide-react";
import { recordCfoEvent } from "@/lib/cfoAudit";
import { Link } from "react-router-dom";

type APRow = {
  id: string;
  balance: number;
  amount_due: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  vendor_name: string;
  category: string | null;
  reference_number: string | null;
  currency_code: string | null;
};

const fmt = (n: number, c = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

export default function APWorkspace() {
  const [rows, setRows] = useState<APRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error: e } = await supabase
        .from("accounts_payable")
        .select("id, balance, amount_due, amount_paid, due_date, status, vendor_name, category, reference_number, currency_code")
        .neq("status", "paid")
        .order("due_date", { ascending: true });
      if (!e) {
        setRows((data || []) as APRow[]);
        setLoading(false);
        return;
      }
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    setError(lastErr?.message || "Failed to load payables");
    setLoading(false);
  }, []);

  useEffect(() => {
    recordCfoEvent({ moduleKey: "ap_workspace", eventType: "view" });
    load();
  }, [load]);

  const filtered = rows.filter((r) =>
    !query
      ? true
      : (r.vendor_name || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.reference_number || "").toLowerCase().includes(query.toLowerCase()),
  );

  const buckets = (() => {
    const b = { overdue: 0, due7: 0, due30: 0, later: 0 };
    rows.forEach((r) => {
      const bal = Number(r.balance || 0);
      if (!r.due_date) {
        b.later += bal;
        return;
      }
      const d = daysUntil(r.due_date);
      if (d < 0) b.overdue += bal;
      else if (d <= 7) b.due7 += bal;
      else if (d <= 30) b.due30 += bal;
      else b.later += bal;
    });
    return b;
  })();

  const totalOutstanding = rows.reduce((s, r) => s + Number(r.balance || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <Link to="/ai-cfo" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> Back to AI CFO
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Banknote className="w-6 h-6 text-primary" /> AP Workspace
            </h1>
            <p className="text-sm text-muted-foreground">Vendor payables, urgency, and cash-conservation actions</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCcw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total outstanding</CardDescription>
              <CardTitle className="text-lg">{fmt(totalOutstanding)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-destructive">Overdue</CardDescription>
              <CardTitle className="text-lg text-destructive">{fmt(buckets.overdue)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-amber-600">Due ≤ 7 days</CardDescription>
              <CardTitle className="text-lg text-amber-600">{fmt(buckets.due7)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-primary">Due ≤ 30 days</CardDescription>
              <CardTitle className="text-lg text-primary">{fmt(buckets.due30)}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Later / undated</CardDescription>
              <CardTitle className="text-lg">{fmt(buckets.later)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Open payables</CardTitle>
                <CardDescription>Sorted by due date · click action for guidance</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs"
                  placeholder="Search vendor or reference…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading payables…</div>
            ) : error ? (
              <div className="text-sm text-destructive py-8 text-center space-y-2">
                <div>Could not load payables: {error}</div>
                <Button size="sm" variant="outline" onClick={load} className="gap-1">
                  <RefreshCcw className="w-3 h-3" /> Try again
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Inbox className="w-8 h-8 mx-auto opacity-50" />
                <div className="text-sm">No outstanding payables match your filter.</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((r) => {
                  const d = r.due_date ? daysUntil(r.due_date) : null;
                  const action =
                    d === null
                      ? "Confirm due date"
                      : d < 0
                      ? "Pay immediately"
                      : d <= 3
                      ? "Schedule payment now"
                      : d <= 14
                      ? "Negotiate longer terms"
                      : "Hold - preserve cash";
                  const tone =
                    d !== null && d < 0
                      ? "border-destructive/40 bg-destructive/5"
                      : d !== null && d <= 7
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border/50";
                  return (
                    <div key={r.id} className={`flex items-center justify-between text-sm border rounded-md px-3 py-2 ${tone}`}>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{r.vendor_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmt(Number(r.balance), r.currency_code || "NGN")}
                          {r.reference_number ? ` · ${r.reference_number}` : ""}
                          {d === null ? " · no due date" : d < 0 ? ` · ${Math.abs(d)}d overdue` : ` · due in ${d}d`}
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1 text-[10px] shrink-0">
                        <AlertTriangle className="w-3 h-3" /> {action}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
