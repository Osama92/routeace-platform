import { useState, useEffect } from "react";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AutoFleetService = () => {
  const [fleets, setFleets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("vehicles").select("id, make, model, status").order("created_at", { ascending: false }).limit(50);
      // Group by make as "fleet"
      const fleetMap = new Map<string, { name: string; vehicles: number; activeService: number; nextService: string; compliance: number }>();
      (data || []).forEach((v: any) => {
        const key = v.make || "Unknown";
        const existing = fleetMap.get(key) || { name: key, vehicles: 0, activeService: 0, nextService: "", compliance: 100 };
        existing.vehicles++;
        if (v.status === "maintenance") existing.activeService++;
        fleetMap.set(key, existing);
      });
      setFleets(Array.from(fleetMap.values()));
      setLoading(false);
    })();
  }, []);

  return (
    <IndustryLayout industryCode="auto">
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-zinc-800 flex items-center justify-center">
            <Truck className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Fleet Service Partners</h1>
            <p className="text-muted-foreground">Manage truck fleet service contracts and maintenance schedules</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle>Fleet Service Contracts</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />)}</div>
            ) : fleets.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No fleet data yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Add vehicles to see fleet service data here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fleets.map((f) => (
                  <div key={f.name} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                    <div>
                      <p className="font-semibold text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.vehicles} vehicles • {f.activeService} in service{f.nextService ? ` • Next: ${f.nextService}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {f.compliance >= 90 ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                      <Badge variant={f.compliance >= 90 ? "default" : "secondary"}>Compliance: {f.compliance}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
};

export default AutoFleetService;
