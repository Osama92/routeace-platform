import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: { user_id: string; full_name: string; email: string } | null;
  onSaved?: () => void;
}

type LT = "annual" | "sick" | "emergency";

export default function LeaveAllocationDialog({ open, onOpenChange, user, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState<Record<LT, string>>({ annual: "0", sick: "0", emergency: "0" });
  const [used, setUsed] = useState<Record<LT, number>>({ annual: 0, sick: 0, emergency: 0 });

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      setLoading(true);
      const year = new Date().getFullYear();
      const { data } = await supabase
        .from("leave_balances")
        .select("leave_type, allocated_days, used_days, pending_days")
        .eq("user_id", user.user_id)
        .eq("year", year);
      const next = { annual: "0", sick: "0", emergency: "0" } as Record<LT, string>;
      const u = { annual: 0, sick: 0, emergency: 0 } as Record<LT, number>;
      (data ?? []).forEach((r: any) => {
        next[r.leave_type as LT] = String(r.allocated_days);
        u[r.leave_type as LT] = Number(r.used_days) + Number(r.pending_days);
      });
      setVals(next);
      setUsed(u);
      setLoading(false);
    })();
  }, [open, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      for (const t of ["annual", "sick", "emergency"] as LT[]) {
        const v = parseInt(vals[t] || "0", 10);
        if (isNaN(v) || v < 0) throw new Error(`Invalid value for ${t}`);
        if (v < used[t]) {
          throw new Error(`${t}: cannot set below ${used[t]} (already used + pending)`);
        }
        const { error } = await supabase.rpc("set_user_leave_allocation" as any, {
          target_user_id: user.user_id,
          p_leave_type: t,
          p_allocated_days: v,
        });
        if (error) throw error;
      }
      toast({ title: "Leave allocation updated", description: `Updated entitlements for ${user.full_name}.` });
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <CalendarDays className="w-5 h-5 text-primary" /> Edit Leave Allocation
          </DialogTitle>
          <DialogDescription>
            Set annual entitlements for <strong>{user.full_name}</strong> ({user.email}). The counter is enforced server-side.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : (
          <div className="space-y-3 py-2">
            {(["annual", "sick", "emergency"] as LT[]).map((t) => (
              <div key={t} className="grid grid-cols-3 items-center gap-3">
                <Label htmlFor={`la-${t}`} className="capitalize">{t} leave</Label>
                <Input
                  id={`la-${t}`}
                  type="number"
                  min={0}
                  max={365}
                  value={vals[t]}
                  onChange={(e) => setVals((v) => ({ ...v, [t]: e.target.value }))}
                />
                <span className="text-xs text-muted-foreground">{used[t]} used/pending</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-2">
              Allocations are scoped to this organization for the current year.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || loading}>
            {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
