import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useTenantMode from "@/hooks/useTenantMode";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Warehouse, Plus, Truck, MapPin, Calendar, Package, AlertTriangle, RefreshCw, Hash, User, MapPinned, Boxes } from "lucide-react";
import { toast } from "sonner";
import ConvertToDispatchDialog from "@/components/dept/ConvertToDispatchDialog";
import ErpSalesOrderImportDialog from "@/components/dept/ErpSalesOrderImportDialog";

const STATUS_VARIANTS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  assigned: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  in_transit: "bg-purple-500/10 text-purple-700 border-purple-500/30",
  delivered: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/30",
};

const EMPTY_FORM = {
  warehouse_id: "",
  warehouse_name: "",
  sku: "",
  waybill_number: "",
  customer_id: "",
  customer_name: "",
  origin_address: "",
  destination_address: "",
  internal_stakeholder: "",
  goods_description: "",
  total_weight_kg: "",
  requested_date: new Date().toISOString().split("T")[0],
  priority: "normal",
  notes: "",
};

function genWaybill() {
  return `WB-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
}

export default function WarehouseOutbound() {
  const { user, organizationId } = useAuth();
  const qc = useQueryClient();
  const { isDepartment, mode } = useTenantMode();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: warehouses = [] } = useQuery({
    queryKey: ["warehouses", organizationId],
    queryFn: async () => {
      const q = supabase.from("warehouses" as any).select("id, name, code, location, address").eq("is_active", true).order("name");
      const { data, error } = organizationId ? await q.eq("organization_id", organizationId) : await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["outbound-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_requests" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const wh = warehouses.find((w) => w.id === form.warehouse_id);
      const composedNotes = [
        form.sku ? `SKU: ${form.sku}` : null,
        form.waybill_number ? `Waybill: ${form.waybill_number}` : null,
        form.customer_id ? `Customer ID: ${form.customer_id}` : null,
        form.notes || null,
      ].filter(Boolean).join("\n");
      const stakeholder = form.customer_name || form.internal_stakeholder;
      const { error } = await supabase.from("outbound_requests" as any).insert({
        warehouse_id: form.warehouse_id || null,
        warehouse_name: wh?.name ?? form.warehouse_name,
        origin_address: form.origin_address || wh?.address || wh?.location || "",
        destination_address: form.destination_address,
        internal_stakeholder: stakeholder,
        goods_description: form.goods_description,
        total_weight_kg: form.total_weight_kg ? parseFloat(form.total_weight_kg) : null,
        requested_date: form.requested_date,
        priority: form.priority,
        notes: composedNotes,
        created_by: user.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Outbound request created. Outbound Officer will assign a vehicle.");
      qc.invalidateQueries({ queryKey: ["outbound-requests"] });
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: (e: any) => toast.error(e.message || "Failed to create request"),
  });

  const [erpDialogOpen, setErpDialogOpen] = useState(false);


  const stats = {
    pending: requests.filter((r) => r.status === "pending").length,
    assigned: requests.filter((r) => r.status === "assigned").length,
    in_transit: requests.filter((r) => r.status === "in_transit").length,
    delivered: requests.filter((r) => r.status === "delivered").length,
  };

  const onPickWarehouse = (id: string) => {
    const wh = warehouses.find((w) => w.id === id);
    setForm((f) => ({
      ...f,
      warehouse_id: id,
      warehouse_name: wh?.name ?? "",
      origin_address: f.origin_address || wh?.address || wh?.location || "",
    }));
  };

  // Hard gate: Warehouse Outbound is an LD (Logistics Department) capability.
  // LC (Logistics Company) tenants must not see or operate this surface.
  if (!isDepartment) {
    return (
      <DashboardLayout
        title="Warehouse Outbound"
        subtitle="This module is available for Logistics Department tenants only"
      >
        <div className="max-w-xl mx-auto mt-12 text-center space-y-3">
          <Warehouse className="w-10 h-10 mx-auto text-muted-foreground" />
          <h2 className="text-xl font-semibold">Not available on your plan</h2>
          <p className="text-sm text-muted-foreground">
            Warehouse Outbound (warehouse → dispatch sync) is an LD-only workflow. Logistics
            Company tenants manage outbound flow through Dispatch, Routes, and Orders.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = "/dispatch")}>
            Go to Dispatch
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Warehouse Outbound Requests"
      subtitle="Warehouse-originated dispatch requests · inspection-driven dispatch enforced"
    >
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Warehouse className="w-3.5 h-3.5" /> Mode: {mode === "LOGISTICS_DEPARTMENT" ? "Department" : "Company"}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setErpDialogOpen(true)}>
              <RefreshCw className="w-4 h-4" />
              Import Sales Orders from ERP
            </Button>
            <ConvertToDispatchDialog pendingRequests={requests} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> New Outbound Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Outbound Request</DialogTitle>
                <DialogDescription>Fill line by line, or pull a pending pick directly from your ERP / WMS.</DialogDescription>
              </DialogHeader>

              <div className="flex items-center justify-between gap-2 p-3 rounded-lg border border-dashed bg-muted/30">
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Sync from ERP / WMS</p>
                  <p className="text-muted-foreground">Pulls next pending pick - SKU, waybill, customer ID & address - straight into this form.</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => { setOpen(false); setErpDialogOpen(true); }}>
                  Open ERP import
                </Button>
              </div>

              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Warehouse className="w-3.5 h-3.5" /> Warehouse *</Label>
                  <Select value={form.warehouse_id} onValueChange={onPickWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder={warehouses.length ? "Select warehouse" : "No warehouses configured"} />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}{w.code ? ` (${w.code})` : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5" /> SKU</Label>
                  <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. SKU-00123 (from ERP/WMS)" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Waybill Number</Label>
                  <div className="flex gap-2">
                    <Input value={form.waybill_number} onChange={(e) => setForm({ ...form, waybill_number: e.target.value })} placeholder="Enter manually or auto-generate" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, waybill_number: genWaybill() })}>Auto</Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> Customer ID (ERP)</Label>
                  <Input value={form.customer_id} onChange={(e) => setForm({ ...form, customer_id: e.target.value })} placeholder="As shown in ERP/WMS" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> {isDepartment ? "Internal Stakeholder / Customer" : "Customer / Recipient"}</Label>
                  <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} placeholder="Customer name as on ERP" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><MapPinned className="w-3.5 h-3.5" /> Customer Address (Destination) *</Label>
                  <Input value={form.destination_address} onChange={(e) => setForm({ ...form, destination_address: e.target.value })} placeholder="Delivery address from ERP" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Origin Address *</Label>
                  <Input value={form.origin_address} onChange={(e) => setForm({ ...form, origin_address: e.target.value })} placeholder="Auto-filled from warehouse" />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Requested Date *</Label>
                  <Input type="date" value={form.requested_date} onChange={(e) => setForm({ ...form, requested_date: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Total Weight (kg)</Label>
                  <Input type="number" value={form.total_weight_kg} onChange={(e) => setForm({ ...form, total_weight_kg: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Goods Description</Label>
                  <Textarea value={form.goods_description} onChange={(e) => setForm({ ...form, goods_description: e.target.value })} rows={2} />
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => create.mutate()} disabled={!form.warehouse_id || !form.origin_address || !form.destination_address || create.isPending}>
                  {create.isPending ? "Creating..." : "Create Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pending Assignment", value: stats.pending, icon: AlertTriangle, color: "text-amber-600" },
          { label: "Assigned", value: stats.assigned, icon: Truck, color: "text-blue-600" },
          { label: "In Transit", value: stats.in_transit, icon: MapPin, color: "text-purple-600" },
          { label: "Delivered Today", value: stats.delivered, icon: Package, color: "text-emerald-600" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Requests</CardTitle>
          <CardDescription>
            Click any row to view full details. Inspection-driven dispatch authority enforced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading…</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No outbound requests yet. Create your first one.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full text-left flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{r.request_number}</span>
                      <Badge variant="outline" className={STATUS_VARIANTS[r.status] || ""}>
                        {r.status}
                      </Badge>
                      {r.priority !== "normal" && (
                        <Badge variant="outline" className="text-[10px]">{r.priority}</Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium mt-1">{r.warehouse_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.origin_address} → {r.destination_address}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {new Date(r.requested_date).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{selected.request_number}</span>
                  <Badge variant="outline" className={STATUS_VARIANTS[selected.status] || ""}>
                    {selected.status}
                  </Badge>
                </SheetTitle>
                <SheetDescription>{selected.warehouse_name}</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                <Section label="Origin">{selected.origin_address}</Section>
                <Section label="Destination">{selected.destination_address}</Section>
                <div className="grid grid-cols-2 gap-3">
                  <Section label="Requested Date">{new Date(selected.requested_date).toLocaleDateString()}</Section>
                  <Section label="Priority"><Badge variant="outline">{selected.priority}</Badge></Section>
                  <Section label="Weight">{selected.total_weight_kg ? `${selected.total_weight_kg} kg` : "-"}</Section>
                  <Section label="Volume">{selected.total_volume_m3 ? `${selected.total_volume_m3} m³` : "-"}</Section>
                </div>
                <Section label={isDepartment ? "Internal Stakeholder" : "Customer / Recipient"}>
                  {selected.internal_stakeholder || "-"}
                </Section>
                <Section label="Goods Description">{selected.goods_description || "-"}</Section>
                <Section label="Notes">{selected.notes || "-"}</Section>
                <Section label="Linked Dispatch">
                  {selected.linked_dispatch_id ? (
                    <span className="font-mono text-xs">{selected.linked_dispatch_id}</span>
                  ) : <span className="text-muted-foreground">Not yet assigned</span>}
                </Section>
                <Section label="Created">{new Date(selected.created_at).toLocaleString()}</Section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ErpSalesOrderImportDialog
        open={erpDialogOpen}
        onOpenChange={setErpDialogOpen}
        organizationId={organizationId}
        onImported={() => qc.invalidateQueries({ queryKey: ["outbound-requests"] })}
      />
      </div>
    </DashboardLayout>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}
