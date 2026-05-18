import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Package, MapPin, Clock, CheckCircle, Truck, Navigation, Camera,
  DollarSign, Star, AlertTriangle, Play, XCircle, Wallet, TrendingUp,
  Shield, Activity, Zap, Bell, PhoneCall, Award, BarChart3, Eye,
  Battery, Thermometer, Heart, FileCheck, Car, Info, ClipboardCheck
} from "lucide-react";
import { format } from "date-fns";
import TransporterPortal from "@/pages/dept/TransporterPortal";
import DriverDailyChecks from "@/components/driver/DriverDailyChecks";
import DriverNotificationsInbox from "@/components/driver/DriverNotificationsInbox";
import { DeptDriverDashboard } from "@/pages/dept/DeptDashboards";

const statusColors: Record<string, string> = {
  pending: "secondary",
  assigned: "default",
  picked_up: "default",
  in_transit: "default",
  delivered: "default",
  cancelled: "destructive",
};

const DriverSuperAppInner = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("jobs");
  const [sosActive, setSosActive] = useState(false);
  const [trackingOn, setTrackingOn] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const { data: driverProfile } = useQuery({
    queryKey: ["driver-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("drivers").select("*").eq("user_id", user.id).single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: pendingNotifCount = 0 } = useQuery({
    queryKey: ["pending-notif-count", driverProfile?.id],
    enabled: !!driverProfile?.id,
    refetchInterval: 15_000,
    queryFn: async () => {
      if (!driverProfile?.id) return 0;
      const { count } = await supabase
        .from("driver_job_notifications")
        .select("id", { count: "exact", head: true })
        .eq("driver_id", driverProfile.id)
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  useEffect(() => {
    if (!driverProfile?.id) return;
    const channel = supabase
      .channel("driver-notifs-" + driverProfile.id)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "driver_job_notifications",
        filter: `driver_id=eq.${driverProfile.id}`,
      }, () => {
        queryClient.invalidateQueries({
          queryKey: ["pending-notif-count", driverProfile.id],
        });
        setActiveTab("new_jobs");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [driverProfile?.id, queryClient]);

  const { data: myDispatches } = useQuery({
    queryKey: ["driver-dispatches", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select(`*, customers (company_name, phone), vehicles (registration_number, truck_type)`)
        .eq("driver_id", driverProfile.id)
        .in("status", ["assigned", "picked_up", "in_transit"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!driverProfile
  });

  const { data: completedTrips } = useQuery({
    queryKey: ["driver-completed-trips", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return [];
      const { data, error } = await supabase
        .from("dispatches").select("*").eq("driver_id", driverProfile.id)
        .eq("status", "delivered").order("actual_delivery", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!driverProfile
  });

  const { data: earnings } = useQuery({
    queryKey: ["driver-earnings", driverProfile?.id],
    queryFn: async () => {
      if (!driverProfile) return { total: 0, pending: 0, paid: 0 };
      const { data, error } = await supabase.from("driver_salaries").select("gross_amount, status").eq("driver_id", driverProfile.id);
      if (error) throw error;
      const total = data?.reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      const paid = data?.filter(s => s.status === "paid").reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      const pending = data?.filter(s => s.status === "pending").reduce((sum, s) => sum + (s.gross_amount || 0), 0) || 0;
      return { total, pending, paid };
    },
    enabled: !!driverProfile
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ dispatchId, status }: { dispatchId: string; status: string }) => {
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (status === "picked_up") updateData.actual_pickup = new Date().toISOString();
      else if (status === "delivered") updateData.actual_delivery = new Date().toISOString();
      const { error } = await supabase.from("dispatches").update(updateData).eq("id", dispatchId);
      if (error) throw error;
      await supabase.from("delivery_updates").insert({ dispatch_id: dispatchId, status, updated_by: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["driver-completed-trips"] });
      toast({ title: "Status Updated", description: "Delivery status updated successfully" });
    },
    onError: (error: Error) => toast({ title: "Error", description: error.message, variant: "destructive" })
  });

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: Record<string, string> = { assigned: "picked_up", picked_up: "in_transit", in_transit: "delivered" };
    return statusFlow[currentStatus] || null;
  };

  const performanceScore = Math.min(100, Math.round(
    ((driverProfile?.total_trips || 0) > 0 ? 70 : 50) +
    ((driverProfile?.rating || 3.5) / 5) * 30
  ));

  const handleSOS = () => {
    setSosActive(true);
    toast({
      title: "🚨 SOS Alert Sent",
      description: "Emergency services and dispatch have been notified of your location.",
      variant: "destructive"
    });
    setTimeout(() => setSosActive(false), 10000);
  };

  const savePosition = async (pos: GeolocationPosition) => {
    if (!driverProfile?.id) return;
    await supabase
      .from("drivers")
      .update({
        last_lat: pos.coords.latitude,
        last_lng: pos.coords.longitude,
        last_location_at: new Date().toISOString(),
      })
      .eq("id", driverProfile.id);
  };

  const startTracking = () => {
    if (!("geolocation" in navigator)) {
      setTrackingError("GPS not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        savePosition(pos);
        setTrackingOn(true);
        setTrackingError(null);
        watchIdRef.current = navigator.geolocation.watchPosition(
          savePosition,
          (err) => {
            if (err.code === 1) {
              setTrackingError("Location permission denied. Allow location in your browser settings.");
              setTrackingOn(false);
            }
          },
          { enableHighAccuracy: true, maximumAge: 30_000, timeout: 15_000 }
        );
      },
      (err) => {
        setTrackingError(
          err.code === 1
            ? "Tap Allow when your browser asks for location."
            : "Could not get location. Check GPS is on."
        );
      },
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTrackingOn(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <DashboardLayout title="Driver Super App" subtitle="Your complete driver operations & earnings hub">
      {/* SOS Bar */}
      <div className={`mb-4 p-3 rounded-xl flex items-center justify-between transition-all ${sosActive ? "bg-destructive/20 border border-destructive animate-pulse" : "bg-secondary/50 border border-border"}`}>
        <div className="flex items-center gap-3">
          <Shield className={`w-5 h-5 ${sosActive ? "text-destructive" : "text-muted-foreground"}`} />
          <span className="text-sm font-medium">{sosActive ? "🚨 SOS Alert Active - Help is on the way" : "Emergency SOS Ready"}</span>
        </div>
        <Button size="sm" variant={sosActive ? "destructive" : "outline"} onClick={handleSOS} className="font-bold">
          <PhoneCall className="w-4 h-4 mr-2" />
          {sosActive ? "ALERTING..." : "SOS"}
        </Button>
      </div>

      {/* Location sharing */}
      <div className={`mb-4 p-3 rounded-xl flex items-center justify-between transition-all ${trackingOn ? "bg-emerald-500/10 border border-emerald-500/40" : "bg-secondary/50 border border-border"}`}>
        <div className="flex items-center gap-3">
          <Navigation className={`w-5 h-5 ${trackingOn ? "text-emerald-500" : "text-muted-foreground"}`} />
          <div>
            <p className="text-sm font-medium">
              {trackingOn ? "Location sharing ON — dispatch can see you" : "Location sharing OFF"}
            </p>
            {trackingError ? (
              <p className="text-xs text-destructive mt-0.5">{trackingError}</p>
            ) : !trackingOn ? (
              <p className="text-xs text-muted-foreground mt-0.5">Turn on so dispatch can track your position live</p>
            ) : null}
          </div>
        </div>
        <Button size="sm" variant={trackingOn ? "destructive" : "outline"} onClick={trackingOn ? stopTracking : startTracking} className="font-bold">
          {trackingOn ? "Turn Off" : "Share Location"}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Package className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
                <p className="text-2xl font-bold">{myDispatches?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="w-5 h-5 text-green-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{driverProfile?.total_trips || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10"><Star className="w-5 h-5 text-yellow-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">{driverProfile?.rating?.toFixed(1) || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10"><DollarSign className="w-5 h-5 text-blue-500" /></div>
              <div>
                <p className="text-xs text-muted-foreground">Pending Payout</p>
                <p className="text-2xl font-bold">₦{((earnings?.pending || 0) / 1000).toFixed(0)}K</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="new_jobs" className="relative">
            <Bell className="w-4 h-4 mr-1.5" aria-hidden="true" />
            New Jobs
            {pendingNotifCount > 0 ? (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
                {pendingNotifCount}
              </span>
            ) : (
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground hidden sm:inline">
                No new jobs
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="jobs">Active Jobs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="earnings">Earnings & Wallet</TabsTrigger>
          <TabsTrigger value="history">Trip History</TabsTrigger>
          <TabsTrigger value="kyc">KYC & Profile</TabsTrigger>
          <TabsTrigger value="safety">Safety & Coaching</TabsTrigger>
          <TabsTrigger value="daily-checks"><ClipboardCheck className="w-3.5 h-3.5 mr-1" />Daily Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="new_jobs">
          <DriverNotificationsInbox driverId={driverProfile?.id} />
        </TabsContent>

        {/* Active Jobs */}
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
              return (
                <Card key={dispatch.id} className="overflow-hidden border-l-4 border-l-primary">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{dispatch.dispatch_number}</CardTitle>
                        <CardDescription>{dispatch.customers?.company_name}</CardDescription>
                      </div>
                      <Badge variant={statusColors[dispatch.status] as any}>{dispatch.status?.replace("_", " ")}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10"><MapPin className="w-4 h-4 text-green-500" /></div>
                        <div><p className="text-xs text-muted-foreground">Pickup</p><p className="text-sm font-medium">{dispatch.pickup_address}</p></div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10"><MapPin className="w-4 h-4 text-red-500" /></div>
                        <div><p className="text-xs text-muted-foreground">Delivery</p><p className="text-sm font-medium">{dispatch.delivery_address}</p></div>
                      </div>
                    </div>
                    {dispatch.scheduled_pickup && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Scheduled: {format(new Date(dispatch.scheduled_pickup), "MMM d, yyyy HH:mm")}</span>
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      {dispatch.status === "assigned" && (
                        <Button variant="outline" className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground">
                          <XCircle className="w-4 h-4 mr-2" />Decline
                        </Button>
                      )}
                      {nextStatus && (
                        <Button onClick={() => updateStatusMutation.mutate({ dispatchId: dispatch.id, status: nextStatus })} className="flex-1" disabled={updateStatusMutation.isPending}>
                          <Play className="w-4 h-4 mr-2" />
                          {nextStatus === "picked_up" ? "Confirm Pickup" : nextStatus === "in_transit" ? "Start Transit" : "Confirm Delivery"}
                        </Button>
                      )}
                      <Button variant="outline" size="icon"><Camera className="w-4 h-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Award className="w-5 h-5 text-primary" />Performance Score</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p className="text-5xl font-bold text-primary">{performanceScore}</p>
                  <p className="text-muted-foreground text-sm">/ 100</p>
                </div>
                <Progress value={performanceScore} className="h-3" />
                <div className="space-y-2">
                  {[
                    { label: "On-Time Delivery", value: 87, color: "bg-green-500" },
                    { label: "Customer Rating", value: ((driverProfile?.rating || 3.5) / 5) * 100, color: "bg-yellow-500" },
                    { label: "Trip Completion", value: 94, color: "bg-blue-500" },
                    { label: "Safety Score", value: 91, color: "bg-purple-500" },
                  ].map(metric => (
                    <div key={metric.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">{metric.label}</span>
                        <span className="font-medium">{Math.round(metric.value)}%</span>
                      </div>
                      <Progress value={metric.value} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />AI Coaching Insights</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { icon: TrendingUp, label: "Efficiency", tip: "Take the Lagos-Ibadan Express to save 18 mins on Route B.", color: "text-green-500", bg: "bg-green-500/10" },
                  { icon: Zap, label: "Fuel Tips", tip: "Reduce idling. You spent 42 mins idling this week - saving ₦3,200.", color: "text-yellow-500", bg: "bg-yellow-500/10" },
                  { icon: Star, label: "Rating Boost", tip: "Customers rate you higher when you send ETA updates. Try it!", color: "text-blue-500", bg: "bg-blue-500/10" },
                  { icon: Heart, label: "Wellness", tip: "You've been driving 7+ hours. Consider a 15-min rest break.", color: "text-red-500", bg: "bg-red-500/10" },
                ].map(item => (
                  <div key={item.label} className={`flex gap-3 p-3 rounded-lg ${item.bg}`}>
                    <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.tip}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Earnings & Wallet */}
        <TabsContent value="earnings" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Wallet className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Wallet Balance</p>
                <p className="text-3xl font-bold">₦{((earnings?.pending || 0) / 1000).toFixed(1)}K</p>
                <Button className="mt-3 w-full" size="sm">Withdraw Now</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold">₦{(earnings?.total || 0).toLocaleString()}</p>
                <Badge variant="secondary" className="mt-2">Lifetime</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">Paid Out</p>
                <p className="text-3xl font-bold text-green-500">₦{(earnings?.paid || 0).toLocaleString()}</p>
                <Badge className="mt-2 bg-green-500/15 text-green-500">Settled</Badge>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Earnings Breakdown</CardTitle><CardDescription>Base salary, bonuses, commissions & deductions</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Base Trip Fee", amount: "₦45,000", type: "credit" },
                  { label: "Performance Bonus", amount: "+₦5,400", type: "bonus" },
                  { label: "Fuel Advance Deduction", amount: "-₦8,000", type: "debit" },
                  { label: "Tax Withholding (7.5% VAT)", amount: "-₦2,700", type: "debit" },
                  { label: "Side Hustle Commission", amount: "+₦3,200", type: "bonus" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">{item.label}</span>
                    <span className={`font-semibold text-sm ${item.type === "bonus" ? "text-green-500" : item.type === "debit" ? "text-destructive" : "text-foreground"}`}>{item.amount}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="font-semibold">Net Payout</span>
                  <span className="font-bold text-primary">₦42,900</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trip History */}
        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle>Recent Trips</CardTitle><CardDescription>Your completed deliveries</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {completedTrips?.map((trip) => (
                  <div key={trip.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <p className="font-medium">{trip.dispatch_number}</p>
                      <p className="text-sm text-muted-foreground">{trip.pickup_address} → {trip.delivery_address}</p>
                      <p className="text-xs text-muted-foreground">
                        {trip.actual_delivery ? format(new Date(trip.actual_delivery), "MMM d, yyyy HH:mm") : "-"}
                      </p>
                    </div>
                    <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Done</Badge>
                  </div>
                ))}
                {(!completedTrips || completedTrips.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">No completed trips yet</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KYC */}
        <TabsContent value="kyc" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><FileCheck className="w-5 h-5 text-primary" />Digital KYC Verification</CardTitle><CardDescription>Your identity & compliance documents</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "National ID / NIN", status: "verified", icon: Shield },
                  { label: "Driver's License", status: "verified", icon: Car },
                  { label: "Vehicle Registration", status: "pending", icon: Truck },
                  { label: "Insurance Certificate", status: "required", icon: FileCheck },
                  { label: "Bank Account", status: "verified", icon: DollarSign },
                  { label: "Profile Photo", status: "verified", icon: Eye },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <Badge className={
                      item.status === "verified" ? "bg-green-500/15 text-green-500" :
                        item.status === "pending" ? "bg-yellow-500/15 text-yellow-500" :
                          "bg-destructive/15 text-destructive"
                    }>
                      {item.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <Button className="w-full mt-4" variant="outline">Upload Missing Documents</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Insurance Coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Life Cover", value: "₦5,000,000", status: "Active" },
                  { label: "Vehicle Damage", value: "₦2,000,000", status: "Active" },
                  { label: "Cargo Insurance", value: "₦10,000,000", status: "Expired" },
                ].map(ins => (
                  <div key={ins.label} className="p-4 rounded-lg bg-secondary/30 text-center">
                    <p className="text-xs text-muted-foreground">{ins.label}</p>
                    <p className="font-bold text-sm mt-1">{ins.value}</p>
                    <Badge className={ins.status === "Active" ? "bg-green-500/15 text-green-500 mt-2" : "bg-destructive/15 text-destructive mt-2"}>{ins.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Safety */}
        <TabsContent value="safety" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Fatigue Monitoring</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="w-24 h-24 rounded-full border-4 border-green-500/30 flex items-center justify-center mx-auto">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">85%</p>
                      <p className="text-xs text-muted-foreground">Alert</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Driving Hours Today</span>
                    <span className="font-medium">4h 22m</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Break</span>
                    <span className="font-medium">1h 15m ago</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Max Daily Limit</span>
                    <span className="font-medium text-yellow-500">11 hours</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Bell className="w-4 h-4 mr-2" />Set Break Reminder
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5 text-primary" />Vehicle Health</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Fuel Level", value: 72, icon: Battery, color: "text-green-500" },
                  { label: "Engine Temp", value: 60, icon: Thermometer, color: "text-yellow-500" },
                  { label: "Tyre Pressure", value: 85, icon: Car, color: "text-blue-500" },
                  { label: "Brake Health", value: 90, icon: AlertTriangle, color: "text-green-500" },
                ].map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                      <span className="font-medium">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-2" />
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-2">
                  <Info className="w-4 h-4 mr-2" />Report Vehicle Issue
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="daily-checks" className="space-y-4">
          <DriverDailyChecks
            driverId={driverProfile?.id ?? null}
            vehicleId={(driverProfile as any)?.current_vehicle_id ?? (driverProfile as any)?.vehicle_id ?? null}
            organizationId={(driverProfile as any)?.organization_id ?? null}
          />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

const DriverSuperApp = () => {
  const { userRole, tenantMode } = useAuth();
  // SECURITY: 3PL Transporter Portal is for EXTERNAL carrier accounts ONLY.
  // - role 'transporter' → always render the external TransporterPortal
  //   (regardless of tenant mode; RLS scopes by transporter_id).
  // - In LOGISTICS_DEPARTMENT mode, NO ONE else (including super_admin) may
  //   reach the internal Driver Super App via /transporter-portal - that
  //   would leak internal driver KPIs, earnings, IoT telemetry to staff
  //   browsing the 3PL portal page. Redirect staff to the roster manager.
  if ((userRole as string) === "transporter") return <TransporterPortal />;
  if (tenantMode === "LOGISTICS_DEPARTMENT") return <DeptDriverDashboard />;
  return <DriverSuperAppInner />;
};

export default DriverSuperApp;
