import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, Clock, TrendingUp, Brain, Eye, RefreshCw, Activity } from "lucide-react";

interface RiskScore {
  id: string;
  entity_type: string;
  entity_id: string;
  risk_score: number;
  risk_level: string;
  risk_factors: any;
  explainability_summary: string;
  created_at: string;
}

interface FraudFlag {
  id: string;
  entity_type: string;
  entity_id: string;
  fraud_type: string;
  confidence_score: number;
  explanation: string;
  flag_status: string;
  created_at: string;
}

interface TreasuryStress {
  id: string;
  stress_score: number;
  liquidity_ratio: number;
  runway_days: number;
  current_ratio: number;
  ar_pressure: number;
  ap_pressure: number;
  factors: any;
  created_at: string;
}

const riskColor = (level: string) => {
  switch (level) {
    case "low": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "medium": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "high": return "bg-orange-500/10 text-orange-700 border-orange-500/20";
    case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const GovernanceIntelligence = () => {
  const { toast } = useToast();
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [stressData, setStressData] = useState<TreasuryStress | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [risksRes, fraudRes, stressRes] = await Promise.all([
        supabase.from("approval_risk_scores").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("fraud_flags").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("treasury_stress_index").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setRiskScores((risksRes.data as any[]) || []);
      setFraudFlags((fraudRes.data as any[]) || []);
      setStressData(stressRes.data as TreasuryStress | null);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const runTreasuryStress = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("governance-ai", {
        body: { action: "compute_treasury_stress" },
      });
      if (error) throw error;
      toast({ title: "Treasury Stress Computed", description: `Score: ${data.stress_score}/100 - ${data.stress_level}` });
      fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const avgRisk = riskScores.length > 0
    ? Math.round(riskScores.reduce((s, r) => s + r.risk_score, 0) / riskScores.length)
    : 0;

  const activeFraud = fraudFlags.filter(f => f.flag_status === "active" || f.flag_status === "escalated").length;
  const escalated = fraudFlags.filter(f => f.flag_status === "escalated").length;

  return (
    <DashboardLayout title="Governance Intelligence" subtitle="AI-powered approval risk scoring, fraud detection & treasury stress monitoring">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Governance Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered approval risk scoring, fraud detection & treasury stress monitoring</p>
          </div>
          <Button onClick={runTreasuryStress} disabled={loading} variant="outline" className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Recompute Treasury
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Shield className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Risk Score</p>
                  <p className="text-2xl font-bold">{avgRisk}<span className="text-sm text-muted-foreground">/100</span></p>
                </div>
              </div>
              <Progress value={avgRisk} className="mt-3" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Fraud Flags</p>
                  <p className="text-2xl font-bold">{activeFraud}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{escalated} escalated</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Activity className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Treasury Stress</p>
                  <p className="text-2xl font-bold">{stressData?.stress_score ?? "-"}<span className="text-sm text-muted-foreground">/100</span></p>
                </div>
              </div>
              <Progress value={stressData?.stress_score || 0} className="mt-3" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-muted-foreground">Cash Runway</p>
                  <p className="text-2xl font-bold">{stressData?.runway_days ?? "-"}<span className="text-sm text-muted-foreground"> days</span></p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Liquidity ratio: {stressData?.liquidity_ratio ?? "-"}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="risk" className="w-full">
          <TabsList>
            <TabsTrigger value="risk">Risk Scores</TabsTrigger>
            <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
            <TabsTrigger value="treasury">Treasury Stress</TabsTrigger>
          </TabsList>

          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle>Approval Risk Scores</CardTitle>
                <CardDescription>AI-generated risk assessment for every approval request</CardDescription>
              </CardHeader>
              <CardContent>
                {riskScores.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No risk scores recorded yet. Scores are generated when approvals are submitted.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Explanation</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskScores.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.entity_type}/{r.entity_id.slice(0, 8)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{r.risk_score}</span>
                              <Progress value={r.risk_score} className="w-16 h-2" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={riskColor(r.risk_level)}>{r.risk_level}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{r.explainability_summary}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fraud">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" /> Fraud Flags</CardTitle>
                <CardDescription>Detected fraud patterns across all approval workflows</CardDescription>
              </CardHeader>
              <CardContent>
                {fraudFlags.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No fraud flags detected. The engine monitors all approval submissions.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Entity</TableHead>
                        <TableHead>Fraud Type</TableHead>
                        <TableHead>Confidence</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Explanation</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fraudFlags.map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.entity_type}/{f.entity_id.slice(0, 8)}</TableCell>
                          <TableCell><Badge variant="outline">{f.fraud_type.replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell>
                            <span className={`font-bold ${f.confidence_score >= 75 ? "text-destructive" : f.confidence_score >= 40 ? "text-amber-600" : ""}`}>
                              {f.confidence_score}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={f.flag_status === "escalated" ? "destructive" : "outline"}>
                              {f.flag_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate text-sm">{f.explanation}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(f.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treasury">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Treasury Stress Index</CardTitle>
                <CardDescription>Real-time treasury health and dynamic approval matrix</CardDescription>
              </CardHeader>
              <CardContent>
                {!stressData ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No treasury stress data. Click "Recompute Treasury" to generate.</p>
                    <Button onClick={runTreasuryStress} disabled={loading}>Compute Now</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Stress Indicators</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-muted-foreground">Stress Score</span><span className="font-bold">{stressData.stress_score}/100</span></div>
                        <Progress value={stressData.stress_score} />
                        <div className="flex justify-between"><span className="text-muted-foreground">Current Ratio</span><span className="font-bold">{stressData.current_ratio}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Liquidity Ratio</span><span className="font-bold">{stressData.liquidity_ratio}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Runway</span><span className="font-bold">{stressData.runway_days} days</span></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Pressure Points</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between"><span className="text-muted-foreground">AR Outstanding</span><span className="font-bold">₦{(stressData.ar_pressure || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">AP Outstanding</span><span className="font-bold">₦{(stressData.ap_pressure || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-lg">Dynamic Approval Rules</h3>
                      {stressData.stress_score > 60 ? (
                        <div className="space-y-2">
                          <Badge variant="destructive">⚠ Elevated Stress Mode Active</Badge>
                          <ul className="text-sm space-y-1 text-muted-foreground">
                            <li>• Auto-approval threshold lowered</li>
                            <li>• Extra approval level required</li>
                            <li>• High-risk vendors restricted</li>
                            {stressData.stress_score > 80 && <li>• Treasury co-signature required</li>}
                          </ul>
                        </div>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">
                          ✓ Normal Approval Mode
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default GovernanceIntelligence;
