import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, AlertTriangle, ArrowRight } from "lucide-react";
import { recordCfoEvent } from "@/lib/cfoAudit";

type ARRow = {
  id: string;
  balance: number;
  due_date: string | null;
  status: string;
  invoice_id: string | null;
  customer_id: string | null;
};

type Bucket = { label: string; range: string; total: number; count: number; tone: string };

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const daysBetween = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

export default function ARDrilldownPanel() {
  const [rows, setRows] = useState<ARRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recordCfoEvent({ moduleKey: "ar_drilldown", eventType: "view" });
    (async () => {
      const { data } = await supabase
        .from("accounts_receivable")
        .select("id, balance, due_date, status, invoice_id, customer_id")
        .neq("status", "paid")
        .order("due_date", { ascending: true });
      setRows((data || []) as ARRow[]);
      setLoading(false);
    })();
  }, []);

  const buckets: Bucket[] = (() => {
    const b = {
      current: { total: 0, count: 0 },
      d30: { total: 0, count: 0 },
      d60: { total: 0, count: 0 },
      d90: { total: 0, count: 0 },
      d90p: { total: 0, count: 0 },
    };
    rows.forEach((r) => {
      const bal = Number(r.balance || 0);
      if (!r.due_date) { b.current.total += bal; b.current.count++; return; }
      const age = daysBetween(r.due_date);
      if (age <= 0) { b.current.total += bal; b.current.count++; }
      else if (age <= 30) { b.d30.total += bal; b.d30.count++; }
      else if (age <= 60) { b.d60.total += bal; b.d60.count++; }
      else if (age <= 90) { b.d90.total += bal; b.d90.count++; }
      else { b.d90p.total += bal; b.d90p.count++; }
    });
    return [
      { label: "Current", range: "Not yet due", ...b.current, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
      { label: "1–30 days", range: "Early overdue", ...b.d30, tone: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
      { label: "31–60 days", range: "Late", ...b.d60, tone: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
      { label: "61–90 days", range: "Critical", ...b.d90, tone: "bg-destructive/10 text-destructive border-destructive/30" },
      { label: "90+ days", range: "Write-off risk", ...b.d90p, tone: "bg-destructive/15 text-destructive border-destructive/40" },
    ];
  })();

  const topOverdue = rows
    .filter((r) => r.due_date && daysBetween(r.due_date) > 0)
    .sort((a, b) => Number(b.balance) - Number(a.balance))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" /> AR Aging Drilldown
        </CardTitle>
        <CardDescription>Outstanding receivables by overdue bucket with enforcement suggestions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading aging buckets…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {buckets.map((b) => (
                <div key={b.label} className={`rounded-lg border p-3 ${b.tone}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">{b.label}</div>
                  <div className="text-sm font-bold mt-1">{fmt(b.total)}</div>
                  <div className="text-[10px] mt-0.5 opacity-80">{b.count} invoice{b.count === 1 ? "" : "s"}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Top 5 overdue</div>
              {topOverdue.length === 0 ? (
                <div className="text-sm text-muted-foreground">No overdue receivables. 🎉</div>
              ) : (
                <div className="space-y-1">
                  {topOverdue.map((r) => {
                    const age = daysBetween(r.due_date!);
                    const action = age > 90 ? "Send legal notice"
                      : age > 60 ? "Escalate to collections"
                      : age > 30 ? "Send reminder + WhatsApp"
                      : "Send polite reminder";
                    return (
                      <div key={r.id} className="flex items-center justify-between text-sm border border-border/50 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{fmt(Number(r.balance))}</div>
                          <div className="text-xs text-muted-foreground">{age}d overdue</div>
                        </div>
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <AlertTriangle className="w-3 h-3" /> {action}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1"
              onClick={() => {
                recordCfoEvent({ moduleKey: "ar_drilldown", eventType: "click", metadata: { action: "open_collections" } });
                window.location.href = "/cfo/ar";
              }}
            >
              Open AR workspace <ArrowRight className="w-3 h-3" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
