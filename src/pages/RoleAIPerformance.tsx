import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Brain, TrendingUp, Zap, Target, Shield, CheckCircle, Clock,
  Award, Flame, Calendar, ArrowUp, ArrowDown, AlertTriangle,
  BarChart3, Activity, Sparkles, Inbox, RefreshCw,
  Workflow, Bot, Gauge, Loader2, GitBranch, Users, Server, Headphones
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell
} from "recharts";
import {
  useRoleScore, useRoleScoreHistory, useRoleTasks, useCompleteRoleTask,
  useRoleTransformation, useCompleteRoleDay, useRoleRisks, useRoleInsights,
  useGenerateRoleInsights, useRoleWorkflows, useRoleDecisions,
  useAnalyzeDecision, useCrossRoleImpacts
} from "@/hooks/useRoleAIApi";

type RoleKey = "ops_manager" | "support" | "org_admin" | "super_admin";

const ROLE_CONFIG: Record<RoleKey, { label: string; icon: any; color: string; kpiLabels: string[] }> = {
  ops_manager: { label: "Operations Manager", icon: Activity, color: "text-blue-500", kpiLabels: ["Utilization", "On-Time Delivery", "Route Efficiency", "Downtime Reduction", "Resource Allocation"] },
  support: { label: "Support Manager", icon: Headphones, color: "text-green-500", kpiLabels: ["Resolution Time", "Closure Rate", "Satisfaction", "First Response", "Escalation Rate"] },
  org_admin: { label: "Organization Admin", icon: Users, color: "text-purple-500", kpiLabels: ["Dept Alignment", "Execution Speed", "Decision Implementation", "System Adoption", "Operational Efficiency"] },
  super_admin: { label: "Super Admin", icon: Server, color: "text-red-500", kpiLabels: ["System Performance", "Tenant Health", "Revenue Optimization", "Risk Exposure", "Platform Efficiency"] },
};

const RANK_COLORS: Record<string, string> = { beginner: "bg-gray-500", operator: "bg-blue-500", advanced_operator: "bg-purple-500", elite_operator: "bg-yellow-500" };
const RANK_LABELS: Record<string, string> = { beginner: "Beginner", operator: "Operator", advanced_operator: "Advanced Operator", elite_operator: "Elite Operator" };
const WEEK_LABELS = ["Process Optimization", "Workflow Differentiation", "Automation + Intelligence", "Proof + Execution"];

const BADGES_BY_ROLE: Record<RoleKey, { name: string; icon: any; condition: string }[]> = {
  ops_manager: [{ name: "Fleet Optimizer", icon: Zap, condition: "utilization > 80%" }, { name: "On-Time Champion", icon: CheckCircle, condition: "OTD > 95%" }, { name: "Route Master", icon: Workflow, condition: "route efficiency > 85%" }],
  support: [{ name: "Resolution Master", icon: CheckCircle, condition: "closure > 90%" }, { name: "Speed Responder", icon: Clock, condition: "response < 5min" }, { name: "Customer Hero", icon: Award, condition: "satisfaction > 90%" }],
  org_admin: [{ name: "Execution Leader", icon: Target, condition: "decisions > 90%" }, { name: "Alignment Pro", icon: Users, condition: "adoption > 85%" }, { name: "Governance Master", icon: Shield, condition: "compliance 100%" }],
  super_admin: [{ name: "System Architect", icon: Server, condition: "uptime 99.9%" }, { name: "Revenue Guardian", icon: TrendingUp, condition: "growth > 10%" }, { name: "Security Sentinel", icon: Shield, condition: "zero critical events" }],
};

export default function RoleAIPerformance() {
  const { userRole } = useAuth();
  const roleKey: RoleKey = (["ops_manager", "support", "org_admin", "super_admin"].includes(userRole || "") ? userRole : "ops_manager") as RoleKey;
  const config = ROLE_CONFIG[roleKey];
  const RoleIcon = config.icon;

  const [tab, setTab] = useState("overview");

  const { data: score, isLoading: scoreLoading } = useRoleScore(roleKey);
  const { data: history } = useRoleScoreHistory(roleKey);
  const { data: tasksData } = useRoleTasks(roleKey);
  const { data: transformation } = useRoleTransformation(roleKey);
  const { data: risks } = useRoleRisks(roleKey);
  const { data: insights } = useRoleInsights(roleKey);
  const { data: workflows } = useRoleWorkflows(roleKey);
  const { data: decisions } = useRoleDecisions(roleKey);
  const { data: crossImpacts } = useCrossRoleImpacts(roleKey);

  const completeTask = useCompleteRoleTask(roleKey);
  const completeDay = useCompleteRoleDay(roleKey);
  const generateInsights = useGenerateRoleInsights(roleKey);
  const analyzeDecision = useAnalyzeDecision(roleKey);

  const totalScore = score?.total_score || 0;
  const rankLevel = score?.rank_level || "beginner";
  const breakdown = score?.breakdown || {};
  const kpiBreakdown = score?.kpi_breakdown || {};

  const radarData = [
    { subject: "Workflow", value: breakdown.workflow || 0 },
    { subject: "Automation", value: breakdown.automation || 0 },
    { subject: "Decision", value: breakdown.decision || 0 },
    { subject: "Role KPI", value: breakdown.role_kpi || 0 },
    { subject: "Risk", value: breakdown.risk || 0 },
    { subject: "Execution", value: breakdown.execution || 0 },
  ];

  const historyData = (Array.isArray(history) ? history : []).slice(0, 14).reverse().map((h: any) => ({
    date: h.score_date?.slice(5),
    score: h.total_score,
  }));

  return (
    <DashboardLayout title="AI Performance Center" subtitle={`${config.label} Intelligence System`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl bg-muted ${config.color}`}><RoleIcon className="h-7 w-7" /></div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">AI Performance Center</h1>
              <p className="text-sm text-muted-foreground">{config.label} Intelligence System</p>
            </div>
          </div>
          <Badge className={`${RANK_COLORS[rankLevel]} text-white px-3 py-1`}>{RANK_LABELS[rankLevel] || rankLevel}</Badge>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-max gap-1 bg-muted/50 p-1">
              <TabsTrigger value="overview"><Brain className="h-4 w-4 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="transformation"><Calendar className="h-4 w-4 mr-1" />28-Day</TabsTrigger>
              <TabsTrigger value="workflows"><Workflow className="h-4 w-4 mr-1" />Workflows</TabsTrigger>
              <TabsTrigger value="tasks"><Inbox className="h-4 w-4 mr-1" />Tasks</TabsTrigger>
              <TabsTrigger value="risks"><AlertTriangle className="h-4 w-4 mr-1" />Risks</TabsTrigger>
              <TabsTrigger value="decisions"><GitBranch className="h-4 w-4 mr-1" />Decisions</TabsTrigger>
              <TabsTrigger value="insights"><Sparkles className="h-4 w-4 mr-1" />Insights</TabsTrigger>
              <TabsTrigger value="history"><BarChart3 className="h-4 w-4 mr-1" />History</TabsTrigger>
              <TabsTrigger value="badges"><Award className="h-4 w-4 mr-1" />Badges</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ═══ OVERVIEW ═══ */}
          <TabsContent value="overview" className="space-y-4">
            {scoreLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ScoreCard label="Total Score" value={totalScore} icon={Gauge} />
                  <ScoreCard label="Workflow" value={breakdown.workflow || 0} icon={Workflow} />
                  <ScoreCard label="Automation" value={breakdown.automation || 0} icon={Zap} />
                  <ScoreCard label="Decision" value={breakdown.decision || 0} icon={Brain} />
                  <ScoreCard label="Role KPI" value={breakdown.role_kpi || 0} icon={Target} />
                  <ScoreCard label="Risk Mgmt" value={breakdown.risk || 0} icon={Shield} />
                  <ScoreCard label="Execution" value={breakdown.execution || 0} icon={CheckCircle} />
                  <ScoreCard label="Streak" value={transformation?.summary?.streak || 0} icon={Flame} suffix=" days" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <Card><CardHeader><CardTitle className="text-sm">Performance Radar</CardTitle></CardHeader>
                    <CardContent className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData}>
                          <PolarGrid /><PolarAngleAxis dataKey="subject" className="text-xs" />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} />
                          <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card><CardHeader><CardTitle className="text-sm">Role KPI Breakdown</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {config.kpiLabels.map((label, i) => {
                        const keys = Object.keys(kpiBreakdown);
                        const val = keys[i] ? (kpiBreakdown as any)[keys[i]] || 0 : 0;
                        return (
                          <div key={label} className="space-y-1">
                            <div className="flex justify-between text-xs"><span>{label}</span><span className="font-mono">{val}%</span></div>
                            <Progress value={val} className="h-2" />
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {historyData.length > 0 && (
                  <Card><CardHeader><CardTitle className="text-sm">Score Trend</CardTitle></CardHeader>
                    <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" /><YAxis domain={[0, 100]} className="text-xs" />
                          <Tooltip /><Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ═══ 28-DAY TRANSFORMATION ═══ */}
          <TabsContent value="transformation" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Calendar className="h-4 w-4" />28-Day Transformation - {config.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <Progress value={transformation?.summary?.progress_pct || 0} className="flex-1 h-3" />
                  <span className="text-sm font-mono">{transformation?.summary?.completed || 0}/28</span>
                  <Badge variant="outline"><Flame className="h-3 w-3 mr-1" />{transformation?.summary?.streak || 0} streak</Badge>
                </div>
                {[1, 2, 3, 4].map(week => (
                  <div key={week} className="mb-4">
                    <h4 className="text-xs font-semibold text-muted-foreground mb-2">WEEK {week}: {WEEK_LABELS[week - 1]}</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {(transformation?.days || []).filter((d: any) => d.week_number === week).map((day: any) => (
                        <button key={day.day_number}
                          onClick={() => { if (!day.completed) completeDay.mutate({ day: day.day_number }, { onSuccess: () => toast.success(`Day ${day.day_number} completed!`) }); }}
                          className={`p-2 rounded-lg text-center text-xs border transition-all ${day.completed ? "bg-primary/20 border-primary text-primary" : "bg-muted/50 border-border hover:border-primary/50"}`}>
                          <div className="font-bold">{day.day_number}</div>
                          {day.completed && <CheckCircle className="h-3 w-3 mx-auto mt-1" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ WORKFLOWS ═══ */}
          <TabsContent value="workflows" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Workflow Intelligence</CardTitle></CardHeader>
              <CardContent>
                {(Array.isArray(workflows) ? workflows : []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workflow data.</p>
                ) : (
                  <div className="space-y-3">
                    {(workflows as any[]).map((w: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{w.name}</p>
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            <span>Manual: {w.manual_minutes}m</span><span>Optimized: {w.optimized_minutes}m</span>
                            <span className="text-primary font-medium">Saved: {w.manual_minutes - w.optimized_minutes}m</span>
                          </div>
                        </div>
                        <div className="text-right"><span className="text-lg font-bold">{w.automation_pct}%</span><p className="text-xs text-muted-foreground">automated</p></div>
                      </div>
                    ))}
                    <Card className="bg-primary/5 border-primary/20"><CardContent className="p-3">
                      <p className="text-sm font-medium">Total Time Saved</p>
                      <p className="text-2xl font-bold">{(workflows as any[]).reduce((s: number, w: any) => s + (w.manual_minutes - w.optimized_minutes), 0)} min/cycle</p>
                    </CardContent></Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TASKS ═══ */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold">AI Tasks</h3>
              <Button size="sm" variant="outline" onClick={() => generateInsights.mutate(undefined, { onSuccess: (d: any) => toast.success(`${d.tasks_created} task(s) generated`) })}>
                <Bot className="h-4 w-4 mr-1" />{generateInsights.isPending ? "Generating..." : "Generate Tasks"}
              </Button>
            </div>
            <div className="grid gap-3">
              <div className="flex gap-2 text-xs">
                <Badge variant="outline">Total: {tasksData?.summary?.total || 0}</Badge>
                <Badge variant="outline" className="text-green-600">Done: {tasksData?.summary?.completed || 0}</Badge>
                <Badge variant="outline" className="text-yellow-600">Pending: {tasksData?.summary?.pending || 0}</Badge>
                <Badge variant="outline">Execution: {tasksData?.summary?.execution_score || 0}%</Badge>
              </div>
              {(tasksData?.items || []).slice(0, 10).map((task: any) => (
                <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={task.priority === "critical" ? "destructive" : task.priority === "high" ? "default" : "outline"} className="text-xs">{task.priority}</Badge>
                        <span className="text-sm font-medium">{task.title}</span>
                      </div>
                      {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                    </div>
                    {task.status !== "completed" && (
                      <Button size="sm" variant="ghost" onClick={() => completeTask.mutate(task.id, { onSuccess: () => toast.success("Task completed!") })}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══ RISKS ═══ */}
          <TabsContent value="risks" className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <ScoreCard label="Detected" value={risks?.summary?.detected || 0} icon={AlertTriangle} suffix="" />
              <ScoreCard label="Resolved" value={risks?.summary?.resolved || 0} icon={CheckCircle} suffix="" />
              <ScoreCard label="Risk Score" value={risks?.summary?.risk_score || 0} icon={Shield} />
            </div>
            {(risks?.risks || []).length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground"><Shield className="h-8 w-8 mx-auto mb-2 text-green-500" />All clear - no active risks detected</CardContent></Card>
            ) : (
              (risks?.risks || []).map((risk: any) => (
                <Card key={risk.id} className="border-destructive/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="destructive" className="text-xs">{risk.severity}</Badge>
                      <span className="text-xs text-muted-foreground">{risk.type}</span>
                    </div>
                    <p className="text-sm">{risk.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ═══ DECISIONS ═══ */}
          <TabsContent value="decisions" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><GitBranch className="h-4 w-4" />Cross-Role Decision Engine</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Decisions are analyzed for cross-functional impact before execution.</p>
                {(Array.isArray(decisions) ? decisions : []).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No decisions recorded yet. Decisions are logged automatically from system actions.</p>
                ) : (
                  (decisions as any[]).slice(0, 10).map((dec: any) => (
                    <div key={dec.id} className="p-3 rounded-lg bg-muted/30 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={dec.was_blocked ? "destructive" : dec.risk_level === "high" ? "default" : "outline"} className="text-xs">
                          {dec.was_blocked ? "BLOCKED" : dec.risk_level}
                        </Badge>
                        <span className="text-sm font-medium">{dec.title}</span>
                      </div>
                      {dec.recommendation && <p className="text-xs text-muted-foreground">{dec.recommendation}</p>}
                      <div className="flex gap-2 text-xs">
                        <span>Impact: {dec.total_impact_score}</span>
                        <span>Risk: {dec.risk_score}</span>
                        <span>Affects: {(dec.affected_roles || []).join(", ")}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Cross-Role Impacts */}
            {(Array.isArray(crossImpacts) ? crossImpacts : []).length > 0 && (
              <Card><CardHeader><CardTitle className="text-sm">Cross-Role Impact Feed</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {(crossImpacts as any[]).slice(0, 8).map((impact: any) => (
                    <div key={impact.id} className="flex items-center gap-2 p-2 rounded bg-muted/20 text-xs">
                      <Badge variant="outline">{impact.source_role}</Badge>
                      <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      <Badge variant="outline">{impact.target_role}</Badge>
                      <span className="flex-1 text-muted-foreground">{impact.description}</span>
                      <Badge variant={impact.severity === "critical" ? "destructive" : "outline"} className="text-xs">{impact.severity}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ INSIGHTS ═══ */}
          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" />AI Insights</h3>
              <Button size="sm" variant="outline" onClick={() => generateInsights.mutate(undefined, { onSuccess: () => toast.success("Insights refreshed") })}>
                <RefreshCw className="h-4 w-4 mr-1" />Refresh
              </Button>
            </div>
            {(insights?.insights || []).length === 0 ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground"><Bot className="h-8 w-8 mx-auto mb-2" />No insights yet. The AI co-pilot generates insights from real system data.</CardContent></Card>
            ) : (
              (insights?.insights || []).map((insight: any, i: number) => (
                <Card key={i} className={insight.priority === "high" ? "border-yellow-500/30" : ""}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={insight.priority === "high" ? "destructive" : "outline"} className="text-xs">{insight.priority}</Badge>
                      <span className="text-xs text-muted-foreground">{insight.type}</span>
                    </div>
                    <p className="text-sm">{insight.message}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ═══ HISTORY ═══ */}
          <TabsContent value="history" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm">Performance History</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={historyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" /><YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip /><Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <p className="text-sm text-muted-foreground text-center py-10">Score history builds as you use the system daily.</p>}
              </CardContent>
            </Card>
            {Array.isArray(history) && history.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {history.slice(0, 8).map((h: any) => (
                  <Card key={h.id}><CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{h.score_date}</p>
                    <p className="text-xl font-bold">{h.total_score}</p>
                    <Badge className={`${RANK_COLORS[h.rank_level]} text-white text-xs`}>{RANK_LABELS[h.rank_level]}</Badge>
                  </CardContent></Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ═══ BADGES ═══ */}
          <TabsContent value="badges" className="space-y-4">
            <Card><CardHeader><CardTitle className="text-sm flex items-center gap-2"><Award className="h-4 w-4" />Achievement Badges - {config.label}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {BADGES_BY_ROLE[roleKey].map((badge, i) => {
                    const Icon = badge.icon;
                    const earned = totalScore >= (i + 1) * 25;
                    return (
                      <div key={badge.name} className={`p-4 rounded-xl border text-center ${earned ? "bg-primary/10 border-primary/30" : "bg-muted/30 opacity-50"}`}>
                        <Icon className={`h-8 w-8 mx-auto mb-2 ${earned ? "text-primary" : "text-muted-foreground"}`} />
                        <p className="font-medium text-sm">{badge.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{badge.condition}</p>
                        {earned && <Badge className="mt-2 bg-primary text-primary-foreground text-xs">Earned</Badge>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-4 rounded-xl bg-muted/30">
                  <h4 className="text-sm font-semibold mb-3">Rank Progression</h4>
                  <div className="flex items-center gap-2">
                    {Object.entries(RANK_LABELS).map(([key, label]) => (
                      <div key={key} className={`flex-1 text-center p-2 rounded ${rankLevel === key ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <p className="text-xs font-medium">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function ScoreCard({ label, value, icon: Icon, suffix = "%" }: { label: string; value: number; icon: any; suffix?: string }) {
  const color = value >= 75 ? "text-green-500" : value >= 50 ? "text-yellow-500" : "text-red-500";
  return (
    <Card><CardContent className="p-3 flex items-center gap-3">
      <Icon className={`h-5 w-5 ${color}`} />
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}{suffix}</p></div>
    </CardContent></Card>
  );
}
