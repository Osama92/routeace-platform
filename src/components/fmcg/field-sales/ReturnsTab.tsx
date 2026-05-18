import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RotateCcw, Plus } from "lucide-react";
import type { FieldReturn, Outlet } from "@/hooks/useFieldSales";

const RETURN_REASONS = ["Damaged packaging", "Expired products", "Customer rejection", "Promotional returns", "Defective items", "Wrong delivery"];

interface Props {
  returns: FieldReturn[];
  outlets: Outlet[];
  canApprove?: boolean;
  onLogReturn: (outletId: string, outletName: string, itemsCount: number, reason: string, notes?: string) => Promise<void>;
  onUpdateStatus: (returnId: string, status: "approved" | "rejected") => Promise<void>;
}

const ReturnsTab = ({ returns, outlets, canApprove, onLogReturn, onUpdateStatus }: Props) => {
  const [open, setOpen] = useState(false);
  const [outletId, setOutletId] = useState("");
  const [itemsCount, setItemsCount] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outletName = outlets.find(o => o.id === outletId)?.outlet_name || "";

  const handleSubmit = async () => {
    if (!outletId || !reason) return;
    setSubmitting(true);
    await onLogReturn(outletId, outletName, itemsCount, reason, notes || undefined);
    setOpen(false);
    setOutletId("");
    setItemsCount(1);
    setReason("");
    setNotes("");
    setSubmitting(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" /> Returns Logging</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Log Return</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log a Return</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Select value={outletId} onValueChange={setOutletId}>
                <SelectTrigger><SelectValue placeholder="Select outlet..." /></SelectTrigger>
                <SelectContent>{outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.outlet_name}</SelectItem>)}</SelectContent>
              </Select>
              <div>
                <label className="text-sm font-medium">Items Count</label>
                <Input type="number" min={1} value={itemsCount} onChange={e => setItemsCount(parseInt(e.target.value) || 1)} />
              </div>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Reason for return..." /></SelectTrigger>
                <SelectContent>{RETURN_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
              <Textarea placeholder="Additional notes..." value={notes} onChange={e => setNotes(e.target.value)} />
              <Button className="w-full" onClick={handleSubmit} disabled={submitting || !outletId || !reason}>{submitting ? "Logging..." : "Submit Return"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {returns.length > 0 ? (
          <div className="space-y-3">
            {returns.map(r => (
              <div key={r.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                <div className="flex-1">
                  <p className="font-medium text-sm">{r.outlet_name}</p>
                  <p className="text-xs text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleDateString() : "-"} · {r.reason}</p>
                  {r.notes && <p className="text-xs text-muted-foreground mt-1">Note: {r.notes}</p>}
                </div>
                <span className="text-sm">{r.items_count} items</span>
                <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "outline"}>{r.status}</Badge>
                {canApprove && r.status === "pending" && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => onUpdateStatus(r.id, "approved")}>✓</Button>
                    <Button size="sm" variant="outline" onClick={() => onUpdateStatus(r.id, "rejected")}>✕</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No returns logged yet.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default ReturnsTab;
