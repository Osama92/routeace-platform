import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import RouteRiskRegister from "@/components/operations/RouteRiskRegister";
import OpsSOPsDocumentation from "@/components/operations/OpsSOPsDocumentation";
import WeeklyOpsDashboard from "@/components/operations/WeeklyOpsDashboard";
import useTenantMode from "@/hooks/useTenantMode";
import { DeptOpsManagerDashboard } from "@/pages/dept/DeptDashboards";
import FleetMaintenancePanel from "@/components/fleet/FleetMaintenancePanel";
import SOPDiagnosisPanel from "@/components/operations/SOPDiagnosisPanel";
import WaitDaysKPICard from "@/components/kpi/WaitDaysKPICard";
import SelfLearningInsights from "@/components/dispatch/SelfLearningInsights";
import SLARiskPanel from "@/components/sla/SLARiskPanel";
import FleetKPIPanel from "@/components/fleet/FleetKPIPanel";
import OrderIntakeEngine from "@/components/operations/OrderIntakeEngine";
import WaybillEngine from "@/components/operations/WaybillEngine";
import OpsOnboardingChecklist from "@/components/operations/OpsOnboardingChecklist";
import CreateDispatchDialog from "@/components/operations/CreateDispatchDialog";
import CreateVehicleDialog from "@/components/operations/CreateVehicleDialog";
import CreateDriverDialog from "@/components/operations/CreateDriverDialog";
import {
  Truck, Users, Package, AlertTriangle, CheckCircle, Clock, MapPin,
  Wrench, TrendingUp, FileText, RefreshCw, Shield, Brain, Gauge,
  Inbox, Plus, Route, ArrowRight,
} from "lucide-react";
import { format } from "date-fns";

const OpsManagerDashboard = () => {
  const { isDepartment } = useTenantMode();
  if (isDepartment) return <DeptOpsManagerDashboard />;
  return <OpsManagerDashboardInner />;
};

const OpsManagerDashboardInner = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("command-center");
  const orgFilter = organizationId ?? "00000000-0000-0000-0000-000000000000";

  // Fetch active dispatches
  const { data: dispatches } = useQuery({
    queryKey: ["ops-dispatches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`*, customers (company_name), drivers (full_name), vehicles (registration_number, truck_type)`)
        .in("status", ["pending", "assigned", "in_transit", "picked_up"])
        .eq("organization_id", orgFilter)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: availableDrivers } = useQuery({
    queryKey: ["available-drivers", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, status")
        .eq("status", "active")
        .eq("organization_id", orgFilter);
      if (error) throw error;
      return data;
    },
  });

  const { data: availableVehicles } = useQuery({
    queryKey: ["available-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, truck_type, status")
        .eq("status", "active")
        .eq("organization_id", orgFilter);
      if (error) throw error;
      return data;
    },
  });

  const { data: fleetHealth } = useQuery({
    queryKey: ["fleet-health", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, status")
        .eq("organization_id", orgFilter)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter((v) => v.status === "active").length || 0,
        maintenance: data?.filter((v) => v.status === "maintenance").length || 0,
      };
    },
  });

  const { data: pendingOrders } = useQuery({
    queryKey: ["ops-pending-orders", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { count, error } = await (supabase.from("order_inbox") as any)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("organization_id", orgFilter);
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: todayDispatches } = useQuery({
    queryKey: ["ops-today-dispatches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count, error } = await supabase
        .from("dispatches")
        .select("id", { count: "exact", head: true })
        .gte("created_at", today)
        .eq("organization_id", orgFilter);
      if (error) throw error;
      return count || 0;
    },
  });

  const sendDriverJobSMS = async (
    dispatchId: string,
    driverId: string
  ) => {
    // Read the dispatch fresh from DB to get the current vehicle_id
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("dispatch_number, pickup_address, delivery_address, scheduled_pickup, vehicle_id")
      .eq("id", dispatchId)
      .maybeSingle();

    if (!dispatch?.vehicle_id) {
      toast({
        title: "Assign a vehicle first",
        description: "Select a vehicle for this dispatch before assigning the driver.",
        variant: "destructive",
      });
      return;
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("vehicle_category, vehicle_type, registration_number")
      .eq("id", dispatch.vehicle_id)
      .maybeSingle();

    if (!vehicle) return;

    if (vehicle.vehicle_category === "light") {
      const { data: driver } = await supabase
        .from("drivers")
        .select("phone, full_name")
        .eq("id", driverId)
        .maybeSingle();

      if (!driver?.phone) {
        toast({
          title: "SMS not sent",
          description: "Driver has no phone number on record. Assign manually.",
          variant: "destructive",
        });
        return;
      }

      const message =
        `RouteAce: New job assigned to you.\n` +
        `Job: ${dispatch.dispatch_number ?? dispatchId.slice(0, 8)}\n` +
        `Pickup: ${dispatch.pickup_address ?? "See app"}\n` +
        `Delivery: ${dispatch.delivery_address ?? "See app"}\n` +
        `Open RouteAce app to accept or decline.`;

      try {
        await supabase.functions.invoke("send-sms-notification", {
          body: { phoneNumbers: [driver.phone], message, type: "job_assignment" },
        });
        await (supabase.from("driver_job_notifications") as any)
          .update({ sms_sent: true })
          .eq("dispatch_id", dispatchId);
        toast({
          title: "Job sent to driver",
          description: `SMS sent to ${driver.full_name}. They will accept or decline in the app.`,
        });
      } catch {
        toast({
          title: "SMS failed - notify driver manually",
          description: "The job is assigned in the system. Contact the driver directly.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Heavy vehicle - contact driver manually",
        description:
          `${vehicle.vehicle_type} (${vehicle.registration_number}) assigned. ` +
          `This vehicle does not use the driver app. Call or WhatsApp the driver to confirm.`,
        duration: 8000,
      });
    }
  };

  const assignDriverMutation = useMutation({
    mutationFn: async ({
      dispatchId,
      driverId,
    }: {
      dispatchId: string;
      driverId: string;
    }) => {
      const { error } = await (supabase.from("dispatches") as any)
        .update({ driver_id: driverId, status: "assigned" })
        .eq("id", dispatchId)
        .eq("organization_id", orgFilter);
      if (error) throw error;
      return { dispatchId, driverId };
    },
    onSuccess: async ({ dispatchId, driverId }) => {
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches", organizationId] });
      await sendDriverJobSMS(dispatchId, driverId);
    },
  });

  const assignVehicleMutation = useMutation({
    mutationFn: async ({ dispatchId, vehicleId }: { dispatchId: string; vehicleId: string }) => {
      const { error } = await (supabase.from("dispatches") as any)
        .update({ vehicle_id: vehicleId })
        .eq("id", dispatchId)
        .eq("organization_id", orgFilter);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches", organizationId] });
      toast({ title: "Vehicle assigned" });
    },
  });

  const approveCompletionMutation = useMutation({
    mutationFn: async (dispatchId: string) => {
      const { error } = await (supabase.from("dispatches") as any)
        .update({ status: "delivered", actual_delivery: new Date().toISOString() })
        .eq("id", dispatchId)
        .eq("organization_id", orgFilter);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches", organizationId] });
      toast({ title: "Trip completed" });
    },
  });

  return (
    <DashboardLayout title="Operations Command Center" subtitle="Logistics OS - Fleet, dispatch, and order management">
      {/* Onboarding Checklist */}
      <OpsOnboardingChecklist
        fleetCount={fleetHealth?.total || 0}
        vehicleCount={fleetHealth?.total || 0}
        driverCount={availableDrivers?.length || 0}
        dispatchCount={dispatches?.length || 0}
        orderCount={pendingOrders || 0}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 mb-6">
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("order-intake")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10"><Inbox className="w-4 h-4 text-amber-600" /></div>
              <div>
                <p className="text-xl font-bold">{pendingOrders || 0}</p>
                <p className="text-[10px] text-muted-foreground">Pending Orders</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("dispatches")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10"><Package className="w-4 h-4 text-primary" /></div>
              <div>
                <p className="text-xl font-bold">{dispatches?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Active Dispatches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10"><Package className="w-4 h-4 text-blue-600" /></div>
              <div>
                <p className="text-xl font-bold">{todayDispatches || 0}</p>
                <p className="text-[10px] text-muted-foreground">Today's Dispatches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:ring-1 hover:ring-primary/30 transition-all" onClick={() => setActiveTab("fleet")}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10"><Truck className="w-4 h-4 text-green-600" /></div>
              <div>
                <p className="text-xl font-bold">{fleetHealth?.active || 0}/{fleetHealth?.total || 0}</p>
                <p className="text-[10px] text-muted-foreground">Fleet Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-yellow-500/10"><Wrench className="w-4 h-4 text-yellow-600" /></div>
              <div>
                <p className="text-xl font-bold">{fleetHealth?.maintenance || 0}</p>
                <p className="text-[10px] text-muted-foreground">In Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10"><Users className="w-4 h-4 text-emerald-600" /></div>
              <div>
                <p className="text-xl font-bold">{availableDrivers?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground">Drivers Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <CreateDispatchDialog />
        <CreateDriverDialog />
        <CreateVehicleDialog />
        <Button size="sm" variant="outline" onClick={() => navigate("/advanced-route-planner")}><Route className="w-3 h-3 mr-1" />Plan Route</Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/customers")}><Plus className="w-3 h-3 mr-1" />Add Customer</Button>
        <Button size="sm" variant="outline" onClick={() => navigate("/approval-center")}><CheckCircle className="w-3 h-3 mr-1" />Approvals</Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="command-center">Command Center</TabsTrigger>
          <TabsTrigger value="order-intake">
            <Inbox className="w-3 h-3 mr-1" />Order Intake
          </TabsTrigger>
          <TabsTrigger value="dispatches">Dispatches</TabsTrigger>
          <TabsTrigger value="waybills">
            <FileText className="w-3 h-3 mr-1" />Waybills
          </TabsTrigger>
          <TabsTrigger value="sla-risk">
            <Shield className="w-3 h-3 mr-1" />SLA Risk
          </TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="risks">Route Risks</TabsTrigger>
          <TabsTrigger value="sops">SOPs</TabsTrigger>
          <TabsTrigger value="owd">OWD Reports</TabsTrigger>
          <TabsTrigger value="ai-insights">
            <Brain className="w-3 h-3 mr-1" />AI
          </TabsTrigger>
          <TabsTrigger value="fleet-kpis">
            <Gauge className="w-3 h-3 mr-1" />KPIs
          </TabsTrigger>
        </TabsList>

        {/* Command Center - Overview */}
        <TabsContent value="command-center">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Active Dispatches Summary */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Active Dispatches</CardTitle>
                  <Button size="sm" variant="ghost" onClick={() => setActiveTab("dispatches")}>
                    View All <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {dispatches?.slice(0, 8).map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground">{d.dispatch_number}</span>
                          <span className="truncate">{(d.customers as any)?.company_name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-xs">{d.status}</Badge>
                          <span className="text-xs text-muted-foreground">{d.drivers ? (d.drivers as any).full_name : "Unassigned"}</span>
                        </div>
                      </div>
                    ))}
                    {(!dispatches || dispatches.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">No active dispatches</p>
                        <CreateDispatchDialog />
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Right Utility Panel */}
            <div className="space-y-4">
              {/* Alerts */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(fleetHealth?.maintenance || 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 text-sm">
                      <Wrench className="w-3.5 h-3.5 text-yellow-600" />
                      <span>{fleetHealth?.maintenance} vehicle(s) in maintenance</span>
                    </div>
                  )}
                  {(pendingOrders || 0) > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 text-sm">
                      <Inbox className="w-3.5 h-3.5 text-amber-600" />
                      <span>{pendingOrders} pending order(s)</span>
                    </div>
                  )}
                  {dispatches?.some((d) => !d.driver_id) && (
                    <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 text-sm">
                      <Users className="w-3.5 h-3.5 text-red-600" />
                      <span>{dispatches.filter((d) => !d.driver_id).length} unassigned dispatch(es)</span>
                    </div>
                  )}
                  {(fleetHealth?.maintenance || 0) === 0 && (pendingOrders || 0) === 0 && !dispatches?.some((d) => !d.driver_id) && (
                    <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 text-sm">
                      <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                      <span>All systems normal</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Tasks Due Today */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />Today's Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setActiveTab("order-intake")}>
                    <span>Review pending orders</span>
                    <Badge variant="secondary">{pendingOrders || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setActiveTab("dispatches")}>
                    <span>Assign unassigned dispatches</span>
                    <Badge variant="secondary">{dispatches?.filter((d) => !d.driver_id).length || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setActiveTab("maintenance")}>
                    <span>Check maintenance schedule</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Order Intake */}
        <TabsContent value="order-intake">
          <OrderIntakeEngine />
        </TabsContent>

        {/* Dispatches */}
        <TabsContent value="dispatches">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Dispatches</CardTitle>
                  <CardDescription>Assign drivers, vehicles, and manage trip status</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["ops-dispatches"] })}>
                  <RefreshCw className="w-4 h-4 mr-1" />Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dispatches && dispatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dispatches.map((dispatch) => (
                      <TableRow key={dispatch.id}>
                        <TableCell className="font-mono text-sm">{dispatch.dispatch_number}</TableCell>
                        <TableCell>{(dispatch.customers as any)?.company_name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-32">{dispatch.pickup_address?.split(",")[0]}</span>
                            <span>→</span>
                            <span className="truncate max-w-32">{dispatch.delivery_address?.split(",")[0]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {dispatch.driver_id ? (
                            <span>{(dispatch.drivers as any)?.full_name}</span>
                          ) : (
                            <Select onValueChange={(value) => assignDriverMutation.mutate({ dispatchId: dispatch.id, driverId: value })}>
                              <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Assign" /></SelectTrigger>
                              <SelectContent>
                                {availableDrivers?.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          {dispatch.vehicle_id ? (
                            <span>{(dispatch.vehicles as any)?.registration_number || "Assigned"}</span>
                          ) : (
                            <Select onValueChange={(value) => assignVehicleMutation.mutate({ dispatchId: dispatch.id, vehicleId: value })}>
                              <SelectTrigger className="w-32 h-8"><SelectValue placeholder="Assign" /></SelectTrigger>
                              <SelectContent>
                                {availableVehicles?.map((v: any) => (
                                  <SelectItem key={v.id} value={v.id}>{v.registration_number}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{dispatch.status}</Badge></TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {dispatch.status === "in_transit" && (
                              <Button size="sm" variant="outline" onClick={() => approveCompletionMutation.mutate(dispatch.id)}>
                                <CheckCircle className="w-3 h-3 mr-1" />Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No active dispatches</p>
                  <CreateDispatchDialog />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Waybills */}
        <TabsContent value="waybills"><WaybillEngine /></TabsContent>

        {/* SLA Risk */}
        <TabsContent value="sla-risk"><SLARiskPanel /></TabsContent>

        {/* Fleet Health */}
        <TabsContent value="fleet">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Health Monitor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-green-500/10 text-center">
                  <p className="text-3xl font-bold text-green-600">{fleetHealth?.active || 0}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
                <div className="p-4 rounded-lg bg-yellow-500/10 text-center">
                  <p className="text-3xl font-bold text-yellow-600">{fleetHealth?.maintenance || 0}</p>
                  <p className="text-sm text-muted-foreground">In Maintenance</p>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-3xl font-bold">{fleetHealth?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Fleet</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance"><FleetMaintenancePanel /></TabsContent>
        <TabsContent value="weekly"><WeeklyOpsDashboard /></TabsContent>
        <TabsContent value="risks"><RouteRiskRegister /></TabsContent>
        <TabsContent value="sops"><OpsSOPsDocumentation /></TabsContent>
        <TabsContent value="owd">
          <div className="space-y-6">
            <WaitDaysKPICard />
            <SOPDiagnosisPanel />
          </div>
        </TabsContent>
        <TabsContent value="ai-insights"><SelfLearningInsights /></TabsContent>
        <TabsContent value="fleet-kpis"><FleetKPIPanel /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default OpsManagerDashboard;
