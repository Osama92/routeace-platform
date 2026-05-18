import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  FlaskConical,
  Plus,
  Minus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Truck,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Zap,
  Brain,
  ShieldCheck,
  Target,
  Loader2
} from "lucide-react";

export interface SimulationOrder {
  id: string;
  customerName: string;
  deliveryAddress: string;
  weightKg?: number;
  volumeCbm?: number;
  priority?: string;
  estimatedRevenue?: number;
}

export interface SimulationResult {
  originalDurationDays: number;
  newDurationDays: number;
  durationDelta: number;
  originalCompletionDate: string | null;
  newCompletionDate: string | null;
  originalCostPerDelivery: number;
  newCostPerDelivery: number;
  costDelta: number;
  originalVehicleUtilization: number;
  newVehicleUtilization: number;
  utilizationDelta: number;
  originalConfidence: number;
  newConfidence: number;
  confidenceDelta: number;
  originalSlaRisk: "low" | "medium" | "high";
  newSlaRisk: "low" | "medium" | "high";
  originalMargin: number;
  newMargin: number;
  marginDelta: number;
  originalOnTimeProbability: number;
  newOnTimeProbability: number;
  onTimeDelta: number;
  explanation: string;
  recommendations: string[];
}

interface WhatIfSimulatorProps {
  currentOrders: SimulationOrder[];
  availableOrders: SimulationOrder[];
  currentDurationDays: number;
  currentCostPerDelivery: number;
  currentVehicleUtilization: number;
  currentConfidence: number;
  currentMargin: number;
  currentCompletionDate: string | null;
  vehicleType?: string;
  onSimulationComplete?: (result: SimulationResult) => void;
  onApplyChanges?: (addedOrders: SimulationOrder[], removedOrderIds: string[]) => void;
}

const VEHICLE_TYPES = [
  { id: "bike", label: "Bike", maxWeight: 20, maxDrops: 15 },
  { id: "van", label: "Van", maxWeight: 500, maxDrops: 20 },
  { id: "5t", label: "5T Truck", maxWeight: 5000, maxDrops: 10 },
  { id: "10t", label: "10T Truck", maxWeight: 10000, maxDrops: 8 },
  { id: "15t", label: "15T Truck", maxWeight: 15000, maxDrops: 5 },
  { id: "20t", label: "20T Truck", maxWeight: 20000, maxDrops: 3 },
  { id: "30t", label: "30T Truck", maxWeight: 30000, maxDrops: 2 },
];

const WhatIfSimulator = ({
  currentOrders,
  availableOrders,
  currentDurationDays,
  currentCostPerDelivery,
  currentVehicleUtilization,
  currentConfidence,
  currentMargin,
  currentCompletionDate,
  vehicleType = "15t",
  onSimulationComplete,
  onApplyChanges
}: WhatIfSimulatorProps) => {
  const { toast } = useToast();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleType);
  const [ordersToAdd, setOrdersToAdd] = useState<SimulationOrder[]>([]);
  const [ordersToRemove, setOrdersToRemove] = useState<Set<string>>(new Set());
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  // Calculate simulated metrics
  const runSimulation = useCallback(async () => {
    if (ordersToAdd.length === 0 && ordersToRemove.size === 0 && selectedVehicle === vehicleType) {
      toast({
        title: "No Changes",
        description: "Make some changes to run a simulation",
        variant: "destructive"
      });
      return;
    }

    setIsSimulating(true);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Calculate new order count
      const originalOrderCount = currentOrders.length;
      const newOrderCount = originalOrderCount + ordersToAdd.length - ordersToRemove.size;
      
      // Calculate weight changes
      const addedWeight = ordersToAdd.reduce((sum, o) => sum + (o.weightKg || 50), 0);
      const removedWeight = currentOrders
        .filter(o => ordersToRemove.has(o.id))
        .reduce((sum, o) => sum + (o.weightKg || 50), 0);
      
      // Duration impact: +0.3 days per added order, -0.2 days per removed order
      const durationImpact = (ordersToAdd.length * 0.35) - (ordersToRemove.size * 0.25);
      const newDurationDays = Math.max(0.5, currentDurationDays + durationImpact);
      
      // Calculate completion date change
      const originalDate = currentCompletionDate ? new Date(currentCompletionDate) : new Date();
      const newDate = new Date(originalDate);
      newDate.setDate(newDate.getDate() + Math.ceil(durationImpact));
      
      // Cost per delivery changes with order count
      const costImpact = newOrderCount !== originalOrderCount 
        ? (originalOrderCount / Math.max(1, newOrderCount)) 
        : 1;
      const newCostPerDelivery = Math.round(currentCostPerDelivery * costImpact);
      
      // Vehicle utilization
      const vehicleConfig = VEHICLE_TYPES.find(v => v.id === selectedVehicle) || VEHICLE_TYPES[4];
      const newTotalWeight = currentOrders.reduce((sum, o) => sum + (o.weightKg || 50), 0) + addedWeight - removedWeight;
      const newUtilization = Math.min(100, Math.round((newTotalWeight / vehicleConfig.maxWeight) * 100));
      
      // Confidence score impact
      let confidenceImpact = 0;
      if (ordersToAdd.length > 2) confidenceImpact -= 8;
      else if (ordersToAdd.length > 0) confidenceImpact -= 3;
      if (ordersToRemove.size > 0) confidenceImpact += 2;
      if (newOrderCount > vehicleConfig.maxDrops) confidenceImpact -= 15;
      if (selectedVehicle !== vehicleType) confidenceImpact -= 5;
      
      const newConfidence = Math.max(20, Math.min(100, currentConfidence + confidenceImpact));
      
      // SLA risk
      const getSlaRisk = (conf: number): "low" | "medium" | "high" => {
        if (conf >= 85) return "low";
        if (conf >= 65) return "medium";
        return "high";
      };
      
      // Margin impact
      const addedRevenue = ordersToAdd.reduce((sum, o) => sum + (o.estimatedRevenue || 5000), 0);
      const removedRevenue = currentOrders
        .filter(o => ordersToRemove.has(o.id))
        .reduce((sum, o) => sum + (o.estimatedRevenue || 5000), 0);
      const revenueChange = addedRevenue - removedRevenue;
      const costChange = (ordersToAdd.length - ordersToRemove.size) * 3000;
      const marginChange = ((revenueChange - costChange) / Math.max(1, revenueChange)) * 100;
      const newMargin = Math.max(-50, Math.min(100, currentMargin + marginChange / 10));
      
      // On-time probability
      const onTimeImpact = confidenceImpact * 0.8;
      const newOnTimeProbability = Math.max(30, Math.min(98, 
        currentConfidence + 5 + onTimeImpact
      ));

      // Generate explanation
      const explanationParts: string[] = [];
      if (ordersToAdd.length > 0) {
        explanationParts.push(`Adding ${ordersToAdd.length} order(s) increases route duration by ${Math.abs(durationImpact).toFixed(1)} days`);
      }
      if (ordersToRemove.size > 0) {
        explanationParts.push(`Removing ${ordersToRemove.size} order(s) reduces workload`);
      }
      if (confidenceImpact < 0) {
        explanationParts.push(`reduces confidence from ${currentConfidence}% to ${newConfidence}%`);
      }
      if (marginChange !== 0) {
        explanationParts.push(`${marginChange > 0 ? 'improves' : 'reduces'} margin by ${Math.abs(marginChange / 10).toFixed(1)}%`);
      }

      const explanation = explanationParts.length > 0 
        ? explanationParts.join(", ") + "."
        : "No significant impact detected.";

      // Generate recommendations
      const recommendations: string[] = [];
      if (newConfidence < 65) {
        recommendations.push("Consider splitting this route to improve confidence");
      }
      if (newUtilization > 95) {
        recommendations.push("Vehicle is near capacity - consider upgrading");
      }
      if (newMargin < 10) {
        recommendations.push("Low margin detected - review pricing or remove low-value orders");
      }
      if (newOrderCount > vehicleConfig.maxDrops) {
        recommendations.push(`Exceeds max drops (${vehicleConfig.maxDrops}) for ${vehicleConfig.label}`);
      }

      const result: SimulationResult = {
        originalDurationDays: currentDurationDays,
        newDurationDays: Math.round(newDurationDays * 10) / 10,
        durationDelta: Math.round(durationImpact * 10) / 10,
        originalCompletionDate: currentCompletionDate,
        newCompletionDate: newDate.toISOString().split('T')[0],
        originalCostPerDelivery: currentCostPerDelivery,
        newCostPerDelivery,
        costDelta: newCostPerDelivery - currentCostPerDelivery,
        originalVehicleUtilization: currentVehicleUtilization,
        newVehicleUtilization: newUtilization,
        utilizationDelta: newUtilization - currentVehicleUtilization,
        originalConfidence: currentConfidence,
        newConfidence,
        confidenceDelta: confidenceImpact,
        originalSlaRisk: getSlaRisk(currentConfidence),
        newSlaRisk: getSlaRisk(newConfidence),
        originalMargin: currentMargin,
        newMargin: Math.round(newMargin * 10) / 10,
        marginDelta: Math.round((newMargin - currentMargin) * 10) / 10,
        originalOnTimeProbability: currentConfidence + 5,
        newOnTimeProbability: Math.round(newOnTimeProbability),
        onTimeDelta: Math.round(onTimeImpact),
        explanation,
        recommendations
      };

      setSimulationResult(result);
      onSimulationComplete?.(result);

      toast({
        title: "Simulation Complete",
        description: explanation
      });
    } catch (error) {
      console.error("Simulation error:", error);
      toast({
        title: "Simulation Failed",
        description: "Could not complete the simulation",
        variant: "destructive"
      });
    } finally {
      setIsSimulating(false);
    }
  }, [
    currentOrders, ordersToAdd, ordersToRemove, selectedVehicle, vehicleType,
    currentDurationDays, currentCostPerDelivery, currentVehicleUtilization,
    currentConfidence, currentMargin, currentCompletionDate, onSimulationComplete, toast
  ]);

  const handleAddOrder = (order: SimulationOrder) => {
    if (!ordersToAdd.find(o => o.id === order.id)) {
      setOrdersToAdd(prev => [...prev, order]);
      setSimulationResult(null);
    }
  };

  const handleRemoveFromAdd = (orderId: string) => {
    setOrdersToAdd(prev => prev.filter(o => o.id !== orderId));
    setSimulationResult(null);
  };

  const handleMarkForRemoval = (orderId: string) => {
    setOrdersToRemove(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
    setSimulationResult(null);
  };

  const handleReset = () => {
    setOrdersToAdd([]);
    setOrdersToRemove(new Set());
    setSelectedVehicle(vehicleType);
    setSimulationResult(null);
  };

  const handleApply = () => {
    if (simulationResult) {
      onApplyChanges?.(ordersToAdd, Array.from(ordersToRemove));
      handleReset();
      toast({
        title: "Changes Applied",
        description: "Route has been updated with your changes"
      });
    }
  };

  const getDeltaColor = (delta: number, inverted = false) => {
    if (delta === 0) return "text-muted-foreground";
    const isPositive = inverted ? delta < 0 : delta > 0;
    return isPositive ? "text-success" : "text-destructive";
  };

  const getDeltaIcon = (delta: number, inverted = false) => {
    if (delta === 0) return null;
    const isPositive = inverted ? delta < 0 : delta > 0;
    return isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const hasChanges = ordersToAdd.length > 0 || ordersToRemove.size > 0 || selectedVehicle !== vehicleType;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            What-If Simulator
            <Badge variant="outline" className="text-xs">AI</Badge>
          </CardTitle>
          <div className="flex items-center gap-3">
            <Label htmlFor="whatif-toggle" className="text-sm text-muted-foreground">
              Simulation Mode
            </Label>
            <Switch
              id="whatif-toggle"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>
      </CardHeader>

      {isEnabled && (
        <CardContent className="space-y-4">
          {/* Simulation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Add Orders */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Plus className="w-4 h-4 text-success" />
                Add Orders
              </Label>
              <Select
                onValueChange={(orderId) => {
                  const order = availableOrders.find(o => o.id === orderId);
                  if (order) handleAddOrder(order);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select order to add..." />
                </SelectTrigger>
                <SelectContent>
                  {availableOrders
                    .filter(o => !ordersToAdd.find(a => a.id === o.id))
                    .map(order => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.customerName} - {order.deliveryAddress?.split(",")[0]}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {ordersToAdd.length > 0 && (
                <div className="space-y-1">
                  {ordersToAdd.map(order => (
                    <Badge 
                      key={order.id} 
                      variant="secondary" 
                      className="mr-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => handleRemoveFromAdd(order.id)}
                    >
                      + {order.customerName}
                      <Minus className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Remove Orders */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Minus className="w-4 h-4 text-destructive" />
                Remove Orders
              </Label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentOrders.map(order => (
                  <div 
                    key={order.id}
                    className={`flex items-center justify-between p-2 rounded text-sm cursor-pointer transition-colors ${
                      ordersToRemove.has(order.id) 
                        ? "bg-destructive/20 line-through" 
                        : "bg-muted/30 hover:bg-muted/50"
                    }`}
                    onClick={() => handleMarkForRemoval(order.id)}
                  >
                    <span>{order.customerName}</span>
                    {ordersToRemove.has(order.id) && (
                      <Minus className="w-3 h-3 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle Swap */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Truck className="w-4 h-4" />
                Swap Vehicle
              </Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map(v => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label} (max {v.maxDrops} drops)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedVehicle !== vehicleType && (
                <Badge variant="secondary">
                  Changed from {VEHICLE_TYPES.find(v => v.id === vehicleType)?.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={runSimulation}
              disabled={!hasChanges || isSimulating}
              className="flex-1"
            >
              {isSimulating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Run Simulation
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={!hasChanges}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <Separator />

          {/* Simulation Results */}
          {simulationResult && (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between cursor-pointer p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-primary" />
                    <span className="font-medium">Simulation Results</span>
                    <Badge 
                      variant={simulationResult.newConfidence >= 65 ? "default" : "destructive"}
                    >
                      {simulationResult.newConfidence}% confidence
                    </Badge>
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="pt-4 space-y-4">
                {/* AI Explanation */}
                <div className={`p-3 rounded-lg border ${
                  simulationResult.newConfidence >= 85 ? "bg-success/10 border-success/20" :
                  simulationResult.newConfidence >= 65 ? "bg-warning/10 border-warning/20" :
                  "bg-destructive/10 border-destructive/20"
                }`}>
                  <p className="text-sm italic">"{simulationResult.explanation}"</p>
                </div>

                {/* Metrics Comparison Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Duration */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      Duration
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{simulationResult.newDurationDays} days</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.durationDelta, true)}`}>
                        {getDeltaIcon(simulationResult.durationDelta, true)}
                        {simulationResult.durationDelta > 0 ? "+" : ""}{simulationResult.durationDelta}d
                      </span>
                    </div>
                  </div>

                  {/* Cost per Delivery */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <DollarSign className="w-3 h-3" />
                      Cost/Delivery
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">₦{simulationResult.newCostPerDelivery.toLocaleString()}</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.costDelta, true)}`}>
                        {getDeltaIcon(simulationResult.costDelta, true)}
                        {simulationResult.costDelta > 0 ? "+" : ""}₦{simulationResult.costDelta}
                      </span>
                    </div>
                  </div>

                  {/* Vehicle Utilization */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Truck className="w-3 h-3" />
                      Utilization
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{simulationResult.newVehicleUtilization}%</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.utilizationDelta)}`}>
                        {getDeltaIcon(simulationResult.utilizationDelta)}
                        {simulationResult.utilizationDelta > 0 ? "+" : ""}{simulationResult.utilizationDelta}%
                      </span>
                    </div>
                  </div>

                  {/* Confidence */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <ShieldCheck className="w-3 h-3" />
                      Confidence
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{simulationResult.newConfidence}%</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.confidenceDelta)}`}>
                        {getDeltaIcon(simulationResult.confidenceDelta)}
                        {simulationResult.confidenceDelta > 0 ? "+" : ""}{simulationResult.confidenceDelta}%
                      </span>
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Target className="w-3 h-3" />
                      Margin
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{simulationResult.newMargin}%</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.marginDelta)}`}>
                        {getDeltaIcon(simulationResult.marginDelta)}
                        {simulationResult.marginDelta > 0 ? "+" : ""}{simulationResult.marginDelta}%
                      </span>
                    </div>
                  </div>

                  {/* On-Time Probability */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <CheckCircle className="w-3 h-3" />
                      On-Time Prob.
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{simulationResult.newOnTimeProbability}%</span>
                      <span className={`text-xs flex items-center gap-1 ${getDeltaColor(simulationResult.onTimeDelta)}`}>
                        {getDeltaIcon(simulationResult.onTimeDelta)}
                        {simulationResult.onTimeDelta > 0 ? "+" : ""}{simulationResult.onTimeDelta}%
                      </span>
                    </div>
                  </div>

                  {/* SLA Risk */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <AlertCircle className="w-3 h-3" />
                      SLA Risk
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={
                        simulationResult.newSlaRisk === "low" ? "default" :
                        simulationResult.newSlaRisk === "medium" ? "secondary" :
                        "destructive"
                      }>
                        {simulationResult.newSlaRisk}
                      </Badge>
                      {simulationResult.newSlaRisk !== simulationResult.originalSlaRisk && (
                        <span className="text-xs">was {simulationResult.originalSlaRisk}</span>
                      )}
                    </div>
                  </div>

                  {/* Completion Date */}
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Clock className="w-3 h-3" />
                      Completion
                    </div>
                    <div className="text-sm">
                      <span className="font-semibold">{simulationResult.newCompletionDate}</span>
                    </div>
                  </div>
                </div>

                {/* Recommendations */}
                {simulationResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">AI Recommendations</Label>
                    <div className="space-y-1">
                      {simulationResult.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-warning/10 rounded">
                          <AlertCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Changes Button */}
                <Button
                  onClick={handleApply}
                  disabled={simulationResult.newConfidence < 65}
                  className="w-full"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Apply Changes to Route
                </Button>
                {simulationResult.newConfidence < 65 && (
                  <p className="text-xs text-center text-destructive">
                    Cannot apply changes with confidence below 65%. Admin approval required.
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Empty State */}
          {!simulationResult && !hasChanges && (
            <div className="text-center py-6 text-muted-foreground">
              <FlaskConical className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Add, remove orders or swap vehicles to simulate impact</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default WhatIfSimulator;
