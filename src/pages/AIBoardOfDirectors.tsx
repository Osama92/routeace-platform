import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, Crown, Briefcase, DollarSign, TrendingUp, Shield, Cpu, AlertTriangle, CheckCircle2 } from "lucide-react";

const ROLE_META = [
  { key: "ceo_view", label: "CEO (Chairman)", icon: Crown, color: "text-amber-500" },
  { key: "coo_view", label: "COO - Operations", icon: Briefcase, color: "text-blue-500" },
  { key: "cfo_view", label: "CFO - Finance", icon: DollarSign, color: "text-green-500" },
  { key: "cro_growth_view", label: "CRO - Growth", icon: TrendingUp, color: "text-purple-500" },
  { key: "risk_view", label: "Risk Director", icon: Shield, color: "text-red-500" },
  { key: "cto_view", label: "CTO - Systems", icon: Cpu, color: "text-cyan-500" },
];

const SAMPLE_QUESTIONS = [
  "Should we expand operations to Abuja in the next 60 days?",
  "Should we raise our pricing by 15% across enterprise customers?",
  "Should we acquire 5 new trucks this quarter on debt financing?",
  "Should we launch a new fuel-card subscription tier?",
];

export default function AIBoardOfDirectors() {
  const [question, setQuestion] = useState("");
  const [generating, setGenerating] = useState(false);
  const qc = useQueryClient();

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ["board-decisions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("board_decisions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const debate = async () => {
    if (!question.trim()) {
      toast.error("Enter a strategic question");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-board-orchestrator", {
        body: { question: question.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Board debate complete");
      setQuestion("");
      qc.invalidateQueries({ queryKey: ["board-decisions"] });
    } catch (e: any) {
      toast.error(e.message || "Board debate failed");
    } finally {
      setGenerating(false);
    }
  };

  const approve = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const { error } = await supabase
        .from("board_decisions")
        .update({ status, approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decision updated");
      qc.invalidateQueries({ queryKey: ["board-decisions"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <DashboardLayout title="AI Board of Directors">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-amber-500" />
            AI Board of Directors
          </h1>
          <p className="text-muted-foreground">
            Six AI executives debate every strategic decision - recommend-only, you approve.
          </p>
        </div>

        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Submit a strategic question
            </CardTitle>
            <CardDescription>
              The Board pulls live company data, debates from 6 perspectives, and returns a scored decision.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="e.g. Should we acquire 5 new trucks this quarter on debt financing?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              disabled={generating}
            />
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUESTIONS.map((q) => (
                <Badge
                  key={q}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => setQuestion(q)}
                >
                  {q}
                </Badge>
              ))}
            </div>
            <Button onClick={debate} disabled={generating || !question.trim()}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Board is debating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Convene Board
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent decisions</h2>
          {isLoading && <p className="text-muted-foreground">Loading…</p>}
          {!isLoading && decisions.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No decisions yet. Submit a question above.
              </CardContent>
            </Card>
          )}
          {decisions.map((d: any) => (
            <Card key={d.id} className="border-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <CardTitle className="text-base">{d.question}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant={d.status === "approved" ? "default" : d.status === "rejected" ? "destructive" : "secondary"}>
                        {d.status}
                      </Badge>
                      {d.decision_score != null && (
                        <Badge variant="outline">Score: {Math.round(d.decision_score)}/100</Badge>
                      )}
                      {d.confidence != null && (
                        <Badge variant="outline">Confidence: {Math.round(d.confidence)}%</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {d.decision_score != null && (
                  <Progress value={d.decision_score} className="h-2" />
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  {ROLE_META.map(({ key, label, icon: Icon, color }) => (
                    <div key={key} className="p-3 rounded-lg bg-muted/40 border">
                      <div className={`flex items-center gap-2 text-xs font-semibold mb-1 ${color}`}>
                        <Icon className="w-4 h-4" /> {label}
                      </div>
                      <p className="text-sm text-foreground/80">{d[key] || "-"}</p>
                    </div>
                  ))}
                </div>

                {d.conflict_summary && (
                  <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 mb-1">
                      <AlertTriangle className="w-4 h-4" /> Boardroom conflict
                    </div>
                    <p className="text-sm">{d.conflict_summary}</p>
                  </div>
                )}

                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                    <Crown className="w-4 h-4" /> Final decision
                  </div>
                  <p className="text-sm font-medium">{d.final_decision || "-"}</p>
                </div>

                <div className="grid md:grid-cols-3 gap-2 text-xs">
                  <div className="p-2 rounded bg-green-500/10">
                    <p className="font-semibold text-green-600">Best case</p>
                    <p className="text-muted-foreground">{d.scenario_best || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10">
                    <p className="font-semibold text-yellow-700">Expected</p>
                    <p className="text-muted-foreground">{d.scenario_expected || "-"}</p>
                  </div>
                  <div className="p-2 rounded bg-red-500/10">
                    <p className="font-semibold text-red-600">Worst case</p>
                    <p className="text-muted-foreground">{d.scenario_worst || "-"}</p>
                  </div>
                </div>

                {d.status === "recommended" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => approve.mutate({ id: d.id, status: "approved" })}
                      disabled={approve.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approve.mutate({ id: d.id, status: "rejected" })}
                      disabled={approve.isPending}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => approve.mutate({ id: d.id, status: "deferred" })}
                      disabled={approve.isPending}
                    >
                      Defer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
