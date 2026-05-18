import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, History, ArrowUpCircle, CalendarIcon, X, Loader2 } from "lucide-react";

const PAGE_SIZE = 50;

interface Props {
  entityType: "customers" | "partners";
  organizationId: string;
  title?: string;
}

type Status = "approved" | "rejected" | "pending_final";

const STATUS_META: Record<Status, {
  label: string;
  actionVerb: string;
  iconBg: string;
  badgeClass: string;
  Icon: typeof CheckCircle2;
  iconClass: string;
}> = {
  approved: {
    label: "Approved",
    actionVerb: "Approved by",
    iconBg: "bg-green-500/10",
    badgeClass: "border-green-500/40 text-green-700",
    Icon: CheckCircle2,
    iconClass: "text-green-600",
  },
  rejected: {
    label: "Rejected",
    actionVerb: "Rejected by",
    iconBg: "bg-red-500/10",
    badgeClass: "border-red-500/40 text-red-700",
    Icon: XCircle,
    iconClass: "text-red-600",
  },
  pending_final: {
    label: "Escalated · Pending Final",
    actionVerb: "Escalated by",
    iconBg: "bg-amber-500/10",
    badgeClass: "border-amber-500/40 text-amber-700",
    Icon: ArrowUpCircle,
    iconClass: "text-amber-600",
  },
};

export default function ApprovalDecisionHistory({ entityType, organizationId, title }: Props) {
  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "1" | "2">("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["approval-history", entityType, organizationId],
    enabled: !!organizationId,
    refetchInterval: 60_000,
    initialPageParam: 0,
    getNextPageParam: (lastPage: any[], allPages: any[][]) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length,
    queryFn: async ({ pageParam = 0 }) => {
      const from = (pageParam as number) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data } = await supabase
        .from("approvals")
        .select("id, entity_id, approval_level, status, reason, created_at, approved_by, rejected_by")
        .eq("entity_type", entityType)
        .eq("organization_id", organizationId)
        .in("status", ["approved", "rejected", "pending_final"])
        .order("created_at", { ascending: false })
        .range(from, to);
      return (data ?? []) as any[];
    },
  });

  const data = useMemo(() => (pages?.pages ?? []).flat(), [pages]);

  // Apply filters client-side over the org-scoped, RLS-protected dataset.
  const filtered = useMemo(() => {
    const fromMs = fromDate ? new Date(fromDate).setHours(0, 0, 0, 0) : null;
    const toMs = toDate ? new Date(toDate).setHours(23, 59, 59, 999) : null;
    return data.filter((r: any) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (levelFilter !== "all" && String(r.approval_level) !== levelFilter) return false;
      const ts = new Date(r.created_at).getTime();
      if (fromMs !== null && ts < fromMs) return false;
      if (toMs !== null && ts > toMs) return false;
      return true;
    });
  }, [data, statusFilter, levelFilter, fromDate, toDate]);

  // Auto-load next page when sentinel scrolls into view inside the list container.
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    if (!root || !target || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root, rootMargin: "120px" }
    );
    io.observe(target);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, filtered.length]);

  const filtersActive =
    statusFilter !== "all" || levelFilter !== "all" || !!fromDate || !!toDate;
  const clearFilters = () => {
    setStatusFilter("all");
    setLevelFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
  };

  // Resolve entity names in one shot - keyed off the filtered list so we don't
  // query for records the user can't see.
  const ids = Array.from(new Set(filtered.map((r: any) => r.entity_id))).filter(Boolean);
  const { data: nameMap = {} } = useQuery({
    queryKey: ["approval-history-names", entityType, organizationId, ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data: rows } = await supabase
        .from(entityType)
        .select("id, company_name")
        .in("id", ids as string[]);
      const m: Record<string, string> = {};
      (rows ?? []).forEach((r: any) => { m[r.id] = r.company_name; });
      return m;
    },
  });

  // Resolve approver/rejecter/escalator identities - only for users in the same org as caller.
  const actorIds = Array.from(
    new Set(
      filtered.flatMap((r: any) => [r.approved_by, r.rejected_by]).filter(Boolean)
    )
  ) as string[];
  const { data: actorMap = {} } = useQuery({
    queryKey: ["approval-history-actors", organizationId, actorIds.join(",")],
    enabled: actorIds.length > 0,
    queryFn: async () => {
      const { data: rows } = await supabase.rpc("get_org_member_identities", {
        _user_ids: actorIds,
      });
      const m: Record<string, { name: string; email: string }> = {};
      (rows ?? []).forEach((r: any) => {
        m[r.user_id] = { name: r.full_name || "", email: r.email || "" };
      });
      return m;
    },
  });

  const formatActor = (uid?: string | null) => {
    if (!uid) return null;
    const a = (actorMap as any)[uid];
    if (!a) return "Member";
    return a.name?.trim() || a.email || "Member";
  };

  const label = title || (entityType === "customers" ? "Customer Approval History" : "Vendor Approval History");

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="w-4 h-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All decisions</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="pending_final">Escalated · Pending Final</SelectItem>
            </SelectContent>
          </Select>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All levels</SelectItem>
              <SelectItem value="1">L1 · COO</SelectItem>
              <SelectItem value="2">L2 · Super Admin</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs justify-start font-normal", !fromDate && "text-muted-foreground")}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {fromDate ? format(fromDate, "PP") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={fromDate}
                onSelect={setFromDate}
                disabled={(d) => (toDate ? d > toDate : false) || d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn("h-8 text-xs justify-start font-normal", !toDate && "text-muted-foreground")}
              >
                <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
                {toDate ? format(toDate, "PP") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={toDate}
                onSelect={setToDate}
                disabled={(d) => (fromDate ? d < fromDate : false) || d > new Date()}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>

          {filtersActive && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="w-3.5 h-3.5 mr-1" />
              Clear
            </Button>
          )}

          <span className="ml-auto text-[11px] text-muted-foreground">
            {filtered.length} of {data.length}
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No approval decisions yet.
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No decisions match the current filters.
          </p>
        ) : (
          <div
            ref={scrollRef}
            className="space-y-2 max-h-96 overflow-y-auto pr-1"
          >
            {filtered.map((r: any) => {
              const status: Status = (["approved", "rejected", "pending_final"].includes(r.status)
                ? r.status
                : "pending_final") as Status;
              const meta = STATUS_META[status];
              const actorId =
                status === "approved" ? r.approved_by
                : status === "rejected" ? r.rejected_by
                : (r.approved_by ?? r.rejected_by);
              const reasonLabel =
                status === "pending_final" ? "Escalation note" : "Reason";
              const Icon = meta.Icon;
              return (
                <div
                  key={r.id}
                  className="flex items-start gap-3 p-2.5 rounded-md border bg-muted/20"
                >
                  <div className={`p-1.5 rounded-md shrink-0 ${meta.iconBg}`}>
                    <Icon className={`w-4 h-4 ${meta.iconClass}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">
                        {(nameMap as any)[r.entity_id] || r.entity_id.slice(0, 8)}
                      </p>
                      <Badge variant="outline" className={`text-[10px] ${meta.badgeClass}`}>
                        {meta.label} · L{r.approval_level}
                      </Badge>
                    </div>
                    {r.reason && (
                      <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                        <span className="font-medium">{reasonLabel}:</span> {r.reason}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(r.created_at).toLocaleString("en-NG")}
                        </p>
                      </div>
                      {actorId && (
                        <p className="text-[10px] text-muted-foreground">
                          · {meta.actionVerb}{" "}
                          <span className="font-medium text-foreground">
                            {formatActor(actorId)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Infinite-scroll sentinel + manual fallback */}
            {hasNextPage && (
              <div ref={sentinelRef} className="pt-2 pb-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Loading…</>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
            {!hasNextPage && data.length > PAGE_SIZE && (
              <p className="text-[10px] text-muted-foreground text-center pt-1">
                End of history · {data.length} records loaded
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
