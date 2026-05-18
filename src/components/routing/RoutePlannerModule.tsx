import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { safeDivide } from "@/lib/apiValidator";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Navigation,
  Plus,
  Trash2,
  Calculator,
  Fuel,
  Clock,
  AlertTriangle,
  Wrench,
  DollarSign,
  Check,
  Route,
  Loader2,
  Star,
  TrendingUp,
} from "lucide-react";

interface Waypoint {
  address: string;
  lat?: number;
  lng?: number;
}

interface RouteOption {
  index: number;
  name: string;
  distanceKm: number;
  estimatedFuelCost: number;
  tollFees: number;
  driverTimeCost: number;
  riskPremium: number;
  maintenanceCost: number;
  totalCost: number;
  costEfficiency: number;
  timeEfficiency: number;
  riskScore: number;
  isRecommended: boolean;
}

const RoutePlannerModule = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Route form state
  const [routeName, setRouteName] = useState("");
  const [origin, setOrigin] = useState<Waypoint>({ address: "" });
  const [destination, setDestination] = useState<Waypoint>({ address: "" });
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [overrideReason, setOverrideReason] = useState("");

  // Calculated routes
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [savedRoutes, setSavedRoutes] = useState<any[]>([]);

  // Cost parameters - editable with no upper limit
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(1200);
  const [driverTripRate, setDriverTripRate] = useState(15000);
  const [maintenanceCostPerKm, setMaintenanceCostPerKm] = useState(15);

  useEffect(() => {
    fetchSavedRoutes();
  }, []);

  const fetchSavedRoutes = async () => {
    try {
      const { data } = await supabase
        .from("route_plans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      
      setSavedRoutes(data || []);
    } catch (error) {
      console.error("Error fetching saved routes:", error);
    }
  };

  const addWaypoint = () => {
    setWaypoints([...waypoints, { address: "" }]);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints(waypoints.filter((_, i) => i !== index));
  };

  const updateWaypoint = (index: number, value: string, lat?: number, lng?: number) => {
    const updated = [...waypoints];
    updated[index] = { address: value, lat, lng };
    setWaypoints(updated);
  };

  const calculateRoutes = async () => {
    if (!origin.address || !destination.address) {
      toast({
        title: "Error",
        description: "Please enter origin and destination",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    try {
      // Call the route optimization edge function
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: {
          origin: { address: origin.address, latitude: origin.lat, longitude: origin.lng },
          destination: { address: destination.address, latitude: destination.lat, longitude: destination.lng },
          waypoints: waypoints.filter(w => w.address).map(w => ({
            address: w.address,
            latitude: w.lat,
            longitude: w.lng,
          })),
        },
      });

      if (error) throw error;

      // Generate route options based on the optimized route
      const baseDistance = data?.totalDistanceKm || 500;
      
      const options: RouteOption[] = [
        generateRouteOption(0, "Optimized Route", baseDistance, true),
        generateRouteOption(1, "Shortest Distance", baseDistance * 0.95, false),
        generateRouteOption(2, "Fastest Route", baseDistance * 1.05, false),
      ];

      setRouteOptions(options);
      setSelectedRouteIndex(0);

      toast({
        title: "Routes Calculated",
        description: `${options.length} route options generated`,
      });
    } catch (error: any) {
      console.error("Route calculation error:", error);
      setRouteOptions([]);
      setSelectedRouteIndex(0);
      toast({
        title: "Could not calculate routes",
        description: error?.message || "Routing service unavailable. Please retry.",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const generateRouteOption = (index: number, name: string, distanceKm: number, isRecommended: boolean): RouteOption => {
    // Fuel efficiency: assume 3 km per liter for heavy trucks
    const fuelLiters = distanceKm / 3;
    const estimatedFuelCost = fuelLiters * fuelPricePerLiter;
    
    // Toll fees (estimated based on distance)
    const tollFees = Math.round(distanceKm * 20);
    
    // Driver cost - per trip flat rate
    const driverTimeCost = Math.round(driverTripRate / Math.max(1, routeOptions.length || 1));
    
    // Risk premium based on distance tiers (longer routes = higher risk)
    const riskScore = distanceKm > 500 ? 35 : distanceKm > 200 ? 25 : distanceKm > 100 ? 18 : 12;
    const riskPremium = Math.round(distanceKm * (riskScore / 100) * 50);
    
    // Maintenance cost
    const maintenanceCost = Math.round(distanceKm * maintenanceCostPerKm);
    
    // Total cost
    const totalCost = estimatedFuelCost + tollFees + driverTimeCost + riskPremium + maintenanceCost;
    
    // Efficiency scores
    const costEfficiency = Math.round(100 - (totalCost / 1000));
    const timeEfficiency = Math.round(100 - ((distanceKm / 50) * 5));

    return {
      index,
      name,
      distanceKm: Math.round(distanceKm),
      estimatedFuelCost: Math.round(estimatedFuelCost),
      tollFees,
      driverTimeCost,
      riskPremium,
      maintenanceCost,
      totalCost: Math.round(totalCost),
      costEfficiency: Math.max(0, Math.min(100, costEfficiency)),
      timeEfficiency: Math.max(0, Math.min(100, timeEfficiency)),
      riskScore: Math.round(riskScore),
      isRecommended,
    };
  };

  const saveRoute = async () => {
    if (!routeName || routeOptions.length === 0) {
      toast({
        title: "Error",
        description: "Please calculate routes and provide a name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const selectedRoute = routeOptions[selectedRouteIndex];
      
      const { error } = await supabase.from("route_plans").insert({
        name: routeName,
        origin_address: origin.address,
        origin_lat: origin.lat,
        origin_lng: origin.lng,
        destination_address: destination.address,
        destination_lat: destination.lat,
        destination_lng: destination.lng,
        waypoints: JSON.stringify(waypoints),
        alternate_routes: JSON.stringify(routeOptions),
        selected_route_index: selectedRouteIndex,
        distance_km: selectedRoute.distanceKm,
        estimated_fuel_cost: selectedRoute.estimatedFuelCost,
        toll_fees: selectedRoute.tollFees,
        driver_time_cost: selectedRoute.driverTimeCost,
        risk_premium: selectedRoute.riskPremium,
        maintenance_cost: selectedRoute.maintenanceCost,
        total_cost: selectedRoute.totalCost,
        cost_efficiency_score: selectedRoute.costEfficiency,
        time_efficiency_score: selectedRoute.timeEfficiency,
        risk_score: selectedRoute.riskScore,
        override_reason: selectedRouteIndex !== 0 ? overrideReason : null,
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: "Route Saved",
        description: "Route plan has been saved and can be used for pricing",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchSavedRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save route",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRouteName("");
    setOrigin({ address: "" });
    setDestination({ address: "" });
    setWaypoints([]);
    setRouteOptions([]);
    setSelectedRouteIndex(0);
    setOverrideReason("");
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Route Planner
            </CardTitle>
            <CardDescription>Plan routes with cost intelligence and pricing integration</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Plan New Route
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Route Plan</DialogTitle>
                <DialogDescription>
                  Define your route and calculate costs for pricing
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Route Name */}
                <div className="space-y-2">
                  <Label>Route Name</Label>
                  <Input
                    placeholder="e.g., Lagos-Kano Express Route"
                    value={routeName}
                    onChange={(e) => setRouteName(e.target.value)}
                  />
                </div>

                {/* Origin */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-success" />
                    Origin
                  </Label>
                  <AddressAutocomplete
                    value={origin.address}
                    onChange={(value) => setOrigin({ ...origin, address: value })}
                    onPlaceSelect={(place) => setOrigin({
                      address: place.formattedAddress,
                      lat: place.lat,
                      lng: place.lng,
                    })}
                    placeholder="Enter pickup location"
                  />
                </div>

                {/* Waypoints */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Waypoints (Optional)</Label>
                    <Button variant="ghost" size="sm" onClick={addWaypoint}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Stop
                    </Button>
                  </div>
                  {waypoints.map((wp, i) => (
                    <div key={i} className="flex gap-2">
                      <AddressAutocomplete
                        value={wp.address}
                        onChange={(value) => updateWaypoint(i, value)}
                        onPlaceSelect={(place) => updateWaypoint(i, place.formattedAddress, place.lat, place.lng)}
                        placeholder={`Stop ${i + 1}`}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeWaypoint(i)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Destination */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-destructive" />
                    Destination
                  </Label>
                  <AddressAutocomplete
                    value={destination.address}
                    onChange={(value) => setDestination({ ...destination, address: value })}
                    onPlaceSelect={(place) => setDestination({
                      address: place.formattedAddress,
                      lat: place.lat,
                      lng: place.lng,
                    })}
                    placeholder="Enter delivery location"
                  />
                </div>

                {/* Calculate Button */}
                <Button 
                  onClick={calculateRoutes} 
                  disabled={calculating}
                  className="w-full"
                  variant="secondary"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating Routes...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4 mr-2" />
                      Calculate Routes & Costs
                    </>
                  )}
                </Button>

                {/* Route Options */}
                {routeOptions.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="font-medium">Select Route Option</h4>
                    <RadioGroup
                      value={selectedRouteIndex.toString()}
                      onValueChange={(v) => setSelectedRouteIndex(parseInt(v))}
                    >
                      {routeOptions.map((route) => (
                        <div 
                          key={route.index}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedRouteIndex === route.index 
                              ? "border-primary bg-primary/5" 
                              : "border-border hover:border-primary/50"
                          }`}
                          onClick={() => setSelectedRouteIndex(route.index)}
                        >
                          <div className="flex items-start gap-3">
                            <RadioGroupItem value={route.index.toString()} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h5 className="font-medium">{route.name}</h5>
                                {route.isRecommended && (
                                  <Badge className="bg-success">
                                    <Star className="w-3 h-3 mr-1" />
                                    Recommended
                                  </Badge>
                                )}
                              </div>

                              {/* Cost Breakdown */}
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Navigation className="w-4 h-4 text-muted-foreground" />
                                  <span>{route.distanceKm} km</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Fuel className="w-4 h-4 text-muted-foreground" />
                                  <span>₦{route.estimatedFuelCost.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>₦{route.driverTimeCost.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                                  <span>₦{route.tollFees.toLocaleString()} tolls</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                                  <span>₦{route.riskPremium.toLocaleString()} risk</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Wrench className="w-4 h-4 text-muted-foreground" />
                                  <span>₦{route.maintenanceCost.toLocaleString()} maint.</span>
                                </div>
                              </div>

                              {/* Total and Scores */}
                              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div className="flex items-center gap-4">
                                  <Badge variant="outline">
                                    <TrendingUp className="w-3 h-3 mr-1" />
                                    Cost: {route.costEfficiency}%
                                  </Badge>
                                  <Badge variant="outline">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Time: {route.timeEfficiency}%
                                  </Badge>
                                  <Badge variant={route.riskScore > 25 ? "destructive" : "secondary"}>
                                    Risk: {route.riskScore}%
                                  </Badge>
                                </div>
                                <p className="text-lg font-bold text-primary">
                                  ₦{route.totalCost.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>

                    {/* Override Reason (if not recommended) */}
                    {selectedRouteIndex !== 0 && (
                      <div className="space-y-2">
                        <Label className="text-warning">Override Reason (Required)</Label>
                        <Textarea
                          placeholder="Explain why you're selecting a non-recommended route..."
                          value={overrideReason}
                          onChange={(e) => setOverrideReason(e.target.value)}
                        />
                      </div>
                    )}

                    {/* Save Button */}
                    <Button 
                      onClick={saveRoute} 
                      disabled={loading || (selectedRouteIndex !== 0 && !overrideReason)}
                      className="w-full"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 mr-2" />
                      )}
                      Save Route Plan
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Saved Routes */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Recent Route Plans</h4>
          
          {savedRoutes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Route className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No route plans yet</p>
              <p className="text-sm">Create your first route plan to get started</p>
            </div>
          ) : (
            savedRoutes.map((route) => (
              <div 
                key={route.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Route className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{route.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {route.origin_address?.slice(0, 20)}... → {route.destination_address?.slice(0, 20)}...
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">₦{route.total_cost?.toLocaleString() || 0}</p>
                  <p className="text-sm text-muted-foreground">{route.distance_km} km</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoutePlannerModule;
