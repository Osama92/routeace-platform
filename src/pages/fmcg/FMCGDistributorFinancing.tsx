import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Wallet, ShieldCheck, TrendingUp, CreditCard, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const FMCGDistributorFinancing = () => {
  const { organizationId } = useAuth();
  const { data: creditProfiles = [] } = useQuery({
    queryKey: ["sme-credits", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("sme_credit_profiles") as any)
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const totalLimit = creditProfiles.reduce((s: number, p: any) => s + (Number(p.eligible_limit) || 0), 0);

  return (
    <FMCGLayout title="Distributor Financing Layer" subtitle="Embedded fintech - AI-powered working capital, inventory credit & promotion financing">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Book Size", value: `₦${(totalLimit / 1_000_000).toFixed(1)}M`, icon: Wallet, color: "text-blue-600" },
          { label: "Active Profiles", value: String(creditProfiles.length), icon: CreditCard, color: "text-green-600" },
          { label: "Avg Default Rate", value: "—", icon: ShieldCheck, color: "text-emerald-600" },
          { label: "Portfolio Yield", value: "—", icon: TrendingUp, color: "text-purple-600" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className={`w-8 h-8 ${m.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {creditProfiles.length === 0 ? (
        <ZeroState
          icon={CreditCard}
          title="No distributor credit profiles yet"
          description="Once distributors are assessed, their credit limits, utilisation and risk profile will appear here."
          actionLabel="Add Distributor"
          actionHref="/vendors"
        />
      ) : (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> Distributor Credit Profiles</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {creditProfiles.map((d: any) => (
                <div key={d.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{d.business_name}</h3>
                      <p className="text-sm text-muted-foreground">{d.country ?? "—"}</p>
                    </div>
                    <Badge variant={d.status === "active" ? "default" : "secondary"}>{d.status ?? "draft"}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div><p className="text-xs text-muted-foreground">Eligible Limit</p><p className="font-medium">₦{((Number(d.eligible_limit) || 0) / 1_000_000).toFixed(1)}M</p></div>
                    <div><p className="text-xs text-muted-foreground">Credit Score</p><p className="font-medium">{d.credit_score ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Default Prob</p><p className="font-medium">{d.default_probability ?? "—"}</p></div>
                    <div><p className="text-xs text-muted-foreground">Delivery Rel.</p><Progress value={Number(d.delivery_reliability) || 0} className="h-2" /></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FMCGLayout>
  );
};

export default FMCGDistributorFinancing;
