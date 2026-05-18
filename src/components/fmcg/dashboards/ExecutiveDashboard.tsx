import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Store, Package, Truck, CreditCard, BarChart3, Users, Brain, ShieldCheck } from "lucide-react";
import FMCGAIInsightPanel from "../FMCGAIInsightPanel";
import FMCGZeroState from "../FMCGZeroState";

function useExecutiveKPIs() {
  return useQuery({
    queryKey: ["fmcg-executive-kpis"],
    queryFn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [dispatches, invoices, ar] = await Promise.all([
        supabase.from("dispatches").select("id, status, cost, created_at").gte("created_at", startOfMonth),
        supabase.from("invoices").select("id, total_amount, status, created_at").gte("created_at", startOfMonth),
        supabase.from("accounts_receivable").select("id, balance, status"),
      ]);

      const totalDispatches = dispatches.data?.length || 0;
      const activeDeliveries = dispatches.data?.filter(d => d.status === "in_transit").length || 0;
      const revenueMTD = invoices.data?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const outstandingAR = ar.data?.reduce((sum, a) => sum + (a.balance || 0), 0) || 0;

      return { totalDispatches, activeDeliveries, revenueMTD, outstandingAR, hasData: totalDispatches > 0 || (invoices.data?.length || 0) > 0 };
    },
  });
}

const formatCurrency = (val: number) => {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toLocaleString()}`;
};

const ExecutiveDashboard = () => {
  const { data, isLoading } = useExecutiveKPIs();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading dashboard...</div>;
  }

  if (!data?.hasData) {
    return <FMCGZeroState role="strategic_leadership" />;
  }

  const kpis = [
    { label: "Revenue MTD", value: formatCurrency(data.revenueMTD), icon: TrendingUp },
    { label: "Total Dispatches", value: String(data.totalDispatches), icon: Package },
    { label: "Active Deliveries", value: String(data.activeDeliveries), icon: Truck },
    { label: "Outstanding AR", value: formatCurrency(data.outstandingAR), icon: CreditCard },
  ];

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
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
      <FMCGAIInsightPanel role="executive" />
    </>
  );
};

export default ExecutiveDashboard;
