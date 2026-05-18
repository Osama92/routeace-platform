import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShieldCheck, AlertTriangle, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const RetailerCredit = () => {
  const { organizationId } = useAuth();
  const { data: retailers = [] } = useQuery({
    queryKey: ["fmcg-retailers-credit", organizationId],
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
    <FMCGLayout title="Retailer Micro-Credit" subtitle="AI-driven credit scoring and dynamic limit management">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Exposure", value: "₦0", icon: CreditCard },
          { label: "Low Risk", value: "0%", icon: ShieldCheck },
          { label: "High Risk", value: "0%", icon: AlertTriangle },
          { label: "Collection Rate", value: "0%", icon: TrendingUp },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {retailers.length === 0 ? (
        <ZeroState
          icon={CreditCard}
          title="No credit portfolio yet"
          description="Onboard retailers and run credit assessments to start building a dynamic credit book."
          actionLabel="Add Retailer"
          actionHref="/customers"
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Retailer Credit Portfolio</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {retailers.map((r: any) => (
                <div key={r.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{r.company_name}</h3>
                    <p className="text-xs text-muted-foreground">{r.contact_name ?? "—"}</p>
                  </div>
                  <Badge variant="outline">No limit set</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FMCGLayout>
  );
};

export default RetailerCredit;
