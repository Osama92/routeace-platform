import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Wrench, AlertTriangle } from "lucide-react";
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
  mileage_at_repair: number | null;
  performed_by: string | null;
  is_breakdown: boolean;
  downtime_days: number | null;
  vehicles?: { registration_number: string; truck_type: string | null } | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

/**
 * Repair approval queue.
 *
 * A repair is recorded the moment it happens — the operational record matters
 * whether or not anyone has reviewed the money yet — but stays 'pending' until
 * a super admin approves it. Approval is what books the expense, so nothing
 * here has reached the accounts.
 *
 * The reviewer needs the parts/labour split and the odometer to judge whether
 * a figure is reasonable, so the row shows them rather than a bare total.
 */
const RepairApprovalQueue = ({ organizationId }: { organizationId?: string | null }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["repair-pending", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("vehicle_repairs") as any)
        .select(
          "id, vehicle_id, repair_date, repair_type, description, parts_replaced, parts_cost, labour_cost, cost, mileage_at_repair, performed_by, is_breakdown, downtime_days, vehicles(registration_number, truck_type)",
        )
        .eq("organization_id", organizationId!)
        .eq("status", "pending")
        .order("repair_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingRepair[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      setBusyId(id);
      const fn = action === "approve" ? "approve_vehicle_repair" : "reject_vehicle_repair";
      const { error } = await (supabase.rpc as any)(fn, { p_repair_id: id, p_note: null });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({
        title: vars.action === "approve" ? "Repair approved" : "Repair rejected",
        description:
          vars.action === "approve"
            ? "The cost is now booked to expenses and counts toward fleet spend."
            : "No cost was booked. The repair stays on record as rejected.",
      });
      qc.invalidateQueries({ queryKey: ["repair-pending"] });
      qc.invalidateQueries({ queryKey: ["repair-leaderboard"] });
      qc.invalidateQueries({ queryKey: ["vehicle-repairs"] });
    },
    onError: (e: any) =>
      toast({
        title: "Could not complete",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      }),
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Repair Approvals
            </CardTitle>
            <CardDescription>
              Workshop costs on owned trucks. Nothing is booked to expenses until approved.
            </CardDescription>
          </div>
          {pending.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-semibold">{fmt(totalPending)}</p>
              <p className="text-xs text-muted-foreground">
                {pending.length} awaiting approval
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nothing awaiting approval.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((r) => (
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

                  <p className="text-[11px] text-muted-foreground mt-1">
                    {format(new Date(r.repair_date), "d MMM yyyy")}
                    {r.mileage_at_repair ? ` · ${r.mileage_at_repair.toLocaleString()} km` : ""}
                    {r.downtime_days ? ` · ${r.downtime_days}d off road` : ""}
                    {r.performed_by ? ` · ${r.performed_by}` : ""}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-sm font-semibold">{fmt(Number(r.cost || 0))}</span>
                    {/* The split is what lets a reviewer judge the figure —
                        a large parts bill reads differently to a large
                        labour bill on the same total. */}
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
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r.id}
                    onClick={() => decide.mutate({ id: r.id, action: "reject" })}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    disabled={busyId === r.id}
                    onClick={() => decide.mutate({ id: r.id, action: "approve" })}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Approve
                  </Button>
                </div>
              </div>
            ))}

            <p className="text-xs text-muted-foreground flex items-start gap-1.5 pt-1">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Approving books the cost to expenses against the vehicle and counts it
              toward fleet spend. Rejecting books nothing.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepairApprovalQueue;
