import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileCheck, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";
import { format } from "date-fns";

const FMCGDigitalPOD = () => {
  const { organizationId } = useAuth();
  const { data: pods = [] } = useQuery({
    queryKey: ["fmcg-pods", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("dispatches") as any)
        .select("id, dispatch_number, status, pod_confirmed, pod_photo_url, actual_delivery, delivery_address, customers(company_name)")
        .eq("organization_id", organizationId!)
        .not("pod_confirmed", "is", null)
        .order("actual_delivery", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  return (
    <FMCGLayout title="Digital Proof of Delivery" subtitle="Tamper-proof delivery verification with multi-layer authentication">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "PODs Captured", value: String(pods.length), icon: FileCheck, color: "text-blue-600" },
          { label: "Verified", value: String(pods.filter((p: any) => p.pod_confirmed).length), icon: ShieldCheck, color: "text-green-600" },
          { label: "Tamper Alerts", value: "0", icon: AlertTriangle, color: "text-red-600" },
          { label: "Avg Verification", value: "—", icon: Clock, color: "text-teal-600" },
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

      {pods.length === 0 ? (
        <ZeroState
          icon={FileCheck}
          title="No proof of delivery yet"
          description="Confirmed deliveries with digital PODs will appear here once your drivers begin running trips."
          actionLabel="View Dispatches"
          actionHref="/dispatch"
        />
      ) : (
        <Card>
          <CardHeader><CardTitle>Recent Delivery Verifications</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pods.map((pod: any) => (
                <div key={pod.id} className="p-4 border rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-mono text-sm">{pod.dispatch_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {pod.customers?.company_name ?? pod.delivery_address ?? "—"}
                      {pod.actual_delivery && ` · ${format(new Date(pod.actual_delivery), "MMM d, HH:mm")}`}
                    </p>
                  </div>
                  <Badge variant={pod.pod_confirmed ? "default" : "secondary"}>
                    {pod.pod_confirmed ? "verified" : "pending"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </FMCGLayout>
  );
};

export default FMCGDigitalPOD;
