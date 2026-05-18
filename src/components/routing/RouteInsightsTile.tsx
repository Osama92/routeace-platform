import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Lightbulb, Loader2 } from "lucide-react";

/**
 * Live, tenant-scoped Moving Insights tile.
 * Replaces the static LASTMA Zone Alert.
 *
 * Data source: `dispatches` table - RLS automatically restricts
 * results to the caller's organization, so there is no cross-tenant leakage.
 * Both LC (Logistics Company) and LD (Logistics Department) tenants read
 * from the same RLS-isolated view of their own data.
 */
type Insight = {
  performance: string;
  risk: string;
  mitigation: string;
  hasData: boolean;
};

export const RouteInsightsTile = () => {
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("dispatches")
        .select("id, status, pickup_address, delivery_address, cost, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (error || !data || data.length === 0) {
        setInsight({
          performance: "No recent dispatches yet",
          risk: "Risks will appear once routes are run",
          mitigation: "Create your first dispatch to unlock live insights",
          hasData: false,
        });
        setLoading(false);
        return;
      }

      const total = data.length;
      const completed = data.filter((d) => d.status === "completed" || d.status === "delivered").length;
      const failed = data.filter((d) => d.status === "failed" || d.status === "cancelled").length;
      const onTimePct = Math.round((completed / total) * 100);
      const failPct = Math.round((failed / total) * 100);

      // Risk corridor = pickup → delivery pair with most failed/cancelled outcomes
      const corridorFails: Record<string, number> = {};
      data.forEach((d: any) => {
        if (d.status !== "failed" && d.status !== "cancelled") return;
        const pu = (d.pickup_address || "Origin").split(",")[0].trim();
        const dl = (d.delivery_address || "Drop").split(",")[0].trim();
        const key = `${pu} → ${dl}`;
        corridorFails[key] = (corridorFails[key] || 0) + 1;
      });
      const topRisk = Object.entries(corridorFails).sort((a, b) => b[1] - a[1])[0];

      let risk: string;
      let mitigation: string;
      if (topRisk) {
        risk = `${topRisk[0]} - ${topRisk[1]} failed run${topRisk[1] > 1 ? "s" : ""} in 14d`;
        mitigation = "Re-cluster drops on this corridor or shift to off-peak window";
      } else if (failPct > 0) {
        risk = `${failPct}% of recent dispatches failed or cancelled`;
        mitigation = "Review driver assignments and pickup time windows";
      } else {
        risk = "No failed routes in the last 14 days";
        mitigation = onTimePct >= 90
          ? "Maintain current dispatch pattern - performance is healthy"
          : "Tighten drop sequencing to push completion above 90%";
      }

      setInsight({
        performance: `${onTimePct}% completed · ${total} dispatches (14d)`,
        risk,
        mitigation,
        hasData: true,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-3 py-2 rounded-lg border bg-primary/5 border-primary/30 text-xs">
      <div className="flex items-center gap-1.5 font-semibold text-primary">
        <Activity className="h-3.5 w-3.5" />
        Moving Insights
      </div>
      {loading || !insight ? (
        <div className="flex items-center gap-1.5 mt-1.5 opacity-70">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading live data…
        </div>
      ) : (
        <div className="mt-1 space-y-1">
          <div className="flex items-start gap-1.5">
            <Activity className="h-3 w-3 mt-0.5 shrink-0 text-primary/80" />
            <span className="opacity-90">{insight.performance}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />
            <span className="opacity-90">{insight.risk}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Lightbulb className="h-3 w-3 mt-0.5 shrink-0 text-emerald-500" />
            <span className="opacity-90">{insight.mitigation}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteInsightsTile;
