import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Fuel, CheckCircle2, ShieldAlert, Gauge } from "lucide-react";

/**
 * The same 31 items the Fleet Inspection Engine has always used, kept
 * identical on purpose: 1,085 existing item records use these exact names, and
 * changing them would fragment the history a maintenance record depends on.
 */
const CHECKLIST_TEMPLATE = [
  { category: "Engine", items: ["Oil Level", "Coolant Level", "Belt Condition", "Engine Noise"], critical: [false, false, true, true] },
  { category: "Brakes", items: ["Brake Pads", "Brake Fluid", "Handbrake", "ABS Warning"], critical: [true, true, true, true] },
  { category: "Tires", items: ["Front Left Tread", "Front Right Tread", "Rear Left Tread", "Rear Right Tread", "Tire Pressure"], critical: [true, true, true, true, true] },
  { category: "Lights", items: ["Headlights", "Tail Lights", "Indicators", "Brake Lights"], critical: [true, true, true, true] },
  { category: "Safety", items: ["Fire Extinguisher", "First Aid Kit", "Reflective Triangle", "Seat Belts"], critical: [true, true, true, true] },
  { category: "Body", items: ["Windshield", "Mirrors", "Doors/Locks", "Load Securing"], critical: [false, true, false, true] },
  { category: "Fuel", items: ["Fuel Level", "Fuel Cap", "No Leaks"], critical: [false, false, true] },
  { category: "Documentation", items: ["Vehicle License", "Insurance", "Road Worthiness"], critical: [true, true, true] },
];

const CONDITIONS = [
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "critical", label: "Critical" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "pre_trip" | "post_trip";
  vehicleId: string;
  vehicleReg?: string;
  /** Empty when the check is filled BEFORE the dispatch exists — the trip
   *  then claims it on creation. */
  dispatchId: string;
  dispatchNumber?: string;
  driverId?: string | null;
  /** Litres from the lane's rate card, when one is configured. */
  suggestedLitres?: number | null;
  /** Where the suggestion came from, so the operator can judge it. */
  litresSource?: "rate_card" | "estimate" | null;
  onComplete?: () => void;
}

/**
 * Pre-trip and post-trip check for an owned truck.
 *
 * A trip is bracketed by two checks so wear is attributable to a journey
 * rather than discovered later with no idea which trip caused it. The
 * database gate refuses a new dispatch while a post-trip is outstanding.
 *
 * Every item starts UNSET rather than defaulting to "good". A checklist that
 * arrives pre-passed is a checklist nobody reads, and the whole point is that
 * someone actually looked at the truck.
 */
export default function TripChecklistDialog({
  open, onOpenChange, type, vehicleId, vehicleReg, dispatchId, dispatchNumber,
  driverId, suggestedLitres, litresSource, onComplete,
}: Props) {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [conditions, setConditions] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  // Price per litre rather than odometer: the pre-trip is where diesel is
  // actually issued, so the price is known at that moment and is what the
  // fuel log needs to compute cost. Odometer is captured on the fuel log
  // itself from the vehicle's current reading.
  const [costPerLitre, setCostPerLitre] = useState("");
  const [litres, setLitres] = useState("");
  // Captured only at post-trip: this is the moment the truck has actually
  // covered the journey, so the distance between pre-trip and post-trip
  // odometer readings is real, not estimated. That distance is what turns the
  // pre-trip's fuel log row into a genuine km/L figure.
  const [odometer, setOdometer] = useState("");
  const [saving, setSaving] = useState(false);

  const isPre = type === "pre_trip";

  useEffect(() => {
    if (open) {
      setConditions({});
      setNotes("");
      setCostPerLitre("");
      setLitres(suggestedLitres != null ? String(suggestedLitres) : "");
      setOdometer("");
    }
  }, [open, suggestedLitres]);

  const allItems = CHECKLIST_TEMPLATE.flatMap((c) =>
    c.items.map((item, i) => ({
      key: `${c.category}::${item}`,
      category: c.category,
      item_name: item,
      is_safety_critical: c.critical[i],
    })),
  );

  const checkedCount = allItems.filter((i) => conditions[i.key]).length;
  const allChecked = checkedCount === allItems.length;

  const criticalFailures = allItems.filter(
    (i) => i.is_safety_critical && ["poor", "critical"].includes(conditions[i.key] ?? ""),
  );
  const anyFailure = allItems.filter((i) =>
    ["poor", "critical"].includes(conditions[i.key] ?? ""),
  );

  const submit = async () => {
    if (!allChecked) {
      toast({
        title: "Checklist incomplete",
        description: `${allItems.length - checkedCount} item${allItems.length - checkedCount === 1 ? "" : "s"} still to check.`,
        variant: "destructive",
      });
      return;
    }
    if (isPre && !litres) {
      toast({
        title: "Diesel required",
        description: "Record the litres issued for this trip.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Status mirrors the Fleet Inspection Engine so both surfaces read the
      // same vocabulary: a safety-critical fault fails outright, a non-critical
      // one needs attention but does not ground the truck.
      const status = criticalFailures.length > 0
        ? "failed"
        : anyFailure.length > 0
          ? "attention_needed"
          : "passed";

      const goodCount = allItems.filter((i) =>
        ["good", "fair"].includes(conditions[i.key] ?? ""),
      ).length;

      const { data: inspection, error } = await (supabase.from("vehicle_inspections") as any)
        .insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          dispatch_id: dispatchId || null,
          driver_id: driverId || null,
          inspector_id: user?.id,
          inspection_type: type,
          status,
          overall_score: Math.round((goodCount / allItems.length) * 100),
          inspector_notes: notes || null,
          // A critical failure grounds the truck. The DB trigger will refuse to
          // honour this unless completed_at is set, which it is below.
          blocked_dispatch: criticalFailures.length > 0,
          completed_at: new Date().toISOString(),
          odometer_reading: !isPre && odometer ? Number(odometer) : null,
          ...(isPre
            ? { diesel_litres_planned: Number(litres) }
            : { diesel_litres_actual: litres ? Number(litres) : null }),
        })
        .select()
        .single();

      if (error) throw error;

      const items = allItems.map((i) => ({
        inspection_id: inspection.id,
        category: i.category,
        item_name: i.item_name,
        condition: conditions[i.key],
        is_safety_critical: i.is_safety_critical,
      }));

      const { error: itemsError } = await (supabase.from("vehicle_inspection_items") as any)
        .insert(items);

      // The header exists but its items failed. Say so plainly rather than
      // reporting success on a checklist with no content.
      if (itemsError) {
        toast({
          title: "Checklist saved without its items",
          description: `${itemsError.message}. Please re-open and resubmit.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: isPre ? "Pre-trip check complete" : "Post-trip check complete",
          description:
            criticalFailures.length > 0
              ? `${vehicleReg ?? "The vehicle"} is grounded on a safety-critical fault.`
              : isPre
                ? dispatchId
                  ? `${Number(litres).toLocaleString()} L recorded. The truck is cleared for this trip.`
                  : `${Number(litres).toLocaleString()} L recorded. Creating the dispatch...`
                : `${vehicleReg ?? "The vehicle"} is released for its next trip.`,
        });
      }

      // The diesel issued at pre-trip IS a fuel fill-up, so it belongs in the
      // fuel log rather than being recorded only on the inspection. Writing it
      // here means Fuel Logs shows actual litres and price per litre without
      // anyone entering the same numbers twice.
      //
      // organization_id and logged_by are set explicitly: the insert policy
      // requires logged_by = auth.uid() AND org membership, so a row can only
      // ever be written into the caller's own organisation.
      if (isPre && Number(litres) > 0) {
        const { data: veh } = await supabase
          .from("vehicles")
          .select("current_odometer")
          .eq("id", vehicleId)
          .maybeSingle();

        const cpl = Number(costPerLitre) || null;
        const { error: fuelError } = await (supabase.from("fuel_logs") as any).insert({
          organization_id: organizationId,
          vehicle_id: vehicleId,
          driver_id: driverId || null,
          logged_by: user?.id,
          log_date: new Date().toISOString().split("T")[0],
          // NOT NULL on fuel_logs. The pre-trip no longer asks for a reading,
          // so the vehicle's last known odometer is carried forward rather
          // than writing a fictitious 0.
          odometer_reading: Number((veh as any)?.current_odometer ?? 0),
          litres_dispensed: Number(litres),
          cost_per_litre: cpl,
          total_cost: cpl ? Number(litres) * cpl : null,
          fuel_type: "diesel",
          dispatch_id: dispatchId || null,
          // A real issue at pre-trip, not a system estimate.
          is_dispatch_estimate: false,
        });

        // Non-fatal: the inspection is the record that gates dispatch, and
        // failing the whole check because a fuel row did not write would be
        // the wrong trade. Surfaced so it is not lost silently.
        if (fuelError) {
          toast({
            title: "Fuel log not recorded",
            description: `${fuelError.message}. Add it manually under Fuel Logs.`,
            variant: "destructive",
          });
        }
      }

      // Post-trip: the odometer just captured is the ONLY point in this whole
      // flow where real distance travelled is known. Fold it back into the
      // fuel log the pre-trip created for this dispatch, so km_since_last_fill
      // and km_per_litre are computed from an actual trip rather than left
      // blank forever. Nothing writes these columns anywhere else in the app.
      if (!isPre && odometer && dispatchId) {
        const { data: preTripLog } = await supabase
          .from("fuel_logs")
          .select("id, odometer_reading")
          .eq("dispatch_id", dispatchId)
          .eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (preTripLog) {
          const startOdo = Number((preTripLog as any).odometer_reading) || 0;
          const endOdo = Number(odometer);
          const distanceKm = endOdo - startOdo;

          // A negative or zero distance means the reading is wrong (or the
          // odometer wasn't actually advanced) — writing a nonsense km/L would
          // be worse than leaving it blank, so this is skipped rather than
          // forced.
          if (distanceKm > 0) {
            // km_per_litre is a GENERATED column on fuel_logs
            // (round(km_since_last_fill / litres_dispensed, 2), computed by
            // Postgres whenever both inputs are positive). Writing to it
            // directly is rejected with "can only be updated to DEFAULT" —
            // confirmed against production before this shipped. Only the
            // distance is written; the database derives the rate itself.
            const { error: kmplError } = await (supabase.from("fuel_logs") as any)
              .update({ km_since_last_fill: distanceKm })
              .eq("id", (preTripLog as any).id);

            if (kmplError) {
              toast({
                title: "Fuel efficiency not updated",
                description: `${kmplError.message}. The fuel log entry is unaffected.`,
                variant: "destructive",
              });
            }
          } else {
            toast({
              title: "Odometer reading looks off",
              description: "It is not higher than the pre-trip reading, so km/L was left blank rather than recorded wrong.",
            });
          }
        }

        // Also carry the ending odometer onto the vehicle record, so the NEXT
        // pre-trip's fuel log starts from a real reading instead of a stale
        // one.
        await supabase
          .from("vehicles")
          .update({ current_odometer: Number(odometer) })
          .eq("id", vehicleId);
      }

      qc.invalidateQueries({ queryKey: ["trip-compliance"] });
      qc.invalidateQueries({ queryKey: ["fuel-logs"] });
      onOpenChange(false);
      // A grounded truck must not proceed to dispatch, so the caller is only
      // resumed when the check actually passed.
      if (criticalFailures.length === 0) onComplete?.();
    } catch (e: any) {
      toast({ title: "Could not save", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isPre ? "Pre-trip check" : "Post-trip check"} — {vehicleReg ?? "vehicle"}
          </DialogTitle>
          <DialogDescription>
            {isPre
              ? `Complete before ${dispatchNumber ?? "this dispatch"} goes out. The truck cannot be dispatched until this is done.`
              : `Complete for ${dispatchNumber ?? "this dispatch"}. The truck stays locked from new trips until this is submitted.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Diesel first: it is what gets forgotten once someone starts
              working through 31 checkboxes, and it feeds the fuel log. */}
          <div className="grid grid-cols-2 gap-3 rounded-lg border p-3 bg-secondary/30">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <Fuel className="w-3.5 h-3.5" />
                {isPre ? "Diesel issued (L)" : "Diesel used (L)"}
                {isPre && <span className="text-destructive">*</span>}
              </Label>
              <Input
                type="number"
                min={0}
                value={litres}
                onChange={(e) => setLitres(e.target.value)}
                placeholder="0"
              />
              {isPre && litresSource === "rate_card" && suggestedLitres != null && (
                <p className="text-xs text-green-600">
                  Agreed rate for this route — edit if the actual differs.
                </p>
              )}
              {isPre && litresSource === "estimate" && (
                <p className="text-xs text-muted-foreground">
                  Estimated from distance. No agreed litres on this lane.
                </p>
              )}
            </div>
            {isPre ? (
              <div className="space-y-1.5">
                <Label className="text-xs">Price per litre (NGN)</Label>
                <Input
                  type="number"
                  min={0}
                  value={costPerLitre}
                  onChange={(e) => setCostPerLitre(e.target.value)}
                  placeholder="e.g. 1600"
                />
                {Number(litres) > 0 && Number(costPerLitre) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total{" "}
                    {new Intl.NumberFormat("en-NG", {
                      style: "currency", currency: "NGN", maximumFractionDigits: 0,
                    }).format(Number(litres) * Number(costPerLitre))}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5 text-xs">
                  <Gauge className="w-3.5 h-3.5" />
                  Odometer (km)
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="Current reading"
                />
                <p className="text-xs text-muted-foreground">
                  Sets this trip's fuel efficiency (km/L) and starts the next
                  pre-trip's reading.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Checklist
              <span className="text-muted-foreground font-normal">
                {" "}— {checkedCount} of {allItems.length}
              </span>
            </p>
            {criticalFailures.length > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="w-3 h-3" />
                {criticalFailures.length} critical
              </Badge>
            )}
          </div>

          {CHECKLIST_TEMPLATE.map((cat) => (
            <div key={cat.category} className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {cat.category}
              </p>
              <div className="grid gap-2">
                {cat.items.map((item, i) => {
                  const key = `${cat.category}::${item}`;
                  const critical = cat.critical[i];
                  const value = conditions[key];
                  const isFail = ["poor", "critical"].includes(value ?? "");
                  return (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className="text-sm flex items-center gap-1.5">
                        {item}
                        {critical && (
                          <span title="Safety critical" className="text-destructive text-xs">•</span>
                        )}
                      </span>
                      <Select
                        value={value ?? ""}
                        onValueChange={(v) => setConditions((c) => ({ ...c, [key]: v }))}
                      >
                        <SelectTrigger
                          className={`w-[130px] h-8 text-xs ${
                            isFail && critical ? "border-destructive text-destructive" : ""
                          }`}
                        >
                          <SelectValue placeholder="Not checked" />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <div className="space-y-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything the next driver or the workshop should know"
              rows={2}
            />
          </div>

          {criticalFailures.length > 0 && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">
                    This will ground the vehicle
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">
                    {criticalFailures.map((f) => f.item_name).join(", ")} failed a
                    safety-critical check. The truck cannot be dispatched until the
                    fault is fixed and it passes again, or a super admin releases it.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {allChecked && criticalFailures.length === 0 && (
            <Badge variant="outline" className="mr-auto self-center text-green-600 border-green-500/40 gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready to submit
            </Badge>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !allChecked}>
            {saving ? "Saving..." : isPre ? "Complete pre-trip" : "Complete post-trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
