import { useAgentSystem } from "@/hooks/useAgentSystem";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Ban, TriangleAlert, Lightbulb, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusStyles = {
  healthy: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
  critical: { bg: "bg-destructive/10", text: "text-destructive" },
};

const signalIcons = { block: Ban, warn: TriangleAlert, recommend: Lightbulb };
const signalColors = { block: "text-destructive", warn: "text-amber-500", recommend: "text-emerald-500" };

export default function AgentInsightWidget() {
  const { orchestratorDecision, systemHealth, agents } = useAgentSystem();
  const navigate = useNavigate();

  const topSignals = agents
    .flatMap(a => a.signals.map(s => ({ ...s, agent: a.name })))
    .filter(s => s.type !== "recommend")
    .slice(0, 3);

  const style = statusStyles[systemHealth.status];

  return (
    <Card
      className="cursor-pointer hover:border-primary/30 transition-colors border-border/50"
      onClick={() => navigate("/ai-command-center")}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${style.bg}`}>
              <Brain className={`w-4 h-4 ${style.text}`} />
            </div>
            <span className="text-sm font-semibold">AI Decision Engine</span>
            <Badge variant="outline" className={`text-[9px] ${style.bg} ${style.text} border-0`}>
              {systemHealth.score}/100
            </Badge>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        <p className="text-xs font-medium mb-2">{orchestratorDecision.decision}</p>

        {topSignals.length > 0 && (
          <div className="space-y-1.5">
            {topSignals.map((signal, i) => {
              const Icon = signalIcons[signal.type];
              return (
                <div key={i} className="flex items-center gap-1.5 text-[11px]">
                  <Icon className={`w-3 h-3 shrink-0 ${signalColors[signal.type]}`} />
                  <span className="truncate">{signal.message}</span>
                </div>
              );
            })}
          </div>
        )}

        {topSignals.length === 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
            <Lightbulb className="w-3 h-3" />
            <span>All systems healthy - safe to grow</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
