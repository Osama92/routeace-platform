import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Calculator, Settings, TrendingUp, Save, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  computeMaintenanceFund,
  toFiniteNumber,
  loadMaintenanceOverride,
  saveMaintenanceOverride,
} from "@/lib/pricing/maintenance";

interface PricingConfig {
  id: string;
  min_price_multiplier: number;
  max_price_multiplier: number;
}

interface VehicleProfile {
  label: string;
  fuelType: "diesel" | "petrol";
  kmPerLiter: number;
  defaultAllowance: number;
  defaultLevies: number;
  defaultMaintenance: number;
  /** Maintenance cost recovery, naira per kilometre. Drives auto-calc when route distance changes. */
  maintenancePerKm: number;
  baseRateFactor: number;
}

type VehicleKey = "bike" | "van_diesel" | "van_petrol" | "truck_15t" | "truck_20t" | "trailer";

const VEHICLE_PROFILES: Record<VehicleKey, VehicleProfile> = {
  bike: {
    label: "Dispatch Bike",
    fuelType: "petrol",
    kmPerLiter: 50.0,
    defaultAllowance: 80000,
    defaultLevies: 40000,
    defaultMaintenance: 25000,
    maintenancePerKm: 20.67,
    baseRateFactor: 1.0,
  },
  van_diesel: {
    label: "Van / Bus (Diesel)",
    fuelType: "diesel",
    kmPerLiter: 6.67,
    defaultAllowance: 60000,
    defaultLevies: 60000,
    defaultMaintenance: 50000,
    maintenancePerKm: 40.33,
    baseRateFactor: 1.2,
  },
  van_petrol: {
    label: "Van / Bus (Petrol)",
    fuelType: "petrol",
    kmPerLiter: 4.0,
    defaultAllowance: 60000,
    defaultLevies: 60000,
    defaultMaintenance: 50000,
    maintenancePerKm: 40.33,
    baseRateFactor: 1.2,
  },
  truck_15t: {
    label: "Truck (15T)",
    fuelType: "diesel",
    kmPerLiter: 3.0,
    defaultAllowance: 110000,
    defaultLevies: 150000,
    defaultMaintenance: 115000,
    maintenancePerKm: 86.67,
    baseRateFactor: 1.4,
  },
  truck_20t: {
    label: "Truck (20T)",
    fuelType: "diesel",
    kmPerLiter: 2.78,
    defaultAllowance: 120000,
    defaultLevies: 170000,
    defaultMaintenance: 130000,
    maintenancePerKm: 90.67,
    baseRateFactor: 1.5,
  },
  trailer: {
    label: "Trailer (30T)",
    fuelType: "diesel",
    kmPerLiter: 2.22,
    defaultAllowance: 160000,
    defaultLevies: 250000,
    defaultMaintenance: 200000,
    maintenancePerKm: 142.33,
    baseRateFactor: 1.7,
  },
};

const SENSITIVITY_MARGINS = [5, 10, 15, 20, 25];

const DynamicPricingEngine = () => {
  const { toast } = useToast();
  const { userRole, user, organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [vehicleType, setVehicleType] = useState<VehicleKey>("truck_20t");
  const [routeDistance, setRouteDistance] = useState<number>(100);
  const [stopCount, setStopCount] = useState<number>(1);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>("");

  const profile = VEHICLE_PROFILES[vehicleType] ?? VEHICLE_PROFILES.truck_20t;

  const [dieselRate, setDieselRate] = useState(1900);
  const [petrolRate, setPetrolRate] = useState(1150);
  const [driverAllowance, setDriverAllowance] = useState(profile.defaultAllowance);
  const [roadLevies, setRoadLevies] = useState(profile.defaultLevies);
  const [maintenanceFund, setMaintenanceFund] = useState(profile.defaultMaintenance);
  const [targetMarginPct, setTargetMarginPct] = useState(20);
  const [minMultiplier, setMinMultiplier] = useState(0.9);
  const [maxMultiplier, setMaxMultiplier] = useState(1.5);
  const [hydrated, setHydrated] = useState(false);
  const [maintenanceOverridden, setMaintenanceOverridden] = useState(false);

  // Auto-calc maintenance fund from per-km rate × route distance, unless user has overridden it.
  useEffect(() => {
    if (maintenanceOverridden) return;
    const p = VEHICLE_PROFILES[vehicleType] ?? VEHICLE_PROFILES.truck_20t;
    setMaintenanceFund(computeMaintenanceFund(p.maintenancePerKm, routeDistance));
  }, [vehicleType, routeDistance, maintenanceOverridden]);

  // Persist override choice per-dispatch (or "manual" when none selected) so it survives refresh / dispatch switch.
  const overrideScope = selectedDispatchId || "manual";
  useEffect(() => {
    const saved = loadMaintenanceOverride(overrideScope);
    if (saved && saved.overridden) {
      setMaintenanceOverridden(true);
      setMaintenanceFund(saved.value);
    } else {
      setMaintenanceOverridden(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overrideScope]);

  const isAdmin = userRole === "admin" || userRole === "super_admin" || userRole === "org_admin" || userRole === "finance_manager";
  const canSetBounds = isAdmin;

  // Per-org saved pricing settings
  const { data: orgSettings } = useQuery({
    queryKey: ["org-pricing-settings", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("org_pricing_settings" as any)
        .select("*")
        .eq("organization_id", organizationId)
        .maybeSingle();
      return data as any;
    },
  });

  // Hydrate state from saved settings (once)
  useEffect(() => {
    if (!orgSettings || hydrated) return;
    setDieselRate(Number(orgSettings.diesel_rate ?? 1900));
    setPetrolRate(Number(orgSettings.petrol_rate ?? 1150));
    setTargetMarginPct(Number(orgSettings.target_margin_pct ?? 20));
    setMinMultiplier(Number(orgSettings.min_multiplier ?? 0.9));
    setMaxMultiplier(Number(orgSettings.max_multiplier ?? 1.5));
    if (orgSettings.default_vehicle && VEHICLE_PROFILES[orgSettings.default_vehicle as VehicleKey]) {
      setVehicleType(orgSettings.default_vehicle as VehicleKey);
    }
    if (orgSettings.default_driver_allowance != null) setDriverAllowance(Number(orgSettings.default_driver_allowance));
    if (orgSettings.default_levies != null) setRoadLevies(Number(orgSettings.default_levies));
    if (orgSettings.default_maintenance != null) {
      setMaintenanceFund(Number(orgSettings.default_maintenance));
      setMaintenanceOverridden(true);
    }
    setHydrated(true);
  }, [orgSettings, hydrated]);

  // Reset cost defaults when vehicle changes (after hydration so we don't stomp saved values on first render)
  useEffect(() => {
    if (!hydrated && orgSettings) return;
    const p = VEHICLE_PROFILES[vehicleType] ?? VEHICLE_PROFILES.truck_20t;
    setDriverAllowance(p.defaultAllowance);
    setRoadLevies(p.defaultLevies);
    // Maintenance is auto-derived from per-km × distance - clear any prior override on vehicle switch.
    setMaintenanceOverridden(false);
  }, [vehicleType]);

  // Recent dispatches — strictly scoped to the current tenant. No org → no rows
  // (prevents legacy/seed dispatches with NULL organization_id from leaking into new tenants).
  const { data: recentDispatches } = useQuery({
    queryKey: ["pricing-recent-dispatches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("dispatches")
        .select("id, dispatch_number, pickup_address, delivery_address, distance_km, total_distance_km, total_drops, created_at")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(25);
      return data || [];
    },
  });

  const selectedDispatch = recentDispatches?.find(d => d.id === selectedDispatchId);

  useEffect(() => {
    if (!selectedDispatch) return;
    const dist = Number(selectedDispatch.total_distance_km || selectedDispatch.distance_km || 0);
    if (dist > 0) setRouteDistance(dist);
    if (selectedDispatch.total_drops) setStopCount(Number(selectedDispatch.total_drops));
  }, [selectedDispatchId]);

  const calculateBreakdown = () => {
    const p = profile;
    const fuelRate = p.fuelType === "diesel" ? dieselRate : petrolRate;
    const litresFilled = routeDistance / p.kmPerLiter;
    const fuelCost = Math.round(litresFilled * fuelRate);
    const operatingCost = Math.round(fuelCost + driverAllowance + roadLevies + maintenanceFund);
    const marginAmount = Math.round(operatingCost * (targetMarginPct / (100 - targetMarginPct)));
    const totalFreightRate = operatingCost + marginAmount;
    const actualMarginPct = totalFreightRate > 0 ? (marginAmount / totalFreightRate) * 100 : 0;
    const costPerKm = routeDistance > 0 ? totalFreightRate / routeDistance : 0;

    const walkawayRate = operatingCost;
    const floorRate = Math.round(operatingCost * 1.08);
    const targetRate = totalFreightRate;
    const ceilingRate = Math.round(operatingCost * (1 + (targetMarginPct * 1.5 / 100)));

    return {
      p, fuelRate, litresFilled, fuelCost,
      driverAllowance, roadLevies, maintenanceFund,
      operatingCost, marginAmount, totalFreightRate,
      actualMarginPct, costPerKm,
      walkawayRate, floorRate, targetRate, ceilingRate,
    };
  };

  const bd = calculateBreakdown();

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No active organization");
      if (minMultiplier >= maxMultiplier) throw new Error("Min multiplier must be less than max");
      const payload = {
        organization_id: organizationId,
        diesel_rate: dieselRate,
        petrol_rate: petrolRate,
        default_vehicle: vehicleType,
        default_driver_allowance: driverAllowance,
        default_levies: roadLevies,
        default_maintenance: maintenanceFund,
        target_margin_pct: targetMarginPct,
        min_multiplier: minMultiplier,
        max_multiplier: maxMultiplier,
        updated_by: user?.id ?? null,
      };
      const { error } = await supabase
        .from("org_pricing_settings" as any)
        .upsert(payload, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Saved", description: "Pricing settings saved for your organization." });
      queryClient.invalidateQueries({ queryKey: ["org-pricing-settings", organizationId] });
    },
    onError: (e: any) => {
      toast({ title: "Save failed", description: e?.message ?? "Could not save settings", variant: "destructive" });
    },
  });

  const fuelLabel = profile.fuelType === "diesel" ? "Total Diesel Cost" : "Total Petrol Cost";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            Freight Cost Calculator
          </h3>
          <p className="text-sm text-muted-foreground">
            Compute trip-level operating cost, margin and negotiation range.
          </p>
        </div>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Freight Cost Calculator</CardTitle>
          <CardDescription className="text-xs">
            Adjust all inputs to calculate your freight rate and negotiation range for any route.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source dispatch */}
          <div className="space-y-2">
            <Label>Source dispatch (optional)</Label>
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={selectedDispatchId}
              onChange={(e) => setSelectedDispatchId(e.target.value)}
            >
              <option value="">- Manual entry -</option>
              {(recentDispatches || []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.dispatch_number} · {(d.pickup_address || "").slice(0, 18)} → {(d.delivery_address || "").slice(0, 18)}
                </option>
              ))}
            </select>
          </div>

          {/* Row 1 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Vehicle type</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleKey)}
              >
                {Object.entries(VEHICLE_PROFILES).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">
                {profile.kmPerLiter} km/L · {profile.fuelType}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Route distance (km)</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={routeDistance}
                onChange={(e) => {
                  setSelectedDispatchId("");
                  setRouteDistance(toFiniteNumber(e.target.value));
                }}
                min={1}
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>Stops</Label>
              <Input
                type="number"
                value={stopCount}
                onChange={(e) => setStopCount(Math.max(1, Math.round(toFiniteNumber(e.target.value, 1))))}
                min={1}
              />
            </div>
          </div>

          {/* Row 2: fuel rates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Diesel rate (₦/litre)</Label>
              <Input
                type="number"
                value={dieselRate}
                onChange={(e) => setDieselRate(Math.max(100, Number(e.target.value) || 1900))}
                min={100}
              />
              <p className="text-[10px] text-muted-foreground">Current pump price - update when NNPC adjusts</p>
            </div>
            <div className="space-y-2">
              <Label>Petrol rate (₦/litre)</Label>
              <Input
                type="number"
                value={petrolRate}
                onChange={(e) => setPetrolRate(Math.max(100, Number(e.target.value) || 1150))}
                min={100}
              />
              <p className="text-[10px] text-muted-foreground">Used for bikes and petrol vans</p>
            </div>
          </div>

          {/* Row 3: editable cost components */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Driver / crew allowance (₦)</Label>
              <Input type="number" value={driverAllowance}
                onChange={(e) => setDriverAllowance(toFiniteNumber(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <Label>Road levies / tolls (₦)</Label>
              <Input type="number" value={roadLevies}
                onChange={(e) => setRoadLevies(toFiniteNumber(e.target.value))} min={0} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Maintenance fund (₦)</Label>
                <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                  ₦{profile.maintenancePerKm.toFixed(2)}/km × {toFiniteNumber(routeDistance).toLocaleString()} km
                  {maintenanceOverridden && (
                    <>
                      <Badge variant="outline" className="ml-1 h-4 px-1 text-[9px] gap-0.5">
                        <Pencil className="w-2.5 h-2.5" /> Override
                      </Badge>
                      <button
                        type="button"
                        className="ml-1 underline hover:text-foreground"
                        onClick={() => {
                          setMaintenanceOverridden(false);
                          saveMaintenanceOverride(overrideScope, { value: 0, overridden: false });
                        }}
                      >
                        reset
                      </button>
                    </>
                  )}
                </span>
              </div>
              <Input
                type="number"
                inputMode="decimal"
                value={maintenanceFund}
                onChange={(e) => {
                  const v = toFiniteNumber(e.target.value);
                  setMaintenanceFund(v);
                  setMaintenanceOverridden(true);
                  saveMaintenanceOverride(overrideScope, { value: v, overridden: true });
                }}
                min={0}
              />
            </div>
          </div>

          {/* Row 4: margin slider */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label>Target profit margin: {targetMarginPct}%</Label>
              <span className="text-xs text-muted-foreground">Markup on operating cost</span>
            </div>
            <Slider
              value={[targetMarginPct]}
              min={5}
              max={60}
              step={1}
              onValueChange={(v) => setTargetMarginPct(v[0])}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>5% minimum</span>
              <span>20% recommended</span>
              <span>60% maximum</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key metrics strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Fuel volume</p>
          <p className="text-2xl font-bold">{bd.litresFilled.toFixed(1)} L</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Fuel cost</p>
          <p className="text-2xl font-bold">₦{bd.fuelCost.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Operating cost</p>
          <p className="text-2xl font-bold">₦{bd.operatingCost.toLocaleString()}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className="text-2xl font-bold">{bd.actualMarginPct.toFixed(1)}%</p>
        </CardContent></Card>
      </div>

      {/* Cost breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cost Breakdown</CardTitle>
          <CardDescription>Trip-level breakdown built from your inputs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cost component</TableHead>
                <TableHead>Calculation detail</TableHead>
                <TableHead className="text-right">Amount (₦)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">{fuelLabel}</TableCell>
                <TableCell className="text-muted-foreground">{bd.litresFilled.toFixed(1)} L × ₦{bd.fuelRate.toLocaleString()}/L</TableCell>
                <TableCell className="text-right">{bd.fuelCost.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Driver / crew allowance</TableCell>
                <TableCell className="text-muted-foreground">Trip allowance</TableCell>
                <TableCell className="text-right">{driverAllowance.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Road levies / tolls</TableCell>
                <TableCell className="text-muted-foreground">Tolls, checkpoints, permits</TableCell>
                <TableCell className="text-right">{roadLevies.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">
                  Maintenance fund
                  {maintenanceOverridden && (
                    <Badge variant="outline" className="ml-2 h-4 px-1 text-[9px] gap-0.5">
                      <Pencil className="w-2.5 h-2.5" /> Override
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {maintenanceOverridden
                    ? `Manual override (auto-calc would be ₦${computeMaintenanceFund(profile.maintenancePerKm, routeDistance).toLocaleString()})`
                    : `₦${profile.maintenancePerKm.toFixed(2)}/km × ${toFiniteNumber(routeDistance).toLocaleString()} km`}
                </TableCell>
                <TableCell className="text-right">{maintenanceFund.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow className="bg-secondary/50">
                <TableCell className="font-semibold">Subtotal operating cost</TableCell>
                <TableCell className="text-muted-foreground">Direct trip expenses</TableCell>
                <TableCell className="text-right font-semibold">{bd.operatingCost.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Profit margin</TableCell>
                <TableCell className="text-muted-foreground">{targetMarginPct}% markup</TableCell>
                <TableCell className="text-right">{bd.marginAmount.toLocaleString()}</TableCell>
              </TableRow>
              <TableRow className="border-t-2">
                <TableCell className="font-semibold text-lg">Total Freight Rate</TableCell>
                <TableCell className="text-muted-foreground">Final invoice target</TableCell>
                <TableCell className="text-right font-semibold text-lg">{bd.totalFreightRate.toLocaleString()}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Negotiation range */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Negotiation Range
          </CardTitle>
          <CardDescription>Use these benchmarks in client rate discussions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { label: "Walk-away rate (break-even)", value: bd.walkawayRate, color: "text-destructive", note: "Do not accept below this" },
              { label: "Floor rate (8% minimum margin)", value: bd.floorRate, color: "text-warning", note: "Absolute lowest quote" },
              { label: `Target rate (${targetMarginPct}% margin)`, value: bd.targetRate, color: "text-success", note: "Your standard quote" },
              { label: `Ceiling rate (${(targetMarginPct * 1.5).toFixed(0)}% premium)`, value: bd.ceilingRate, color: "text-primary", note: "For urgent/difficult routes" },
              { label: "Cost per km", value: null as number | null, perKm: bd.costPerKm, color: "text-muted-foreground", note: "Rate per kilometre at target" },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-md bg-muted/40">
                <div>
                  <p className={`text-sm font-medium ${row.color}`}>{row.label}</p>
                  <p className="text-xs text-muted-foreground">{row.note}</p>
                </div>
                <div className={`text-lg font-bold ${row.color}`}>
                  {(row as any).perKm
                    ? `₦${Math.round((row as any).perKm).toLocaleString()}/km`
                    : `₦${Math.round(row.value!).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Margin sensitivity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Margin Sensitivity</CardTitle>
          <CardDescription>Total freight rate at different margin targets</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {SENSITIVITY_MARGINS.map(m => {
              const mc = Math.round(bd.operatingCost * (m / (100 - m)));
              const tc = bd.operatingCost + mc;
              const isActive = m === targetMarginPct;
              return (
                <div
                  key={m}
                  className={`p-3 rounded-md border ${isActive ? "border-success border-2 bg-success/5" : "border-border"}`}
                >
                  <p className="text-xs text-muted-foreground">{m}% margin</p>
                  <p className="text-lg font-bold">₦{tc.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">+₦{mc.toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Admin bounds + save */}
      {canSetBounds && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Pricing Bounds & Save (Admin)
            </CardTitle>
            <CardDescription>
              Set negotiation multipliers and persist all inputs above as your organization's defaults.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Multiplier: {minMultiplier.toFixed(2)}x</Label>
                <Slider
                  value={[minMultiplier]}
                  min={0.5}
                  max={1.0}
                  step={0.05}
                  onValueChange={(v) => setMinMultiplier(v[0])}
                />
              </div>
              <div className="space-y-2">
                <Label>Max Multiplier: {maxMultiplier.toFixed(2)}x</Label>
                <Slider
                  value={[maxMultiplier]}
                  min={1.0}
                  max={2.0}
                  step={0.05}
                  onValueChange={(v) => setMaxMultiplier(v[0])}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Saves to your organization only - other tenants are not affected.
              </p>
              <Button
                size="sm"
                onClick={() => saveSettingsMutation.mutate()}
                disabled={saveSettingsMutation.isPending || !organizationId}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveSettingsMutation.isPending ? "Saving…" : "Save settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DynamicPricingEngine;
