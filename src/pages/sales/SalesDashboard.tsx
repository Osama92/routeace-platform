import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useSalesOS } from "@/hooks/useSalesOS";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import {
  Users, Target, DollarSign, TrendingUp, BarChart3, UserPlus,
  Building2, Briefcase, FileText, Activity, MapPin, Clock,
  Plus, ArrowUpRight, Zap, Download,
} from "lucide-react";
import { Link } from "react-router-dom";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const SalesDashboard = () => {
  const {
    leads, accounts, opportunities, quotes, activities,
    pipelineData, totalPipeline, weightedPipeline, wonRevenue, loading,
  } = useSalesOS();

  const openLeads = leads.filter(l => l.stage === "new" || l.stage === "contacted").length;
  const qualifiedLeads = leads.filter(l => l.stage === "qualified").length;
  const activeOpps = opportunities.filter(o => o.stage !== "won" && o.stage !== "lost").length;
  const pendingQuotes = quotes.filter(q => q.status === "draft" || q.status === "sent").length;

  const kpis = [
    { label: "Open Leads", value: openLeads, icon: UserPlus, color: "text-blue-600" },
    { label: "Active Accounts", value: accounts.filter(a => a.is_active).length, icon: Building2, color: "text-emerald-600" },
    { label: "Pipeline Value", value: `₦${(totalPipeline / 1e6).toFixed(1)}M`, icon: Target, color: "text-violet-600" },
    { label: "Weighted Forecast", value: `₦${(weightedPipeline / 1e6).toFixed(1)}M`, icon: TrendingUp, color: "text-amber-600" },
    { label: "Won Revenue", value: `₦${(wonRevenue / 1e6).toFixed(1)}M`, icon: DollarSign, color: "text-emerald-600" },
    { label: "Active Deals", value: activeOpps, icon: Briefcase, color: "text-rose-600" },
  ];

  const salesExportData = opportunities.map(o => ({
    opportunity: o.opportunity_name,
    account: o.account?.account_name || "-",
    stage: o.stage,
    amount: o.amount || 0,
    probability: o.probability || 0,
    weighted: ((o.amount || 0) * (o.probability || 0)) / 100,
    close_date: o.expected_close_date || "-",
    competitor: o.competitor || "-",
  }));

  return (
    <DashboardLayout title="Sales OS" subtitle="Revenue execution engine for trade-driven businesses">
      <div className="space-y-6">
        {/* Header with Export */}
        <div className="flex items-center justify-end">
          <ExportDropdown options={{
            title: "Sales Pipeline Report",
            columns: [
              { key: "opportunity", label: "Opportunity" },
              { key: "account", label: "Account" },
              { key: "stage", label: "Stage" },
              { key: "amount", label: "Amount (₦)", format: (v) => `₦${Number(v).toLocaleString()}` },
              { key: "probability", label: "Probability %", format: (v) => `${v}%` },
              { key: "weighted", label: "Weighted (₦)", format: (v) => `₦${Number(v).toLocaleString()}` },
              { key: "close_date", label: "Expected Close" },
              { key: "competitor", label: "Competitor" },
            ],
            data: salesExportData,
            filename: "sales-pipeline-report",
          }} />
        </div>
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {kpis.map((k, i) => (
            <motion.div key={k.label} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <k.icon className={`w-5 h-5 ${k.color} mb-2`} />
                  <p className="text-2xl font-bold tracking-tight">{k.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Pipeline Visual */}
        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Pipeline Overview
                </CardTitle>
                <Link to="/sales/pipeline">
                  <Button variant="ghost" size="sm">View Full Pipeline <ArrowUpRight className="w-3 h-3 ml-1" /></Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 h-8 rounded-lg overflow-hidden mb-4">
                {pipelineData.filter(p => p.stage !== "lost").map((p) => {
                  const width = totalPipeline > 0 ? Math.max(2, (p.value / totalPipeline) * 100) : 12.5;
                  const colors: Record<string, string> = {
                    lead: "bg-blue-400", qualified: "bg-indigo-400", discovery: "bg-violet-400",
                    proposal: "bg-purple-400", negotiation: "bg-pink-400", approval: "bg-rose-400", won: "bg-emerald-500",
                  };
                  return (
                    <div key={p.stage} className={`${colors[p.stage] || "bg-muted"} relative group cursor-pointer transition-all hover:opacity-80`} style={{ width: `${width}%` }}>
                      <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        {p.count}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="grid grid-cols-4 md:grid-cols-7 gap-2 text-center">
                {pipelineData.filter(p => p.stage !== "lost").map((p) => (
                  <div key={p.stage}>
                    <p className="text-xs font-medium">{p.label}</p>
                    <p className="text-sm font-bold">{p.count}</p>
                    <p className="text-[10px] text-muted-foreground">₦{(p.value / 1000).toFixed(0)}K</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions + Recent */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4" /> Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: "New Lead", href: "/sales/leads", icon: UserPlus },
                { label: "New Account", href: "/sales/accounts", icon: Building2 },
                { label: "New Opportunity", href: "/sales/opportunities", icon: Target },
                { label: "Create Quote", href: "/sales/quotes", icon: FileText },
                { label: "Log Activity", href: "/sales/activities", icon: Activity },
                { label: "View Forecast", href: "/sales/forecast", icon: TrendingUp },
              ].map(a => (
                <Link key={a.label} to={a.href}>
                  <Button variant="outline" className="w-full justify-start gap-2 h-10">
                    <a.icon className="w-4 h-4" /> {a.label}
                  </Button>
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Recent Activities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>No activities logged yet</p>
                  <p className="text-xs mt-1">Log calls, meetings, and visits to track engagement</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[260px] overflow-y-auto">
                  {activities.slice(0, 8).map(a => (
                    <div key={a.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        a.activity_type === "call" ? "bg-blue-100 text-blue-700" :
                        a.activity_type === "meeting" ? "bg-violet-100 text-violet-700" :
                        a.activity_type === "visit" ? "bg-emerald-100 text-emerald-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {a.activity_type?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.subject}</p>
                        <p className="text-xs text-muted-foreground">{a.outcome || a.activity_type} • {a.activity_date ? new Date(a.activity_date).toLocaleDateString() : ""}</p>
                      </div>
                      {a.is_completed && <Badge variant="outline" className="text-[10px] shrink-0">Done</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation to sub-pages */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Leads", count: leads.length, href: "/sales/leads", icon: UserPlus, desc: "Manage lead pipeline" },
            { label: "Accounts", count: accounts.length, href: "/sales/accounts", icon: Building2, desc: "Customer accounts" },
            { label: "Pipeline", count: activeOpps, href: "/sales/pipeline", icon: Target, desc: "Deal pipeline" },
            { label: "Quotes", count: quotes.length, href: "/sales/quotes", icon: FileText, desc: "Sales quotations" },
          ].map((nav, i) => (
            <Link key={nav.label} to={nav.href}>
              <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: 0.4 + i * 0.05 }}>
                <Card className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <nav.icon className="w-5 h-5 text-primary" />
                      <Badge variant="secondary">{nav.count}</Badge>
                    </div>
                    <p className="font-semibold text-sm">{nav.label}</p>
                    <p className="text-xs text-muted-foreground">{nav.desc}</p>
                    <ArrowUpRight className="w-4 h-4 mt-2 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </motion.div>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalesDashboard;
