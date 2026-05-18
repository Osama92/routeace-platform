import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Target,
  Fuel,
  User,
  Wrench,
  Clock,
  AlertCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Split,
  Merge,
  Truck,
  Shield,
  Calculator
} from "lucide-react";

export interface OrderMarginData {
  orderId: string;
  customerName: string;
  revenue: number;
  costKm: number;
  vehicleCost: number;
  fuelEstimate: number;
  driverCost: number;
  idleTimeCost: number;
  maintenanceAllocation: number;
  whtTax: number;
  totalCost: number;
  margin: number;
  marginPercent: number;
  isProfitable: boolean;
}

export interface RouteMarginSummary {
  routeId: string;
  totalRevenue: number;
  totalCost: number;
  grossMargin: number;
  marginPercent: number;
  profitLabel: "profit_optimized" | "revenue_positive" | "loss_making";
  orders: OrderMarginData[];
  recommendations: RouteRecommendation[];
  requiresApproval: boolean;
}

export interface RouteRecommendation {
  type: "split" | "merge" | "upgrade" | "downgrade" | "reject" | "prioritize";
  description: string;
  impact: {
    marginDelta: number;
    costDelta: number;
    revenueDelta: number;
  };
  priority: "high" | "medium" | "low";
}

interface MarginAwareRoutingProps {
  orders: OrderMarginData[];
  routeDistance: number;
  vehicleType: string;
  onRecommendationApply?: (recommendation: RouteRecommendation) => void;
  onApprovalRequest?: (summary: RouteMarginSummary) => void;
}

// Cost configuration - updated to reflect current Nigerian prices
const COST_CONFIG = {
  fuelPricePerLiter: 1200, // NGN - current diesel price
  fuelEfficiency: { // L/km by vehicle type
    bike: 0.05,
    van: 0.12,
    "5t": 0.20,
    "10t": 0.28,
    "15t": 0.35,
    "20t": 0.42,
    "30t": 0.50,
  },
  driverRatePerTrip: 15000, // NGN - per trip flat rate
  maintenancePerKm: 15, // NGN
  idleCostPerHour: 500, // NGN
  whtRate: 0.05, // 5% withholding tax
};

const MarginAwareRouting = ({
  orders,
  routeDistance,
  vehicleType,
  onRecommendationApply,
  onApprovalRequest
}: MarginAwareRoutingProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate margin data for each order
  const marginData = useMemo((): RouteMarginSummary => {
    const fuelEfficiency = COST_CONFIG.fuelEfficiency[vehicleType as keyof typeof COST_CONFIG.fuelEfficiency] || 0.35;
    const distancePerOrder = routeDistance / Math.max(1, orders.length);
    
    const orderMargins: OrderMarginData[] = orders.map(order => {
      const revenue = order.revenue || 15000;
      const costKm = distancePerOrder * COST_CONFIG.maintenancePerKm;
      const fuelEstimate = distancePerOrder * fuelEfficiency * COST_CONFIG.fuelPricePerLiter;
      const driverCost = COST_CONFIG.driverRatePerTrip / Math.max(1, orders.length); // split trip cost across orders
      const vehicleCost = distancePerOrder * 10; // Depreciation
      const idleTimeCost = 2 * COST_CONFIG.idleCostPerHour; // 2 hours wait
      const maintenanceAllocation = distancePerOrder * COST_CONFIG.maintenancePerKm;
      const whtTax = revenue * COST_CONFIG.whtRate;
      
      const totalCost = costKm + fuelEstimate + driverCost + vehicleCost + idleTimeCost + maintenanceAllocation + whtTax;
      const margin = revenue - totalCost;
      const marginPercent = (margin / revenue) * 100;
      
      return {
        orderId: order.orderId,
        customerName: order.customerName,
        revenue: Math.round(revenue),
        costKm: Math.round(costKm),
        vehicleCost: Math.round(vehicleCost),
        fuelEstimate: Math.round(fuelEstimate),
        driverCost: Math.round(driverCost),
        idleTimeCost: Math.round(idleTimeCost),
        maintenanceAllocation: Math.round(maintenanceAllocation),
        whtTax: Math.round(whtTax),
        totalCost: Math.round(totalCost),
        margin: Math.round(margin),
        marginPercent: Math.round(marginPercent * 10) / 10,
        isProfitable: margin > 0
      };
    });

    const totalRevenue = orderMargins.reduce((sum, o) => sum + o.revenue, 0);
    const totalCost = orderMargins.reduce((sum, o) => sum + o.totalCost, 0);
    const grossMargin = totalRevenue - totalCost;
    const marginPercent = (grossMargin / Math.max(1, totalRevenue)) * 100;

    // Determine profit label
    let profitLabel: RouteMarginSummary["profitLabel"];
    if (marginPercent >= 15) {
      profitLabel = "profit_optimized";
    } else if (marginPercent > 0) {
      profitLabel = "revenue_positive";
    } else {
      profitLabel = "loss_making";
    }

    // Generate recommendations
    const recommendations: RouteRecommendation[] = [];
    const lossMakingOrders = orderMargins.filter(o => !o.isProfitable);
    const lowMarginOrders = orderMargins.filter(o => o.marginPercent < 10 && o.marginPercent > 0);
    const highMarginOrders = orderMargins.filter(o => o.marginPercent > 25);

    if (lossMakingOrders.length > 0) {
      recommendations.push({
        type: "reject",
        description: `Consider removing ${lossMakingOrders.length} loss-making order(s) to improve overall margin`,
        impact: {
          marginDelta: lossMakingOrders.reduce((sum, o) => sum + Math.abs(o.margin), 0),
          costDelta: -lossMakingOrders.reduce((sum, o) => sum + o.totalCost, 0),
          revenueDelta: -lossMakingOrders.reduce((sum, o) => sum + o.revenue, 0)
        },
        priority: "high"
      });
    }

    if (orders.length > 6 && marginPercent < 15) {
      recommendations.push({
        type: "split",
        description: "Consider splitting into 2 routes for better efficiency and margins",
        impact: {
          marginDelta: Math.round(grossMargin * 0.15),
          costDelta: Math.round(totalCost * -0.1),
          revenueDelta: 0
        },
        priority: "medium"
      });
    }

    if (orders.length <= 3 && marginPercent < 20) {
      recommendations.push({
        type: "merge",
        description: "Add more orders to improve asset utilization and per-drop efficiency",
        impact: {
          marginDelta: Math.round(grossMargin * 0.2),
          costDelta: Math.round(totalCost * 0.3),
          revenueDelta: Math.round(totalRevenue * 0.5)
        },
        priority: "medium"
      });
    }

    if (highMarginOrders.length > 0 && highMarginOrders.length < orders.length) {
      recommendations.push({
        type: "prioritize",
        description: `${highMarginOrders.length} high-value orders detected - consider dedicated routing`,
        impact: {
          marginDelta: Math.round(highMarginOrders.reduce((sum, o) => sum + o.margin, 0) * 0.1),
          costDelta: 0,
          revenueDelta: 0
        },
        priority: "low"
      });
    }

    if (vehicleType === "30t" && orders.length < 3) {
      recommendations.push({
        type: "downgrade",
        description: "Consider using a 15T or 20T truck - 30T is underutilized",
        impact: {
          marginDelta: Math.round(totalCost * 0.15),
          costDelta: Math.round(-totalCost * 0.15),
          revenueDelta: 0
        },
        priority: "medium"
      });
    }

    return {
      routeId: `route-${Date.now()}`,
      totalRevenue,
      totalCost,
      grossMargin,
      marginPercent: Math.round(marginPercent * 10) / 10,
      profitLabel,
      orders: orderMargins,
      recommendations,
      requiresApproval: profitLabel === "loss_making"
    };
  }, [orders, routeDistance, vehicleType]);

  const getProfitLabelBadge = () => {
    switch (marginData.profitLabel) {
      case "profit_optimized":
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <CheckCircle className="w-3 h-3" />
            Profit-Optimized
          </Badge>
        );
      case "revenue_positive":
        return (
          <Badge className="bg-warning text-warning-foreground gap-1">
            <AlertTriangle className="w-3 h-3" />
            Revenue-Positive, Margin-Thin
          </Badge>
        );
      case "loss_making":
        return (
          <Badge className="bg-destructive text-destructive-foreground gap-1">
            <AlertCircle className="w-3 h-3" />
            Loss-Making
          </Badge>
        );
    }
  };

  const handleApplyRecommendation = (rec: RouteRecommendation) => {
    onRecommendationApply?.(rec);
    toast({
      title: "Recommendation Applied",
      description: rec.description
    });
  };

  const handleRequestApproval = () => {
    onApprovalRequest?.(marginData);
    toast({
      title: "Approval Requested",
      description: "Admin/Super Admin has been notified for approval"
    });
  };

  return (
    <Card className={`border-2 ${
      marginData.profitLabel === "profit_optimized" ? "border-success/30" :
      marginData.profitLabel === "revenue_positive" ? "border-warning/30" :
      "border-destructive/30"
    }`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-primary" />
                Margin-Aware Routing
                <Badge variant="outline" className="text-xs">Profit-First</Badge>
              </CardTitle>
              <div className="flex items-center gap-3">
                {getProfitLabelBadge()}
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Profit Summary */}
            <div className={`p-4 rounded-lg ${
              marginData.profitLabel === "profit_optimized" ? "bg-success/10" :
              marginData.profitLabel === "revenue_positive" ? "bg-warning/10" :
              "bg-destructive/10"
            }`}>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-2xl font-bold text-success">
                    ₦{marginData.totalRevenue.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold text-destructive">
                    ₦{marginData.totalCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gross Margin</p>
                  <p className={`text-2xl font-bold ${marginData.grossMargin >= 0 ? "text-success" : "text-destructive"}`}>
                    ₦{marginData.grossMargin.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Margin %</p>
                  <p className={`text-2xl font-bold ${marginData.marginPercent >= 15 ? "text-success" : marginData.marginPercent > 0 ? "text-warning" : "text-destructive"}`}>
                    {marginData.marginPercent}%
                  </p>
                </div>
              </div>
            </div>

            {/* Loss-Making Alert */}
            {marginData.requiresApproval && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Admin Approval Required</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>This route is loss-making and requires Admin or Super Admin approval to proceed.</span>
                  <Button size="sm" variant="outline" onClick={handleRequestApproval}>
                    Request Approval
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Order-Level Margin Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Order-Level Margins
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                  {showDetails ? "Hide Details" : "Show Details"}
                </Button>
              </div>

              <div className="space-y-2">
                {marginData.orders.map((order, idx) => (
                  <div 
                    key={order.orderId}
                    className={`p-3 rounded-lg border ${order.isProfitable ? "bg-muted/30" : "bg-destructive/10 border-destructive/20"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{order.customerName}</span>
                        {!order.isProfitable && (
                          <Badge variant="destructive" className="text-xs">Loss</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm">
                          ₦{order.revenue.toLocaleString()}
                        </span>
                        <span className={`font-bold ${order.margin >= 0 ? "text-success" : "text-destructive"}`}>
                          {order.margin >= 0 ? "+" : ""}₦{order.margin.toLocaleString()}
                        </span>
                        <Badge variant={order.marginPercent >= 15 ? "default" : order.marginPercent > 0 ? "secondary" : "destructive"}>
                          {order.marginPercent}%
                        </Badge>
                      </div>
                    </div>

                    {showDetails && (
                      <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mt-2 pt-2 border-t">
                        <div className="flex items-center gap-1">
                          <Fuel className="w-3 h-3" />
                          Fuel: ₦{order.fuelEstimate.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Driver: ₦{order.driverCost.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          Maint: ₦{order.maintenanceAllocation.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Idle: ₦{order.idleTimeCost.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* Margin Progress Bar */}
                    <div className="mt-2">
                      <Progress 
                        value={Math.max(0, Math.min(100, order.marginPercent * 2))} 
                        className={`h-1.5 ${order.isProfitable ? "" : "[&>div]:bg-destructive"}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* AI Recommendations */}
            {marginData.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  AI Profit Recommendations
                </h4>

                <div className="space-y-2">
                  {marginData.recommendations.map((rec, idx) => {
                    const Icon = rec.type === "split" ? Split :
                                 rec.type === "merge" ? Merge :
                                 rec.type === "upgrade" ? ArrowUpRight :
                                 rec.type === "downgrade" ? ArrowDownRight :
                                 rec.type === "reject" ? AlertTriangle :
                                 Target;
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg border flex items-start justify-between ${
                          rec.priority === "high" ? "bg-destructive/5 border-destructive/20" :
                          rec.priority === "medium" ? "bg-warning/5 border-warning/20" :
                          "bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded ${
                            rec.priority === "high" ? "bg-destructive/10" :
                            rec.priority === "medium" ? "bg-warning/10" :
                            "bg-muted"
                          }`}>
                            <Icon className={`w-4 h-4 ${
                              rec.priority === "high" ? "text-destructive" :
                              rec.priority === "medium" ? "text-warning" :
                              "text-muted-foreground"
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">{rec.type.replace("_", " ")}</p>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            <div className="flex items-center gap-4 mt-1 text-xs">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className={`flex items-center gap-1 ${rec.impact.marginDelta >= 0 ? "text-success" : "text-destructive"}`}>
                                    <DollarSign className="w-3 h-3" />
                                    {rec.impact.marginDelta >= 0 ? "+" : ""}₦{rec.impact.marginDelta.toLocaleString()}
                                  </TooltipTrigger>
                                  <TooltipContent>Margin Impact</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleApplyRecommendation(rec)}
                        >
                          Apply
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Explainability Footer */}
            <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Cost Calculation</p>
                <p>
                  Includes fuel (₦{COST_CONFIG.fuelPricePerLiter}/L), driver (₦{COST_CONFIG.driverRatePerTrip}/trip), 
                  maintenance (₦{COST_CONFIG.maintenancePerKm}/km), idle time (₦{COST_CONFIG.idleCostPerHour}/hr), 
                  and {COST_CONFIG.whtRate * 100}% WHT. All decisions are logged and auditable.
                </p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MarginAwareRouting;
