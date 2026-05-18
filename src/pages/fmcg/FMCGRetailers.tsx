import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Store, CreditCard, TrendingUp, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const FMCGRetailers = () => {
  const { organizationId } = useAuth();
  const { data: retailers = [] } = useQuery({
    queryKey: ["fmcg-retailers", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("customers") as any)
        .select("id, company_name, contact_name, email, phone, address, created_at")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <FMCGLayout title="Retailer Management" subtitle="AI-powered outlet profiles, credit scoring & churn prediction">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Outlets", value: String(retailers.length), icon: Store, color: "text-emerald-600" },
          { label: "Credit Exposure", value: "₦0", icon: CreditCard, color: "text-purple-600" },
          { label: "Avg Retailer LTV", value: "₦0", icon: TrendingUp, color: "text-green-600" },
          { label: "At-Risk Outlets", value: "0", icon: AlertTriangle, color: "text-red-600" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {retailers.length === 0 ? (
        <ZeroState
          icon={Store}
          title="No retailers yet"
          description="Add your first retailer to start tracking outlets, credit profiles and churn risk."
          actionLabel="Add Retailer"
          actionHref="/customers"
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Outlet Intelligence Board</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {retailers.map((r: any) => (
                <div key={r.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold">{r.company_name}</p>
                      <p className="text-sm text-muted-foreground">{r.contact_name ?? "—"}</p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Email</span><p className="font-medium truncate">{r.email ?? "—"}</p></div>
                    <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{r.phone ?? "—"}</p></div>
                    <div className="md:col-span-2"><span className="text-muted-foreground">Address</span><p className="font-medium truncate">{r.address ?? "—"}</p></div>
                  </div>
                  <Progress value={0} className="h-1 mt-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FMCGLayout>
  );
};

export default FMCGRetailers;
