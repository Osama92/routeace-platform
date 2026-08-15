import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, MapPin, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
import { differenceInHours, startOfWeek, startOfMonth, format, subDays } from "date-fns";

interface WaitTrackingData {
  id: string;
  dispatch_id: string | null;
  vehicle_id: string | null;
  customer_id: string | null;
  site_name: string | null;
  arrival_timestamp: string;
  loading_timestamp: string | null;
  exit_timestamp: string | null;
  wait_status: string;
  wait_reason: string | null;
  wait_hours: number | null;
}

interface IdleLogRow {
  id: string;
  vehicle_id: string | null;
  idle_date: string;
  reason_code: string | null;
  notes: string | null;
}

const IDLE_REASON_LABELS: Record<string, string> = {
  no_load_available: "No load available",
  client_delay: "Client delay",
  dispatch_failure: "Dispatch failure",
  payment_issue: "Payment issue",
  driver_issue: "Driver issue",
  other: "Other",
};

/**
 * Average Wait Days (Unloaded Trucks).
 *
 * SOURCE OF TRUTH — read this before changing the queries.
 *
 * This card originally read only `truck_wait_tracking`, a table with a
 * gate-in/gate-out shape (arrival -> loading -> exit timestamps). Nothing in
 * the product ever writes to it: it holds 0 rows, so the card rendered 0.0 /
 * 0.0 / 0.0 and "No wait tracking data available" while operators were in fact
 * recording idle time every day.
 *
 * Where they record it is Asset Operations Control, which writes one
 * `asset_idle_logs` row per vehicle per idle day (upsert on
 * vehicle_id + idle_date), with a reason code. That table holds real daily
 * operator entries.
 *
 * The two measure related but different things, and the difference matters
 * when reading the number:
 *
 *   truck_wait_tracking  — hours a truck sat ON SITE before being loaded.
 *                          Sub-day precision, tied to a customer site.
 *   asset_idle_logs      — whole DAYS a truck was not working, with a reason.
 *                          Day granularity; no site.
 *
 * So this card prefers `truck_wait_tracking` whenever it has rows, and falls
 * back to `asset_idle_logs` otherwise. The card states which source produced
 * the figure, because "3.3 days average" means something different under each
 * and a reader who assumes the wrong one will draw the wrong conclusion.
 *
 * Under the idle-log source, "average" is idle days per vehicle that had any
 * idle day in the period — not an average over the whole fleet, which would
 * dilute the figure with trucks that never idled and understate the problem.
 * Top Delay Sites is hidden in that mode: idle logs carry no site, and
 * inventing one would be fabrication.
 */
const WaitDaysKPICard = () => {
  const { organizationId } = useAuth();

  const { data: waitData, isLoading: waitLoading } = useQuery({
    queryKey: ["truck-wait-kpi", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("truck_wait_tracking")
        .select("*")
        .eq("organization_id", organizationId)
        .order("arrival_timestamp", { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as WaitTrackingData[];
    },
  });

  // Last 60 days covers this month plus the prior month used for the trend.
  const idleSince = format(subDays(new Date(), 60), "yyyy-MM-dd");

  const { data: idleData, isLoading: idleLoading } = useQuery({
    queryKey: ["truck-idle-kpi", organizationId, idleSince],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("asset_idle_logs") as any)
        .select("id, vehicle_id, idle_date, reason_code, notes")
        .eq("organization_id", organizationId)
        .gte("idle_date", idleSince)
        .order("idle_date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as IdleLogRow[];
    },
  });

  const isLoading = waitLoading || idleLoading;

  const hasWaitRows = (waitData?.length ?? 0) > 0;
  const hasIdleRows = (idleData?.length ?? 0) > 0;
  const source: "wait" | "idle" | "none" = hasWaitRows ? "wait" : hasIdleRows ? "idle" : "none";

  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  // ── Source A: on-site wait tracking (hours) ────────────────────────────────
  const calculateWaitHours = (record: WaitTrackingData) => {
    const arrival = new Date(record.arrival_timestamp);
    const end = record.loading_timestamp
      ? new Date(record.loading_timestamp)
      : record.exit_timestamp
        ? new Date(record.exit_timestamp)
        : new Date();
    return differenceInHours(end, arrival);
  };

  const avgHoursOver = (rows: WaitTrackingData[]) =>
    rows.length > 0 ? rows.reduce((s, r) => s + calculateWaitHours(r), 0) / rows.length : null;

  // ── Source B: idle logs (whole days) ───────────────────────────────────────
  // One row per vehicle per idle day, so the row count IS the day count.
  // Averaged over vehicles that idled, not over the whole fleet.
  const avgIdleDaysOver = (rows: IdleLogRow[]) => {
    if (rows.length === 0) return null;
    const vehicles = new Set(rows.map((r) => r.vehicle_id ?? "unknown"));
    return rows.length / vehicles.size;
  };

  const idleRows = idleData ?? [];
  const idleDaily = idleRows.filter((r) => r.idle_date === todayStr);
  const idleWeekly = idleRows.filter((r) => new Date(r.idle_date) >= weekStart);
  const idleMonthly = idleRows.filter((r) => new Date(r.idle_date) >= monthStart);

  // Each figure is in DAYS regardless of which source produced it.
  const avgDailyDays =
    source === "wait"
      ? (() => {
          const h = avgHoursOver(
            (waitData ?? []).filter(
              (r) => new Date(r.arrival_timestamp).toDateString() === now.toDateString(),
            ),
          );
          return h === null ? null : h / 24;
        })()
      : avgIdleDaysOver(idleDaily);

  const avgWeeklyDays =
    source === "wait"
      ? (() => {
          const h = avgHoursOver((waitData ?? []).filter((r) => new Date(r.arrival_timestamp) >= weekStart));
          return h === null ? null : h / 24;
        })()
      : avgIdleDaysOver(idleWeekly);

  const avgMonthlyDays =
    source === "wait"
      ? (() => {
          const h = avgHoursOver((waitData ?? []).filter((r) => new Date(r.arrival_timestamp) >= monthStart));
          return h === null ? null : h / 24;
        })()
      : avgIdleDaysOver(idleMonthly);

  // ── Trend vs the previous 30 days ──────────────────────────────────────────
  const prevWindowStart = new Date(monthStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const prevAvgDays =
    source === "wait"
      ? (() => {
          const h = avgHoursOver(
            (waitData ?? []).filter((r) => {
              const d = new Date(r.arrival_timestamp);
              return d < monthStart && d >= prevWindowStart;
            }),
          );
          return h === null ? null : h / 24;
        })()
      : avgIdleDaysOver(
          idleRows.filter((r) => {
            const d = new Date(r.idle_date);
            return d < monthStart && d >= prevWindowStart;
          }),
        );

  // No prior period means no trend — not a 0% trend, which would read as "flat".
  const trend =
    avgMonthlyDays !== null && prevAvgDays !== null && prevAvgDays > 0
      ? avgMonthlyDays - prevAvgDays
      : null;
  const trendPercent = trend !== null && prevAvgDays ? ((trend / prevAvgDays) * 100).toFixed(1) : null;
  const isImproving = trend !== null && trend < 0;

  // ── Breakdowns ─────────────────────────────────────────────────────────────
  // Sites only exist on wait tracking; idle logs have no site column.
  const topDelaySites =
    source === "wait"
      ? Object.entries(
          (waitData ?? []).reduce(
            (acc, r) => {
              const site = r.site_name || "Unknown";
              if (!acc[site]) acc[site] = { total: 0, count: 0 };
              acc[site].total += calculateWaitHours(r);
              acc[site].count += 1;
              return acc;
            },
            {} as Record<string, { total: number; count: number }>,
          ),
        )
          .map(([site, d]) => ({ site, avgDays: d.total / d.count / 24 }))
          .sort((a, b) => b.avgDays - a.avgDays)
          .slice(0, 3)
      : [];

  const reasonRows = source === "wait" ? waitData ?? [] : idleMonthly;
  const reasonBreakdown = reasonRows.reduce(
    (acc, r) => {
      const raw =
        source === "wait"
          ? (r as WaitTrackingData).wait_reason || "other"
          : (r as IdleLogRow).reason_code || "other";
      const label = IDLE_REASON_LABELS[raw] ?? raw.replace(/_/g, " ");
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const topReasons = Object.entries(reasonBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const fmt = (v: number | null) => (v === null ? "—" : v.toFixed(1));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
              <Clock className="w-4 h-4 text-yellow-500" />
              Avg Wait Days (Unloaded Trucks)
            </CardTitle>
            <CardDescription>
              {source === "idle"
                ? "Idle days per truck — from Asset Operations Control"
                : "On-site wait time before loading"}
            </CardDescription>
          </div>
          {trendPercent !== null && (
            <div className="flex items-center gap-1 shrink-0">
              {isImproving ? (
                <ArrowDown className="w-4 h-4 text-green-500" />
              ) : (
                <ArrowUp className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${isImproving ? "text-green-600" : "text-red-600"}`}
              >
                {Math.abs(Number(trendPercent))}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{fmt(avgDailyDays)}</p>
            <p className="text-xs text-muted-foreground">Daily Avg (days)</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{fmt(avgWeeklyDays)}</p>
            <p className="text-xs text-muted-foreground">Weekly Avg</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50 text-center">
            <p className="text-2xl font-bold">{fmt(avgMonthlyDays)}</p>
            <p className="text-xs text-muted-foreground">Monthly Avg</p>
          </div>
        </div>

        {source === "idle" && (
          <p className="text-xs text-muted-foreground">
            Averaged across trucks that recorded at least one idle day. On-site gate timings are
            not being captured, so this measures whole idle days rather than hours waiting to load.
          </p>
        )}

        {/* Top 3 Delay Sites — wait tracking only; idle logs carry no site */}
        {topDelaySites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Top Delay Sites
            </p>
            {topDelaySites.map((site, idx) => (
              <div key={site.site} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span className="truncate max-w-32">{site.site}</span>
                </div>
                <Badge variant={site.avgDays > 2 ? "destructive" : "secondary"}>
                  {site.avgDays.toFixed(1)} days
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* Reason breakdown */}
        {topReasons.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {source === "idle" ? "Idle Reasons (this month)" : "Wait Reasons"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {topReasons.map(([reason, count]) => (
                <div
                  key={reason}
                  className="flex items-center justify-between text-xs p-2 rounded bg-muted/30"
                >
                  <span className="truncate">{reason}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested action — threshold is 2 days under either source */}
        {avgMonthlyDays !== null && avgMonthlyDays > 2 && (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-600">Long idle times detected</p>
                <p className="text-muted-foreground text-xs mt-1">
                  Review supply availability or customer order scheduling
                </p>
              </div>
            </div>
          </div>
        )}

        {source === "none" && (
          <div className="text-center py-4 text-muted-foreground text-sm">
            No wait or idle data recorded yet. Log idle days in Asset Operations Control.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WaitDaysKPICard;
