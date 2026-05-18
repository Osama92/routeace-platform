import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  Award, Flame, Calendar, ArrowUp, ArrowDown, Minus, AlertTriangle,
  BarChart3, Activity, Sparkles, CircleDollarSign, Inbox, RefreshCw,
  Workflow, Bot, Eye, Gauge, ArrowRight, Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  BarChart, Bar, Cell, PieChart, Pie
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────
interface PerformanceScore {
  id: string;
  score_date: string;
  workflow_efficiency: number;
  automation_level: number;
  decision_accuracy: number;
  cash_flow_health: number;
  risk_score: number;
  execution_score: number;
  total_score: number;
  rank_level: string;
}

interface TransformationDay {
  id: string;
  day_number: number;
  week_number: number;
  task_title: string;
  task_description: string | null;
  category: string;
  completed: boolean;
  completed_at: string | null;
  time_spent_minutes: number;
  impact_score: number;
}

interface AITask {
  id: string;
  source: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  status: string;
  due_date: string | null;
  impact_score: number;
  created_at: string;
}

// ─── 28-Day Program Template ─────────────────────────────────────────
const PROGRAM_TEMPLATE: { day: number; title: string; desc: string; category: string }[] = [
  { day: 1, title: "Audit PnL workflow", desc: "Review how PnL is currently computed. Identify manual steps.", category: "optimization" },
  { day: 2, title: "Map billing cycle", desc: "Document the full invoice → AR → payment flow end-to-end.", category: "optimization" },
  { day: 3, title: "Reconciliation review", desc: "Check current reconciliation process. Note unmatched items.", category: "optimization" },
  { day: 4, title: "Expense classification audit", desc: "Verify expense categories are correctly mapped to PnL lines.", category: "optimization" },
  { day: 5, title: "Cash flow visibility check", desc: "Review cash position vs receivables vs payables.", category: "optimization" },
  { day: 6, title: "Tax compliance scan", desc: "Verify VAT, WHT, and PAYE calculations are current.", category: "optimization" },
  { day: 7, title: "Week 1 review & score", desc: "Review findings. Set optimization targets.", category: "optimization" },
  { day: 8, title: "Benchmark workflows", desc: "Compare your process times against best-practice benchmarks.", category: "differentiation" },
  { day: 9, title: "Optimize invoice posting", desc: "Reduce time from dispatch close to invoice post.", category: "differentiation" },
  { day: 10, title: "Streamline AR follow-up", desc: "Set up systematic overdue collection workflows.", category: "differentiation" },
  { day: 11, title: "Bill payment scheduling", desc: "Optimize vendor payment timing for cash flow.", category: "differentiation" },
  { day: 12, title: "Reporting shortcuts", desc: "Learn to use report exports and quick filters.", category: "differentiation" },
  { day: 13, title: "Period closing prep", desc: "Prepare month-end closing checklist and timeline.", category: "differentiation" },
  { day: 14, title: "Week 2 review & score", desc: "Measure workflow improvement vs Week 1.", category: "differentiation" },
  { day: 15, title: "Enable auto-reconciliation", desc: "Configure automatic invoice-payment matching.", category: "automation" },
  { day: 16, title: "Auto tax computation", desc: "Verify automated VAT/WHT calculations are active.", category: "automation" },
  { day: 17, title: "Set cash flow alerts", desc: "Configure low-cash and high-receivable alerts.", category: "automation" },
  { day: 18, title: "Anomaly detection review", desc: "Check AI-flagged anomalies and resolve.", category: "automation" },
  { day: 19, title: "Auto-invoice on delivery", desc: "Verify auto-invoice triggers are working on dispatch close.", category: "automation" },
  { day: 20, title: "Dashboard customization", desc: "Set up your daily finance view with key metrics.", category: "automation" },
  { day: 21, title: "Week 3 review & score", desc: "Measure automation level improvement.", category: "automation" },
  { day: 22, title: "Time savings report", desc: "Calculate total time saved vs Day 1 baseline.", category: "execution" },
  { day: 23, title: "Cash flow clarity score", desc: "Verify real-time cash position accuracy.", category: "execution" },
  { day: 24, title: "Profit visibility check", desc: "Confirm PnL reflects all revenue and costs correctly.", category: "execution" },
  { day: 25, title: "Tax efficiency review", desc: "Verify all tax credits and filings are current.", category: "execution" },
  { day: 26, title: "Full month-end drill", desc: "Execute complete period closing process.", category: "execution" },
  { day: 27, title: "Performance scorecard", desc: "Review all 6 scoring dimensions and improvements.", category: "execution" },
  { day: 28, title: "Graduation & certification", desc: "Final score. Generate improvement report.", category: "execution" },
];

// ─── Workflow definitions ────────────────────────────────────────────
const WORKFLOW_ITEMS = [
  { name: "Invoice Creation → Posting", manualMin: 25, optimizedMin: 3, automated: true },
  { name: "AR Reconciliation", manualMin: 45, optimizedMin: 5, automated: true },
  { name: "Expense Classification", manualMin: 20, optimizedMin: 8, automated: false },
  { name: "Tax Computation (VAT/WHT)", manualMin: 30, optimizedMin: 2, automated: true },
  { name: "PnL Report Generation", manualMin: 40, optimizedMin: 5, automated: true },
  { name: "Cash Flow Forecasting", manualMin: 60, optimizedMin: 10, automated: true },
  { name: "Period Closing Checklist", manualMin: 90, optimizedMin: 25, automated: false },
  { name: "Vendor Payment Scheduling", manualMin: 35, optimizedMin: 10, automated: false },
];

// ─── Component ───────────────────────────────────────────────────────
const FinanceAIPerformance = () => {
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [computingScore, setComputingScore] = useState(false);
  const [generatingTasks, setGeneratingTasks] = useState(false);

  // ── Data fetching ──
  const { data: scores = [], isLoading: scoresLoading } = useQuery({
    queryKey: ["fm-scores", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fm_performance_scores")
        .select("*")
        .eq("user_id", user!.id)
        .order("score_date", { ascending: false })
        .limit(90);
      return (data || []) as PerformanceScore[];
    },
    enabled: !!user,
  });

  const { data: transformDays = [] } = useQuery({
    queryKey: ["fm-transform", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fm_transformation_days")
        .select("*")
        .eq("user_id", user!.id)
        .order("day_number");
      return (data || []) as TransformationDay[];
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["fm-tasks", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("fm_ai_tasks")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as AITask[];
    },
    enabled: !!user,
  });

  const { data: financeKPIs } = useQuery({
    queryKey: ["fm-finance-kpis", user?.id, organizationId],
    enabled: !!user && !!organizationId,
    queryFn: async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();
      const orgEq = (q: any) => q.eq("organization_id", organizationId);

      const [invRes, arRes, expRes, billsRes, prevInvRes, cashRes] = await Promise.all([
        orgEq(supabase.from("invoices").select("total_amount, status, created_at").gte("created_at", monthStart)),
        orgEq(supabase.from("accounts_receivable").select("balance, status, due_date, amount_due")),
        orgEq(supabase.from("expenses").select("amount, category").gte("created_at", monthStart)),
        orgEq(supabase.from("bills").select("total_amount, payment_status").gte("created_at", monthStart)),
        orgEq(supabase.from("invoices").select("total_amount, status").gte("created_at", prevMonthStart).lte("created_at", prevMonthEnd)),
        orgEq(supabase.from("cash_transactions").select("amount, transaction_type").gte("created_at", monthStart)),
      ]);

      const invoices = invRes.data || [];
      const ar = arRes.data || [];
      const expenses = expRes.data || [];
      const bills = billsRes.data || [];
      const prevInvoices = prevInvRes.data || [];
      const cashTxns = cashRes.data || [];

      const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0);
      const outstandingAR = ar.filter(r => r.status !== "paid").reduce((s, r) => s + (r.balance || 0), 0);
      const totalAR = ar.reduce((s, r) => s + (r.amount_due || 0), 0);
      const overdueAR = ar.filter(r => {
        if (!r.due_date || r.status === "paid") return false;
        return new Date(r.due_date) < now;
      }).length;
      const overdueAmount = ar.filter(r => r.due_date && r.status !== "paid" && new Date(r.due_date) < now)
        .reduce((s, r) => s + (r.balance || 0), 0);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
      const totalBills = bills.reduce((s, b) => s + (b.total_amount || 0), 0);
      const paidBills = bills.filter(b => b.payment_status === "paid").reduce((s, b) => s + (b.total_amount || 0), 0);
      const unpaidBills = totalBills - paidBills;
      const prevInvoiced = prevInvoices.reduce((s, i) => s + (i.total_amount || 0), 0);
      const cashInflows = cashTxns.filter(t => t.transaction_type === "inflow").reduce((s, t) => s + (t.amount || 0), 0);
      const cashOutflows = cashTxns.filter(t => t.transaction_type === "outflow").reduce((s, t) => s + (t.amount || 0), 0);
      const netCash = cashInflows - cashOutflows;
      const monthlyObligations = totalExpenses + unpaidBills;

      // Expense categories
      const expByCat = (expenses as any[]).reduce((acc: Record<string, number>, e: any) => {
        const cat = e.category || "Other";
        acc[cat] = (acc[cat] || 0) + (e.amount || 0);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalInvoiced, totalPaid, outstandingAR, overdueAR, totalExpenses,
        totalBills, unpaidBills, paidBills, prevInvoiced, overdueAmount, totalAR,
        cashInflows, cashOutflows, netCash, monthlyObligations, expByCat,
      };
    },
    staleTime: 60_000,
  });

  // ── Mutations ──
  const initProgram = useMutation({
    mutationFn: async () => {
      const rows = PROGRAM_TEMPLATE.map(t => ({
        user_id: user!.id, day_number: t.day, task_title: t.title,
        task_description: t.desc, category: t.category,
      }));
      const { error } = await supabase.from("fm_transformation_days").upsert(rows, { onConflict: "user_id,day_number" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fm-transform"] });
      toast.success("28-Day program initialized!");
    },
  });

  const completeDay = useMutation({
    mutationFn: async (dayId: string) => {
      const { error } = await supabase.from("fm_transformation_days")
        .update({ completed: true, completed_at: new Date().toISOString(), time_spent_minutes: 15 })
        .eq("id", dayId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fm-transform"] });
      toast.success("Day completed! 🎉");
    },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from("fm_ai_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fm-tasks"] });
      toast.success("Task completed!");
    },
  });

  // Compute score via edge function
  const computeScore = async () => {
    setComputingScore(true);
    try {
      const { data, error } = await supabase.functions.invoke("fm-compute-score");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["fm-scores"] });
      toast.success(`Score computed: ${data?.total_score ?? "-"}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to compute score");
    } finally {
      setComputingScore(false);
    }
  };

  // Generate AI tasks
  const generateTasks = async () => {
    setGeneratingTasks(true);
    try {
      const { data, error } = await supabase.functions.invoke("fm-ai-copilot");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["fm-tasks"] });
      toast.success(`Generated ${data?.tasksCreated ?? 0} new tasks`);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate tasks");
    } finally {
      setGeneratingTasks(false);
    }
  };

  // ── Computed values ──
  const latestScore = scores[0];
  const previousScore = scores[1];
  const scoreDelta = latestScore && previousScore ? latestScore.total_score - previousScore.total_score : 0;
  const completedDays = transformDays.filter(d => d.completed).length;
  const currentStreak = useMemo(() => {
    let streak = 0;
    for (const d of [...transformDays].reverse()) {
      if (d.completed) streak++; else break;
    }
    return streak;
  }, [transformDays]);

  const pendingTasks = tasks.filter(t => t.status === "pending").length;
  const completedTasks = tasks.filter(t => t.status === "completed").length;
  const executionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  const cashHealth = financeKPIs
    ? financeKPIs.monthlyObligations > 0
      ? Math.min(100, Math.round(((financeKPIs.netCash > 0 ? financeKPIs.netCash : financeKPIs.totalPaid) / financeKPIs.monthlyObligations) * 100))
      : financeKPIs.totalPaid > 0 ? 100 : 0
    : 0;

  const automatedWorkflows = WORKFLOW_ITEMS.filter(w => w.automated).length;
  const automationPercent = Math.round((automatedWorkflows / WORKFLOW_ITEMS.length) * 100);
  const totalManualTime = WORKFLOW_ITEMS.reduce((s, w) => s + w.manualMin, 0);
  const totalOptimizedTime = WORKFLOW_ITEMS.reduce((s, w) => s + w.optimizedMin, 0);
  const timeSavedPercent = Math.round(((totalManualTime - totalOptimizedTime) / totalManualTime) * 100);

  const scoreHistory = scores.slice(0, 30).reverse().map(s => ({
    date: new Date(s.score_date).toLocaleDateString("en", { month: "short", day: "numeric" }),
    score: Number(s.total_score),
    workflow: Number(s.workflow_efficiency),
    automation: Number(s.automation_level),
    decisions: Number(s.decision_accuracy),
  }));

  const radarData = latestScore ? [
    { dim: "Workflow", value: latestScore.workflow_efficiency, fullMark: 100 },
    { dim: "Automation", value: latestScore.automation_level, fullMark: 100 },
    { dim: "Decisions", value: latestScore.decision_accuracy, fullMark: 100 },
    { dim: "Cash Flow", value: latestScore.cash_flow_health, fullMark: 100 },
    { dim: "Risk Mgmt", value: latestScore.risk_score, fullMark: 100 },
    { dim: "Execution", value: latestScore.execution_score, fullMark: 100 },
  ] : [];

  const rankColor = (rank: string) => {
    switch (rank) {
      case "Elite Operator": return "text-yellow-500";
      case "Advanced Operator": return "text-blue-500";
      case "Operator": return "text-green-500";
      default: return "text-muted-foreground";
    }
  };

  const weekLabel = (w: number) => ["", "Process Optimization", "Workflow Differentiation", "Automation + Intelligence", "Proof + Execution"][w] || "";

  // Risk items computed from real data
  const risks = useMemo(() => {
    if (!financeKPIs) return [];
    const r: { type: string; severity: string; message: string; resolved: boolean }[] = [];
    if (financeKPIs.overdueAR > 0) r.push({ type: "Overdue Receivables", severity: financeKPIs.overdueAR > 5 ? "high" : "medium", message: `${financeKPIs.overdueAR} overdue items totaling ₦${(financeKPIs.overdueAmount / 1e6).toFixed(1)}M`, resolved: false });
    if (financeKPIs.unpaidBills > financeKPIs.netCash && financeKPIs.unpaidBills > 0) r.push({ type: "Cash Gap", severity: "high", message: `Unpaid bills (₦${(financeKPIs.unpaidBills / 1e6).toFixed(1)}M) exceed available cash`, resolved: false });
    if (financeKPIs.totalExpenses > financeKPIs.totalPaid && financeKPIs.totalPaid > 0) r.push({ type: "Expense Overshoot", severity: "medium", message: `Expenses exceed collections by ₦${((financeKPIs.totalExpenses - financeKPIs.totalPaid) / 1e6).toFixed(1)}M`, resolved: false });
    if (cashHealth >= 80 && financeKPIs.overdueAR === 0) r.push({ type: "All Clear", severity: "low", message: "No critical financial risks detected", resolved: true });
    return r;
  }, [financeKPIs, cashHealth]);

  const resolvedRisks = risks.filter(r => r.resolved).length;
  const riskScore = risks.length > 0 ? Math.round((resolvedRisks / risks.length) * 100) : 100;

  // Skill evolution data
  const skillData = useMemo(() => {
    if (scores.length < 2) return null;
    const oldest = scores[scores.length - 1];
    const latest = scores[0];
    return {
      workflowGrowth: latest.workflow_efficiency - oldest.workflow_efficiency,
      automationGrowth: latest.automation_level - oldest.automation_level,
      decisionGrowth: latest.decision_accuracy - oldest.decision_accuracy,
      overallGrowth: latest.total_score - oldest.total_score,
      daysTracked: scores.length,
    };
  }, [scores]);

  const expCatData = useMemo(() => {
    if (!financeKPIs?.expByCat) return [];
    return Object.entries(financeKPIs.expByCat as Record<string, number>)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [financeKPIs]);

  const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--muted-foreground))"];

  return (
    <DashboardLayout title="AI Performance Center" subtitle="Real-time finance operating score, transformation & AI-driven tasks">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-7 h-7 text-primary" /> AI Performance Center
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Finance operating score · 28-day transformation · AI co-pilot
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={computeScore} disabled={computingScore}>
              {computingScore ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
              Compute Score
            </Button>
            <Button variant="outline" size="sm" onClick={generateTasks} disabled={generatingTasks}>
              {generatingTasks ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bot className="w-4 h-4 mr-1" />}
              AI Co-Pilot
            </Button>
            {latestScore && (
              <div className="text-right ml-2">
                <div className={`text-3xl font-bold ${rankColor(latestScore.rank_level)}`}>
                  {Math.round(latestScore.total_score)}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {scoreDelta > 0 ? <ArrowUp className="w-3 h-3 text-green-500" /> : scoreDelta < 0 ? <ArrowDown className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                  <span className={scoreDelta > 0 ? "text-green-500" : scoreDelta < 0 ? "text-destructive" : "text-muted-foreground"}>
                    {scoreDelta > 0 ? "+" : ""}{scoreDelta.toFixed(1)}
                  </span>
                </div>
                <Badge variant="outline" className="mt-0.5 text-[10px]">{latestScore.rank_level}</Badge>
              </div>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex w-auto min-w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="transform">28-Day</TabsTrigger>
              <TabsTrigger value="workflow">Workflows</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="finance">Finance</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* ═══ OVERVIEW TAB ═══ */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[
                { label: "Total Score", value: latestScore ? Math.round(latestScore.total_score) : "-", icon: Target, color: "text-primary" },
                { label: "Rank", value: latestScore?.rank_level || "Start", icon: Award, color: rankColor(latestScore?.rank_level || "") },
                { label: "28-Day", value: `${completedDays}/28`, icon: Calendar, color: "text-blue-500" },
                { label: "Streak", value: `${currentStreak}d`, icon: Flame, color: "text-orange-500" },
                { label: "Tasks Done", value: `${completedTasks}/${tasks.length}`, icon: CheckCircle, color: "text-green-500" },
                { label: "Cash Health", value: `${cashHealth}%`, icon: CircleDollarSign, color: cashHealth > 70 ? "text-green-500" : "text-orange-500" },
              ].map(k => (
                <Card key={k.label}>
                  <CardContent className="pt-4 pb-3">
                    <k.icon className={`w-5 h-5 ${k.color} mb-1`} />
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <p className="text-lg font-bold">{k.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Score Dimensions</CardTitle></CardHeader>
                <CardContent>
                  {radarData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Inbox className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Click "Compute Score" to start tracking performance.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Score Trend</CardTitle></CardHeader>
                <CardContent>
                  {scoreHistory.length > 1 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={scoreHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Score history builds over time as daily scores are computed.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {financeKPIs && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Finance Snapshot (This Month)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                    {[
                      { label: "Invoiced", value: `₦${(financeKPIs.totalInvoiced / 1e6).toFixed(1)}M` },
                      { label: "Collected", value: `₦${(financeKPIs.totalPaid / 1e6).toFixed(1)}M` },
                      { label: "Outstanding AR", value: `₦${(financeKPIs.outstandingAR / 1e6).toFixed(1)}M` },
                      { label: "Overdue Items", value: String(financeKPIs.overdueAR) },
                      { label: "Expenses", value: `₦${(financeKPIs.totalExpenses / 1e6).toFixed(1)}M` },
                    ].map(f => (
                      <div key={f.label}>
                        <p className="text-xs text-muted-foreground">{f.label}</p>
                        <p className="text-lg font-semibold">{f.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ 28-DAY TRANSFORMATION TAB ═══ */}
          <TabsContent value="transform" className="space-y-6">
            {transformDays.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Sparkles className="w-12 h-12 mx-auto text-primary/60 mb-4" />
                  <h3 className="text-lg font-bold mb-2">Start Your 28-Day Finance Transformation</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                    15 minutes per day for 28 days. Optimize workflows, automate processes, and measurably improve your finance operations.
                  </p>
                  <Button onClick={() => initProgram.mutate()} disabled={initProgram.isPending}>
                    {initProgram.isPending ? "Initializing..." : "Begin Program"}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardContent className="pt-4 pb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Progress: {completedDays} / 28 days</span>
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="text-sm">{currentStreak} day streak</span>
                      </div>
                    </div>
                    <Progress value={(completedDays / 28) * 100} className="h-3" />
                    {completedDays === 28 && (
                      <p className="text-sm text-green-600 font-medium mt-2">🎉 Congratulations! You've completed the 28-Day Finance Transformation!</p>
                    )}
                  </CardContent>
                </Card>

                {[1, 2, 3, 4].map(week => {
                  const weekDays = transformDays.filter(d => d.week_number === week);
                  const weekComplete = weekDays.filter(d => d.completed).length;
                  return (
                    <Card key={week}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Week {week}: {weekLabel(week)}</CardTitle>
                          <Badge variant={weekComplete === weekDays.length && weekDays.length > 0 ? "default" : "secondary"}>{weekComplete}/{weekDays.length}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {weekDays.map(d => (
                            <div key={d.id} className={`flex items-center gap-3 p-2 rounded-lg border ${d.completed ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900" : "border-border"}`}>
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${d.completed ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"}`}>
                                {d.day_number}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${d.completed ? "line-through text-muted-foreground" : ""}`}>{d.task_title}</p>
                                {d.task_description && <p className="text-xs text-muted-foreground truncate">{d.task_description}</p>}
                              </div>
                              {d.completed ? (
                                <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                              ) : (
                                <Button size="sm" variant="outline" onClick={() => completeDay.mutate(d.id)} disabled={completeDay.isPending} className="shrink-0">Complete</Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* ═══ WORKFLOW INTELLIGENCE TAB ═══ */}
          <TabsContent value="workflow" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <Workflow className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Total Manual Time</p>
                <p className="text-xl font-bold">{totalManualTime} min</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Zap className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Optimized Time</p>
                <p className="text-xl font-bold">{totalOptimizedTime} min</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                <p className="text-xs text-muted-foreground">Time Saved</p>
                <p className="text-xl font-bold text-green-600">{timeSavedPercent}%</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Workflow Efficiency Map</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {WORKFLOW_ITEMS.map(w => {
                    const saved = Math.round(((w.manualMin - w.optimizedMin) / w.manualMin) * 100);
                    return (
                      <div key={w.name} className="flex items-center gap-4 p-3 rounded-lg border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{w.name}</p>
                            {w.automated && <Badge variant="default" className="text-[10px] py-0">Automated</Badge>}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                            <span>Manual: {w.manualMin} min</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className="text-green-600 font-medium">Optimized: {w.optimizedMin} min</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-lg font-bold text-green-600">-{saved}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Time Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={WORKFLOW_ITEMS.map(w => ({ name: w.name.split("→")[0].trim().substring(0, 15), manual: w.manualMin, optimized: w.optimizedMin }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 10 }} label={{ value: "Minutes", angle: -90, position: "insideLeft", style: { fontSize: 10 } }} />
                    <Tooltip />
                    <Bar dataKey="manual" fill="hsl(var(--muted-foreground))" name="Manual" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="optimized" fill="hsl(var(--primary))" name="Optimized" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ AUTOMATION ENGINE TAB ═══ */}
          <TabsContent value="automation" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <Zap className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Automation Score</p>
                <p className="text-2xl font-bold">{automationPercent}%</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Automated</p>
                <p className="text-2xl font-bold">{automatedWorkflows}/{WORKFLOW_ITEMS.length}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <Clock className="w-6 h-6 mx-auto text-orange-500 mb-1" />
                <p className="text-xs text-muted-foreground">Manual Remaining</p>
                <p className="text-2xl font-bold">{WORKFLOW_ITEMS.length - automatedWorkflows}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <TrendingUp className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                <p className="text-xs text-muted-foreground">Workload Reduced</p>
                <p className="text-2xl font-bold">{timeSavedPercent}%</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Automation Status per Workflow</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {WORKFLOW_ITEMS.map(w => (
                    <div key={w.name} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${w.automated ? "bg-green-500" : "bg-orange-400"}`} />
                      <span className="text-sm flex-1">{w.name}</span>
                      <Badge variant={w.automated ? "default" : "secondary"}>{w.automated ? "Automated" : "Manual"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">Automation Progress</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Automation</span>
                    <span className="font-bold">{automationPercent}%</span>
                  </div>
                  <Progress value={automationPercent} className="h-4" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {automationPercent >= 80 ? "🏆 Elite automation level achieved!" :
                     automationPercent >= 60 ? "⚡ Strong automation. A few more workflows to optimize." :
                     automationPercent >= 40 ? "📈 Good progress. Focus on automating reconciliation and reporting." :
                     "🔧 Start by enabling auto-invoice and auto-reconciliation features."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ TASKS TAB ═══ */}
          <TabsContent value="tasks" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-orange-500">{pendingTasks}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold text-green-500">{completedTasks}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <p className="text-xs text-muted-foreground">Execution Rate</p>
                <p className="text-2xl font-bold">{executionRate}%</p>
              </CardContent></Card>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={generateTasks} disabled={generatingTasks}>
                {generatingTasks ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Bot className="w-4 h-4 mr-1" />}
                Generate AI Tasks
              </Button>
            </div>

            {tasks.length === 0 ? (
              <Card><CardContent className="py-12 text-center">
                <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Generate AI Tasks" to get personalized finance tasks.</p>
              </CardContent></Card>
            ) : (
              <Card><CardContent className="pt-4">
                <div className="space-y-2">
                  {tasks.map(t => (
                    <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${t.status === "completed" ? "opacity-60" : ""}`}>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${
                        t.priority === "critical" ? "bg-destructive" : t.priority === "high" ? "bg-orange-500" : t.priority === "medium" ? "bg-yellow-500" : "bg-blue-500"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === "completed" ? "line-through" : ""}`}>{t.title}</p>
                        {t.description && <p className="text-xs text-muted-foreground truncate">{t.description}</p>}
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0">{t.source}</Badge>
                          <span className="text-[10px] text-muted-foreground">{t.category}</span>
                        </div>
                      </div>
                      {t.status !== "completed" && (
                        <Button size="sm" variant="outline" onClick={() => completeTask.mutate(t.id)} disabled={completeTask.isPending}>Done</Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ═══ RISKS TAB ═══ */}
          <TabsContent value="risks" className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center">
                <Shield className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <p className="text-2xl font-bold">{riskScore}%</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <AlertTriangle className="w-6 h-6 mx-auto text-orange-500 mb-1" />
                <p className="text-xs text-muted-foreground">Active Risks</p>
                <p className="text-2xl font-bold">{risks.filter(r => !r.resolved).length}</p>
              </CardContent></Card>
              <Card><CardContent className="pt-4 text-center">
                <CheckCircle className="w-6 h-6 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Resolved</p>
                <p className="text-2xl font-bold">{resolvedRisks}</p>
              </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-sm">Risk & Bottleneck Monitor</CardTitle></CardHeader>
              <CardContent>
                {risks.length === 0 ? (
                  <div className="text-center py-8">
                    <Shield className="w-10 h-10 mx-auto text-green-500/50 mb-2" />
                    <p className="text-sm text-muted-foreground">No risks detected. Financial health is strong.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {risks.map((r, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                        r.severity === "high" ? "border-destructive/30 bg-destructive/5" :
                        r.severity === "medium" ? "border-orange-300 bg-orange-50 dark:bg-orange-950/20" :
                        "border-green-300 bg-green-50 dark:bg-green-950/20"
                      }`}>
                        {r.resolved ? <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" /> :
                         <AlertTriangle className={`w-5 h-5 mt-0.5 shrink-0 ${r.severity === "high" ? "text-destructive" : "text-orange-500"}`} />}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{r.type}</p>
                            <Badge variant={r.severity === "high" ? "destructive" : r.severity === "medium" ? "secondary" : "default"} className="text-[10px]">{r.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ PERFORMANCE TAB ═══ */}
          <TabsContent value="performance" className="space-y-6">
            {latestScore ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "Workflow Efficiency", value: latestScore.workflow_efficiency, weight: "25%", icon: Activity },
                    { label: "Automation Level", value: latestScore.automation_level, weight: "20%", icon: Zap },
                    { label: "Decision Accuracy", value: latestScore.decision_accuracy, weight: "20%", icon: Brain },
                    { label: "Cash Flow Health", value: latestScore.cash_flow_health, weight: "15%", icon: CircleDollarSign },
                    { label: "Risk Management", value: latestScore.risk_score, weight: "10%", icon: Shield },
                    { label: "Task Execution", value: latestScore.execution_score, weight: "10%", icon: Target },
                  ].map(dim => (
                    <Card key={dim.label}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <dim.icon className="w-4 h-4 text-primary" />
                          <span className="text-xs font-medium">{dim.label}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">×{dim.weight}</span>
                        </div>
                        <p className="text-2xl font-bold">{Math.round(dim.value)}</p>
                        <Progress value={dim.value} className="h-2 mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Multi-Dimension Trend</CardTitle></CardHeader>
                  <CardContent>
                    {scoreHistory.length > 1 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={scoreHistory}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
                          <Line type="monotone" dataKey="workflow" stroke="hsl(var(--chart-2))" strokeWidth={1} name="Workflow" dot={false} />
                          <Line type="monotone" dataKey="automation" stroke="hsl(var(--chart-3))" strokeWidth={1} name="Automation" dot={false} />
                          <Line type="monotone" dataKey="decisions" stroke="hsl(var(--chart-4))" strokeWidth={1} name="Decisions" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-8">Daily scores will build your performance history.</p>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-12 text-center">
                <Target className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium text-muted-foreground">No performance data yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Compute Score" to generate your first performance snapshot.</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ═══ FINANCE TAB ═══ */}
          <TabsContent value="finance" className="space-y-6">
            {financeKPIs ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Revenue (MTD)", value: `₦${(financeKPIs.totalInvoiced / 1e6).toFixed(1)}M`, delta: financeKPIs.prevInvoiced > 0 ? Math.round(((financeKPIs.totalInvoiced - financeKPIs.prevInvoiced) / financeKPIs.prevInvoiced) * 100) : 0 },
                    { label: "Collections", value: `₦${(financeKPIs.totalPaid / 1e6).toFixed(1)}M`, delta: 0 },
                    { label: "Expenses", value: `₦${(financeKPIs.totalExpenses / 1e6).toFixed(1)}M`, delta: 0 },
                    { label: "Net Cash Flow", value: `₦${(financeKPIs.netCash / 1e6).toFixed(1)}M`, delta: 0 },
                  ].map(m => (
                    <Card key={m.label}><CardContent className="pt-4">
                      <p className="text-xs text-muted-foreground">{m.label}</p>
                      <p className="text-xl font-bold mt-1">{m.value}</p>
                      {m.delta !== 0 && (
                        <p className={`text-xs ${m.delta > 0 ? "text-green-500" : "text-destructive"}`}>
                          {m.delta > 0 ? "+" : ""}{m.delta}% vs last month
                        </p>
                      )}
                    </CardContent></Card>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Cash Flow Health</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Cash Health Score</span>
                            <span className="font-bold">{cashHealth}%</span>
                          </div>
                          <Progress value={cashHealth} className="h-3" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-center mt-4">
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Inflows</p>
                            <p className="font-bold text-green-600">₦{(financeKPIs.cashInflows / 1e6).toFixed(1)}M</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Outflows</p>
                            <p className="font-bold text-destructive">₦{(financeKPIs.cashOutflows / 1e6).toFixed(1)}M</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Unpaid Bills</p>
                            <p className="font-bold">₦{(financeKPIs.unpaidBills / 1e6).toFixed(1)}M</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Overdue AR</p>
                            <p className="font-bold">₦{(financeKPIs.overdueAmount / 1e6).toFixed(1)}M</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-sm">Expense Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      {expCatData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={expCatData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `₦${(v / 1e6).toFixed(1)}M`} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                            <Tooltip formatter={(v: number) => `₦${v.toLocaleString()}`} />
                            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                              {expCatData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-8">No expense data this month.</p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle className="text-sm">Billing & Expense Summary</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Total Bills</p>
                        <p className="text-lg font-bold">₦{(financeKPIs.totalBills / 1e6).toFixed(1)}M</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Paid Bills</p>
                        <p className="text-lg font-bold text-green-600">₦{(financeKPIs.paidBills / 1e6).toFixed(1)}M</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Unpaid Bills</p>
                        <p className="text-lg font-bold text-orange-500">₦{(financeKPIs.unpaidBills / 1e6).toFixed(1)}M</p>
                      </div>
                      <div className="p-3 rounded-lg border">
                        <p className="text-xs text-muted-foreground">Monthly Obligations</p>
                        <p className="text-lg font-bold">₦{(financeKPIs.monthlyObligations / 1e6).toFixed(1)}M</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card><CardContent className="py-12 text-center">
                <CircleDollarSign className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">Loading finance data...</p>
              </CardContent></Card>
            )}
          </TabsContent>

          {/* ═══ SKILLS TAB ═══ */}
          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Gauge className="w-4 h-4" /> Skill Evolution Tracker</CardTitle></CardHeader>
              <CardContent>
                {skillData ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Overall Growth", value: skillData.overallGrowth, icon: TrendingUp },
                        { label: "Workflow Growth", value: skillData.workflowGrowth, icon: Activity },
                        { label: "Automation Growth", value: skillData.automationGrowth, icon: Zap },
                        { label: "Decision Growth", value: skillData.decisionGrowth, icon: Brain },
                      ].map(s => (
                        <Card key={s.label}><CardContent className="pt-4 text-center">
                          <s.icon className="w-5 h-5 mx-auto text-primary mb-1" />
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className={`text-xl font-bold ${s.value > 0 ? "text-green-600" : s.value < 0 ? "text-destructive" : ""}`}>
                            {s.value > 0 ? "+" : ""}{s.value.toFixed(1)}
                          </p>
                        </CardContent></Card>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Tracked over {skillData.daysTracked} days of score history.</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Gauge className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Need at least 2 daily scores to show skill evolution.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {latestScore && (
              <Card>
                <CardHeader><CardTitle className="text-sm">Current Skill Levels</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { name: "Financial Workflow Mastery", score: latestScore.workflow_efficiency },
                      { name: "Process Automation", score: latestScore.automation_level },
                      { name: "Decision Intelligence", score: latestScore.decision_accuracy },
                      { name: "Cash Management", score: latestScore.cash_flow_health },
                      { name: "Risk Awareness", score: latestScore.risk_score },
                      { name: "Task Discipline", score: latestScore.execution_score },
                    ].map(s => (
                      <div key={s.name}>
                        <div className="flex justify-between text-sm mb-1">
                          <span>{s.name}</span>
                          <span className="font-medium">{Math.round(s.score)}/100</span>
                        </div>
                        <Progress value={s.score} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ═══ INSIGHTS & GAMIFICATION TAB ═══ */}
          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI Co-Pilot Insights</CardTitle></CardHeader>
              <CardContent>
                {financeKPIs ? (
                  <div className="space-y-3">
                    {financeKPIs.overdueAR > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Cash Collection Risk</p>
                          <p className="text-xs text-muted-foreground">{financeKPIs.overdueAR} overdue receivable(s) totaling ₦{(financeKPIs.overdueAmount / 1e6).toFixed(1)}M. Follow up to improve Cash Health.</p>
                        </div>
                      </div>
                    )}
                    {cashHealth < 50 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                        <CircleDollarSign className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Low Cash Health ({cashHealth}%)</p>
                          <p className="text-xs text-muted-foreground">Monthly obligations exceed available cash. Prioritize collections and defer non-critical expenses.</p>
                        </div>
                      </div>
                    )}
                    {financeKPIs.totalExpenses > financeKPIs.totalPaid && financeKPIs.totalPaid > 0 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                        <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Expense-to-Collection Imbalance</p>
                          <p className="text-xs text-muted-foreground">Expenses (₦{(financeKPIs.totalExpenses / 1e6).toFixed(1)}M) exceed collections (₦{(financeKPIs.totalPaid / 1e6).toFixed(1)}M).</p>
                        </div>
                      </div>
                    )}
                    {financeKPIs.prevInvoiced > 0 && financeKPIs.totalInvoiced > financeKPIs.prevInvoiced && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <TrendingUp className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Revenue Growth Detected</p>
                          <p className="text-xs text-muted-foreground">Invoicing up {Math.round(((financeKPIs.totalInvoiced - financeKPIs.prevInvoiced) / financeKPIs.prevInvoiced) * 100)}% vs last month. Ensure collections keep pace.</p>
                        </div>
                      </div>
                    )}
                    {completedDays > 0 && completedDays < 28 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                        <Calendar className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Transformation: Day {completedDays}/28</p>
                          <p className="text-xs text-muted-foreground">{28 - completedDays} days remaining. Keep your {currentStreak}-day streak going!</p>
                        </div>
                      </div>
                    )}
                    {automationPercent < 50 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
                        <Zap className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Automation Opportunity</p>
                          <p className="text-xs text-muted-foreground">Only {automationPercent}% of workflows automated. Enable auto-reconciliation and auto-tax to save {totalManualTime - totalOptimizedTime} minutes daily.</p>
                        </div>
                      </div>
                    )}
                    {financeKPIs.overdueAR === 0 && cashHealth >= 70 && (
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">Finance Health: Strong</p>
                          <p className="text-xs text-muted-foreground">No overdue receivables, cash health at {cashHealth}%. Excellent position.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">Loading insights...</p>
                )}
              </CardContent>
            </Card>

            {/* Gamification */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" /> Badges & Achievements</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { name: "First Score", desc: "Record your first score", earned: scores.length > 0 },
                    { name: "7-Day Streak", desc: "Complete 7 days in a row", earned: currentStreak >= 7 },
                    { name: "14-Day Warrior", desc: "Complete 14 transformation days", earned: completedDays >= 14 },
                    { name: "Automation Master", desc: "Reach 80%+ automation level", earned: automationPercent >= 80 },
                    { name: "Cash Flow Expert", desc: "Maintain 90%+ cash health", earned: cashHealth >= 90 },
                    { name: "Risk Eliminator", desc: "Resolve all detected risks", earned: riskScore >= 90 },
                    { name: "Task Machine", desc: "Complete 20+ tasks", earned: completedTasks >= 20 },
                    { name: "28-Day Graduate", desc: "Complete the full program", earned: completedDays >= 28 },
                    { name: "Workflow Optimizer", desc: "Save 50%+ time on workflows", earned: timeSavedPercent >= 50 },
                    { name: "Decision Ace", desc: "80%+ decision accuracy", earned: (latestScore?.decision_accuracy || 0) >= 80 },
                    { name: "Elite Operator", desc: "Reach Elite rank", earned: latestScore?.rank_level === "Elite Operator" },
                    { name: "Perfect Week", desc: "7/7 tasks completed in a week", earned: executionRate >= 100 && tasks.length >= 7 },
                  ].map(b => (
                    <div key={b.name} className={`p-3 rounded-lg border text-center ${b.earned ? "bg-primary/5 border-primary/30" : "opacity-40"}`}>
                      <Award className={`w-6 h-6 mx-auto mb-1 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-xs font-medium">{b.name}</p>
                      <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Feedback Summary */}
            <Card>
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bot className="w-4 h-4" /> AI Feedback</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {completedDays > 0 && (
                    <p>📊 You've completed <strong>{completedDays}</strong> of 28 transformation days ({Math.round((completedDays / 28) * 100)}%).</p>
                  )}
                  {timeSavedPercent > 0 && (
                    <p>⚡ Workflow optimization saves <strong>{timeSavedPercent}%</strong> of manual processing time ({totalManualTime - totalOptimizedTime} min/day).</p>
                  )}
                  {automationPercent > 0 && (
                    <p>🤖 Automation level: <strong>{automationPercent}%</strong> - {automationPercent >= 80 ? "Elite level achieved!" : automationPercent >= 60 ? "Strong. Keep pushing." : "Room to grow."}</p>
                  )}
                  {executionRate > 0 && (
                    <p>✅ Task execution rate: <strong>{executionRate}%</strong> ({completedTasks} of {tasks.length} tasks completed).</p>
                  )}
                  {latestScore && (
                    <p>🏆 Current rank: <strong>{latestScore.rank_level}</strong> (Score: {Math.round(latestScore.total_score)}/100).</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FinanceAIPerformance;
