import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, AlertTriangle, ArrowRight } from "lucide-react";
import { recordCfoEvent } from "@/lib/cfoAudit";

type APRow = {
  id: string;
  balance: number;
  due_date: string | null;
  status: string;
  vendor_name: string;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const daysUntil = (d: string) => Math.floor((new Date(d).getTime() - Date.now()) / 86400000);

export default function APDrilldownPanel() {
  const [rows, setRows] = useState<APRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    recordCfoEvent({ moduleKey: "ap_drilldown", eventType: "view" });
    (async () => {
      const { data } = await supabase
        .from("accounts_payable")
        .select("id, balance, due_date, status, vendor_name")
        .neq("status", "paid")
        .order("due_date", { ascending: true });
      setRows((data || []) as APRow[]);
      setLoading(false);
    })();
  }, []);

  const buckets = (() => {
    const b = { overdue: 0, due7: 0, due30: 0, later: 0 };
    rows.forEach((r) => {
      const bal = Number(r.balance || 0);
      if (!r.due_date) { b.later += bal; return; }
      const d = daysUntil(r.due_date);
      if (d < 0) b.overdue += bal;
      else if (d <= 7) b.due7 += bal;
      else if (d <= 30) b.due30 += bal;
      else b.later += bal;
    });
    return b;
  })();

  const topUrgent = rows
    .filter((r) => r.due_date)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary" /> AP Drilldown
        </CardTitle>
        <CardDescription>Vendor payables by urgency with cash-conservation suggestions</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading payables…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-destructive opacity-80">Overdue</div>
                <div className="text-sm font-bold text-destructive mt-1">{fmt(buckets.overdue)}</div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-amber-600 opacity-80">Due ≤ 7 days</div>
                <div className="text-sm font-bold text-amber-600 mt-1">{fmt(buckets.due7)}</div>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3">
                <div className="text-[10px] uppercase tracking-wide text-primary opacity-80">Due ≤ 30 days</div>
                <div className="text-sm font-bold text-primary mt-1">{fmt(buckets.due30)}</div>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Later / no date</div>
                <div className="text-sm font-bold mt-1">{fmt(buckets.later)}</div>
              </div>
            </div>

            <div>
              <div className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Most urgent vendors</div>
              {topUrgent.length === 0 ? (
                <div className="text-sm text-muted-foreground">No outstanding payables.</div>
              ) : (
                <div className="space-y-1">
                  {topUrgent.map((r) => {
                    const d = daysUntil(r.due_date!);
                    const action = d < 0 ? "Pay immediately"
                      : d <= 3 ? "Schedule payment now"
                      : d <= 14 ? "Negotiate longer terms"
                      : "Hold - preserve cash";
                    return (
                      <div key={r.id} className="flex items-center justify-between text-sm border border-border/50 rounded-md px-3 py-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.vendor_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {fmt(Number(r.balance))} · {d < 0 ? `${Math.abs(d)}d overdue` : `due in ${d}d`}
                          </div>
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
                recordCfoEvent({ moduleKey: "ap_drilldown", eventType: "click", metadata: { action: "open_payables" } });
                window.location.href = "/cfo/ap";
              }}
            >
              Open AP workspace <ArrowRight className="w-3 h-3" />
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
