import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AIMetrics {
  totalDispatches: number;
  otdRate: number;
  fleetUtilization: number;
  totalRevenue: number;
  overdueAmount: number;
  pendingDispatches: number;
  inTransit: number;
  activeVehicles: number;
  totalVehicles: number;
  totalDrivers: number;
  totalCustomers: number;
  totalWarehouses: number;
}

export interface DemandPrediction {
  region: string;
  currentDemand: number;
  predictedDemand: number;
  confidence: number;
  trend: string;
  signal: string;
}

export interface InventoryAlert {
  warehouse: string;
  item: string;
  currentStock: number;
  daysUntilStockout: number;
  severity: "critical" | "warning" | "info";
  recommendation: string;
}

export interface FleetRecommendation {
  action: string;
  description: string;
  impact: string;
  priority: "high" | "medium" | "low";
  automatable: boolean;
}

export interface DistributorExpansion {
  region: string;
  opportunity: string;
  score: number;
  marketSize: string;
  reasoning: string;
}

export interface CreditRisk {
  entity: string;
  riskScore: number;
  overdueAmount: string;
  recommendation: string;
}

export interface NetworkHealth {
  overallScore: number;
  deliveryEfficiency: number;
  coverageGap: number;
  bottlenecks: string[];
}

export interface AutonomousAIData {
  metrics: AIMetrics;
  cityDistribution: [string, number][];
  ai: {
    demandPredictions?: DemandPrediction[];
    inventoryAlerts?: InventoryAlert[];
    fleetRecommendations?: FleetRecommendation[];
    distributorExpansion?: DistributorExpansion[];
    creditRisks?: CreditRisk[];
    networkHealth?: NetworkHealth;
  };
  generatedAt: string;
}

export function useAutonomousAI() {
  const [data, setData] = useState<AutonomousAIData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("autonomous-distribution-ai");
      if (fnError) throw fnError;
      if (fnData?.error) {
        if (fnData.metrics) {
          setData(fnData);
          toast.warning(fnData.error);
        } else {
          throw new Error(fnData.error);
        }
      } else {
        setData(fnData);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to fetch AI intelligence";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { data, loading, error, fetchIntelligence };
}
