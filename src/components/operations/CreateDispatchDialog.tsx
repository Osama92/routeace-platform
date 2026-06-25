import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Loader2, Route, ArrowLeftRight, ArrowRight } from "lucide-react";
import { isQuotaError, emitQuotaExceeded, resourceFromError } from "@/lib/quotaErrors";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";

const CreateDispatchDialog = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [returnTrip, setReturnTrip] = useState(false);
  const [extraDrops, setExtraDrops] = useState<{ address: string; notes: string }[]>([]);
  const [form, setForm] = useState({
    customer_id: "",
    route_id: "",
    pickup_address: "",
    pickup_lat: null as number | null,
    pickup_lng: null as number | null,
    delivery_address: "",
    delivery_lat: null as number | null,
    delivery_lng: null as number | null,
    cargo_description: "",
    cargo_weight_kg: "",
    priority: "normal",
    scheduled_pickup: "",
    vehicle_id: "",
    driver_id: "",
    transporter_id: "",
    vendor_id: "",
    distance_km: "",
    diesel_liters: "",
    cost: "",
  });

  // ── Routes ───────────────────────────────────────────────────────────────
  // Single OR query: matches org-scoped routes AND legacy NULL-org routes
  // created by this user (migration gap backfill). Falls back to created_by
  // filter only if the organization_id column doesn't exist yet (schema cache).
  const { data: routes, isLoading: routesLoading } = useQuery({
    queryKey: ["ops-routes-list", organizationId, user?.id],
    queryFn: async () => {
      if (!organizationId || !user?.id) return [];
      const userId = user.id;

      const ROUTE_COLS = "id, name, origin, origin_lat, origin_lng, destination, destination_lat, destination_lng, distance_km";

      // Two simple queries merged: org-scoped + creator access (handles super_admin + migration gap)
      const [orgRes, creatorRes] = await Promise.all([
        supabase.from("routes").select(ROUTE_COLS).eq("is_active", true).eq("organization_id", organizationId).order("name"),
        supabase.from("routes").select(ROUTE_COLS).eq("is_active", true).eq("created_by", userId).order("name"),
      ]);

      // Merge and dedupe by id
      const routeMap = new Map<string, any>();
      [...(orgRes.data || []), ...(creatorRes.data || [])].forEach((r) => routeMap.set(r.id, r));
      const merged = Array.from(routeMap.values()).sort((a, b) => a.name?.localeCompare(b.name));

      // Silently backfill any routes missing organization_id
      const needsBackfill = merged.some((r: any) => !r.organization_id);
      if (needsBackfill) {
        supabase.from("routes").update({ organization_id: organizationId })
          .is("organization_id", null).eq("created_by", userId).then(() => {});
      }

      return merged;
    },
    enabled: open && !!organizationId && !!user?.id,
  });

  // ── Customers (org-scoped, with NULL org_id fallback for pre-migration rows) ──
  const { data: customers } = useQuery({
    queryKey: ["ops-customers-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const [orgRes, nullRes] = await Promise.all([
        supabase.from("customers")
          .select("id, company_name")
          .eq("organization_id", organizationId)
          .order("company_name"),
        supabase.from("customers")
          .select("id, company_name")
          .is("organization_id", null)
          .order("company_name"),
      ]);
      const map = new Map<string, any>();
      [...(orgRes.data || []), ...(nullRes.data || [])].forEach((c) => map.set(c.id, c));
      return Array.from(map.values()).sort((a, b) => a.company_name.localeCompare(b.company_name));
    },
    enabled: open && !!organizationId,
  });

  // ── Drivers (org-scoped, available only) ─────────────────────────────────
  const { data: drivers } = useQuery({
    queryKey: ["ops-drivers-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data } = await supabase.from("drivers")
        .select("id, full_name, status")
        .eq("organization_id", organizationId)
        .in("status", ["available", "active"])
        .order("full_name");
      return data || [];
    },
    enabled: open && !!organizationId,
  });

  // ── Vehicles (org-scoped + NULL org fallback; valid statuses: available/in_use/maintenance/retired) ──
  const { data: vehicles } = useQuery({
    queryKey: ["ops-vehicles-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const [orgRes, nullRes] = await Promise.all([
        supabase.from("vehicles")
          .select("id, registration_number, truck_type, vehicle_type, status")
          .eq("organization_id", organizationId)
          .eq("status", "available")
          .order("registration_number"),
        supabase.from("vehicles")
          .select("id, registration_number, truck_type, vehicle_type, status")
          .is("organization_id", null)
          .eq("status", "available")
          .order("registration_number"),
      ]);
      const map = new Map<string, any>();
      [...(orgRes.data || []), ...(nullRes.data || [])].forEach((v) => map.set(v.id, v));
      return Array.from(map.values()).sort((a, b) => (a.registration_number || "").localeCompare(b.registration_number || ""));
    },
    enabled: open && !!organizationId,
  });

  // ── Vendors from partners table (transporter + 3pl + vendor types) ────────
  const { data: vendors } = useQuery({
    queryKey: ["ops-vendors-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const [orgRes, nullRes] = await Promise.all([
        supabase.from("partners")
          .select("id, company_name, partner_type, contact_phone")
          .eq("organization_id", organizationId)
          .in("partner_type", ["transporter", "3pl", "vendor"])
          .in("approval_status", ["active", "approved", "pending_sa", "pending_coo"])
          .order("company_name"),
        supabase.from("partners")
          .select("id, company_name, partner_type, contact_phone")
          .is("organization_id", null)
          .in("partner_type", ["transporter", "3pl", "vendor"])
          .order("company_name"),
      ]);
      const map = new Map<string, any>();
      [...(orgRes.data || []), ...(nullRes.data || [])].forEach((p) => map.set(p.id, p));
      return Array.from(map.values()).sort((a, b) => a.company_name.localeCompare(b.company_name));
    },
    enabled: open && !!organizationId,
  });

  const oneWayKm = form.distance_km ? parseFloat(form.distance_km) : null;
  const totalKm = oneWayKm ? (returnTrip ? oneWayKm * 2 : oneWayKm) : null;

  const handleRouteSelect = (routeId: string) => {
    const r = routes?.find((x: any) => x.id === routeId);
    setForm((p) => ({
      ...p,
      route_id: routeId,
      pickup_address: r?.origin ?? p.pickup_address,
      pickup_lat: r?.origin_lat ?? p.pickup_lat,
      pickup_lng: r?.origin_lng ?? p.pickup_lng,
      delivery_address: r?.destination ?? p.delivery_address,
      delivery_lat: r?.destination_lat ?? p.delivery_lat,
      delivery_lng: r?.destination_lng ?? p.delivery_lng,
      distance_km: r?.distance_km ? String(r.distance_km) : p.distance_km,
    }));
  };

  const resetForm = () => {
    setForm({
      customer_id: "", route_id: "",
      pickup_address: "", pickup_lat: null, pickup_lng: null,
      delivery_address: "", delivery_lat: null, delivery_lng: null,
      cargo_description: "", cargo_weight_kg: "", priority: "normal",
      scheduled_pickup: "", vehicle_id: "", driver_id: "", transporter_id: "", vendor_id: "",
      distance_km: "", diesel_liters: "", cost: "",
    });
    setReturnTrip(false);
    setExtraDrops([]);
  };

  const handleSubmit = async () => {
    if (!form.customer_id || !form.pickup_address || !form.delivery_address) {
      toast({ title: "Missing fields", description: "Customer, pickup & delivery addresses are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const costValue = form.cost ? parseFloat(form.cost) : null;
      const dieselNum = form.diesel_liters ? parseFloat(form.diesel_liters) : null;

      const { data: disp, error } = await supabase.from("dispatches").insert([{
        dispatch_number: `DSP-${Date.now()}`,
        organization_id: organizationId,          // org isolation
        customer_id: form.customer_id,
        route_id: form.route_id || null,
        pickup_address: form.pickup_address,
        delivery_address: form.delivery_address,
        cargo_description: form.cargo_description || null,
        cargo_weight_kg: form.cargo_weight_kg ? parseFloat(form.cargo_weight_kg) : null,
        priority: form.priority,
        scheduled_pickup: form.scheduled_pickup || null,
        vehicle_id: form.vehicle_id || null,
        driver_id: form.driver_id || null,
        transporter_id: form.transporter_id || null,
        distance_km: oneWayKm,
        return_distance_km: returnTrip ? oneWayKm : null,
        total_distance_km: totalKm,
        suggested_fuel_liters: dieselNum,
        total_drops: 1 + extraDrops.filter((d) => d.address).length,
        cost: costValue,
        status: form.driver_id || form.transporter_id ? "assigned" : "pending",
        created_by: user?.id,
        submitted_by: user?.id,
      } as any]).select("id").single();

      if (error) throw error;

      const drops = extraDrops.filter((d) => d.address).map((d, i) => ({
        dispatch_id: disp!.id,
        address: d.address,
        sequence_order: i + 2,
        notes: d.notes || null,
      }));
      if (drops.length) await supabase.from("dispatch_dropoffs").insert(drops as any);

      if (form.transporter_id) {
        try {
          const { data: job } = await (supabase.from("ld_transporter_jobs" as any) as any).insert({
            organization_id: organizationId,
            transporter_id: form.transporter_id,
            dispatch_id: disp!.id,
            status: "assigned",
            agreed_rate: costValue,
          }).select("id").single();
          await supabase.functions.invoke("notify-transporter-dispatch", {
            body: { dispatch_id: disp!.id, transporter_id: form.transporter_id, job_id: job?.id },
          });
        } catch (e) { console.warn("transporter notify failed", e); }
      }

      toast({ title: "Dispatch created", description: "New dispatch has been created successfully" });
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["ops-today-dispatches"] });
      queryClient.invalidateQueries({ queryKey: ["waybill-dispatches"] });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      if (isQuotaError(err)) {
        emitQuotaExceeded({ resource: resourceFromError(err.message ?? ""), message: err.message ?? "" });
      } else {
        toast({ title: "Error creating dispatch", description: err.message, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-3 h-3 mr-1" />New Dispatch</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Dispatch</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">

          {/* ── Route Selection ─────────────────────────────────────────── */}
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Route className="w-4 h-4" />
              Quick-fill from Route Library
            </div>
            <Select
              value={form.route_id}
              onValueChange={handleRouteSelect}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder={
                  routesLoading ? "Loading routes…" :
                  routes?.length ? "Select a saved route to auto-fill addresses" :
                  "No routes saved yet — add one in Routes Library"
                } />
              </SelectTrigger>
              <SelectContent>
                {routes?.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground ml-1 text-xs">
                      {r.origin?.split(",")[0]} → {r.destination?.split(",")[0]}
                      {r.distance_km ? ` · ${r.distance_km} km` : ""}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.route_id && (
              <p className="text-xs text-emerald-600 font-medium">
                ✓ Pickup, delivery & distance auto-filled — you can still edit below
              </p>
            )}
          </div>

          {/* ── Customer ────────────────────────────────────────────────── */}
          <div>
            <Label>Customer *</Label>
            <Select value={form.customer_id} onValueChange={(v) => setForm((p) => ({ ...p, customer_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
              <SelectContent>
                {customers?.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* ── Addresses ───────────────────────────────────────────────── */}
          <div>
            <Label>Pickup Address *</Label>
            <AddressAutocomplete
              value={form.pickup_address}
              onChange={(v) => setForm((p) => ({ ...p, pickup_address: v }))}
              onPlaceSelect={(pl) => setForm((p) => ({ ...p, pickup_address: pl.formattedAddress, pickup_lat: pl.lat, pickup_lng: pl.lng }))}
              placeholder="Search pickup location"
            />
          </div>
          <div>
            <Label>Delivery Address *</Label>
            <AddressAutocomplete
              value={form.delivery_address}
              onChange={(v) => setForm((p) => ({ ...p, delivery_address: v }))}
              onPlaceSelect={(pl) => setForm((p) => ({ ...p, delivery_address: pl.formattedAddress, delivery_lat: pl.lat, delivery_lng: pl.lng }))}
              placeholder="Search delivery location"
            />
          </div>

          {/* ── Distance & Return Trip ───────────────────────────────────── */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                {returnTrip ? <ArrowLeftRight className="w-4 h-4 text-primary" /> : <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                Trip Distance
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Return trip (to & fro)</span>
                <Switch checked={returnTrip} onCheckedChange={setReturnTrip} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">One-way distance (km)</Label>
                <Input
                  type="number"
                  value={form.distance_km}
                  onChange={(e) => setForm((p) => ({ ...p, distance_km: e.target.value }))}
                  placeholder="e.g. 350"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Total distance (km)</Label>
                <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                  {totalKm ? `${totalKm} km` : "—"}
                  {returnTrip && oneWayKm && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">({oneWayKm} × 2)</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Cargo & Priority ─────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Cargo Description</Label>
              <Input value={form.cargo_description} onChange={(e) => setForm((p) => ({ ...p, cargo_description: e.target.value }))} placeholder="e.g. 40ft container" />
            </div>
            <div>
              <Label>Weight (kg)</Label>
              <Input type="number" value={form.cargo_weight_kg} onChange={(e) => setForm((p) => ({ ...p, cargo_weight_kg: e.target.value }))} placeholder="e.g. 5000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Trip Cost (₦)</Label>
              <Input type="number" value={form.cost} onChange={(e) => setForm((p) => ({ ...p, cost: e.target.value }))} placeholder="e.g. 150000" />
            </div>
          </div>

          {/* ── Vendor / 3PL Partner ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Diesel (liters)</Label>
              <Input type="number" value={form.diesel_liters} onChange={(e) => setForm((p) => ({ ...p, diesel_liters: e.target.value }))} placeholder="e.g. 80" />
            </div>
            <div>
              <Label>Vendor / 3PL Partner</Label>
              <Select value={form.vendor_id} onValueChange={(v) => setForm((p) => ({ ...p, vendor_id: v, transporter_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={vendors?.length ? "Optional — select vendor/3PL" : "No vendors added yet"} />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.company_name}
                      <span className="text-muted-foreground text-xs ml-1">· {v.partner_type}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Extra Drops ───────────────────────────────────────────────── */}
          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Extra Drop Lines</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setExtraDrops((p) => [...p, { address: "", notes: "" }])}>+ Add drop</Button>
            </div>
            <p className="text-xs text-muted-foreground">3PL updates each drop in their portal.</p>
            {extraDrops.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Drop address" value={d.address} onChange={(e) => setExtraDrops((p) => p.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
                <Input placeholder="Notes" value={d.notes} onChange={(e) => setExtraDrops((p) => p.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} />
                <Button type="button" size="sm" variant="ghost" onClick={() => setExtraDrops((p) => p.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
          </div>

          {/* ── Schedule & Assignments ────────────────────────────────────── */}
          <div>
            <Label>Scheduled Pickup</Label>
            <Input type="datetime-local" value={form.scheduled_pickup} onChange={(e) => setForm((p) => ({ ...p, scheduled_pickup: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Assign Driver</Label>
              <Select value={form.driver_id} onValueChange={(v) => setForm((p) => ({ ...p, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder={drivers?.length ? "Select driver" : "No available drivers"} /></SelectTrigger>
                <SelectContent>
                  {drivers?.length === 0 && <SelectItem value="_none" disabled>No available drivers</SelectItem>}
                  {drivers?.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Assign Vehicle</Label>
              <Select value={form.vehicle_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v }))}>
                <SelectTrigger><SelectValue placeholder={vehicles?.length ? "Select vehicle" : "No available vehicles"} /></SelectTrigger>
                <SelectContent>
                  {vehicles?.length === 0 && <SelectItem value="_none" disabled>No available vehicles</SelectItem>}
                  {vehicles?.map((v) => <SelectItem key={v.id} value={v.id}>{v.registration_number}{(v.truck_type || v.vehicle_type) ? ` (${v.truck_type || v.vehicle_type})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Create Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateDispatchDialog;
