import { useEffect, useMemo, useState } from "react";
import { GoogleTrackingMap, type TrackingPin } from "@/components/tracking/GoogleTrackingMap";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  Navigation,
  Truck,
  Phone,
  RefreshCw,
  Loader2,
  MapPin,
  Clock,
  Hash,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface TrackedVehicle {
  id: string;
  vehicleId: string | null;
  vehicleType: string | null;
  driverId: string | null;
  driverName: string;
  driverPhone: string | null;
  vehicleNumber: string;
  shipmentId: string;
  origin: string;
  destination: string;
  status: "active" | "idle" | "offline";
  lat: number | null;
  lng: number | null;
  speed: number;
  lastUpdateRaw: string | null;
  lastUpdate: string;
  eta: string;
  etaRaw: string | null;
  slaDeadline: string | null;
  scheduledPickup: string | null;
  scheduledDelivery: string | null;
  progress: number;
  hasDispatch: boolean;
}

const statusConfig = {
  active: { label: "Active", color: "bg-success text-success-foreground" },
  idle: { label: "Idle", color: "bg-warning text-warning-foreground" },
  offline: { label: "Offline", color: "bg-muted text-muted-foreground" },
};

const ACTIVE_STATUSES = ["in_transit", "picked_up", "out_for_delivery", "dispatched", "en_route"];
const IDLE_STATUSES = ["assigned", "scheduled", "pending", "ready", "draft"];
const PAGE_SIZE = 25;

const formatRelative = (iso: string | null) => {
  if (!iso) return "-";
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const formatEta = (target: string | null) => {
  if (!target) return "-";
  const diffMs = new Date(target).getTime() - Date.now();
  if (diffMs <= 0) return "Due";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`;
};

const computeProgress = (
  scheduledPickup: string | null,
  scheduledDelivery: string | null,
  status: string,
) => {
  if (status === "delivered" || status === "completed") return 100;
  if (!scheduledPickup || !scheduledDelivery) return 0;
  const start = new Date(scheduledPickup).getTime();
  const end = new Date(scheduledDelivery).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((now - start) / (end - start)) * 100)));
};

const LiveTrackingPanel = () => {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const googleMapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? "";

  const dispatchQuery = useQuery({
    queryKey: ["tracking-dispatches", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(
          `id, dispatch_number, status, organization_id,
           pickup_address, delivery_address,
           pickup_lat, pickup_lng, delivery_lat, delivery_lng,
           scheduled_pickup, scheduled_delivery, sla_deadline, actual_delivery,
           updated_at, distance_km,
           vehicle_id, driver_id`,
        )
        .eq("organization_id", organizationId!)
        .not("status", "in", '("delivered","completed","cancelled","settled")')
        .order("updated_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).filter((d: any) => d.organization_id === organizationId);
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ["tracking-vehicles", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id, registration_number, vehicle_type, organization_id, status")
        .eq("organization_id", organizationId!)
        .limit(2000);
      if (error) throw error;
      return (data || []).filter((v: any) => v.organization_id === organizationId);
    },
  });

  const driverIds = useMemo(
    () => Array.from(new Set((dispatchQuery.data || []).map((d: any) => d.driver_id).filter(Boolean))),
    [dispatchQuery.data],
  );
  const driversQuery = useQuery({
    queryKey: ["tracking-drivers", organizationId, driverIds.sort().join(",")],
    enabled: !!organizationId && driverIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("drivers")
        .select("id, full_name, phone, organization_id")
        .in("id", driverIds as string[])
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return (data || []).filter((d: any) => d.organization_id === organizationId);
    },
  });

  const isLoading = dispatchQuery.isLoading || vehiclesQuery.isLoading;
  const error = dispatchQuery.error || vehiclesQuery.error;
  const isFetching = dispatchQuery.isFetching || vehiclesQuery.isFetching;

  const refetch = () => {
    dispatchQuery.refetch();
    vehiclesQuery.refetch();
  };

  useEffect(() => {
    if (!organizationId) return;
    const channel = supabase
      .channel(`tracking-panel-${organizationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dispatches", filter: `organization_id=eq.${organizationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["tracking-dispatches", organizationId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vehicles", filter: `organization_id=eq.${organizationId}` },
        () => queryClient.invalidateQueries({ queryKey: ["tracking-vehicles", organizationId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [organizationId, queryClient]);

  const vehicles: TrackedVehicle[] = useMemo(() => {
    const vMap = new Map<string, any>((vehiclesQuery.data || []).map((v: any) => [v.id, v]));
    const dMap = new Map<string, any>((driversQuery.data || []).map((d: any) => [d.id, d]));
    const dispatchedVehicleIds = new Set<string>();
    const result: TrackedVehicle[] = [];

    (dispatchQuery.data || []).forEach((d: any) => {
      const status = String(d.status || "").toLowerCase();
      let uiStatus: TrackedVehicle["status"] = "offline";
      if (ACTIVE_STATUSES.includes(status)) uiStatus = "active";
      else if (IDLE_STATUSES.includes(status)) uiStatus = "idle";

      const progress = computeProgress(d.scheduled_pickup, d.scheduled_delivery, status);
      let lat: number | null = d.pickup_lat ?? null;
      let lng: number | null = d.pickup_lng ?? null;
      if (
        uiStatus === "active" &&
        d.pickup_lat != null && d.pickup_lng != null &&
        d.delivery_lat != null && d.delivery_lng != null
      ) {
        const t = progress / 100;
        lat = d.pickup_lat + (d.delivery_lat - d.pickup_lat) * t;
        lng = d.pickup_lng + (d.delivery_lng - d.pickup_lng) * t;
      }

      const veh = d.vehicle_id ? vMap.get(d.vehicle_id) : null;
      const drv = d.driver_id ? dMap.get(d.driver_id) : null;
      if (d.vehicle_id) dispatchedVehicleIds.add(d.vehicle_id);

      result.push({
        id: d.id,
        vehicleId: d.vehicle_id ?? null,
        vehicleType: veh?.vehicle_type ?? null,
        driverId: d.driver_id ?? null,
        driverName: drv?.full_name || "Unassigned",
        driverPhone: drv?.phone ?? null,
        vehicleNumber: veh?.registration_number || "Unassigned",
        shipmentId: d.dispatch_number || d.id.slice(0, 8),
        origin: d.pickup_address || "-",
        destination: d.delivery_address || "-",
        status: uiStatus,
        lat,
        lng,
        speed:
          uiStatus === "active" && d.distance_km && d.scheduled_delivery && d.scheduled_pickup
            ? Math.round(
                Number(d.distance_km) /
                  Math.max(
                    0.5,
                    (new Date(d.scheduled_delivery).getTime() - new Date(d.scheduled_pickup).getTime()) / 3600000,
                  ),
              )
            : 0,
        lastUpdateRaw: d.updated_at,
        lastUpdate: formatRelative(d.updated_at),
        eta: formatEta(d.sla_deadline || d.scheduled_delivery),
        etaRaw: d.sla_deadline || d.scheduled_delivery,
        slaDeadline: d.sla_deadline ?? null,
        scheduledPickup: d.scheduled_pickup ?? null,
        scheduledDelivery: d.scheduled_delivery ?? null,
        progress,
        hasDispatch: true,
      });
    });

    (vehiclesQuery.data || []).forEach((v: any) => {
      if (dispatchedVehicleIds.has(v.id)) return;
      result.push({
        id: `veh-${v.id}`,
        vehicleId: v.id,
        vehicleType: v.vehicle_type ?? null,
        driverId: null,
        driverName: "-",
        driverPhone: null,
        vehicleNumber: v.registration_number || "Unassigned",
        shipmentId: "-",
        origin: "-",
        destination: "-",
        status: "offline",
        lat: null,
        lng: null,
        speed: 0,
        lastUpdateRaw: null,
        lastUpdate: "-",
        eta: "-",
        etaRaw: null,
        slaDeadline: null,
        scheduledPickup: null,
        scheduledDelivery: null,
        progress: 0,
        hasDispatch: false,
      });
    });

    return result;
  }, [dispatchQuery.data, vehiclesQuery.data, driversQuery.data]);

  const vehicleTypes = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.vehicleType).filter(Boolean))) as string[],
    [vehicles],
  );

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return vehicles.filter((vehicle) => {
      const matchesSearch =
        !q ||
        vehicle.driverName.toLowerCase().includes(q) ||
        vehicle.vehicleNumber.toLowerCase().includes(q) ||
        vehicle.shipmentId.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
      const matchesType = typeFilter === "all" || vehicle.vehicleType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [vehicles, searchQuery, statusFilter, typeFilter]);

  useEffect(() => { setPage(0); }, [searchQuery, statusFilter, typeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredVehicles.length / PAGE_SIZE));
  const pagedVehicles = useMemo(
    () => filteredVehicles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [filteredVehicles, page],
  );

  const selectedVehicle = vehicles.find((v) => v.id === selectedId) || pagedVehicles[0] || filteredVehicles[0] || null;

  const activeCount = vehicles.filter((v) => v.status === "active").length;
  const idleCount = vehicles.filter((v) => v.status === "idle").length;
  const offlineCount = vehicles.filter((v) => v.status === "offline").length;

  const { data: statusPins = [] } = useQuery({
    queryKey: ["status-pins", organizationId, (dispatchQuery.data ?? []).map((d: any) => d.id).join(",")],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const activeIds = (dispatchQuery.data ?? []).map((d: any) => d.id);
      if (!activeIds.length) return [] as TrackingPin[];
      const { data: updates } = await supabase
        .from("delivery_updates")
        .select("dispatch_id, location, latitude, longitude, status, created_at")
        .in("dispatch_id", activeIds)
        .not("latitude", "is", null)
        .not("longitude", "is", null)
        .order("created_at", { ascending: false });
      const seen = new Set<string>();
      return (updates ?? [])
        .filter((u: any) => {
          if (seen.has(u.dispatch_id)) return false;
          seen.add(u.dispatch_id);
          return true;
        })
        .map((u: any): TrackingPin => {
          const d = (dispatchQuery.data ?? []).find((x: any) => x.id === u.dispatch_id);
          const v = (vehiclesQuery.data ?? []).find((x: any) => x.id === d?.vehicle_id);
          const dr = (driversQuery.data ?? []).find((x: any) => x.id === d?.driver_id);
          return {
            id: u.dispatch_id,
            lat: Number(u.latitude),
            lng: Number(u.longitude),
            label: v?.registration_number ?? d?.dispatch_number ?? "Vehicle",
            vehicleType: v?.vehicle_type ?? "truck",
            source: "status_update",
            location: u.location,
            updatedAt: u.created_at,
            driverName: dr?.full_name ?? null,
          };
        });
    },
  });

  const { data: driverGpsPins = [] } = useQuery({
    queryKey: ["driver-gps-pins", organizationId, (dispatchQuery.data ?? []).map((d: any) => d.driver_id).filter(Boolean).join(",")],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const activeDriverIds = (dispatchQuery.data ?? []).map((d: any) => d.driver_id).filter(Boolean);
      if (!activeDriverIds.length) return [] as TrackingPin[];
      const { data: gpsDrivers } = await supabase
        .from("drivers")
        .select("id, full_name, last_lat, last_lng, last_location_at")
        .in("id", activeDriverIds)
        .not("last_lat", "is", null)
        .not("last_lng", "is", null);
      return (gpsDrivers ?? []).map((dr: any): TrackingPin => {
        const dispatch = (dispatchQuery.data ?? []).find((d: any) => d.driver_id === dr.id);
        const vehicle = (vehiclesQuery.data ?? []).find((v: any) => v.id === dispatch?.vehicle_id);
        return {
          id: "gps-" + dr.id,
          lat: Number(dr.last_lat),
          lng: Number(dr.last_lng),
          label: vehicle?.registration_number ?? dr.full_name,
          vehicleType: vehicle?.vehicle_type ?? "van",
          source: "driver_gps",
          location: null,
          updatedAt: dr.last_location_at,
          driverName: dr.full_name,
        };
      });
    },
  });

  const allMapPins = useMemo(() => {
    const gpsByDriver = new Map(driverGpsPins.map((p) => [p.driverName, p]));
    const statusOnly = statusPins.filter((p) => {
      const d = (dispatchQuery.data ?? []).find((x: any) => x.id === p.id);
      const dr = (driversQuery.data ?? []).find((x: any) => x.id === d?.driver_id);
      if (!dr?.full_name) return true;
      return !gpsByDriver.has(dr.full_name);
    });
    return [...driverGpsPins, ...statusOnly];
  }, [driverGpsPins, statusPins, dispatchQuery.data, driversQuery.data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ minHeight: "600px" }}>
      {/* Vehicle List */}
      <div className="glass-card p-4 overflow-hidden flex flex-col" style={{ maxHeight: "700px" }}>
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicle, driver, shipment…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active ({activeCount})</SelectItem>
                <SelectItem value="idle">Idle ({idleCount})</SelectItem>
                <SelectItem value="offline">Offline ({offlineCount})</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="bg-secondary/50 border-border/50">
                <Truck className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {vehicleTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2">
          {isLoading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading fleet…
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive py-4">
              Failed to load tracking data. Try refreshing.
            </div>
          )}
          {!isLoading && filteredVehicles.length === 0 && (
            <div className="text-sm text-muted-foreground py-10 text-center">
              No vehicles match your filters for this organization.
            </div>
          )}
          {pagedVehicles.map((vehicle, index) => (
            <motion.div
              key={vehicle.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.02 }}
              onClick={() => setSelectedId(vehicle.id)}
              className={`p-3 rounded-lg cursor-pointer transition-all ${
                selectedVehicle?.id === vehicle.id
                  ? "bg-primary/10 border border-primary/30"
                  : "bg-secondary/30 hover:bg-secondary/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Truck className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground truncate">{vehicle.vehicleNumber}</span>
                  {vehicle.vehicleType && (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">
                      {vehicle.vehicleType}
                    </span>
                  )}
                </div>
                <Badge className={`${statusConfig[vehicle.status].color} shrink-0`}>
                  {statusConfig[vehicle.status].label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-1 truncate">
                {vehicle.driverName} · {vehicle.shipmentId}
              </p>
              {vehicle.hasDispatch ? (
                <>
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    <span className="text-foreground">{vehicle.origin}</span> →{" "}
                    <span className="text-foreground">{vehicle.destination}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">ETA: {vehicle.eta}</span>
                    {vehicle.status === "active" && (
                      <span className="text-primary">{vehicle.speed} km/h</span>
                    )}
                  </div>
                  <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${vehicle.progress}%` }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground italic">No active dispatch</p>
              )}
            </motion.div>
          ))}
        </div>

        {filteredVehicles.length > PAGE_SIZE && (
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-border/50 text-xs text-muted-foreground">
            <span>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredVehicles.length)} of {filteredVehicles.length}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span>{page + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Map Panel */}
      <div className="lg:col-span-2 glass-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <h3 className="font-heading font-semibold text-foreground">Fleet Map</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-success" />Active ({activeCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-warning" />Idle ({idleCount})
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-muted" />Offline ({offlineCount})
              </span>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {allMapPins.length === 0 ? (
          <div className="flex-1 bg-secondary/30 rounded-lg flex items-center justify-center min-h-[300px]">
            <div className="text-center p-8">
              <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">No vehicle locations yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Pins appear here when van or bus drivers share their location in the Driver App,
                or when a dispatcher sends a status update with a location.
              </p>
            </div>
          </div>
        ) : googleMapsKey ? (
          <div className="flex-1 rounded-lg overflow-hidden min-h-[300px]">
            <GoogleTrackingMap pins={allMapPins} apiKey={googleMapsKey} />
          </div>
        ) : (
          <div className="flex-1 bg-secondary/30 rounded-lg p-4 overflow-auto min-h-[300px]">
            <p className="text-xs text-muted-foreground mb-3">
              {allMapPins.length} vehicle location{allMapPins.length !== 1 ? "s" : ""} —
              add VITE_GOOGLE_MAPS_API_KEY to enable the map
            </p>
            <div className="space-y-2">
              {allMapPins.map((pin) => (
                <div key={pin.id} className="flex items-start gap-2 p-2 bg-background/60 rounded border">
                  <MapPin className={`w-4 h-4 mt-0.5 ${pin.source === "driver_gps" ? "text-emerald-500" : "text-amber-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{pin.label}</p>
                    {pin.driverName && <p className="text-xs text-muted-foreground">👤 {pin.driverName}</p>}
                    {pin.location && <p className="text-xs text-muted-foreground truncate">📍 {pin.location}</p>}
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {pin.source === "driver_gps" ? "📱 Live GPS" : "📧 Status update"} ·{" "}
                      {new Date(pin.updatedAt).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 bg-secondary/30 rounded-lg"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {selectedVehicle.vehicleNumber}
                    {selectedVehicle.vehicleType && (
                      <span className="ml-2 text-xs uppercase text-muted-foreground">
                        {selectedVehicle.vehicleType}
                      </span>
                    )}
                  </h4>
                  <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedVehicle.driverName}
                    {selectedVehicle.driverPhone && <span>· {selectedVehicle.driverPhone}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild={!!selectedVehicle.driverPhone} disabled={!selectedVehicle.driverPhone}>
                  {selectedVehicle.driverPhone ? (
                    <a href={`tel:${selectedVehicle.driverPhone}`}>
                      <Phone className="w-4 h-4 mr-1" />Contact
                    </a>
                  ) : (
                    <span><Phone className="w-4 h-4 mr-1" />Contact</span>
                  )}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedVehicle.lat == null || selectedVehicle.lng == null}
                  onClick={() => {
                    if (selectedVehicle.lat != null && selectedVehicle.lng != null) {
                      window.open(
                        `https://www.google.com/maps/dir/?api=1&destination=${selectedVehicle.lat},${selectedVehicle.lng}`,
                        "_blank",
                      );
                    }
                  }}
                >
                  <Navigation className="w-4 h-4 mr-1" />Navigate
                </Button>
              </div>
            </div>

            {selectedVehicle.hasDispatch ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/50">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                      <Hash className="w-3 h-3" /> Shipment ID
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">{selectedVehicle.shipmentId}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3" /> Last update
                    </p>
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedVehicle.lastUpdate}
                      {selectedVehicle.lastUpdateRaw && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({new Date(selectedVehicle.lastUpdateRaw).toLocaleString()})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3" /> Pickup
                    </p>
                    <p className="text-sm text-foreground break-words">{selectedVehicle.origin}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3" /> Delivery
                    </p>
                    <p className="text-sm text-foreground break-words">{selectedVehicle.destination}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border/50">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Speed</p>
                    <p className="text-lg font-semibold text-foreground">{selectedVehicle.speed} km/h</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">ETA</p>
                    <p className="text-lg font-semibold text-foreground truncate">{selectedVehicle.eta}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">SLA deadline</p>
                    <p className="text-sm font-semibold text-foreground truncate">
                      {selectedVehicle.slaDeadline
                        ? new Date(selectedVehicle.slaDeadline).toLocaleString()
                        : "-"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="text-lg font-semibold text-foreground">{selectedVehicle.progress}%</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-3 border-t border-border/50 text-sm text-muted-foreground">
                This vehicle has no active dispatch and is currently{" "}
                <span className="text-foreground font-medium">offline</span>. It will appear with live
                shipment details once a dispatch is assigned.
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default LiveTrackingPanel;
