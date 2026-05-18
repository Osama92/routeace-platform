import { useState } from "react";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
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
  Info
} from "lucide-react";

interface OrderToDispatch {
  id: string;
  source: string;
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
  selected?: boolean;
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

const DispatchCreationPanel = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [isGrouping, setIsGrouping] = useState(false);
  const [groupedRoutes, setGroupedRoutes] = useState<any[]>([]);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [planNotes, setPlanNotes] = useState("");
  const [manualOrderDialogOpen, setManualOrderDialogOpen] = useState(false);
  const [manualOrder, setManualOrder] = useState({
    customer_id: "",
    pickup_address: "",
    delivery_address: "",
    cargo_description: "",
    weight_kg: "",
    priority: "normal"
  });

  // Fetch pending orders from inbox
  const { data: pendingOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["pending-orders-for-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_inbox")
        .select(`*, customers (company_name, contact_name, phone)`)
        .eq("status", "new")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data?.map(o => ({
        id: o.id,
        source: o.source_channel || "manual",
        customer_name: o.customers?.company_name || o.parsed_customer_name || "Unknown",
        customer_id: o.converted_customer_id,
        pickup_address: o.parsed_pickup_address || "",
        delivery_address: o.parsed_delivery_address || "",
        weight_kg: null,
        volume_cbm: null,
        item_count: null,
        priority: "normal",
        selected: false
      })) || [];
    }
  });

  // Fetch customers for manual order
  const { data: customers } = useQuery({
    queryKey: ["customers-for-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, company_name, factory_address, factory_lat, factory_lng")
        .order("company_name");
      if (error) throw error;
      return data;
    }
  });

  // Fetch available vehicles
  const { data: vehicles } = useQuery({
    queryKey: ["available-vehicles-dispatch"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .order("truck_type");
      if (error) throw error;
      return data;
    }
  });

  const toggleOrderSelection = (orderId: string) => {
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

  const selectAllOrders = () => {
    if (selectedOrders.size === (pendingOrders?.length || 0)) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(pendingOrders?.map(o => o.id) || []));
    }
  };

  // Suggest optimal vehicle based on cargo
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
      const selectedOrderData = pendingOrders?.filter(o => selectedOrders.has(o.id)) || [];
      
      // Simple proximity-based grouping (in production, use Google Maps or similar)
      const groups: Record<string, OrderToDispatch[]> = {};
      
      selectedOrderData.forEach(order => {
        // Extract city/area from delivery address
        const area = order.delivery_address.split(",")[0]?.trim() || "Unknown";
        if (!groups[area]) {
          groups[area] = [];
        }
        groups[area].push(order);
      });

      // Create route suggestions
      const routes = Object.entries(groups).map(([area, orders], index) => {
        const totalWeight = orders.reduce((sum, o) => sum + (o.weight_kg || 10), 0);
        const totalVolume = orders.reduce((sum, o) => sum + (o.volume_cbm || 0.1), 0);
        const suggestedVehicle = suggestVehicle(totalWeight, totalVolume, orders.length);

        return {
          id: `route-${index + 1}`,
          area,
          orders,
          orderCount: orders.length,
          totalWeight,
          totalVolume,
          suggestedVehicle,
          estimatedDistance: Math.max(25, orders.length * 12), // Heuristic: ~12km per stop, min 25km
          estimatedCost: Math.round(15000 + (totalWeight * 10) + (orders.length * 2000))
        };
      });

      setGroupedRoutes(routes);
      toast({ title: "Routes Grouped", description: `Created ${routes.length} optimized route groups` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to group routes", variant: "destructive" });
    } finally {
      setIsGrouping(false);
    }
  };

  // Submit dispatch plan for approval
  const submitPlanMutation = useMutation({
    mutationFn: async () => {
      // Create dispatch plan
      const planNumber = `DP-${Date.now()}`;
      const { data: plan, error: planError } = await supabase
        .from("dispatch_plans")
        .insert({
          plan_number: planNumber,
          planned_date: new Date().toISOString().split("T")[0],
          created_by: user?.id,
          status: "pending_approval",
          total_orders: groupedRoutes.reduce((sum, r) => sum + r.orderCount, 0),
          total_distance_km: groupedRoutes.reduce((sum, r) => sum + r.estimatedDistance, 0),
          total_cost: groupedRoutes.reduce((sum, r) => sum + r.estimatedCost, 0),
          notes: planNotes
        })
        .select()
        .single();

      if (planError) throw planError;

      // Create plan items
      for (const route of groupedRoutes) {
        for (const order of route.orders) {
          await supabase.from("dispatch_plan_items").insert({
            plan_id: plan.id,
            order_id: order.id,
            route_group: route.area,
            suggested_vehicle_type: route.suggestedVehicle.vehicle_type,
            grouping_reason: route.suggestedVehicle.reason,
            estimated_distance_km: route.estimatedDistance / route.orderCount,
            estimated_cost: route.estimatedCost / route.orderCount
          });
        }
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-orders-for-dispatch"] });
      toast({ title: "Plan Submitted", description: "Dispatch plan sent for Admin/Super Admin approval" });
      setShowApprovalDialog(false);
      setGroupedRoutes([]);
      setSelectedOrders(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Create manual order
  const createManualOrderMutation = useMutation({
    mutationFn: async () => {
      const insertData: Record<string, unknown> = {
        parsed_customer_name: customers?.find(c => c.id === manualOrder.customer_id)?.company_name || "Manual Order",
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
      queryClient.invalidateQueries({ queryKey: ["pending-orders-for-dispatch"] });
      toast({ title: "Order Created", description: "Manual order added to dispatch queue" });
      setManualOrderDialogOpen(false);
      setManualOrder({ customer_id: "", pickup_address: "", delivery_address: "", cargo_description: "", weight_kg: "", priority: "normal" });
    }
  });

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
              <p className="text-2xl font-bold">{pendingOrders?.length || 0}</p>
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
              <p className="text-sm text-muted-foreground">Vehicles Available</p>
              <p className="text-2xl font-bold">{vehicles?.length || 0}</p>
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
              <h4 className="font-medium text-primary">Dispatch Creation Workflow</h4>
              <p className="text-sm text-muted-foreground mt-1">
                1. Select orders from the queue below (from Customer Portal, Manual, or Inbox) → 
                2. Click "Auto-Group Routes" to optimize by destination → 
                3. Review vehicle suggestions → 
                4. Submit for Admin/Super Admin approval
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button onClick={() => setManualOrderDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Manual Order
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleAutoGroup}
          disabled={selectedOrders.size === 0 || isGrouping}
        >
          {isGrouping ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 mr-2" />
          )}
          Auto-Group Routes
        </Button>
        {groupedRoutes.length > 0 && (
          <Button onClick={() => setShowApprovalDialog(true)} className="bg-green-600 hover:bg-green-700">
            <Send className="w-4 h-4 mr-2" />
            Submit for Approval
          </Button>
        )}
      </div>

      {/* Orders Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Orders Queue</CardTitle>
              <CardDescription>Select orders to create dispatch plan</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={selectAllOrders}>
              {selectedOrders.size === (pendingOrders?.length || 0) ? "Deselect All" : "Select All"}
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
                <TableHead>Delivery Address</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingOrders?.map((order) => (
                <TableRow key={order.id} className={selectedOrders.has(order.id) ? "bg-primary/5" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={() => toggleOrderSelection(order.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{order.source}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{order.customer_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 max-w-48 truncate">
                      <MapPin className="w-3 h-3" />
                      {order.delivery_address?.split(",")[0]}
                    </div>
                  </TableCell>
                  <TableCell>{order.weight_kg ? `${order.weight_kg} kg` : "-"}</TableCell>
                  <TableCell>
                    <Badge variant={order.priority === "high" ? "destructive" : order.priority === "urgent" ? "destructive" : "secondary"}>
                      {order.priority}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {(!pendingOrders || pendingOrders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No pending orders. Create a manual order or wait for customer orders.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Grouped Routes Preview */}
      {groupedRoutes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Optimized Route Groups
            </CardTitle>
            <CardDescription>Review suggested groupings and vehicle assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupedRoutes.map((route) => (
                <div key={route.id} className="p-4 rounded-lg border bg-muted/30">
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
                      <p className="text-sm text-muted-foreground mt-1">₦{route.estimatedCost.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    <span>Why: {route.suggestedVehicle.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Order Dialog */}
      <Dialog open={manualOrderDialogOpen} onOpenChange={setManualOrderDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Manual Order</DialogTitle>
            <DialogDescription>Add an order directly to the dispatch queue</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={manualOrder.customer_id} onValueChange={(v) => setManualOrder(prev => ({ ...prev, customer_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div className="space-y-2">
              <Label>Cargo Description</Label>
              <Textarea
                value={manualOrder.cargo_description}
                onChange={(e) => setManualOrder(prev => ({ ...prev, cargo_description: e.target.value }))}
                placeholder="Describe the cargo..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOrderDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createManualOrderMutation.mutate()} disabled={createManualOrderMutation.isPending}>
              {createManualOrderMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit for Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Dispatch Plan</DialogTitle>
            <DialogDescription>
              This plan will be sent to Admin or Super Admin for approval before execution
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
                  <span className="text-muted-foreground">Est. Cost:</span>
                  <span className="ml-2 font-medium">₦{groupedRoutes.reduce((s, r) => s + r.estimatedCost, 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes for Approver (Optional)</Label>
              <Textarea
                value={planNotes}
                onChange={(e) => setPlanNotes(e.target.value)}
                placeholder="Any special instructions or context..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
            <Button onClick={() => submitPlanMutation.mutate()} disabled={submitPlanMutation.isPending}>
              {submitPlanMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchCreationPanel;
