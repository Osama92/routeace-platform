import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ChevronDown,
  History, Target, Zap, Clock, MapPin, Truck, RefreshCw, ThumbsUp, ThumbsDown,
  Info, Shield, Inbox,
} from "lucide-react";

interface LearningInsight {
  id: string;
  category: "eta" | "grouping" | "confidence" | "margin" | "pattern";
  title: string;
  description: string;
  impact: "high" | "medium" | "low";
  confidence: number;
  dataPoints: number;
  suggestedAction?: string;
  approved?: boolean;
  metrics?: { before: number; after: number; improvement: number };
}

interface RoutePattern {
  patternId: string;
  region: string;
  avgDelayHours: number;
  confidenceScore: number;
  frequency: number;
  trend: "improving" | "stable" | "degrading";
  riskFactors: string[];
}

interface SelfLearningInsightsProps {
  routeId?: string;
  region?: string;
  compact?: boolean;
}

const corridorKey = (addr: string) => {
  if (!addr) return "Unknown";
  // Take first city-ish token
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 2] || parts[0] || "Unknown";
};

const SelfLearningInsights = ({ routeId, region, compact = false }: SelfLearningInsightsProps) => {
  const { toast } = useToast();
  const { organizationId } = useAuth();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [autoApply, setAutoApply] = useState(false);
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [approved, setApproved] = useState<Set<string>>(new Set());

  const ninetyDaysAgo = useMemo(
    () => new Date(Date.now() - 90 * 86400000).toISOString(),
    []
  );

  const dispatchQuery = useQuery({
    queryKey: ["sli-dispatches", organizationId, ninetyDaysAgo],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select("id, organization_id, pickup_address, delivery_address, total_drops, eta_promised, actual_arrival_time, eta_met, sla_status, status, distance_km, created_at")
        .eq("organization_id", organizationId!)
        .gte("created_at", ninetyDaysAgo)
        .limit(1000);
      if (error) throw error;
      // Tenant guard: drop any row that doesn't match
      return (data || []).filter((r: any) => r.organization_id === organizationId);
    },
  });

  const riskQuery = useQuery({
    queryKey: ["sli-risks", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_risk_register")
        .select("id, route_name, risk_level, risk_description, status, incident_count")
        .eq("status", "open")
        .limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const loading = dispatchQuery.isLoading || riskQuery.isLoading;
  const error = dispatchQuery.error || riskQuery.error;

  const { insights, patterns, lastUpdated } = useMemo(() => {
    const dispatches = dispatchQuery.data || [];
    const risks = riskQuery.data || [];
    const built: LearningInsight[] = [];

    // Group by corridor (pickup→delivery)
    const corridorMap = new Map<string, { count: number; lateMin: number; etaMet: number; bigDrops: number; bigDropsLate: number }>();
    dispatches.forEach((d: any) => {
      const key = `${corridorKey(d.pickup_address)} → ${corridorKey(d.delivery_address)}`;
      const entry = corridorMap.get(key) || { count: 0, lateMin: 0, etaMet: 0, bigDrops: 0, bigDropsLate: 0 };
      entry.count += 1;
      if (d.eta_met === true) entry.etaMet += 1;
      if (d.eta_promised && d.actual_arrival_time) {
        const delta = (new Date(d.actual_arrival_time).getTime() - new Date(d.eta_promised).getTime()) / 60000;
        if (delta > 0) entry.lateMin += delta;
      }
      if ((d.total_drops || 0) > 5) {
        entry.bigDrops += 1;
        if (d.eta_met === false) entry.bigDropsLate += 1;
      }
      corridorMap.set(key, entry);
    });

    // ETA insights from worst corridors (≥5 dispatches)
    const ranked = [...corridorMap.entries()]
      .filter(([, v]) => v.count >= 5)
      .map(([k, v]) => ({
        key: k,
        ...v,
        otd: v.count > 0 ? (v.etaMet / v.count) * 100 : 0,
        avgLateMin: v.count > 0 ? v.lateMin / v.count : 0,
      }))
      .sort((a, b) => b.avgLateMin - a.avgLateMin);

    ranked.slice(0, 2).forEach((r, i) => {
      if (r.avgLateMin <= 5) return;
      built.push({
        id: `eta-${i}-${r.key}`,
        category: "eta",
        title: `ETA Adjustment for ${r.key}`,
        description: `Average late arrival ${(r.avgLateMin / 60).toFixed(1)}h across ${r.count} dispatches. On-time ${r.otd.toFixed(0)}%.`,
        impact: r.avgLateMin > 90 ? "high" : r.avgLateMin > 30 ? "medium" : "low",
        confidence: Math.min(95, 50 + r.count),
        dataPoints: r.count,
        suggestedAction: `Add ${Math.ceil(r.avgLateMin / 30) * 0.5}h buffer to ETA on this corridor`,
      });
    });

    // Grouping insight - high-drop dispatches that breach
    const totalBigDrops = ranked.reduce((s, r) => s + r.bigDrops, 0);
    const totalBigDropsLate = ranked.reduce((s, r) => s + r.bigDropsLate, 0);
    if (totalBigDrops >= 5 && totalBigDropsLate / totalBigDrops > 0.3) {
      built.push({
        id: "grouping-bigdrops",
        category: "grouping",
        title: "Reduce Max Drops on High-Density Routes",
        description: `${totalBigDropsLate}/${totalBigDrops} dispatches with >5 drops missed ETA. Drop density is hurting OTD.`,
        impact: "medium",
        confidence: Math.min(90, 60 + totalBigDrops),
        dataPoints: totalBigDrops,
        suggestedAction: "Cap drops at 5 per dispatch on impacted corridors",
      });
    }

    // Pattern insight from risk register
    const highRisks = risks.filter((r: any) => r.risk_level === "high" || r.risk_level === "critical");
    if (highRisks.length > 0) {
      built.push({
        id: "pattern-risks",
        category: "pattern",
        title: `${highRisks.length} High-Risk Route(s) Open`,
        description: highRisks.slice(0, 3).map((r: any) => r.route_name).join(", "),
        impact: "high",
        confidence: 92,
        dataPoints: highRisks.reduce((s: number, r: any) => s + (r.incident_count || 1), 0),
        suggestedAction: "Apply mitigation plans before next dispatch on these routes",
      });
    }

    // Confidence calibration - if OTD across all is high but confidence average low (proxy)
    const totalCount = ranked.reduce((s, r) => s + r.count, 0);
    const totalOtd = totalCount > 0 ? ranked.reduce((s, r) => s + r.etaMet, 0) / totalCount * 100 : 0;
    if (totalCount >= 20 && totalOtd > 85) {
      built.push({
        id: "confidence-calibration",
        category: "confidence",
        title: "Confidence Bands Look Conservative",
        description: `Overall OTD is ${totalOtd.toFixed(0)}% across ${totalCount} dispatches - model can widen acceptance bands.`,
        impact: "low",
        confidence: 78,
        dataPoints: totalCount,
        suggestedAction: "Increase confidence band by +5% on medium-tier routes",
      });
    }

    // Patterns by corridor (top 3 most frequent)
    const patternsBuilt: RoutePattern[] = ranked
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map((r) => {
        const conf = Math.round(r.otd);
        return {
          patternId: r.key,
          region: r.key,
          avgDelayHours: Number((r.avgLateMin / 60).toFixed(1)),
          confidenceScore: conf,
          frequency: r.count,
          trend: conf >= 85 ? "improving" : conf >= 65 ? "stable" : "degrading",
          riskFactors: r.bigDropsLate > 0 ? ["High drop density", "ETA breach"] : conf < 70 ? ["Late arrivals"] : [],
        };
      });

    return { insights: built, patterns: patternsBuilt, lastUpdated: new Date() };
  }, [dispatchQuery.data, riskQuery.data]);

  const handleApproveInsight = async (insightId: string) => {
    setApproved(prev => new Set(prev).add(insightId));
    toast({ title: "Insight Approved", description: "Learning adjustment will be applied to future routes" });
    try {
      await supabase.from("audit_logs").insert({
        action: "learning_insight_approved",
        table_name: "route_learning",
        record_id: insightId,
        new_data: { approved: true, applied_at: new Date().toISOString() } as any,
      } as any);
    } catch (e) {
      console.error("audit log failed", e);
    }
  };

  const handleRejectInsight = (insightId: string) => {
    setRejected(prev => new Set(prev).add(insightId));
    toast({ title: "Insight Rejected", description: "This learning will not be applied" });
  };

  const handleRefresh = () => {
    dispatchQuery.refetch();
    riskQuery.refetch();
    toast({ title: "Insights Refreshed", description: "Pulled latest dispatch data" });
  };

  const visibleInsights = insights.filter(i => !rejected.has(i.id)).map(i => ({
    ...i,
    approved: approved.has(i.id),
  }));

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high": return "bg-destructive text-destructive-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-success text-success-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "eta": return Clock;
      case "grouping": return MapPin;
      case "confidence": return Shield;
      case "pattern": return TrendingUp;
      default: return Brain;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "improving": return <TrendingUp className="w-4 h-4 text-success" />;
      case "degrading": return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Target className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (compact) {
    return (
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            <span className="font-medium text-sm">AI Learning Insights</span>
          </div>
          <Badge variant="secondary">{visibleInsights.filter(i => !i.approved).length} pending</Badge>
        </div>
        {visibleInsights.slice(0, 2).map(insight => (
          <div key={insight.id} className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Zap className="w-3 h-3 text-primary" />
            <span className="truncate">{insight.title}</span>
          </div>
        ))}
        {visibleInsights.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground">No insights yet - more dispatches needed.</p>
        )}
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Self-Learning Intelligence
                <Badge variant="outline" className="text-xs">Live</Badge>
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {visibleInsights.filter(i => !i.approved).length} pending insights
                </Badge>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch id="auto-apply" checked={autoApply} onCheckedChange={setAutoApply} />
                <Label htmlFor="auto-apply" className="text-sm">Auto-apply low-impact suggestions</Label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
                <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                  <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            <Separator />

            {!organizationId && (
              <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 text-sm flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4" /> Sign in to a tenant to load live learning data.
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" /> Loading live dispatch history…
              </div>
            )}

            {!loading && error && (
              <div className="p-4 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Failed to load insights: {(error as Error).message}
              </div>
            )}

            {!loading && !error && organizationId && visibleInsights.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                <Inbox className="w-8 h-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No learning insights yet</p>
                <p className="text-xs text-muted-foreground">
                  Insights appear as dispatches accumulate (≥5 per corridor with ETA + actual arrival).
                </p>
              </div>
            )}

            {!loading && visibleInsights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <h4 className="font-medium">Active Learning Insights</h4>
                </div>
                <div className="space-y-3">
                  {visibleInsights.map(insight => {
                    const Icon = getCategoryIcon(insight.category);
                    return (
                      <div key={insight.id} className={`p-4 rounded-lg border ${insight.approved ? "bg-success/5 border-success/20" : "bg-muted/30"}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="p-2 rounded bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h5 className="font-medium text-sm">{insight.title}</h5>
                                <Badge className={`text-xs ${getImpactColor(insight.impact)}`}>{insight.impact} impact</Badge>
                                {insight.approved && (
                                  <Badge variant="default" className="text-xs gap-1">
                                    <CheckCircle className="w-3 h-3" />Applied
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Target className="w-3 h-3" />{insight.confidence}% confidence</span>
                                <span className="flex items-center gap-1"><History className="w-3 h-3" />{insight.dataPoints} data points</span>
                              </div>
                              {insight.suggestedAction && (
                                <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
                                  <span className="font-medium">Suggested:</span> {insight.suggestedAction}
                                </div>
                              )}
                            </div>
                          </div>
                          {!insight.approved && (
                            <div className="flex flex-col gap-1 shrink-0">
                              <Button size="sm" variant="default" onClick={() => handleApproveInsight(insight.id)}>
                                <ThumbsUp className="w-3 h-3 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRejectInsight(insight.id)}>
                                <ThumbsDown className="w-3 h-3 mr-1" />Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!loading && patterns.length > 0 && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    <h4 className="font-medium">Corridor Performance Patterns</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {patterns.map(pattern => (
                      <div key={pattern.patternId} className={`p-4 rounded-lg border ${
                        pattern.confidenceScore >= 80 ? "bg-success/5 border-success/20" :
                        pattern.confidenceScore >= 60 ? "bg-warning/5 border-warning/20" :
                        "bg-destructive/5 border-destructive/20"
                      }`}>
                        <div className="flex items-center justify-between mb-2 gap-2">
                          <h5 className="font-medium text-sm truncate">{pattern.region}</h5>
                          {getTrendIcon(pattern.trend)}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">OTD</span>
                            <span className="font-medium">{pattern.confidenceScore}%</span>
                          </div>
                          <Progress value={pattern.confidenceScore} className="h-1.5" />
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Avg Delay: {pattern.avgDelayHours}h</span>
                            <span>{pattern.frequency} routes</span>
                          </div>
                          {pattern.riskFactors.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {pattern.riskFactors.map((risk, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">{risk}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="p-3 bg-muted/30 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium mb-1">Tenant-Scoped Learning</p>
                <p>Insights derived strictly from your organization's dispatch and risk records (RLS-enforced). No cross-tenant data is mixed into the model.</p>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default SelfLearningInsights;
