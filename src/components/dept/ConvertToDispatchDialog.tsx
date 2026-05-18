/**
 * ConvertToDispatchDialog
 * Multi-select pending outbound requests → group into a single dispatch,
 * assign a 3PL transporter, and email the transporter.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Truck } from "lucide-react";
import { toast } from "sonner";

interface Props {
  pendingRequests: any[];
  onDone?: () => void;
}

export default function ConvertToDispatchDialog({ pendingRequests, onDone }: Props) {
  const { user, organizationId } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transporterId, setTransporterId] = useState("");
  const [scheduledPickup, setScheduledPickup] = useState("");
  const [agreedRate, setAgreedRate] = useState("");
  const [totalKm, setTotalKm] = useState("");
  const [dieselLiters, setDieselLiters] = useState("");
  const [extraDrops, setExtraDrops] = useState<{ address: string; notes: string }[]>([]);

  const { data: transporters = [] } = useQuery({
    queryKey: ["ld-transporters-approved", organizationId],
    enabled: open && !!organizationId,
    queryFn: async () => {
      const { data } = await (supabase.from("ld_transporters" as any) as any)
        .select("id, company_name, email, contact_name")
        .eq("organization_id", organizationId)
        .eq("onboarding_status", "approved")
        .order("company_name");
      return data ?? [];
    },
  });

  const toggle = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const create = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (selectedIds.length === 0) throw new Error("Select at least one request");
      if (!transporterId) throw new Error("Select a transporter");

      const rows = pendingRequests.filter((r) => selectedIds.includes(r.id));
      const first = rows[0];
      const dispatchNumber = `DSP-${Date.now()}`;
      const cargo = rows.map((r) => `${r.sku ?? r.picklist_number ?? "-"} → ${r.customer_name ?? r.internal_stakeholder ?? ""}`).join("; ");
      const totalWeight = rows.reduce((acc, r) => acc + (Number(r.total_weight_kg) || 0), 0);

      const totalKmNum = totalKm ? parseFloat(totalKm) : null;
      const dieselNum = dieselLiters ? parseFloat(dieselLiters) : null;

      const { data: disp, error: e1 } = await supabase.from("dispatches").insert({
        dispatch_number: dispatchNumber,
        pickup_address: first.origin_address,
        delivery_address: rows.map((r) => r.destination_address).join(" | "),
        cargo_description: cargo.slice(0, 1000),
        cargo_weight_kg: totalWeight || null,
        scheduled_pickup: scheduledPickup || null,
        cost: agreedRate ? parseFloat(agreedRate) : null,
        status: "assigned",
        transporter_id: transporterId,
        source_outbound_ids: selectedIds,
        organization_id: organizationId,
        created_by: user.id,
        submitted_by: user.id,
        distance_km: totalKmNum,
        total_distance_km: totalKmNum,
        suggested_fuel_liters: dieselNum,
        total_drops: rows.length + extraDrops.length,
        notes: rows.map((r) => `Picklist ${r.picklist_number ?? ""} | Waybill ${r.waybill_number ?? ""}`).join("\n"),
      } as any).select("id, dispatch_number").single();
      if (e1) throw e1;

      // Insert dispatch_dropoffs (per request + extra drops for the 3PL to update)
      const dropRows = [
        ...rows.map((r, i) => ({ dispatch_id: disp!.id, address: r.destination_address, sequence_order: i + 1, notes: `WB ${r.waybill_number ?? r.picklist_number ?? ""}` })),
        ...extraDrops.map((d, i) => ({ dispatch_id: disp!.id, address: d.address, sequence_order: rows.length + i + 1, notes: d.notes || null })),
      ].filter((d) => d.address);
      if (dropRows.length) await supabase.from("dispatch_dropoffs").insert(dropRows as any);

      const { data: job, error: e2 } = await (supabase.from("ld_transporter_jobs" as any) as any).insert({
        organization_id: organizationId,
        transporter_id: transporterId,
        dispatch_id: disp!.id,
        status: "assigned",
        agreed_rate: agreedRate ? parseFloat(agreedRate) : null,
      }).select("id").single();
      if (e2) throw e2;

      const { error: e3 } = await supabase.from("outbound_requests")
        .update({ status: "assigned", linked_dispatch_id: disp!.id, transporter_id: transporterId, converted_at: new Date().toISOString() })
        .in("id", selectedIds);
      if (e3) throw e3;

      // Create waybill rows (1 per outbound - picklist == waybill)
      for (const r of rows) {
        await supabase.from("waybills").insert({
          waybill_number: r.waybill_number ?? r.picklist_number ?? `WB-${Date.now()}`,
          dispatch_id: disp!.id,
          transporter_id: transporterId,
          customer_name: r.customer_name ?? r.internal_stakeholder ?? null,
          delivery_address: r.destination_address,
          status: "generated",
          pod_status: "pending_upload",
          generated_by: user.id,
        } as any);
      }

      // Fire notification email
      try {
        await supabase.functions.invoke("notify-transporter-dispatch", {
          body: { dispatch_id: disp!.id, transporter_id: transporterId, job_id: job?.id },
        });
      } catch (e) {
        console.warn("notify-transporter-dispatch failed", e);
      }

      return disp;
    },
    onSuccess: (d) => {
      toast.success(`Dispatch ${d?.dispatch_number} created - transporter notified by email`);
      qc.invalidateQueries({ queryKey: ["outbound-requests"] });
      qc.invalidateQueries({ queryKey: ["waybills-management"] });
      setOpen(false); setSelectedIds([]); setTransporterId(""); setScheduledPickup(""); setAgreedRate(""); setTotalKm(""); setDieselLiters(""); setExtraDrops([]);
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create dispatch"),
  });

  const eligible = pendingRequests.filter((r) => r.status === "pending");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={eligible.length === 0}>
        <Truck className="w-4 h-4 mr-1" /> Convert to Dispatch
      </Button>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Convert Pending Requests → Dispatch</DialogTitle>
          <DialogDescription>
            Select one or more pending outbound requests, pick a 3PL transporter,
            and we'll email the transporter with a portal link to accept the job.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="border rounded-lg max-h-64 overflow-y-auto divide-y">
            {eligible.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground text-center">No pending requests to convert.</div>
            )}
            {eligible.map((r) => (
              <label key={r.id} className="flex items-start gap-3 p-3 hover:bg-muted/30 cursor-pointer">
                <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                <div className="flex-1 text-sm">
                  <div className="font-mono text-xs text-muted-foreground">
                    {r.picklist_number ?? r.request_number} · WB {r.waybill_number ?? "-"}
                  </div>
                  <div className="font-medium">{r.customer_name ?? r.internal_stakeholder ?? "-"} · SKU {r.sku ?? "-"}</div>
                  <div className="text-xs text-muted-foreground">{r.origin_address} → {r.destination_address}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>3PL Transporter *</Label>
            <Select value={transporterId} onValueChange={setTransporterId}>
              <SelectTrigger>
                <SelectValue placeholder={transporters.length ? "Choose transporter" : "No approved transporters yet"} />
              </SelectTrigger>
              <SelectContent>
                {transporters.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.company_name}{t.email ? ` · ${t.email}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Scheduled Pickup</Label>
              <Input type="datetime-local" value={scheduledPickup} onChange={(e) => setScheduledPickup(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Agreed Rate (₦)</Label>
              <Input type="number" value={agreedRate} onChange={(e) => setAgreedRate(e.target.value)} placeholder="e.g. 150000" />
            </div>
            <div className="space-y-1.5">
              <Label>Total Distance (km)</Label>
              <Input type="number" value={totalKm} onChange={(e) => setTotalKm(e.target.value)} placeholder="e.g. 1500" />
            </div>
            <div className="space-y-1.5">
              <Label>Diesel (liters)</Label>
              <Input type="number" value={dieselLiters} onChange={(e) => setDieselLiters(e.target.value)} placeholder="e.g. 350" />
            </div>
          </div>

          <div className="space-y-2 border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Extra Drop Lines (optional)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => setExtraDrops((p) => [...p, { address: "", notes: "" }])}>
                + Add drop
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">3PL will update each drop in their portal.</p>
            {extraDrops.map((d, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                <Input placeholder="Drop address" value={d.address} onChange={(e) => setExtraDrops((p) => p.map((x, j) => j === i ? { ...x, address: e.target.value } : x))} />
                <Input placeholder="Notes" value={d.notes} onChange={(e) => setExtraDrops((p) => p.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} />
                <Button type="button" size="sm" variant="ghost" onClick={() => setExtraDrops((p) => p.filter((_, j) => j !== i))}>×</Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => create.mutate()} disabled={create.isPending || !transporterId || selectedIds.length === 0}>
            {create.isPending ? "Creating..." : `Create Dispatch (${selectedIds.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
