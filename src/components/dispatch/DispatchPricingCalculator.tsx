import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Calculator,
  DollarSign,
  Fuel,
  Truck,
  Route,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Settings,
  BarChart3,
  Clock,
  MapPin,
  Percent
} from "lucide-react";

interface PricingCalculatorProps {
  routeDistance?: number;
  vehicleType?: string;
  loadWeight?: number;
  urgency?: "standard" | "express" | "urgent";
  onPriceCalculated?: (price: number, breakdown: PriceBreakdown) => void;
}

interface PriceBreakdown {
  basePrice: number;
  fuelCost: number;
  driverCost: number;
  maintenanceCost: number;
  tollCost: number;
  riskPremium: number;
  demandMultiplier: number;
  urgencyMultiplier: number;
  marginAmount: number;
  totalPrice: number;
  profitMargin: number;
}

type PricingModel = "per_km" | "flat_rate" | "dynamic" | "contract" | "whitelabel";

const PRICING_MODELS: { value: PricingModel; label: string; description: string }[] = [
  { value: "per_km", label: "Per Kilometer", description: "Standard rate per km traveled" },
  { value: "flat_rate", label: "Flat Rate", description: "Fixed price per delivery" },
  { value: "dynamic", label: "Dynamic", description: "Real-time demand-based pricing" },
  { value: "contract", label: "Contract", description: "Pre-agreed customer rates" },
  { value: "whitelabel", label: "White-Label", description: "Reseller markup pricing" },
];

const DispatchPricingCalculator = ({
  routeDistance = 100,
  vehicleType = "15T Truck",
  loadWeight = 5000,
  urgency = "standard",
  onPriceCalculated
}: PricingCalculatorProps) => {
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();
  
  const isAdmin = hasAnyRole(["admin", "super_admin"]);
  const isOpsManager = hasAnyRole(["ops_manager", "operations"]);

  // Pricing configuration
  const [pricingModel, setPricingModel] = useState<PricingModel>("per_km");
  const [baseRatePerKm, setBaseRatePerKm] = useState(500);
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState(700);
  const [driverHourlyRate, setDriverHourlyRate] = useState(1500);
  const [targetMargin, setTargetMargin] = useState(25);
  const [whitelabelMarkup, setWhitelabelMarkup] = useState(15);
  const [contractDiscount, setContractDiscount] = useState(10);
  
  // Calculated inputs
  const [distance, setDistance] = useState(routeDistance);
  const [weight, setWeight] = useState(loadWeight);
  const [selectedVehicle, setSelectedVehicle] = useState(vehicleType);
  const [selectedUrgency, setSelectedUrgency] = useState(urgency);

  // Fetch market data
  const { data: demandData } = useQuery({
    queryKey: ["pricing-demand-factor"],
    queryFn: async () => {
      const { count } = await supabase
        .from("dispatches")
        .select("*", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .in("status", ["pending", "assigned", "in_transit"]);

      // High demand = higher multiplier
      const demandLevel = (count || 0) > 50 ? "high" : (count || 0) > 20 ? "medium" : "low";
      const multiplier = demandLevel === "high" ? 1.25 : demandLevel === "medium" ? 1.1 : 1.0;
      
      return { activeDispatches: count || 0, demandLevel, multiplier };
    }
  });

  // Vehicle-specific fuel consumption rates (L/km)
  const vehicleFuelRates: Record<string, number> = {
    "Bike": 0.03,
    "Bus": 0.15,
    "15T Truck": 0.35,
    "20T Truck": 0.42,
    "30T Truck": 0.55
  };

  // Urgency multipliers
  const urgencyMultipliers: Record<string, number> = {
    "standard": 1.0,
    "express": 1.3,
    "urgent": 1.6
  };

  // Calculate price breakdown
  const priceBreakdown = useMemo((): PriceBreakdown => {
    const fuelRate = vehicleFuelRates[selectedVehicle] || 0.35;
    const urgencyMult = urgencyMultipliers[selectedUrgency];
    const demandMult = demandData?.multiplier || 1.0;

    // Base calculations
    const fuelLiters = distance * 2 * fuelRate; // Round trip
    const fuelCost = fuelLiters * fuelPricePerLiter;
    
    const travelHours = distance * 2 / 50; // Assume 50 km/h average
    const driverCost = travelHours * driverHourlyRate;
    
    const maintenanceCost = distance * 2 * 15; // ₦15/km maintenance
    const tollCost = Math.round(distance * 20); // Estimated tolls
    
    // Risk premium (10% of base costs for long routes)
    const baseCosts = fuelCost + driverCost + maintenanceCost + tollCost;
    const riskPremium = distance > 200 ? baseCosts * 0.1 : 0;
    
    // Base price before multipliers
    let basePrice = distance * baseRatePerKm;
    
    // Apply model-specific adjustments
    switch (pricingModel) {
      case "flat_rate":
        basePrice = basePrice * 0.9; // Slight discount for flat rate
        break;
      case "dynamic":
        basePrice = basePrice * demandMult;
        break;
      case "contract":
        basePrice = basePrice * (1 - contractDiscount / 100);
        break;
      case "whitelabel":
        basePrice = basePrice * (1 + whitelabelMarkup / 100);
        break;
    }
    
    // Apply urgency
    basePrice = basePrice * urgencyMult;
    
    // Calculate total cost
    const totalCost = baseCosts + riskPremium;
    
    // Calculate margin
    const marginAmount = basePrice * (targetMargin / 100);
    const totalPrice = Math.max(basePrice + marginAmount, totalCost * 1.1); // Ensure at least 10% above cost
    
    const actualMargin = ((totalPrice - totalCost) / totalPrice) * 100;

    return {
      basePrice: Math.round(basePrice),
      fuelCost: Math.round(fuelCost),
      driverCost: Math.round(driverCost),
      maintenanceCost: Math.round(maintenanceCost),
      tollCost,
      riskPremium: Math.round(riskPremium),
      demandMultiplier: demandMult,
      urgencyMultiplier: urgencyMult,
      marginAmount: Math.round(marginAmount),
      totalPrice: Math.round(totalPrice),
      profitMargin: Math.round(actualMargin)
    };
  }, [distance, selectedVehicle, selectedUrgency, pricingModel, baseRatePerKm, fuelPricePerLiter, driverHourlyRate, targetMargin, whitelabelMarkup, contractDiscount, demandData]);

  const handleApplyPrice = () => {
    onPriceCalculated?.(priceBreakdown.totalPrice, priceBreakdown);
    toast({
      title: "Price Applied",
      description: `₦${priceBreakdown.totalPrice.toLocaleString()} (${priceBreakdown.profitMargin}% margin)`
    });
  };

  return (
    <div className="space-y-6">
      {/* Pricing Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Pricing Model
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {PRICING_MODELS.map((model) => (
              <button
                key={model.value}
                onClick={() => setPricingModel(model.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  pricingModel === model.value 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-medium text-sm">{model.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{model.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Route Parameters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="w-4 h-4" />
            Route Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Distance (km)</Label>
              <Input
                type="number"
                value={distance}
                onChange={(e) => setDistance(Number(e.target.value) || 0)}
                min={1}
              />
            </div>
            <div className="space-y-2">
              <Label>Load Weight (kg)</Label>
              <Input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bike">Bike</SelectItem>
                  <SelectItem value="Bus">Bus</SelectItem>
                  <SelectItem value="15T Truck">15T Truck</SelectItem>
                  <SelectItem value="20T Truck">20T Truck</SelectItem>
                  <SelectItem value="30T Truck">30T Truck</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={selectedUrgency} onValueChange={(v: any) => setSelectedUrgency(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (1.0x)</SelectItem>
                  <SelectItem value="express">Express (1.3x)</SelectItem>
                  <SelectItem value="urgent">Urgent (1.6x)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Fuel className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Fuel</span>
              </div>
              <p className="text-lg font-bold">₦{priceBreakdown.fuelCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Driver</span>
              </div>
              <p className="text-lg font-bold">₦{priceBreakdown.driverCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-green-500" />
                <span className="text-sm">Maintenance</span>
              </div>
              <p className="text-lg font-bold">₦{priceBreakdown.maintenanceCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-purple-500" />
                <span className="text-sm">Tolls</span>
              </div>
              <p className="text-lg font-bold">₦{priceBreakdown.tollCost.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <span className="text-sm">Risk</span>
              </div>
              <p className="text-lg font-bold">₦{priceBreakdown.riskPremium.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm">Demand</span>
              </div>
              <p className="text-lg font-bold">{priceBreakdown.demandMultiplier.toFixed(2)}x</p>
              <Badge variant="outline" className="text-xs mt-1">
                {demandData?.demandLevel || "normal"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price Configuration (Admin Only) */}
      {isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Price Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Base Rate (₦/km)</Label>
                <Input
                  type="number"
                  value={baseRatePerKm}
                  onChange={(e) => setBaseRatePerKm(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Fuel Price (₦/L)</Label>
                <Input
                  type="number"
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Driver Rate (₦/hr)</Label>
                <Input
                  type="number"
                  value={driverHourlyRate}
                  onChange={(e) => setDriverHourlyRate(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Margin (%)</Label>
                <Input
                  type="number"
                  value={targetMargin}
                  onChange={(e) => setTargetMargin(Number(e.target.value))}
                />
              </div>
            </div>
            
            {/* Model-specific settings */}
            {pricingModel === "whitelabel" && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <Label>White-Label Markup: {whitelabelMarkup}%</Label>
                <Slider
                  value={[whitelabelMarkup]}
                  onValueChange={(v) => setWhitelabelMarkup(v[0])}
                  min={0}
                  max={50}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}
            
            {pricingModel === "contract" && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <Label>Contract Discount: {contractDiscount}%</Label>
                <Slider
                  value={[contractDiscount]}
                  onValueChange={(v) => setContractDiscount(v[0])}
                  min={0}
                  max={30}
                  step={1}
                  className="mt-2"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Final Price Card */}
      <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Suggested Price</p>
              <p className="text-4xl font-bold text-primary">
                ₦{priceBreakdown.totalPrice.toLocaleString()}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={priceBreakdown.profitMargin > 25 ? "default" : priceBreakdown.profitMargin > 15 ? "secondary" : "destructive"}>
                  <Percent className="w-3 h-3 mr-1" />
                  {priceBreakdown.profitMargin}% margin
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Base: ₦{priceBreakdown.basePrice.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {isOpsManager && (
                <Button variant="outline">
                  Override Price
                </Button>
              )}
              <Button onClick={handleApplyPrice}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Price
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Margin Alert */}
      {priceBreakdown.profitMargin < 15 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            Low margin alert: Current pricing yields only {priceBreakdown.profitMargin}% profit. 
            Consider increasing base rate or reviewing cost structure.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default DispatchPricingCalculator;
