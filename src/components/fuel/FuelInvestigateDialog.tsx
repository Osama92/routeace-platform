import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, TrendingDown, Wrench, User, FileSearch } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  dispatchId?: string;
  vehicleId?: string;
  driverId?: string;
}

const CLASSIFICATION_COLOR: Record<string, string> = {
  normal: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  suspicious: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  high_risk_fraud: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

export default function FuelInvestigateDialog({ open, onOpenChange, dispatchId, vehicleId, driverId }: Props) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const investigate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("fuel-investigation-engine", {
        body: { dispatch_id: dispatchId, vehicle_id: vehicleId, driver_id: driverId },
      });
      if (error) throw error;
      setResult(data?.investigation);
    } catch (e: any) {
      toast.error(`Investigation failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSearch className="w-5 h-5" /> Fuel Investigation</DialogTitle>
        </DialogHeader>

        {!result && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Run AI investigation to analyze fuel variance, driver behavior, and maintenance factors.</p>
            <Button onClick={investigate}>Start Investigation</Button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-foreground">Analyzing trip, driver, and maintenance data…</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border ${CLASSIFICATION_COLOR[result.fraud_classification] || ""}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Status: {result.fraud_classification?.replace("_", " ").toUpperCase()}
                </span>
                <Badge variant="outline">{result.variance_percent?.toFixed(1)}% variance</Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Expected</p>
                <p className="text-lg font-bold">{result.expected_fuel_litres?.toFixed(1)} L</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Issued</p>
                <p className="text-lg font-bold">{result.issued_fuel_litres?.toFixed(1)} L</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10">
                <p className="text-xs text-muted-foreground">Cost Impact</p>
                <p className="text-lg font-bold text-destructive">₦{Math.round(result.cost_impact || 0).toLocaleString()}</p>
              </div>
            </div>

            {result.root_causes?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Root Causes</h4>
                <ul className="space-y-1 text-sm">
                  {result.root_causes.map((c: string, i: number) => (
                    <li key={i} className="text-foreground/80">→ {c}</li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(result.maintenance_factors || {}).length > 0 && (
              <div className="p-3 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><Wrench className="w-4 h-4" /> Maintenance Factor</h4>
                <pre className="text-xs">{JSON.stringify(result.maintenance_factors, null, 2)}</pre>
              </div>
            )}

            {Object.keys(result.driver_behavior_factors || {}).length > 0 && (
              <div className="p-3 rounded-lg bg-muted/30">
                <h4 className="font-semibold mb-2 flex items-center gap-2"><User className="w-4 h-4" /> Driver Behavior</h4>
                <pre className="text-xs">{JSON.stringify(result.driver_behavior_factors, null, 2)}</pre>
              </div>
            )}

            {result.ai_conclusion && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-semibold mb-2">AI Conclusion</h4>
                <p className="text-sm whitespace-pre-line">{result.ai_conclusion}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="destructive" size="sm">Flag Driver</Button>
              <Button variant="outline" size="sm">Schedule Maintenance</Button>
              <Button variant="outline" size="sm">Block Dispatch</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
