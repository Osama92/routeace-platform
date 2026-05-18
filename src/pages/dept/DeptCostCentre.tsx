import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, subDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import VendorYearlyTargets from "@/components/vendor/VendorYearlyTargets";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Wallet, Receipt, Truck, Gauge, TrendingUp, AlertCircle, MapPin, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend,
} from "recharts";
import DashboardExportButton from "@/components/shared/DashboardExportButton";
import { useAuth } from "@/contexts/AuthContext";

interface CostSummary {
  organization_id: string | null;
  period_start: string;
  period_end: string;
  total_expenses: number;
  total_bills: number;
  total_spend: number;
  dispatch_count: number;
  dispatch_distance_km: number;
  cost_per_delivery: number;
  cost_per_km: number;
  by_category: Array<{ category: string; total: number; count: number }>;
  top_vendors: Array<{ vendor: string; total: number; count: number }>;
  monthly_trend: Array<{ month: string; expenses: number; bills: number }>;
  error?: string;
}

interface DispatchRow {
  id: string;
  pickup_address: string | null;
  delivery_address: string | null;
  cost: number | null;
  total_distance_km: number | null;
  distance_km: number | null;
  created_at: string;
}

interface CorridorRow {
  route: string;
  count: number;
  cost: number;
  dist: number;
  perDelivery: number;
  perKm: number;
}

const PRESETS: Record<string, () => { start: string; end: string }> = {
  mtd: () => ({ start: format(startOfMonth(new Date()), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
  last30: () => ({ start: format(subDays(new Date(), 30), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
  last90: () => ({ start: format(subDays(new Date(), 90), "yyyy-MM-dd"), end: format(new Date(), "yyyy-MM-dd") }),
  ytd: () => ({ start: `${new Date().getFullYear()}-01-01`, end: format(new Date(), "yyyy-MM-dd") }),
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);
}

export default function DeptCostCentre() {
  const { user, organizationId } = useAuth();
  const [preset, setPreset] = useState<keyof typeof PRESETS>("mtd");
  const [data, setData] = useState<CostSummary | null>(null);
  const [dispatches, setDispatches] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("overview");
  const [highlightTop, setHighlightTop] = useState<"cost" | "perDelivery" | "perKm" | null>(null);

  const range = useMemo(() => PRESETS[preset](), [preset]);

  useEffect(() => {
    if (organizationId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, organizationId]);

  async function load() {
    setLoading(true);
    setErr(null);
    if (!organizationId) { setLoading(false); return; }
    const [{ data: res, error }, { data: disp, error: dErr }] = await Promise.all([
      supabase.rpc("dept_cost_centre_summary" as any, { p_start: range.start, p_end: range.end }),
      supabase
        .from("dispatches")
        .select("id,pickup_address,delivery_address,cost,total_distance_km,distance_km,created_at")
        .eq("organization_id", organizationId)
        .gte("created_at", `${range.start}T00:00:00Z`)
        .lte("created_at", `${range.end}T23:59:59Z`)
        .limit(1000),
    ]);
    if (error) { setErr(error.message); setLoading(false); return; }
    if (dErr) { setErr(dErr.message); setLoading(false); return; }
    const payload = res as unknown as CostSummary;
    if (payload?.error === "no_organization") {
      setErr("Your account is not linked to an organization. Ask an admin to add you to your department.");
    } else {
      setData(payload);
      setDispatches((disp || []) as DispatchRow[]);
    }
    setLoading(false);
  }

  // Build corridors (org-scoped via RLS on dispatches)
  const corridors: CorridorRow[] = useMemo(() => {
    const map = new Map<string, { count: number; cost: number; dist: number }>();
    dispatches.forEach((r) => {
      const o = (r.pickup_address || "").split(",")[0]?.trim() || "-";
      const d = (r.delivery_address || "").split(",")[0]?.trim() || "-";
      const key = `${o} → ${d}`;
      const e = map.get(key) || { count: 0, cost: 0, dist: 0 };
      e.count += 1;
      e.cost += Number(r.cost || 0);
      e.dist += Number(r.total_distance_km || r.distance_km || 0);
      map.set(key, e);
    });
    return Array.from(map.entries())
      .map(([route, v]) => ({
        route, ...v,
        perDelivery: v.count ? v.cost / v.count : 0,
        perKm: v.dist > 0 ? v.cost / v.dist : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [dispatches]);

  const sortedCorridors = useMemo(() => {
    const arr = [...corridors];
    if (highlightTop === "perDelivery") arr.sort((a, b) => b.perDelivery - a.perDelivery);
    else if (highlightTop === "perKm") arr.sort((a, b) => b.perKm - a.perKm);
    else arr.sort((a, b) => b.cost - a.cost);
    return arr.slice(0, 25);
  }, [corridors, highlightTop]);

  function drilldown(metric: "cost" | "perDelivery" | "perKm") {
    setHighlightTop(metric);
    setTab("routes");
  }

  const periodLabel = `${range.start} → ${range.end}`;

  return (
    <DashboardLayout
      title="Cost Centre Dashboard"
      subtitle="Department spend, vendor concentration, and unit cost - scoped to your organization."
    >
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
                <SelectItem value="ytd">Year to date</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
            {data && (
              <DashboardExportButton
                getExportData={() => ({
                  title: "Cost Centre Summary",
                  subtitle: "Organization-scoped spend & unit cost",
                  periodLabel,
                  filename: `cost-centre-summary-${range.start}-to-${range.end}`,
                  columns: [
                    { key: "metric", label: "Metric" },
                    { key: "value", label: "Value" },
                  ],
                  data: [
                    { metric: "Total Spend", value: fmt(Number(data.total_spend)) },
                    { metric: "Total Expenses", value: fmt(Number(data.total_expenses)) },
                    { metric: "Total Bills", value: fmt(Number(data.total_bills)) },
                    { metric: "Deliveries", value: Number(data.dispatch_count).toLocaleString() },
                    { metric: "Distance (km)", value: Number(data.dispatch_distance_km).toLocaleString() },
                    { metric: "Cost / Delivery", value: fmt(Number(data.cost_per_delivery)) },
                    { metric: "Cost / KM", value: fmt(Number(data.cost_per_km)) },
                  ],
                })}
              />
            )}
          </div>
        </div>

        {err && (
          <Card className="border-destructive/40">
            <CardContent className="py-6 flex items-center gap-3 text-sm">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span>{err}</span>
            </CardContent>
          </Card>
        )}

        {loading && !data && (
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="h-28 animate-pulse bg-muted/30" /></Card>
            ))}
          </div>
        )}

        {data && !err && (
          <Tabs value={tab} onValueChange={setTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="routes">
                Route Costing {corridors.length > 0 && <Badge variant="secondary" className="ml-2">{corridors.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="vendors">Vendor Cost Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* KPI Tiles - clickable drill-down */}
              <div className="grid gap-4 md:grid-cols-4">
                <KpiClickable
                  icon={<Wallet className="h-5 w-5 text-primary" />}
                  label="Total Spend"
                  value={fmt(Number(data.total_spend))}
                  hint={`${fmt(Number(data.total_expenses))} expenses + ${fmt(Number(data.total_bills))} bills`}
                  onClick={() => drilldown("cost")}
                  drillLabel="View top-cost corridors"
                />
                <Kpi
                  icon={<Truck className="h-5 w-5 text-sky-500" />}
                  label="Deliveries"
                  value={Number(data.dispatch_count).toLocaleString()}
                  hint={`${Number(data.dispatch_distance_km).toLocaleString()} km logged`}
                />
                <KpiClickable
                  icon={<Gauge className="h-5 w-5 text-emerald-500" />}
                  label="Cost / Delivery"
                  value={fmt(Number(data.cost_per_delivery))}
                  hint="Total spend ÷ dispatches"
                  onClick={() => drilldown("perDelivery")}
                  drillLabel="View costliest per delivery"
                />
                <KpiClickable
                  icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
                  label="Cost / KM"
                  value={fmt(Number(data.cost_per_km))}
                  hint="Total spend ÷ distance"
                  onClick={() => drilldown("perKm")}
                  drillLabel="View costliest per KM"
                />
              </div>

              {/* Charts row */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Spend by Category</CardTitle>
                    <CardDescription>Approved expenses, current period</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    {data.by_category.length === 0 ? (
                      <Empty label="No expenses logged in this period." />
                    ) : (
                      <ResponsiveContainer>
                        <BarChart data={data.by_category}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="category" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={60} />
                          <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Monthly Trend</CardTitle>
                    <CardDescription>Expenses vs vendor bills</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    {data.monthly_trend.length === 0 ? (
                      <Empty label="No history available." />
                    ) : (
                      <ResponsiveContainer>
                        <LineChart data={data.monthly_trend}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => fmt(v)} />
                          <Legend />
                          <Line type="monotone" dataKey="expenses" stroke="hsl(var(--primary))" strokeWidth={2} />
                          <Line type="monotone" dataKey="bills" stroke="hsl(var(--accent-foreground))" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tables row */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-base">Cost Categories</CardTitle>
                      <CardDescription>Ranked by total spend</CardDescription>
                    </div>
                    <DashboardExportButton
                      getExportData={() => ({
                        title: "Expense Category Breakdown",
                        periodLabel,
                        filename: `expense-categories-${range.start}-to-${range.end}`,
                        columns: [
                          { key: "category", label: "Category" },
                          { key: "count", label: "Entries" },
                          { key: "total", label: "Total Spend (NGN)", format: (v) => fmt(Number(v)) },
                          { key: "pct", label: "% of Expenses", format: (v) => `${Number(v).toFixed(1)}%` },
                        ],
                        data: data.by_category.map((c) => ({
                          category: c.category.replace(/_/g, " "),
                          count: c.count,
                          total: c.total,
                          pct: data.total_expenses > 0 ? (c.total / data.total_expenses) * 100 : 0,
                        })),
                      })}
                    />
                  </CardHeader>
                  <CardContent>
                    {data.by_category.length === 0 ? <Empty label="No categories." /> : (
                      <div className="space-y-2">
                        {data.by_category.map((c) => {
                          const pct = data.total_expenses > 0 ? (c.total / data.total_expenses) * 100 : 0;
                          return (
                            <div key={c.category} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-sm capitalize">{c.category.replace(/_/g, " ")}</div>
                                <div className="text-sm font-semibold">{fmt(Number(c.total))}</div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{c.count} entries · {pct.toFixed(1)}% of expenses</span>
                                <Badge variant="outline">{c.count}</Badge>
                              </div>
                              <div className="h-1.5 bg-muted rounded mt-2 overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" /> Top Vendors
                    </CardTitle>
                    <CardDescription>Bill volume - vendor concentration risk</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {data.top_vendors.length === 0 ? <Empty label="No vendor bills." /> : (
                      <div className="space-y-2">
                        {data.top_vendors.map((v, i) => {
                          const pct = data.total_bills > 0 ? (v.total / data.total_bills) * 100 : 0;
                          return (
                            <div key={`${v.vendor}-${i}`} className="border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="font-medium text-sm">{v.vendor}</div>
                                <div className="text-sm font-semibold">{fmt(Number(v.total))}</div>
                              </div>
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{v.count} bills · {pct.toFixed(1)}% of payables</span>
                                {pct > 40 && <Badge variant="destructive">Concentration risk</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="routes" className="space-y-4">
              <Card>
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Route Costing
                      {highlightTop && (
                        <Badge variant="secondary" className="ml-2">
                          Sorted by {highlightTop === "cost" ? "Total Cost" : highlightTop === "perDelivery" ? "Cost / Delivery" : "Cost / KM"}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Corridor-level cost from your organization's dispatches. Click a column header below to re-rank.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {highlightTop && (
                      <Button variant="ghost" size="sm" onClick={() => setHighlightTop(null)}>Reset</Button>
                    )}
                    <DashboardExportButton
                      getExportData={() => ({
                        title: "Route Cost Table",
                        subtitle: "Corridor-level dispatch costs",
                        periodLabel,
                        filename: `route-costing-${range.start}-to-${range.end}`,
                        columns: [
                          { key: "route", label: "Corridor" },
                          { key: "count", label: "Trips" },
                          { key: "cost", label: "Total Cost (NGN)", format: (v) => fmt(Number(v)) },
                          { key: "dist", label: "Distance (km)", format: (v) => Number(v).toLocaleString() },
                          { key: "perDelivery", label: "Cost / Delivery", format: (v) => fmt(Number(v)) },
                          { key: "perKm", label: "Cost / KM", format: (v) => fmt(Number(v)) },
                        ],
                        data: sortedCorridors,
                      })}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {sortedCorridors.length === 0 ? (
                    <Empty label="No corridors recorded in this period." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground border-b">
                          <tr>
                            <th className="text-left py-2">Corridor</th>
                            <th className="text-right">Trips</th>
                            <SortableTh label="Total Cost" active={highlightTop === "cost"} onClick={() => setHighlightTop("cost")} />
                            <th className="text-right">Distance</th>
                            <SortableTh label="Cost / Delivery" active={highlightTop === "perDelivery"} onClick={() => setHighlightTop("perDelivery")} />
                            <SortableTh label="Cost / KM" active={highlightTop === "perKm"} onClick={() => setHighlightTop("perKm")} />
                          </tr>
                        </thead>
                        <tbody>
                          {sortedCorridors.map((c, i) => (
                            <tr key={c.route} className={`border-b last:border-b-0 ${i < 3 && highlightTop ? "bg-amber-500/5" : ""}`}>
                              <td className="py-2">
                                <div className="flex items-center gap-2">
                                  {i < 3 && highlightTop && <ArrowUpRight className="h-3.5 w-3.5 text-amber-500" />}
                                  <span>{c.route}</span>
                                </div>
                              </td>
                              <td className="text-right"><Badge variant="outline">{c.count}</Badge></td>
                              <td className={`text-right ${highlightTop === "cost" ? "font-semibold" : ""}`}>{fmt(c.cost)}</td>
                              <td className="text-right">{c.dist.toLocaleString()} km</td>
                              <td className={`text-right ${highlightTop === "perDelivery" ? "font-semibold" : ""}`}>{fmt(c.perDelivery)}</td>
                              <td className={`text-right ${highlightTop === "perKm" ? "font-semibold" : ""}`}>{c.perKm > 0 ? fmt(c.perKm) : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendors" className="space-y-4">
              <VendorYearlyTargets />
            </TabsContent>
          </Tabs>
        )}
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

function KpiClickable({
  icon, label, value, hint, onClick, drillLabel,
}: {
  icon: React.ReactNode; label: string; value: string; hint: string; onClick: () => void; drillLabel: string;
}) {
  return (
    <Card
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
        <div className="mt-2 text-xs text-primary flex items-center gap-1 font-medium">
          {drillLabel} <ArrowUpRight className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}

function SortableTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th className="text-right">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 hover:text-foreground transition-colors ${active ? "text-foreground font-semibold" : ""}`}
      >
        {label}
      </button>
    </th>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="h-full flex items-center justify-center text-sm text-muted-foreground">{label}</div>;
}
