import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { appendLedgerEntry, recordCfoEvent } from "@/lib/cfoAudit";

type Expense = {
  id: string;
  amount: number;
  category: string | null;
  description: string | null;
  approval_status: string | null;
  expense_date: string | null;
  vendor_id: string | null;
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

function classify(e: Expense): { recommendation: "approve" | "review" | "reject"; reason: string } {
  const amt = Number(e.amount || 0);
  if (amt > 500_000) return { recommendation: "review", reason: "Above ₦500k - Super Admin review required" };
  if (amt > 100_000) return { recommendation: "review", reason: "Above ₦100k - verify vendor + receipt" };
  if (!e.vendor_id) return { recommendation: "review", reason: "Missing vendor - cannot validate" };
  return { recommendation: "approve", reason: "Within auto-approve threshold (≤ ₦100k, vendor known)" };
}

export default function ExpenseApprovalAI() {
  const [pending, setPending] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("expenses")
      .select("id, amount, category, description, approval_status, expense_date, vendor_id")
      .or("approval_status.is.null,approval_status.eq.pending")
      .order("expense_date", { ascending: false })
      .limit(10);
    const list = ((data as unknown) as Expense[]) || [];
    setPending(list);
    setLoading(false);
    if (list.length > 0) {
      recordCfoEvent({
        moduleKey: "expense_approval_ai",
        eventType: "recommendation_shown",
        recommendation: `${list.length} pending expenses scored`,
        metadata: { count: list.length },
      });
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (e: Expense, decision: "approved" | "rejected") => {
    setActingId(e.id);
    try {
      const { error: upErr } = await supabase
        .from("expenses")
        .update({ approval_status: decision, approved_at: new Date().toISOString() })
        .eq("id", e.id);
      if (upErr) throw upErr;

      const ledger = await appendLedgerEntry({
        module: "expense_approval_ai",
        actionType: decision === "approved" ? "expense_approved" : "expense_rejected",
        referenceType: "expense",
        referenceId: e.id,
        amount: Number(e.amount || 0),
        currency: "NGN",
        description: `Expense ${decision} via AI CFO: ${e.description || e.category || "-"}`,
        metadata: { vendor_id: e.vendor_id, category: e.category },
      });

      await recordCfoEvent({
        moduleKey: "expense_approval_ai",
        eventType: "action_taken",
        recommendation: `${decision} ${fmt(Number(e.amount))}`,
        ledgerEntryHash: ledger.entry_hash,
        metadata: { expense_id: e.id, decision },
      });

      toast.success(`Expense ${decision} · ledger #${ledger.sequence_number}`);
      setPending((prev) => prev.filter((x) => x.id !== e.id));
    } catch (err: any) {
      toast.error(err?.message || `Failed to ${decision === "approved" ? "approve" : "reject"} expense`);
    } finally {
      setActingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-primary" /> Expense Approval AI
        </CardTitle>
        <CardDescription>
          AI scores each pending expense; approvals create immutable ledger entries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> Scoring pending expenses…
          </div>
        ) : pending.length === 0 ? (
          <div className="text-sm text-muted-foreground">No pending expenses awaiting CFO review. 🎉</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {pending.map((e) => {
              const { recommendation, reason } = classify(e);
              const tone = recommendation === "approve"
                ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                : "bg-amber-500/15 text-amber-600 border-amber-500/30";
              return (
                <div key={e.id} className="border border-border/50 rounded-md px-3 py-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">
                        {fmt(Number(e.amount))} · {e.category || "-"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.description || "no description"}
                      </div>
                    </div>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${tone}`}>
                      {recommendation}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground italic">AI: {reason}</div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs gap-1"
                      disabled={actingId === e.id}
                      onClick={() => act(e, "approved")}
                    >
                      <CheckCircle2 className="w-3 h-3" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                      disabled={actingId === e.id}
                      onClick={() => act(e, "rejected")}
                    >
                      <XCircle className="w-3 h-3" /> Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
