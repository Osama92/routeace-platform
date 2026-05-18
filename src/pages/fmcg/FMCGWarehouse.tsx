import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Warehouse, Package, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";

const FMCGWarehouse = () => {
  const { organizationId } = useAuth();

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("warehouses") as any)
        .select("*")
        .eq("organization_id", organizationId!);
      return data ?? [];
    },
  });

  return (
    <FMCGLayout title="Warehouse Operations" subtitle="Real-time pick, pack & dispatch management">
      {warehouses.length === 0 ? (
        <ZeroState
          icon={Warehouse}
          title="No warehouses configured"
          description="Add a warehouse to begin tracking capacity, picklists and dispatches."
          actionLabel="Add Warehouse"
          actionHref="/settings"
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {warehouses.map((w: any) => (
              <Card key={w.id}>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Warehouse className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold text-sm">{w.name}</p>
                        <p className="text-xs text-muted-foreground">{w.location ?? w.address ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Capacity</span>
                      <span className="font-medium">{w.capacity_utilization ?? 0}%</span>
                    </div>
                    <Progress value={w.capacity_utilization ?? 0} className="h-1.5" />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1"><Package className="w-3 h-3" /><span>Picklist: 0</span></div>
                    <div className="flex items-center gap-1"><Truck className="w-3 h-3" /><span>Dispatching: 0</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader><CardTitle>Active Picklist Queue</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No active picks. Picklists will populate as orders are received.</p>
            </CardContent>
          </Card>
        </>
      )}
    </FMCGLayout>
  );
};

export default FMCGWarehouse;
