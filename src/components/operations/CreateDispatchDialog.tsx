import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Loader2, Route, ArrowLeftRight, ArrowRight, ChevronsUpDown, Check } from "lucide-react";
import { isQuotaError, emitQuotaExceeded, resourceFromError } from "@/lib/quotaErrors";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";

const CreateDispatchDialog = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Holds the id of a blocking inspection the user chose to override, so the
  // decision can be recorded against them in dispatch_safety_gates.
  const blockedOverrideRef = useRef<string | null>(null);
  const [returnTrip, setReturnTrip] = useState(false);
  const [routeComboOpen, setRouteComboOpen] = useState(false);
  const [customerComboOpen, setCustomerComboOpen] = useState(false);
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

  // ── Customers: fetch from customers table AND partners table, merge into one list ──
  // partners are stored separately but can be dispatch recipients; we upsert them into
  // customers on selection so the FK constraint on dispatches.customer_id is satisfied.
  const { data: customers } = useQuery({
    queryKey: ["ops-customers-list", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const [custOrgRes, custNullRes, partnersRes] = await Promise.all([
        supabase.from("customers")
          .select("id, company_name")
          .eq("organization_id", organizationId)
          .order("company_name"),
        supabase.from("customers")
          .select("id, company_name")
          .is("organization_id", null)
          .order("company_name"),
        supabase.from("partners")
          .select("id, company_name, contact_name, contact_email, contact_phone, partner_type")
          .eq("organization_id", organizationId)
          .in("approval_status", ["active", "approved", "pending_sa", "pending_coo"])
          .order("company_name"),
      ]);

      // Build a set of existing customer names to avoid showing duplicates
      const existingNames = new Set<string>();
      const map = new Map<string, { id: string; company_name: string; _source?: string; _partner?: any }>();

      [...(custOrgRes.data || []), ...(custNullRes.data || [])].forEach((c) => {
        map.set(c.id, c);
        existingNames.add(c.company_name.toLowerCase());
      });

      // Add partners that don't already exist as customers by name
      (partnersRes.data || []).forEach((p: any) => {
        if (!existingNames.has(p.company_name.toLowerCase())) {
          map.set(`partner_${p.id}`, { id: `partner_${p.id}`, company_name: p.company_name, _source: "partner", _partner: p });
        }
      });

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
    console.log("[CreateDispatch] Submit triggered", {
      customer_id: form.customer_id,
      pickup_address: form.pickup_address,
      delivery_address: form.delivery_address,
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id,
      organizationId,
    });

    if (!form.customer_id || !form.pickup_address || !form.delivery_address) {
      console.warn("[CreateDispatch] Validation failed — missing required fields");
      toast({ title: "Missing fields", description: "Customer, pickup & delivery addresses are required", variant: "destructive" });
      return;
    }

    // Safety gate: a vehicle whose last COMPLETED inspection failed on a
    // safety-critical item must not be dispatched unnoticed. Previously
    // blocked_dispatch was recorded and displayed but never enforced at the
    // point of dispatch, so a failed vehicle could still be sent out.
    if (form.vehicle_id) {
      const { data: blockingInspection } = await supabase
        .from("vehicle_inspections")
        .select("id, inspection_type, inspector_notes, completed_at")
        .eq("vehicle_id", form.vehicle_id)
        .eq("blocked_dispatch", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (blockingInspection) {
        const proceed = window.confirm(
          "SAFETY WARNING\n\n" +
          "This vehicle failed its most recent " +
          `${blockingInspection.inspection_type?.replace("_", "-") || "safety"} inspection ` +
          "on a safety-critical item and is flagged as blocked from dispatch.\n\n" +
          (blockingInspection.inspector_notes ? `Inspector notes: ${blockingInspection.inspector_notes}\n\n` : "") +
          "Dispatching anyway will be recorded against your user for audit.\n\n" +
          "Proceed regardless?"
        );
        if (!proceed) return;
        blockedOverrideRef.current = blockingInspection.id;
      } else {
        blockedOverrideRef.current = null;
      }
    }

    setSaving(true);
    try {
      const costValue = form.cost ? parseFloat(form.cost) : null;
      const dieselNum = form.diesel_liters ? parseFloat(form.diesel_liters) : null;

      // If user picked a partner (prefixed id), resolve or create a matching customers row
      let resolvedCustomerId = form.customer_id;
      console.log("[CreateDispatch] Raw customer_id:", form.customer_id);

      if (form.customer_id.startsWith("partner_")) {
        console.log("[CreateDispatch] Partner ID detected — resolving to customers table");
        const partnerEntry = customers?.find((c) => c.id === form.customer_id) as any;
        const p = partnerEntry?._partner;
        console.log("[CreateDispatch] Partner cache entry:", partnerEntry, "| _partner:", p);

        if (!p) {
          console.warn("[CreateDispatch] _partner missing from cache — fetching from DB");
          const rawPartnerId = form.customer_id.replace("partner_", "");
          const { data: partnerRow, error: partnerErr } = await supabase
            .from("partners")
            .select("id, company_name, contact_name, contact_email, contact_phone")
            .eq("id", rawPartnerId)
            .maybeSingle();

          console.log("[CreateDispatch] DB partner fetch:", { partnerRow, partnerErr });

          if (!partnerRow) {
            toast({ title: "Customer not found", description: "Please re-select the customer and try again.", variant: "destructive" });
            setSaving(false);
            return;
          }

          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("company_name", partnerRow.company_name)
            .maybeSingle();

          console.log("[CreateDispatch] Existing customer match:", existing);

          if (existing) {
            resolvedCustomerId = existing.id;
          } else {
            const { data: created, error: createErr } = await supabase
              .from("customers")
              .insert({
                company_name: partnerRow.company_name,
                contact_name: partnerRow.contact_name || partnerRow.company_name,
                email: partnerRow.contact_email || "noreply@routeace.app",
                phone: partnerRow.contact_phone || "N/A",
                organization_id: organizationId,
                created_by: user?.id,
              })
              .select("id")
              .single();
            console.log("[CreateDispatch] Customer insert from partner (DB path):", { created, createErr });
            if (createErr) throw createErr;
            resolvedCustomerId = created!.id;
          }
        } else {
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("company_name", p.company_name)
            .maybeSingle();

          console.log("[CreateDispatch] Existing customer match (cache path):", existing);

          if (existing) {
            resolvedCustomerId = existing.id;
          } else {
            const { data: created, error: createErr } = await supabase
              .from("customers")
              .insert({
                company_name: p.company_name,
                contact_name: p.contact_name || p.company_name,
                email: p.contact_email || "noreply@routeace.app",
                phone: p.contact_phone || "N/A",
                organization_id: organizationId,
                created_by: user?.id,
              })
              .select("id")
              .single();
            console.log("[CreateDispatch] Customer insert from partner (cache path):", { created, createErr });
            if (createErr) throw createErr;
            resolvedCustomerId = created!.id;
          }
        }
      }

      console.log("[CreateDispatch] Resolved customer_id:", resolvedCustomerId);

      // Final guard — if still not a UUID, abort cleanly
      if (!resolvedCustomerId || resolvedCustomerId.startsWith("partner_")) {
        console.error("[CreateDispatch] Guard failed — resolvedCustomerId still invalid:", resolvedCustomerId);
        toast({ title: "Customer required", description: "Please select a valid customer before creating a dispatch.", variant: "destructive" });
        setSaving(false);
        return;
      }

      const insertPayload = {
        dispatch_number: `DSP-${Date.now()}`,
        organization_id: organizationId,
        customer_id: resolvedCustomerId,
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
      };
      console.log("[CreateDispatch] Insert payload:", insertPayload);

      const { data: disp, error } = await supabase.from("dispatches").insert([insertPayload as any]).select("id").single();
      console.log("[CreateDispatch] Insert result:", { disp, error });

      if (error) throw error;

      // Audit an override of the inspection safety gate.
      if (blockedOverrideRef.current && disp?.id) {
        await supabase.from("dispatch_safety_gates").insert({
          organization_id: organizationId,
          vehicle_id: form.vehicle_id || null,
          dispatch_id: disp.id,
          gate_type: "pre_dispatch",
          decision: "overridden",
          reason: "Dispatched despite a failed safety-critical inspection",
          inspection_id: blockedOverrideRef.current,
          override_by: user?.id ?? null,
          override_reason: "Manual override at dispatch creation",
        } as any);
        blockedOverrideRef.current = null;
      }

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
      console.error("[CreateDispatch] Error caught:", { code: (err as any)?.code, message: err?.message, details: (err as any)?.details, err });
      if (isQuotaError(err)) {
        console.warn("[CreateDispatch] Identified as quota error — showing upgrade dialog");
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
            <Popover open={routeComboOpen} onOpenChange={setRouteComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between bg-white font-normal">
                  {form.route_id
                    ? routes?.find((r: any) => r.id === form.route_id)?.name ?? "Select route…"
                    : routesLoading ? "Loading routes…" : "Select a saved route to auto-fill addresses"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search routes…" />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty>No routes found.</CommandEmpty>
                    <CommandGroup>
                      {routes?.map((r: any) => (
                        <CommandItem
                          key={r.id}
                          value={`${r.name} ${r.origin} ${r.destination}`}
                          onSelect={() => { handleRouteSelect(r.id); setRouteComboOpen(false); }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${form.route_id === r.id ? "opacity-100" : "opacity-0"}`} />
                          <span className="font-medium">{r.name}</span>
                          <span className="text-muted-foreground ml-1 text-xs truncate">
                            {r.origin?.split(",")[0]} → {r.destination?.split(",")[0]}
                            {r.distance_km ? ` · ${r.distance_km} km` : ""}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {form.route_id && (
              <p className="text-xs text-emerald-600 font-medium">
                ✓ Pickup, delivery & distance auto-filled — you can still edit below
              </p>
            )}
          </div>

          {/* ── Customer ────────────────────────────────────────────────── */}
          <div>
            <Label>Customer *</Label>
            <Popover open={customerComboOpen} onOpenChange={setCustomerComboOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {form.customer_id
                    ? customers?.find((c: any) => c.id === form.customer_id)?.company_name ?? "Select customer…"
                    : customers?.length ? "Select customer or partner" : "No customers or partners added yet"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers…" />
                  <CommandList className="max-h-60 overflow-y-auto">
                    <CommandEmpty>No customers found.</CommandEmpty>
                    <CommandGroup>
                      {customers?.map((c: any) => (
                        <CommandItem
                          key={c.id}
                          value={c.company_name}
                          onSelect={() => { setForm((p) => ({ ...p, customer_id: c.id })); setCustomerComboOpen(false); }}
                        >
                          <Check className={`mr-2 h-4 w-4 ${form.customer_id === c.id ? "opacity-100" : "opacity-0"}`} />
                          {c.company_name}
                          {c._source === "partner" && (
                            <span className="text-muted-foreground text-xs ml-1">· Partner</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
