import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Check, X, TrendingUp, TrendingDown, Tag } from "lucide-react";
import { format } from "date-fns";

interface PendingRate {
  id: string;
  zone: string;
  pickup_location: string | null;
  truck_type: string;
  driver_type: string;
  rate_amount: number;
  is_net: boolean;
  version: number;
  supersedes_id: string | null;
  submitted_at: string | null;
  review_note: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);

const prettyZone = (z: string) =>
  z.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Rate Card approval queue.
 *
 * Finance proposes rates; a super admin approves them here. Only approved
 * rates are visible to dispatch, so nothing priced by this queue reaches a
 * customer without review.
 *
 * A proposal that carries `supersedes_id` is a CHANGE to a live rate. The
 * existing rate keeps serving dispatch until this one is approved, so the
 * queue shows the old and new amounts side by side — approving is a pricing
 * decision and the reviewer needs to see the delta, not just the new number.
 */
const RateCardApprovalQueue = ({ organizationId }: { organizationId?: string | null }) => {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["rate-card-pending", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("trip_rate_config") as any)
        .select("id, zone, pickup_location, truck_type, driver_type, rate_amount, is_net, version, supersedes_id, submitted_at, review_note")
        .eq("organization_id", organizationId!)
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PendingRate[];
    },
  });

  // The rates being replaced, so the reviewer sees what is changing.
  const supersededIds = pending.map((p) => p.supersedes_id).filter(Boolean) as string[];
  const { data: currentRates = [] } = useQuery({
    queryKey: ["rate-card-superseded", supersededIds.join(",")],
    enabled: supersededIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase.from("trip_rate_config") as any)
        .select("id, rate_amount")
        .in("id", supersededIds);
      if (error) throw error;
      return (data ?? []) as { id: string; rate_amount: number }[];
    },
  });
  const currentById = new Map(currentRates.map((r) => [r.id, Number(r.rate_amount)]));

  const decide = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const fn = action === "approve" ? "approve_trip_rate" : "reject_trip_rate";
      const { error } = await (supabase.rpc as any)(fn, { p_rate_id: id, p_note: null });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast({
        title: vars.action === "approve" ? "Rate approved" : "Rate rejected",
        description:
          vars.action === "approve"
            ? "It is now available to dispatch."
            : "Finance can revise and resubmit it.",
      });
      qc.invalidateQueries({ queryKey: ["rate-card-pending"] });
      qc.invalidateQueries({ queryKey: ["rate-card-superseded"] });
    },
    onError: (e: any) => {
      toast({
        title: "Could not complete",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              Rate Card Approvals
            </CardTitle>
            <CardDescription>
              Rates submitted by finance. Only approved rates are used to price dispatches.
            </CardDescription>
          </div>
          {pending.length > 0 && (
            <Badge variant="secondary">{pending.length} pending</Badge>
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
            {pending.map((r) => {
              const previous = r.supersedes_id ? currentById.get(r.supersedes_id) : undefined;
              const isChange = previous !== undefined;
              const wentUp = isChange && Number(r.rate_amount) > previous!;

              return (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {prettyZone(r.zone)} · {r.truck_type}
                      <span className="text-muted-foreground font-normal">
                        {" "}· {r.driver_type}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {isChange ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {fmt(previous!)}
                          </span>
                          <span className="text-sm font-semibold">{fmt(Number(r.rate_amount))}</span>
                          <Badge
                            variant="outline"
                            className={
                              wentUp
                                ? "text-red-600 border-red-500/40"
                                : "text-green-600 border-green-500/40"
                            }
                          >
                            {wentUp ? (
                              <TrendingUp className="w-3 h-3 mr-1" />
                            ) : (
                              <TrendingDown className="w-3 h-3 mr-1" />
                            )}
                            {Math.abs(
                              Math.round(((Number(r.rate_amount) - previous!) / previous!) * 100),
                            )}
                            %
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">v{r.version}</Badge>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-semibold">{fmt(Number(r.rate_amount))}</span>
                          <Badge variant="secondary" className="text-[10px]">New rate</Badge>
                        </>
                      )}
                      {r.is_net && (
                        <Badge variant="outline" className="text-[10px]">Net</Badge>
                      )}
                    </div>
                    {r.review_note && (
                      <p className="text-xs text-muted-foreground mt-1">{r.review_note}</p>
                    )}
                    {r.submitted_at && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Submitted {format(new Date(r.submitted_at), "d MMM yyyy")}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, action: "reject" })}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      disabled={decide.isPending}
                      onClick={() => decide.mutate({ id: r.id, action: "approve" })}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
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
};

export default RateCardApprovalQueue;
