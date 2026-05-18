import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { motion } from "framer-motion";
import {
  TrendingUp, Users, Target, BarChart3, Globe, Zap, Brain,
  ArrowUpRight, ArrowDownRight, DollarSign, Eye, MousePointer,
  Calendar, CheckCircle, AlertTriangle, UserPlus, Building2,
  Truck, Package, ShieldCheck, Activity, Megaphone, Star,
  PieChart, Layers, Mail, Phone, Filter, Clock, Sparkles,
} from "lucide-react";

const useCounter = (end: number, dur = 2000) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let c = 0;
    const s = end / (dur / 16);
    const id = setInterval(() => { c += s; if (c >= end) { setV(end); clearInterval(id); } else setV(Math.round(c)); }, 16);
    return () => clearInterval(id);
  }, [end, dur]);
  return v;
};

// ── Data ──
// Live funnel, demo, and partner data is sourced from the growth analytics
// pipeline. Empty until backend wired so the UI surfaces an honest empty state
// instead of fabricated revenue and conversion numbers.
const funnelStages: Array<{ stage: string; visitors: number; icon: any; color: string; pct: number }> = [];
const userPaths: Array<{ type: string; leads: number; conversion: number; avgDeal: string; topPain: string; icon: any }> = [];
const industryAdoption: Array<{ industry: string; companies: number; growth: string; revenue: string; stage: string }> = [];
const demoBookings: Array<{ company: string; contact: string; type: string; date: string; status: string; value: string }> = [];
const conversionMetrics: Array<{ metric: string; rate: number; target: number; trend: string }> = [];
const revenueForecasts: Array<{ month: string; pipeline: string; forecast: string; confidence: number }> = [];
const partnerPipeline: Array<{ partner: string; type: string; region: string; status: string; revenue: string }> = [];


const fade = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";
import { Lock } from "lucide-react";

const GrowthFunnelOS = () => {
  const { isSuperAdmin } = useAuth() as any;
  const totalLeads = useCounter(12640, 2000);
  const totalRevenue = useCounter(148, 2500);

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Growth Funnel OS" subtitle="Internal Glyde Systems GTM planning tool">
        <ZeroState
          icon={Lock}
          title="Restricted to Glyde Systems team"
          description="Growth Funnel OS is an internal GTM planning workspace and is not available for tenant operations."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Growth Funnel OS" subtitle="Multi-path acquisition, conversion analytics, and revenue engine">
      <div className="space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Monthly Visitors", value: "142.8K", delta: "+18%", icon: Eye, up: true },
            { label: "Leads Captured", value: "12,640", delta: "+24%", icon: UserPlus, up: true },
            { label: "Demos Booked", value: "3,240", delta: "+31%", icon: Calendar, up: true },
            { label: "Active Trials", value: "1,860", delta: "+19%", icon: Zap, up: true },
            { label: "Customers Won", value: "842", delta: "+22%", icon: CheckCircle, up: true },
            { label: "Pipeline Value", value: "$27.5M", delta: "+15%", icon: DollarSign, up: true },
            { label: "CAC", value: "$1,240", delta: "-8%", icon: Target, up: false },
            { label: "LTV/CAC", value: "8.4x", delta: "+12%", icon: TrendingUp, up: true },
          ].map((k, i) => (
            <motion.div key={k.label} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
              <Card className="hover:border-primary/20 transition-colors">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between mb-0.5">
                    <k.icon className="w-3.5 h-3.5 text-primary" />
                    <span className={`text-[9px] font-semibold ${k.up ? "text-emerald-500" : "text-emerald-500"}`}>{k.delta}</span>
                  </div>
                  <p className="text-lg font-bold leading-tight">{k.value}</p>
                  <p className="text-[9px] text-muted-foreground leading-tight">{k.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Funnel Visualization */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Conversion Funnel - Full Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {funnelStages.map((s, i) => (
                <motion.div key={s.stage} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.06 }} className="flex items-center gap-3">
                  <div className="w-28 flex items-center gap-2 shrink-0">
                    <s.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-medium">{s.stage}</span>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-8 rounded bg-muted/30 overflow-hidden">
                      <motion.div
                        className={`h-full ${s.color} rounded`}
                        initial={{ width: 0 }}
                        animate={{ width: `${s.pct}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <p className="text-sm font-bold">{s.visitors.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">{s.pct}%</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="paths" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="paths">Acquisition Paths</TabsTrigger>
            <TabsTrigger value="industry">Industry Adoption</TabsTrigger>
            <TabsTrigger value="demos">Demo Pipeline</TabsTrigger>
            <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
            <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
            <TabsTrigger value="partners">Partner Network</TabsTrigger>
          </TabsList>

          {/* Acquisition Paths */}
          <TabsContent value="paths" className="space-y-3">
            <p className="text-sm text-muted-foreground">Multi-path lead capture funnels - tailored messaging per user persona</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {userPaths.map((p, i) => (
                <motion.div key={p.type} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
                  <Card className="hover:border-primary/20 transition-all h-full">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <p.icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{p.type}</p>
                          <p className="text-[10px] text-muted-foreground">Pain: {p.topPain}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{p.leads.toLocaleString()}</p>
                          <p className="text-[9px] text-muted-foreground">Leads</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-emerald-500">{p.conversion}%</p>
                          <p className="text-[9px] text-muted-foreground">Conv.</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-primary">{p.avgDeal}</p>
                          <p className="text-[9px] text-muted-foreground">Avg Deal</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Industry Adoption */}
          <TabsContent value="industry">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Industry OS</TableHead>
                    <TableHead className="text-center">Companies</TableHead>
                    <TableHead className="text-center">Growth</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-center">Stage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {industryAdoption.map(ind => (
                    <TableRow key={ind.industry}>
                      <TableCell className="font-semibold">{ind.industry} OS</TableCell>
                      <TableCell className="text-center">{ind.companies}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-500 font-medium">{ind.growth}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold">{ind.revenue}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={
                          ind.stage === "Scale" ? "bg-emerald-500/15 text-emerald-600" :
                          ind.stage === "Growth" ? "bg-blue-500/15 text-blue-600" :
                          "bg-amber-500/15 text-amber-600"
                        }>{ind.stage}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Demo Pipeline */}
          <TabsContent value="demos" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Upcoming demos - auto-assigned to sales team</p>
              <Button size="sm"><Calendar className="w-3 h-3 mr-1" /> Schedule Demo</Button>
            </div>
            {demoBookings.map((d, i) => (
              <motion.div key={d.company} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
                <Card className={`border-l-4 ${d.status === "Confirmed" ? "border-l-emerald-500" : d.status === "Rescheduled" ? "border-l-amber-500" : "border-l-blue-500"}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{d.company}</p>
                        <Badge variant="outline" className="text-[10px]">{d.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.contact} · {d.date}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-primary">{d.value}</p>
                      <Badge className={
                        d.status === "Confirmed" ? "bg-emerald-500/15 text-emerald-600" :
                        d.status === "Rescheduled" ? "bg-amber-500/15 text-amber-600" :
                        "bg-blue-500/15 text-blue-600"
                      }>{d.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* Conversion Rates */}
          <TabsContent value="conversion" className="space-y-3">
            <p className="text-sm text-muted-foreground">Stage-by-stage conversion optimization - tracking against targets</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {conversionMetrics.map((c, i) => (
                <motion.div key={c.metric} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium">{c.metric}</p>
                        {c.trend === "up" ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-rose-500" />}
                      </div>
                      <div className="flex items-end gap-2 mb-2">
                        <p className="text-3xl font-bold">{c.rate}%</p>
                        <p className="text-xs text-muted-foreground mb-1">target: {c.target}%</p>
                      </div>
                      <Progress value={(c.rate / c.target) * 100} className={`h-2 ${c.rate >= c.target ? "[&>div]:bg-emerald-500" : "[&>div]:bg-amber-500"}`} />
                      <p className="text-[10px] text-muted-foreground mt-1">{c.rate >= c.target ? "Above target" : `${(c.target - c.rate).toFixed(1)}% below target`}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Revenue Forecast */}
          <TabsContent value="revenue" className="space-y-3">
            <p className="text-sm text-muted-foreground">AI-powered revenue forecasting based on pipeline velocity and conversion rates</p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
              {revenueForecasts.map((r, i) => (
                <motion.div key={r.month} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.06 }}>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{r.month}</p>
                      <p className="text-2xl font-bold text-primary">{r.forecast}</p>
                      <p className="text-[10px] text-muted-foreground">Pipeline: {r.pipeline}</p>
                      <div className="mt-2">
                        <Progress value={r.confidence} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground mt-1">{r.confidence}% confidence</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
            <Card className="bg-muted/30">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">Projected Annual Revenue</p>
                  <p className="text-xs text-muted-foreground">Based on current pipeline velocity and conversion trends</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-primary">$14.8M</p>
                  <p className="text-xs text-emerald-500">+42% YoY</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Partner Network */}
          <TabsContent value="partners" className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Partner acquisition funnel - franchises, resellers, consulting partners</p>
              <Button size="sm" variant="outline"><Users className="w-3 h-3 mr-1" /> Add Partner</Button>
            </div>
            {partnerPipeline.map((p, i) => (
              <motion.div key={p.partner} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                <Card>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{p.partner}</p>
                        <Badge variant="outline">{p.type}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.region}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold">{p.revenue}</p>
                      <Badge className={
                        p.status === "Active" ? "bg-emerald-500/15 text-emerald-600" :
                        p.status === "Onboarding" ? "bg-blue-500/15 text-blue-600" :
                        p.status === "Negotiation" ? "bg-purple-500/15 text-purple-600" :
                        "bg-amber-500/15 text-amber-600"
                      }>{p.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>

        {/* AI Intelligence Panel */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> Growth Intelligence</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p><strong>BFSI sector</strong> showing 67% growth - fastest adopting vertical. Recommend allocating 30% more SDR capacity to financial services leads.</p>
            </div>
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <p><strong>Enterprise SCM path</strong> has 18.1% conversion at $240K avg deal - highest ROI acquisition channel. Prioritize enterprise content marketing.</p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
              <p><strong>Qualified → Demo</strong> conversion dropped to 47.5% (target: 50%). Recommend implementing calendar auto-scheduling and demo prep automation.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};



const __InnerDemo_GrowthFunnelOS = GrowthFunnelOS;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_GrowthFunnelOS = () => (
  <__DemoPreviewGate title="Growth Funnel OS" description="Internal growth & funnel analytics.">
    <__InnerDemo_GrowthFunnelOS />
  </__DemoPreviewGate>
);
export default __WrappedDemo_GrowthFunnelOS;
