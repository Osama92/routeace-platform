import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Gauge, Truck, Wallet, AlertCircle, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface DispatchRow {
  id: string;
  dispatch_number: string;
  pickup_address: string;
  delivery_address: string;
  cost: number | null;
  total_distance_km: number | null;
  distance_km: number | null;
  status: string;
  dispatch_date: string | null;
  created_at: string;
}

const PRESETS: Record<string, () => { start: string; end: string }> = {
  mtd: () => ({ start: format(startOfMonth(new Date()), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
  last30: () => ({ start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
  last90: () => ({ start: format(subDays(new Date(), 90), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
}

export default function DeptCostPerDelivery() {
  const { user, organizationId } = useAuth();
  const [preset, setPreset] = useState<keyof typeof PRESETS>("mtd");
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const range = useMemo(() => PRESETS[preset](), [preset]);

  useEffect(() => { if (organizationId) void load(); /* eslint-disable-next-line */ }, [preset, organizationId]);

  async function load() {
    setLoading(true); setErr(null);
    if (!organizationId) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("dispatches")
      .select("id,dispatch_number,pickup_address,delivery_address,cost,total_distance_km,distance_km,status,dispatch_date,created_at")
      .eq("organization_id", organizationId)
      .gte("created_at", `${range.start}T00:00:00Z`)
      .lte("created_at", `${range.end}T23:59:59Z`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { setErr(error.message); setLoading(false); return; }
    setRows((data || []) as DispatchRow[]);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const withCost = rows.filter((r) => Number(r.cost) > 0);
    const totalCost = withCost.reduce((s, r) => s + Number(r.cost || 0), 0);
    const totalDist = withCost.reduce((s, r) => s + Number(r.total_distance_km || r.distance_km || 0), 0);
    const avgCost = withCost.length ? totalCost / withCost.length : 0;
    const avgPerKm = totalDist ? totalCost / totalDist : 0;
    return { count: rows.length, costed: withCost.length, totalCost, totalDist, avgCost, avgPerKm };
  }, [rows]);

  // Build per-corridor table
  const corridors = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; dist: number }>();
    rows.forEach((r) => {
      const key = `${(r.pickup_address || "").split(",")[0]?.trim() || "-"} → ${(r.delivery_address || "").split(",")[0]?.trim() || "-"}`;
      const e = map.get(key) || { count: 0, cost: 0, dist: 0 };
      e.count += 1;
      e.cost += Number(r.cost || 0);
      e.dist += Number(r.total_distance_km || r.distance_km || 0);
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([route, v]) => ({ route, ...v, perDelivery: v.count ? v.cost / v.count : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);
  }, [rows]);

  return (
    <DashboardLayout title="Cost per Delivery" subtitle="Unit cost economics for your department's dispatches.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Period: <span className="font-medium text-foreground">{range.start}</span> →{" "}
            <span className="font-medium text-foreground">{range.end}</span>
            {user && <span className="ml-3 text-xs">Scoped to your organization</span>}
          </div>
          <div className="flex items-center gap-2">
            <Select value={preset} onValueChange={(v) => setPreset(v as keyof typeof PRESETS)}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mtd">Month to date</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="last90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>
        </div>

        {err && (
          <Card className="border-destructive/40">
            <CardContent className="py-6 flex items-center gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive" /> {err}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Kpi icon={<Truck className="h-5 w-5 text-sky-500" />} label="Dispatches" value={stats.count.toLocaleString()} hint={`${stats.costed} have cost recorded`} />
          <Kpi icon={<Wallet className="h-5 w-5 text-primary" />} label="Total Dispatch Cost" value={fmt(stats.totalCost)} hint={`${stats.totalDist.toLocaleString()} km`} />
          <Kpi icon={<Gauge className="h-5 w-5 text-emerald-500" />} label="Avg Cost / Delivery" value={fmt(stats.avgCost)} hint="Costed dispatches only" />
          <Kpi icon={<Gauge className="h-5 w-5 text-amber-500" />} label="Avg Cost / KM" value={fmt(stats.avgPerKm)} hint="Total cost ÷ distance" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Top Corridors
            </CardTitle>
            <CardDescription>Repeated routes by volume - opportunity for rate locks</CardDescription>
          </CardHeader>
          <CardContent>
            {corridors.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No corridors in this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left py-2">Route</th>
                      <th className="text-right">Trips</th>
                      <th className="text-right">Total Cost</th>
                      <th className="text-right">Avg / Delivery</th>
                      <th className="text-right">Avg / KM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corridors.map((c) => (
                      <tr key={c.route} className="border-b last:border-b-0">
                        <td className="py-2">{c.route}</td>
                        <td className="text-right"><Badge variant="outline">{c.count}</Badge></td>
                        <td className="text-right">{fmt(c.cost)}</td>
                        <td className="text-right font-medium">{fmt(c.perDelivery)}</td>
                        <td className="text-right">{c.dist > 0 ? fmt(c.cost / c.dist) : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      </CardContent>
    </Card>
  );
}
