import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Package, 
  MapPin, 
  Clock, 
  CheckCircle, 
  Truck,
  Navigation,
  Camera,
  DollarSign,
  Star,
  AlertTriangle,
  Play,
  XCircle
} from "lucide-react";
import { format } from "date-fns";


const statusColors: Record<string, string> = {
  pending: "secondary",
  assigned: "default",
  picked_up: "default",
  in_transit: "default",
  delivered: "default",
  cancelled: "destructive",
};

const DriverDashboard = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("jobs");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [statusNotes, setStatusNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // Fetch driver profile
  const { data: driverProfile, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch assigned dispatches
  const { data: myDispatches } = useQuery({
    queryKey: ["driver-dispatches", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          *,
          customers (company_name, phone),
          vehicles (registration_number, truck_type)
        `)
        .eq("driver_id", driverProfile.id)
        .in("status", ["assigned", "picked_up", "in_transit"])
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!driverProfile
  });

  // Fetch completed trips for earnings
  const { data: completedTrips } = useQuery({
    queryKey: ["driver-completed-trips", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select("*")
        .eq("driver_id", driverProfile.id)
        .eq("status", "delivered")
        .order("actual_delivery", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: !!driverProfile
  });

  // Fetch driver earnings
  const { data: earnings } = useQuery({
    queryKey: ["driver-earnings", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return { total: 0, pending: 0, paid: 0 };
      const { data, error } = await supabase
        .from("driver_salaries")
        .select("gross_amount, status")
        .eq("driver_id", driverProfile.id);
      
      if (error) throw error;
      
      const total = data?.reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      const paid = data?.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      const pending = data?.filter(s => s.status === "pending").reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      
      return { total, pending, paid };
    },
    enabled: !!driverProfile
  });

  // Update dispatch status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ dispatchId, status, notes }: { dispatchId: string; status: string; notes: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      
      if (status === "picked_up") {
        updateData.actual_pickup = new Date().toISOString();
      } else if (status === "delivered") {
        updateData.actual_delivery = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from("dispatches")
        .update(updateData)
        .eq("id", dispatchId);
      
      if (error) throw error;

      // Log the status update
      await supabase.from("delivery_updates").insert({
        dispatch_id: dispatchId,
        status,
        notes,
        updated_by: user?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["driver-completed-trips"] });
      toast({ title: "Success", description: "Status updated successfully" });
      setStatusDialogOpen(false);
      setStatusNotes("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const openStatusDialog = (dispatch: any, status: string) => {
    setSelectedDispatch(dispatch);
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = {
      assigned: "picked_up",
      picked_up: "in_transit",
      in_transit: "delivered"
    };
    return statusFlow[currentStatus] || null;
  };

  const getStatusAction = (status: string) => {
    const actions: Record<string, { label: string; icon: any }> = {
      picked_up: { label: "Confirm Pickup", icon: Package },
      in_transit: { label: "Start Transit", icon: Navigation },
      delivered: { label: "Confirm Delivery", icon: CheckCircle }
    };
    return actions[status] || { label: "Update", icon: Play };
  };

  if (!driverProfile && !isLoadingProfile) {
    return (
      <DashboardLayout title="Driver Dashboard" subtitle="">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-6">
          <Truck className="w-16 h-16 text-muted-foreground" />
          <h2 className="text-xl font-semibold">No driver profile linked</h2>
          <p className="text-muted-foreground max-w-sm">
            Your account hasn't been linked to a driver profile yet. Ask your administrator to link your user account to your driver record.
          </p>
          <p className="text-sm text-muted-foreground">
            Your user ID: <code className="bg-muted px-2 py-1 rounded text-xs">{user?.id}</code>
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Driver Dashboard" subtitle="Manage your deliveries and track earnings">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{myDispatches?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{driverProfile?.total_trips || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Star className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{driverProfile?.rating?.toFixed(1) || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Earnings (Pending)</p>
                <p className="text-2xl font-bold">₦{((earnings?.pending || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="history">Trip History</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-4">
          
        </TabsContent>

        {/* Active Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {!myDispatches || myDispatches.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Active Jobs</h3>
                <p className="text-muted-foreground">You'll see your assigned deliveries here</p>
              </CardContent>
            </Card>
          ) : (
            myDispatches.map((dispatch) => {
              const nextStatus = getNextStatus(dispatch.status);
              const statusAction = nextStatus ? getStatusAction(nextStatus) : null;
              
              return (
                <Card key={dispatch.id} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dispatch.dispatch_number}</CardTitle>
                        <CardDescription>{dispatch.customers?.company_name}</CardDescription>
                      </div>
                      <Badge variant={statusColors[dispatch.status] as any}>
                        {dispatch.status?.replace("_", " ")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <MapPin className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Pickup</p>
                          <p className="text-sm font-medium">{dispatch.pickup_address}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <MapPin className="w-4 h-4 text-red-500" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Delivery</p>
                          <p className="text-sm font-medium">{dispatch.delivery_address}</p>
                        </div>
                      </div>
                    </div>

                    {dispatch.vehicles && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Truck className="w-4 h-4" />
                        <span>{dispatch.vehicles.registration_number} • {dispatch.vehicles.truck_type}</span>
                      </div>
                    )}

                    {dispatch.scheduled_pickup && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Scheduled: {format(new Date(dispatch.scheduled_pickup), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {statusAction && (
                        <Button 
                          onClick={() => openStatusDialog(dispatch, nextStatus!)}
                          className="flex-1"
                        >
                          <statusAction.icon className="w-4 h-4 mr-2" />
                          {statusAction.label}
                        </Button>
                      )}
                      <Button variant="outline" size="icon">
                        <Camera className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Trip History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Trips</CardTitle>
              <CardDescription>Your completed deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedTrips?.map((trip) => (
                  <div key={trip.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <p className="font-medium">{trip.dispatch_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {trip.pickup_address} → {trip.delivery_address}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Delivered: {trip.actual_delivery ? format(new Date(trip.actual_delivery), "MMM d, yyyy HH:mm") : "-"}
                      </p>
                    </div>
                    <Badge variant="default">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Completed
                    </Badge>
                  </div>
                ))}
                {(!completedTrips || completedTrips.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    No completed trips yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Earnings Tab */}
        <TabsContent value="earnings">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold">₦{(earnings?.total || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Paid Out</p>
                  <p className="text-3xl font-bold text-green-500">₦{(earnings?.paid || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-3xl font-bold text-yellow-500">₦{(earnings?.pending || 0).toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Earnings Breakdown</CardTitle>
              <CardDescription>Your salary and bonus history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Detailed earnings breakdown will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Confirm status update for {selectedDispatch?.dispatch_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Current Status</p>
              <p className="font-medium capitalize">{selectedDispatch?.status?.replace("_", " ")}</p>
            </div>
            <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
              <p className="text-sm text-muted-foreground">New Status</p>
              <p className="font-medium capitalize">{newStatus?.replace("_", " ")}</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea 
                placeholder="Add any notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => updateStatusMutation.mutate({ 
                dispatchId: selectedDispatch?.id, 
                status: newStatus,
                notes: statusNotes 
              })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Updating..." : "Confirm Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default DriverDashboard;
