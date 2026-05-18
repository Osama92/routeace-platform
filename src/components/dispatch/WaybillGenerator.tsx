import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  FileText,
  Printer,
  Download,
  CheckCircle,
  Clock,
  Truck,
  Phone,
  MapPin,
  Package,
  Users,
  Eye
} from "lucide-react";
import { format } from "date-fns";

interface WaybillData {
  id: string;
  waybill_number: string;
  dispatch_id?: string;
  plan_id?: string;
  vehicle?: { registration_number: string; truck_type: string };
  driver?: { full_name: string; phone: string };
  route_summary: string;
  total_drops: number;
  status: string;
  generated_at: string;
  items?: WaybillItem[];
}

interface WaybillItem {
  id: string;
  customer_name: string;
  phone: string;
  delivery_address: string;
  item_description: string;
  sequence_order: number;
  delivered_at?: string;
}

const WaybillGenerator = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Fetch approved dispatch plans that need waybills
  const { data: approvedPlans } = useQuery({
    queryKey: ["approved-plans-for-waybill"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_plans")
        .select(`
          *,
          dispatch_plan_items (
            id,
            order_id,
            route_group,
            suggested_vehicle_type,
            order_inbox (customer_name, delivery_address, item_description)
          )
        `)
        .eq("status", "approved")
        .order("approved_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch existing waybills
  const { data: waybills } = useQuery({
    queryKey: ["waybills-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("waybills")
        .select(`
          *,
          vehicles (registration_number, truck_type),
          drivers (full_name, phone),
          waybill_items (*)
        `)
        .order("generated_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as any[];
    }
  });

  // Generate waybill from approved plan
  const generateWaybillMutation = useMutation({
    mutationFn: async (planId: string) => {
      const plan = approvedPlans?.find(p => p.id === planId);
      if (!plan) throw new Error("Plan not found");

      // Generate waybill number
      const waybillNumber = `WB-${format(new Date(), "yyyyMMdd")}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create waybill
      const { data: waybill, error: waybillError } = await supabase
        .from("waybills")
        .insert({
          waybill_number: waybillNumber,
          plan_id: planId,
          route_summary: plan.notes || `${plan.total_orders} orders across ${new Set(plan.dispatch_plan_items?.map((i: any) => i.route_group)).size} areas`,
          total_drops: plan.total_orders,
          generated_by: user?.id,
          status: "generated"
        })
        .select()
        .single();

      if (waybillError) throw waybillError;

      // Create waybill items from plan items
      const waybillItems = plan.dispatch_plan_items?.map((item: any, index: number) => ({
        waybill_id: waybill.id,
        customer_name: item.order_inbox?.customer_name || "Unknown",
        phone: "",
        delivery_address: item.order_inbox?.delivery_address || "",
        item_description: item.order_inbox?.item_description || "",
        sequence_order: index + 1
      })) || [];

      if (waybillItems.length > 0) {
        const { error: itemsError } = await supabase.from("waybill_items").insert(waybillItems);
        if (itemsError) throw itemsError;
      }

      // Update plan status
      await supabase.from("dispatch_plans").update({ status: "executed" }).eq("id", planId);

      return waybill;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["waybills-list"] });
      queryClient.invalidateQueries({ queryKey: ["approved-plans-for-waybill"] });
      toast({ title: "Waybill Generated", description: "Manifest is ready for printing" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handlePrint = (waybill: WaybillData) => {
    setSelectedWaybill(waybill);
    setPreviewOpen(true);
  };

  const printWaybill = () => {
    window.print();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generated": return "secondary";
      case "printed": return "default";
      case "in_use": return "default";
      case "completed": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Pending Plans Section */}
      {approvedPlans && approvedPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Approved Plans Awaiting Waybill
            </CardTitle>
            <CardDescription>Generate waybills for approved dispatch plans</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvedPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono">{plan.plan_number}</TableCell>
                    <TableCell>{format(new Date(plan.planned_date), "MMM d, yyyy")}</TableCell>
                    <TableCell>{plan.total_orders}</TableCell>
                    <TableCell>{plan.total_distance_km} km</TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        onClick={() => generateWaybillMutation.mutate(plan.id)}
                        disabled={generateWaybillMutation.isPending}
                      >
                        <FileText className="w-4 h-4 mr-1" />
                        Generate Waybill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Waybills List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Delivery Waybills / Manifests
          </CardTitle>
          <CardDescription>View and print delivery manifests</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Waybill #</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Drops</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waybills?.map((waybill) => (
                <TableRow key={waybill.id}>
                  <TableCell className="font-mono">{waybill.waybill_number}</TableCell>
                  <TableCell>
                    {waybill.vehicles ? (
                      <div className="flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {waybill.vehicles.registration_number}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {waybill.drivers ? (
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {waybill.drivers.full_name}
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell>{waybill.total_drops}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(waybill.status)}>{waybill.status}</Badge>
                  </TableCell>
                  <TableCell>{format(new Date(waybill.generated_at), "MMM d, HH:mm")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => handlePrint(waybill)}>
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrint(waybill)}>
                        <Printer className="w-3 h-3 mr-1" />
                        Print
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!waybills || waybills.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No waybills generated yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Waybill Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl print:max-w-full print:w-full print:h-full print:fixed print:inset-0 print:z-[9999]">
          <DialogHeader className="print:hidden">
            <DialogTitle>Waybill / Manifest</DialogTitle>
          </DialogHeader>
          
          {selectedWaybill && (
            <div className="space-y-4 print:p-8">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-2xl font-bold">DELIVERY MANIFEST</h2>
                  <p className="text-lg font-mono">{selectedWaybill.waybill_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Generated</p>
                  <p className="font-medium">{format(new Date(selectedWaybill.generated_at), "MMM d, yyyy HH:mm")}</p>
                </div>
              </div>

              {/* Vehicle & Driver Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Truck className="w-4 h-4" /> Vehicle
                  </p>
                  <p className="font-medium">
                    {selectedWaybill.vehicle?.registration_number || "Not assigned"}
                    {selectedWaybill.vehicle?.truck_type && ` (${selectedWaybill.vehicle.truck_type})`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="w-4 h-4" /> Driver
                  </p>
                  <p className="font-medium">
                    {selectedWaybill.driver?.full_name || "Not assigned"}
                  </p>
                  {selectedWaybill.driver?.phone && (
                    <a href={`tel:${selectedWaybill.driver.phone}`} className="text-sm text-primary flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {selectedWaybill.driver.phone}
                    </a>
                  )}
                </div>
              </div>

              {/* Route Summary */}
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground">Route Summary</p>
                <p className="font-medium">{selectedWaybill.route_summary}</p>
                <p className="text-sm mt-1">Total Drops: <span className="font-bold">{selectedWaybill.total_drops}</span></p>
              </div>

              {/* Delivery Items */}
              <div>
                <h3 className="font-semibold mb-2">Delivery Schedule</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="print:block hidden">Signature</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedWaybill.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-bold">{item.sequence_order}</TableCell>
                        <TableCell className="font-medium">{item.customer_name}</TableCell>
                        <TableCell>
                          {item.phone ? (
                            <a href={`tel:${item.phone}`} className="text-primary flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {item.phone}
                            </a>
                          ) : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-start gap-1 max-w-40">
                            <MapPin className="w-3 h-3 mt-1 flex-shrink-0" />
                            <span className="text-sm">{item.delivery_address}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{item.item_description || "-"}</TableCell>
                        <TableCell className="print:block hidden">
                          <div className="h-12 border-b border-dashed"></div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Print Button */}
              <div className="flex justify-end gap-2 print:hidden">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
                <Button onClick={printWaybill}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Manifest
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaybillGenerator;
