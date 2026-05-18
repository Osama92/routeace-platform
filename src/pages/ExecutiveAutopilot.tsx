import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertTriangle, TrendingUp, DollarSign, Truck, Users, Zap, Brain,
  ChevronRight, CheckCircle, Clock, Shield, Activity, Target, Radio,
  ArrowUp, ArrowDown, Eye, MessageCircle, BarChart3,
} from "lucide-react";
import { format } from "date-fns";

type CardType = "critical" | "opportunity" | "decision" | "insight" | "risk";
type Severity = "high" | "medium" | "low";

interface FeedCard {
  id: string;
  type: CardType;
  headline: string;
  context: string;
  impact: string;
  actionTaken?: string;
  recommendedAction?: string;
  impactScore: number;
  timestamp: Date;
  source: string;
  actions: string[];
}

const typeConfig: Record<CardType, { color: string; icon: typeof AlertTriangle; label: string }> = {
  critical: { color: "text-destructive", icon: AlertTriangle, label: "CRITICAL" },
  opportunity: { color: "text-emerald-500", icon: DollarSign, label: "OPPORTUNITY" },
  decision: { color: "text-amber-500", icon: Target, label: "DECISION REQUIRED" },
  insight: { color: "text-blue-500", icon: BarChart3, label: "MARKET SIGNAL" },
  risk: { color: "text-orange-500", icon: Shield, label: "RISK ALERT" },
};

export default function ExecutiveAutopilot() {
  const { organizationId } = useAuth();
  const [activeFilter, setActiveFilter] = useState<"all" | CardType>("all");
  const [selectedCard, setSelectedCard] = useState<FeedCard | null>(null);

  // Live KPIs - strictly scoped to the caller's organization.
  const { data: revenueToday } = useQuery({
    enabled: !!organizationId,
    queryKey: ["exec-revenue-today", organizationId],
    queryFn: async () => {
      const today = new Date(); today.setHours(0,0,0,0);
      const yest = new Date(today); yest.setDate(yest.getDate() - 1);
      const { data } = await supabase.from("invoices")
        .select("total_amount, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", yest.toISOString());
      const rows = data || [];
      const todayIso = today.toISOString();
      const todayTotal = rows.filter(r => r.created_at >= todayIso).reduce((s, i) => s + (i.total_amount || 0), 0);
      const yestTotal = rows.filter(r => r.created_at < todayIso).reduce((s, i) => s + (i.total_amount || 0), 0);
      const trendPct = yestTotal > 0 ? Math.round(((todayTotal - yestTotal) / yestTotal) * 100) : null;
      return { value: todayTotal, trendPct };
    },
  });

  const { data: demandCount } = useQuery({
    enabled: !!organizationId,
    queryKey: ["exec-demand-count", organizationId],
    queryFn: async () => {
      const { count } = await supabase.from("gtm_signals")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .gte("created_at", new Date(Date.now() - 86400000).toISOString());
      return count || 0;
    },
  });

  const { data: activeRoutes } = useQuery({
    enabled: !!organizationId,
    queryKey: ["exec-active-routes", organizationId],
    queryFn: async () => {
      const { count } = await supabase.from("dispatches")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .in("status", ["assigned", "in_transit", "picked_up"]);
      return count || 0;
    },
  });

  const { data: criticalCount } = useQuery({
    enabled: !!organizationId,
    queryKey: ["exec-critical", organizationId],
    queryFn: async () => {
      const { count } = await (supabase.from("autopilot_predictions") as any)
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId!)
        .eq("status", "active")
        .gte("confidence_score", 0.8);
      return count || 0;
    },
  });

  // Generate feed cards from real data - NO simulated/demo cards.
  const { data: feedCards = [] } = useQuery({
    enabled: !!organizationId,
    queryKey: ["exec-feed", organizationId],
    queryFn: async (): Promise<FeedCard[]> => {
      const cards: FeedCard[] = [];

      const { data: predictions } = await (supabase.from("autopilot_predictions") as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(15);
      (predictions || []).forEach((p: any) => {
        const isHighConf = (p.confidence_score || 0) > 0.7;
        cards.push({
          id: p.id,
          type: isHighConf ? "opportunity" : "insight",
          headline: p.title,
          context: p.description || "Autopilot prediction detected",
          impact: `Confidence: ${((p.confidence_score || 0) * 100).toFixed(0)}%`,
          impactScore: Math.round((p.confidence_score || 0.5) * 100),
          timestamp: new Date(p.created_at || Date.now()),
          source: p.module_key,
          actions: ["View Details", "Take Action", "Dismiss"],
        });
      });

      const { data: actions } = await (supabase.from("autopilot_actions") as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(10);
      (actions || []).forEach((a: any) => {
        cards.push({
          id: a.id,
          type: a.status === "pending" ? "decision" : "critical",
          headline: a.title,
          context: a.description || "Autonomous action triggered",
          impact: `Status: ${a.status}`,
          actionTaken: a.status === "executed" ? "Auto-executed by system" : undefined,
          recommendedAction: a.status === "pending" ? "Review and approve" : undefined,
          impactScore: 85,
          timestamp: new Date(a.created_at || Date.now()),
          source: a.module_key,
          actions: a.status === "pending" ? ["Approve", "Reject", "Delegate"] : ["View Details"],
        });
      });

      return cards.sort((a, b) => b.impactScore - a.impactScore);
    },
  });

  const filteredCards = activeFilter === "all" ? feedCards : feedCards.filter((c) => c.type === activeFilter);

  const revToday = revenueToday?.value ?? 0;
  const trendPct = revenueToday?.trendPct;
  const kpis = [
    {
      label: "Revenue Today",
      value: `₦${(revToday / 1_000_000).toFixed(1)}M`,
      icon: DollarSign,
      trend: trendPct === null || trendPct === undefined ? "" : `${trendPct >= 0 ? "+" : ""}${trendPct}%`,
      up: (trendPct ?? 0) >= 0,
    },
    { label: "Demand Captured", value: (demandCount || 0).toString(), icon: Radio, trend: "", up: true },
    { label: "Active Routes", value: (activeRoutes || 0).toLocaleString(), icon: Truck, trend: "", up: true },
    { label: "Critical Issues", value: (criticalCount || 0).toString(), icon: AlertTriangle, trend: "", up: false },
  ];

  return (
    <DashboardLayout title="Executive Autopilot" subtitle="Decision Command Center · Live data scoped to your organization">
      <div className="space-y-0">
        {/* Top KPI Strip */}
        <div className="bg-card border-b px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-bold text-sm">Executive Autopilot</span>
            <Badge variant="outline" className="text-[10px]">LIVE</Badge>
          </div>
          <div className="flex items-center gap-6">
            {kpis.map((k) => (
              <div key={k.label} className="flex items-center gap-2 text-sm">
                <k.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{k.label}:</span>
                <span className="font-bold">{k.value}</span>
                {k.trend && (
                  <span className={`text-xs flex items-center ${k.up ? "text-emerald-500" : "text-destructive"}`}>
                    {k.up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                    {k.trend}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-[calc(100vh-180px)]">
          {/* Main Feed */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "critical", "opportunity", "decision", "insight", "risk"] as const).map((f) => (
                <Button
                  key={f}
                  variant={activeFilter === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveFilter(f)}
                  className="text-xs"
                >
                  {f === "all" ? "All" : typeConfig[f].label}
                  {f !== "all" && (
                    <Badge variant="secondary" className="ml-1 text-[10px]">
                      {feedCards.filter((c) => c.type === f).length}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>

            {/* Feed Cards */}
            {filteredCards.map((card) => {
              const cfg = typeConfig[card.type];
              const Icon = cfg.icon;
              return (
                <Card
                  key={card.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${selectedCard?.id === card.id ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedCard(card)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                        <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{cfg.label}</Badge>
                        <Badge variant="secondary" className="text-[10px]">Score: {card.impactScore}</Badge>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(card.timestamp, "HH:mm · MMM d")}</span>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{card.headline}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{card.context}</p>
                    <p className="text-xs font-medium text-primary mb-2">{card.impact}</p>
                    {card.actionTaken && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1 mb-1">
                        <CheckCircle className="w-3 h-3" /> {card.actionTaken}
                      </p>
                    )}
                    {card.recommendedAction && (
                      <p className="text-xs text-amber-600 flex items-center gap-1 mb-2">
                        <Clock className="w-3 h-3" /> {card.recommendedAction}
                      </p>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      {card.actions.map((a) => (
                        <Button key={a} variant="ghost" size="sm" className="text-xs h-7" onClick={(e) => e.stopPropagation()}>
                          {a}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredCards.length === 0 && (
              <div className="text-center text-muted-foreground py-20">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No live signals in this category for your organization yet.</p>
                <p className="text-xs mt-1 opacity-70">Autopilot generates signals from your dispatches, invoices, GTM activity and predictions.</p>
              </div>
            )}
          </div>

          {/* Right Context Panel */}
          <div className="w-80 border-l bg-muted/30 p-4 overflow-y-auto hidden lg:block">
            {selectedCard ? (
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Signal Details</h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-card border">
                    <p className="text-muted-foreground mb-1">Source</p>
                    <p className="font-medium capitalize">{selectedCard.source.replace(/_/g, " ")}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border">
                    <p className="text-muted-foreground mb-1">Impact Score</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${selectedCard.impactScore}%` }} />
                      </div>
                      <span className="font-bold">{selectedCard.impactScore}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-card border">
                    <p className="text-muted-foreground mb-1">Impact</p>
                    <p className="font-medium">{selectedCard.impact}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border">
                    <p className="text-muted-foreground mb-1">Full Context</p>
                    <p>{selectedCard.context}</p>
                  </div>
                  {selectedCard.actionTaken && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-muted-foreground mb-1">Actions Taken</p>
                      <p className="text-emerald-700">{selectedCard.actionTaken}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" /> AI Insight Summary
                </h3>
                <Card>
                  <CardContent className="p-3 text-xs space-y-2">
                    {feedCards.length === 0 ? (
                      <p className="text-muted-foreground">No live signals detected for your organization yet. Insights will appear as Autopilot ingests dispatches, invoices and GTM signals.</p>
                    ) : (
                      <>
                        <p>Tracking <span className="font-semibold text-primary">{feedCards.length}</span> live signal{feedCards.length === 1 ? "" : "s"} for your organization.</p>
                        <p>Highest impact: <span className="font-semibold text-destructive">{feedCards[0]?.headline}</span> (score {feedCards[0]?.impactScore}).</p>
                        <p>Critical: <span className="font-semibold">{feedCards.filter(c => c.type === "critical").length}</span> · Opportunities: <span className="font-semibold">{feedCards.filter(c => c.type === "opportunity").length}</span> · Decisions: <span className="font-semibold">{feedCards.filter(c => c.type === "decision").length}</span></p>
                      </>
                    )}
                  </CardContent>
                </Card>
                <div className="text-xs text-muted-foreground">
                  <p>Click any card to see detailed signal analysis</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
