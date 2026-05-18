import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import DispatchRoutePlanner from "./DispatchRoutePlanner";
import {
  Plus,
  Package,
  Truck,
  MapPin,
  Route,
  CheckCircle,
  AlertTriangle,
  Wand2,
  Send,
  Loader2,
  Info,
  DollarSign,
  Clock,
  FileText,
  CreditCard,
  Users,
  ArrowRight,
  Globe,
  Smartphone,
  PenTool,
  Calculator,
  Fuel,
  Navigation,
  Calendar
} from "lucide-react";

// Canonical dispatch states - Updated with Route Planner step
export type DispatchWorkflowState = 
  | "draft"
  | "select_vehicle"
  | "route_planning"
  | "priced"
  | "approved"
  | "in_transit"
  | "delivered"
  | "settled";

interface OrderSource {
  id: string;
  source_type: "customer_portal" | "api" | "manual" | "inbox";
  source_label: string;
  customer_name: string;
  customer_id?: string;
  pickup_address: string;
  delivery_address: string;
  delivery_lat?: number;
  delivery_lng?: number;
  weight_kg?: number;
  volume_cbm?: number;
  item_count?: number;
  delivery_window?: string;
  priority: string;
  payment_responsibility: "sender" | "receiver" | "contract";
  sla_hours?: number;
  cargo_category?: string;
  selected?: boolean;
}

interface RouteGroup {
  id: string;
  area: string;
  orders: OrderSource[];
  orderCount: number;
  totalWeight: number;
  totalVolume: number;
  suggestedVehicle: VehicleSuggestion;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedCost: number;
  fuelCost: number;
  profitMargin: number;
  // New route planning fields
  routeId?: string;
  estimatedDeliveryDays?: number;
  estimatedCompletionDate?: string | null;
  totalDrops?: number;
  avgWaitTimePerDrop?: number;
}

interface VehicleSuggestion {
  vehicle_type: string;
  max_weight_kg: number;
  max_volume_cbm: number;
  max_drops: number;
  icon: string;
  reason: string;
}

const VEHICLE_TYPES: VehicleSuggestion[] = [
  { vehicle_type: "Bike", max_weight_kg: 20, max_volume_cbm: 0.05, max_drops: 15, icon: "🏍️", reason: "Light parcels, urban delivery" },
  { vehicle_type: "Bus", max_weight_kg: 500, max_volume_cbm: 2, max_drops: 20, icon: "🚐", reason: "Medium parcels, urban routes" },
  { vehicle_type: "15T Truck", max_weight_kg: 15000, max_volume_cbm: 40, max_drops: 5, icon: "🚛", reason: "Heavy cargo, medium distance" },
  { vehicle_type: "20T Truck", max_weight_kg: 20000, max_volume_cbm: 55, max_drops: 3, icon: "🚛", reason: "Heavy cargo, long haul" },
  { vehicle_type: "30T Truck", max_weight_kg: 30000, max_volume_cbm: 80, max_drops: 2, icon: "🚚", reason: "Maximum capacity, long distance" },
];

// Updated workflow states with Route Planner
const WORKFLOW_STATES: { state: DispatchWorkflowState; label: string; icon: any }[] = [
  { state: "draft", label: "1. Select Orders", icon: Package },
  { state: "select_vehicle", label: "2. Vehicle", icon: Truck },
  { state: "route_planning", label: "3. Route Plan", icon: Route },
  { state: "priced", label: "4. Review & Cost", icon: Calculator },
  { state: "approved", label: "5. Approval", icon: CheckCircle },
];

const UnifiedDispatchWorkflow = () => {
  const { toast } = useToast();
  const { user, hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  
  // Current workflow state
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [groupedRoutes, setGroupedRoutes] = useState<RouteGroup[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [planNotes, setPlanNotes] = useState("");
  
  // Route Planning state
  const [dispatchDate, setDispatchDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [activeRouteGroupIndex, setActiveRouteGroupIndex] = useState<number>(0);
  const [routePlanningComplete, setRoutePlanningComplete] = useState(false);
  
  // Pricing state
  const [pricingModel, setPricingModel] = useState<"per_delivery" | "contract" | "dynamic" | "whitelabel">("per_delivery");
  const [baseRatePerKm, setBaseRatePerKm] = useState(500);
  const [priceMarkup, setPriceMarkup] = useState(0);
  
  // Manual order form
  const [manualOrder, setManualOrder] = useState({
    customer_id: "",
    contact_name: "",
    contact_phone: "",
    pickup_address: "",
    delivery_address: "",
    cargo_description: "",
    weight_kg: "",
    volume_cbm: "",
    priority: "normal",
    payment_responsibility: "sender",
    sla_hours: "24",
    cargo_category: "general"
  });

  const isOpsManager = hasAnyRole(["ops_manager", "operations", "dispatcher"]);
  const isAdmin = hasAnyRole(["admin", "super_admin", "org_admin"]);

  // Fetch orders from multiple sources
  const { data: allOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["unified-dispatch-orders"],
    queryFn: async () => {
      const orders: OrderSource[] = [];

      // 1. Customer Portal Orders (from dispatches with pending status)
      const { data: customerOrders } = await supabase
        .from("dispatches")
        .select(`*, customers (company_name, contact_name, phone)`)
        .eq("status", "pending")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });

      customerOrders?.forEach(o => {
        orders.push({
          id: `dispatch-${o.id}`,
          source_type: "customer_portal",
          source_label: "Customer Portal",
          customer_name: o.customers?.company_name || "Unknown",
          customer_id: o.customer_id,
          pickup_address: o.pickup_address,
          delivery_address: o.delivery_address,
          weight_kg: o.cargo_weight_kg,
          priority: o.priority || "normal",
          payment_responsibility: "sender",
          sla_hours: 24,
        });
      });

      // 2. Order Inbox (multi-channel ingestion)
      const { data: inboxOrders } = await supabase
        .from("order_inbox")
        .select(`*, customers (company_name, contact_name, phone)`)
        .eq("status", "new")
        .order("created_at", { ascending: false });

      inboxOrders?.forEach(o => {
        orders.push({
          id: `inbox-${o.id}`,
          source_type: o.source_channel === "whatsapp" ? "inbox" : o.source_channel === "api" ? "api" : "inbox",
          source_label: o.source_channel?.toUpperCase() || "Inbox",
          customer_name: o.customers?.company_name || o.parsed_customer_name || "Unknown",
          customer_id: o.converted_customer_id,
          pickup_address: o.parsed_pickup_address || "",
          delivery_address: o.parsed_delivery_address || "",
          priority: "normal",
          payment_responsibility: "sender",
          sla_hours: 24,
        });
      });

      return orders;
    }
  });

  // Fetch customers
  const { data: customers = [] } = useQuery({
    queryKey: ["dispatch-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name, factory_address, factory_lat, factory_lng")
        .order("company_name");
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch available vehicles
  const { data: vehicles = [] } = useQuery({
    queryKey: ["dispatch-vehicles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .order("truck_type");
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch drivers
  const { data: drivers = [] } = useQuery({
    queryKey: ["dispatch-drivers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, status")
        .eq("status", "available")
        .order("full_name");
      if (error) throw error;
      return data || [];
    }
  });

  // Toggle order selection
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  // Select all orders
  const selectAllOrders = () => {
    if (selectedOrders.size === allOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(allOrders.map(o => o.id)));
    }
  };

  // Suggest optimal vehicle
  const suggestVehicle = (totalWeight: number, totalVolume: number, dropCount: number): VehicleSuggestion => {
    for (const vehicle of VEHICLE_TYPES) {
      if (totalWeight <= vehicle.max_weight_kg && 
          totalVolume <= vehicle.max_volume_cbm && 
          dropCount <= vehicle.max_drops) {
        return vehicle;
      }
    }
    return VEHICLE_TYPES[VEHICLE_TYPES.length - 1];
  };

  // AI-assisted route grouping
  const handleAutoGroup = async () => {
    if (selectedOrders.size === 0) {
      toast({ title: "No Orders Selected", description: "Please select orders to group", variant: "destructive" });
      return;
    }

    setIsGrouping(true);
    try {
      const selectedOrderData = allOrders.filter(o => selectedOrders.has(o.id));
      
      // Proximity-based grouping
      const groups: Record<string, OrderSource[]> = {};
      
      selectedOrderData.forEach(order => {
        const area = order.delivery_address.split(",")[0]?.trim() || "Unknown Area";
        if (!groups[area]) groups[area] = [];
        groups[area].push(order);
      });

      // Create route suggestions with full cost intelligence
      const routes: RouteGroup[] = Object.entries(groups).map(([area, orders], index) => {
        const totalWeight = orders.reduce((sum, o) => sum + (o.weight_kg || 10), 0);
        const totalVolume = orders.reduce((sum, o) => sum + (o.volume_cbm || 0.1), 0);
        const suggestedVehicle = suggestVehicle(totalWeight, totalVolume, orders.length);
        
        // Compute distance heuristic from Nigeria city pairs when GPS coords unavailable
        const CITY_DISTANCES: Record<string, number> = {
          "lagos-ibadan": 128, "lagos-abuja": 765,
          "lagos-kano": 1165, "lagos-ph": 663,
          "lagos-benin": 310, "abuja-kano": 390,
          "abuja-ph": 632, "ibadan-benin": 185,
          "kano-maiduguri": 325, "lagos-owerri": 585,
        };
        const pickupCity = (orders[0]?.pickup_address ?? "").toLowerCase().split(",")[0].trim();
        const deliveryCity = (orders[0]?.delivery_address ?? "").toLowerCase().split(",")[0].trim();
        const routeKey = [pickupCity, deliveryCity].sort().join("-");
        // Fallback: 50km base + 15km per order as a minimum viable heuristic.
        const estimatedDistance =
          CITY_DISTANCES[routeKey] ?? Math.max(20, (orders.length * 15) + 50);
        const fuelCost = Math.round(estimatedDistance * 2 * 0.35 * 700); // 0.35 L/km * ₦700/L
        const driverCost = Math.round((estimatedDistance / 50) * 1500); // ₦1500/hr
        const maintenanceCost = Math.round(estimatedDistance * 15);
        const baseEstimate = (estimatedDistance * baseRatePerKm) + fuelCost + driverCost + maintenanceCost;
        const profitMargin = Math.round((baseEstimate * 0.25));

        return {
          id: `route-${index + 1}`,
          area,
          orders,
          orderCount: orders.length,
          totalWeight,
          totalVolume,
          suggestedVehicle,
          estimatedDistance,
          estimatedDuration: Math.round(estimatedDistance / 50 * 60), // minutes
          estimatedCost: baseEstimate + profitMargin,
          fuelCost,
          profitMargin: 25
        };
      });

      setGroupedRoutes(routes);
      setCurrentStep(1); // Move to Routed
      toast({ title: "Routes Optimized", description: `Created ${routes.length} optimized route groups` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to group routes", variant: "destructive" });
    } finally {
      setIsGrouping(false);
    }
  };

  // Calculate total price
  const calculateTotalPrice = () => {
    const baseTotal = groupedRoutes.reduce((sum, r) => sum + r.estimatedCost, 0);
    const markup = baseTotal * (priceMarkup / 100);
    return baseTotal + markup;
  };

  // Apply pricing
  const handleApplyPricing = () => {
    setCurrentStep(2); // Move to Priced
    setShowPricingDialog(false);
    toast({ title: "Pricing Applied", description: `Total: ₦${calculateTotalPrice().toLocaleString()}` });
  };

  // Handle payment confirmation
  const handlePaymentConfirm = () => {
    setCurrentStep(3); // Move to Payment Pending -> then Approved after admin approval
    setShowPaymentDialog(false);
    toast({ title: "Payment Recorded", description: "Dispatch ready for approval" });
  };

  // Submit dispatch plan for approval
  const submitPlanMutation = useMutation({
    mutationFn: async () => {
      const planNumber = `DP-${Date.now()}`;
      const totalPrice = calculateTotalPrice();

      const { data: plan, error: planError } = await supabase
        .from("dispatch_plans")
        .insert({
          plan_number: planNumber,
          planned_date: dispatchDate || new Date().toISOString().split("T")[0],
          created_by: user?.id,
          status: "pending_approval",
          approval_status: "pending",
          total_orders: groupedRoutes.reduce((sum, r) => sum + r.orderCount, 0),
          total_distance_km: groupedRoutes.reduce((sum, r) => sum + r.estimatedDistance, 0),
          total_cost: totalPrice,
          notes: planNotes
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create plan items with route planning data
      for (const route of groupedRoutes) {
        for (const order of route.orders) {
          await supabase.from("dispatch_plan_items").insert({
            plan_id: plan.id,
            order_id: order.id.replace(/^(dispatch-|inbox-)/, ""),
            route_group: route.area,
            suggested_vehicle_type: route.suggestedVehicle.vehicle_type,
            grouping_reason: route.suggestedVehicle.reason,
            estimated_distance_km: route.estimatedDistance / route.orderCount,
            estimated_cost: route.estimatedCost / route.orderCount
          });
        }

        // Also create actual dispatch records with the new ETA fields
        for (const order of route.orders) {
          // Update existing dispatch or create new one with route planning data
          const orderId = order.id.replace(/^(dispatch-|inbox-)/, "");
          
          if (order.id.startsWith("dispatch-")) {
            // Update existing dispatch with route data
            await supabase
              .from("dispatches")
              .update({
                route_id: route.routeId || null,
                estimated_delivery_days: route.estimatedDeliveryDays,
                estimated_completion_date: route.estimatedCompletionDate,
                estimated_start_date: dispatchDate,
                dispatch_date: dispatchDate,
                total_drops: route.totalDrops,
                avg_wait_time_per_drop: route.avgWaitTimePerDrop || 2,
                total_distance_km: route.estimatedDistance
              })
              .eq("id", orderId);
          }
        }
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-dispatch-orders"] });
      toast({ 
        title: "Dispatch Plan Submitted", 
        description: `Plan sent for Admin approval. ETA: ${groupedRoutes.map(r => r.estimatedDeliveryDays).filter(Boolean).join(', ')} days` 
      });
      setShowSubmitDialog(false);
      setGroupedRoutes([]);
      setSelectedOrders(new Set());
      setCurrentStep(0);
      setRoutePlanningComplete(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Create manual order
  const createManualOrderMutation = useMutation({
    mutationFn: async () => {
      const insertData: Record<string, unknown> = {
        parsed_customer_name: manualOrder.contact_name || customers?.find(c => c.id === manualOrder.customer_id)?.company_name || "Manual Order",
        source_channel: "manual",
        parsed_pickup_address: manualOrder.pickup_address,
        parsed_delivery_address: manualOrder.delivery_address,
        parsed_cargo_description: manualOrder.cargo_description,
        status: "new"
      };
      
      if (manualOrder.customer_id) {
        insertData.converted_customer_id = manualOrder.customer_id;
      }
      
      const { error } = await supabase.from("order_inbox").insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unified-dispatch-orders"] });
      toast({ title: "Order Created", description: "Manual order added to dispatch queue" });
      setManualOrderDialogOpen(false);
      setManualOrder({
        customer_id: "",
        contact_name: "",
        contact_phone: "",
        pickup_address: "",
        delivery_address: "",
        cargo_description: "",
        weight_kg: "",
        volume_cbm: "",
        priority: "normal",
        payment_responsibility: "sender",
        sla_hours: "24",
        cargo_category: "general"
      });
    }
  });

  // Calculate workflow progress
  const workflowProgress = ((currentStep + 1) / WORKFLOW_STATES.length) * 100;

  return (
    <div className="space-y-6">
      {/* Workflow Progress Indicator */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Dispatch Workflow</h3>
            <Badge variant="outline">{WORKFLOW_STATES[currentStep].label}</Badge>
          </div>
          <Progress value={workflowProgress} className="h-2 mb-3" />
          <div className="flex justify-between">
            {WORKFLOW_STATES.slice(0, 5).map((state, idx) => {
              const Icon = state.icon;
              const isActive = idx === currentStep;
              const isComplete = idx < currentStep;
              return (
                <div 
                  key={state.state} 
                  className={`flex flex-col items-center gap-1 ${isActive ? "text-primary" : isComplete ? "text-success" : "text-muted-foreground"}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-primary text-primary-foreground" : isComplete ? "bg-success text-success-foreground" : "bg-muted"}`}>
                    {isComplete ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs hidden md:block">{state.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Orders</p>
              <p className="text-2xl font-bold">{allOrders.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Selected</p>
              <p className="text-2xl font-bold">{selectedOrders.size}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Route className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Route Groups</p>
              <p className="text-2xl font-bold">{groupedRoutes.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Truck className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Vehicles</p>
              <p className="text-2xl font-bold">{vehicles.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Est. Revenue</p>
              <p className="text-xl font-bold">₦{calculateTotalPrice().toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Guidance Banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-primary">Create Dispatch Workflow</h4>
              <p className="text-sm text-muted-foreground mt-1">
                1. Select Orders → 
                2. Select Vehicle → 
                3. <strong>Route Planner (Required)</strong> → 
                4. Review ETA & Costs → 
                5. Submit for Approval
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Date Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <Label htmlFor="dispatch-date" className="text-sm font-medium">Dispatch Date</Label>
              <p className="text-xs text-muted-foreground">When will this dispatch start?</p>
            </div>
            <Input
              id="dispatch-date"
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="w-48"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons - Always Visible */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setManualOrderDialogOpen(true)} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Manual Order
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleAutoGroup}
          disabled={selectedOrders.size === 0 || isGrouping}
          size="lg"
        >
          {isGrouping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
          Auto-Group Routes
        </Button>
        {groupedRoutes.length > 0 && currentStep >= 1 && !routePlanningComplete && (
          <Button variant="outline" onClick={() => setCurrentStep(2)} size="lg">
            <Route className="w-4 h-4 mr-2" />
            Plan Routes
          </Button>
        )}
        {routePlanningComplete && (
          <Button variant="outline" onClick={() => setShowPricingDialog(true)} size="lg">
            <Calculator className="w-4 h-4 mr-2" />
            Review Costs
          </Button>
        )}
        {groupedRoutes.length > 0 && routePlanningComplete && (
          <Button onClick={() => setShowSubmitDialog(true)} size="lg" className="bg-success hover:bg-success/90">
            <Send className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        )}
      </div>

      {/* Orders Table by Source */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Orders ({allOrders.length})</TabsTrigger>
          <TabsTrigger value="customer_portal">
            <Globe className="w-3 h-3 mr-1" />
            Customer Portal
          </TabsTrigger>
          <TabsTrigger value="api">
            <Smartphone className="w-3 h-3 mr-1" />
            API
          </TabsTrigger>
          <TabsTrigger value="inbox">
            <Package className="w-3 h-3 mr-1" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value="manual">
            <PenTool className="w-3 h-3 mr-1" />
            Manual
          </TabsTrigger>
        </TabsList>

        {["all", "customer_portal", "api", "inbox", "manual"].map(tabValue => (
          <TabsContent key={tabValue} value={tabValue}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Orders Queue</CardTitle>
                    <CardDescription>Select orders to create dispatch plan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={selectAllOrders}>
                    {selectedOrders.size === allOrders.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Pickup</TableHead>
                      <TableHead>Delivery</TableHead>
                      <TableHead>Weight</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOrders
                      .filter(o => tabValue === "all" || o.source_type === tabValue)
                      .map((order) => (
                        <TableRow key={order.id} className={selectedOrders.has(order.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedOrders.has(order.id)}
                              onCheckedChange={() => toggleOrderSelection(order.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {order.source_label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{order.customer_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 max-w-32 truncate text-xs">
                              <MapPin className="w-3 h-3 text-green-500" />
                              {order.pickup_address?.split(",")[0] || "-"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 max-w-32 truncate text-xs">
                              <MapPin className="w-3 h-3 text-red-500" />
                              {order.delivery_address?.split(",")[0] || "-"}
                            </div>
                          </TableCell>
                          <TableCell>{order.weight_kg ? `${order.weight_kg} kg` : "-"}</TableCell>
                          <TableCell>
                            <Badge variant={order.priority === "urgent" ? "destructive" : order.priority === "high" ? "default" : "secondary"}>
                              {order.priority}
                            </Badge>
                          </TableCell>
                          <TableCell className="capitalize text-xs">{order.payment_responsibility}</TableCell>
                        </TableRow>
                      ))}
                    {allOrders.filter(o => tabValue === "all" || o.source_type === tabValue).length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No orders available. Create a manual order or wait for customer/API orders.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Grouped Routes Preview */}
      {groupedRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Optimized Route Groups
            </CardTitle>
            <CardDescription>Review AI-suggested groupings, vehicle assignments, and cost breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedRoutes.map((route, idx) => (
                <div 
                  key={route.id} 
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${activeRouteGroupIndex === idx ? "border-primary bg-primary/5" : "bg-muted/30 hover:border-primary/50"}`}
                  onClick={() => setActiveRouteGroupIndex(idx)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{route.suggestedVehicle.icon}</span>
                      <div>
                        <h4 className="font-medium">{route.area}</h4>
                        <p className="text-sm text-muted-foreground">
                          {route.orderCount} orders • {route.totalWeight.toFixed(1)} kg • ~{route.estimatedDistance} km
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge>{route.suggestedVehicle.vehicle_type}</Badge>
                      <p className="text-lg font-bold text-primary mt-1">₦{route.estimatedCost.toLocaleString()}</p>
                      {route.estimatedDeliveryDays && (
                        <p className="text-sm font-semibold text-success">
                          ETA: {route.estimatedDeliveryDays} Days
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Cost Breakdown */}
                  <div className="grid grid-cols-4 gap-2 text-xs mb-3">
                    <div className="p-2 bg-background rounded">
                      <Fuel className="w-3 h-3 inline mr-1" />
                      Fuel: ₦{route.fuelCost.toLocaleString()}
                    </div>
                    <div className="p-2 bg-background rounded">
                      <Navigation className="w-3 h-3 inline mr-1" />
                      {route.estimatedDistance} km
                    </div>
                    <div className="p-2 bg-background rounded">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {route.totalDrops || route.orderCount} drops
                    </div>
                    <div className="p-2 bg-background rounded text-success">
                      <DollarSign className="w-3 h-3 inline mr-1" />
                      {route.profitMargin}% margin
                    </div>
                  </div>
                  
                  {/* Estimated Dates */}
                  {route.estimatedCompletionDate && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>Est. Completion: {route.estimatedCompletionDate}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    <span>Vehicle suggestion: {route.suggestedVehicle.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROUTE PLANNER STEP - Integrated into Dispatch Flow */}
      {groupedRoutes.length > 0 && currentStep >= 1 && (
        <Card className="border-2 border-primary/30">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Step 3: Route Planner
              <Badge variant="outline" className="ml-2">Required</Badge>
            </CardTitle>
            <CardDescription>
              Calculate optimized routes and delivery ETA for each route group. 
              ETA is displayed in <strong>Days</strong> (includes 2-hour wait time per drop).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {groupedRoutes.length > 1 && (
              <div className="mb-4">
                <Label className="text-sm mb-2 block">Select Route Group to Plan</Label>
                <Select 
                  value={activeRouteGroupIndex.toString()} 
                  onValueChange={(v) => setActiveRouteGroupIndex(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {groupedRoutes.map((route, idx) => (
                      <SelectItem key={route.id} value={idx.toString()}>
                        {route.area} - {route.orderCount} orders
                        {route.estimatedDeliveryDays ? ` (${route.estimatedDeliveryDays} days)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {groupedRoutes[activeRouteGroupIndex] && (
              <DispatchRoutePlanner
                origin={groupedRoutes[activeRouteGroupIndex].orders[0]?.pickup_address || ""}
                destination={groupedRoutes[activeRouteGroupIndex].orders[groupedRoutes[activeRouteGroupIndex].orders.length - 1]?.delivery_address || ""}
                dropoffs={groupedRoutes[activeRouteGroupIndex].orders.map(o => ({
                  id: o.id,
                  address: o.delivery_address,
                  latitude: o.delivery_lat,
                  longitude: o.delivery_lng
                }))}
                dispatchDate={dispatchDate}
                selectedRouteId={groupedRoutes[activeRouteGroupIndex].routeId}
                onRouteCalculated={(routeData) => {
                  // Update the route group with calculated data
                  setGroupedRoutes(prev => prev.map((route, idx) => 
                    idx === activeRouteGroupIndex 
                      ? {
                          ...route,
                          routeId: routeData.routeId,
                          estimatedDistance: routeData.totalDistanceKm || route.estimatedDistance,
                          estimatedDeliveryDays: routeData.estimatedDeliveryDays,
                          estimatedCompletionDate: routeData.estimatedCompletionDate,
                          totalDrops: routeData.totalDrops,
                          avgWaitTimePerDrop: routeData.avgWaitTimePerDrop
                        }
                      : route
                  ));
                  
                  // Check if all routes have been planned
                  const allPlanned = groupedRoutes.every((r, idx) => 
                    idx === activeRouteGroupIndex ? true : r.estimatedDeliveryDays !== undefined
                  );
                  
                  if (allPlanned || groupedRoutes.length === 1) {
                    setRoutePlanningComplete(true);
                    setCurrentStep(3); // Move to Review & Cost step
                  }
                }}
              />
            )}

            {/* Route Planning Status */}
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Route Planning Progress</span>
                <Badge variant={routePlanningComplete ? "default" : "secondary"}>
                  {groupedRoutes.filter(r => r.estimatedDeliveryDays !== undefined).length} / {groupedRoutes.length} routes planned
                </Badge>
              </div>
              {routePlanningComplete && (
                <p className="text-sm text-success mt-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  All routes planned! You can now proceed to submit for approval.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ETA Summary Card - After Route Planning */}
      {routePlanningComplete && groupedRoutes.some(r => r.estimatedDeliveryDays) && (
        <Card className="border-success/30 bg-success/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle className="w-5 h-5" />
              Dispatch Summary - Estimated Delivery Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedRoutes.filter(r => r.estimatedDeliveryDays).map((route) => (
                <div key={route.id} className="p-4 bg-background rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{route.suggestedVehicle.icon}</span>
                    <span className="font-medium">{route.area}</span>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-primary">{route.estimatedDeliveryDays} Days</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {route.totalDrops} drops × {route.avgWaitTimePerDrop}h wait = {(route.totalDrops || 1) * (route.avgWaitTimePerDrop || 2)}h wait time
                    </p>
                  </div>
                  {route.estimatedCompletionDate && (
                    <div className="mt-2 text-center text-sm">
                      <span className="text-muted-foreground">Expected: </span>
                      <span className="font-medium">{route.estimatedCompletionDate}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Order Dialog */}
      <Dialog open={manualOrderDialogOpen} onOpenChange={setManualOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Manual Order</DialogTitle>
            <DialogDescription>Add an order directly to the dispatch queue with full details</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select value={manualOrder.customer_id} onValueChange={(v) => setManualOrder(prev => ({ ...prev, customer_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact Name</Label>
                <Input
                  value={manualOrder.contact_name}
                  onChange={(e) => setManualOrder(prev => ({ ...prev, contact_name: e.target.value }))}
                  placeholder="Recipient name"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Pickup Address</Label>
              <AddressAutocomplete
                value={manualOrder.pickup_address}
                onChange={(v) => setManualOrder(prev => ({ ...prev, pickup_address: v }))}
                placeholder="Enter pickup location"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <AddressAutocomplete
                value={manualOrder.delivery_address}
                onChange={(v) => setManualOrder(prev => ({ ...prev, delivery_address: v }))}
                placeholder="Enter delivery location"
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={manualOrder.weight_kg}
                  onChange={(e) => setManualOrder(prev => ({ ...prev, weight_kg: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Volume (m³)</Label>
                <Input
                  type="number"
                  value={manualOrder.volume_cbm}
                  onChange={(e) => setManualOrder(prev => ({ ...prev, volume_cbm: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>SLA (hours)</Label>
                <Select value={manualOrder.sla_hours} onValueChange={(v) => setManualOrder(prev => ({ ...prev, sla_hours: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 Hours</SelectItem>
                    <SelectItem value="12">12 Hours</SelectItem>
                    <SelectItem value="24">24 Hours</SelectItem>
                    <SelectItem value="48">48 Hours</SelectItem>
                    <SelectItem value="72">72 Hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={manualOrder.priority} onValueChange={(v) => setManualOrder(prev => ({ ...prev, priority: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment By</Label>
                <Select value={manualOrder.payment_responsibility} onValueChange={(v) => setManualOrder(prev => ({ ...prev, payment_responsibility: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sender">Sender</SelectItem>
                    <SelectItem value="receiver">Receiver</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Cargo Category</Label>
                <Select value={manualOrder.cargo_category} onValueChange={(v) => setManualOrder(prev => ({ ...prev, cargo_category: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="fragile">Fragile</SelectItem>
                    <SelectItem value="perishable">Perishable</SelectItem>
                    <SelectItem value="hazardous">Hazardous</SelectItem>
                    <SelectItem value="high_value">High Value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Cargo Description</Label>
              <Textarea
                value={manualOrder.cargo_description}
                onChange={(e) => setManualOrder(prev => ({ ...prev, cargo_description: e.target.value }))}
                placeholder="Describe the cargo, special handling requirements..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createManualOrderMutation.mutate()} disabled={createManualOrderMutation.isPending}>
              {createManualOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pricing Dialog */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Pricing Model</DialogTitle>
            <DialogDescription>Select pricing strategy for this dispatch</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Pricing Model</Label>
              <Select value={pricingModel} onValueChange={(v: any) => setPricingModel(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_delivery">Pay Per Delivery</SelectItem>
                  <SelectItem value="contract">Contract Pricing</SelectItem>
                  <SelectItem value="dynamic">Dynamic Pricing</SelectItem>
                  <SelectItem value="whitelabel">White-Label Markup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Rate (₦/km)</Label>
                <Input 
                  type="number" 
                  value={baseRatePerKm} 
                  onChange={(e) => setBaseRatePerKm(Number(e.target.value))} 
                />
              </div>
              <div className="space-y-2">
                <Label>Markup (%)</Label>
                <Input 
                  type="number" 
                  value={priceMarkup} 
                  onChange={(e) => setPriceMarkup(Number(e.target.value))} 
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm mb-2">
                <span>Base Total</span>
                <span>₦{groupedRoutes.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span>Markup ({priceMarkup}%)</span>
                <span>₦{Math.round(groupedRoutes.reduce((s, r) => s + r.estimatedCost, 0) * (priceMarkup / 100)).toLocaleString()}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Final Price</span>
                <span className="text-primary">₦{calculateTotalPrice().toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPricingDialog(false)}>Cancel</Button>
            <Button onClick={handleApplyPricing}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply Pricing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Payment Confirmation</DialogTitle>
            <DialogDescription>Confirm payment status before approval</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-primary/10 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">Total Amount Due</p>
              <p className="text-3xl font-bold text-primary">₦{calculateTotalPrice().toLocaleString()}</p>
            </div>
            
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select defaultValue="prepaid">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                  <SelectItem value="wallet">Wallet Balance</SelectItem>
                  <SelectItem value="credit">Credit Terms</SelectItem>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="escrow">Escrow</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handlePaymentConfirm}>
              <CreditCard className="w-4 h-4 mr-2" />
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Approval Dialog */}
      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Dispatch Plan</DialogTitle>
            <DialogDescription>
              This plan will be sent to Admin or Super Admin for final approval
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Routes:</span>
                  <span className="ml-2 font-medium">{groupedRoutes.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Orders:</span>
                  <span className="ml-2 font-medium">{groupedRoutes.reduce((s, r) => s + r.orderCount, 0)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Distance:</span>
                  <span className="ml-2 font-medium">{groupedRoutes.reduce((s, r) => s + r.estimatedDistance, 0)} km</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Revenue:</span>
                  <span className="ml-2 font-medium text-primary">₦{calculateTotalPrice().toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes for Approver (Optional)</Label>
              <Textarea
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                placeholder="Any special instructions, priority notes, or context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>Cancel</Button>
            <Button onClick={() => submitPlanMutation.mutate()} disabled={submitPlanMutation.isPending} className="bg-green-600 hover:bg-green-700">
              {submitPlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UnifiedDispatchWorkflow;
