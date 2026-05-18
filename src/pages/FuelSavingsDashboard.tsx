import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Fuel, TrendingUp, Shield, Clock, DollarSign } from "lucide-react";

export default function FuelSavingsDashboard() {
  const { data: ledger = [] } = useQuery({
    queryKey: ["fuel-savings-ledger"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fuel_savings_ledger").select("*")
        .order("period_end", { ascending: false }).limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  const totalSaved = ledger.reduce((a: number, r: any) => a + Number(r.cost_saved || 0), 0);
  const totalLitres = ledger.reduce((a: number, r: any) => a + Number(r.litres_recovered || 0), 0);
  const totalFraud = ledger.reduce((a: number, r: any) => a + Number(r.fraud_blocked_value || 0), 0);
  const avgPayback = ledger.length > 0 ? Math.round(ledger.reduce((a: number, r: any) => a + Number(r.payback_days || 0), 0) / ledger.length) : 0;

  return (
    <DashboardLayout title="Fuel Savings Dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Fuel className="w-7 h-7 text-orange-500" /> Fuel Savings ROI</h1>
          <p className="text-muted-foreground">Executive view: money saved, fraud blocked, payback period</p>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="w-4 h-4" /> Total Saved</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-green-600">₦{totalSaved.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Fuel className="w-4 h-4" /> Litres Recovered</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{totalLitres.toLocaleString()} L</p></CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Fraud Blocked</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold text-red-500">₦{totalFraud.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Avg Payback</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-bold">{avgPayback}d</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Period Breakdown</CardTitle></CardHeader>
          <CardContent>
            {ledger.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No periods recorded yet. Data accumulates as fuel investigations run.</p>
            ) : (
              <div className="space-y-2">
                {ledger.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium">{l.period_start} → {l.period_end}</p>
                      <p className="text-xs text-muted-foreground">{l.vehicles_optimized} vehicles · {l.drivers_flagged} drivers flagged</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">₦{Number(l.cost_saved).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{l.litres_recovered}L recovered</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
