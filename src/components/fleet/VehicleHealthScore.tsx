import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Shield, Fuel, Wrench, Clock, FileText, AlertTriangle, Gauge, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface VehicleRow {
  id: string;
  plate_number: string | null;
  registration_number: string | null;
  health_score: number | null;
  current_odometer: number | null;
  monthly_km: number | null;
  status: string | null;
  organization_id: string | null;
}

interface DocRow {
  vehicle_id: string;
  document_type: string;
  expiry_date: string | null;
}

interface VehicleHealth {
  vehicleId: string;
  plateNumber: string;
  healthScore: number;
  odometer: number;
  monthlyKm: number;
  status: string;
  expiringDocs: string[];
  docScore: number;
}

const scoreColor = (s: number) =>
  s >= 80 ? "text-emerald-500" : s >= 60 ? "text-amber-500" : "text-destructive";
const scoreBg = (s: number) =>
  s >= 80 ? "bg-emerald-500/10" : s >= 60 ? "bg-amber-500/10" : "bg-destructive/10";
const scoreLabel = (s: number) =>
  s >= 80 ? "Good" : s >= 60 ? "Fair" : "Critical";

const KEY_DOC_TYPES: Record<string, string> = {
  insurance:       "Insurance",
  registration:    "Registration",
  roadworthiness:  "Roadworthiness",
  inspection:      "Inspection Cert",
};

export default function VehicleHealthScore() {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchVehicleHealth = useCallback(async () => {
    if (!organizationId) return;
    try {
      // Both queries are org-scoped; RLS enforces this server-side too
      const [vehiclesRes, docsRes] = await Promise.all([
        supabase
          .from("vehicles")
          .select("id, plate_number, registration_number, health_score, current_odometer, monthly_km, status, organization_id")
          .eq("organization_id", organizationId)
          .order("health_score", { ascending: true }),
        supabase
          .from("vehicle_documents")
          .select("vehicle_id, document_type, expiry_date")
          .in("document_type", Object.keys(KEY_DOC_TYPES)),
      ]);

      if (vehiclesRes.error) throw vehiclesRes.error;

      // Build a map: vehicleId → docs[]
      const docsByVehicle: Record<string, DocRow[]> = {};
      for (const doc of (docsRes.data || []) as DocRow[]) {
        if (!docsByVehicle[doc.vehicle_id]) docsByVehicle[doc.vehicle_id] = [];
        docsByVehicle[doc.vehicle_id].push(doc);
      }

      const now = Date.now();
      const healthData: VehicleHealth[] = (vehiclesRes.data as VehicleRow[] || []).map((v) => {
        const expiringDocs: string[] = [];
        const docs = docsByVehicle[v.id] || [];
        let docScore = 100;

        // Penalty for each key doc type
        for (const [type, label] of Object.entries(KEY_DOC_TYPES)) {
          const doc = docs.find(d => d.document_type === type);
          if (!doc) {
            docScore -= 25;
            expiringDocs.push(`${label} (missing)`);
          } else if (!doc.expiry_date) {
            docScore -= 25;
            expiringDocs.push(`${label} (no expiry)`);
          } else {
            const daysLeft = (new Date(doc.expiry_date).getTime() - now) / 86400000;
            if (daysLeft < 0)  { docScore -= 25; expiringDocs.push(`${label} (expired)`); }
            else if (daysLeft < 30) { docScore -= 10; expiringDocs.push(`${label} (${Math.floor(daysLeft)}d left)`); }
          }
        }
        docScore = Math.max(0, docScore);

        return {
          vehicleId:   v.id,
          plateNumber: v.plate_number || v.registration_number || "Unknown",
          healthScore: v.health_score ?? docScore,
          odometer:    v.current_odometer ?? 0,
          monthlyKm:   v.monthly_km ?? 0,
          status:      v.status ?? "unknown",
          expiringDocs,
          docScore,
        };
      });

      setVehicles(healthData);
    } catch (err) {
      console.error("VehicleHealthScore fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [organizationId]);

  useEffect(() => { fetchVehicleHealth(); }, [fetchVehicleHealth]);

  // Trigger a server-side health recalculation for all org vehicles
  const handleRefreshHealth = async () => {
    if (!organizationId) return;
    setRefreshing(true);
    try {
      // Fetch all vehicle IDs for this org, then recalculate each
      const { data: vids } = await supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId);

      if (vids && vids.length > 0) {
        await Promise.all(
          vids.map((v: any) =>
            supabase.rpc("recalculate_vehicle_health" as any, {
              p_vehicle_id: v.id,
              p_org_id: organizationId,
            })
          )
        );
      }
      await fetchVehicleHealth();
      toast({ title: "Health scores refreshed" });
    } catch (err: any) {
      toast({ title: "Refresh failed", description: err.message, variant: "destructive" });
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const avgScore = vehicles.length > 0
    ? Math.round(vehicles.reduce((a, v) => a + v.healthScore, 0) / vehicles.length)
    : 0;
  const criticalCount  = vehicles.filter(v => v.healthScore < 60).length;
  const expiringCount  = vehicles.filter(v => v.expiringDocs.length > 0).length;
  const totalOdometerKm = vehicles.reduce((a, v) => a + v.odometer, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Health</p>
                <p className={`text-3xl font-bold ${scoreColor(avgScore)}`}>{avgScore}%</p>
              </div>
              <div className={`p-3 rounded-xl ${scoreBg(avgScore)}`}>
                <Shield className={`w-6 h-6 ${scoreColor(avgScore)}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Vehicles</p>
                <p className="text-3xl font-bold text-destructive">{criticalCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Doc Alerts</p>
                <p className="text-3xl font-bold text-amber-500">{expiringCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Odometer</p>
                <p className="text-2xl font-bold tabular-nums">{totalOdometerKm.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">km total</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Gauge className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Vehicle Health Breakdown</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshHealth}
            disabled={refreshing}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Recalculate
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vehicles.slice(0, 15).map((vehicle) => (
              <div key={vehicle.vehicleId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="min-w-[90px]">
                  <p className="font-mono font-semibold text-sm">{vehicle.plateNumber}</p>
                  <Badge
                    variant="outline"
                    className={`text-[10px] mt-0.5 ${scoreColor(vehicle.healthScore)}`}
                  >
                    {scoreLabel(vehicle.healthScore)}
                  </Badge>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Health Score</span>
                    <span className={`font-semibold ${scoreColor(vehicle.healthScore)}`}>
                      {vehicle.healthScore}%
                    </span>
                  </div>
                  <Progress value={vehicle.healthScore} className="h-1.5" />
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Docs: {vehicle.docScore}%
                    </span>
                    <span className="flex items-center gap-1">
                      <Gauge className="w-3 h-3" /> ODO: {vehicle.odometer.toLocaleString()} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> This month: {vehicle.monthlyKm.toLocaleString()} km
                    </span>
                  </div>
                </div>

                {vehicle.expiringDocs.length > 0 && (
                  <div className="text-[10px] text-amber-500 max-w-[130px] shrink-0">
                    {vehicle.expiringDocs.map((doc, i) => (
                      <p key={i}>⚠ {doc}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-sm">No vehicles found</p>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted-foreground px-1">
        Health score = Documents 30% · Inspections 35% · Fuel efficiency 20% · Status 15%.
        Updates automatically after each completed delivery, inspection, and fuel fill-up.
      </p>
    </div>
  );
}
