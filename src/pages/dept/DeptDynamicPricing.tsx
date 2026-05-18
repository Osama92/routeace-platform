import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Zap, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Rule {
  id: string;
  rule_name: string;
  rule_type: string;
  conditions: any;
  adjustment_type: string;
  adjustment_value: number;
  priority: number;
  is_active: boolean;
}

const RULE_TYPES = [
  { value: "peak_hour", label: "Peak Hour Surcharge" },
  { value: "distance_multiplier", label: "Distance Multiplier" },
  { value: "vendor_surcharge", label: "Vendor Surcharge" },
  { value: "volume_discount", label: "Volume Discount" },
];

export default function DeptDynamicPricing() {
  const { organizationId, tenantMode } = useAuth();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    rule_name: "", rule_type: "peak_hour", adjustment_type: "percent",
    adjustment_value: "10", priority: "100", conditions: "{}",
  });

  const isDept = tenantMode === "LOGISTICS_DEPARTMENT";

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("dept_pricing_rules")
      .select("*")
      .eq("organization_id", organizationId)
      .order("priority", { ascending: true });
    if (error) toast.error(error.message);
    setRules((data ?? []) as Rule[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  const create = async () => {
    if (!organizationId) return;
    let conditions = {};
    try { conditions = JSON.parse(form.conditions || "{}"); } catch { return toast.error("Conditions must be valid JSON"); }
    const { error } = await supabase.from("dept_pricing_rules").insert({
      organization_id: organizationId,
      rule_name: form.rule_name,
      rule_type: form.rule_type,
      adjustment_type: form.adjustment_type,
      adjustment_value: Number(form.adjustment_value),
      priority: Number(form.priority),
      conditions,
      is_active: true,
    });
    if (error) return toast.error(error.message);
    toast.success("Rule created");
    setOpen(false);
    load();
  };

  const toggle = async (id: string, active: boolean) => {
    const { error } = await supabase.from("dept_pricing_rules").update({ is_active: active }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  if (!isDept) {
    return (
      <DashboardLayout title="Dynamic Pricing">
        <div className="p-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-orange-500" />Department-Only Module</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground">
              The dept-scope dynamic pricing engine is only available for Logistics Department orgs. Logistics Companies use the global surge-pricing engine instead.
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dynamic Pricing">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Zap className="h-7 w-7" />Dynamic Pricing Rules</h1>
            <p className="text-muted-foreground">Department-scoped rate adjustments applied on top of vendor rate cards.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Rule</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Pricing Rule</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Rule Name</Label><Input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })} /></div>
                <div><Label>Rule Type</Label>
                  <Select value={form.rule_type} onValueChange={(v) => setForm({ ...form, rule_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{RULE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Adjustment Type</Label>
                    <Select value={form.adjustment_type} onValueChange={(v) => setForm({ ...form, adjustment_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percent">Percent (%)</SelectItem><SelectItem value="flat">Flat (₦)</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div><Label>Value</Label><Input type="number" value={form.adjustment_value} onChange={(e) => setForm({ ...form, adjustment_value: e.target.value })} /></div>
                </div>
                <div><Label>Priority (lower = applied first)</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
                <div><Label>Conditions (JSON)</Label>
                  <Input value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.target.value })} placeholder='{"hour_start":17,"hour_end":21}' />
                </div>
              </div>
              <DialogFooter><Button onClick={create}>Create</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Active Rules ({rules.filter(r => r.is_active).length})</CardTitle><CardDescription>Rules apply in priority order on top of contracted vendor rates.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Adjustment</TableHead><TableHead>Priority</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                  : rules.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No rules yet</TableCell></TableRow>
                  : rules.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.rule_name}</TableCell>
                      <TableCell><Badge variant="outline">{r.rule_type}</Badge></TableCell>
                      <TableCell>{r.adjustment_type === "percent" ? `${r.adjustment_value}%` : `₦${Number(r.adjustment_value).toLocaleString()}`}</TableCell>
                      <TableCell>{r.priority}</TableCell>
                      <TableCell><Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.id, v)} /></TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
