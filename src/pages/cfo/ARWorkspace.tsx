import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, AlertTriangle, RefreshCcw, ArrowLeft, Search, Inbox } from "lucide-react";
import { recordCfoEvent } from "@/lib/cfoAudit";
import { Link } from "react-router-dom";

type ARRow = {
  id: string;
  balance: number;
  amount_due: number;
  amount_paid: number;
  due_date: string | null;
  status: string;
  invoice_id: string | null;
  customer_id: string | null;
  currency_code: string | null;
};

const fmt = (n: number, c = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(n || 0);

const daysBetween = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

export default function ARWorkspace() {
  const [rows, setRows] = useState<ARRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error: e } = await supabase
        .from("accounts_receivable")
        .select("id, balance, amount_due, amount_paid, due_date, status, invoice_id, customer_id, currency_code")
        .neq("status", "paid")
        .order("due_date", { ascending: true });
      if (!e) {
        setRows((data || []) as ARRow[]);
        setLoading(false);
        return;
      }
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
    setError(lastErr?.message || "Failed to load receivables");
    setLoading(false);
  }, []);

  useEffect(() => {
    recordCfoEvent({ moduleKey: "ar_workspace", eventType: "view" });
    load();
  }, [load]);

  const filtered = rows.filter((r) =>
    !query
      ? true
      : (r.invoice_id || "").toLowerCase().includes(query.toLowerCase()) ||
        (r.customer_id || "").toLowerCase().includes(query.toLowerCase()),
  );

  const buckets = (() => {
    const b = { current: 0, d30: 0, d60: 0, d90: 0, d90p: 0 };
    rows.forEach((r) => {
      const bal = Number(r.balance || 0);
      if (!r.due_date) {
        b.current += bal;
        return;
      }
      const age = daysBetween(r.due_date);
      if (age <= 0) b.current += bal;
      else if (age <= 30) b.d30 += bal;
      else if (age <= 60) b.d60 += bal;
      else if (age <= 90) b.d90 += bal;
      else b.d90p += bal;
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
              <Receipt className="w-6 h-6 text-primary" /> AR Workspace
            </h1>
            <p className="text-sm text-muted-foreground">Receivables aging, top overdue, and enforcement actions</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1">
            <RefreshCcw className="w-3 h-3" /> Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="text-xs">Total outstanding</CardDescription>
              <CardTitle className="text-lg">{fmt(totalOutstanding)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-emerald-600">Current</CardDescription>
              <CardTitle className="text-lg text-emerald-600">{fmt(buckets.current)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-amber-600">1–30 days</CardDescription>
              <CardTitle className="text-lg text-amber-600">{fmt(buckets.d30)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-orange-600">31–60 days</CardDescription>
              <CardTitle className="text-lg text-orange-600">{fmt(buckets.d60)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-destructive">61–90 days</CardDescription>
              <CardTitle className="text-lg text-destructive">{fmt(buckets.d90)}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-destructive/40 bg-destructive/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs text-destructive">90+ days</CardDescription>
              <CardTitle className="text-lg text-destructive">{fmt(buckets.d90p)}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Open receivables</CardTitle>
                <CardDescription>Sorted by due date · enforcement guidance per row</CardDescription>
              </div>
              <div className="relative w-full max-w-xs">
                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-7 h-8 text-xs"
                  placeholder="Search invoice or customer…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading receivables…</div>
            ) : error ? (
              <div className="text-sm text-destructive py-8 text-center space-y-2">
                <div>Could not load receivables: {error}</div>
                <Button size="sm" variant="outline" onClick={load} className="gap-1">
                  <RefreshCcw className="w-3 h-3" /> Try again
                </Button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground space-y-2">
                <Inbox className="w-8 h-8 mx-auto opacity-50" />
                <div className="text-sm">No outstanding receivables. 🎉</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((r) => {
                  const age = r.due_date ? daysBetween(r.due_date) : 0;
                  const overdue = age > 0;
                  const action = !overdue
                    ? "On track"
                    : age > 90
                    ? "Send legal notice"
                    : age > 60
                    ? "Escalate to collections"
                    : age > 30
                    ? "Send reminder + WhatsApp"
                    : "Send polite reminder";
                  const tone =
                    age > 60
                      ? "border-destructive/40 bg-destructive/5"
                      : age > 30
                      ? "border-orange-500/30 bg-orange-500/5"
                      : age > 0
                      ? "border-amber-500/30 bg-amber-500/5"
                      : "border-border/50";
                  return (
                    <div key={r.id} className={`flex items-center justify-between text-sm border rounded-md px-3 py-2 ${tone}`}>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium truncate">{fmt(Number(r.balance), r.currency_code || "NGN")}</div>
                        <div className="text-xs text-muted-foreground">
                          {overdue ? `${age}d overdue` : "Not yet due"}
                          {r.invoice_id ? ` · inv ${String(r.invoice_id).slice(0, 8)}` : ""}
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
