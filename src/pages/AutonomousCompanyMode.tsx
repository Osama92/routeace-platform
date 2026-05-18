import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bot, Zap, Shield, Activity } from "lucide-react";

const MODULES = [
  { key: "fuel", label: "Fuel Intelligence", icon: "⛽" },
  { key: "maintenance", label: "Maintenance", icon: "🔧" },
  { key: "dispatch", label: "Auto-Dispatch", icon: "🚚" },
  { key: "revenue", label: "Revenue Expansion", icon: "📈" },
  { key: "alerts", label: "Breakdown Alerts", icon: "🚨" },
];

export default function AutonomousCompanyMode() {
  const [config, setConfig] = useState<any>({
    is_enabled: false, autonomy_level: "assisted",
    enabled_modules: ["fuel", "maintenance"], approval_threshold: 100000,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("autonomous_company_config").select("*").maybeSingle();
      if (data) setConfig(data);
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    const payload = {
      is_enabled: config.is_enabled,
      autonomy_level: config.autonomy_level,
      enabled_modules: config.enabled_modules,
      approval_threshold: Number(config.approval_threshold),
      updated_at: new Date().toISOString(),
    };
    const { error } = config.id
      ? await supabase.from("autonomous_company_config").update(payload).eq("id", config.id)
      : await supabase.from("autonomous_company_config").insert(payload);
    if (error) toast.error(error.message);
    else toast.success("Autonomous mode updated");
  };

  const toggleModule = (key: string) => {
    setConfig((c: any) => ({
      ...c,
      enabled_modules: c.enabled_modules.includes(key)
        ? c.enabled_modules.filter((m: string) => m !== key)
        : [...c.enabled_modules, key],
    }));
  };

  if (loading) return <DashboardLayout title="Autonomous Company"><p>Loading…</p></DashboardLayout>;

  return (
    <DashboardLayout title="Autonomous Company Mode">
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Bot className="w-7 h-7 text-primary" /> Autonomous Company Mode</h1>
            <p className="text-muted-foreground">Master switch for AI Workforce → Decisions → Execution</p>
          </div>
          <Badge variant={config.is_enabled ? "default" : "secondary"} className="text-base px-4 py-1.5">
            {config.is_enabled ? "🟢 ACTIVE" : "⚪ STANDBY"}
          </Badge>
        </div>

        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Zap className="w-5 h-5" /> Master Switch</span>
              <Switch checked={config.is_enabled} onCheckedChange={(v) => setConfig({ ...config, is_enabled: v })} />
            </CardTitle>
            <CardDescription>When enabled, AI agents execute decisions autonomously within the configured rules.</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader><CardTitle>Autonomy Level</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Select value={config.autonomy_level} onValueChange={(v) => setConfig({ ...config, autonomy_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assisted">Assisted - AI suggests, humans approve</SelectItem>
                <SelectItem value="supervised">Supervised - AI acts, humans review</SelectItem>
                <SelectItem value="autonomous">Autonomous - AI acts within thresholds</SelectItem>
                <SelectItem value="full_auto">Full Auto - AI runs the company</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label>Approval Threshold (₦) - actions above this need human approval</Label>
              <Input type="number" value={config.approval_threshold} onChange={(e) => setConfig({ ...config, approval_threshold: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Enabled Modules</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            {MODULES.map((m) => (
              <div key={m.key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{m.icon}</span>
                  <span className="font-medium">{m.label}</span>
                </div>
                <Switch checked={config.enabled_modules.includes(m.key)} onCheckedChange={() => toggleModule(m.key)} />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <Activity className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{config.daily_action_count || 0}</p>
            <p className="text-xs text-muted-foreground">Actions Today</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Shield className="w-6 h-6 mx-auto text-green-600 mb-2" />
            <p className="text-2xl font-bold">₦{Number(config.total_savings || 0).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Savings</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <Bot className="w-6 h-6 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{config.enabled_modules.length}</p>
            <p className="text-xs text-muted-foreground">Active Modules</p>
          </CardContent></Card>
        </div>

        <Button onClick={save} size="lg" className="w-full">Save Configuration</Button>
      </div>
    </DashboardLayout>
  );
}
