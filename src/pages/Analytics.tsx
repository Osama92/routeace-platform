import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Truck,
  Clock,
  DollarSign,
  MapPin,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AnalyticsDateFilterBar, useAnalyticsDateFilter } from "@/components/analytics/AnalyticsDateFilter";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  format,
  startOfDay,
  endOfDay,
  differenceInDays,
  subDays,
  subMonths,
  subYears,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
} from "date-fns";

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(0)}K`;
  return `₦${Math.round(value).toLocaleString()}`;
};

// Get the previous period range for comparison (MoM or YoY)
function getPreviousPeriodRange(start: Date, end: Date, periodType: string) {
  if (periodType === "year") {
    return { start: subYears(start, 1), end: subYears(end, 1) };
  }
  // For week/month, compare to previous period of same length
  const days = differenceInDays(end, start);
  return { start: subDays(start, days + 1), end: subDays(start, 1) };
}

function calcChange(current: number, previous: number) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

const AnalyticsPage = () => {
  const { range, periodType, offset, goBack, goForward, changePeriod } = useAnalyticsDateFilter("month");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const [kpis, setKpis] = useState({
    totalDeliveries: 0, prevDeliveries: 0,
    onTimeRate: 0, prevOnTimeRate: 0,
    revenue: 0, prevRevenue: 0,
    avgDistance: 0, prevAvgDistance: 0,
  });

  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [fleetUtilization, setFleetUtilization] = useState<any[]>([]);
  const [topRoutes, setTopRoutes] = useState<any[]>([]);
  const [driverPerformance, setDriverPerformance] = useState<any[]>([]);
  const [momComparison, setMomComparison] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [periodType, range.start.getTime(), range.end.getTime()]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const startISO = range.start.toISOString();
      const endISO = range.end.toISOString();

      // Previous period for comparison
      const prev = getPreviousPeriodRange(range.start, range.end, periodType);
      const prevStartISO = prev.start.toISOString();
      const prevEndISO = prev.end.toISOString();

      // Fetch current + previous period data in parallel
      const [
        { data: dispatches },
        { data: invoices },
        { data: prevDispatches },
        { data: prevInvoices },
        { data: vehicles },
        { data: drivers },
      ] = await Promise.all([
        supabase.from("dispatches")
          .select("id, status, distance_km, scheduled_delivery, actual_delivery, pickup_address, delivery_address, created_at")
          .gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("invoices")
          .select("total_amount, created_at")
          .gte("created_at", startISO).lte("created_at", endISO),
        supabase.from("dispatches")
          .select("id, status, distance_km, scheduled_delivery, actual_delivery, created_at")
          .gte("created_at", prevStartISO).lte("created_at", prevEndISO),
        supabase.from("invoices")
          .select("total_amount, created_at")
          .gte("created_at", prevStartISO).lte("created_at", prevEndISO),
        supabase.from("vehicles").select("status"),
        supabase.from("drivers")
          .select("full_name, rating, total_trips, status")
          .order("rating", { ascending: false }).limit(5),
      ]);

      // --- Current period KPIs ---
      const deliveredCurrent = dispatches?.filter(d => d.status === "delivered") || [];
      const totalDeliveries = deliveredCurrent.length;
      const onTimeCurrent = deliveredCurrent.filter(d =>
        d.scheduled_delivery && d.actual_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
      ).length;
      const onTimeRate = totalDeliveries > 0 ? (onTimeCurrent / totalDeliveries) * 100 : 0;
      const revenue = invoices?.reduce((s, i) => s + Number(i.total_amount || 0), 0) || 0;
      const totalDist = deliveredCurrent.reduce((s, d) => s + Number(d.distance_km || 0), 0);
      const avgDistance = totalDeliveries > 0 ? totalDist / totalDeliveries : 0;

      // --- Previous period KPIs ---
      const deliveredPrev = prevDispatches?.filter(d => d.status === "delivered") || [];
      const prevDeliveries = deliveredPrev.length;
      const onTimePrev = deliveredPrev.filter(d =>
        d.scheduled_delivery && d.actual_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
      ).length;
      const prevOnTimeRate = prevDeliveries > 0 ? (onTimePrev / prevDeliveries) * 100 : 0;
      const prevRevenue = prevInvoices?.reduce((s, i) => s + Number(i.total_amount || 0), 0) || 0;
      const prevTotalDist = deliveredPrev.reduce((s, d) => s + Number(d.distance_km || 0), 0);
      const prevAvgDistance = prevDeliveries > 0 ? prevTotalDist / prevDeliveries : 0;

      setKpis({
        totalDeliveries, prevDeliveries,
        onTimeRate, prevOnTimeRate,
        revenue, prevRevenue,
        avgDistance, prevAvgDistance,
      });

      // --- Build trend data based on period type ---
      const dayCount = differenceInDays(range.end, range.start);
      let intervals: Date[];
      let labelFmt: string;

      if (dayCount <= 14) {
        intervals = eachDayOfInterval({ start: range.start, end: range.end });
        labelFmt = "MMM dd";
      } else if (dayCount <= 90) {
        intervals = eachWeekOfInterval({ start: range.start, end: range.end });
        labelFmt = "MMM dd";
      } else {
        intervals = eachMonthOfInterval({ start: range.start, end: range.end });
        labelFmt = "MMM yyyy";
      }

      const deliveryTrend = intervals.map((interval, idx) => {
        const iStart = startOfDay(interval);
        const iEnd = idx < intervals.length - 1 ? startOfDay(intervals[idx + 1]) : endOfDay(range.end);

        const periodDispatches = dispatches?.filter(d => {
          const c = new Date(d.created_at);
          return c >= iStart && c < iEnd;
        }) || [];

        const delivered = periodDispatches.filter(d => d.status === "delivered").length;
        const delayed = periodDispatches.filter(d =>
          d.status === "delivered" && d.scheduled_delivery && d.actual_delivery &&
          new Date(d.actual_delivery) > new Date(d.scheduled_delivery)
        ).length;

        return {
          date: format(interval, labelFmt),
          deliveries: periodDispatches.length,
          onTime: delivered - delayed,
          delayed,
        };
      });
      setDeliveryData(deliveryTrend);

      // --- Revenue trend for current period ---
      const revenueTrend = intervals.map((interval, idx) => {
        const iStart = startOfDay(interval);
        const iEnd = idx < intervals.length - 1 ? startOfDay(intervals[idx + 1]) : endOfDay(range.end);

        const periodInvoices = invoices?.filter(inv => {
          const c = new Date(inv.created_at);
          return c >= iStart && c < iEnd;
        }) || [];

        const rev = periodInvoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
        return { date: format(interval, labelFmt), revenue: rev, costs: rev * 0.65 };
      });
      setRevenueData(revenueTrend);

      // --- MoM / YoY comparison chart (last 6 periods) - fetch independently ---
      const comparisonCount = periodType === "year" ? 3 : 6;
      const comparisonPromises = [];
      for (let i = comparisonCount - 1; i >= 0; i--) {
        const mStart = periodType === "year"
          ? startOfYear(subYears(new Date(), i))
          : periodType === "week"
            ? startOfDay(subDays(new Date(), (i + 1) * 7))
            : startOfMonth(subMonths(new Date(), i));
        const mEnd = periodType === "year"
          ? endOfYear(subYears(new Date(), i))
          : periodType === "week"
            ? endOfDay(subDays(new Date(), i * 7))
            : endOfMonth(subMonths(new Date(), i));

        comparisonPromises.push(
          Promise.all([
            supabase.from("dispatches")
              .select("id, status, scheduled_delivery, actual_delivery")
              .gte("created_at", mStart.toISOString())
              .lte("created_at", mEnd.toISOString()),
            supabase.from("invoices")
              .select("total_amount")
              .gte("created_at", mStart.toISOString())
              .lte("created_at", mEnd.toISOString()),
          ]).then(([dRes, iRes]) => {
            const mDispatches = dRes.data || [];
            const mInvoices = iRes.data || [];
            const mRev = mInvoices.reduce((s, inv) => s + Number(inv.total_amount || 0), 0);
            const mDelivered = mDispatches.filter(d => d.status === "delivered").length;
            const mOnTime = mDispatches.filter(d =>
              d.status === "delivered" && d.scheduled_delivery && d.actual_delivery &&
              new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
            ).length;
            return {
              period: periodType === "year"
                ? format(mStart, "yyyy")
                : periodType === "week"
                  ? format(mStart, "MMM dd")
                  : format(mStart, "MMM yy"),
              revenue: mRev,
              deliveries: mDelivered,
              otd: mDelivered > 0 ? Math.round((mOnTime / mDelivered) * 100) : 0,
            };
          })
        );
      }
      const comparisonData = await Promise.all(comparisonPromises);
      setMomComparison(comparisonData);

      // Fleet utilization
      const statusCounts = { available: 0, on_trip: 0, maintenance: 0, offline: 0 };
      vehicles?.forEach(v => {
        const status = v.status || "available";
        if (status in statusCounts) statusCounts[status as keyof typeof statusCounts]++;
      });
      const totalVehicles = vehicles?.length || 1;
      setFleetUtilization([
        { name: "Active", value: Math.round((statusCounts.on_trip / totalVehicles) * 100), color: "hsl(142, 76%, 36%)" },
        { name: "Available", value: Math.round((statusCounts.available / totalVehicles) * 100), color: "hsl(38, 92%, 50%)" },
        { name: "Maintenance", value: Math.round((statusCounts.maintenance / totalVehicles) * 100), color: "hsl(199, 89%, 48%)" },
        { name: "Offline", value: Math.round((statusCounts.offline / totalVehicles) * 100), color: "hsl(var(--muted))" },
      ]);

      // Top routes
      const routeMap = new Map<string, { trips: number; distance: number }>();
      dispatches?.forEach(d => {
        const route = `${d.pickup_address?.split(",")[0] || "Unknown"} → ${d.delivery_address?.split(",")[0] || "Unknown"}`;
        const existing = routeMap.get(route) || { trips: 0, distance: 0 };
        existing.trips++;
        existing.distance += Number(d.distance_km || 0);
        routeMap.set(route, existing);
      });
      setTopRoutes(
        Array.from(routeMap.entries())
          .map(([route, data]) => ({ route, ...data }))
          .sort((a, b) => b.trips - a.trips)
          .slice(0, 5)
      );

      // Driver performance
      setDriverPerformance(drivers?.map(d => ({
        name: d.full_name,
        rating: d.rating || 0,
        trips: d.total_trips || 0,
        onTime: Math.round((d.rating || 5) * 20),
        status: d.status || "available",
      })) || []);

    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({ title: "Error", description: "Failed to load analytics data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setExporting(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(18);
      doc.text("Analytics Report", pageWidth / 2, 20, { align: "center" });
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Period: ${range.label}`, pageWidth / 2, 28, { align: "center" });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2, 34, { align: "center" });

      doc.setFontSize(12);
      doc.setTextColor(40);
      doc.text("Key Performance Indicators", 14, 48);
      doc.setFontSize(10);
      doc.setTextColor(60);
      doc.text(`Total Deliveries: ${kpis.totalDeliveries} (${calcChange(kpis.totalDeliveries, kpis.prevDeliveries).toFixed(1)}% vs prev)`, 14, 56);
      doc.text(`On-Time Rate: ${kpis.onTimeRate.toFixed(1)}%`, 14, 63);
      doc.text(`Revenue: ${formatCurrency(kpis.revenue)} (${calcChange(kpis.revenue, kpis.prevRevenue).toFixed(1)}% vs prev)`, 14, 70);
      doc.text(`Avg. Distance: ${kpis.avgDistance.toFixed(0)} km`, 14, 77);

      if (topRoutes.length > 0) {
        doc.setFontSize(12);
        doc.text("Top Routes", 14, 92);
        autoTable(doc, {
          startY: 98,
          head: [["Route", "Trips", "Distance (km)"]],
          body: topRoutes.map(r => [r.route, r.trips.toString(), r.distance.toFixed(0)]),
          styles: { fontSize: 9, cellPadding: 2 },
          headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        });
      }

      doc.save(`analytics-${range.label.replace(/\s/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast({ title: "Report Downloaded", description: "Analytics report saved as PDF" });
    } catch (error) {
      toast({ title: "Export Failed", description: "Failed to generate report", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const comparisonLabel = periodType === "year" ? "YoY" : periodType === "week" ? "WoW" : "MoM";

  const kpiCards = [
    {
      title: "Total Deliveries",
      value: kpis.totalDeliveries.toString(),
      change: calcChange(kpis.totalDeliveries, kpis.prevDeliveries),
      icon: Truck,
    },
    {
      title: "On-Time Rate",
      value: `${kpis.onTimeRate.toFixed(1)}%`,
      change: kpis.onTimeRate - kpis.prevOnTimeRate,
      icon: Clock,
      suffix: "pp",
    },
    {
      title: "Revenue",
      value: formatCurrency(kpis.revenue),
      change: calcChange(kpis.revenue, kpis.prevRevenue),
      icon: DollarSign,
    },
    {
      title: "Avg. Distance/Trip",
      value: `${kpis.avgDistance.toFixed(0)} km`,
      change: calcChange(kpis.avgDistance, kpis.prevAvgDistance),
      icon: MapPin,
    },
  ];

  if (loading) {
    return (
      <DashboardLayout title="Analytics" subtitle="Performance insights and business intelligence">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Analytics" subtitle="Performance insights and business intelligence">
      {/* Date Filter Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <AnalyticsDateFilterBar
          range={range}
          periodType={periodType}
          onPeriodChange={changePeriod}
          onBack={goBack}
          onForward={goForward}
          canGoForward={offset < 0}
        />
        <Button variant="outline" size="sm" onClick={handleExportReport} disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Exporting..." : "Export Report"}
        </Button>
      </div>

      {/* KPI Cards with MoM/YoY comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpiCards.map((kpi, index) => {
          const isPositive = kpi.change > 0;
          const isNeutral = kpi.change === 0;
          const suffix = kpi.suffix || "%";
          return (
            <motion.div
              key={kpi.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="glass-card p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{kpi.title}</p>
                  <p className="text-3xl font-heading font-bold text-foreground mt-2">{kpi.value}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {isNeutral ? (
                      <Minus className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : isPositive ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-success" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                    )}
                    <span className={`text-sm font-medium ${isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"}`}>
                      {isPositive ? "+" : ""}{kpi.change.toFixed(1)}{suffix}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {comparisonLabel}
                    </Badge>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <kpi.icon className="w-6 h-6 text-primary" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-4">
            Delivery Performance - {range.label}
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={deliveryData}>
                <defs>
                  <linearGradient id="colorOnTime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDelayed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Area type="monotone" dataKey="onTime" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fill="url(#colorOnTime)" name="On Time" />
                <Area type="monotone" dataKey="delayed" stroke="hsl(0, 72%, 51%)" strokeWidth={2} fill="url(#colorDelayed)" name="Delayed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Fleet Utilization */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Fleet Utilization</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fleetUtilization} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                  {fleetUtilization.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {fleetUtilization.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-muted-foreground">{item.name} ({item.value}%)</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* MoM / YoY Comparison Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
            Revenue Trend ({comparisonLabel})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Last 6 {periodType === "year" ? "years" : periodType === "week" ? "weeks" : "months"}</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={momComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={formatCurrency} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [formatCurrency(v), "Revenue"]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-1">
            OTD & Deliveries ({comparisonLabel})
          </h3>
          <p className="text-xs text-muted-foreground mb-4">On-Time Delivery % and volume trend</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={momComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                <Line yAxisId="left" type="monotone" dataKey="deliveries" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Deliveries" />
                <Line yAxisId="right" type="monotone" dataKey="otd" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} name="OTD %" />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Revenue vs Costs + Top Routes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Revenue vs Operating Costs</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} tickFormatter={formatCurrency} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(v: number) => [formatCurrency(v), ""]} />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="costs" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} name="Costs" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card p-6">
          <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Top Routes by Trips</h3>
          <div className="space-y-4">
            {topRoutes.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No route data available</p>
            ) : (
              topRoutes.map((route, index) => (
                <div key={route.route} className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground text-sm">{route.route}</p>
                      <p className="text-xs text-muted-foreground">{route.trips} trips • {route.distance.toFixed(0)} km</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Driver Performance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-6">
        <h3 className="font-heading font-semibold text-lg text-foreground mb-4">Driver Performance Rankings</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {["Rank", "Driver", "Rating", "Total Trips", "On-Time Rate", "Status"].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-sm font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {driverPerformance.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No driver data available</td></tr>
              ) : (
                driverPerformance.sort((a, b) => b.rating - a.rating).map((driver, index) => (
                  <tr key={driver.name} className="border-b border-border/50">
                    <td className="py-3 px-4">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                        index === 0 ? "bg-warning/20 text-warning" : index === 1 ? "bg-muted text-muted-foreground" : "bg-secondary text-muted-foreground"
                      }`}>{index + 1}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground">{driver.name}</td>
                    <td className="py-3 px-4"><span className="text-warning">★</span> {driver.rating.toFixed(1)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{driver.trips}</td>
                    <td className="py-3 px-4">
                      <Badge className={driver.onTime >= 95 ? "bg-success/15 text-success" : driver.onTime >= 90 ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"}>
                        {driver.onTime}%
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={driver.status === "available" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}>{driver.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;
