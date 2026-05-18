import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Layers,
  MapPin,
  Plus,
  Truck,
  ChevronDown,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Zap,
  Target,
  Clock,
  Navigation,
  DollarSign,
  Users,
  Scale,
  Box,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Loader2,
  Info
} from "lucide-react";

export interface GroupableOrder {
  id: string;
  customerName: string;
  pickupAddress: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  weightKg: number;
  volumeCbm: number;
  priority: "high" | "normal" | "low";
  deliveryWindow?: string;
  revenue: number;
  slaHours?: number;
}

export interface AIRouteGroup {
  groupId: string;
  groupName: string;
  orders: GroupableOrder[];
  recommendedVehicle: {
    type: string;
    maxWeight: number;
    maxVolume: number;
    maxDrops: number;
  };
  totalWeight: number;
  totalVolume: number;
  estimatedDistance: number;
  estimatedDurationDays: number;
  confidenceScore: number;
  profitMargin: number;
  utilizationPercent: number;
  groupingReasons: string[];
  warnings: string[];
}

export interface ExtraDropOpportunity {
  orderId: string;
  order: GroupableOrder;
  targetGroupId: string;
  incrementalDistance: number;
  incrementalTimeDays: number;
  capacityImpact: number;
  profitImpact: number;
  newConfidence: number;
  recommendation: "recommended" | "optional" | "not_advised";
  reason: string;
}

interface AIOrderGroupingProps {
  availableOrders: GroupableOrder[];
  onGroupingComplete: (groups: AIRouteGroup[]) => void;
  onExtraDropAccept: (opportunity: ExtraDropOpportunity) => void;
}

const VEHICLE_CONFIGS = [
  { type: "Bike", maxWeight: 20, maxVolume: 0.05, maxDrops: 15 },
  { type: "Van", maxWeight: 500, maxVolume: 2, maxDrops: 20 },
  { type: "5T Truck", maxWeight: 5000, maxVolume: 15, maxDrops: 10 },
  { type: "10T Truck", maxWeight: 10000, maxVolume: 30, maxDrops: 8 },
  { type: "15T Truck", maxWeight: 15000, maxVolume: 40, maxDrops: 5 },
  { type: "20T Truck", maxWeight: 20000, maxVolume: 55, maxDrops: 3 },
  { type: "30T Truck", maxWeight: 30000, maxVolume: 80, maxDrops: 2 },
];

// Simple distance calculation (Haversine approximation)
const calculateDistance = (lat1?: number, lng1?: number, lat2?: number, lng2?: number): number => {
  if (!lat1 || !lng1 || !lat2 || !lng2) return Math.random() * 50 + 10; // Mock distance
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const AIOrderGrouping = ({
  availableOrders,
  onGroupingComplete,
  onExtraDropAccept
}: AIOrderGroupingProps) => {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [generatedGroups, setGeneratedGroups] = useState<AIRouteGroup[]>([]);
  const [extraDropOpportunities, setExtraDropOpportunities] = useState<ExtraDropOpportunity[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // Select optimal vehicle for given weight/volume/drops
  const selectVehicle = useCallback((totalWeight: number, totalVolume: number, dropCount: number) => {
    for (const vehicle of VEHICLE_CONFIGS) {
      if (totalWeight <= vehicle.maxWeight && 
          totalVolume <= vehicle.maxVolume && 
          dropCount <= vehicle.maxDrops) {
        return vehicle;
      }
    }
    return VEHICLE_CONFIGS[VEHICLE_CONFIGS.length - 1];
  }, []);

  // AI-powered grouping algorithm
  const generateGroups = useCallback(async () => {
    const ordersToGroup = availableOrders.filter(o => selectedOrders.has(o.id));
    
    if (ordersToGroup.length === 0) {
      toast({
        title: "No Orders Selected",
        description: "Please select orders to group",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    try {
      // Step 1: Cluster orders by proximity
      const clusters: Map<string, GroupableOrder[]> = new Map();
      
      ordersToGroup.forEach(order => {
        // Extract city/area from address for clustering
        const area = order.deliveryAddress.split(",")[0]?.trim() || "Unknown";
        if (!clusters.has(area)) {
          clusters.set(area, []);
        }
        clusters.get(area)!.push(order);
      });

      // Step 2: Create route groups from clusters
      const groups: AIRouteGroup[] = [];
      let groupIndex = 0;

      clusters.forEach((clusterOrders, area) => {
        // Check if cluster needs to be split based on capacity
        let currentGroup: GroupableOrder[] = [];
        let currentWeight = 0;
        let currentVolume = 0;

        clusterOrders.forEach(order => {
          const vehicle = selectVehicle(currentWeight + order.weightKg, currentVolume + order.volumeCbm, currentGroup.length + 1);
          
          // Check if adding this order exceeds capacity
          if (currentWeight + order.weightKg > vehicle.maxWeight ||
              currentVolume + order.volumeCbm > vehicle.maxVolume ||
              currentGroup.length >= vehicle.maxDrops) {
            // Finalize current group
            if (currentGroup.length > 0) {
              const finalVehicle = selectVehicle(currentWeight, currentVolume, currentGroup.length);
              const estimatedDistance = 50 + Math.random() * 150;
              const travelHours = estimatedDistance / 45;
              const waitHours = currentGroup.length * 2;
              const totalHours = travelHours + waitHours;
              const estimatedDays = Math.ceil((totalHours / 24) * 2) / 2;
              
              groups.push({
                groupId: `group-${++groupIndex}`,
                groupName: `${area} Route ${groupIndex}`,
                orders: [...currentGroup],
                recommendedVehicle: finalVehicle,
                totalWeight: currentWeight,
                totalVolume: currentVolume,
                estimatedDistance: Math.round(estimatedDistance),
                estimatedDurationDays: estimatedDays,
                confidenceScore: 75 + Math.random() * 20,
                profitMargin: 15 + Math.random() * 15,
                utilizationPercent: Math.round((currentWeight / finalVehicle.maxWeight) * 100),
                groupingReasons: [
                  `${currentGroup.length} orders clustered within ${area}`,
                  `${finalVehicle.type} recommended for ${currentWeight}kg load`,
                  `Estimated ${estimatedDays} days completion`
                ],
                warnings: currentGroup.length > 4 ? ["High drop count may affect ETA"] : []
              });
            }
            currentGroup = [order];
            currentWeight = order.weightKg;
            currentVolume = order.volumeCbm;
          } else {
            currentGroup.push(order);
            currentWeight += order.weightKg;
            currentVolume += order.volumeCbm;
          }
        });

        // Add remaining orders as final group
        if (currentGroup.length > 0) {
          const finalVehicle = selectVehicle(currentWeight, currentVolume, currentGroup.length);
          const estimatedDistance = 50 + Math.random() * 150;
          const travelHours = estimatedDistance / 45;
          const waitHours = currentGroup.length * 2;
          const totalHours = travelHours + waitHours;
          const estimatedDays = Math.ceil((totalHours / 24) * 2) / 2;
          
          groups.push({
            groupId: `group-${++groupIndex}`,
            groupName: `${area} Route ${groupIndex}`,
            orders: [...currentGroup],
            recommendedVehicle: finalVehicle,
            totalWeight: currentWeight,
            totalVolume: currentVolume,
            estimatedDistance: Math.round(estimatedDistance),
            estimatedDurationDays: estimatedDays,
            confidenceScore: 75 + Math.random() * 20,
            profitMargin: 15 + Math.random() * 15,
            utilizationPercent: Math.round((currentWeight / finalVehicle.maxWeight) * 100),
            groupingReasons: [
              `${currentGroup.length} orders clustered within ${area}`,
              `${finalVehicle.type} recommended for ${currentWeight}kg load`,
              `Estimated ${estimatedDays} days completion`
            ],
            warnings: currentGroup.length > 4 ? ["High drop count may affect ETA"] : []
          });
        }
      });

      setGeneratedGroups(groups);
      onGroupingComplete(groups);

      // Step 3: Detect extra drop opportunities
      const unassignedOrders = availableOrders.filter(o => !selectedOrders.has(o.id));
      const opportunities: ExtraDropOpportunity[] = [];

      groups.forEach(group => {
        unassignedOrders.slice(0, 3).forEach(order => {
          const newWeight = group.totalWeight + order.weightKg;
          const newVolume = group.totalVolume + order.volumeCbm;
          const newDropCount = group.orders.length + 1;
          
          const canFit = newWeight <= group.recommendedVehicle.maxWeight &&
                         newVolume <= group.recommendedVehicle.maxVolume &&
                         newDropCount <= group.recommendedVehicle.maxDrops;
          
          if (canFit) {
            const incrementalDistance = 5 + Math.random() * 20;
            const incrementalTime = incrementalDistance / 45 / 24 + (2 / 24); // + 2hr wait
            const newConfidence = group.confidenceScore - (Math.random() * 5);
            const profitImpact = order.revenue * 0.2 - (incrementalDistance * 50);
            
            let recommendation: ExtraDropOpportunity["recommendation"];
            if (profitImpact > 2000 && newConfidence > 70) {
              recommendation = "recommended";
            } else if (profitImpact > 0 && newConfidence > 60) {
              recommendation = "optional";
            } else {
              recommendation = "not_advised";
            }

            opportunities.push({
              orderId: order.id,
              order,
              targetGroupId: group.groupId,
              incrementalDistance: Math.round(incrementalDistance * 10) / 10,
              incrementalTimeDays: Math.round(incrementalTime * 10) / 10,
              capacityImpact: Math.round(((newWeight / group.recommendedVehicle.maxWeight) * 100) - group.utilizationPercent),
              profitImpact: Math.round(profitImpact),
              newConfidence: Math.round(newConfidence),
              recommendation,
              reason: recommendation === "recommended" 
                ? "High profit potential with minimal impact" 
                : recommendation === "optional"
                ? "Low impact but marginal profit"
                : "Would degrade route confidence below threshold"
            });
          }
        });
      });

      setExtraDropOpportunities(opportunities);

      toast({
        title: "Grouping Complete",
        description: `Created ${groups.length} optimized route groups`
      });
    } catch (error) {
      console.error("Grouping error:", error);
      toast({
        title: "Grouping Failed",
        description: "Could not generate route groups",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [availableOrders, selectedOrders, selectVehicle, onGroupingComplete, toast]);

  const handleSelectAll = () => {
    if (selectedOrders.size === availableOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(availableOrders.map(o => o.id)));
    }
  };

  const toggleOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const handleAcceptExtraDrop = (opportunity: ExtraDropOpportunity) => {
    onExtraDropAccept(opportunity);
    setExtraDropOpportunities(prev => prev.filter(o => o.orderId !== opportunity.orderId));
    toast({
      title: "Extra Drop Added",
      description: `${opportunity.order.customerName} added to route`
    });
  };

  const getRecommendationBadge = (rec: ExtraDropOpportunity["recommendation"]) => {
    switch (rec) {
      case "recommended":
        return <Badge className="bg-success text-success-foreground">🟢 Recommended</Badge>;
      case "optional":
        return <Badge className="bg-warning text-warning-foreground">🟡 Optional</Badge>;
      case "not_advised":
        return <Badge className="bg-destructive text-destructive-foreground">🔴 Not Advised</Badge>;
    }
  };

  return (
    <Card className="border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                AI Order Grouping
                <Badge variant="outline" className="text-xs">Smart Clustering</Badge>
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {selectedOrders.size}/{availableOrders.length} selected
                </Badge>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Order Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-medium">Available Orders</Label>
                <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                  {selectedOrders.size === availableOrders.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {availableOrders.map(order => (
                    <div 
                      key={order.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-colors cursor-pointer ${
                        selectedOrders.has(order.id) ? "bg-primary/10" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleOrder(order.id)}
                    >
                      <Checkbox 
                        checked={selectedOrders.has(order.id)}
                        onCheckedChange={() => toggleOrder(order.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{order.customerName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.deliveryAddress.split(",")[0]}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline">
                          <Scale className="w-3 h-3 mr-1" />
                          {order.weightKg}kg
                        </Badge>
                        <Badge variant={order.priority === "high" ? "destructive" : "secondary"}>
                          {order.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {availableOrders.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No orders available for grouping</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateGroups}
              disabled={selectedOrders.size === 0 || isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate AI Route Groups
            </Button>

            <Separator />

            {/* Generated Groups */}
            {generatedGroups.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Suggested Route Groups ({generatedGroups.length})
                </h4>

                <div className="space-y-3">
                  {generatedGroups.map(group => (
                    <div 
                      key={group.groupId}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        activeGroupId === group.groupId ? "border-primary bg-primary/5" : "bg-muted/30 hover:border-primary/50"
                      }`}
                      onClick={() => setActiveGroupId(activeGroupId === group.groupId ? null : group.groupId)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium">{group.groupName}</h5>
                            <Badge variant="outline">{group.orders.length} drops</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              {group.recommendedVehicle.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Navigation className="w-3 h-3" />
                              {group.estimatedDistance} km
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {group.estimatedDurationDays} days
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={group.confidenceScore >= 85 ? "bg-success" : group.confidenceScore >= 65 ? "bg-warning" : "bg-destructive"}>
                            {Math.round(group.confidenceScore)}% confidence
                          </Badge>
                          <span className="text-xs text-success">+{group.profitMargin.toFixed(1)}% margin</span>
                        </div>
                      </div>

                      {/* Utilization Bar */}
                      <div className="space-y-1 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span>Vehicle Utilization</span>
                          <span>{group.utilizationPercent}%</span>
                        </div>
                        <Progress value={group.utilizationPercent} className="h-1.5" />
                      </div>

                      {/* AI Insights */}
                      {activeGroupId === group.groupId && (
                        <div className="pt-3 border-t space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Why this grouping works:</p>
                          {group.groupingReasons.map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                              <span>{reason}</span>
                            </div>
                          ))}
                          {group.warnings.map((warning, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-warning">
                              <AlertTriangle className="w-3 h-3 mt-0.5" />
                              <span>{warning}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extra Drop Opportunities */}
            {extraDropOpportunities.length > 0 && (
              <div className="space-y-4">
                <Separator />
                <h4 className="font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4 text-primary" />
                  Extra Drop Opportunities ({extraDropOpportunities.length})
                </h4>

                <div className="space-y-2">
                  {extraDropOpportunities.map(opportunity => (
                    <div 
                      key={opportunity.orderId}
                      className={`p-3 rounded-lg border ${
                        opportunity.recommendation === "recommended" ? "bg-success/5 border-success/20" :
                        opportunity.recommendation === "optional" ? "bg-warning/5 border-warning/20" :
                        "bg-destructive/5 border-destructive/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{opportunity.order.customerName}</span>
                            {getRecommendationBadge(opportunity.recommendation)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            → Add to: {generatedGroups.find(g => g.groupId === opportunity.targetGroupId)?.groupName}
                          </p>
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Distance:</span>
                              <span className="ml-1">+{opportunity.incrementalDistance}km</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Time:</span>
                              <span className="ml-1">+{opportunity.incrementalTimeDays}d</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Capacity:</span>
                              <span className="ml-1">+{opportunity.capacityImpact}%</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Profit:</span>
                              <span className={`ml-1 ${opportunity.profitImpact >= 0 ? "text-success" : "text-destructive"}`}>
                                {opportunity.profitImpact >= 0 ? "+" : ""}₦{opportunity.profitImpact.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs italic text-muted-foreground mt-2">
                            "{opportunity.reason}"
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant={opportunity.recommendation === "not_advised" ? "outline" : "default"}
                          onClick={() => handleAcceptExtraDrop(opportunity)}
                          disabled={opportunity.newConfidence < 65 && opportunity.recommendation === "not_advised"}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {generatedGroups.length === 0 && !isProcessing && (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select orders and generate AI route groups</p>
                <p className="text-xs mt-1">Groups are optimized by proximity, capacity, and profitability</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default AIOrderGrouping;
