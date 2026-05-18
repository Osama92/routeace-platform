import { useState, useEffect } from "react";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Route, MapPin, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const AutoDistribution = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("dispatches").select("id, pickup_address, delivery_address, status, cost, created_at").order("created_at", { ascending: false }).limit(20);
      const routeMap = new Map<string, { name: string; stops: number; deliveries: number; onTime: number; total: number; value: number }>();
      (data || []).forEach(d => {
        const key = d.pickup_address || "Unknown";
        const existing = routeMap.get(key) || { name: key, stops: 0, deliveries: 0, onTime: 0, total: 0, value: 0 };
        existing.stops++;
        existing.total++;
        if (d.status === "delivered") { existing.deliveries++; existing.onTime++; }
        existing.value += Number(d.cost || 0);
        routeMap.set(key, existing);
      });
      setRoutes(Array.from(routeMap.values()));
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
            <h1 className="text-3xl font-heading font-bold text-foreground">Parts Distribution</h1>
            <p className="text-muted-foreground">Manage delivery routes to workshops and fleet service centers</p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Route className="w-5 h-5 text-zinc-500" />Distribution Routes</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-secondary/30 animate-pulse" />)}</div>
            ) : routes.length === 0 ? (
              <div className="text-center py-12">
                <MapPin className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">No distribution routes yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">Create your first dispatch to see routes here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {routes.map((r) => (
                  <div key={r.name} className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                    <div><p className="font-medium text-foreground">{r.name}</p><p className="text-xs text-muted-foreground">{r.stops} stops • {r.deliveries} deliveries</p></div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">On-time: {r.total > 0 ? Math.round((r.onTime / r.total) * 100) : 0}%</span>
                      <span className="text-sm font-medium text-foreground">₦{(r.value / 1e6).toFixed(1)}M</span>
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

export default AutoDistribution;
