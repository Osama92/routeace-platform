import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { scoreOtd, OTD_SELECT } from "@/lib/otd";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { 
  Calendar, 
  TrendingUp, 
  Truck, 
  Users, 
  MapPin, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Download
} from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval,
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears,
  eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface WeeklyMetrics {
  totalTrips: number;
  completedTrips: number;
  /** null when no trip in the period could be scored — rendered as "—". */
  onTimeRate: number | null;
  totalDistance: number;
  activeDrivers: number;
  activeVehicles: number;
  avgTripsPerDay: number;
  issues: number;
}

interface DailyData {
  day: string;
  trips: number;
  completed: number;
  distance: number;
}

const WeeklyOpsDashboard = () => {
  // Period granularity. The panel was week-only, so month-on-month and
  // year-on-year comparison were not expressible.
  const { organizationId } = useAuth();
  const [periodType, setPeriodType] = useState<"week" | "month" | "year">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const currentWeekStart =
    periodType === "week"  ? startOfWeek(subWeeks(now, weekOffset), { weekStartsOn: 1 })
  : periodType === "month" ? startOfMonth(subMonths(now, weekOffset))
  :                          startOfYear(subYears(now, weekOffset));
  const currentWeekEnd =
    periodType === "week"  ? endOfWeek(subWeeks(now, weekOffset), { weekStartsOn: 1 })
  : periodType === "month" ? endOfMonth(subMonths(now, weekOffset))
  :                          endOfYear(subYears(now, weekOffset));

  useEffect(() => {
    if (!organizationId) return;
    fetchWeeklyData();
  }, [weekOffset, periodType, organizationId]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const startISO = currentWeekStart.toISOString();
      const endISO = currentWeekEnd.toISOString();

      // Fetch dispatches for the week
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select(`id, status, distance_km, driver_id, vehicle_id, created_at, ${OTD_SELECT}`)
        .eq("organization_id", organizationId!)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      // Fetch blocked orders
      const { data: blockedOrders } = await supabase
        .from("blocked_orders")
        .select("id")
        .eq("organization_id", organizationId!)
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (!dispatches) {
        setLoading(false);
        return;
      }

      const totalTrips = dispatches.length;
      const completedTrips = dispatches.filter(d => d.status === "delivered").length;
      // Scored via the shared helper. This compared actual_delivery against
      // scheduled_delivery, which is NULL on every dispatch in production, so
      // the rate was structurally always 0%. See src/lib/otd.ts.
      const otd = scoreOtd(dispatches as any);
      const onTimeRate = otd.rate;
      const totalDistance = dispatches.reduce((sum, d) => sum + Number(d.distance_km || 0), 0);
      const activeDrivers = new Set(dispatches.map(d => d.driver_id).filter(Boolean)).size;
      const activeVehicles = new Set(dispatches.map(d => d.vehicle_id).filter(Boolean)).size;
      // Days actually in the selected period — this was hardcoded to 7, which
      // silently understated the average by ~4x on a month and ~52x on a year.
      const periodDays = Math.max(
        1,
        Math.round((currentWeekEnd.getTime() - currentWeekStart.getTime()) / 86400000) + 1,
      );
      const avgTripsPerDay = totalTrips / periodDays;
      const issues = blockedOrders?.length || 0;

      setMetrics({
        totalTrips,
        completedTrips,
        onTimeRate,
        totalDistance,
        activeDrivers,
        activeVehicles,
        avgTripsPerDay,
        issues,
      });

      // Bucket the breakdown to suit the period. Charting a year by day would
      // render 365 bars all labelled Mon/Tue/..., which is unreadable and
      // repeats each weekday name 52 times.
      const buckets =
        periodType === "week"
          ? eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })
              .map((d) => ({ start: d, label: format(d, "EEE") }))
          : periodType === "month"
          ? eachWeekOfInterval(
              { start: currentWeekStart, end: currentWeekEnd },
              { weekStartsOn: 1 },
            ).map((d) => ({ start: d, label: format(d, "d MMM") }))
          : eachMonthOfInterval({ start: currentWeekStart, end: currentWeekEnd })
              .map((d) => ({ start: d, label: format(d, "MMM") }));

      const dailyBreakdown: DailyData[] = buckets.map(({ start, label }, i) => {
        const bucketStart = new Date(start);
        // Each bucket runs up to the next one, or to the end of the period.
        const bucketEnd =
          i + 1 < buckets.length ? new Date(buckets[i + 1].start) : new Date(currentWeekEnd);
        if (i + 1 < buckets.length) bucketEnd.setMilliseconds(bucketEnd.getMilliseconds() - 1);

        const bucketDispatches = dispatches.filter((d) => {
          const created = new Date(d.created_at);
          return created >= bucketStart && created <= bucketEnd;
        });

        return {
          day: label,
          trips: bucketDispatches.length,
          completed: bucketDispatches.filter((d) => d.status === "delivered").length,
          distance: bucketDispatches.reduce((sum, d) => sum + Number(d.distance_km || 0), 0),
        };
      });

      setDailyData(dailyBreakdown);
    } catch (error) {
      console.error("Error fetching weekly data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    // Title, subtitle, column header and filename all follow the selected
    // period — they previously said "Weekly" regardless of what was exported.
    const periodWord = periodType === "week" ? "Weekly" : periodType === "month" ? "Monthly" : "Yearly";
    doc.text(`${periodWord} Operations Report`, pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(
      periodType === "year"
        ? format(currentWeekStart, "yyyy")
        : periodType === "month"
        ? format(currentWeekStart, "MMMM yyyy")
        : `Week of ${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}`,
      pageWidth / 2,
      28,
      { align: "center" }
    );

    if (metrics) {
      doc.setFontSize(12);
      doc.text("Summary", 14, 45);
      doc.setFontSize(10);
      doc.text(`Total Trips: ${metrics.totalTrips}`, 14, 55);
      doc.text(`Completed: ${metrics.completedTrips}`, 14, 62);
      doc.text(`On-Time Rate: ${metrics.onTimeRate === null ? "Not tracked" : `${metrics.onTimeRate.toFixed(1)}%`}`, 14, 69);
      doc.text(`Total Distance: ${formatNumber(metrics.totalDistance)} km`, 14, 76);
      doc.text(`Active Drivers: ${metrics.activeDrivers}`, 14, 83);
      doc.text(`Active Vehicles: ${metrics.activeVehicles}`, 14, 90);
    }

    const tableData = dailyData.map((d) => [
      d.day,
      d.trips,
      d.completed,
      `${d.distance.toFixed(0)} km`,
    ]);

    autoTable(doc, {
      startY: 100,
      head: [[
        periodType === "week" ? "Day" : periodType === "month" ? "Week" : "Month",
        "Trips", "Completed", "Distance",
      ]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`${periodWord.toLowerCase()}-ops-report-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Operations Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            {periodType === "year"
              ? format(currentWeekStart, "yyyy")
              : periodType === "month"
              ? format(currentWeekStart, "MMMM yyyy")
              : `${format(currentWeekStart, "MMMM d")} - ${format(currentWeekEnd, "MMMM d, yyyy")}`}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Granularity: enables week-on-week, month-on-month and
              year-on-year comparison. Changing it resets the offset so the
              view always lands on the current period. */}
          <Select
            value={periodType}
            onValueChange={(v) => { setPeriodType(v as any); setWeekOffset(0); }}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
              <SelectItem value="year">Yearly</SelectItem>
            </SelectContent>
          </Select>

          <Select value={weekOffset.toString()} onValueChange={(v) => setWeekOffset(parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[0, 1, 2, 3, 4].map((n) => (
                <SelectItem key={n} value={n.toString()}>
                  {n === 0
                    ? `This ${periodType === "week" ? "Week" : periodType === "month" ? "Month" : "Year"}`
                    : n === 1
                    ? `Last ${periodType === "week" ? "Week" : periodType === "month" ? "Month" : "Year"}`
                    : `${n} ${periodType === "week" ? "Weeks" : periodType === "month" ? "Months" : "Years"} Ago`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.totalTrips}</p>
                  <p className="text-xs text-muted-foreground">Total Trips</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.completedTrips}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
              <Progress value={(metrics.completedTrips / Math.max(metrics.totalTrips, 1)) * 100} className="h-1.5 mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${(metrics.onTimeRate ?? 0) >= 90 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <Clock className={`w-5 h-5 ${(metrics.onTimeRate ?? 0) >= 90 ? 'text-success' : 'text-warning'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.onTimeRate === null ? "—" : `${metrics.onTimeRate.toFixed(0)}%`}</p>
                  <p className="text-xs text-muted-foreground">On-Time Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MapPin className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatNumber(metrics.totalDistance)}</p>
                  <p className="text-xs text-muted-foreground">Total KM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.activeDrivers}</p>
                  <p className="text-xs text-muted-foreground">Active Drivers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <Truck className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.activeVehicles}</p>
                  <p className="text-xs text-muted-foreground">Active Vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.avgTripsPerDay.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Avg/Day</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={metrics.issues > 0 ? "border-destructive/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${metrics.issues > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                  <AlertTriangle className={`w-5 h-5 ${metrics.issues > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.issues}</p>
                  <p className="text-xs text-muted-foreground">Blocked Orders</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Trip Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="trips" fill="hsl(var(--primary))" name="Total Trips" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="hsl(142, 76%, 36%)" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Daily Distance Covered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [`${value.toFixed(0)} km`, "Distance"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="distance"
                    stroke="hsl(199, 89%, 48%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(199, 89%, 48%)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WeeklyOpsDashboard;
