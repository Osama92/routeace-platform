import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Route,
  MapPin,
  Clock,
  Navigation,
  MoreVertical,
  ArrowRight,
  ArrowLeftRight,
  Zap,
  TrendingUp,
  Trash2,
  Eye,
  Loader2,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Waypoint {
  id?: string;
  location_name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  sequence_order: number;
  distance_from_previous_km?: number;
  duration_from_previous_hours?: number;
  sla_hours?: number;
}

interface RouteData {
  id: string;
  name: string;
  origin: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination: string;
  destination_lat: number | null;
  destination_lng: number | null;
  distance_km: number | null;
  estimated_duration_hours: number | null;
  sla_hours: number | null;
  is_active: boolean;
  created_at: string;
  waypoints?: Waypoint[];
}

const RoutesPage = () => {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  const [deletingRoute, setDeletingRoute] = useState<RouteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const { toast } = useToast();
  const { user, hasAnyRole, organizationId } = useAuth();
  const { logChange } = useAuditLog();

  const [formData, setFormData] = useState({
    name: "",
    origin: "",
    origin_lat: null as number | null,
    origin_lng: null as number | null,
    destination: "",
    destination_lat: null as number | null,
    destination_lng: null as number | null,
    distance_km: "",
    estimated_duration_hours: "",
    sla_hours: "",
    return_trip: false,
  });

  // Tracks the raw one-way distance returned by calculation so the toggle can flip between 1x and 2x
  const [oneWayDistanceKm, setOneWayDistanceKm] = useState<number | null>(null);
  const [oneWayDurationHours, setOneWayDurationHours] = useState<number | null>(null);

  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);

  const canManage = hasAnyRole(["admin", "super_admin", "org_admin", "ops_manager"]);

  const fetchRoutes = async () => {
    try {
      if (!organizationId || !user?.id) return;
      const userId = user.id;

      // Two simple queries merged: org-scoped + creator access (handles super_admin + migration gap)
      const [orgRes, creatorRes] = await Promise.all([
        supabase.from("routes").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }),
        supabase.from("routes").select("*").eq("created_by", userId).order("created_at", { ascending: false }),
      ]);

      // Merge and dedupe by id
      const routeMap = new Map<string, any>();
      [...(orgRes.data || []), ...(creatorRes.data || [])].forEach((r) => routeMap.set(r.id, r));
      let routesData = Array.from(routeMap.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const error = orgRes.error && creatorRes.error ? orgRes.error : null;
      if (error) throw error;

      // Backfill org on routes missing it
      const needsBackfill = routesData.some((r: any) => !r.organization_id);
      if (needsBackfill) {
        await supabase.from("routes").update({ organization_id: organizationId })
          .is("organization_id", null).eq("created_by", userId);
      }

      // Fetch waypoints for each route
      const routesWithWaypoints = await Promise.all(
        (routesData || []).map(async (route) => {
          const { data: waypointsData } = await supabase
            .from("route_waypoints")
            .select("*")
            .eq("route_id", route.id)
            .order("sequence_order");
          return { ...route, waypoints: waypointsData || [] };
        })
      );

      setRoutes(routesWithWaypoints);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch routes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, [organizationId]);

  const [slaPolicies, setSlaPolicies] = useState<{ id: string; name: string; sla_duration_days: number; zone: string | null }[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    // Include org-specific policies AND legacy policies with no org (created before multi-tenancy)
    Promise.all([
      supabase.from("sla_policies").select("id, name, sla_duration_days, zone").eq("organization_id", organizationId).eq("is_active", true).order("sla_duration_days"),
      supabase.from("sla_policies").select("id, name, sla_duration_days, zone").is("organization_id", null).eq("is_active", true).order("sla_duration_days"),
    ]).then(([orgRes, globalRes]) => {
      const combined = [...(orgRes.data || []), ...(globalRes.data || [])];
      const deduped = Array.from(new Map(combined.map(p => [p.id, p])).values());
      setSlaPolicies(deduped);
    });
  }, [organizationId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleReturnTripToggle = (checked: boolean) => {
    setFormData((prev) => {
      const dist = oneWayDistanceKm != null
        ? (checked ? oneWayDistanceKm * 2 : oneWayDistanceKm).toString()
        : prev.distance_km;
      const dur = oneWayDurationHours != null
        ? (checked ? oneWayDurationHours * 2 : oneWayDurationHours).toString()
        : prev.estimated_duration_hours;
      return { ...prev, return_trip: checked, distance_km: dist, estimated_duration_hours: dur };
    });
  };

  const addWaypoint = () => {
    setWaypoints((prev) => [
      ...prev,
      {
        location_name: "",
        address: "",
        sequence_order: prev.length + 1,
        sla_hours: undefined,
      },
    ]);
  };

  const updateWaypoint = (index: number, field: string, value: any) => {
    setWaypoints((prev) =>
      prev.map((wp, i) => (i === index ? { ...wp, [field]: value } : wp))
    );
  };

  const removeWaypoint = (index: number) => {
    setWaypoints((prev) =>
      prev.filter((_, i) => i !== index).map((wp, i) => ({ ...wp, sequence_order: i + 1 }))
    );
  };

  const calculateDistance = async () => {
    if (!formData.origin || !formData.destination) {
      toast({
        title: "Error",
        description: "Please enter origin and destination addresses",
        variant: "destructive",
      });
      return;
    }

    setCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-route-distance', {
        body: {
          origin: {
            location_name: "Origin",
            address: formData.origin,
            latitude: formData.origin_lat,
            longitude: formData.origin_lng,
          },
          destination: {
            location_name: "Destination",
            address: formData.destination,
            latitude: formData.destination_lat,
            longitude: formData.destination_lng,
          },
          waypoints: waypoints.map((wp) => ({
            location_name: wp.location_name,
            address: wp.address,
            latitude: wp.latitude,
            longitude: wp.longitude,
            sla_hours: wp.sla_hours,
          })),
        },
      });

      if (error) throw error;

      // Store raw one-way values so the return-trip toggle can switch between 1x and 2x
      const owDist = data.total_distance_km;
      const owDur = data.total_duration_hours;
      setOneWayDistanceKm(owDist);
      setOneWayDurationHours(owDur);

      setFormData((prev) => ({
        ...prev,
        distance_km: (prev.return_trip ? owDist * 2 : owDist).toString(),
        estimated_duration_hours: (prev.return_trip ? owDur * 2 : owDur).toString(),
        origin_lat: data.waypoints[0]?.latitude || prev.origin_lat,
        origin_lng: data.waypoints[0]?.longitude || prev.origin_lng,
        destination_lat: data.waypoints[data.waypoints.length - 1]?.latitude || prev.destination_lat,
        destination_lng: data.waypoints[data.waypoints.length - 1]?.longitude || prev.destination_lng,
      }));

      // Update waypoints with calculated distances
      if (data.waypoints.length > 2) {
        const updatedWaypoints = data.waypoints.slice(1, -1).map((wp: any, index: number) => ({
          ...waypoints[index],
          latitude: wp.latitude,
          longitude: wp.longitude,
          distance_from_previous_km: wp.distance_from_previous_km,
          duration_from_previous_hours: wp.duration_from_previous_hours,
        }));
        setWaypoints(updatedWaypoints);
      }

      toast({
        title: "Distance Calculated",
        description: `One-way: ${owDist} km (~${owDur.toFixed(1)} hrs)`,
      });
    } catch (error: any) {
      toast({
        title: "Calculation Error",
        description: error.message || "Failed to calculate distance",
        variant: "destructive",
      });
    } finally {
      setCalculating(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.origin || !formData.destination) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!organizationId) return;
    setSaving(true);
    try {
      // Duplicate-route guard - warn the user if an identical origin/destination
      // route already exists within this org, instead of silently creating a duplicate.
      // Skip the org filter if the column doesn't exist yet (migration in flight).
      let dupeQuery = supabase
        .from("routes")
        .select("id, name")
        .ilike("origin", formData.origin.trim())
        .ilike("destination", formData.destination.trim())
        .limit(1);
      const { data: dupes, error: dupeErr } = await dupeQuery;
      // If org column already exists, narrow to this org only
      if (!dupeErr) {
        const { data: orgDupes } = await supabase
          .from("routes")
          .select("id, name")
          .eq("organization_id", organizationId)
          .ilike("origin", formData.origin.trim())
          .ilike("destination", formData.destination.trim())
          .limit(1);
        if (orgDupes && orgDupes.length > 0) {
          toast({
            title: "Duplicate route detected",
            description: `A route from "${formData.origin}" to "${formData.destination}" already exists ("${orgDupes[0].name}"). Update the existing route instead of creating a duplicate.`,
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
      }
      const routePayload: Record<string, any> = {
        name: formData.name,
        origin: formData.origin,
        origin_lat: formData.origin_lat,
        origin_lng: formData.origin_lng,
        destination: formData.destination,
        destination_lat: formData.destination_lat,
        destination_lng: formData.destination_lng,
        distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
        estimated_duration_hours: formData.estimated_duration_hours
          ? parseFloat(formData.estimated_duration_hours)
          : null,
        sla_hours: formData.sla_hours ? parseFloat(formData.sla_hours) : null,
        created_by: user?.id,
        organization_id: organizationId,
      };

      let { data: routeData, error } = await supabase
        .from("routes")
        .insert(routePayload)
        .select()
        .single();

      // If the DB migration hasn't applied yet (schema cache miss), retry without the missing column
      if (error?.message?.includes("schema cache")) {
        let fallbackPayload = { ...routePayload };
        if (error.message.includes("organization_id")) {
          const { organization_id: _o, ...rest } = fallbackPayload;
          fallbackPayload = rest;
        }
        if (error.message.includes("sla_hours")) {
          const { sla_hours: _s, ...rest } = fallbackPayload;
          fallbackPayload = rest;
        }
        const fallback = await supabase.from("routes").insert(fallbackPayload).select().single();
        routeData = fallback.data;
        error = fallback.error;
      }

      if (error) throw error;

      // Log the creation
      if (routeData) {
        await logChange({
          table_name: "routes",
          record_id: routeData.id,
          action: "insert",
          new_data: {
            name: formData.name,
            origin: formData.origin,
            destination: formData.destination,
          },
        });
      }

      // Insert waypoints if any
      if (waypoints.length > 0 && routeData) {
        const waypointsToInsert = waypoints.map((wp) => ({
          route_id: routeData.id,
          location_name: wp.location_name,
          address: wp.address,
          latitude: wp.latitude,
          longitude: wp.longitude,
          sequence_order: wp.sequence_order,
          distance_from_previous_km: wp.distance_from_previous_km,
          duration_from_previous_hours: wp.duration_from_previous_hours,
          sla_hours: wp.sla_hours,
        }));

        const { error: waypointsError } = await supabase
          .from("route_waypoints")
          .insert(waypointsToInsert);

        if (waypointsError) {
          console.error("Error inserting waypoints:", waypointsError);
        }
      }

      toast({
        title: "Success",
        description: "Route added successfully",
      });
      setIsDialogOpen(false);
      resetForm();
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add route",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      origin: "",
      origin_lat: null,
      origin_lng: null,
      destination: "",
      destination_lat: null,
      destination_lng: null,
      distance_km: "",
      estimated_duration_hours: "",
      sla_hours: "",
      return_trip: false,
    });
    setOneWayDistanceKm(null);
    setOneWayDurationHours(null);
    setWaypoints([]);
  };

  const toggleRouteStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("routes")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      // Log the status update
      await logChange({
        table_name: "routes",
        record_id: id,
        action: "update",
        old_data: { is_active: currentStatus },
        new_data: { is_active: !currentStatus },
      });

      toast({
        title: "Success",
        description: `Route ${!currentStatus ? "activated" : "deactivated"} successfully`,
      });
      fetchRoutes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update route status",
        variant: "destructive",
      });
    }
  };

  const viewRouteDetails = (route: RouteData) => {
    setSelectedRoute(route);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (route: RouteData) => {
    setEditingRoute(route);
    setOneWayDistanceKm(null);
    setOneWayDurationHours(null);
    setFormData({
      name: route.name,
      origin: route.origin,
      origin_lat: route.origin_lat,
      origin_lng: route.origin_lng,
      destination: route.destination,
      destination_lat: route.destination_lat,
      destination_lng: route.destination_lng,
      distance_km: route.distance_km?.toString() ?? "",
      estimated_duration_hours: route.estimated_duration_hours?.toString() ?? "",
      sla_hours: route.sla_hours?.toString() ?? "",
      return_trip: false,
    });
    setWaypoints(route.waypoints ?? []);
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRoute || !formData.name || !formData.origin || !formData.destination) {
      toast({ title: "Validation Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("routes")
        .update({
          name: formData.name,
          origin: formData.origin,
          origin_lat: formData.origin_lat,
          origin_lng: formData.origin_lng,
          destination: formData.destination,
          destination_lat: formData.destination_lat,
          destination_lng: formData.destination_lng,
          distance_km: formData.distance_km ? parseFloat(formData.distance_km) : null,
          estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
          sla_hours: formData.sla_hours ? parseFloat(formData.sla_hours) : null,
        })
        .eq("id", editingRoute.id);
      if (error) throw error;

      // Replace waypoints
      await supabase.from("route_waypoints").delete().eq("route_id", editingRoute.id);
      if (waypoints.length > 0) {
        await supabase.from("route_waypoints").insert(
          waypoints.map((wp) => ({
            route_id: editingRoute.id,
            location_name: wp.location_name,
            address: wp.address,
            latitude: wp.latitude,
            longitude: wp.longitude,
            sequence_order: wp.sequence_order,
            distance_from_previous_km: wp.distance_from_previous_km,
            duration_from_previous_hours: wp.duration_from_previous_hours,
            sla_hours: wp.sla_hours,
          }))
        );
      }

      await logChange({ table_name: "routes", record_id: editingRoute.id, action: "update", new_data: { name: formData.name } });
      toast({ title: "Route Updated", description: "Changes saved successfully" });
      setIsEditDialogOpen(false);
      setEditingRoute(null);
      resetForm();
      fetchRoutes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update route", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingRoute) return;
    setDeleting(true);
    try {
      await supabase.from("route_waypoints").delete().eq("route_id", deletingRoute.id);
      const { error } = await supabase.from("routes").delete().eq("id", deletingRoute.id);
      if (error) throw error;
      await logChange({ table_name: "routes", record_id: deletingRoute.id, action: "delete", old_data: { name: deletingRoute.name } });
      toast({ title: "Route Deleted", description: `"${deletingRoute.name}" has been removed` });
      setIsDeleteDialogOpen(false);
      setDeletingRoute(null);
      fetchRoutes();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete route", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const filteredRoutes = routes.filter(
    (route) =>
      route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      route.destination.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDistance = routes.reduce((acc, r) => acc + (r.distance_km || 0), 0);
  const activeRoutes = routes.filter((r) => r.is_active);

  return (
    <DashboardLayout
      title="Route Planning"
      subtitle="Manage and optimize delivery routes with multiple drops"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Route className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {routes.length}
              </p>
              <p className="text-sm text-muted-foreground">Total Routes</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {activeRoutes.length}
              </p>
              <p className="text-sm text-muted-foreground">Active Routes</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-info/20 flex items-center justify-center">
              <Navigation className="w-6 h-6 text-info" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {totalDistance.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total KM</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">
                {routes.length > 0 ? Math.round(totalDistance / routes.length) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg. Distance</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search routes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-secondary/50 border-border/50"
          />
        </div>

        {canManage && (
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add Route
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Create New Route</DialogTitle>
                <DialogDescription>
                  Define a delivery route with multiple drops. Distance and duration will be calculated automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Route Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Lagos - Abuja Express"
                    className="bg-secondary/50"
                  />
                </div>

                {/* Origin */}
                <div className="space-y-2">
                  <Label>Origin *</Label>
                  <AddressAutocomplete
                    value={formData.origin}
                    onChange={(value) => setFormData((prev) => ({ ...prev, origin: value }))}
                    onPlaceSelect={(place) => {
                      setFormData((prev) => ({
                        ...prev,
                        origin: place.formattedAddress,
                        origin_lat: place.lat,
                        origin_lng: place.lng,
                      }));
                    }}
                    placeholder="Start location"
                  />
                </div>

                {/* Waypoints */}
                {waypoints.length > 0 && (
                  <div className="space-y-3">
                    <Label>Intermediate Stops</Label>
                    {waypoints.map((wp, index) => (
                      <div key={index} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-muted-foreground">
                            Stop {index + 1}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeWaypoint(index)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Location name (e.g., Ibadan Depot)"
                          value={wp.location_name}
                          onChange={(e) =>
                            updateWaypoint(index, "location_name", e.target.value)
                          }
                          className="bg-background"
                        />
                        <AddressAutocomplete
                          value={wp.address}
                          onChange={(value) => updateWaypoint(index, "address", value)}
                          onPlaceSelect={(place) => {
                            updateWaypoint(index, "address", place.formattedAddress);
                            updateWaypoint(index, "latitude", place.lat);
                            updateWaypoint(index, "longitude", place.lng);
                          }}
                          placeholder="Stop address"
                        />
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <Label className="text-xs">SLA (hours)</Label>
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="Expected delivery time"
                              value={wp.sla_hours || ""}
                              onChange={(e) =>
                                updateWaypoint(
                                  index,
                                  "sla_hours",
                                  e.target.value ? parseFloat(e.target.value) : undefined
                                )
                              }
                              className="bg-background"
                            />
                          </div>
                          {wp.distance_from_previous_km && (
                            <div className="text-xs text-muted-foreground pt-5">
                              {wp.distance_from_previous_km} km from previous
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addWaypoint}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </Button>

                {/* Destination */}
                <div className="space-y-2">
                  <Label>Destination *</Label>
                  <AddressAutocomplete
                    value={formData.destination}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, destination: value }))
                    }
                    onPlaceSelect={(place) => {
                      setFormData((prev) => ({
                        ...prev,
                        destination: place.formattedAddress,
                        destination_lat: place.lat,
                        destination_lng: place.lng,
                      }));
                    }}
                    placeholder="End location"
                  />
                </div>

                {/* Calculate Distance Button */}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={calculateDistance}
                  disabled={calculating}
                  className="w-full"
                >
                  {calculating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 mr-2" />
                      Calculate Distance & Duration
                    </>
                  )}
                </Button>

                {/* Return Trip Toggle */}
                <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Return Trip (To &amp; Fro)</p>
                      <p className="text-xs text-muted-foreground">
                        {oneWayDistanceKm != null
                          ? `One-way: ${oneWayDistanceKm} km · Round-trip: ${(oneWayDistanceKm * 2).toFixed(1)} km`
                          : "Calculate distance first, then toggle to double it"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={formData.return_trip}
                    onCheckedChange={handleReturnTripToggle}
                  />
                </div>

                {/* Calculated Values */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="distance_km">
                      Distance (km){formData.return_trip && <span className="ml-1 text-xs text-primary font-normal">round-trip</span>}
                    </Label>
                    <Input
                      id="distance_km"
                      name="distance_km"
                      type="number"
                      value={formData.distance_km}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated"
                      className="bg-secondary/50"
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estimated_duration_hours">
                      Est. Duration (hours){formData.return_trip && <span className="ml-1 text-xs text-primary font-normal">round-trip</span>}
                    </Label>
                    <Input
                      id="estimated_duration_hours"
                      name="estimated_duration_hours"
                      type="number"
                      step="0.5"
                      value={formData.estimated_duration_hours}
                      onChange={handleInputChange}
                      placeholder="Auto-calculated"
                      className="bg-secondary/50"
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    Route SLA Policy
                  </Label>
                  <Select
                    value={formData.sla_hours || undefined}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, sla_hours: v }))}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue placeholder="Select SLA policy…" />
                    </SelectTrigger>
                    <SelectContent>
                      {slaPolicies.length === 0 && (
                        <SelectItem value="_none" disabled>No SLA policies found</SelectItem>
                      )}
                      {slaPolicies.map((p) => (
                        <SelectItem key={p.id} value={String(p.sla_duration_days * 24)}>
                          {p.name} — {p.sla_duration_days} day{p.sla_duration_days !== 1 ? "s" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Auto-applies as the delivery deadline when dispatches use this route.</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving ? "Creating..." : "Create Route"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Routes Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="text-muted-foreground min-w-[160px]">Route Name</TableHead>
              <TableHead className="text-muted-foreground min-w-[120px]">Origin</TableHead>
              <TableHead className="text-muted-foreground">Stops</TableHead>
              <TableHead className="text-muted-foreground min-w-[120px]">Destination</TableHead>
              <TableHead className="text-muted-foreground whitespace-nowrap min-w-[100px]">Distance</TableHead>
              <TableHead className="text-muted-foreground whitespace-nowrap min-w-[100px]">Duration</TableHead>
              <TableHead className="text-muted-foreground whitespace-nowrap min-w-[80px]">SLA</TableHead>
              <TableHead className="text-muted-foreground">Status</TableHead>
              <TableHead className="text-muted-foreground w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-muted-foreground">Loading routes...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredRoutes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Route className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No routes found</p>
                  <p className="text-sm text-muted-foreground/70">
                    Create your first route to get started
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredRoutes.map((route) => (
                <TableRow key={route.id} className="data-table-row">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Route className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium text-foreground truncate max-w-[150px] block" title={route.name}>{route.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                      <span className="truncate" title={route.origin}>{route.origin.split(",")[0]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {route.waypoints?.length || 0} stops
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                      <ArrowRight className="w-4 h-4 shrink-0" />
                      <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
                      <span className="truncate" title={route.destination}>{route.destination.split(",")[0]}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {route.distance_km ? `${route.distance_km.toLocaleString()} km` : "-"}
                  </TableCell>
                  <TableCell>
                    {route.estimated_duration_hours ? (
                      <div className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                        <Clock className="w-4 h-4 shrink-0" />
                        {route.estimated_duration_hours >= 24
                          ? `${(route.estimated_duration_hours / 24).toFixed(1)} days`
                          : route.estimated_duration_hours >= 1
                          ? `${route.estimated_duration_hours}h`
                          : `${Math.round(route.estimated_duration_hours * 60)} min`}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {route.sla_hours ? (
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 whitespace-nowrap text-sm">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {route.sla_hours >= 24
                          ? `${(route.sla_hours / 24).toFixed(1)}d`
                          : `${route.sla_hours}h`}
                      </div>
                    ) : (
                      <span className="text-muted-foreground/50 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={route.is_active ? "default" : "secondary"}
                      className={
                        route.is_active ? "bg-success/15 text-success hover:bg-success/20" : ""
                      }
                      onClick={() => canManage && toggleRouteStatus(route.id, route.is_active)}
                      style={{ cursor: canManage ? "pointer" : "default" }}
                    >
                      {route.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => viewRouteDetails(route)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewRouteDetails(route)}>
                            <Eye className="w-4 h-4 mr-2" />View Details
                          </DropdownMenuItem>
                          {canManage && (
                            <DropdownMenuItem onClick={() => openEditDialog(route)}>
                              <Pencil className="w-4 h-4 mr-2" />Edit Route
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <DropdownMenuItem onClick={() => toggleRouteStatus(route.id, route.is_active)}>
                              {route.is_active
                                ? <><PowerOff className="w-4 h-4 mr-2" />Deactivate</>
                                : <><Power className="w-4 h-4 mr-2" />Activate</>}
                            </DropdownMenuItem>
                          )}
                          {canManage && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => { setDeletingRoute(route); setIsDeleteDialogOpen(true); }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />Delete Route
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </motion.div>

      {/* ── EDIT ROUTE DIALOG ──────────────────────────────────────────────── */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) { setEditingRoute(null); resetForm(); } }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Route</DialogTitle>
            <DialogDescription>Update route details, stops, and distance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Route Name *</Label>
              <input name="name" className="flex h-9 w-full rounded-md border border-input bg-secondary/50 px-3 py-1 text-sm shadow-sm" value={formData.name} onChange={handleInputChange} placeholder="Lagos - Abuja Express" />
            </div>
            <div className="space-y-2">
              <Label>Origin *</Label>
              <AddressAutocomplete value={formData.origin} onChange={(v) => setFormData(p => ({ ...p, origin: v }))} onPlaceSelect={(pl) => setFormData(p => ({ ...p, origin: pl.formattedAddress, origin_lat: pl.lat, origin_lng: pl.lng }))} placeholder="Start location" />
            </div>
            {waypoints.length > 0 && (
              <div className="space-y-3">
                <Label>Intermediate Stops</Label>
                {waypoints.map((wp, index) => (
                  <div key={index} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Stop {index + 1}</span>
                      <Button variant="ghost" size="icon" onClick={() => removeWaypoint(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                    <Input placeholder="Location name" value={wp.location_name} onChange={(e) => updateWaypoint(index, "location_name", e.target.value)} className="bg-background" />
                    <AddressAutocomplete value={wp.address} onChange={(v) => updateWaypoint(index, "address", v)} onPlaceSelect={(pl) => { updateWaypoint(index, "address", pl.formattedAddress); updateWaypoint(index, "latitude", pl.lat); updateWaypoint(index, "longitude", pl.lng); }} placeholder="Stop address" />
                  </div>
                ))}
              </div>
            )}
            <Button type="button" variant="outline" onClick={addWaypoint} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Stop</Button>
            <div className="space-y-2">
              <Label>Destination *</Label>
              <AddressAutocomplete value={formData.destination} onChange={(v) => setFormData(p => ({ ...p, destination: v }))} onPlaceSelect={(pl) => setFormData(p => ({ ...p, destination: pl.formattedAddress, destination_lat: pl.lat, destination_lng: pl.lng }))} placeholder="End location" />
            </div>
            <Button type="button" variant="secondary" onClick={calculateDistance} disabled={calculating} className="w-full">
              {calculating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Calculating...</> : <><Navigation className="w-4 h-4 mr-2" />Recalculate Distance & Duration</>}
            </Button>
            {/* Return Trip Toggle — Edit dialog */}
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Return Trip (To &amp; Fro)</p>
                  <p className="text-xs text-muted-foreground">
                    {oneWayDistanceKm != null
                      ? `One-way: ${oneWayDistanceKm} km · Round-trip: ${(oneWayDistanceKm * 2).toFixed(1)} km`
                      : "Recalculate first, then toggle to double distance"}
                  </p>
                </div>
              </div>
              <Switch checked={formData.return_trip} onCheckedChange={handleReturnTripToggle} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Distance (km){formData.return_trip && <span className="ml-1 text-xs text-primary font-normal">round-trip</span>}</Label>
                <Input name="distance_km" type="number" value={formData.distance_km} onChange={handleInputChange} placeholder="Auto-calculated" className="bg-secondary/50" readOnly />
              </div>
              <div className="space-y-2">
                <Label>Est. Duration (hours){formData.return_trip && <span className="ml-1 text-xs text-primary font-normal">round-trip</span>}</Label>
                <Input name="estimated_duration_hours" type="number" step="0.5" value={formData.estimated_duration_hours} onChange={handleInputChange} placeholder="Auto-calculated" className="bg-secondary/50" readOnly />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Route SLA Policy
              </Label>
              <Select
                value={formData.sla_hours}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, sla_hours: v }))}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select SLA policy…" />
                </SelectTrigger>
                <SelectContent>
                  {slaPolicies.length === 0 && (
                    <SelectItem value="_none" disabled>No SLA policies found</SelectItem>
                  )}
                  {slaPolicies.map((p) => (
                    <SelectItem key={p.id} value={String(p.sla_duration_days * 24)}>
                      {p.name}{p.zone ? ` (${p.zone})` : ""} — {p.sla_duration_days}d
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Auto-applies as the delivery deadline when dispatches use this route.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updating}>{updating ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION ─────────────────────────────────────────────── */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Route</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingRoute?.name}"</strong>? This will also remove all waypoints. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingRoute(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Deleting..." : "Delete Route"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Route Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {selectedRoute && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading">{selectedRoute.name}</DialogTitle>
                <DialogDescription>Route details and stops</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-success" />
                  <div>
                    <p className="text-xs text-muted-foreground">Origin</p>
                    <p className="font-medium text-foreground">{selectedRoute.origin}</p>
                  </div>
                </div>

                {selectedRoute.waypoints && selectedRoute.waypoints.length > 0 && (
                  <div className="space-y-2 pl-4 border-l-2 border-dashed border-border">
                    {selectedRoute.waypoints.map((wp: any, index: number) => (
                      <div key={index} className="flex items-center gap-3 p-2 bg-secondary/30 rounded-lg">
                        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-foreground">{wp.location_name}</p>
                          <p className="text-xs text-muted-foreground">{wp.address}</p>
                          {wp.distance_from_previous_km && (
                            <p className="text-xs text-info">
                              {wp.distance_from_previous_km} km • {wp.duration_from_previous_hours}h from previous
                            </p>
                          )}
                          {wp.sla_hours && (
                            <p className="text-xs text-warning">SLA: {wp.sla_hours}h</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-lg">
                  <MapPin className="w-5 h-5 text-destructive" />
                  <div>
                    <p className="text-xs text-muted-foreground">Destination</p>
                    <p className="font-medium text-foreground">{selectedRoute.destination}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Distance</p>
                    <p className="text-xl font-bold text-foreground">
                      {selectedRoute.distance_km?.toLocaleString() || "-"} km
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Duration</p>
                    <p className="text-xl font-bold text-foreground">
                      {selectedRoute.estimated_duration_hours || "-"} hours
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RoutesPage;
