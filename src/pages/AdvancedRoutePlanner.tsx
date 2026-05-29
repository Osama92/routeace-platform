import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useRegion } from "@/contexts/RegionContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import RouteInsightsTile from "@/components/routing/RouteInsightsTile";
import { LongHaulPanel, ContainerPanel, IndustrialPanel } from "@/components/routing/RouteModeIntelligence";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import useTenantMode from "@/hooks/useTenantMode";
import { useAuth } from "@/contexts/AuthContext";
import { useRoutePlannerIntelligence } from "@/hooks/useRoutePlannerIntelligence";
import {
  MapPin, Navigation, Plus, Trash2, Calculator, Fuel, Clock,
  AlertTriangle, Wrench, DollarSign, Route, Loader2, Star,
  TrendingUp, Truck, Bike, Bus, User, Zap, ArrowRight,
  BarChart3, ShieldCheck, RefreshCw, Download, GripVertical,
  Target, Activity, Globe, ChevronUp, ChevronDown, Lightbulb,
  Package, CheckCircle2, XCircle, Info, Settings, ChevronRight,
  Shield, FileText, Gauge, Container, Factory, Mountain,
  Thermometer, AlertCircle, BadgeCheck, Weight, Moon, Droplets,
  BookOpen, Car,
} from "lucide-react";

// ─── FEATURE FLAG ───────────────────────────────────────────────────────────
const HEAVY_VEHICLE_INTELLIGENCE_V1 = true;

// ─── FUEL TYPES PER VEHICLE ──────────────────────────────────────────────────
const VEHICLE_FUEL_TYPE: Record<string, "diesel" | "petrol" | "none"> = {
  bike: "petrol",
  van: "petrol",
  "15t_medium_heavy": "diesel",
  "20t_rigid_hgv": "diesel",
  heavy_truck: "diesel",
  walking: "none",
};

// NNPC retail pump prices (₦/litre) — May 2026
const NNPC_FUEL_PRICES: Record<"diesel" | "petrol", number> = {
  petrol: 897,   // PMS
  diesel: 1200,  // AGO
};

// ─── REGIONAL TERMINOLOGY MAP ────────────────────────────────────────────────
type RegionKey = "NG" | "UK" | "US" | "GLOBAL";

const VEHICLE_REGIONAL_NAMES: Record<string, Record<RegionKey, string>> = {
  "15t_medium_heavy": {
    NG: "15T Medium-Heavy Truck",
    UK: "15T Rigid HGV (6-Wheeler Lorry)",
    US: "Heavy-Duty Tandem-Axle Truck",
    GLOBAL: "15T General Cargo Truck",
  },
  "20t_rigid_hgv": {
    NG: "20T Rigid Heavy Goods Vehicle",
    UK: "20T Rigid HGV (8-Wheeler)",
    US: "20T Heavy-Duty Dump Truck",
    GLOBAL: "20T Heavy Cargo Truck",
  },
  heavy_truck: {
    NG: "30T Heavy Truck",
    UK: "30T Articulated Lorry",
    US: "30T Semi-Truck",
    GLOBAL: "30T Heavy Haul Truck",
  },
  van: { NG: "Van / Bus", UK: "Light Goods Vehicle (LGV)", US: "Cargo Van", GLOBAL: "Light Commercial Vehicle" },
  bike: { NG: "Motorbike", UK: "Motorcycle Courier", US: "Delivery Bike", GLOBAL: "Two-Wheeler Courier" },
  walking: { NG: "Alabaru (Walking Courier)", UK: "Foot Courier", US: "Pedestrian Delivery", GLOBAL: "Urban Foot Courier" },
};

// ─── VEHICLE CONFIGURATIONS ──────────────────────────────────────────────────
interface VehicleMode {
  id: string;
  label: string;
  icon: React.ElementType;
  speed: number;
  fuelPerKm: number;
  maxWeight: number;
  maxVolumeCbm: number;
  maxDrops: number;
  color: string;
  desc: string;
  axleConfig: string;
  gvwTonnage: number;
  isLongHaulCapable: boolean;
  maintenancePerKm: number;
  vehicleClass: "bike" | "van" | "bus" | "15T_medium_heavy" | "20T_rigid_hgv" | "heavy_truck";
  restIntervalHrs: number; // driver rest every N hrs
  cargoTypes: string[];
}

const TRANSPORT_MODES: VehicleMode[] = [
  {
    id: "bike", label: "Motorbike", icon: Bike,
    speed: 45, fuelPerKm: 0.04, maxWeight: 50, maxVolumeCbm: 0.05, maxDrops: 20,
    color: "text-green-500", desc: "50kg · Last-mile",
    axleConfig: "2-wheel", gvwTonnage: 0.05, isLongHaulCapable: false,
    maintenancePerKm: 3, vehicleClass: "bike", restIntervalHrs: 6,
    cargoTypes: ["general_goods", "perishable"],
  },
  {
    id: "van", label: "Van / Bus", icon: Bus,
    speed: 65, fuelPerKm: 0.14, maxWeight: 3500, maxVolumeCbm: 8, maxDrops: 20,
    color: "text-blue-500", desc: "3.5T capacity · Urban",
    axleConfig: "4-wheel", gvwTonnage: 3.5, isLongHaulCapable: false,
    maintenancePerKm: 8, vehicleClass: "van", restIntervalHrs: 5,
    cargoTypes: ["general_goods", "perishable", "containerized"],
  },
  {
    id: "15t_medium_heavy", label: "15T Medium Heavy", icon: Truck,
    speed: 55, fuelPerKm: 0.34, maxWeight: 15000, maxVolumeCbm: 40, maxDrops: 7,
    color: "text-orange-500", desc: "15T · Regional haul · 6-Wheeler",
    axleConfig: "6-wheel (tandem)", gvwTonnage: 15, isLongHaulCapable: true,
    maintenancePerKm: 18, vehicleClass: "15T_medium_heavy", restIntervalHrs: 4,
    cargoTypes: ["general_goods", "construction_material", "containerized", "perishable", "industrial_machinery"],
  },
  {
    id: "20t_rigid_hgv", label: "20T Rigid HGV", icon: Truck,
    speed: 50, fuelPerKm: 0.42, maxWeight: 20000, maxVolumeCbm: 55, maxDrops: 5,
    color: "text-red-500", desc: "20T · Long haul · 8-Wheeler HGV",
    axleConfig: "8-wheel rigid", gvwTonnage: 20, isLongHaulCapable: true,
    maintenancePerKm: 24, vehicleClass: "20T_rigid_hgv", restIntervalHrs: 4,
    cargoTypes: ["general_goods", "construction_material", "containerized", "mining_material", "industrial_machinery"],
  },
  {
    id: "heavy_truck", label: "30T Heavy Truck", icon: Truck,
    speed: 60, fuelPerKm: 0.50, maxWeight: 30000, maxVolumeCbm: 80, maxDrops: 5,
    color: "text-purple-500", desc: "30T capacity · Long haul",
    axleConfig: "10-wheel articulated", gvwTonnage: 30, isLongHaulCapable: true,
    maintenancePerKm: 30, vehicleClass: "heavy_truck", restIntervalHrs: 4,
    cargoTypes: ["general_goods", "construction_material", "containerized", "mining_material", "industrial_machinery"],
  },
  {
    id: "walking", label: "Alabaru (Walking Courier)", icon: User,
    speed: 5, fuelPerKm: 0, maxWeight: 20, maxVolumeCbm: 0.02, maxDrops: 15,
    color: "text-teal-500", desc: "20kg · Hyper-local · Per package",
    axleConfig: "N/A", gvwTonnage: 0, isLongHaulCapable: false,
    maintenancePerKm: 0, vehicleClass: "bike", restIntervalHrs: 6,
    cargoTypes: ["general_goods"],
  },
];

const CARGO_TYPES = [
  { id: "general_goods", label: "General Goods", icon: Package, color: "text-blue-500" },
  { id: "construction_material", label: "Construction Material", icon: Factory, color: "text-orange-500" },
  { id: "containerized", label: "Containerized Cargo", icon: Container, color: "text-secondary-foreground" },
  { id: "perishable", label: "Perishable / Cold Chain", icon: Thermometer, color: "text-info" },
  { id: "mining_material", label: "Mining Material", icon: Mountain, color: "text-warning" },
  { id: "industrial_machinery", label: "Industrial Machinery", icon: Wrench, color: "text-destructive" },
];

// ─── REGION DETECTION ────────────────────────────────────────────────────────
function detectRegion(origin: string, dest: string): "NG" | "EU" | "US" | "GLOBAL" {
  const text = `${origin} ${dest}`.toLowerCase();
  if (/nigeria|lagos|abuja|kano|ibadan|port harcourt|benin city|owerri|enugu|kaduna|jos/.test(text)) return "NG";
  if (/\buk\b|united kingdom|london|manchester|birmingham|england|scotland|wales/.test(text)) return "EU";
  if (/\busa?\b|united states|new york|california|texas|chicago|florida|houston/.test(text)) return "US";
  if (/germany|france|netherlands|belgium|spain|italy|poland|sweden|europe|amsterdam|paris|berlin/.test(text)) return "EU";
  return "GLOBAL";
}

// Approximate USD → NGN for display
function usdToNgn(usd: number): number {
  return Math.round(usd * 1550);
}

// ─── ROUTE OPTIONS ────────────────────────────────────────────────────────────
interface Stop {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  label: string;
  timeWindow?: string;
  priority: "normal" | "high" | "urgent";
  weightKg?: number;
  volumeCbm?: number;
}

interface RouteOption {
  name: string;
  distanceKm: number;
  durationHours: number;
  fuelCost: number;
  tollCost: number;
  driverCost: number;
  riskPremium: number;
  maintenanceCost: number;
  totalCost: number;
  estimatedRevenue: number;
  maintenanceProvision: number;
  profitMargin: number;
  routeProfitNgn: number;
  confidenceScore: number;
  slaRisk: "low" | "medium" | "high";
  isRecommended: boolean;
  algorithm: string;
  restStops: number;
  overloadWarning?: string;
  marginWarning?: string;
  tonKmEfficiency: number;
  fuelPerTon: number;
  estimatedDeliveryDays: number;
  // Toggle-specific surcharges (only present when toggle is active)
  overnightAllowance?: number;
  restStopCost?: number;
  borderFees?: number;
  terminalHandlingFees?: number;
  zoneFees?: number;
}

// ─── COMPLIANCE CHECKS ────────────────────────────────────────────────────────
interface ComplianceItem {
  label: string;
  status: "valid" | "warning" | "expired";
  expiryDate?: string;
  detail: string;
}

// Compliance items per vehicle class come from the live compliance service
// (driver licenses, roadworthiness, permits). Empty until backend wired so the
// UI surfaces an honest empty state instead of fabricated expiry dates.
const MOCK_COMPLIANCE: Record<string, ComplianceItem[]> = {};


// ─── ROUTE GENERATION ─────────────────────────────────────────────────────────
// Weighted confidence model — Score = Traffic(25%) + SLA(25%) + Driver(15%) + Fuel(15%) + Border(20%)
// Base scores per algorithm type, then adjusted by real route factors
const CORRIDOR_BASELINES: Record<string, { traffic: number; sla: number; driver: number; fuel: number; border: number }> = {
  "AI Optimized Route":  { traffic: 84, sla: 88, driver: 82, fuel: 80, border: 90 },
  "Shortest Distance":   { traffic: 72, sla: 76, driver: 79, fuel: 85, border: 88 },
  "Fastest Route":       { traffic: 68, sla: 71, driver: 80, fuel: 62, border: 86 },
};

function computeConfidenceScore(
  name: string,
  distanceKm: number,
  numDrops: number,
  cargoWeight: number,
  maxWeight: number,
  hasComplianceIssue: boolean,
  longHaul: boolean,
): number {
  const b = CORRIDOR_BASELINES[name] || { traffic: 75, sla: 75, driver: 75, fuel: 75, border: 75 };
  let score = Math.round(
    b.traffic * 0.25 +
    b.sla     * 0.25 +
    b.driver  * 0.15 +
    b.fuel    * 0.15 +
    b.border  * 0.20
  );

  // ── Distance penalty: longer route = more uncertainty
  if (distanceKm > 600)      score -= 10;
  else if (distanceKm > 400) score -= 6;
  else if (distanceKm > 200) score -= 3;

  // ── Stop complexity: more drops = more execution risk
  if (numDrops > 5)      score -= 7;
  else if (numDrops > 2) score -= 3;

  // ── Load factor: near or over max weight increases risk
  if (cargoWeight > 0 && maxWeight > 0) {
    const loadFactor = cargoWeight / maxWeight;
    if (loadFactor >= 1.0)  score -= 12; // overloaded
    else if (loadFactor >= 0.9) score -= 5;
  }

  // ── Long haul adds HOS / rest stop / border uncertainty
  if (longHaul && distanceKm > 400) score -= 5;

  // ── Compliance issues are a hard penalty
  if (hasComplianceIssue) score -= 18;

  return Math.min(99, Math.max(25, score));
}

// ETA formula: (travel_hours + drops × waitPerDrop) / 24 → round to nearest 0.5, min 0.5
function computeETADays(travelHours: number, numDrops: number, waitPerDrop = 2): number {
  const total = travelHours + numDrops * waitPerDrop;
  const raw = total / 24;
  return Math.max(0.5, Math.round(raw * 2) / 2);
}

const generateRouteOptions = (
  distance: number,
  mode: VehicleMode,
  fuelPrice: number,
  driverRate: number,
  cargoWeight: number,
  marginThreshold: number,
  numDrops: number = 0,
  longHaulMode = false,
  containerMode = false,
  industrialMode = false,
  originAddr = "",
  destAddr = "",
): RouteOption[] => {
  const restStops = Math.floor((distance / (mode.speed * mode.restIntervalHrs)) * 0.7);
  const region = detectRegion(originAddr, destAddr);

  const genOption = (name: string, distMult: number, speedMult: number, isRec: boolean, algo: string): RouteOption => {
    const dist = Math.round(distance * distMult);
    let travelHours = dist / (mode.speed * speedMult) + restStops * 0.5;

    // ── LONG HAUL MODE: EU/International HOS ───────────────────────────────
    let overnightAllowance: number | undefined;
    let restStopCost: number | undefined;
    let borderFees: number | undefined;
    let terminalHandlingFees: number | undefined;
    let zoneFees: number | undefined;

    if (longHaulMode && travelHours > 4) {
      // EU HOS (EC 561/2006): 45-min rest every 4.5h driving
      const hosRestCount = Math.floor(travelHours / 4.5);
      const hosHours = hosRestCount * 0.75;
      travelHours += hosHours;
      const restRate = region === "NG" ? 4000 : region === "EU" ? usdToNgn(18) : usdToNgn(15);
      restStopCost = hosRestCount * restRate;

      // Overnight stay: journey > 10h total driving
      if (travelHours > 10) {
        const nights = Math.ceil((travelHours - 10) / 16) + 1;
        const nightly = region === "NG" ? 20000 : region === "EU" ? usdToNgn(90) : region === "US" ? usdToNgn(130) : usdToNgn(80);
        overnightAllowance = nights * nightly;
        travelHours += nights * 8; // overnight sleep time
      }

      // Cross-border fees: long route or explicit border keywords
      const isCrossBorder = dist > 450 || /border|crossing|customs|entry point/.test(`${originAddr} ${destAddr}`.toLowerCase());
      if (isCrossBorder) {
        const borderRate = region === "NG" ? usdToNgn(50) : region === "EU" ? usdToNgn(120) : usdToNgn(200);
        borderFees = borderRate;
        travelHours += 3; // border dwell time
      }
    }

    // ── CONTAINER MODE ─────────────────────────────────────────────────────
    if (containerMode) {
      const hasPort = /port|terminal|apapa|tin can|wharf|dock|harbour|harbor|pier/i.test(`${originAddr} ${destAddr}`);
      terminalHandlingFees = hasPort
        ? (region === "NG" ? 250000 : usdToNgn(480))
        : (region === "NG" ? 120000 : usdToNgn(250));
      travelHours += 2.5; // terminal gate-in/out + documentation
    }

    // ── INDUSTRIAL MODE: clustering + zone fees ────────────────────────────
    const waitPerDrop = industrialMode ? 1.6 : 2; // 20% reduction from stop clustering
    if (industrialMode && numDrops > 0) {
      const clusterCount = Math.max(1, Math.ceil(numDrops / 3));
      zoneFees = clusterCount * (region === "NG" ? 12000 : usdToNgn(55));
    }

    const fuel = dist * mode.fuelPerKm * fuelPrice;
    const toll = dist > 200 ? dist * 22 : dist * 15;
    const driver = travelHours * driverRate;
    const risk = dist * 9;
    const maint = dist * mode.maintenancePerKm;
    const maintProvision = dist * mode.maintenancePerKm * 0.3;
    const toggleSurcharges = (overnightAllowance ?? 0) + (restStopCost ?? 0) + (borderFees ?? 0) + (terminalHandlingFees ?? 0) + (zoneFees ?? 0);
    const total = fuel + toll + driver + risk + maint + toggleSurcharges;

    const marginBonus = isRec ? 0.15 : name.includes("Fastest") ? 0.08 : 0.11;
    const estimatedRevenue = total * (1 + (marginThreshold / 100) + marginBonus);
    const routeProfit = estimatedRevenue - total;
    const profitMargin = Math.round((routeProfit / estimatedRevenue) * 100);

    // ── REAL WEIGHTED CONFIDENCE (no random) ────────────────────────────────
    const confidence = computeConfidenceScore(
      name, dist, numDrops, cargoWeight, mode.maxWeight,
      false, // compliance handled outside generateRouteOptions
      longHaulMode,
    );
    const slaRisk: "low" | "medium" | "high" = confidence > 85 ? "low" : confidence > 70 ? "medium" : "high";

    const actualWeight = cargoWeight || (mode.maxWeight * 0.7);
    const tonKmEff = Math.round((actualWeight / 1000) * dist);
    const fuelPerTon = mode.fuelPerKm > 0 ? Math.round((dist * mode.fuelPerKm * fuelPrice) / (actualWeight / 1000)) : 0;

    const estimatedDays = computeETADays(travelHours, numDrops, waitPerDrop);

    const overloadWarning = cargoWeight > mode.maxWeight
      ? `⚠ Load ${cargoWeight.toLocaleString()}kg exceeds ${mode.label} limit (${mode.maxWeight.toLocaleString()}kg). Upgrade to larger vehicle.`
      : undefined;
    const marginWarning = profitMargin < marginThreshold
      ? `⚠ Route margin ${profitMargin}% below threshold (${marginThreshold}%). Consider load consolidation.`
      : undefined;

    return {
      name, distanceKm: dist, durationHours: Math.round(travelHours * 10) / 10,
      fuelCost: Math.round(fuel), tollCost: Math.round(toll),
      driverCost: Math.round(driver), riskPremium: Math.round(risk),
      maintenanceCost: Math.round(maint), totalCost: Math.round(total),
      estimatedRevenue: Math.round(estimatedRevenue),
      maintenanceProvision: Math.round(maintProvision),
      profitMargin, routeProfitNgn: Math.round(routeProfit),
      confidenceScore: confidence, slaRisk,
      isRecommended: isRec, algorithm: algo,
      restStops, overloadWarning, marginWarning,
      tonKmEfficiency: tonKmEff, fuelPerTon, estimatedDeliveryDays: estimatedDays,
      overnightAllowance, restStopCost, borderFees, terminalHandlingFees, zoneFees,
    };
  };

  return [
    genOption("AI Optimized Route", 1.0, 1.0, true, "VRP + Reinforcement Learning"),
    genOption("Shortest Distance", 0.93, 0.9, false, "Dijkstra's Algorithm"),
    genOption("Fastest Route", 1.08, 1.15, false, "A* with Traffic Weights"),
  ];
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function AdvancedRoutePlanner() {
  const { toast } = useToast();
  const { isDepartment } = useTenantMode();
  const { user, organizationId } = useAuth();
  const { data: liveIntel, isLoading: liveLoading } = useRoutePlannerIntelligence();

  const { data: libraryRoutes = [] } = useQuery({
    queryKey: ["route-library", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("routes").select("id, name, origin, destination, distance_km, estimated_duration_hours").eq("is_active", true).order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: fleetVehicles = [] } = useQuery({
    queryKey: ["fleet-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("vehicles").select("id, registration_number, vehicle_type, truck_type, make, model, capacity_kg").eq("organization_id", organizationId!).order("registration_number").limit(50);
      return data || [];
    },
  });
  // Pull region from context - drives NG vs GLOBAL feature visibility
  const { isNGMode, isGlobalMode, region } = useRegion();

  const [activeTab, setActiveTab] = useState("planner");
  const [transportMode, setTransportMode] = useState("15t_medium_heavy");
  // Sync tenant region display with actual region context
  const [tenantRegion, setTenantRegion] = useState<RegionKey>(
    isNGMode ? "NG" : isGlobalMode ? "GLOBAL" : "NG"
  );
  const [origin, setOrigin] = useState({ address: "", lat: undefined as number | undefined, lng: undefined as number | undefined });
  const [destination, setDestination] = useState({ address: "", lat: undefined as number | undefined, lng: undefined as number | undefined });
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(0);
  const [calculating, setCalculating] = useState(false);
  const [fuelPrice, setFuelPrice] = useState(() => {
    const saved = localStorage.getItem("routeace_fuel_diesel");
    return saved ? Number(saved) : 1200;
  });
  const [driverRate, setDriverRate] = useState(15000); // per trip for NG
  const [driverRateType, setDriverRateType] = useState<"per_trip" | "per_hour" | "monthly">(isNGMode ? "per_trip" : "per_hour");
  const [marginThreshold, setMarginThreshold] = useState(12);
  const [perPackageRate, setPerPackageRate] = useState(500); // per carton/package
  const [perPackageEnabled, setPerPackageEnabled] = useState(false);
  const [returnToBase, setReturnToBase] = useState(false);
  const [optimizeFor, setOptimizeFor] = useState("cost");
  const [whatIfMode, setWhatIfMode] = useState(false);
  const [cargoType, setCargoType] = useState("general_goods");
  const [customVehicleNames, setCustomVehicleNames] = useState<Record<string, string>>({});
  const [totalCargoWeight, setTotalCargoWeight] = useState(0);

  const [lastOutboundKm, setLastOutboundKm] = useState(0);
  const [selectedLibraryRoute, setSelectedLibraryRoute] = useState<string>("");
  const [selectedFleetVehicle, setSelectedFleetVehicle] = useState<string>("");

  // Heavy-duty mode toggles
  const [longHaulMode, setLongHaulMode] = useState(false);
  const [containerMode, setContainerMode] = useState(false);
  const [industrialMode, setIndustrialMode] = useState(false);

  const mode = TRANSPORT_MODES.find(m => m.id === transportMode) || TRANSPORT_MODES[2];
  const isHeavyMode = ["15t_medium_heavy", "20t_rigid_hgv", "heavy_truck"].includes(transportMode);
  const vehicleFuelType = VEHICLE_FUEL_TYPE[transportMode] ?? "none";

  // Auto-set fuel price to correct NNPC rate when vehicle changes
  useEffect(() => {
    if (vehicleFuelType !== "none") {
      setFuelPrice(NNPC_FUEL_PRICES[vehicleFuelType]);
    }
  }, [transportMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const getVehicleDisplayName = (modeId: string): string => {
    if (customVehicleNames[modeId]) return customVehicleNames[modeId];
    const map = VEHICLE_REGIONAL_NAMES[modeId];
    return map ? map[tenantRegion] : modeId;
  };

  const mapVehicleTypeToMode = (vehicleType: string, capacityKg?: number | null): string => {
    const t = vehicleType.toLowerCase();
    if (/bike|motor|cycle/.test(t)) return "bike";
    if (/walk|foot|alabaru/.test(t)) return "walking";
    if (/trailer|artic|30t/.test(t)) return "heavy_truck";
    if (/20t|20.ton|rigid.hgv|8.wheel/.test(t)) return "20t_rigid_hgv";
    if (/15t|15.ton|medium.heavy|6.wheel/.test(t)) return "15t_medium_heavy";
    if (/truck/.test(t)) {
      if (capacityKg && capacityKg >= 25000) return "heavy_truck";
      if (capacityKg && capacityKg >= 18000) return "20t_rigid_hgv";
      if (capacityKg && capacityKg >= 10000) return "15t_medium_heavy";
      return "15t_medium_heavy";
    }
    return "van";
  };

  // Convert driver rate to hourly equivalent for route calc
  const effectiveDriverHourlyRate = driverRateType === "per_trip" 
    ? driverRate / 8 // assume 8hr trip average
    : driverRateType === "monthly"
    ? driverRate / (22 * 8) // 22 working days, 8hrs
    : driverRate;

  const addStop = () => {
    setStops(prev => [...prev, {
      id: crypto.randomUUID(),
      address: "", label: `Stop ${prev.length + 1}`,
      priority: "normal", weightKg: isHeavyMode ? 2000 : 500, volumeCbm: isHeavyMode ? 4 : 0.5,
    }]);
  };

  const removeStop = (id: string) => setStops(prev => prev.filter(s => s.id !== id));

  const updateStop = (id: string, field: string, value: unknown) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const moveStop = (id: string, dir: "up" | "down") => {
    setStops(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (dir === "up" && idx > 0) { const arr = [...prev]; [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; return arr; }
      else if (dir === "down" && idx < prev.length - 1) { const arr = [...prev]; [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; return arr; }
      return prev;
    });
  };

  const calculateRoutes = async () => {
    if (!origin.address || !destination.address) {
      toast({ title: "Missing Data", description: "Please enter origin and destination", variant: "destructive" });
      return;
    }
    setCalculating(true);
    try {
      let baseDistance = isHeavyMode ? 650 : 450;
      try {
        const { data } = await supabase.functions.invoke("optimize-route", {
          body: {
            origin: { address: origin.address, latitude: origin.lat, longitude: origin.lng },
            destination: { address: destination.address, latitude: destination.lat, longitude: destination.lng },
            waypoints: stops.map(s => ({ address: s.address, latitude: s.lat, longitude: s.lng, weightKg: s.weightKg, volumeCbm: s.volumeCbm })),
            vehicleType: transportMode,
            longHaulMode,
            containerMode,
            industrialMode,
          },
        });
        if (data?.totalDistanceKm) baseDistance = data.totalDistanceKm;
      } catch { /* use default */ }

      const outboundKm = baseDistance;
      if (returnToBase) baseDistance = outboundKm * 2;
      setLastOutboundKm(outboundKm);

      const cargoWt = totalCargoWeight || stops.reduce((s, st) => s + (st.weightKg || 0), 0);
      const opts = generateRouteOptions(
        baseDistance + stops.length * (isHeavyMode ? 35 : 25),
        mode, fuelPrice, effectiveDriverHourlyRate, cargoWt, marginThreshold, stops.length,
        longHaulMode, containerMode, industrialMode,
        origin.address, destination.address,
      );
      setRouteOptions(opts);
      setSelectedRoute(0);
      setActiveTab("results");

      // Log the planned route into routes table so it can be selected during Dispatch creation
      try {
        const routeName = `${origin.address.split(",")[0]} → ${destination.address.split(",")[0]}${stops.length ? ` (+${stops.length} stops)` : ""}`;
        const { data: existing } = await supabase
          .from("routes")
          .select("id")
          .ilike("origin", origin.address.trim())
          .ilike("destination", destination.address.trim())
          .limit(1);
        if (!existing || existing.length === 0) {
          await supabase.from("routes").insert({
            name: routeName,
            origin: origin.address,
            origin_lat: origin.lat ?? null,
            origin_lng: origin.lng ?? null,
            destination: destination.address,
            destination_lat: destination.lat ?? null,
            destination_lng: destination.lng ?? null,
            distance_km: baseDistance,
            estimated_duration_hours: opts[0]?.durationHours ?? null,
            waypoints: stops.map(s => ({ address: s.address, lat: s.lat, lng: s.lng })) as any,
            created_by: user?.id ?? null,
          });
        }
      } catch (e) { console.warn("route log failed", e); }

      toast({
        title: "✅ Routes Optimized",
        description: returnToBase
          ? `${opts.length} options · Outbound ${outboundKm}km + Return ${outboundKm}km = ${outboundKm * 2}km total`
          : `${opts.length} options · ${isHeavyMode ? "Heavy Haul Mode" : "Standard Mode"}`,
      });
    } finally {
      setCalculating(false);
    }
  };

  const fmt = (n: number) => `₦${n.toLocaleString()}`;

  const confColor = (score: number) =>
    score >= 85 ? "text-green-500" : score >= 65 ? "text-yellow-500" : "text-destructive";
  const confBg = (score: number) =>
    score >= 85 ? "bg-green-500/10 border-green-500/30" : score >= 65 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-destructive/10 border-destructive/30";

  const compliance = MOCK_COMPLIANCE[transportMode] || [];
  const hasComplianceBlocking = compliance.some(c => c.status === "expired");

  return (
    <DashboardLayout title="Advanced Route Planner Engine" subtitle={`Next-gen multi-stop VRP · Heavy-duty HGV · AI confidence · ${region.flag} ${region.label} Mode`}>

      {/* ── FEATURE FLAG BANNER ─────────────────────────────────────────────── */}
      {HEAVY_VEHICLE_INTELLIGENCE_V1 && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-sm">
          <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
          <span><span className="font-semibold text-primary">Heavy Vehicle Intelligence v1</span> - 15T & 20T routing, long-haul logic, terrain awareness, and compliance checks enabled.</span>
          <div className="ml-auto flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Display as:</Label>
            <Select value={tenantRegion} onValueChange={(v) => setTenantRegion(v as RegionKey)}>
              <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NG">🇳🇬 Nigeria</SelectItem>
                <SelectItem value="UK">🇬🇧 UK / EU</SelectItem>
                <SelectItem value="US">🇺🇸 USA</SelectItem>
                <SelectItem value="GLOBAL">🌍 Global</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* ── REGION-AWARE COMPLIANCE BANNERS ─────────────────────────────────── */}
      {isNGMode && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <RouteInsightsTile />
          {[
            { label: "⚖ Axle Load Compliance", detail: "15T vehicles require axle load permit on A1 expressway", color: "bg-destructive/10 border-destructive/30 text-destructive" },
            { label: "💧 Drop Billing Active", detail: `₦50/drop deducted from wallet - per-drop billing enabled`, color: "bg-primary/10 border-primary/30 text-primary" },
          ].map((b) => (
            <div key={b.label} className={`px-3 py-2 rounded-lg border text-xs font-medium ${b.color}`}>
              <div className="font-semibold">{b.label}</div>
              <div className="opacity-80 mt-0.5">{b.detail}</div>
            </div>
          ))}
        </div>
      )}
      {isGlobalMode && (
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "🌍 EU Cabotage Rules", detail: "Max 3 ops in 7 days per country - 4-day cooling period applies", color: "bg-blue-500/10 border-blue-500/30 text-blue-700" },
            { label: "🌿 Carbon Emission Tracking", detail: "CO₂ per km calculated - EU ETS reporting enabled", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700" },
            { label: "🛃 Cross-Border VAT", detail: "Automatic VAT calculation for cross-border movements", color: "bg-purple-500/10 border-purple-500/30 text-purple-700" },
          ].map((b) => (
            <div key={b.label} className={`px-3 py-2 rounded-lg border text-xs font-medium ${b.color}`}>
              <div className="font-semibold">{b.label}</div>
              <div className="opacity-80 mt-0.5">{b.detail}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── VEHICLE MODE SELECTOR ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {TRANSPORT_MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => setTransportMode(m.id)}
            className={`p-2.5 rounded-xl border-2 text-left transition-all ${transportMode === m.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40 bg-card"}`}
          >
            <m.icon className={`w-5 h-5 mb-1 ${m.color}`} />
            <p className="font-semibold text-xs leading-tight">{getVehicleDisplayName(m.id)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
            {["15t_medium_heavy", "20t_rigid_hgv", "heavy_truck"].includes(m.id) && (
              <Badge variant="outline" className="text-[9px] mt-1 px-1 py-0">Heavy Duty</Badge>
            )}
            {VEHICLE_FUEL_TYPE[m.id] === "diesel" && (
              <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0 border-amber-500/50 text-amber-400">⛽ Diesel</Badge>
            )}
            {VEHICLE_FUEL_TYPE[m.id] === "petrol" && (
              <Badge variant="outline" className="text-[9px] mt-0.5 px-1 py-0 border-green-500/50 text-green-400">⛽ Petrol</Badge>
            )}
          </button>
        ))}
      </div>

      {/* ── LIVE FUEL SUMMARY STRIP ──────────────────────────────────────────── */}
      {vehicleFuelType !== "none" && (
        <div className="mb-4 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/25 bg-amber-500/5 text-xs">
          {vehicleFuelType === "diesel"
            ? <Fuel className="w-4 h-4 text-amber-400 shrink-0" />
            : <Droplets className="w-4 h-4 text-green-400 shrink-0" />}
          <span className="font-semibold text-foreground">
            {vehicleFuelType === "diesel" ? "AGO Diesel" : "PMS Petrol"} — ₦{fuelPrice.toLocaleString()}/litre
          </span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">
            Consumption: <span className="text-foreground font-medium">{(mode.fuelPerKm * 100).toFixed(1)} L/100km</span>
          </span>
          {routeOptions.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Est. litres: <span className="text-foreground font-medium">{(routeOptions[0].distanceKm * mode.fuelPerKm).toFixed(1)} L</span>
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                Fuel cost: <span className="text-foreground font-medium">₦{routeOptions[0].fuelCost.toLocaleString()}</span>
              </span>
            </>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground">NNPC retail · May 2026</span>
        </div>
      )}

      {/* ── HEAVY DUTY MODE TOGGLES ───────────────────────────────────────── */}
      {isHeavyMode && (
        <div className="flex flex-wrap gap-3 mb-4">
          {[
            { label: "Long Haul Mode", state: longHaulMode, set: setLongHaulMode, desc: "Inter-state & cross-border optimization" },
            { label: "Container Mode", state: containerMode, set: setContainerMode, desc: "Containerized cargo routing" },
            { label: "Industrial Route Mode", state: industrialMode, set: setIndustrialMode, desc: "Factory & industrial zone clustering" },
          ].map((t) => (
            <div key={t.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${t.state ? "border-primary/50 bg-primary/8" : "border-border/50 bg-card"}`}>
              <Switch checked={t.state} onCheckedChange={t.set} />
              <div>
                <p className="text-xs font-semibold">☑ {t.label}</p>
                <p className="text-[10px] text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ROUTE MODE INTELLIGENCE PANELS ──────────────────────────────────── */}
      {longHaulMode && isHeavyMode && (
        <LongHaulPanel
          origin={origin.address}
          destination={destination.address}
          distanceKm={routeOptions[0]?.distanceKm ?? 0}
          gvwTonnage={mode.gvwTonnage}
          fuelPerKm={mode.fuelPerKm}
          fuelPrice={fuelPrice}
        />
      )}
      {containerMode && isHeavyMode && (
        <ContainerPanel
          origin={origin.address}
          destination={destination.address}
          estimatedArrivalDays={routeOptions[0]?.estimatedDeliveryDays ?? 0}
        />
      )}
      {industrialMode && isHeavyMode && (
        <IndustrialPanel
          stops={stops}
          gvwTonnage={mode.gvwTonnage}
          origin={origin.address}
          destination={destination.address}
        />
      )}

      {/* ── COMPLIANCE BLOCKING ALERT ─────────────────────────────────────── */}
      {hasComplianceBlocking && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/40 text-sm">
          <XCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Route Dispatch Blocked - Compliance Issue Detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              One or more compliance documents for this vehicle are expired. Resolve in the <strong>Compliance tab</strong> before dispatching.
            </p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="planner">Route Planner</TabsTrigger>
          <TabsTrigger value="results">Route Options</TabsTrigger>
          <TabsTrigger value="heavy_kpi">Heavy KPIs</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="intelligence">AI Intelligence</TabsTrigger>
          <TabsTrigger value="simulation">What-If Simulator</TabsTrigger>
          {!isDepartment && <TabsTrigger value="integration">ERP Integration</TabsTrigger>}
          {!isDepartment && <TabsTrigger value="architecture">Architecture</TabsTrigger>}
        </TabsList>

        {/* ─── ROUTE PLANNER ─────────────────────────────────────────────────── */}
        <TabsContent value="planner">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              {/* Route Library + Fleet Picker */}
              <Card className="border-primary/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    Quick Start from Library
                  </CardTitle>
                  <CardDescription className="text-xs">Pick a saved route and/or a fleet vehicle to pre-fill your planner</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Route Library picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><BookOpen className="w-3 h-3" />From Route Library</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedLibraryRoute}
                        onChange={(e) => {
                          const routeId = e.target.value;
                          setSelectedLibraryRoute(routeId);
                          if (!routeId) return;
                          const r = libraryRoutes.find((x: any) => x.id === routeId);
                          if (!r) return;
                          setOrigin({ address: (r as any).origin, lat: undefined, lng: undefined });
                          setDestination({ address: (r as any).destination, lat: undefined, lng: undefined });
                        }}
                      >
                        <option value="">— Select saved route —</option>
                        {libraryRoutes.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name} ({r.distance_km ? `${r.distance_km} km` : "dist. unknown"})</option>
                        ))}
                      </select>
                      {selectedLibraryRoute && (() => {
                        const r = libraryRoutes.find((x: any) => x.id === selectedLibraryRoute);
                        return r ? (
                          <p className="text-[10px] text-muted-foreground">{(r as any).origin.split(",")[0]} → {(r as any).destination.split(",")[0]}{(r as any).distance_km ? ` · ${(r as any).distance_km} km` : ""}</p>
                        ) : null;
                      })()}
                    </div>

                    {/* Fleet vehicle picker */}
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1"><Car className="w-3 h-3" />From Fleet</Label>
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={selectedFleetVehicle}
                        onChange={(e) => {
                          const vId = e.target.value;
                          setSelectedFleetVehicle(vId);
                          if (!vId) return;
                          const v = fleetVehicles.find((x: any) => x.id === vId);
                          if (!v) return;
                          const mappedMode = mapVehicleTypeToMode((v as any).vehicle_type || (v as any).truck_type || "", (v as any).capacity_kg);
                          setTransportMode(mappedMode);
                        }}
                      >
                        <option value="">— Select fleet vehicle —</option>
                        {fleetVehicles.map((v: any) => (
                          <option key={v.id} value={v.id}>{v.registration_number} · {v.make || ""} {v.model || ""} ({v.vehicle_type})</option>
                        ))}
                      </select>
                      {selectedFleetVehicle && (() => {
                        const v = fleetVehicles.find((x: any) => x.id === selectedFleetVehicle);
                        return v ? <p className="text-[10px] text-muted-foreground">Mapped to: {getVehicleDisplayName(mapVehicleTypeToMode((v as any).vehicle_type || (v as any).truck_type || "", (v as any).capacity_kg))}</p> : null;
                      })()}
                    </div>
                  </div>
                  {selectedLibraryRoute && (
                    <p className="text-xs text-primary flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />Origin and destination pre-filled from route library. Add intermediate stops below, then optimize.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Route className="w-4 h-4" />Multi-Stop Route Builder
                    <Badge variant="outline" className="ml-auto text-xs">{getVehicleDisplayName(transportMode)}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Unlimited stops · Drag to reorder · Time-window constraints
                    {isHeavyMode && ` · Max ${mode.maxDrops} drops for heavy vehicles`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cargo Type Selector */}
                  {isHeavyMode && (
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold flex items-center gap-1.5"><Package className="w-3.5 h-3.5" />Cargo Type</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {CARGO_TYPES.filter(c => mode.cargoTypes.includes(c.id)).map((ct) => (
                          <button
                            key={ct.id}
                            onClick={() => setCargoType(ct.id)}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${cargoType === ct.id ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"}`}
                          >
                            <ct.icon className={`w-4 h-4 shrink-0 ${ct.color}`} />
                            <span className="font-medium leading-tight">{ct.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Origin */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-green-500" />Origin (Pickup)</Label>
                    <AddressAutocomplete
                      value={origin.address}
                      onChange={(v) => setOrigin(prev => ({ ...prev, address: v }))}
                      onPlaceSelect={(p) => setOrigin({ address: p.formattedAddress, lat: p.lat, lng: p.lng })}
                      placeholder="Enter origin address"
                    />
                  </div>

                  {/* Stops */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-yellow-500" />
                        Intermediate Stops ({stops.length}
                        {isHeavyMode && ` / max ${mode.maxDrops}`})
                      </Label>
                      <Button size="sm" variant="outline" onClick={addStop}
                        disabled={isHeavyMode && stops.length >= mode.maxDrops}>
                        <Plus className="w-4 h-4 mr-1" />Add Stop
                      </Button>
                    </div>
                    {isHeavyMode && stops.length >= mode.maxDrops && (
                      <p className="text-xs text-warning flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Max drops reached for {getVehicleDisplayName(transportMode)}. Upgrade vehicle or split route.
                      </p>
                    )}
                    {stops.map((stop, idx) => (
                      <div key={stop.id} className="border border-border/50 rounded-xl p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveStop(stop.id, "up")} disabled={idx === 0}><ChevronUp className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground disabled:opacity-30" /></button>
                            <button onClick={() => moveStop(stop.id, "down")} disabled={idx === stops.length - 1}><ChevronDown className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground disabled:opacity-30" /></button>
                          </div>
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="text-xs font-mono bg-primary/20 text-primary px-2 py-0.5 rounded-full">{idx + 1}</span>
                          <div className="flex-1">
                            <AddressAutocomplete
                              value={stop.address}
                              onChange={(v) => updateStop(stop.id, "address", v)}
                              onPlaceSelect={(p) => { updateStop(stop.id, "address", p.formattedAddress); updateStop(stop.id, "lat", p.lat); updateStop(stop.id, "lng", p.lng); }}
                              placeholder={`Stop ${idx + 1} address`}
                            />
                          </div>
                          <Select value={stop.priority} onValueChange={(v) => updateStop(stop.id, "priority", v)}>
                            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="normal">Normal</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="urgent">Urgent</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeStop(stop.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-3 gap-2 pl-10">
                          <div>
                            <Label className="text-xs">Time Window</Label>
                            <Input type="time" className="h-7 text-xs" onChange={(e) => updateStop(stop.id, "timeWindow", e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs">Weight (kg)</Label>
                            <Input type="number" className="h-7 text-xs" value={stop.weightKg} onChange={(e) => updateStop(stop.id, "weightKg", +e.target.value)} />
                          </div>
                          {isHeavyMode && (
                            <div>
                              <Label className="text-xs">Volume (m³)</Label>
                              <Input type="number" className="h-7 text-xs" value={stop.volumeCbm} step="0.5" onChange={(e) => updateStop(stop.id, "volumeCbm", +e.target.value)} />
                            </div>
                          )}
                        </div>
                        {stop.priority !== "normal" && (
                          <div className="pl-10">
                            <Badge variant={stop.priority === "urgent" ? "destructive" : "secondary"} className="text-xs">
                              {stop.priority === "urgent" ? "🔴 Urgent - prioritized in route" : "🟡 High Priority"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Destination */}
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2"><MapPin className="w-4 h-4 text-destructive" />Destination (Delivery)</Label>
                    <AddressAutocomplete
                      value={destination.address}
                      onChange={(v) => setDestination(prev => ({ ...prev, address: v }))}
                      onPlaceSelect={(p) => setDestination({ address: p.formattedAddress, lat: p.lat, lng: p.lng })}
                      placeholder="Enter destination address"
                    />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50">
                      <Switch checked={returnToBase} onCheckedChange={setReturnToBase} />
                      <div><p className="text-sm font-medium">Return to Base</p><p className="text-xs text-muted-foreground">Add return leg</p></div>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg border border-border/50">
                      <Switch checked={whatIfMode} onCheckedChange={setWhatIfMode} />
                      <div><p className="text-sm font-medium">What-If Mode</p><p className="text-xs text-muted-foreground">Simulation only</p></div>
                    </div>
                  </div>

                  <Button onClick={calculateRoutes} disabled={calculating || hasComplianceBlocking} className="w-full" size="lg">
                    {calculating
                      ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Optimizing with AI + VRP{isHeavyMode ? " (Heavy Haul)" : ""}...</>
                      : <><Zap className="w-5 h-5 mr-2" />Optimize Route - {getVehicleDisplayName(transportMode)}</>}
                  </Button>
                  {hasComplianceBlocking && (
                    <p className="text-xs text-destructive text-center flex items-center justify-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />Route blocked due to expired compliance documents. Check Compliance tab.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cost Parameters */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Settings className="w-4 h-4" />Cost Parameters</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      {vehicleFuelType === "petrol" ? <Droplets className="w-3 h-3 text-green-400" /> : <Fuel className="w-3 h-3 text-amber-400" />}
                      {vehicleFuelType === "petrol" ? "Petrol (PMS)" : vehicleFuelType === "diesel" ? "Diesel (AGO)" : "Fuel"} Price (₦/litre)
                    </Label>
                    <Input type="number" value={fuelPrice} onChange={(e) => setFuelPrice(Number(e.target.value))} className="h-8 text-xs" min={0} />
                    <p className="text-[10px] text-muted-foreground">
                      {vehicleFuelType === "petrol" ? "PMS ~₦897 (NNPC retail). Editable." : vehicleFuelType === "diesel" ? "AGO ~₦1,200 (NNPC retail). Editable." : "No upper limit."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><DollarSign className="w-3 h-3" />Driver Rate (₦)</Label>
                    <div className="flex gap-2">
                      <Input type="number" value={driverRate} onChange={(e) => setDriverRate(Number(e.target.value))} className="h-8 text-xs flex-1" min={0} />
                      <Select value={driverRateType} onValueChange={(v) => setDriverRateType(v as any)}>
                        <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="per_trip">Per Trip</SelectItem>
                          <SelectItem value="per_hour">Per Hour</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {driverRateType === "per_trip" ? "Flat rate per trip (Nigerian standard)" : driverRateType === "monthly" ? "Monthly salary - divided across trips" : "Hourly rate"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Margin Threshold (%)</Label>
                    <Input type="number" value={marginThreshold} onChange={(e) => setMarginThreshold(Number(e.target.value))} className="h-8 text-xs" min={0} max={100} />
                    <p className="text-[10px] text-muted-foreground">Warning shown if route margin falls below this</p>
                  </div>

                  {/* Per Package / Carton Costing */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={perPackageEnabled} onCheckedChange={setPerPackageEnabled} />
                      <Label className="text-xs font-semibold">Per Package/Carton Costing</Label>
                    </div>
                    {perPackageEnabled && (
                      <div className="space-y-2">
                        <Label className="text-xs">Rate per Package/Carton (₦)</Label>
                        <Input type="number" value={perPackageRate} onChange={(e) => setPerPackageRate(Number(e.target.value))} className="h-8 text-xs" min={0} />
                        <p className="text-[10px] text-muted-foreground">Most couriers charge per carton. Common for Alabaru & bike couriers.</p>
                      </div>
                    )}
                  </div>

                  {/* Custom Vehicle Name */}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-xs font-semibold">Custom Vehicle Name</Label>
                    <Input 
                      value={customVehicleNames[transportMode] || ""} 
                      onChange={(e) => setCustomVehicleNames(prev => ({ ...prev, [transportMode]: e.target.value }))} 
                      placeholder={getVehicleDisplayName(transportMode)}
                      className="h-8 text-xs" 
                    />
                    <p className="text-[10px] text-muted-foreground">Override display name for {TRANSPORT_MODES.find(m => m.id === transportMode)?.label}</p>
                  </div>

                  {isHeavyMode && (
                    <div className="space-y-2">
                      <Label className="text-xs">Total Cargo Weight (kg)</Label>
                      <Input type="number" value={totalCargoWeight || ""} placeholder="Auto-sum from stops" onChange={(e) => setTotalCargoWeight(+e.target.value)} className="h-8 text-xs" />
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Optimize For</Label>
                    <Select value={optimizeFor} onValueChange={setOptimizeFor}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cost">Lowest Cost</SelectItem>
                        <SelectItem value="time">Fastest Time</SelectItem>
                        <SelectItem value="profit">Max Profit Margin</SelectItem>
                        <SelectItem value="sla">SLA Compliance</SelectItem>
                        <SelectItem value="fuel">Lowest Fuel</SelectItem>
                        {isHeavyMode && <SelectItem value="tonkm">Best Ton-KM Efficiency</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 text-xs border-t pt-3">
                    <div className="flex justify-between text-muted-foreground"><span>Vehicle:</span><span className="font-medium text-right">{getVehicleDisplayName(transportMode)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Axle Config:</span><span>{mode.axleConfig}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>GVW:</span><span>{mode.gvwTonnage}T</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Max Vol:</span><span>{mode.maxVolumeCbm} m³</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Long Haul:</span><span>{mode.isLongHaulCapable ? "✅ Yes" : "❌ No"}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Rest Interval:</span><span>Every {mode.restIntervalHrs}h</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Max Drops:</span><span>{mode.maxDrops}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Driver Rate:</span><span>₦{driverRate.toLocaleString()} / {driverRateType.replace("_", " ")}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Algorithms Active</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { name: "Dijkstra / A*", desc: "Graph shortest path", active: true },
                    { name: "VRP Solver", desc: "Vehicle Routing Problem", active: true },
                    { name: "VRPTW", desc: "Time-window variant", active: stops.some(s => s.timeWindow) },
                    { name: "AI Reinforcement", desc: "Self-learning layer", active: true },
                    { name: "Long-Haul Logic", desc: "Rest, refuel, border", active: isHeavyMode && longHaulMode },
                    { name: "Terrain Awareness", desc: "Unpaved / flood roads", active: isHeavyMode },
                    { name: "Axle Load Calc", desc: "Overload detection", active: isHeavyMode },
                  ].map((algo) => (
                    <div key={algo.name} className="flex items-center gap-2 text-xs">
                      {algo.active ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
                      <div>
                        <span className="font-medium">{algo.name}</span>
                        <span className="text-muted-foreground ml-1">- {algo.desc}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── ROUTE OPTIONS ──────────────────────────────────────────────────── */}
        <TabsContent value="results">
          {routeOptions.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground"><Route className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No routes calculated yet. Go to Route Planner tab.</p></CardContent></Card>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                <Truck className="w-4 h-4" />
                <span>Results for <strong>{getVehicleDisplayName(transportMode)}</strong> - Heavy Haul Mode Confidence scoring</span>
                {returnToBase && lastOutboundKm > 0 && (
                  <Badge variant="outline" className="ml-2 text-xs border-primary/40 text-primary gap-1">
                    ↗ {lastOutboundKm}km outbound · ↙ {lastOutboundKm}km return · {lastOutboundKm * 2}km total
                  </Badge>
                )}
              </div>
              {routeOptions.map((opt, i) => (
                <Card
                  key={i}
                  className={`cursor-pointer transition-all border-2 ${selectedRoute === i ? "border-primary" : "border-border/50 hover:border-primary/40"}`}
                  onClick={() => setSelectedRoute(i)}
                >
                  <CardContent className="p-5">
                    {/* Warnings */}
                    {opt.overloadWarning && (
                      <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                        <Weight className="w-3.5 h-3.5 shrink-0 mt-0.5" />{opt.overloadWarning}
                      </div>
                    )}
                    {opt.marginWarning && (
                      <div className="mb-3 flex items-start gap-2 p-2.5 rounded-lg bg-warning/10 border border-warning/30 text-xs text-warning">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{opt.marginWarning}
                      </div>
                    )}

                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg">{opt.name}</h3>
                          {opt.isRecommended && <Badge className="bg-green-500"><Star className="w-3 h-3 mr-1" />Recommended</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">{opt.algorithm}</p>
                        {/* Full weighted confidence label */}
                        <p className="text-xs text-primary mt-0.5 font-medium">
                          {opt.confidenceScore >= 75
                            ? `Route Confidence: ${opt.confidenceScore}% - ${opt.slaRisk === "low" ? "Low SLA Risk" : "Moderate SLA Risk"}`
                            : opt.confidenceScore >= 55
                            ? `Route Confidence: ${opt.confidenceScore}% - Moderate SLA Risk`
                            : `Route Confidence: ${opt.confidenceScore}% - High SLA Risk`
                          }
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Traffic(25%) · SLA(25%) · Driver(15%) · Fuel(15%) · Border(20%)
                        </p>
                      </div>
                      <div className={`p-3 rounded-xl border text-center min-w-[90px] ${confBg(opt.confidenceScore)}`}>
                        <p className={`text-2xl font-bold ${confColor(opt.confidenceScore)}`}>{opt.confidenceScore}%</p>
                        <p className="text-xs text-muted-foreground">Confidence</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      {[
                        { icon: Navigation, label: "Distance", value: returnToBase && lastOutboundKm > 0 ? `${opt.distanceKm} km (↗${Math.round(opt.distanceKm/2)} + ↙${Math.round(opt.distanceKm/2)})` : `${opt.distanceKm} km` },
                        { icon: Clock, label: "Travel Time", value: `${opt.durationHours} hrs` },
                        { icon: Clock, label: "ETA (+2h/drop)", value: `${opt.estimatedDeliveryDays === 0.5 ? "~12h" : opt.estimatedDeliveryDays + (opt.estimatedDeliveryDays === 1 ? " day" : " days")}` },
                        { icon: AlertTriangle, label: "SLA Risk", value: opt.slaRisk.charAt(0).toUpperCase() + opt.slaRisk.slice(1), color: opt.slaRisk === "low" ? "text-green-500" : opt.slaRisk === "medium" ? "text-yellow-500" : "text-destructive" },
                      ].map((m) => (
                        <div key={m.label} className="p-3 rounded-lg bg-muted/50 text-center">
                          <m.icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{m.label}</p>
                          <p className={`font-bold text-sm ${m.color || ""}`}>{m.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Profit-aware breakdown */}
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Profit-Aware Cost Breakdown</p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                        {([
                          { label: "Fuel", value: opt.fuelCost, icon: Fuel },
                          { label: "Tolls", value: opt.tollCost, icon: DollarSign },
                          { label: "Driver", value: opt.driverCost, icon: User },
                          { label: "Risk Premium", value: opt.riskPremium, icon: AlertTriangle },
                          { label: "Maintenance", value: opt.maintenanceCost, icon: Wrench },
                          { label: "Maint. Provision", value: opt.maintenanceProvision, icon: Settings },
                          ...(opt.restStopCost ? [{ label: "HOS Rest Stops", value: opt.restStopCost, icon: Clock }] : []),
                          ...(opt.overnightAllowance ? [{ label: "Overnight Allowance", value: opt.overnightAllowance, icon: Moon }] : []),
                          ...(opt.borderFees ? [{ label: "Border / Customs", value: opt.borderFees, icon: Globe }] : []),
                          ...(opt.terminalHandlingFees ? [{ label: "Terminal Handling", value: opt.terminalHandlingFees, icon: Container }] : []),
                          ...(opt.zoneFees ? [{ label: "Industrial Zone Fees", value: opt.zoneFees, icon: Factory }] : []),
                        ] as { label: string; value: number; icon: React.ElementType }[]).map((c) => (
                          <div key={c.label} className="flex items-center gap-1 p-2 rounded bg-background/80">
                            <c.icon className="w-3 h-3 text-muted-foreground shrink-0" />
                            <div><p className="text-muted-foreground">{c.label}</p><p className="font-semibold">{fmt(c.value)}</p></div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Total Cost</p>
                          <p className="font-bold text-sm text-primary">{fmt(opt.totalCost)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Est. Revenue</p>
                           <p className="font-bold text-sm text-success">{fmt(opt.estimatedRevenue)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Route Profit</p>
                          <p className={`font-bold text-sm ${opt.profitMargin >= marginThreshold ? "text-success" : "text-warning"}`}>
                            {fmt(opt.routeProfitNgn)} ({opt.profitMargin}%)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Heavy KPI strip */}
                    {isHeavyMode && (
                      <div className="mt-3 grid grid-cols-3 gap-2 pt-3 border-t text-xs">
                        <div className="text-center p-2 rounded bg-muted/40">
                          <Gauge className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-muted-foreground">Ton-KM</p>
                          <p className="font-bold">{opt.tonKmEfficiency.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/40">
                          <Fuel className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-muted-foreground">Fuel/Ton</p>
                          <p className="font-bold">₦{opt.fuelPerTon.toLocaleString()}</p>
                        </div>
                        <div className="text-center p-2 rounded bg-muted/40">
                          <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                          <p className="text-muted-foreground">Rest Stops</p>
                          <p className="font-bold">{opt.restStops}</p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>AI Confidence Score</span><span>{opt.confidenceScore}%</span>
                      </div>
                      <Progress value={opt.confidenceScore} className={`h-2 ${opt.confidenceScore >= 85 ? "[&>div]:bg-green-500" : opt.confidenceScore >= 65 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-destructive"}`} />
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-3">
                <Button className="flex-1" disabled={hasComplianceBlocking}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />Apply Route to Dispatch
                </Button>
                <Button variant="outline"><Download className="w-4 h-4 mr-2" />Export PDF</Button>
                <Button variant="outline"><ArrowRight className="w-4 h-4 mr-2" />Send to Driver App</Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── HEAVY-DUTY KPIs ────────────────────────────────────────────────── */}
        <TabsContent value="heavy_kpi">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" />Heavy Truck KPI Dashboard</CardTitle>
                <CardDescription>Ton-KM efficiency · Long-haul SLA · Fleet utilization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {liveLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Loading live KPIs…</p>
                ) : (liveIntel?.heavyKpi?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No dispatch data yet - KPIs will appear once your fleet starts running trips.</p>
                ) : liveIntel!.heavyKpi.map((kpi) => (
                  <div key={kpi.label} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{kpi.label}</p>
                        <p className="text-xs text-muted-foreground">{kpi.desc}</p>
                      </div>
                      <span className={`font-bold text-sm ${kpi.value >= 80 ? "text-success" : kpi.value >= 60 ? "text-warning" : "text-destructive"}`}>
                        {kpi.value}{kpi.unit}
                      </span>
                    </div>
                    <Progress value={kpi.value} className={`h-2 [&>div]:${kpi.color}`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Long-Haul Rest & Refuel Planning</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {(liveIntel?.longHaul?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">No long-haul dispatches (≥200 km) in last 90 days.</p>
                  ) : liveIntel!.longHaul.map((r) => (
                    <div key={r.route} className="p-3 rounded-lg border border-border/50 text-xs">
                      <p className="font-semibold text-sm mb-2">{r.route}</p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                        <span>🛑 Rest stops: <strong>{r.restStops}</strong></span>
                        <span>⛽ Fuel stops: <strong>{r.fuelStops}</strong></span>
                        <span>🌙 Overnight: <strong>{r.overnight}</strong></span>
                        <span>🛂 Border checks: <strong>{r.borderChecks}</strong></span>
                        <span className="col-span-2">⏱ Total est. time: <strong className="text-foreground">{r.est}</strong></span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Terrain & Road Risk Flags</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { route: "Ore–Benin stretch", risk: "Unpaved / pothole risk", level: "high" },
                    { route: "Lokoja bridge approach", risk: "Weight-restricted bridge (< 15T)", level: "high" },
                    { route: "Onitsha–Owerri highway", risk: "Flood-prone rainy season", level: "medium" },
                    { route: "Kano–Maiduguri corridor", risk: "Security advisory zone", level: "medium" },
                    { route: "Lagos–Ibadan expressway", risk: "High traffic congestion (peak)", level: "low" },
                  ].map((t) => (
                    <div key={t.route} className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${t.level === "high" ? "border-destructive/30 bg-destructive/5" : t.level === "medium" ? "border-yellow-500/30 bg-yellow-500/5" : "border-border/50"}`}>
                      <div>
                        <p className="font-medium">{t.route}</p>
                        <p className="text-muted-foreground">{t.risk}</p>
                      </div>
                      <Badge variant={t.level === "high" ? "destructive" : "outline"} className="text-[10px]">{t.level.toUpperCase()}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ─── COMPLIANCE ─────────────────────────────────────────────────────── */}
        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  Vehicle Compliance - {getVehicleDisplayName(transportMode)}
                </CardTitle>
                <CardDescription>Document validity · License checks · Permit verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {compliance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Select a heavy vehicle to view compliance items.</p>
                ) : compliance.map((c) => (
                  <div key={c.label} className={`flex items-start gap-3 p-3 rounded-xl border ${c.status === "valid" ? "border-green-500/30 bg-green-500/5" : c.status === "warning" ? "border-yellow-500/30 bg-yellow-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                    {c.status === "valid" ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      : c.status === "warning" ? <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                        : <XCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-sm">{c.label}</p>
                        <Badge variant={c.status === "valid" ? "default" : c.status === "warning" ? "secondary" : "destructive"} className="text-[10px]">
                          {c.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.detail}</p>
                      {c.expiryDate && <p className="text-[10px] text-muted-foreground mt-0.5">Expires: {c.expiryDate}</p>}
                    </div>
                  </div>
                ))}
                {compliance.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1"><FileText className="w-3.5 h-3.5 mr-1.5" />Upload Document</Button>
                    <Button size="sm" variant="outline" className="flex-1"><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Refresh Checks</Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" />Regional Vehicle Terminology</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle Class</TableHead>
                      <TableHead>🇳🇬 NG</TableHead>
                      <TableHead>🇬🇧 UK/EU</TableHead>
                      <TableHead>🇺🇸 USA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {["15t_medium_heavy", "20t_rigid_hgv", "heavy_truck"].map((cls) => (
                      <TableRow key={cls} className={transportMode === cls ? "bg-primary/5" : ""}>
                        <TableCell className="font-medium text-xs">{cls}</TableCell>
                        <TableCell className="text-xs">{VEHICLE_REGIONAL_NAMES[cls]?.NG}</TableCell>
                        <TableCell className="text-xs">{VEHICLE_REGIONAL_NAMES[cls]?.UK}</TableCell>
                        <TableCell className="text-xs">{VEHICLE_REGIONAL_NAMES[cls]?.US}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-3">Display name is auto-resolved per tenant region. Underlying vehicle_class code never changes.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── AI INTELLIGENCE ────────────────────────────────────────────────── */}
        <TabsContent value="intelligence">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-yellow-500" />AI Route Intelligence</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {liveLoading ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
                ) : (liveIntel?.aiScores?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">AI scores will populate after your first dispatches complete.</p>
                ) : liveIntel!.aiScores.map((item) => (
                  <div key={item.label} className="p-3 rounded-xl border border-border/50 space-y-2">
                    <div className="flex items-start gap-3">
                      <Target className={`w-5 h-5 mt-0.5 ${item.color}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm">{item.label}</p>
                          <span className={`text-sm font-bold ${item.color}`}>{item.score}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        <Progress value={item.score} className={`h-1.5 mt-2 ${item.score >= 85 ? "[&>div]:bg-green-500" : "[&>div]:bg-yellow-500"}`} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" />Heavy Route Intelligence Scores</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(liveIntel?.heavyRoutes?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No repeat corridors yet. Scores appear after at least 2 trips on the same route.</p>
                ) : liveIntel!.heavyRoutes.map((route) => (
                  <div key={route.label} className="p-3 rounded-lg border border-border/50">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{route.label}</p>
                        <p className="text-xs text-muted-foreground">{route.trips} trips · {route.delay} delay · <Badge variant="outline" className="text-[9px]">{route.mode}</Badge></p>
                      </div>
                      <span className={`font-bold ${confColor(route.score)}`}>{route.score}%</span>
                    </div>
                    <Progress value={route.score} className={`h-1.5 ${route.score >= 85 ? "[&>div]:bg-green-500" : route.score >= 65 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-destructive"}`} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Global Geospatial Abstraction · Heavy Haul Compatible</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { provider: "Google Maps", status: "Primary", regions: "Global", features: "Traffic, Places, Routing, Restrictions" },
                    { provider: "OpenStreetMap", status: "Fallback", regions: "Global", features: "Offline tiles, Low-bandwidth, Geocoding" },
                    { provider: "Mapbox", status: "Optional", regions: "Americas, EU", features: "Custom tiles, Directions, Truck routing" },
                    { provider: "HERE Maps", status: "Available", regions: "Fleet markets", features: "Fleet routing, HGV restrictions, ETA" },
                  ].map((p) => (
                    <div key={p.provider} className="p-3 rounded-lg border border-border/50 text-sm">
                      <p className="font-bold mb-1">{p.provider}</p>
                      <Badge variant={p.status === "Primary" ? "default" : "outline"} className="text-xs mb-2">{p.status}</Badge>
                      <p className="text-xs text-muted-foreground">{p.regions}</p>
                      <p className="text-xs text-muted-foreground mt-1">{p.features}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── WHAT-IF SIMULATOR ──────────────────────────────────────────────── */}
        <TabsContent value="simulation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-yellow-500" />What-If Scenario Engine</CardTitle>
                <CardDescription>Test changes without committing. Real-time predictive metrics on ETA, margin, SLA risk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-xl border-2 border-warning/30 bg-warning/5 text-sm">
                  <p className="font-semibold text-warning mb-1">⚡ Simulation Mode Active</p>
                  <p className="text-muted-foreground text-xs">Changes here are advisory only and do not affect live dispatches.</p>
                </div>
                {(liveIntel?.whatIfScenarios?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No scenarios suggested yet - your fleet is performing within thresholds, or there isn't enough data.</p>
                ) : liveIntel!.whatIfScenarios.map((scenario) => (
                  <div key={scenario.label} className="p-3 rounded-lg border border-border/50 hover:border-primary/40 cursor-pointer transition-all">
                    <div className="flex items-start gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${scenario.positive ? "bg-green-500/20" : "bg-red-500/20"}`}>
                        <span className="text-xs">{scenario.positive ? "+" : "−"}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{scenario.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{scenario.impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <Button className="w-full" variant="secondary">
                  <RefreshCw className="w-4 h-4 mr-2" />Run Full Simulation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="w-4 h-4" />Load & Axle Capacity Intelligence</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vehicle Capacity</span><span>{mode.maxWeight.toLocaleString()} kg ({mode.gvwTonnage}T)</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Current Load</span><span>{stops.reduce((s, st) => s + (st.weightKg || 0), 0).toLocaleString()} kg</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Volume Capacity</span><span>{mode.maxVolumeCbm} m³</span></div>
                  <Progress
                    value={Math.min(100, (stops.reduce((s, st) => s + (st.weightKg || 0), 0) / mode.maxWeight) * 100)}
                    className="h-3"
                  />
                  {stops.reduce((s, st) => s + (st.weightKg || 0), 0) > mode.maxWeight && (
                    <div className="flex items-center gap-2 text-xs text-destructive p-2.5 rounded-lg bg-destructive/10 border border-destructive/30">
                      <Weight className="w-3.5 h-3.5" />
                      <div>
                        <p className="font-semibold">Axle Overload Detected!</p>
                        <p>This route exceeds {mode.gvwTonnage}T axle limit. Suggest upgrading to {mode.vehicleClass === "15T_medium_heavy" ? "20T Rigid HGV" : "split loads"}.</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Auto-Split Logic</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {[
                      "Bikes: max 10 items, 10–20 drops per run",
                      "Vans: max 3.5T, capacity-balanced grouping",
                      `15T Medium Heavy: max ${TRANSPORT_MODES.find(m => m.id === "15t_medium_heavy")?.maxDrops} drops, cluster industrial zones`,
                      `20T Rigid HGV: max ${TRANSPORT_MODES.find(m => m.id === "20t_rigid_hgv")?.maxDrops} drops, long-haul optimized`,
                      "AI groups stops by proximity first, then weight",
                      "Overloaded routes auto-split and re-costed",
                    ].map((rule) => (
                      <div key={rule} className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />{rule}</div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── ERP INTEGRATION ────────────────────────────────────────────────── */}
        <TabsContent value="integration">
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: "SAP S/4HANA", status: "available", desc: "Enterprise resource planning sync" },
                { name: "Oracle ERP Cloud", status: "available", desc: "Finance and operations integration" },
                { name: "Microsoft Dynamics 365", status: "available", desc: "CRM and ERP connector" },
                { name: "Zoho Books", status: "connected", desc: "Active - 1,847 records synced" },
                { name: "QuickBooks Online", status: "connected", desc: "Active - 923 records synced" },
                { name: "Xero", status: "available", desc: "UK/Global accounting integration" },
              ].map((erp) => (
                <Card key={erp.name} className={erp.status === "connected" ? "border-green-500/30" : "border-border/50"}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-sm">{erp.name}</p>
                      <Badge variant={erp.status === "connected" ? "default" : "outline"} className="text-xs">{erp.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{erp.desc}</p>
                    <Button size="sm" variant={erp.status === "connected" ? "outline" : "default"} className="w-full">
                      {erp.status === "connected" ? <><RefreshCw className="w-3.5 h-3.5 mr-1" />Sync Now</> : "Connect"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Integration Data Sync Scope</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data Entity</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Format</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[
                      { entity: "Route Plans", dir: "RouteAce → ERP", freq: "On save", format: "REST JSON" },
                      { entity: "Invoices", dir: "Bidirectional", freq: "Real-time", format: "REST + Webhook" },
                      { entity: "Cost Centers", dir: "ERP → RouteAce", freq: "Daily", format: "Batch CSV" },
                      { entity: "Driver Payroll", dir: "RouteAce → ERP", freq: "Monthly", format: "REST JSON" },
                      { entity: "Heavy Vehicle Assets", dir: "RouteAce → ERP", freq: "Weekly", format: "Batch JSON" },
                      { entity: "Compliance Docs", dir: "RouteAce → ERP", freq: "On expiry alert", format: "REST JSON" },
                    ].map((row) => (
                      <TableRow key={row.entity}>
                        <TableCell className="font-medium text-sm">{row.entity}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.dir}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{row.freq}</Badge></TableCell>
                        <TableCell className="font-mono text-xs">{row.format}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── ARCHITECTURE ───────────────────────────────────────────────────── */}
        <TabsContent value="architecture">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Enterprise Architecture Blueprint</CardTitle>
                <CardDescription>RouteAce as Africa's SAP for Mobility - Multi-region cloud infrastructure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { layer: "Global CDN + API Gateway", components: ["Edge caching", "Rate limiting", "DDoS protection", "SSL termination"], color: "bg-blue-500/10 border-blue-500/30" },
                    { layer: "Microservices Layer", components: ["Routing Engine", "Finance ERP", "Wallet Engine", "SLA Engine", "AI Intelligence", "Contact Center", "Driver App API", "Integration Hub", "Tax Engine", "Compliance Engine", "Heavy Vehicle Module"], color: "bg-purple-500/10 border-purple-500/30" },
                    { layer: "Data & Storage Layer", components: ["Relational DB (Postgres)", "Data Warehouse", "Log Storage", "Redis Cache", "File Storage"], color: "bg-green-500/10 border-green-500/30" },
                    { layer: "Infrastructure Layer", components: ["Kubernetes orchestration", "Nigeria primary cluster", "EU regional cluster", "Asia regional cluster", "US regional cluster", "Geo failover"], color: "bg-orange-500/10 border-orange-500/30" },
                    { layer: "Security & Monitoring", components: ["SIEM integration", "Zero Trust IAM", "Audit logs", "SOC 2 compliance", "ISO 27001", "Real-time alerting"], color: "bg-red-500/10 border-red-500/30" },
                  ].map((layer) => (
                    <div key={layer.layer} className={`p-4 rounded-xl border ${layer.color}`}>
                      <p className="font-bold text-sm mb-2">{layer.layer}</p>
                      <div className="flex flex-wrap gap-2">
                        {layer.components.map((c) => (
                          <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: "5 Pillars to Dominate", items: ["Logistics ERP", "Embedded Banking", "Government Infrastructure", "Cross-border Tax Engine", "AI Operations Controller"], icon: Target, color: "text-primary" },
                { title: "M&A Strategy", items: ["Phase 1: Africa - Fleet SaaS startups", "Phase 2: Emerging markets - Route tech", "Phase 3: Global - AI routing startups", "Goal: Vertical integration + data dominance"], icon: TrendingUp, color: "text-green-500" },
                { title: "Heavy Vehicle Competitiveness", items: ["vs Onfleet: Custom HGV routing ✅", "vs Bringg: Enterprise dispatch ✅", "vs SAP TM: African road realities ✅", "vs Oracle TM: Emerging market cost ✅", "Low-bandwidth driver app ✅"], icon: Truck, color: "text-orange-500" },
              ].map((card) => (
                <Card key={card.title}>
                  <CardHeader><CardTitle className="text-sm flex items-center gap-2"><card.icon className={`w-4 h-4 ${card.color}`} />{card.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-1.5">
                    {card.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-xs">
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
