import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const MarginDashboard = () => {
  const { organizationId } = useAuth();
  const { data: invoices = [] } = useQuery({
    queryKey: ["margin-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("invoices") as any)
        .select("total_amount, status, created_at, line_items")
        .eq("organization_id", organizationId!)
        .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString());
      return data ?? [];
    },
  });

  const totalRevenue = invoices.reduce((a: number, b: any) => a + (Number(b.total_amount) || 0), 0);

  return (
    <FMCGLayout title="Margin Protection Dashboard" subtitle="RTM KPI tracking & preventable loss detection">
      {invoices.length === 0 ? (
        <ZeroState
          icon={TrendingDown}
          title="No revenue data yet"
          description="Margin protection insights become available once invoices and trade activity are recorded."
          actionLabel="Create Invoice"
          actionHref="/finance"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Revenue (90d)</p>
              <p className="text-3xl font-bold text-primary mt-2">₦{(totalRevenue / 1_000_000).toFixed(2)}M</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Invoices (90d)</p>
              <p className="text-3xl font-bold mt-2">{invoices.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Avg Invoice</p>
              <p className="text-3xl font-bold mt-2">₦{((totalRevenue / invoices.length) / 1000).toFixed(1)}K</p>
            </CardContent>
          </Card>
        </div>
      )}
    </FMCGLayout>
  );
};

export default MarginDashboard;
