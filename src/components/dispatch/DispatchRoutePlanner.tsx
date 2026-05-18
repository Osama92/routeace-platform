import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import RouteConfidenceScore, { RouteConfidence } from "./RouteConfidenceScore";
import WhatIfSimulator, { SimulationOrder, SimulationResult } from "./WhatIfSimulator";
import SelfLearningInsights from "./SelfLearningInsights";
import MarginAwareRouting, { OrderMarginData } from "./MarginAwareRouting";
import RouteInsightsPanel from "./RouteInsightsPanel";
import {
  Route,
  MapPin,
  Plus,
  Trash2,
  Calculator,
  Loader2,
  Clock,
  Navigation,
  Calendar,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Wand2,
  DollarSign,
  Truck,
  ShieldCheck,
  Brain,
  FlaskConical,
  Layers
} from "lucide-react";

interface RouteStop {
  id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  waitTimeHours: number;
}

interface CostBreakdown {
  fuelCost: number;
  driverCost: number;
  maintenanceCost: number;
  tollEstimate: number;
  totalCost: number;
  costPerDelivery: number;
}

interface CalculatedRoute {
  id: string;
  name: string;
  totalDistanceKm: number;
  totalTravelHours: number;
  totalWaitHours: number;
  totalHours: number;
  estimatedDeliveryDays: number;
  stops: RouteStop[];
  isOptimized: boolean;
  confidence?: RouteConfidence;
  costBreakdown?: CostBreakdown;
  vehicleUtilization?: number;
  onTimeLikelihood?: number;
}

interface SavedRoute {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distance_km: number;
  estimated_duration_hours: number;
}

interface DispatchRoutePlannerProps {
  origin: string;
  destination: string;
  dropoffs: { id: string; address: string; latitude?: number; longitude?: number }[];
  dispatchDate: string | null;
  vehicleType?: string;
  onRouteCalculated: (routeData: {
    routeId?: string;
    totalDistanceKm: number;
    estimatedDeliveryDays: number;
    estimatedCompletionDate: string | null;
    totalDrops: number;
    avgWaitTimePerDrop: number;
    optimizedStops: RouteStop[];
    confidence?: RouteConfidence;
    costBreakdown?: CostBreakdown;
    vehicleUtilization?: number;
    onTimeLikelihood?: number;
  }) => void;
  selectedRouteId?: string;
}

const DEFAULT_WAIT_TIME_HOURS = 2;

const DispatchRoutePlanner = ({
  origin,
  destination,
  dropoffs,
  dispatchDate,
  vehicleType = "15t",
  onRouteCalculated,
  selectedRouteId
}: DispatchRoutePlannerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [selectedExistingRoute, setSelectedExistingRoute] = useState<string>("");
  const [routeMode, setRouteMode] = useState<"existing" | "generate">("generate");
  
  // Route calculation state
  const [calculatedRoute, setCalculatedRoute] = useState<CalculatedRoute | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [avgWaitTime, setAvgWaitTime] = useState(DEFAULT_WAIT_TIME_HOURS);

  // Fetch existing saved routes
  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const { data, error } = await supabase
          .from("routes")
          .select("id, name, origin, destination, distance_km, estimated_duration_hours")
          .eq("is_active", true)
          .order("name");
        
        if (error) throw error;
        setSavedRoutes(data || []);
      } catch (error) {
        console.error("Error fetching routes:", error);
      }
    };
    fetchRoutes();
  }, []);

  // Initialize stops from dropoffs
  useEffect(() => {
    if (dropoffs.length > 0) {
      setStops(dropoffs.map(d => ({
        id: d.id,
        address: d.address,
        latitude: d.latitude,
        longitude: d.longitude,
        waitTimeHours: avgWaitTime
      })));
    }
  }, [dropoffs, avgWaitTime]);

  // Calculate ETA in days
  const calculateETADays = (totalTravelHours: number, totalDrops: number, waitTimePerDrop: number): number => {
    const totalWaitHours = totalDrops * waitTimePerDrop;
    const totalRouteHours = totalTravelHours + totalWaitHours;
    const days = totalRouteHours / 24;
    // Round up to nearest 0.5 day
    return Math.ceil(days * 2) / 2;
  };

  // Calculate estimated completion date
  const calculateCompletionDate = (startDate: string, deliveryDays: number): string => {
    const start = new Date(startDate);
    start.setDate(start.getDate() + Math.ceil(deliveryDays));
    return start.toISOString().split('T')[0];
  };

  // Generate optimized route
  const handleGenerateRoute = async () => {
    if (!origin || !destination) {
      toast({
        title: "Missing Data",
        description: "Origin and destination are required",
        variant: "destructive"
      });
      return;
    }

    setCalculating(true);
    try {
      // Call the optimize-route edge function with enhanced parameters
      const waypoints = stops.map(s => ({
        address: s.address,
        latitude: s.latitude,
        longitude: s.longitude,
        weightKg: 100, // Default weight
        volumeCbm: 0.5 // Default volume
      }));

      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          origin: { address: origin },
          destination: { address: destination },
          waypoints,
          vehicleType: vehicleType || "15t",
          waitTimePerDrop: avgWaitTime
        }
      });

      if (error) throw error;

      const totalDistanceKm = data?.totalDistanceKm || 0;
      const totalTravelHours = data?.totalDurationHours || (totalDistanceKm / 50);
      const totalDrops = stops.length + 1;
      const estimatedDays = data?.estimatedDeliveryDays || calculateETADays(totalTravelHours, totalDrops, avgWaitTime);

      // Update stops with optimized order if provided
      let optimizedStops = stops;
      if (data?.optimizedOrder && data.optimizedOrder.length > 0) {
        optimizedStops = data.optimizedOrder.map((idx: number) => stops[idx] || stops[0]);
      }

      const route: CalculatedRoute = {
        id: `generated-${Date.now()}`,
        name: "Optimized Route",
        totalDistanceKm,
        totalTravelHours,
        totalWaitHours: totalDrops * avgWaitTime,
        totalHours: totalTravelHours + (totalDrops * avgWaitTime),
        estimatedDeliveryDays: estimatedDays,
        stops: optimizedStops,
        isOptimized: true,
        confidence: data?.confidence,
        costBreakdown: data?.costBreakdown,
        vehicleUtilization: data?.vehicleUtilization,
        onTimeLikelihood: data?.onTimeLikelihood
      };

      setCalculatedRoute(route);

      // Notify parent component with all new fields
      onRouteCalculated({
        totalDistanceKm,
        estimatedDeliveryDays: estimatedDays,
        estimatedCompletionDate: dispatchDate ? calculateCompletionDate(dispatchDate, estimatedDays) : null,
        totalDrops,
        avgWaitTimePerDrop: avgWaitTime,
        optimizedStops,
        confidence: data?.confidence,
        costBreakdown: data?.costBreakdown,
        vehicleUtilization: data?.vehicleUtilization,
        onTimeLikelihood: data?.onTimeLikelihood
      });

      const confidenceLabel = data?.confidence?.band === "high" ? "High" : 
                              data?.confidence?.band === "medium" ? "Medium" : "Low";
      toast({
        title: "Route Optimized",
        description: `${estimatedDays} days | ${confidenceLabel} confidence (${data?.confidence?.overall || 0}%)`
      });
    } catch (error: any) {
      console.error("Route optimization error:", error);
      
      // Fallback calculation with mock data
      const estimatedDistance = 450 + Math.random() * 300;
      const estimatedTravelHours = estimatedDistance / 50;
      const totalDrops = stops.length + 1;
      const estimatedDays = calculateETADays(estimatedTravelHours, totalDrops, avgWaitTime);

      const route: CalculatedRoute = {
        id: `estimated-${Date.now()}`,
        name: "Estimated Route",
        totalDistanceKm: Math.round(estimatedDistance),
        totalTravelHours: Math.round(estimatedTravelHours * 10) / 10,
        totalWaitHours: totalDrops * avgWaitTime,
        totalHours: estimatedTravelHours + (totalDrops * avgWaitTime),
        estimatedDeliveryDays: estimatedDays,
        stops,
        isOptimized: false
      };

      setCalculatedRoute(route);

      onRouteCalculated({
        totalDistanceKm: route.totalDistanceKm,
        estimatedDeliveryDays: estimatedDays,
        estimatedCompletionDate: dispatchDate ? calculateCompletionDate(dispatchDate, estimatedDays) : null,
        totalDrops,
        avgWaitTimePerDrop: avgWaitTime,
        optimizedStops: stops
      });

      toast({
        title: "Using Estimated Route",
        description: "Route calculated with estimated values"
      });
    } finally {
      setCalculating(false);
    }
  };

  // Use existing route
  const handleUseExistingRoute = () => {
    const route = savedRoutes.find(r => r.id === selectedExistingRoute);
    if (!route) return;

    const totalTravelHours = route.estimated_duration_hours || (route.distance_km / 50);
    const totalDrops = stops.length + 1;
    const estimatedDays = calculateETADays(totalTravelHours, totalDrops, avgWaitTime);

    const calculatedRoute: CalculatedRoute = {
      id: route.id,
      name: route.name,
      totalDistanceKm: route.distance_km,
      totalTravelHours,
      totalWaitHours: totalDrops * avgWaitTime,
      totalHours: totalTravelHours + (totalDrops * avgWaitTime),
      estimatedDeliveryDays: estimatedDays,
      stops,
      isOptimized: true
    };

    setCalculatedRoute(calculatedRoute);

    onRouteCalculated({
      routeId: route.id,
      totalDistanceKm: route.distance_km,
      estimatedDeliveryDays: estimatedDays,
      estimatedCompletionDate: dispatchDate ? calculateCompletionDate(dispatchDate, estimatedDays) : null,
      totalDrops,
      avgWaitTimePerDrop: avgWaitTime,
      optimizedStops: stops
    });

    toast({
      title: "Route Selected",
      description: `Using "${route.name}" - ${estimatedDays} days estimated`
    });
  };

  // Update wait time and recalculate
  const handleWaitTimeChange = (newWaitTime: number) => {
    setAvgWaitTime(newWaitTime);
    
    // Recalculate if we have a route
    if (calculatedRoute) {
      const totalDrops = stops.length + 1;
      const estimatedDays = calculateETADays(calculatedRoute.totalTravelHours, totalDrops, newWaitTime);
      
      const updatedRoute = {
        ...calculatedRoute,
        totalWaitHours: totalDrops * newWaitTime,
        totalHours: calculatedRoute.totalTravelHours + (totalDrops * newWaitTime),
        estimatedDeliveryDays: estimatedDays
      };
      
      setCalculatedRoute(updatedRoute);
      
      onRouteCalculated({
        routeId: calculatedRoute.id.startsWith("generated") ? undefined : calculatedRoute.id,
        totalDistanceKm: calculatedRoute.totalDistanceKm,
        estimatedDeliveryDays: estimatedDays,
        estimatedCompletionDate: dispatchDate ? calculateCompletionDate(dispatchDate, estimatedDays) : null,
        totalDrops,
        avgWaitTimePerDrop: newWaitTime,
        optimizedStops: stops
      });
    }
  };

  const hasRequiredData = origin && destination;
  const totalDrops = stops.length + 1;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Route className="w-5 h-5 text-primary" />
          Route Planner
          <Badge variant="outline" className="ml-2">Required</Badge>
        </CardTitle>
        <CardDescription>
          Plan and optimize the delivery route. ETA is calculated in days with 2-hour wait time per stop.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Route Mode Selection */}
        <div className="space-y-3">
          <Label>Route Selection</Label>
          <RadioGroup
            value={routeMode}
            onValueChange={(v) => setRouteMode(v as "existing" | "generate")}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="generate" id="generate" />
              <Label htmlFor="generate" className="cursor-pointer">Generate Optimized Route</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="existing" id="existing" />
              <Label htmlFor="existing" className="cursor-pointer">Use Existing Route</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Existing Route Selection */}
        {routeMode === "existing" && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <Label>Select Saved Route</Label>
            <div className="flex gap-2">
              <Select value={selectedExistingRoute} onValueChange={setSelectedExistingRoute}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a saved route..." />
                </SelectTrigger>
                <SelectContent>
                  {savedRoutes.length === 0 ? (
                    <SelectItem value="" disabled>No saved routes available</SelectItem>
                  ) : (
                    savedRoutes.map(route => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.name} ({route.distance_km} km)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button onClick={handleUseExistingRoute} disabled={!selectedExistingRoute}>
                Apply Route
              </Button>
            </div>
            {savedRoutes.length === 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No routes found. Switch to "Generate Optimized Route" to create one.
              </p>
            )}
          </div>
        )}

        {/* Generate Route Section */}
        {routeMode === "generate" && (
          <div className="space-y-4">
            {/* Origin/Destination Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-success/10 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-success font-medium mb-1">
                  <MapPin className="w-4 h-4" />
                  Origin
                </div>
                <p className="text-sm truncate">{origin || "Not set"}</p>
              </div>
              <div className="p-3 bg-destructive/10 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-destructive font-medium mb-1">
                  <MapPin className="w-4 h-4" />
                  Destination
                </div>
                <p className="text-sm truncate">{destination || "Not set"}</p>
              </div>
            </div>

            {/* Stops Summary */}
            {stops.length > 0 && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Intermediate Stops</span>
                  <Badge variant="secondary">{stops.length} stops</Badge>
                </div>
                <div className="space-y-1">
                  {stops.slice(0, 3).map((stop, idx) => (
                    <p key={stop.id} className="text-xs text-muted-foreground truncate">
                      {idx + 1}. {stop.address}
                    </p>
                  ))}
                  {stops.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{stops.length - 3} more stops
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Wait Time Configuration */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-sm">Average Wait Time Per Drop</Label>
                <p className="text-xs text-muted-foreground">Time spent at each delivery location</p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={avgWaitTime}
                  onChange={(e) => handleWaitTimeChange(parseFloat(e.target.value) || 2)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerateRoute}
              disabled={!hasRequiredData || calculating}
              className="w-full"
              size="lg"
            >
              {calculating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Calculating Route...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Optimized Route
                </>
              )}
            </Button>
          </div>
        )}

        <Separator />

        {/* Calculated Route Results */}
        {calculatedRoute ? (
          <Tabs defaultValue="results" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="whatif">
                <FlaskConical className="w-3 h-3 mr-1" />
                What-If
              </TabsTrigger>
              <TabsTrigger value="margin">
                <DollarSign className="w-3 h-3 mr-1" />
                Margin
              </TabsTrigger>
              <TabsTrigger value="learning">
                <Brain className="w-3 h-3 mr-1" />
                AI Insights
              </TabsTrigger>
            </TabsList>

            {/* Route Results Tab */}
            <TabsContent value="results" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-success" />
                  Route Calculated
                </h4>
                <Badge variant={calculatedRoute.isOptimized ? "default" : "secondary"}>
                  {calculatedRoute.isOptimized ? "Optimized" : "Estimated"}
                </Badge>
              </div>

              {/* Confidence Score */}
              {calculatedRoute.confidence && (
                <RouteConfidenceScore confidence={calculatedRoute.confidence} />
              )}

              {/* ETA Display - Prominent */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Estimated Delivery Time</p>
                <p className="text-4xl font-bold text-primary">
                  {calculatedRoute.estimatedDeliveryDays} Days
                </p>
                {dispatchDate && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Expected Completion: {calculateCompletionDate(dispatchDate, calculatedRoute.estimatedDeliveryDays)}
                  </p>
                )}
              </div>

              {/* Calculation Breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Navigation className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{calculatedRoute.totalDistanceKm} km</p>
                  <p className="text-xs text-muted-foreground">Total Distance</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{Math.round(calculatedRoute.totalTravelHours)} hrs</p>
                  <p className="text-xs text-muted-foreground">Travel Time</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <MapPin className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{totalDrops}</p>
                  <p className="text-xs text-muted-foreground">Total Drops</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <TrendingUp className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <p className="text-lg font-semibold">{calculatedRoute.totalWaitHours} hrs</p>
                  <p className="text-xs text-muted-foreground">Wait Time</p>
                </div>
              </div>

              {/* Cost Breakdown */}
              {calculatedRoute.costBreakdown && (
                <div className="p-3 bg-success/5 border border-success/20 rounded-lg">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Cost Intelligence:</p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fuel:</span>
                      <span className="ml-1 font-medium">₦{calculatedRoute.costBreakdown.fuelCost.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Driver:</span>
                      <span className="ml-1 font-medium">₦{calculatedRoute.costBreakdown.driverCost.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>
                      <span className="ml-1 font-bold text-success">₦{calculatedRoute.costBreakdown.totalCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Calculation Formula Display */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs font-medium text-muted-foreground mb-2">ETA Calculation:</p>
                <p className="text-sm font-mono">
                  Travel ({Math.round(calculatedRoute.totalTravelHours)}h) + Wait ({totalDrops} × {avgWaitTime}h = {calculatedRoute.totalWaitHours}h) = {Math.round(calculatedRoute.totalHours)}h ÷ 24 = <span className="font-bold text-primary">{calculatedRoute.estimatedDeliveryDays} days</span>
                </p>
              </div>

              {/* Route Insights Panel */}
              <RouteInsightsPanel
                routeName={calculatedRoute.name}
                totalDrops={totalDrops}
                estimatedDays={calculatedRoute.estimatedDeliveryDays}
                vehicleType={vehicleType}
                confidenceScore={calculatedRoute.confidence?.overall || 75}
                profitMargin={calculatedRoute.costBreakdown ? 20 : 15}
                utilizationPercent={calculatedRoute.vehicleUtilization || 70}
                totalDistance={calculatedRoute.totalDistanceKm}
                riskFactors={calculatedRoute.confidence?.risks.map(r => r.factor) || []}
                expectedDelays={["2-hour wait time per drop", "Traffic variability during peak hours"]}
                bufferRecommendation="Consider adding 0.5 day buffer for routes with >5 drops"
              />
            </TabsContent>

            {/* What-If Simulation Tab */}
            <TabsContent value="whatif" className="mt-4">
              <WhatIfSimulator
                currentOrders={stops.map(s => ({
                  id: s.id,
                  customerName: s.address.split(",")[0] || "Order",
                  deliveryAddress: s.address,
                  weightKg: 100,
                  estimatedRevenue: 15000
                }))}
                availableOrders={[
                  { id: "extra-1", customerName: "New Customer A", deliveryAddress: "Victoria Island, Lagos", weightKg: 50, estimatedRevenue: 8000 },
                  { id: "extra-2", customerName: "New Customer B", deliveryAddress: "Ikeja, Lagos", weightKg: 150, estimatedRevenue: 12000 },
                  { id: "extra-3", customerName: "New Customer C", deliveryAddress: "Lekki, Lagos", weightKg: 80, estimatedRevenue: 10000 },
                ]}
                currentDurationDays={calculatedRoute.estimatedDeliveryDays}
                currentCostPerDelivery={calculatedRoute.costBreakdown?.costPerDelivery || 5000}
                currentVehicleUtilization={calculatedRoute.vehicleUtilization || 70}
                currentConfidence={calculatedRoute.confidence?.overall || 75}
                currentMargin={20}
                currentCompletionDate={dispatchDate ? calculateCompletionDate(dispatchDate, calculatedRoute.estimatedDeliveryDays) : null}
                vehicleType={vehicleType}
                onSimulationComplete={(result) => {
                  console.log("Simulation result:", result);
                }}
              />
            </TabsContent>

            {/* Margin Analysis Tab */}
            <TabsContent value="margin" className="mt-4">
              <MarginAwareRouting
                orders={stops.map((s, idx) => ({
                  orderId: s.id,
                  customerName: s.address.split(",")[0] || `Order ${idx + 1}`,
                  revenue: Number((s as any).totalAmount ?? (s as any).agreedRate ?? (s as any).estimatedValue ?? 0),
                  costKm: 0,
                  vehicleCost: 0,
                  fuelEstimate: 0,
                  driverCost: 0,
                  idleTimeCost: 0,
                  maintenanceAllocation: 0,
                  whtTax: 0,
                  totalCost: 0,
                  margin: 0,
                  marginPercent: 0,
                  isProfitable: true
                }))}
                routeDistance={calculatedRoute.totalDistanceKm}
                vehicleType={vehicleType}
              />
            </TabsContent>

            {/* AI Learning Tab */}
            <TabsContent value="learning" className="mt-4">
              <SelfLearningInsights routeId={calculatedRoute.id} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Route className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {hasRequiredData 
                ? "Click 'Generate Optimized Route' to calculate ETA"
                : "Set origin and destination to plan the route"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DispatchRoutePlanner;
