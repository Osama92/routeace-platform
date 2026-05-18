import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { safeDivide } from "@/lib/apiValidator";
import {
  AlertTriangle,
  AlertCircle,
  Shield,
  TrendingDown,
  MapPin,
  Truck,
  DollarSign,
  Clock,
  Download,
} from "lucide-react";

interface RiskItem {
  id: string;
  type: "route" | "asset" | "revenue" | "operational";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  impact: number; // Financial impact in Naira
  mitigation: string;
}

const RiskExposureDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [summary, setSummary] = useState({
    totalExposure: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    mitigatedAmount: 0,
  });

  useEffect(() => {
    fetchRiskData();
  }, []);

  const fetchRiskData = async () => {
    setLoading(true);
    try {
      // Fetch dispatches for route analysis
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, route_id, cost, distance_km, status, pickup_address, delivery_address, scheduled_delivery, actual_delivery");

      // Fetch vehicles for asset risks
      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, registration_number, status, last_maintenance");

      // Fetch expenses for cost spikes
      const { data: expenses } = await supabase
        .from("expenses")
        .select("amount, category, vehicle_id, expense_date");

      // Fetch blacklisted routes
      const { data: blacklist } = await supabase
        .from("route_blacklist")
        .select("*")
        .eq("is_active", true);

      const identifiedRisks: RiskItem[] = [];
      let totalExposure = 0;

      // Analyze loss-making routes
      const routeStats = new Map<string, { revenue: number; cost: number; delays: number }>();
      dispatches?.forEach(d => {
        const routeKey = `${d.pickup_address}-${d.delivery_address}`;
        const existing = routeStats.get(routeKey) || { revenue: 0, cost: 0, delays: 0 };
        existing.revenue += d.cost || 0;
        
        // Check for delays
        if (d.scheduled_delivery && d.actual_delivery) {
          const scheduled = new Date(d.scheduled_delivery);
          const actual = new Date(d.actual_delivery);
          if (actual > scheduled) existing.delays++;
        }
        
        routeStats.set(routeKey, existing);
      });

      // Calculate route-based costs from expenses
      const vehicleExpenses = new Map<string, number>();
      expenses?.forEach(e => {
        if (e.vehicle_id) {
          vehicleExpenses.set(e.vehicle_id, (vehicleExpenses.get(e.vehicle_id) || 0) + e.amount);
        }
      });

      // Identify loss routes
      let lossRouteCount = 0;
      routeStats.forEach((stats, route) => {
        const estimatedCost = stats.revenue * 0.85; // Assume 85% cost ratio for now
        if (estimatedCost > stats.revenue) {
          lossRouteCount++;
          const loss = estimatedCost - stats.revenue;
          identifiedRisks.push({
            id: `route-${lossRouteCount}`,
            type: "route",
            title: `Loss-Making Route`,
            description: route.slice(0, 50) + "...",
            severity: loss > 100000 ? "high" : loss > 50000 ? "medium" : "low",
            impact: loss,
            mitigation: "Review pricing or consider route blacklisting",
          });
          totalExposure += loss;
        }
      });

      // Add blacklisted route warnings
      blacklist?.forEach(bl => {
        identifiedRisks.push({
          id: `blacklist-${bl.id}`,
          type: "route",
          title: "Blacklisted Route Still Active",
          description: bl.route_name || `${bl.origin} to ${bl.destination}`,
          severity: "high",
          impact: bl.loss_amount || 50000,
          mitigation: "Remove from active dispatch options",
        });
        totalExposure += bl.loss_amount || 50000;
      });

      // Analyze asset downtime risks
      vehicles?.forEach(v => {
        if (v.status === "maintenance") {
          identifiedRisks.push({
            id: `asset-${v.id}`,
            type: "asset",
            title: "Extended Asset Downtime",
            description: `${v.registration_number || v.id} - In maintenance`,
            severity: "medium",
            impact: 75000, // Estimated daily loss
            mitigation: "Expedite repairs or arrange replacement",
          });
          totalExposure += 75000;
        }

        // Check for overdue maintenance
        if (v.last_maintenance) {
          const lastService = new Date(v.last_maintenance);
          const daysSinceService = Math.floor((Date.now() - lastService.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceService > 90) {
            identifiedRisks.push({
              id: `maintenance-${v.id}`,
              type: "asset",
              title: "Overdue Maintenance",
              description: `${v.registration_number || v.id} - ${daysSinceService} days since last service`,
              severity: daysSinceService > 120 ? "high" : "medium",
              impact: 30000,
              mitigation: "Schedule preventive maintenance immediately",
            });
            totalExposure += 30000;
          }
        }
      });

      // Revenue leakage detection
      const unpaidInvoices = await supabase
        .from("invoices")
        .select("total_amount, due_date, status")
        .eq("status", "overdue");

      const overdueAmount = unpaidInvoices.data?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      if (overdueAmount > 0) {
        identifiedRisks.push({
          id: "revenue-overdue",
          type: "revenue",
          title: "Overdue Invoice Collection",
          description: `${unpaidInvoices.data?.length || 0} invoices past due date`,
          severity: overdueAmount > 500000 ? "high" : overdueAmount > 200000 ? "medium" : "low",
          impact: overdueAmount,
          mitigation: "Escalate collection efforts and follow up with customers",
        });
        totalExposure += overdueAmount;
      }

      // Sort by severity and impact
      identifiedRisks.sort((a, b) => {
        const severityOrder = { high: 0, medium: 1, low: 2 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.impact - a.impact;
      });

      setRisks(identifiedRisks);
      setSummary({
        totalExposure,
        highRiskCount: identifiedRisks.filter(r => r.severity === "high").length,
        mediumRiskCount: identifiedRisks.filter(r => r.severity === "medium").length,
        lowRiskCount: identifiedRisks.filter(r => r.severity === "low").length,
        mitigatedAmount: 0, // Would come from resolved risks
      });

    } catch (error) {
      console.error("Error fetching risk data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "destructive";
      case "medium": return "warning";
      case "low": return "secondary";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "route": return MapPin;
      case "asset": return Truck;
      case "revenue": return DollarSign;
      case "operational": return Clock;
      default: return AlertCircle;
    }
  };

  const riskScore = Math.min(100, Math.round(
    (summary.highRiskCount * 30 + summary.mediumRiskCount * 15 + summary.lowRiskCount * 5) / 
    Math.max(1, risks.length)
  ));

  const exportRiskReport = () => {
    const csvData = [
      ["Type", "Title", "Description", "Severity", "Financial Impact (₦)", "Mitigation"],
      ...risks.map(r => [r.type, r.title, r.description, r.severity, r.impact, r.mitigation])
    ];
    const csvContent = csvData.map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `risk-exposure-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Shield className="w-5 h-5 text-warning" />
              Risk & Loss Exposure Dashboard
            </CardTitle>
            <CardDescription>Identify and mitigate financial and operational risks</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={exportRiskReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Score Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="col-span-2 bg-secondary/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-2">Total Exposure</p>
            <p className="text-3xl font-bold text-destructive">₦{summary.totalExposure.toLocaleString()}</p>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-1">Risk Score</p>
              <Progress value={100 - riskScore} className="h-2" />
              <p className="text-xs mt-1">{100 - riskScore}% healthy</p>
            </div>
          </div>
          <div className="bg-destructive/10 rounded-lg p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-1" />
            <p className="text-2xl font-bold text-destructive">{summary.highRiskCount}</p>
            <p className="text-xs text-muted-foreground">High Risk</p>
          </div>
          <div className="bg-warning/10 rounded-lg p-4 text-center">
            <AlertCircle className="w-6 h-6 text-warning mx-auto mb-1" />
            <p className="text-2xl font-bold text-warning">{summary.mediumRiskCount}</p>
            <p className="text-xs text-muted-foreground">Medium Risk</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <Shield className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold">{summary.lowRiskCount}</p>
            <p className="text-xs text-muted-foreground">Low Risk</p>
          </div>
        </div>

        {/* Risk Items */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Identified Risks ({risks.length})</h4>
          
          {risks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No significant risks detected</p>
            </div>
          ) : (
            risks.slice(0, 10).map((risk) => {
              const IconComponent = getTypeIcon(risk.type);
              return (
                <div 
                  key={risk.id}
                  className={`p-4 rounded-lg border ${
                    risk.severity === "high" ? "border-destructive/50 bg-destructive/5" :
                    risk.severity === "medium" ? "border-warning/50 bg-warning/5" :
                    "border-border bg-secondary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        risk.severity === "high" ? "bg-destructive/20" :
                        risk.severity === "medium" ? "bg-warning/20" :
                        "bg-muted"
                      }`}>
                        <IconComponent className={`w-5 h-5 ${
                          risk.severity === "high" ? "text-destructive" :
                          risk.severity === "medium" ? "text-warning" :
                          "text-muted-foreground"
                        }`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium">{risk.title}</h5>
                          <Badge variant={getSeverityColor(risk.severity) as any}>
                            {risk.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                        <p className="text-xs text-primary">💡 {risk.mitigation}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-destructive">₦{risk.impact.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">potential loss</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {risks.length > 10 && (
            <p className="text-sm text-muted-foreground text-center">
              And {risks.length - 10} more risks...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskExposureDashboard;
