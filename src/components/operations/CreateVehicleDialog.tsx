import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Truck, Loader2 } from "lucide-react";
import { isQuotaError, emitQuotaExceeded, resourceFromError } from "@/lib/quotaErrors";

const TRUCK_TYPES = [
  "Flatbed", "Box Truck", "Curtain Side", "Tanker", "Refrigerated",
  "Tipper", "Lowbed", "Container Carrier", "Van", "Pickup",
];

const CreateVehicleDialog = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    registration_number: "",
    vehicle_type: "",
    truck_type: "",
    make: "",
    model: "",
    year: "",
    capacity_kg: "",
    fuel_type: "diesel",
    ownership_type: "owned",
  });

  const handleSubmit = async () => {
    if (!form.registration_number || !form.vehicle_type) {
      toast({ title: "Missing fields", description: "Registration number and vehicle type are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("vehicles").insert({
        registration_number: form.registration_number,
        vehicle_type: form.vehicle_type,
        truck_type: form.truck_type || null,
        make: form.make || null,
        model: form.model || null,
        year: form.year ? parseInt(form.year) : null,
        capacity_kg: form.capacity_kg ? parseFloat(form.capacity_kg) : null,
        fuel_type: form.fuel_type,
        ownership_type: form.ownership_type,
      });

      if (error) throw error;

      toast({ title: "Vehicle added", description: `${form.registration_number} registered successfully` });
      queryClient.invalidateQueries({ queryKey: ["fleet-health"] });
      queryClient.invalidateQueries({ queryKey: ["available-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["ops-vehicles-list"] });
      setOpen(false);
      setForm({ registration_number: "", vehicle_type: "", truck_type: "", make: "", model: "", year: "", capacity_kg: "", fuel_type: "diesel", ownership_type: "owned" });
    } catch (err: any) {
      if (isQuotaError(err)) {
        emitQuotaExceeded({ resource: resourceFromError(err.message ?? ""), message: err.message ?? "" });
      } else {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Truck className="w-3 h-3 mr-1" />Add Vehicle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register New Vehicle</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Registration / Plate Number *</Label>
            <Input value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))} placeholder="e.g. ABC-123-XY" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Vehicle Type *</Label>
              <Select value={form.vehicle_type} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="truck">Truck</SelectItem>
                  <SelectItem value="van">Van</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="trailer">Trailer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Truck Type</Label>
              <Select value={form.truck_type} onValueChange={(v) => setForm((p) => ({ ...p, truck_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TRUCK_TYPES.map((t) => <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label>Make</Label>
              <Input value={form.make} onChange={(e) => setForm((p) => ({ ...p, make: e.target.value }))} placeholder="e.g. MAN" />
            </div>
            <div>
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))} placeholder="e.g. TGS" />
            </div>
            <div>
              <Label>Year</Label>
              <Input type="number" value={form.year} onChange={(e) => setForm((p) => ({ ...p, year: e.target.value }))} placeholder="2024" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Capacity (kg)</Label>
              <Input type="number" value={form.capacity_kg} onChange={(e) => setForm((p) => ({ ...p, capacity_kg: e.target.value }))} placeholder="e.g. 30000" />
            </div>
            <div>
              <Label>Fuel Type</Label>
              <Select value={form.fuel_type} onValueChange={(v) => setForm((p) => ({ ...p, fuel_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="petrol">Petrol</SelectItem>
                  <SelectItem value="cng">CNG</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Ownership</Label>
            <Select value={form.ownership_type} onValueChange={(v) => setForm((p) => ({ ...p, ownership_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="owned">Company Owned</SelectItem>
                <SelectItem value="leased">Leased</SelectItem>
                <SelectItem value="vendor">Vendor/3rd Party</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
            Register Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateVehicleDialog;
