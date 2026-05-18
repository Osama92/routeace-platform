import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Fuel, ShieldCheck, Route, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const FMCGFleetCommand = () => {
  const { organizationId } = useAuth();
  const { data: fmcgVehicles = [] } = useQuery({
    queryKey: ["fmcg-fleet", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("vehicles") as any)
        .select("id, registration_number, status, truck_type, driver_id, drivers(full_name)")
        .eq("organization_id", organizationId!);
      return data ?? [];
    },
  });

  const onRoute = fmcgVehicles.filter((v: any) => v.status === "in_transit" || v.status === "assigned").length;
  const inMaint = fmcgVehicles.filter((v: any) => v.status === "maintenance").length;

  return (
    <FMCGLayout title="Fleet Command Center" subtitle="FMCG distribution fleet, SLA monitoring & exception handling">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Fleet", value: String(fmcgVehicles.length), icon: Truck, color: "text-primary" },
          { label: "On Route", value: String(onRoute), icon: Route, color: "text-emerald-600" },
          { label: "In Maintenance", value: String(inMaint), icon: Wrench, color: "text-orange-600" },
          { label: "SLA On-Time", value: "—", icon: ShieldCheck, color: "text-blue-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {fmcgVehicles.length === 0 ? (
        <ZeroState
          icon={Truck}
          title="No vehicles in your fleet"
          description="Register your distribution vehicles to start tracking SLA, fuel and route performance."
          actionLabel="Add Vehicle"
          actionHref="/fleet"
        />
      ) : (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Vehicle Fleet</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fmcgVehicles.map((v: any) => (
                <div key={v.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-mono font-medium text-sm">{v.registration_number}</p>
                      <p className="text-xs text-muted-foreground">{v.truck_type ?? "—"} · {v.drivers?.full_name ?? "Unassigned"}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">{(v.status ?? "unknown").replace("_", " ")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FMCGLayout>
  );
};

export default FMCGFleetCommand;
