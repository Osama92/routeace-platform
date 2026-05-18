import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Brain, TrendingUp, MapPin, Users, Star, Package, Calendar, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type OBR = {
  id: string;
  sku: string | null;
  goods_description: string | null;
  origin_address: string;
  destination_address: string;
  customer_name: string | null;
  warehouse_name: string | null;
  total_weight_kg: number | null;
  total_volume_m3: number | null;
  requested_date: string;
  status: string;
  priority: string;
  created_at: string;
  pod_status: string;
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString();
const daysUntil = (d: string) => Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);

const MarketIntelligenceEngine = () => {
  const { organizationId } = useAuth();
  const [rows, setRows] = useState<OBR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("outbound_requests")
        .select("id,sku,goods_description,origin_address,destination_address,customer_name,warehouse_name,total_weight_kg,total_volume_m3,requested_date,status,priority,created_at,pod_status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(1000);
      setRows((data as OBR[]) || []);
      setLoading(false);
    })();
  }, [organizationId]);

  /* ── Aggregates ── */
  const skuLabel = (r: OBR) => (r.sku?.trim() || r.goods_description?.trim() || "Unspecified SKU");

  const demandBySku = useMemo(() => {
    const map = new Map<string, { product: string; region: string; volume: number; count: number; recent: number }>();
    const cutoff = Date.now() - 30 * 86400000;
    for (const r of rows) {
      const key = `${skuLabel(r)}::${r.destination_address}`;
      const cur = map.get(key) || { product: skuLabel(r), region: r.destination_address, volume: 0, count: 0, recent: 0 };
      cur.count += 1;
      cur.volume += Number(r.total_weight_kg || 0);
      if (new Date(r.created_at).getTime() > cutoff) cur.recent += 1;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [rows]);

  const distributorScores = useMemo(() => {
    const map = new Map<string, { name: string; total: number; delivered: number; pending: number; pod: number; regions: Set<string> }>();
    for (const r of rows) {
      const name = (r.customer_name || "Unassigned").trim();
      const cur = map.get(name) || { name, total: 0, delivered: 0, pending: 0, pod: 0, regions: new Set<string>() };
      cur.total += 1;
      if (["delivered", "completed", "closed"].includes(r.status.toLowerCase())) cur.delivered += 1;
      if (["pending", "open"].includes(r.status.toLowerCase())) cur.pending += 1;
      if (r.pod_status === "confirmed") cur.pod += 1;
      cur.regions.add(r.destination_address);
      map.set(name, cur);
    }
    return Array.from(map.values())
      .map((d) => {
        const fulfillment = d.total ? Math.round((d.delivered / d.total) * 100) : 0;
        const podRate = d.total ? Math.round((d.pod / d.total) * 100) : 0;
        const coverage = Math.min(100, d.regions.size * 10);
        const reliability = Math.round((fulfillment + podRate) / 2);
        const overall = Math.round((fulfillment + podRate + coverage + reliability) / 4);
        return { ...d, fulfillment, podRate, coverage, reliability, overall, regionCount: d.regions.size };
      })
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 10);
  }, [rows]);

  const marketGaps = useMemo(() => {
    const map = new Map<string, { region: string; sku: string; demanded: number; fulfilled: number; pending: number }>();
    for (const r of rows) {
      const key = `${r.destination_address}::${skuLabel(r)}`;
      const cur = map.get(key) || { region: r.destination_address, sku: skuLabel(r), demanded: 0, fulfilled: 0, pending: 0 };
      cur.demanded += 1;
      if (["delivered", "completed", "closed"].includes(r.status.toLowerCase())) cur.fulfilled += 1;
      else cur.pending += 1;
      map.set(key, cur);
    }
    return Array.from(map.values())
      .filter((g) => g.pending > 0)
      .map((g) => ({ ...g, gapPct: Math.round((g.pending / g.demanded) * 100) }))
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10);
  }, [rows]);

  const forecasts = useMemo(() => {
    return rows
      .filter((r) => !["delivered", "completed", "closed", "cancelled"].includes(r.status.toLowerCase()))
      .map((r) => ({
        id: r.id,
        origin: r.origin_address,
        sku: skuLabel(r),
        location: r.destination_address,
        deadline: r.requested_date,
        days: daysUntil(r.requested_date),
        priority: r.priority,
        status: r.status,
        weight: r.total_weight_kg,
      }))
      .sort((a, b) => a.days - b.days)
      .slice(0, 20);
  }, [rows]);

  const kpis = useMemo(() => {
    const total = rows.length;
    const delivered = rows.filter((r) => ["delivered", "completed", "closed"].includes(r.status.toLowerCase())).length;
    const accuracy = total ? Math.round((delivered / total) * 100) : 0;
    const gapCount = marketGaps.length;
    const totalKg = rows.reduce((s, r) => s + Number(r.total_weight_kg || 0), 0);
    return [
      { label: "Outbound Signals", value: total.toLocaleString(), description: "Live outbound requests analyzed" },
      { label: "Fulfillment Rate", value: `${accuracy}%`, description: "Delivered vs total demand" },
      { label: "Open Gaps", value: gapCount.toString(), description: "SKU × region with unmet demand" },
      { label: "Total Volume", value: `${(totalKg / 1000).toFixed(1)}T`, description: "Tonnage across requests" },
    ];
  }, [rows, marketGaps]);

  return (
    <DashboardLayout
      title="Market Intelligence Engine"
      subtitle="Live demand, gaps, distributor performance and forecasted dispatches from outbound requests"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
                <p className="text-xl font-bold text-foreground">{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{k.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {loading ? (
          <Card><CardContent className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></CardContent></Card>
        ) : rows.length === 0 ? (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">No outbound requests yet - once Sales raises requests, intelligence will appear here.</CardContent></Card>
        ) : (
          <Tabs defaultValue="demand" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="demand" className="text-xs"><TrendingUp className="w-3 h-3 mr-1" />Demand</TabsTrigger>
              <TabsTrigger value="gaps" className="text-xs"><MapPin className="w-3 h-3 mr-1" />Market Gaps</TabsTrigger>
              <TabsTrigger value="distributors" className="text-xs"><Users className="w-3 h-3 mr-1" />Distributors</TabsTrigger>
              <TabsTrigger value="forecast" className="text-xs"><Calendar className="w-3 h-3 mr-1" />Forecast</TabsTrigger>
            </TabsList>

            {/* Demand */}
            <TabsContent value="demand">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Most Requested SKUs (Live from Sales Outbound)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {demandBySku.map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{f.product}</p>
                          <Badge variant="outline" className="text-[10px]">{f.region}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Volume: <span className="font-medium text-foreground">{f.volume.toLocaleString()} kg</span> · {f.recent} requests in last 30d</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">{f.count}</p>
                        <p className="text-[10px] text-muted-foreground">total requests</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gaps */}
            <TabsContent value="gaps">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Product Availability Gaps Affecting Sales</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {marketGaps.map((g, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-4 rounded-xl bg-muted/30 border border-border/50 flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold">{g.sku}</p>
                          <Badge variant="outline" className="text-[10px]">{g.region}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{g.fulfilled}/{g.demanded} fulfilled · <span className="text-destructive font-medium">{g.pending} pending</span></p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${g.gapPct >= 60 ? "text-destructive" : g.gapPct >= 30 ? "text-amber-500" : "text-emerald-500"}`}>{g.gapPct}%</p>
                        <p className="text-[10px] text-muted-foreground">unmet demand</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Distributors */}
            <TabsContent value="distributors">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Star className="w-4 h-4 text-primary" /> Distributor Performance (Live)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {distributorScores.map((d, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">#{i + 1}</span>
                            <p className="text-sm font-semibold">{d.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{d.regionCount} region{d.regionCount === 1 ? "" : "s"} · {d.total} requests</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{d.overall}</p>
                          <p className="text-[10px] text-muted-foreground">Overall</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: "Fulfillment", val: d.fulfillment },
                          { label: "POD Rate", val: d.podRate },
                          { label: "Coverage", val: d.coverage },
                          { label: "Reliability", val: d.reliability },
                        ].map((m) => (
                          <div key={m.label}>
                            <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                            <Progress value={m.val} className="h-1.5" />
                            <p className="text-xs font-medium mt-0.5">{m.val}%</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Forecast */}
            <TabsContent value="forecast">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Demand Forecast - Origin × SKU × Location × Deadline</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {forecasts.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No open outbound requests to forecast.</p>}
                  {forecasts.map((f, i) => {
                    const overdue = f.days < 0;
                    const urgent = f.days >= 0 && f.days <= 2;
                    return (
                      <motion.div key={f.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Package className="w-4 h-4 text-primary" />
                              <p className="text-sm font-semibold">{f.sku}</p>
                              <Badge variant="outline" className="text-[10px]">{f.priority}</Badge>
                              <Badge className="bg-muted text-muted-foreground text-[10px]">{f.status}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-muted-foreground">
                              <p>Origin: <span className="font-medium text-foreground">{f.origin}</span></p>
                              <p>Location: <span className="font-medium text-foreground">{f.location}</span></p>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className={`text-sm font-bold ${overdue ? "text-destructive" : urgent ? "text-amber-500" : "text-emerald-500"}`}>
                              {overdue ? `${Math.abs(f.days)}d overdue` : f.days === 0 ? "Due today" : `${f.days}d left`}
                            </p>
                            <p className="text-[10px] text-muted-foreground">Deadline: {fmtDate(f.deadline)}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground border-t border-border/50 pt-2 mt-1">
                          <span className="font-medium text-foreground">Plan to execute:</span>{" "}
                          {overdue
                            ? "Escalate immediately - assign to next available transporter and notify customer."
                            : urgent
                            ? "Dispatch within 24h. Confirm vehicle and route now."
                            : `Schedule dispatch by ${fmtDate(new Date(new Date(f.deadline).getTime() - 86400000).toISOString())} to meet deadline.`}
                          {f.weight ? ` · ${Number(f.weight).toLocaleString()} kg` : ""}
                        </p>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MarketIntelligenceEngine;
