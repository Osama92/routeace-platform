import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Bot, Settings, Activity, AlertTriangle, CheckCircle, Clock, Zap, Lock, Eye } from "lucide-react";
import { useGovernanceEngine, GovernancePolicy } from "@/hooks/useGovernanceEngine";

const modeColors: Record<string, string> = {
  manual: "bg-muted text-muted-foreground",
  assisted: "bg-primary/20 text-primary",
  autonomous: "bg-chart-2/20 text-chart-2",
};

const modeIcons: Record<string, React.ReactNode> = {
  manual: <Lock className="w-3 h-3" />,
  assisted: <Eye className="w-3 h-3" />,
  autonomous: <Zap className="w-3 h-3" />,
};

const osLabels: Record<string, string> = {
  logistics: "Logistics OS",
  industry: "Industry OS",
  finance: "Finance",
  platform: "Platform",
};

const GovernanceControl = () => {
  const { policies, auditLog, loading, updatePolicy, setGlobalAutonomy } = useGovernanceEngine();
  const [globalMode, setGlobalMode] = useState<string>("manual");

  const handleGlobalMode = async (mode: "manual" | "assisted" | "autonomous") => {
    setGlobalMode(mode);
    await setGlobalAutonomy(mode);
  };

  const handlePolicyUpdate = async (policy: GovernancePolicy, field: string, value: any) => {
    await updatePolicy(policy.id, { [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <DashboardLayout title="Autonomous Operations & Governance">
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary" />
            Autonomous Operations & Governance
          </h1>
          <p className="text-muted-foreground mt-1">
            Control automation levels, approval workflows, and AI decision-making across all systems.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Super Admin Only</Badge>
      </div>

      {/* Global Autonomy Mode */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Global Autonomy Mode
          </CardTitle>
          <CardDescription>Set the default operational mode across all modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {(["manual", "assisted", "autonomous"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleGlobalMode(mode)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  globalMode === mode ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {modeIcons[mode]}
                  <span className="font-semibold capitalize">{mode}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mode === "manual" && "All actions require human approval. No AI execution."}
                  {mode === "assisted" && "AI suggests actions. Humans approve before execution."}
                  {mode === "autonomous" && "System executes automatically. Humans monitor only."}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules"><Settings className="w-4 h-4 mr-1" /> Module Controls</TabsTrigger>
          <TabsTrigger value="approvals"><CheckCircle className="w-4 h-4 mr-1" /> Approval Config</TabsTrigger>
          <TabsTrigger value="ai"><Bot className="w-4 h-4 mr-1" /> AI Governance</TabsTrigger>
          <TabsTrigger value="audit"><Activity className="w-4 h-4 mr-1" /> Audit Log</TabsTrigger>
        </TabsList>

        {/* Module Controls */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module-Level Autonomy</CardTitle>
              <CardDescription>Configure each workflow module independently</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>OS</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>AI</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.module_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{osLabels[p.os_context] || p.os_context}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.autonomy_mode}
                          onValueChange={(v) => handlePolicyUpdate(p, "autonomy_mode", v)}
                        >
                          <SelectTrigger className="w-[130px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="assisted">Assisted</SelectItem>
                            <SelectItem value="autonomous">Autonomous</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.approval_type}
                          onValueChange={(v) => handlePolicyUpdate(p, "approval_type", v)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="multi_level">Multi-Level</SelectItem>
                            <SelectItem value="conditional">Conditional</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.ai_allowed}
                          onCheckedChange={(v) => handlePolicyUpdate(p, "ai_allowed", v)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={p.is_active}
                          onCheckedChange={(v) => handlePolicyUpdate(p, "is_active", v)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approval Config */}
        <TabsContent value="approvals">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk & Value Thresholds</CardTitle>
              <CardDescription>Set thresholds that trigger approvals or escalations per module</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {policies.filter((p) => p.approval_type !== "none").map((p) => (
                <div key={p.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{p.module_name}</p>
                      <Badge variant="outline" className="text-xs mt-1">{osLabels[p.os_context]}</Badge>
                    </div>
                    <Badge className={modeColors[p.autonomy_mode]}>
                      {modeIcons[p.autonomy_mode]} <span className="ml-1 capitalize">{p.autonomy_mode}</span>
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Risk Threshold (0-100)</label>
                    <div className="flex items-center gap-3 mt-1">
                      <Slider
                        value={[p.risk_threshold]}
                        max={100}
                        step={5}
                        onValueCommit={(v) => handlePolicyUpdate(p, "risk_threshold", v[0])}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-10 text-right">{p.risk_threshold}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Value Threshold (₦)</label>
                    <div className="flex items-center gap-3 mt-1">
                      <input
                        type="number"
                        defaultValue={p.value_threshold}
                        onBlur={(e) => handlePolicyUpdate(p, "value_threshold", Number(e.target.value))}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={p.ai_can_execute}
                      onCheckedChange={(v) => handlePolicyUpdate(p, "ai_can_execute", v)}
                    />
                    <span className="text-sm">Allow AI to execute decisions (not just suggest)</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Governance */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                AI Decision Controls
              </CardTitle>
              <CardDescription>What AI can decide, suggest, or execute</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Module</TableHead>
                    <TableHead>AI Enabled</TableHead>
                    <TableHead>Can Execute</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Escalation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.module_name}</TableCell>
                      <TableCell>
                        {p.ai_allowed ? (
                          <Badge className="bg-chart-2/20 text-chart-2">Enabled</Badge>
                        ) : (
                          <Badge variant="outline">Disabled</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.ai_can_execute ? (
                          <Badge className="bg-destructive/20 text-destructive">Auto-Execute</Badge>
                        ) : (
                          <Badge variant="secondary">Suggest Only</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={modeColors[p.autonomy_mode]}>
                          <span className="capitalize">{p.autonomy_mode}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {p.escalation_role.replace("_", " ")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Governance Audit Trail
              </CardTitle>
              <CardDescription>Every governance change and AI decision is logged here</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {auditLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No governance activity recorded yet.</p>
                ) : (
                  auditLog.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="flex items-center gap-3">
                        {entry.ai_initiated ? (
                          <Bot className="w-4 h-4 text-primary" />
                        ) : (
                          <Shield className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{entry.action}</p>
                          <p className="text-xs text-muted-foreground">{entry.decision}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{entry.actor_email || "System"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Summary Strip */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{policies.filter((p) => p.autonomy_mode === "autonomous").length}</p>
          <p className="text-xs text-muted-foreground">Autonomous</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{policies.filter((p) => p.autonomy_mode === "assisted").length}</p>
          <p className="text-xs text-muted-foreground">Assisted</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{policies.filter((p) => p.autonomy_mode === "manual").length}</p>
          <p className="text-xs text-muted-foreground">Manual</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{policies.filter((p) => p.ai_allowed).length}</p>
          <p className="text-xs text-muted-foreground">AI Enabled</p>
        </Card>
      </div>
    </div>
    </DashboardLayout>
  );
};

export default GovernanceControl;
