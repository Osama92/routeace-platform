import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Shield, Users, FileText, AlertTriangle, Award, Globe, TrendingUp,
  RefreshCw, CheckCircle, XCircle, BarChart3, Scale, Fingerprint,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useCommerceIdentity } from "@/hooks/useCommerceIdentity";
import { supabase } from "@/integrations/supabase/client";

const GRADE_COLORS: Record<string, string> = {
  AAA: "#10b981", AA: "#34d399", A: "#6ee7b7",
  BBB: "#fbbf24", BB: "#f59e0b", B: "#f97316",
  C: "#ef4444", unrated: "#94a3b8",
};

const ENTITY_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

export default function CommerceIdentityTrust() {
  const { loading, getOverview, computeScores, detectFraud, getAnalytics } = useCommerceIdentity();
  const [overview, setOverview] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [fraudFlags, setFraudFlags] = useState<any>(null);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [ov, an] = await Promise.all([getOverview(), getAnalytics()]);
    if (ov) setOverview(ov);
    if (an) setAnalytics(an);

    const { data: d } = await supabase
      .from("trade_disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (d) setDisputes(d);

    const { data: c } = await supabase
      .from("trade_contracts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (c) setContracts(c);
  };

  const handleRefreshScores = async () => {
    await computeScores();
    loadData();
  };

  const handleFraudScan = async () => {
    const result = await detectFraud();
    if (result) setFraudFlags(result);
  };

  const gradeData = overview?.grade_distribution
    ? Object.entries(overview.grade_distribution).map(([grade, count]) => ({ name: grade, value: count as number }))
    : [];

  const entityData = overview?.entity_distribution
    ? Object.entries(overview.entity_distribution).map(([type, count]) => ({ name: type, value: count as number }))
    : [];

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Fingerprint className="h-8 w-8 text-primary" />
              Commerce Identity & Trust Network
            </h1>
            <p className="text-muted-foreground mt-1">Continental trust infrastructure - verified digital identities for African trade</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleFraudScan} disabled={loading}>
              <AlertTriangle className="h-4 w-4 mr-2" /> Fraud Scan
            </Button>
            <Button onClick={handleRefreshScores} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh Scores
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Total Identities", value: overview?.total_identities || 0, icon: Users, color: "text-primary" },
            { label: "Verified", value: overview?.verified_count || 0, icon: CheckCircle, color: "text-green-500" },
            { label: "Avg Trust Score", value: overview?.avg_trust_score || 0, icon: Shield, color: "text-blue-500" },
            { label: "Active Contracts", value: overview?.active_contracts || 0, icon: FileText, color: "text-amber-500" },
            { label: "Open Disputes", value: overview?.open_disputes || 0, icon: AlertTriangle, color: "text-red-500" },
            { label: "Trust Badges", value: overview?.total_badges || 0, icon: Award, color: "text-purple-500" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center justify-between mb-1">
                    <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                    <span className="text-2xl font-bold">{kpi.value}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="overview">Trust Overview</TabsTrigger>
            <TabsTrigger value="identities">Identities</TabsTrigger>
            <TabsTrigger value="disputes">Disputes</TabsTrigger>
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="fraud">Fraud Detection</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Trust Grade Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Trust Grade Distribution</CardTitle></CardHeader>
                <CardContent>
                  {gradeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={gradeData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {gradeData.map((entry, i) => (
                            <Cell key={i} fill={GRADE_COLORS[entry.name] || "#94a3b8"} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No identity data yet. Create commerce identities to see trust grades.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Entity Type Distribution */}
              <Card>
                <CardHeader><CardTitle className="text-sm">Entity Type Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {entityData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={entityData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={11} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      No entities registered yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Trust Score Trend */}
              <Card className="lg:col-span-2">
                <CardHeader><CardTitle className="text-sm">Trust Score Trend (6 Months)</CardTitle></CardHeader>
                <CardContent>
                  {analytics?.trend?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={analytics.trend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={11} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="avg_score" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Avg Trust Score" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Trust score trend will appear as identities are created over time.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Identities Tab */}
          <TabsContent value="identities" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Top Verified Entities</CardTitle></CardHeader>
              <CardContent>
                {(overview?.top_entities || []).length > 0 ? (
                  <div className="space-y-3">
                    {overview.top_entities.map((entity: any) => (
                      <div key={entity.rcid} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${entity.trust_grade === "AAA" || entity.trust_grade === "AA" ? "bg-green-100 text-green-700" : entity.trust_grade === "A" || entity.trust_grade === "BBB" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                            {entity.trust_grade || "?"}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{entity.business_name}</p>
                            <p className="text-xs text-muted-foreground">{entity.rcid} · {entity.entity_type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold">{entity.trust_score}/100</p>
                            <Progress value={entity.trust_score} className="w-20 h-1.5" />
                          </div>
                          {entity.verification_level === "verified" && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" /> Verified
                            </Badge>
                          )}
                          {(entity.badges || []).length > 0 && (
                            <div className="flex gap-1">
                              {entity.badges.slice(0, 2).map((b: string) => (
                                <Badge key={b} variant="outline" className="text-xs">{b}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Fingerprint className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No commerce identities registered yet.</p>
                    <p className="text-sm mt-1">Identities are created when businesses join the RouteAce network.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Trade Disputes</CardTitle></CardHeader>
              <CardContent>
                {disputes.length > 0 ? (
                  <div className="space-y-3">
                    {disputes.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-medium text-sm">{d.dispute_type}</p>
                          <p className="text-xs text-muted-foreground">{d.description?.slice(0, 80)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={d.status === "open" ? "destructive" : d.status === "resolved" ? "default" : "secondary"}>
                            {d.status}
                          </Badge>
                          {d.amount_in_dispute > 0 && (
                            <span className="text-sm font-medium">₦{d.amount_in_dispute.toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Scale className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No trade disputes recorded.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Digital Trade Contracts</CardTitle></CardHeader>
              <CardContent>
                {contracts.length > 0 ? (
                  <div className="space-y-3">
                    {contracts.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="font-medium text-sm">{c.title}</p>
                          <p className="text-xs text-muted-foreground">{c.contract_type} · {c.currency} {(c.total_value || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={c.status === "active" ? "default" : c.status === "draft" ? "secondary" : "outline"}>
                            {c.status}
                          </Badge>
                          {c.signed_by_a_at && c.signed_by_b_at && (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No trade contracts yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fraud Detection Tab */}
          <TabsContent value="fraud" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Fraud Detection Results</CardTitle>
                  <Button size="sm" variant="outline" onClick={handleFraudScan} disabled={loading}>
                    <AlertTriangle className="h-4 w-4 mr-1" /> Run Scan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {fraudFlags?.fraud_flags?.length > 0 ? (
                  <div className="space-y-3">
                    {fraudFlags.fraud_flags.map((flag: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${flag.severity === "critical" ? "text-red-500" : "text-amber-500"}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{flag.type.replace(/_/g, " ").toUpperCase()}</p>
                            <Badge variant={flag.severity === "critical" ? "destructive" : "secondary"}>{flag.severity}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{flag.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : fraudFlags ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>No fraud signals detected. Network integrity is strong.</p>
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Click "Run Scan" to detect identity fraud patterns.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benchmarks Tab */}
          <TabsContent value="benchmarks" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Regional Trust Benchmarks</CardTitle></CardHeader>
                <CardContent>
                  {analytics?.regional_benchmarks && Object.keys(analytics.regional_benchmarks).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(analytics.regional_benchmarks).map(([country, score]) => (
                        <div key={country} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={score as number} className="w-32 h-2" />
                            <span className="text-sm font-bold w-10 text-right">{score as number}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-muted-foreground">
                      <Globe className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>Regional benchmarks will populate as the network grows across countries.</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-sm">Network Performance Metrics</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Avg Delivery Completion</span>
                        <span className="font-semibold">{analytics?.avg_delivery_completion || 0}%</span>
                      </div>
                      <Progress value={analytics?.avg_delivery_completion || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Avg Payment Reliability</span>
                        <span className="font-semibold">{analytics?.avg_payment_reliability || 0}%</span>
                      </div>
                      <Progress value={analytics?.avg_payment_reliability || 0} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Total Entities</span>
                        <span className="font-semibold">{analytics?.total_entities || 0}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
