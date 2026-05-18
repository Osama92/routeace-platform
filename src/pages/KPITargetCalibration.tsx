import { useEffect, useState } from "react";
import { Loader2, Save, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Def { metric_key: string; label: string; unit: string; default_target: number; source_module: string; }
interface Assignment { metric_key: string; role_tag: string; }
interface Override { id: string; metric_key: string; role_tag: string; target_value: number; notes: string | null; }

const ROLES = ["admin", "org_admin", "ops_manager", "finance_manager", "dispatcher", "driver", "support"];

export default function KPITargetCalibration() {
  const { toast } = useToast();
  const [defs, setDefs] = useState<Def[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [edits, setEdits] = useState<Record<string, { target: string; notes: string }>>({});
  const [role, setRole] = useState<string>("ops_manager");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    const [d, a, o] = await Promise.all([
      supabase.from("kpi_definitions").select("*").eq("is_active", true),
      supabase.from("kpi_role_assignments").select("metric_key,role_tag"),
      supabase.from("kpi_target_overrides").select("*").is("organization_id", null),
    ]);
    setDefs((d.data ?? []) as Def[]);
    setAssignments((a.data ?? []) as Assignment[]);
    const map: Record<string, Override> = {};
    (o.data ?? []).forEach((x: any) => { map[`${x.metric_key}|${x.role_tag}`] = x; });
    setOverrides(map);
    setLoading(false);
  }

  const metricsForRole = defs.filter((d) => assignments.some((a) => a.metric_key === d.metric_key && a.role_tag === role));

  async function save(metric_key: string) {
    const key = `${metric_key}|${role}`;
    const edit = edits[key];
    if (!edit?.target) return;
    const target = Number(edit.target);
    if (isNaN(target) || target < 0) {
      toast({ title: "Invalid target", description: "Enter a positive number.", variant: "destructive" });
      return;
    }
    setSaving(key);
    const existing = overrides[key];
    const payload = { metric_key, role_tag: role, organization_id: null, target_value: target, notes: edit.notes || null };
    const res = existing
      ? await supabase.from("kpi_target_overrides").update(payload).eq("id", existing.id).select().single()
      : await supabase.from("kpi_target_overrides").insert(payload).select().single();
    setSaving(null);
    if (res.error) { toast({ title: "Save failed", description: res.error.message, variant: "destructive" }); return; }
    toast({ title: "Target saved", description: `${metric_key} for ${role}` });
    setOverrides((prev) => ({ ...prev, [key]: res.data as Override }));
    setEdits((prev) => { const n = { ...prev }; delete n[key]; return n; });
  }

  return (
    <DashboardLayout title="KPI Target Calibration" subtitle="Adjust performance targets per role. KPI definitions stay system-locked.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="h-4 w-4" /> Role</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Targets you set apply organization-wide. Leave blank to use the system default.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Metrics for <code>{role}</code></CardTitle></CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : metricsForRole.length === 0 ? (
              <p className="text-sm text-muted-foreground">No KPIs assigned to this role.</p>
            ) : (
              <div className="space-y-4">
                {metricsForRole.map((m) => {
                  const key = `${m.metric_key}|${role}`;
                  const ov = overrides[key];
                  const e = edits[key] ?? { target: ov ? String(ov.target_value) : "", notes: ov?.notes ?? "" };
                  return (
                    <div key={m.metric_key} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <div className="font-medium">{m.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.source_module} · unit: {m.unit} · system default: <strong>{m.default_target}</strong>
                          </div>
                        </div>
                        {ov && <Badge variant="outline">Override active: {ov.target_value}</Badge>}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Input
                          type="number"
                          placeholder={`Target (default ${m.default_target})`}
                          value={e.target}
                          onChange={(ev) => setEdits((p) => ({ ...p, [key]: { ...e, target: ev.target.value } }))}
                          className="w-48"
                        />
                        <Input
                          placeholder="Notes (optional)"
                          value={e.notes}
                          onChange={(ev) => setEdits((p) => ({ ...p, [key]: { ...e, notes: ev.target.value } }))}
                          className="flex-1 min-w-[200px]"
                        />
                        <Button onClick={() => save(m.metric_key)} disabled={saving === key}>
                          {saving === key ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
