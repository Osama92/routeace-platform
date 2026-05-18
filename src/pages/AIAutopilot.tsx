import React from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Truck, TrendingUp, Users, DollarSign, Zap, Eye, Shield, AlertTriangle, Activity } from "lucide-react";
import {
  useAutopilotSettings,
  useUpdateAutopilotMode,
  useToggleAutopilot,
  useAutopilotPredictions,
  useAutopilotActions,
  useAutopilotLogs,
  useAutopilotKPIs,
  AutopilotMode,
} from "@/hooks/useAutopilot";
import { format } from "date-fns";

const moduleIcons: Record<string, React.ReactNode> = {
  fleet: <Truck className="h-5 w-5" />,
  pricing: <DollarSign className="h-5 w-5" />,
  revenue: <TrendingUp className="h-5 w-5" />,
  sales: <Users className="h-5 w-5" />,
  demand: <Activity className="h-5 w-5" />,
  churn: <AlertTriangle className="h-5 w-5" />,
  credits: <Zap className="h-5 w-5" />,
  api: <Shield className="h-5 w-5" />,
};

const modeColors: Record<string, string> = {
  observe: "bg-blue-100 text-blue-800",
  recommend: "bg-amber-100 text-amber-800",
  autopilot: "bg-green-100 text-green-800",
};

const severityColors: Record<string, string> = {
  info: "text-blue-600",
  warning: "text-amber-600",
  critical: "text-red-600",
};

export default function AIAutopilot() {
  const { data: settings, isLoading: settingsLoading } = useAutopilotSettings();
  const { data: predictions } = useAutopilotPredictions();
  const { data: actions } = useAutopilotActions();
  const { data: logs } = useAutopilotLogs();
  const kpis = useAutopilotKPIs();
  const updateMode = useUpdateAutopilotMode();
  const toggleModule = useToggleAutopilot();

  const activeModules = settings?.filter((s) => s.is_enabled).length || 0;
  const autopilotModules = settings?.filter((s) => s.mode === "autopilot").length || 0;

  return (
    <DashboardLayout title="AI Autopilot" subtitle="Self-optimizing intelligence across all operating systems">
      <div className="space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Active Modules</p>
              <p className="text-2xl font-bold">{activeModules}/{settings?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Full Autopilot</p>
              <p className="text-2xl font-bold">{autopilotModules}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">MTD Revenue</p>
              <p className="text-2xl font-bold">₦{kpis.mtdRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">{kpis.activeUsers}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="modules">
          <TabsList>
            <TabsTrigger value="modules">Module Controls</TabsTrigger>
            <TabsTrigger value="predictions">Predictions</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
            <TabsTrigger value="logs">Audit Log</TabsTrigger>
          </TabsList>

          {/* Module Controls */}
          <TabsContent value="modules" className="space-y-4">
            {settingsLoading ? (
              <p className="text-muted-foreground text-sm">Loading modules…</p>
            ) : !settings?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No autopilot modules configured yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {settings.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {moduleIcons[s.module_key] || <Zap className="h-5 w-5" />}
                          <CardTitle className="text-base">{s.module_name}</CardTitle>
                        </div>
                        <Switch
                          checked={s.is_enabled}
                          onCheckedChange={(checked) =>
                            toggleModule.mutate({ id: s.id, is_enabled: checked })
                          }
                        />
                      </div>
                      <CardDescription>
                        <Badge className={`${modeColors[s.mode]} border-0 text-xs`}>
                          {s.mode === "observe" ? "👁 Observe" : s.mode === "recommend" ? "💡 Recommend" : "🚀 Autopilot"}
                        </Badge>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={s.mode}
                        onValueChange={(v) => updateMode.mutate({ id: s.id, mode: v as AutopilotMode })}
                        disabled={!s.is_enabled}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="observe">Observe Only - Monitor & predict</SelectItem>
                          <SelectItem value="recommend">Recommend - AI suggests, you approve</SelectItem>
                          <SelectItem value="autopilot">Full Autopilot - AI executes automatically</SelectItem>
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Predictions */}
          <TabsContent value="predictions">
            {!predictions?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No predictions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    As your platform generates more data, AI predictions will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {predictions.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {moduleIcons[p.module_key]}
                          <span className="font-medium text-sm">{p.title}</span>
                        </div>
                        {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{Math.round(p.confidence_score)}% confidence</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{format(new Date(p.created_at), "MMM d, HH:mm")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Actions */}
          <TabsContent value="actions">
            {!actions?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No autopilot actions yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Enable autopilot mode on modules to see AI-executed actions here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {actions.map((a) => (
                  <Card key={a.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {moduleIcons[a.module_key]}
                          <span className="font-medium text-sm">{a.title}</span>
                          <Badge variant={a.status === "executed" ? "default" : a.status === "rejected" ? "destructive" : "outline"}>
                            {a.status}
                          </Badge>
                        </div>
                        {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{a.executed_by === "ai" ? "🤖 AI" : "👤 Human"}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(a.created_at), "MMM d, HH:mm")}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Audit Logs */}
          <TabsContent value="logs">
            {!logs?.length ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-foreground">No audit logs yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    All AI decisions and overrides will be logged here for full traceability.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div key={l.id} className="flex items-start gap-3 px-4 py-3 border rounded-lg">
                    <span className={`text-xs font-medium mt-0.5 ${severityColors[l.severity] || ""}`}>
                      {l.severity.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{l.message}</p>
                      <p className="text-xs text-muted-foreground">{l.module_key} · {format(new Date(l.created_at), "MMM d, HH:mm:ss")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
