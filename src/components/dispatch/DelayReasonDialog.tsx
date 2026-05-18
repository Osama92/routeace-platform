import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DELAY_CATEGORIES = [
  { value: "traffic", label: "Traffic Congestion" },
  { value: "weather", label: "Weather Conditions" },
  { value: "vehicle_breakdown", label: "Vehicle Breakdown" },
  { value: "customer_unavailable", label: "Customer Unavailable" },
  { value: "loading_delay", label: "Loading/Unloading Delay" },
  { value: "documentation", label: "Documentation Issue" },
  { value: "route_change", label: "Route Change/Diversion" },
  { value: "security", label: "Security Checkpoint" },
  { value: "other", label: "Other" },
];

interface DelayReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dispatchId: string;
  dispatchNumber: string;
  onSuccess?: () => void;
}

const DelayReasonDialog = ({ open, onOpenChange, dispatchId, dispatchNumber, onSuccess }: DelayReasonDialogProps) => {
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!category || !reason.trim()) {
      toast({ title: "Error", description: "Please select a category and provide a reason", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("dispatch_delay_reasons" as any).insert({
        dispatch_id: dispatchId,
        category,
        reason: reason.trim(),
        notes: notes.trim() || null,
        reported_by: user?.id,
      } as any);
      if (error) throw error;
      toast({ title: "Delay reason logged", description: `Reason added to ${dispatchNumber}` });
      setCategory("");
      setReason("");
      setNotes("");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Log Delay Reason - {dispatchNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {DELAY_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              placeholder="Describe the delay reason..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Additional Notes</Label>
            <Textarea
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Log Reason"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DelayReasonDialog;
