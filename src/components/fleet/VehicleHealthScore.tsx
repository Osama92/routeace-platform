import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, Fuel, Wrench, Clock, FileText, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VehicleHealth {
  vehicleId: string;
  plateNumber: string;
  overallScore: number;
  documentValidity: number;
  fuelEfficiency: number;
  maintenanceFrequency: number;
  uptimeRatio: number;
  expiringDocs: string[];
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-destructive";
};

const getScoreBg = (score: number) => {
  if (score >= 80) return "bg-emerald-500/10";
  if (score >= 60) return "bg-amber-500/10";
  return "bg-destructive/10";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  return "Critical";
};

export default function VehicleHealthScore() {
  const [vehicles, setVehicles] = useState<VehicleHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicleHealth();
  }, []);

  const fetchVehicleHealth = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const healthData: VehicleHealth[] = (data || []).map((v: any) => {
        const now = new Date();
        const expiringDocs: string[] = [];

        // Document validity score
        let docScore = 100;
        const checkDoc = (dateStr: string | null, label: string) => {
          if (!dateStr) { docScore -= 25; return; }
          const expiry = new Date(dateStr);
          const daysLeft = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          if (daysLeft < 0) { docScore -= 25; expiringDocs.push(`${label} (expired)`); }
          else if (daysLeft < 30) { docScore -= 10; expiringDocs.push(`${label} (${Math.floor(daysLeft)}d left)`); }
        };

        checkDoc(v.insurance_expiry, "Insurance");
        checkDoc(v.registration_expiry, "Registration");
        checkDoc(v.roadworthiness_expiry, "Roadworthiness");
        checkDoc(v.inspection_expiry, "Inspection");

        // Fuel efficiency (simulated from mileage)
        const fuelScore = v.current_mileage ? Math.min(100, Math.max(40, 100 - (v.current_mileage / 5000))) : 70;

        // Maintenance frequency score
        const maintScore = v.status === "active" ? 85 : v.status === "maintenance" ? 50 : 30;

        // Uptime ratio
        const uptimeScore = v.status === "active" ? 90 : v.status === "maintenance" ? 40 : 10;

        const overallScore = Math.round((docScore + fuelScore + maintScore + uptimeScore) / 4);

        return {
          vehicleId: v.id,
          plateNumber: v.plate_number || "Unknown",
          overallScore: Math.max(0, Math.min(100, overallScore)),
          documentValidity: Math.max(0, docScore),
          fuelEfficiency: Math.round(fuelScore),
          maintenanceFrequency: maintScore,
          uptimeRatio: uptimeScore,
          expiringDocs,
        };
      });

      setVehicles(healthData);
    } catch (err) {
      console.error("Error fetching vehicle health:", err);
    } finally {
      setLoading(false);
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
    ? Math.round(vehicles.reduce((a, v) => a + v.overallScore, 0) / vehicles.length)
    : 0;

  const criticalCount = vehicles.filter(v => v.overallScore < 60).length;
  const expiringCount = vehicles.filter(v => v.expiringDocs.length > 0).length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Fleet Health Score</p>
                <p className={`text-3xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
              </div>
              <div className={`p-3 rounded-xl ${getScoreBg(avgScore)}`}>
                <Shield className={`w-6 h-6 ${getScoreColor(avgScore)}`} />
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
                <p className="text-sm text-muted-foreground">Expiring Documents</p>
                <p className="text-3xl font-bold text-amber-500">{expiringCount}</p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10">
                <FileText className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vehicle Health Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vehicles.slice(0, 10).map((vehicle) => (
              <div key={vehicle.vehicleId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                <div className="min-w-[80px]">
                  <p className="font-mono font-semibold text-sm">{vehicle.plateNumber}</p>
                  <Badge variant="outline" className={`text-[10px] ${getScoreColor(vehicle.overallScore)}`}>
                    {getScoreLabel(vehicle.overallScore)}
                  </Badge>
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Overall</span>
                    <span className={`font-semibold ${getScoreColor(vehicle.overallScore)}`}>{vehicle.overallScore}%</span>
                  </div>
                  <Progress value={vehicle.overallScore} className="h-1.5" />
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> Docs: {vehicle.documentValidity}%</span>
                    <span className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel: {vehicle.fuelEfficiency}%</span>
                    <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Maint: {vehicle.maintenanceFrequency}%</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Uptime: {vehicle.uptimeRatio}%</span>
                  </div>
                </div>
                {vehicle.expiringDocs.length > 0 && (
                  <div className="text-[10px] text-amber-500 max-w-[120px]">
                    {vehicle.expiringDocs.map((doc, i) => (
                      <p key={i}>⚠ {doc}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && (
              <p className="text-center text-muted-foreground py-4">No vehicles found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
