import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import MetricCard from "@/components/dashboard/MetricCard";
import RecentShipments from "@/components/dashboard/RecentShipments";
import DeliveryChart from "@/components/dashboard/DeliveryChart";
import ActiveDrivers from "@/components/dashboard/ActiveDrivers";
import LiveMap from "@/components/dashboard/LiveMap";
import TargetPerformanceWidget from "@/components/dashboard/TargetPerformanceWidget";
import PendingApprovalsWidget from "@/components/dashboard/PendingApprovalsWidget";
import PendingUserApprovalsWidget from "@/components/dashboard/PendingUserApprovalsWidget";
import HistoricalComparisonWidget from "@/components/dashboard/HistoricalComparisonWidget";
import KPITrendCharts from "@/components/dashboard/KPITrendCharts";
import { OnboardingBanner } from "@/components/guidance/OnboardingAssistant";
import { Package, Truck, MapPin, DollarSign, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const formatCurrencyCompact = (amount: number) => {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}K`;
  return `₦${amount.toFixed(0)}`;
};

const formatNumberCompact = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${Math.round(value)}`;
};

const startOfMonthISO = () => {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return start.toISOString();
};

const Dashboard = () => {
  const { userRole, tenantMode } = useAuth();
  const [kpis, setKpis] = useState({
    activeShipments: 0,
    onTimeRate: 0,
    fleetUtilizationText: "-",
    totalDistanceKm: 0,
    revenueMtd: 0,
    avgCostPerKm: 0,
  });


  useEffect(() => {
    const fetchKpis = async () => {
      const start = startOfMonthISO();

      // Active shipments (not delivered/cancelled)
      const { count: activeCount } = await supabase
        .from("dispatches")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(delivered,cancelled)");

      // Revenue MTD (all invoices raised this month, regardless of payment status)
      const { data: invoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .gte("created_at", start);
      const revenueMtd = (invoices || []).reduce((sum, r: any) => sum + Number(r.total_amount || 0), 0);

      // Distance MTD (sum delivered dispatches this month)
      const { data: delivered } = await supabase
        .from("dispatches")
        .select("distance_km,cost")
        .eq("status", "delivered")
        .gte("created_at", start);
      const totalDistanceKm = (delivered || []).reduce((sum, r: any) => sum + Number(r.distance_km || 0), 0);
      const totalCost = (delivered || []).reduce((sum, r: any) => sum + Number(r.cost || 0), 0);
      const avgCostPerKm = totalDistanceKm > 0 ? totalCost / totalDistanceKm : 0;

      // On-time rate (scheduled vs actual delivery; only where both present)
      const { data: deliveredTimes } = await supabase
        .from("dispatches")
        .select("scheduled_delivery,actual_delivery")
        .eq("status", "delivered")
        .gte("created_at", start)
        .not("scheduled_delivery", "is", null)
        .not("actual_delivery", "is", null);

      const onTime = (deliveredTimes || []).filter((r: any) => new Date(r.actual_delivery) <= new Date(r.scheduled_delivery)).length;
      const totalTimed = (deliveredTimes || []).length;
      const onTimeRate = totalTimed > 0 ? (onTime / totalTimed) * 100 : 0;

      setKpis({
        activeShipments: activeCount || 0,
        onTimeRate,
        fleetUtilizationText: "-",
        totalDistanceKm,
        revenueMtd,
        avgCostPerKm,
      });
    };

    fetchKpis();
  }, []);

  const isDept = tenantMode === "LOGISTICS_DEPARTMENT";

  const metrics = useMemo(
    () => [
      {
        title: isDept ? "Active Movements" : "Active Shipments",
        value: String(kpis.activeShipments),
        change: "Live",
        changeType: "neutral" as const,
        icon: Package,
        link: "/dispatch",
      },
      {
        title: "On-Time Delivery (MTD)",
        value: `${kpis.onTimeRate.toFixed(1)}%`,
        change: "This month",
        changeType: "positive" as const,
        icon: Clock,
        link: "/driver-performance",
      },
      {
        title: "Fleet Utilization",
        value: kpis.fleetUtilizationText,
        change: "-",
        changeType: "neutral" as const,
        icon: Truck,
        link: "/fleet",
      },
      {
        title: "Total Distance (MTD)",
        value: `${formatNumberCompact(kpis.totalDistanceKm)} km`,
        change: "Delivered",
        changeType: "positive" as const,
        icon: MapPin,
        link: "/tracking",
      },
      {
        title: isDept ? "Logistics Spend (MTD)" : "Revenue (MTD)",
        value: formatCurrencyCompact(kpis.revenueMtd),
        change: isDept ? "Internal cost booked" : "Invoices raised",
        changeType: "positive" as const,
        icon: DollarSign,
        link: isDept ? "/expenses" : "/profit-loss",
      },
      {
        title: "Avg. Cost/KM (MTD)",
        value: kpis.avgCostPerKm ? `₦${Math.round(kpis.avgCostPerKm)}` : "₦0",
        change: "Delivered",
        changeType: "neutral" as const,
        icon: TrendingUp,
        link: "/expenses",
      },
    ],
    [kpis, isDept]
  );

  // Customer role must use the right portal per tenant mode
  if (userRole === "customer") {
    return <Navigate to={isDept ? "/dept/sales-tracker" : "/customer-portal"} replace />;
  }

  return (
    <DashboardLayout
      title={isDept ? "Logistics Department Dashboard" : "Dashboard"}
      subtitle={isDept ? "Outbound, inbound & cost efficiency at a glance" : "Overview of your logistics operations"}
    >
      {/* Onboarding Banner for first-time users */}
      <OnboardingBanner />
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {metrics.map((metric, index) => (
          <MetricCard key={metric.title} {...metric} index={index} />
        ))}
      </div>

      {/* KPI Trend Charts (OTD + Revenue MoM) */}
      <KPITrendCharts />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <DeliveryChart />
        </div>
        <div>
          <LiveMap />
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentShipments />
        </div>
        <div className="space-y-6">
          <PendingUserApprovalsWidget />
          <HistoricalComparisonWidget />
          <PendingApprovalsWidget />
          <TargetPerformanceWidget />
          <ActiveDrivers />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
