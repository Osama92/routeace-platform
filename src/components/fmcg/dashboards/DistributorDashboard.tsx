import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, Package, Truck, Store, CreditCard, TrendingUp } from "lucide-react";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";
import FMCGZeroState from "../FMCGZeroState";

function useDistributorKPIs() {
  return useQuery({
    queryKey: ["fmcg-distributor-kpis"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [dispatches, invoices] = await Promise.all([
        supabase.from("dispatches").select("id, status, created_at").gte("created_at", today),
        supabase.from("invoices").select("id, total_amount, created_at").gte("created_at", startOfMonth),
      ]);

      const ordersToday = dispatches.data?.length || 0;
      const activeDeliveries = dispatches.data?.filter(d => d.status === "in_transit").length || 0;
      const revenueMTD = invoices.data?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;

      return { ordersToday, activeDeliveries, revenueMTD, hasData: ordersToday > 0 || (invoices.data?.length || 0) > 0 };
    },
  });
}

const fmt = (val: number) => {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toLocaleString()}`;
};

const DistributorDashboard = () => {
  const { data, isLoading } = useDistributorKPIs();

  if (isLoading) return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div>;
  if (!data?.hasData) return <FMCGZeroState role="distributor" />;

  const kpis = [
    { label: "Orders Today", value: String(data.ordersToday), icon: ShoppingCart },
    { label: "Active Deliveries", value: String(data.activeDeliveries), icon: Truck },
    { label: "Revenue MTD", value: fmt(data.revenueMTD), icon: TrendingUp },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                </div>
                <kpi.icon className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <FMCGAIInsightPanel role="distributor" />
    </>
  );
};

export default DistributorDashboard;
