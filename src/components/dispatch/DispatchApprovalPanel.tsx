import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Package,
  Truck,
  MapPin,
  AlertTriangle,
  Send
} from "lucide-react";
import { format } from "date-fns";

const DispatchApprovalPanel = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Check if user can approve (Admin or Super Admin only)
  const canApprove = userRole === "admin" || userRole === "super_admin";

  // Fetch pending dispatch plans
  const { data: pendingPlans, isLoading } = useQuery({
    queryKey: ["pending-dispatch-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_plans")
        .select(`
          *,
          profiles:created_by (full_name, email),
          dispatch_plan_items (
            id,
            route_group,
            suggested_vehicle_type,
            estimated_distance_km,
            estimated_cost,
            order_inbox (customer_name, delivery_address, pickup_address)
          )
        `)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch approved/rejected plans history
  const { data: planHistory } = useQuery({
    queryKey: ["dispatch-plans-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatch_plans")
        .select(`
          *,
          profiles:created_by (full_name),
          approved_profiles:approved_by (full_name)
        `)
        .in("status", ["approved", "rejected"])
        .order("approved_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    }
  });

  // Approve plan mutation
  const approveMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("dispatch_plans")
        .update({
          status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-dispatch-plans"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-plans-history"] });
      toast({ title: "Plan Approved", description: "Dispatch plan has been approved for execution" });
      setDetailsOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Reject plan mutation
  const rejectMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("dispatch_plans")
        .update({
          status: "rejected",
          rejection_reason: rejectionReason,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq("id", planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-dispatch-plans"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-plans-history"] });
      toast({ title: "Plan Rejected", description: "Dispatch plan has been rejected" });
      setRejectDialogOpen(false);
      setDetailsOpen(false);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const openDetails = (plan: any) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  const openRejectDialog = () => {
    setRejectDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending_approval": return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "approved": return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case "rejected": return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Group items by route for display
  const groupByRoute = (items: any[]) => {
    const groups: Record<string, any[]> = {};
    items?.forEach(item => {
      const route = item.route_group || "Unassigned";
      if (!groups[route]) groups[route] = [];
      groups[route].push(item);
    });
    return groups;
  };

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Pending Dispatch Plans
          </CardTitle>
          <CardDescription>
            {canApprove 
              ? "Review and approve or reject dispatch plans from Operations Managers"
              : "View pending dispatch plans (approval requires Admin/Super Admin role)"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingPlans && pendingPlans.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan #</TableHead>
                  <TableHead>Submitted By</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Est. Distance</TableHead>
                  <TableHead>Est. Cost</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingPlans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-mono">{plan.plan_number}</TableCell>
                    <TableCell>{(plan.profiles as any)?.full_name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        <Package className="w-3 h-3 mr-1" />
                        {plan.total_orders}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.total_distance_km?.toFixed(0) || 0} km</TableCell>
                    <TableCell className="font-medium">₦{(plan.total_cost || 0).toLocaleString()}</TableCell>
                    <TableCell>{format(new Date(plan.created_at), "MMM d, HH:mm")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openDetails(plan)}>
                          <Eye className="w-3 h-3 mr-1" />
                          Review
                        </Button>
                        {canApprove && (
                          <>
                            <Button 
                              size="sm" 
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => approveMutation.mutate(plan.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Approve
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No pending dispatch plans</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Approval History</CardTitle>
          <CardDescription>Recently approved and rejected plans</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan #</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed By</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {planHistory?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell className="font-mono">{plan.plan_number}</TableCell>
                  <TableCell>{plan.total_orders}</TableCell>
                  <TableCell>{getStatusBadge(plan.status)}</TableCell>
                  <TableCell>{(plan.approved_profiles as any)?.full_name || "-"}</TableCell>
                  <TableCell>
                    {plan.approved_at ? format(new Date(plan.approved_at), "MMM d, yyyy HH:mm") : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {(!planHistory || planHistory.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No history yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch Plan Review</DialogTitle>
            <DialogDescription>
              Review the dispatch plan details before approval
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Plan Number</p>
                  <p className="font-mono font-medium">{selectedPlan.plan_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="font-medium">{selectedPlan.total_orders}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Distance</p>
                  <p className="font-medium">{selectedPlan.total_distance_km?.toFixed(0) || 0} km</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Est. Cost</p>
                  <p className="font-medium">₦{(selectedPlan.total_cost || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Notes */}
              {selectedPlan.notes && (
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Notes from Ops Manager</p>
                  <p>{selectedPlan.notes}</p>
                </div>
              )}

              {/* Route Groups */}
              <div>
                <h4 className="font-semibold mb-3">Route Breakdown</h4>
                {Object.entries(groupByRoute(selectedPlan.dispatch_plan_items)).map(([route, items]) => (
                  <div key={route} className="mb-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{route}</span>
                      <Badge variant="outline">{items.length} stops</Badge>
                      <Badge variant="secondary">
                        <Truck className="w-3 h-3 mr-1" />
                        {items[0]?.suggested_vehicle_type || "TBD"}
                      </Badge>
                    </div>
                    <div className="space-y-2 pl-6">
                      {items.map((item: any, idx: number) => (
                        <div key={item.id} className="text-sm flex items-start gap-2">
                          <span className="text-muted-foreground">{idx + 1}.</span>
                          <div>
                            <p className="font-medium">{item.order_inbox?.customer_name || "Unknown"}</p>
                            <p className="text-muted-foreground">{item.order_inbox?.delivery_address}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            {canApprove && selectedPlan && (
              <>
                <Button variant="destructive" onClick={openRejectDialog}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => approveMutation.mutate(selectedPlan.id)}
                  disabled={approveMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Plan
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Dispatch Plan</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this plan
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rejection Reason</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this plan is being rejected..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedPlan && rejectMutation.mutate(selectedPlan.id)}
              disabled={!rejectionReason.trim() || rejectMutation.isPending}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DispatchApprovalPanel;
