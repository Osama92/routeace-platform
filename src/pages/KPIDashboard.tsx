import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Minus, DollarSign, Truck, Brain, Loader2, ArrowUpRight, ArrowDownRight, Package, Gauge, Fuel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, subMonths, subYears } from "date-fns";
import { motion } from "framer-motion";

type KPICat = "financial" | "operational" | "volume" | "otif" | "fleet" | "cost";
interface KPICard {
  name: string;
  current: number;
  previous: number;
  trend: number;
  format: "currency" | "percent" | "number" | "days" | "ratio";
  category: KPICat;
  invertGood?: boolean; // for cost/expense - down is good
}

const fmtVal = (v: number, f: KPICard["format"]) => {
  if (!isFinite(v)) v = 0;
  switch (f) {
    case "currency":
      if (Math.abs(v) >= 1_000_000) return `₦${(v / 1_000_000).toFixed(1)}M`;
      if (Math.abs(v) >= 1_000) return `₦${(v / 1_000).toFixed(0)}K`;
      return `₦${Math.round(v).toLocaleString()}`;
    case "percent": return `${v.toFixed(1)}%`;
    case "days": return `${v.toFixed(1)}d`;
    case "ratio": return v.toFixed(2);
    default: return Math.round(v).toLocaleString();
  }
};

const KPIDashboard = () => {
  const { organizationId, tenantMode } = useAuth();
  const isLD = tenantMode === "LOGISTICS_DEPARTMENT";
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"mom" | "qoq" | "yoy">("mom");
  const [kpis, setKpis] = useState<KPICard[]>([]);

  useEffect(() => { fetchKPIs(); /* eslint-disable-next-line */ }, [period, organizationId]);

  const fetchKPIs = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    try {
      const now = new Date();
      let cs: Date, ce: Date, ps: Date, pe: Date;
      if (period === "mom") {
        cs = startOfMonth(now); ce = now;
        ps = startOfMonth(subMonths(now, 1)); pe = endOfMonth(subMonths(now, 1));
      } else if (period === "qoq") {
        cs = startOfQuarter(now); ce = now;
        ps = startOfQuarter(subMonths(now, 3)); pe = endOfQuarter(subMonths(now, 3));
      } else {
        cs = startOfYear(now); ce = now;
        ps = startOfYear(subYears(now, 1)); pe = subYears(now, 1);
      }
      const cI = cs.toISOString(), eI = ce.toISOString(), pI = ps.toISOString(), peI = pe.toISOString();
      const orgEq = (q: any) => q.eq("organization_id", organizationId);

      const [curInv, prvInv, curDisp, prvDisp, curExp, prvExp, curFuel, prvFuel, vehicles, drivers, curWB, prvWB, curVP, prvVP, ar, ap, curMaint, prvMaint] = await Promise.all([
        orgEq(supabase.from("invoices").select("total_amount, tax_amount, amount, status").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("invoices").select("total_amount, tax_amount, amount, status").gte("created_at", pI).lte("created_at", peI)),
        orgEq(supabase.from("dispatches").select("id, distance_km, cost, status, actual_delivery, scheduled_delivery, on_time_flag, pod_confirmed, cargo_weight_kg, load_capacity_pct, created_at").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("dispatches").select("id, distance_km, cost, status, actual_delivery, scheduled_delivery, on_time_flag, pod_confirmed, cargo_weight_kg, load_capacity_pct, created_at").gte("created_at", pI).lte("created_at", peI)),
        orgEq(supabase.from("expenses").select("amount").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("expenses").select("amount").gte("created_at", pI).lte("created_at", peI)),
        orgEq(supabase.from("fuel_logs").select("total_cost, litres_dispensed, km_per_litre").gte("log_date", cs.toISOString().split("T")[0]).lte("log_date", ce.toISOString().split("T")[0])),
        orgEq(supabase.from("fuel_logs").select("total_cost, litres_dispensed, km_per_litre").gte("log_date", ps.toISOString().split("T")[0]).lte("log_date", pe.toISOString().split("T")[0])),
        orgEq(supabase.from("vehicles").select("id, status, health_score, lifetime_km, monthly_km")),
        orgEq(supabase.from("drivers").select("id, status")),
        orgEq(supabase.from("waybills").select("id, total_drops, status, created_at").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("waybills").select("id, total_drops, status, created_at").gte("created_at", pI).lte("created_at", peI)),
        orgEq(supabase.from("vendor_payables").select("amount, status, created_at").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("vendor_payables").select("amount, status, created_at").gte("created_at", pI).lte("created_at", peI)),
        orgEq(supabase.from("accounts_receivable").select("balance, status")),
        orgEq(supabase.from("accounts_payable").select("balance, status")),
        orgEq(supabase.from("fleet_maintenance_orders").select("total_cost, status, created_at").gte("created_at", cI).lte("created_at", eI)),
        orgEq(supabase.from("fleet_maintenance_orders").select("total_cost, status, created_at").gte("created_at", pI).lte("created_at", peI)),
      ]);

      const sum = (arr: any[] | null | undefined, k: string) => (arr || []).reduce((s, r) => s + Number(r?.[k] || 0), 0);
      const trend = (c: number, p: number) => p === 0 ? (c > 0 ? 100 : 0) : Math.round(((c - p) / p) * 100);

      // Financial
      const curRev = sum(curInv.data, "total_amount");
      const prvRev = sum(prvInv.data, "total_amount");
      const curVAT = sum(curInv.data, "tax_amount");
      const prvVAT = sum(prvInv.data, "tax_amount");
      const curOpex = sum(curExp.data, "amount");
      const prvOpex = sum(prvExp.data, "amount");
      const curFuelCost = sum(curFuel.data, "total_cost");
      const prvFuelCost = sum(prvFuel.data, "total_cost");
      const curMaintCost = sum(curMaint.data, "total_cost");
      const prvMaintCost = sum(prvMaint.data, "total_cost");
      const curCOGS = curOpex + curFuelCost + curMaintCost;
      const prvCOGS = prvOpex + prvFuelCost + prvMaintCost;
      const curGM = curRev - curCOGS;
      const prvGM = prvRev - prvCOGS;
      const curGMpct = curRev > 0 ? (curGM / curRev) * 100 : 0;
      const prvGMpct = prvRev > 0 ? (prvGM / prvRev) * 100 : 0;
      const arOutstanding = sum(ar.data, "balance");
      const apOutstanding = sum(ap.data, "balance");

      // Operational / OTIF / Volume
      const curD = curDisp.data || [];
      const prvD = prvDisp.data || [];
      const curDel = curD.filter((d: any) => ["delivered", "closed"].includes(d.status));
      const prvDel = prvD.filter((d: any) => ["delivered", "closed"].includes(d.status));
      const curOnTime = curDel.filter((d: any) => d.on_time_flag === true || (d.actual_delivery && d.scheduled_delivery && new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)));
      const prvOnTime = prvDel.filter((d: any) => d.on_time_flag === true || (d.actual_delivery && d.scheduled_delivery && new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)));
      const curOTR = curDel.length ? (curOnTime.length / curDel.length) * 100 : 0;
      const prvOTR = prvDel.length ? (prvOnTime.length / prvDel.length) * 100 : 0;
      const curInFull = curDel.filter((d: any) => d.pod_confirmed === true);
      const prvInFull = prvDel.filter((d: any) => d.pod_confirmed === true);
      const curIF = curDel.length ? (curInFull.length / curDel.length) * 100 : 0;
      const prvIF = prvDel.length ? (prvInFull.length / prvDel.length) * 100 : 0;
      const curOTIF = curDel.length ? (curDel.filter((d: any) => (d.on_time_flag === true) && d.pod_confirmed === true).length / curDel.length) * 100 : 0;
      const prvOTIF = prvDel.length ? (prvDel.filter((d: any) => (d.on_time_flag === true) && d.pod_confirmed === true).length / prvDel.length) * 100 : 0;
      const curKm = sum(curDel, "distance_km");
      const prvKm = sum(prvDel, "distance_km");
      const curWeight = sum(curDel, "cargo_weight_kg");
      const prvWeight = sum(prvDel, "cargo_weight_kg");
      const curDrops = sum(curWB.data, "total_drops") || curD.length;
      const prvDrops = sum(prvWB.data, "total_drops") || prvD.length;
      const curLoadFactor = curD.length ? curD.reduce((s: number, d: any) => s + Number(d.load_capacity_pct || 0), 0) / curD.length : 0;
      const prvLoadFactor = prvD.length ? prvD.reduce((s: number, d: any) => s + Number(d.load_capacity_pct || 0), 0) / prvD.length : 0;

      // Fleet
      const veh = vehicles.data || [];
      const drv = drivers.data || [];
      const activeVeh = veh.filter((v: any) => ["active", "en_route", "loading", "available"].includes(v.status)).length;
      const utilization = veh.length ? (activeVeh / veh.length) * 100 : 0;
      const avgHealth = veh.length ? veh.reduce((s: number, v: any) => s + Number(v.health_score || 0), 0) / veh.length : 0;

      // Fuel
      const curLitres = sum(curFuel.data, "litres_dispensed");
      const prvLitres = sum(prvFuel.data, "litres_dispensed");
      const curKMPL = (curFuel.data || []).filter((f: any) => f.km_per_litre).length
        ? (curFuel.data || []).reduce((s: number, f: any) => s + Number(f.km_per_litre || 0), 0) / (curFuel.data || []).filter((f: any) => f.km_per_litre).length
        : 0;
      const prvKMPL = (prvFuel.data || []).filter((f: any) => f.km_per_litre).length
        ? (prvFuel.data || []).reduce((s: number, f: any) => s + Number(f.km_per_litre || 0), 0) / (prvFuel.data || []).filter((f: any) => f.km_per_litre).length
        : 0;

      // Cost
      const curCpKm = curKm > 0 ? curCOGS / curKm : 0;
      const prvCpKm = prvKm > 0 ? prvCOGS / prvKm : 0;
      const curCpDrop = curDrops > 0 ? curCOGS / curDrops : 0;
      const prvCpDrop = prvDrops > 0 ? prvCOGS / prvDrops : 0;
      const curRpKm = curKm > 0 ? curRev / curKm : 0;
      const prvRpKm = prvKm > 0 ? prvRev / prvKm : 0;
      const curRpTrip = curD.length ? curRev / curD.length : 0;
      const prvRpTrip = prvD.length ? prvRev / prvD.length : 0;

      const results: KPICard[] = [
        // Financial
        { name: "Revenue", current: curRev, previous: prvRev, trend: trend(curRev, prvRev), format: "currency", category: "financial" },
        { name: "Gross Margin", current: curGM, previous: prvGM, trend: trend(curGM, prvGM), format: "currency", category: "financial" },
        { name: "Gross Margin %", current: curGMpct, previous: prvGMpct, trend: trend(curGMpct, prvGMpct), format: "percent", category: "financial" },
        { name: "Operating Expenses", current: curOpex, previous: prvOpex, trend: trend(curOpex, prvOpex), format: "currency", category: "financial", invertGood: true },
        { name: "VAT Payable", current: curVAT, previous: prvVAT, trend: trend(curVAT, prvVAT), format: "currency", category: "financial" },
        { name: "Receivables Outstanding", current: arOutstanding, previous: arOutstanding, trend: 0, format: "currency", category: "financial", invertGood: true },
        { name: "Payables Outstanding", current: apOutstanding, previous: apOutstanding, trend: 0, format: "currency", category: "financial", invertGood: true },
        { name: "Avg Revenue/Trip", current: curRpTrip, previous: prvRpTrip, trend: trend(curRpTrip, prvRpTrip), format: "currency", category: "financial" },
        // Volume
        { name: "Trips Completed", current: curDel.length, previous: prvDel.length, trend: trend(curDel.length, prvDel.length), format: "number", category: "volume" },
        { name: "Trips Dispatched", current: curD.length, previous: prvD.length, trend: trend(curD.length, prvD.length), format: "number", category: "volume" },
        { name: "Drop Volume", current: curDrops, previous: prvDrops, trend: trend(curDrops, prvDrops), format: "number", category: "volume" },
        { name: "Distance Covered (km)", current: curKm, previous: prvKm, trend: trend(curKm, prvKm), format: "number", category: "volume" },
        { name: "Cargo Weight (kg)", current: curWeight, previous: prvWeight, trend: trend(curWeight, prvWeight), format: "number", category: "volume" },
        { name: "Avg Load Factor", current: curLoadFactor, previous: prvLoadFactor, trend: trend(curLoadFactor, prvLoadFactor), format: "percent", category: "volume" },
        // OTIF / Operational
        { name: "On-Time Rate", current: curOTR, previous: prvOTR, trend: trend(curOTR, prvOTR), format: "percent", category: "otif" },
        { name: "In-Full Rate (POD)", current: curIF, previous: prvIF, trend: trend(curIF, prvIF), format: "percent", category: "otif" },
        { name: "OTIF", current: curOTIF, previous: prvOTIF, trend: trend(curOTIF, prvOTIF), format: "percent", category: "otif" },
        { name: "Failed/Late Trips", current: curDel.length - curOnTime.length, previous: prvDel.length - prvOnTime.length, trend: trend(curDel.length - curOnTime.length, prvDel.length - prvOnTime.length), format: "number", category: "otif", invertGood: true },
        // Fleet
        { name: "Total Vehicles", current: veh.length, previous: veh.length, trend: 0, format: "number", category: "fleet" },
        { name: "Active Vehicles", current: activeVeh, previous: activeVeh, trend: 0, format: "number", category: "fleet" },
        { name: "Fleet Utilization", current: utilization, previous: utilization, trend: 0, format: "percent", category: "fleet" },
        { name: "Avg Vehicle Health", current: avgHealth, previous: avgHealth, trend: 0, format: "number", category: "fleet" },
        { name: "Total Drivers", current: drv.length, previous: drv.length, trend: 0, format: "number", category: "fleet" },
        { name: "Avg KM / Litre", current: curKMPL, previous: prvKMPL, trend: trend(curKMPL, prvKMPL), format: "ratio", category: "fleet" },
        // Cost
        { name: "Cost per KM", current: curCpKm, previous: prvCpKm, trend: trend(curCpKm, prvCpKm), format: "currency", category: "cost", invertGood: true },
        { name: "Cost per Drop", current: curCpDrop, previous: prvCpDrop, trend: trend(curCpDrop, prvCpDrop), format: "currency", category: "cost", invertGood: true },
        { name: "Revenue per KM", current: curRpKm, previous: prvRpKm, trend: trend(curRpKm, prvRpKm), format: "currency", category: "cost" },
        { name: "Fuel Spend", current: curFuelCost, previous: prvFuelCost, trend: trend(curFuelCost, prvFuelCost), format: "currency", category: "cost", invertGood: true },
        { name: "Maintenance Spend", current: curMaintCost, previous: prvMaintCost, trend: trend(curMaintCost, prvMaintCost), format: "currency", category: "cost", invertGood: true },
        { name: "Total Cost (COGS)", current: curCOGS, previous: prvCOGS, trend: trend(curCOGS, prvCOGS), format: "currency", category: "cost", invertGood: true },
        { name: "Litres Consumed", current: curLitres, previous: prvLitres, trend: trend(curLitres, prvLitres), format: "number", category: "cost", invertGood: true },
      ];

      setKpis(results);
    } catch (err) {
      console.error("KPI fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const periodLabel = period === "mom" ? "Month-over-Month" : period === "qoq" ? "Quarter-over-Quarter" : "Year-over-Year";

  const renderCard = (kpi: KPICard, index: number) => {
    const up = kpi.trend > 0;
    const isGood = kpi.invertGood ? !up : up;
    return (
      <motion.div key={kpi.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.03 }}>
        <Card className="border-border/50 hover:border-border transition-colors h-full">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground mb-2 font-medium">{kpi.name}</p>
            <div className="flex items-end justify-between gap-2">
              <p className="text-2xl font-bold font-heading">{fmtVal(kpi.current, kpi.format)}</p>
              {kpi.trend !== 0 ? (
                <Badge className={`text-xs ${isGood ? "bg-emerald-500/15 text-emerald-600" : "bg-destructive/15 text-destructive"}`}>
                  {up ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                  {kpi.trend > 0 ? "+" : ""}{kpi.trend}%
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs"><Minus className="w-3 h-3 mr-0.5" />0%</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">vs {fmtVal(kpi.previous, kpi.format)} prev</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const byCat = (c: KPICat) => kpis.filter(k => k.category === c);

  return (
    <DashboardLayout title="KPI Intelligence" subtitle="Live operational, financial, OTIF, fleet & cost KPIs from your tenant data">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{periodLabel} Comparison</p>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mom">Month-over-Month</SelectItem>
            <SelectItem value="qoq">Quarter-over-Quarter</SelectItem>
            <SelectItem value="yoy">Year-over-Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : !organizationId ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No organization context - sign in to a tenant to see KPIs.</CardContent></Card>
      ) : (
        <Tabs defaultValue={isLD ? "volume" : "financial"} className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            {!isLD && <TabsTrigger value="financial" className="gap-2"><DollarSign className="w-4 h-4" />Financial</TabsTrigger>}
            <TabsTrigger value="volume" className="gap-2"><Package className="w-4 h-4" />Volume</TabsTrigger>
            <TabsTrigger value="otif" className="gap-2"><Truck className="w-4 h-4" />OTIF / Logistics</TabsTrigger>
            <TabsTrigger value="cost" className="gap-2"><Fuel className="w-4 h-4" />Cost</TabsTrigger>
            <TabsTrigger value="fleet" className="gap-2"><Gauge className="w-4 h-4" />Fleet</TabsTrigger>
            <TabsTrigger value="strategic" className="gap-2"><Brain className="w-4 h-4" />Strategic</TabsTrigger>
          </TabsList>

          {((isLD ? ["volume", "otif", "cost", "fleet"] : ["financial", "volume", "otif", "cost", "fleet"]) as KPICat[]).map(cat => (
            <TabsContent key={cat} value={cat}>
              {byCat(cat).length === 0 ? (
                <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No data yet for this period.</CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {byCat(cat).map((k, i) => renderCard(k, i))}
                </div>
              )}
            </TabsContent>
          ))}

          <TabsContent value="strategic">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...byCat("cost").filter(k => ["Cost per KM", "Cost per Drop", "Revenue per KM"].includes(k.name)), ...byCat("otif").filter(k => k.name === "OTIF")].map((k, i) => renderCard(k, i))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
};

export default KPIDashboard;
