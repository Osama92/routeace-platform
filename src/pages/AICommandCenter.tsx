import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAgentSystem, AgentOutput } from "@/hooks/useAgentSystem";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Brain, Shield, DollarSign, Truck, Wallet, ShieldCheck,
  AlertTriangle, TrendingUp, FileText, Activity, Zap,
  ChevronRight, RefreshCw, Bot, Sparkles, Ban, TriangleAlert, Lightbulb,
} from "lucide-react";

const AGENT_ICONS: Record<string, React.ElementType> = {
  DollarSign, Truck, Wallet, ShieldCheck, AlertTriangle, TrendingUp, FileText,
};

const statusStyles = {
  healthy: { bg: "bg-emerald-500/10", text: "text-emerald-500", border: "border-emerald-500/30", label: "Healthy" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/30", label: "Warning" },
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/30", label: "Critical" },
};

const signalIcons = { block: Ban, warn: TriangleAlert, recommend: Lightbulb };
const signalColors = { block: "text-destructive", warn: "text-amber-500", recommend: "text-emerald-500" };

export default function AICommandCenter() {
  const { agents, orchestratorDecision, systemHealth } = useAgentSystem();
  const { toast } = useToast();
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const analysisMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("ai-decision-engine", {
        body: { agentOutputs: agents, orchestratorDecision, systemHealth },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.analysis as string;
    },
    onSuccess: (analysis) => {
      setAiAnalysis(analysis);
      toast({ title: "AI Analysis Complete", description: "Decision engine has analyzed all agents." });
    },
    onError: (err: Error) => {
      toast({ title: "Analysis Failed", description: err.message, variant: "destructive" });
    },
  });

  const activeAgent = selectedAgent ? agents.find(a => a.id === selectedAgent) : null;

  return (
    <DashboardLayout title="AI Command Center" subtitle="Multi-agent financial + fleet intelligence system">
      <div className="space-y-6">
        {/* ─── System Health Bar ────────────────────────────────── */}
        <Card className={`border ${statusStyles[systemHealth.status].border}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${statusStyles[systemHealth.status].bg}`}>
                  <Brain className={`w-6 h-6 ${statusStyles[systemHealth.status].text}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Decision Orchestrator</h2>
                    <Badge variant="outline" className={`${statusStyles[systemHealth.status].bg} ${statusStyles[systemHealth.status].text} border-0`}>
                      {statusStyles[systemHealth.status].label} - {systemHealth.score}/100
                    </Badge>
                  </div>
                  <p className="text-sm font-medium mt-0.5">{orchestratorDecision.decision}</p>
                  <p className="text-xs text-muted-foreground">Confidence: {orchestratorDecision.confidence}%</p>
                </div>
              </div>
              <Button
                onClick={() => analysisMutation.mutate()}
                disabled={analysisMutation.isPending}
                className="gap-2"
              >
                {analysisMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {analysisMutation.isPending ? "Analyzing..." : "Run AI Analysis"}
              </Button>
            </div>
            <div className="mt-3">
              <Progress value={systemHealth.score} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* ─── Agent Grid ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {agents.map((agent) => {
            const Icon = AGENT_ICONS[agent.icon] || Activity;
            const style = statusStyles[agent.status];
            const isSelected = selectedAgent === agent.id;
            return (
              <Card
                key={agent.id}
                className={`cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? `ring-2 ring-primary ${style.border}` : "border-border/50"}`}
                onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`w-10 h-10 rounded-lg ${style.bg} flex items-center justify-center mx-auto mb-2`}>
                    <Icon className={`w-5 h-5 ${style.text}`} />
                  </div>
                  <p className="text-xs font-semibold truncate">{agent.name}</p>
                  <p className={`text-lg font-bold ${style.text}`}>{agent.score}</p>
                  <Badge variant="outline" className={`text-[9px] mt-1 ${style.bg} ${style.text} border-0`}>
                    {style.label}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ─── Active Agent Detail ─────────────────────────────── */}
        {activeAgent && (
          <Card className={`border ${statusStyles[activeAgent.status].border}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                {(() => { const Icon = AGENT_ICONS[activeAgent.icon] || Activity; return <div className={`p-2 rounded-lg ${statusStyles[activeAgent.status].bg}`}><Icon className={`w-5 h-5 ${statusStyles[activeAgent.status].text}`} /></div>; })()}
                <div>
                  <CardTitle className="text-base">{activeAgent.name} Agent</CardTitle>
                  <p className="text-xs text-muted-foreground">{activeAgent.summary}</p>
                </div>
                <Badge variant="outline" className={`ml-auto ${statusStyles[activeAgent.status].bg} ${statusStyles[activeAgent.status].text} border-0`}>
                  Score: {activeAgent.score}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(activeAgent.metrics).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-lg bg-muted/50">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{key.replace(/([A-Z])/g, " $1")}</p>
                    <p className="text-sm font-bold mt-0.5">{typeof val === "number" ? val.toLocaleString() : val}</p>
                  </div>
                ))}
              </div>

              {/* Signals */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signals</p>
                {activeAgent.signals.map((signal, i) => {
                  const SigIcon = signalIcons[signal.type];
                  return (
                    <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                      <SigIcon className={`w-4 h-4 shrink-0 mt-0.5 ${signalColors[signal.type]}`} />
                      <div>
                        <Badge variant="outline" className={`text-[9px] mb-1 ${signalColors[signal.type]}`}>
                          {signal.type.toUpperCase()}
                        </Badge>
                        <p className="text-xs">{signal.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── Decision + AI Analysis Row ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orchestrator Reasoning */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4" /> Decision Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {orchestratorDecision.reasoning.map((r, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground" />
                      <span className={
                        r.startsWith("[BLOCK]") ? "text-destructive font-medium" :
                        r.startsWith("[WARN]") ? "text-amber-500" :
                        r.startsWith("[GO]") ? "text-emerald-500" : "text-foreground"
                      }>{r}</span>
                    </div>
                  ))}
                </div>

                {orchestratorDecision.actions.length > 0 && (
                  <>
                    <Separator className="my-4" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Actions</p>
                    <div className="space-y-2">
                      {orchestratorDecision.actions.map((action, i) => {
                        const AIcon = signalIcons[action.type];
                        return (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/30">
                            <AIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${signalColors[action.type]}`} />
                            <div>
                              <p className="text-xs font-medium">{action.label}</p>
                              <p className="text-[10px] text-muted-foreground">{action.detail}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {aiAnalysis ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs whitespace-pre-wrap">
                    {aiAnalysis}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <Brain className="w-10 h-10 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Click "Run AI Analysis" to get deep insights</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      AI will analyze all 7 agent outputs and provide executive-level recommendations
                    </p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* ─── All Signals Summary ─────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4" /> All Active Signals ({agents.flatMap(a => a.signals).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {agents.flatMap(a => a.signals.map(s => ({ ...s, agent: a.name, agentStatus: a.status }))).map((signal, i) => {
                const SigIcon = signalIcons[signal.type];
                return (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30 border border-border/30">
                    <SigIcon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${signalColors[signal.type]}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{signal.agent}</Badge>
                        <Badge variant="outline" className={`text-[8px] px-1 py-0 border-0 ${signalColors[signal.type]}`}>{signal.type}</Badge>
                      </div>
                      <p className="text-[11px] mt-0.5 truncate">{signal.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
