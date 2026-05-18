import { useState, useEffect } from "react";
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
import { format, startOfWeek, endOfWeek, subWeeks, eachDayOfInterval } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface WeeklyMetrics {
  totalTrips: number;
  completedTrips: number;
  onTimeRate: number;
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [metrics, setMetrics] = useState<WeeklyMetrics | null>(null);
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [loading, setLoading] = useState(true);

  const currentWeekStart = startOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const currentWeekEnd = endOfWeek(subWeeks(new Date(), weekOffset), { weekStartsOn: 1 });

  useEffect(() => {
    fetchWeeklyData();
  }, [weekOffset]);

  const fetchWeeklyData = async () => {
    setLoading(true);
    try {
      const startISO = currentWeekStart.toISOString();
      const endISO = currentWeekEnd.toISOString();

      // Fetch dispatches for the week
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, status, distance_km, scheduled_delivery, actual_delivery, driver_id, vehicle_id, created_at")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      // Fetch blocked orders
      const { data: blockedOrders } = await supabase
        .from("blocked_orders")
        .select("id")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (!dispatches) {
        setLoading(false);
        return;
      }

      const totalTrips = dispatches.length;
      const completedTrips = dispatches.filter(d => d.status === "delivered").length;
      const onTimeDeliveries = dispatches.filter(d =>
        d.status === "delivered" &&
        d.scheduled_delivery &&
        d.actual_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
      ).length;
      const onTimeRate = completedTrips > 0 ? (onTimeDeliveries / completedTrips) * 100 : 0;
      const totalDistance = dispatches.reduce((sum, d) => sum + Number(d.distance_km || 0), 0);
      const activeDrivers = new Set(dispatches.map(d => d.driver_id).filter(Boolean)).size;
      const activeVehicles = new Set(dispatches.map(d => d.vehicle_id).filter(Boolean)).size;
      const avgTripsPerDay = totalTrips / 7;
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

      // Build daily breakdown
      const days = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });
      const dailyBreakdown: DailyData[] = days.map((day) => {
        const dayStart = new Date(day);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);

        const dayDispatches = dispatches.filter(d => {
          const created = new Date(d.created_at);
          return created >= dayStart && created <= dayEnd;
        });

        return {
          day: format(day, "EEE"),
          trips: dayDispatches.length,
          completed: dayDispatches.filter(d => d.status === "delivered").length,
          distance: dayDispatches.reduce((sum, d) => sum + Number(d.distance_km || 0), 0),
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
    doc.text("Weekly Operations Report", pageWidth / 2, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(
      `Week of ${format(currentWeekStart, "MMM d")} - ${format(currentWeekEnd, "MMM d, yyyy")}`,
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
      doc.text(`On-Time Rate: ${metrics.onTimeRate.toFixed(1)}%`, 14, 69);
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
      head: [["Day", "Trips", "Completed", "Distance"]],
      body: tableData,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`weekly-ops-report-${format(currentWeekStart, "yyyy-MM-dd")}.pdf`);
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
            Weekly Operations Dashboard
          </h3>
          <p className="text-sm text-muted-foreground">
            {format(currentWeekStart, "MMMM d")} - {format(currentWeekEnd, "MMMM d, yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={weekOffset.toString()} onValueChange={(v) => setWeekOffset(parseInt(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">This Week</SelectItem>
              <SelectItem value="1">Last Week</SelectItem>
              <SelectItem value="2">2 Weeks Ago</SelectItem>
              <SelectItem value="3">3 Weeks Ago</SelectItem>
              <SelectItem value="4">4 Weeks Ago</SelectItem>
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
                <div className={`p-2 rounded-lg ${metrics.onTimeRate >= 90 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  <Clock className={`w-5 h-5 ${metrics.onTimeRate >= 90 ? 'text-success' : 'text-warning'}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.onTimeRate.toFixed(0)}%</p>
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
