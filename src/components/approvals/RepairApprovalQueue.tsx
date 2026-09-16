import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Wrench, AlertTriangle, Pencil } from "lucide-react";
import { format } from "date-fns";

interface PendingRepair {
  id: string;
  vehicle_id: string;
  repair_date: string;
  repair_type: string;
  description: string | null;
  parts_replaced: string | null;
  parts_cost: number | null;
  labour_cost: number | null;
  cost: number | null;
  original_cost: number | null;
  original_parts_cost: number | null;
  original_labour_cost: number | null;
  mileage_at_repair: number | null;
  performed_by: string | null;
  is_breakdown: boolean;
  downtime_days: number | null;
  status: string;
  finance_reviewed_by: string | null;
  finance_note: string | null;
  vehicles?: { registration_number: string; truck_type: string | null } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

type Stage = "finance" | "super_admin";

/**
 * Two-stage repair approval queue.
 *
 * A repair is recorded the moment it happens — the operational record matters
 * whether or not anyone has reviewed the money yet. It then moves through two
 * stages before it becomes a real expense:
 *
 *   pending_finance -> finance_review_repair() (may edit cost) -> pending_super_admin
 *   pending_super_admin -> approve_vehicle_repair() -> approved (books the expense)
 *
 * Either stage can reject; a rejected repair is dead, not resubmitted.
 * super_admin may act at EITHER stage — the top tier is never blocked from
 * approving because finance has not reviewed yet.
 *
 * One component drives both stages via `stage`, rather than two near-copies,
 * so the two views cannot drift the way the fuel/pre-trip dialogs once did.
 */
const RepairApprovalQueue = ({
  organizationId,
  stage,
}: {
  organizationId?: string | null;
  stage: Stage;
}) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<PendingRepair | null>(null);
  const [editParts, setEditParts] = useState("");
  const [editLabour, setEditLabour] = useState("");
  const [editNote, setEditNote] = useState("");

  // super_admin sees BOTH stages — they can act on a repair finance hasn't
  // touched yet, or one finance has already sent on. finance sees only its
  // own stage, since it has no authority over pending_super_admin.
  const statuses = stage === "super_admin"
    ? ["pending_finance", "pending_super_admin"]
    : ["pending_finance"];

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["repair-pending", organizationId, stage],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("vehicle_repairs") as any)
        .select(
          "id, vehicle_id, repair_date, repair_type, description, parts_replaced, parts_cost, labour_cost, cost, original_cost, original_parts_cost, original_labour_cost, mileage_at_repair, performed_by, is_breakdown, downtime_days, status, finance_reviewed_by, finance_note, vehicles(registration_number, truck_type)",
        )
        .eq("organization_id", organizationId!)
        .in("status", statuses)
        .order("repair_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingRepair[];
    },
  });

  const openEdit = (r: PendingRepair) => {
    setEditTarget(r);
    setEditParts(String(r.parts_cost ?? 0));
    setEditLabour(String(r.labour_cost ?? 0));
    setEditNote("");
  };

  const invalidateAfterDecision = () => {
    qc.invalidateQueries({ queryKey: ["repair-pending"] });
    qc.invalidateQueries({ queryKey: ["repair-leaderboard"] });
    qc.invalidateQueries({ queryKey: ["vehicle-repairs"] });
  };

  // Finance's own decision: send to super admin (with whatever cost was
  // edited to, even if unchanged) or reject outright.
  const financeDecide = useMutation({
    mutationFn: async (vars: { id: string; action: "send" | "reject"; parts?: number; labour?: number; note?: string }) => {
      setBusyId(vars.id);
      if (vars.action === "reject") {
        const { error } = await (supabase.rpc as any)("finance_reject_repair", {
          p_repair_id: vars.id, p_note: vars.note || null,
        });
        if (error) throw error;
        return;
      }
      const { error } = await (supabase.rpc as any)("finance_review_repair", {
        p_repair_id: vars.id, p_parts_cost: vars.parts, p_labour_cost: vars.labour, p_note: vars.note || null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({
        title: vars.action === "send" ? "Sent to super admin" : "Repair rejected",
        description: vars.action === "send"
          ? "Awaiting final approval before it books to expenses."
          : "No cost was booked. The repair stays on record as rejected.",
      });
      setEditTarget(null);
      invalidateAfterDecision();
    },
    onError: (e: any) =>
      toast({ title: "Could not complete", description: e?.message ?? "Unknown error", variant: "destructive" }),
    onSettled: () => setBusyId(null),
  });

  // Super admin's final decision. Approving from EITHER pending_finance or
  // pending_super_admin is allowed server-side, so this button works
  // regardless of which stage the row is actually at.
  const finalDecide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      setBusyId(id);
      const fn = action === "approve" ? "approve_vehicle_repair" : "reject_vehicle_repair";
      const { error } = await (supabase.rpc as any)(fn, { p_repair_id: id, p_note: null });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({
        title: vars.action === "approve" ? "Repair approved" : "Repair rejected",
        description: vars.action === "approve"
          ? "The cost is now booked to expenses and counts toward fleet spend."
          : "No cost was booked. The repair stays on record as rejected.",
      });
      invalidateAfterDecision();
    },
    onError: (e: any) =>
      toast({ title: "Could not complete", description: e?.message ?? "Unknown error", variant: "destructive" }),
    onSettled: () => setBusyId(null),
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6"><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  const totalPending = pending.reduce((s, r) => s + Number(r.cost || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                {stage === "finance" ? "Repair Cost Review" : "Repair Final Approval"}
              </CardTitle>
              <CardDescription>
                {stage === "finance"
                  ? "First review — correct the cost if it's wrong, then send it on. Nothing is booked to expenses yet."
                  : "Second and final review. Approving books the cost to expenses."}
              </CardDescription>
            </div>
            {pending.length > 0 && (
              <div className="text-right">
                <p className="text-sm font-semibold">{fmt(totalPending)}</p>
                <p className="text-xs text-muted-foreground">
                  {pending.length} awaiting {stage === "finance" ? "review" : "final approval"}
                </p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {stage === "finance" ? "Nothing awaiting review." : "Nothing awaiting final approval."}
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => {
                const wasRevised = stage === "super_admin"
                  && r.original_cost != null
                  && Number(r.original_cost) !== Number(r.cost);
                return (
                  <div
                    key={r.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">
                          {r.vehicles?.registration_number ?? "Unknown vehicle"}
                        </span>
                        {r.vehicles?.truck_type && (
                          <Badge variant="secondary" className="text-[10px]">
                            {r.vehicles.truck_type}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={
                            r.is_breakdown
                              ? "text-red-600 border-red-500/40 text-[10px]"
                              : "text-green-600 border-green-500/40 text-[10px]"
                          }
                        >
                          {r.is_breakdown ? "Breakdown" : "Planned"}
                        </Badge>
                        {stage === "super_admin" && r.status === "pending_finance" && (
                          <Badge variant="outline" className="text-amber-600 border-amber-500/40 text-[10px]">
                            Not yet reviewed by finance
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm mt-1">{r.repair_type}</p>

                      {r.parts_replaced && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Parts: {r.parts_replaced}
                        </p>
                      )}
                      {r.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                      )}
                      {r.finance_note && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Finance note: {r.finance_note}
                        </p>
                      )}

                      <p className="text-[11px] text-muted-foreground mt-1">
                        {format(new Date(r.repair_date), "d MMM yyyy")}
                        {r.mileage_at_repair ? ` · ${r.mileage_at_repair.toLocaleString()} km` : ""}
                        {r.downtime_days ? ` · ${r.downtime_days}d off road` : ""}
                        {r.performed_by ? ` · ${r.performed_by}` : ""}
                      </p>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-sm font-semibold">{fmt(Number(r.cost || 0))}</span>
                        {Number(r.parts_cost) > 0 && Number(r.labour_cost) > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {fmt(Number(r.parts_cost))} parts · {fmt(Number(r.labour_cost))} labour
                          </span>
                        )}
                        {Number(r.cost || 0) === 0 && (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            No cost recorded
                          </Badge>
                        )}
                      </div>

                      {/* super admin sees what changed, not just the current figure —
                          judging the revision itself matters, not only the final number. */}
                      {wasRevised && (
                        <p className="text-xs text-amber-600 mt-1">
                          Logged at {fmt(Number(r.original_cost))}, finance revised to {fmt(Number(r.cost))}
                        </p>
                      )}
                    </div>

                    {stage === "finance" ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => financeDecide.mutate({ id: r.id, action: "reject" })}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit &amp; send
                        </Button>
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => financeDecide.mutate({ id: r.id, action: "send", parts: Number(r.parts_cost) || 0, labour: Number(r.labour_cost) || 0 })}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Send as-is
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => finalDecide.mutate({ id: r.id, action: "reject" })}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => finalDecide.mutate({ id: r.id, action: "approve" })}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {stage === "finance"
                  ? "Sending forwards it to a super admin for final approval — nothing books to expenses yet."
                  : "Approving books the cost to expenses against the vehicle and counts it toward fleet spend. Rejecting books nothing."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review {editTarget?.vehicles?.registration_number}</DialogTitle>
            <DialogDescription>
              Logged as {editTarget ? fmt(Number(editTarget.original_cost ?? editTarget.cost)) : ""}. Correct it if it's wrong, then send it to a super admin for final approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Parts cost</Label>
                <Input type="number" min={0} value={editParts} onChange={(e) => setEditParts(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Labour cost</Label>
                <Input type="number" min={0} value={editLabour} onChange={(e) => setEditLabour(e.target.value)} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              New total: {fmt((Number(editParts) || 0) + (Number(editLabour) || 0))}
            </p>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                placeholder="Why the figure changed, e.g. mechanic overquoted"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button
              disabled={!editTarget || financeDecide.isPending}
              onClick={() => editTarget && financeDecide.mutate({
                id: editTarget.id, action: "send",
                parts: Number(editParts) || 0, labour: Number(editLabour) || 0,
                note: editNote,
              })}
            >
              Send to super admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RepairApprovalQueue;
