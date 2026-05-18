import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, Eye, AlertTriangle, CheckCircle2, TrendingUp,
  Globe, Fingerprint, KeyRound, Database, Activity, Clock, Users,
  Zap, ArrowUpRight, Shield, Ban, FileCheck, DollarSign, Scale,
  BarChart3, AlertOctagon, Search, Landmark
} from "lucide-react";

const useCounter = (target: number, d = 1600) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = 0; const step = target / (d / 16);
    const id = setInterval(() => { s += step; if (s >= target) { setV(target); clearInterval(id); } else setV(Math.floor(s)); }, 16);
    return () => clearInterval(id);
  }, [target, d]);
  return v;
};

const PulseDot = ({ color = "hsl(var(--success))" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

// === ESCROW DATA ===
const escrowTransactions = [
  { id: "ESC-001", buyer: "Global Foods UK", seller: "Dangote Flour Mills", amount: "$248,000", status: "goods_shipped", phase: "In Transit", progress: 60 },
  { id: "ESC-002", buyer: "Metro AG (Germany)", seller: "Olam Nigeria", amount: "$1,420,000", status: "delivery_confirmed", phase: "Awaiting Release", progress: 90 },
  { id: "ESC-003", buyer: "Carrefour UAE", seller: "TGI Foods", amount: "$87,500", status: "funds_held", phase: "Buyer Confirmed", progress: 30 },
  { id: "ESC-004", buyer: "Walmart (US)", seller: "Nigerian Breweries", amount: "$3,200,000", status: "released", phase: "Completed", progress: 100 },
  { id: "ESC-005", buyer: "Tesco PLC", seller: "Promasidor Nigeria", amount: "$165,000", status: "dispute", phase: "Under Review", progress: 50 },
];

// === RISK SCORES ===
const companyScores = [
  { company: "Dangote Industries", score: 97, txns: 1240, disputes: 2, onTime: 99.1, tier: "AAA" },
  { company: "Nigerian Breweries", score: 94, txns: 890, disputes: 5, onTime: 97.8, tier: "AAA" },
  { company: "Olam Nigeria", score: 91, txns: 670, disputes: 8, onTime: 96.2, tier: "AA" },
  { company: "TGI Foods", score: 86, txns: 340, disputes: 12, onTime: 93.5, tier: "AA" },
  { company: "Promasidor", score: 82, txns: 210, disputes: 18, onTime: 90.1, tier: "A" },
  { company: "New Exporter Co", score: 58, txns: 12, disputes: 3, onTime: 75.0, tier: "B" },
];

// === ANOMALIES ===
const anomalies = [
  { id: "ANM-001", type: "Unusual Payment Size", entity: "Vendor XYZ", amount: "₦84M", expected: "₦2-5M avg", severity: "critical" as const, status: "flagged", time: "4 min ago" },
  { id: "ANM-002", type: "Frequency Spike", entity: "Distributor ABC", amount: "47 txns/hr", expected: "3-5 txns/hr", severity: "high" as const, status: "investigating", time: "18 min ago" },
  { id: "ANM-003", type: "Account Takeover Signal", entity: "finance@tenant-12.ng", amount: "-", expected: "New device + location", severity: "critical" as const, status: "blocked", time: "32 min ago" },
  { id: "ANM-004", type: "Split Transaction Pattern", entity: "Buyer DEF (UK)", amount: "12 × $9,900", expected: "Single $118K", severity: "high" as const, status: "flagged", time: "1h ago" },
  { id: "ANM-005", type: "Duplicate Invoice", entity: "INV-2025-0088/0089", amount: "₦12.4M", expected: "Unique per dispatch", severity: "medium" as const, status: "resolved", time: "3h ago" },
];

// === COMPLIANCE ===
const complianceChecks = [
  { check: "Export Documentation Complete", region: "All", pass: 98, total: 1200 },
  { check: "Country Risk Screening", region: "EU/US/UK", pass: 100, total: 890 },
  { check: "Sanctions List Verification", region: "Global", pass: 100, total: 4200 },
  { check: "AML / KYC Verification", region: "Nigeria", pass: 96, total: 2100 },
  { check: "ECOWAS Origin Certification", region: "West Africa", pass: 94, total: 340 },
  { check: "Tariff Classification Accuracy", region: "Global", pass: 97, total: 1800 },
];

const FinancialTrustDashboard = () => {
  const trustScore = useCounter(94);

  return (
    <DashboardLayout title="Financial Trust Dashboard">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Scale className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Financial Trust Layer</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <PulseDot /> Institution-grade trade security - escrow, risk scoring, and compliance
            </p>
          </div>
        </div>

        {/* Top Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Platform Trust Score", value: `${trustScore}/100`, icon: ShieldCheck, color: "text-emerald-400" },
            { label: "Active Escrow Value", value: "$5.12M", icon: Lock, color: "text-primary" },
            { label: "Verified Companies", value: "312", icon: CheckCircle2, color: "text-emerald-400" },
            { label: "Anomalies Blocked (30d)", value: "847", icon: Ban, color: "text-destructive" },
            { label: "Compliance Rate", value: "97.8%", icon: FileCheck, color: "text-primary" },
          ].map((m) => (
            <Card key={m.label} className="border-border/50">
              <CardContent className="p-4">
                <m.icon className={`w-5 h-5 ${m.color} mb-2`} />
                <p className="text-xl font-bold font-mono text-foreground">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="escrow" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="escrow">Escrow System</TabsTrigger>
            <TabsTrigger value="risk">Risk Scoring</TabsTrigger>
            <TabsTrigger value="monitoring">Transaction Monitor</TabsTrigger>
            <TabsTrigger value="compliance">Trade Compliance</TabsTrigger>
          </TabsList>

          {/* === ESCROW === */}
          <TabsContent value="escrow" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Lock className="w-5 h-5 text-primary" />
                  Escrow Payment Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Workflow Diagram */}
                <div className="flex items-center justify-between gap-2 mb-6 p-4 rounded-xl bg-secondary/50 border border-border/30 overflow-x-auto">
                  {["Buyer Confirms", "Funds → Escrow", "Supplier Ships", "Delivery Confirmed", "Funds Released"].map((step, i) => (
                    <div key={step} className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{i + 1}</div>
                        <span className="text-[10px] text-muted-foreground text-center max-w-[80px]">{step}</span>
                      </div>
                      {i < 4 && <div className="w-8 h-0.5 bg-primary/30 shrink-0" />}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  {escrowTransactions.map((tx, i) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="p-4 rounded-xl border border-border/50 bg-card/50"
                    >
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex-1 min-w-[200px]">
                          <p className="text-sm font-medium text-foreground">{tx.buyer} → {tx.seller}</p>
                          <p className="text-xs text-muted-foreground">{tx.id} • {tx.phase}</p>
                        </div>
                        <span className="text-lg font-bold font-mono text-foreground">{tx.amount}</span>
                        <div className="flex items-center gap-2 w-40">
                          <Progress value={tx.progress} className="h-2 flex-1" />
                          <span className="text-xs text-muted-foreground">{tx.progress}%</span>
                        </div>
                        <Badge className={`text-[10px] ${
                          tx.status === "released" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                          tx.status === "dispute" ? "bg-destructive/10 text-destructive border-destructive/30" :
                          tx.status === "delivery_confirmed" ? "bg-primary/10 text-primary border-primary/30" :
                          "bg-secondary text-muted-foreground"
                        }`}>{tx.status.replace("_", " ").toUpperCase()}</Badge>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === RISK SCORING === */}
          <TabsContent value="risk" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Financial Reliability Scores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {companyScores.map((c, i) => (
                    <motion.div
                      key={c.company}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card/50"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm ${
                        c.score >= 90 ? "bg-emerald-500/10 text-emerald-400" :
                        c.score >= 80 ? "bg-primary/10 text-primary" :
                        c.score >= 60 ? "bg-amber-500/10 text-amber-400" :
                        "bg-destructive/10 text-destructive"
                      }`}>{c.tier}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{c.company}</p>
                        <p className="text-xs text-muted-foreground">{c.txns} transactions • {c.disputes} disputes • {c.onTime}% on-time</p>
                      </div>
                      <div className="flex items-center gap-3 w-48">
                        <div className="flex-1">
                          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${c.score}%` }}
                              transition={{ duration: 1.2, delay: i * 0.1 }}
                              className={`h-full rounded-full ${
                                c.score >= 90 ? "bg-gradient-to-r from-emerald-500 to-primary" :
                                c.score >= 80 ? "bg-primary" :
                                c.score >= 60 ? "bg-amber-500" : "bg-destructive"
                              }`}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-mono font-bold text-foreground w-8">{c.score}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <h4 className="text-sm font-semibold text-foreground mb-2">Scoring Methodology</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                      { factor: "Payment History", weight: "30%" },
                      { factor: "Contract Fulfillment", weight: "25%" },
                      { factor: "Transaction Volume", weight: "20%" },
                      { factor: "Dispute Rate", weight: "15%" },
                      { factor: "Delivery Reliability", weight: "10%" },
                    ].map((f) => (
                      <div key={f.factor} className="text-center">
                        <p className="text-lg font-bold font-mono text-primary">{f.weight}</p>
                        <p className="text-xs text-muted-foreground">{f.factor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TRANSACTION MONITORING === */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Transactions Scanned (24h)", value: "12,847", icon: Search },
                { label: "Anomalies Detected", value: "5", icon: AlertOctagon },
                { label: "Auto-Blocked", value: "3", icon: Ban },
                { label: "False Positive Rate", value: "0.03%", icon: Activity },
              ].map((m) => (
                <Card key={m.label} className="border-border/50">
                  <CardContent className="p-4 text-center">
                    <m.icon className="w-5 h-5 text-primary mx-auto mb-2" />
                    <p className="text-xl font-bold font-mono text-foreground">{m.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PulseDot /> Live Anomaly Feed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {anomalies.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="p-4 rounded-xl border border-border/50 bg-card/50"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        a.status === "blocked" ? "bg-emerald-500/10" : 
                        a.status === "resolved" ? "bg-primary/10" : "bg-amber-500/10"
                      }`}>
                        {a.status === "blocked" ? <Ban className="w-4 h-4 text-emerald-400" /> :
                         a.status === "resolved" ? <CheckCircle2 className="w-4 h-4 text-primary" /> :
                         <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{a.type}</p>
                          <Badge className={`text-[10px] ${
                            a.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/30" :
                            a.severity === "high" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                            "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}>{a.severity}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{a.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Entity: {a.entity} • Amount: {a.amount} • Expected: {a.expected}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === TRADE COMPLIANCE === */}
          <TabsContent value="compliance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-primary" />
                  Cross-Border Trade Compliance Engine
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {complianceChecks.map((c) => {
                    const pct = Math.round((c.pass / c.total) * 100);
                    return (
                      <div key={c.check} className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${pct >= 98 ? "text-emerald-400" : pct >= 95 ? "text-primary" : "text-amber-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{c.check}</p>
                          <p className="text-xs text-muted-foreground">Region: {c.region} • {c.pass}/{c.total} passed</p>
                        </div>
                        <Progress value={pct} className="w-24 h-2" />
                        <span className="text-xs font-mono text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { title: "Sanctions Screening", desc: "OFAC, EU, UN sanctions lists cross-checked for every counterparty", icon: Shield, status: "Active" },
                    { title: "Country Risk Matrix", desc: "Dynamic risk scoring for 195 countries based on trade regulations", icon: Globe, status: "Active" },
                    { title: "Export License Validation", desc: "Automated verification of export permits and certificates of origin", icon: FileCheck, status: "Active" },
                  ].map((c) => (
                    <div key={c.title} className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <c.icon className="w-5 h-5 text-primary" />
                        <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">{c.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Bottom */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-primary/5 to-card p-8 text-center space-y-3">
          <Scale className="w-10 h-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">Every Transaction. Verified. Auditable. Trusted.</h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            The Financial Trust Layer transforms RouteAce into institution-grade trade infrastructure - 
            with escrow-protected payments, dynamic risk scoring, real-time anomaly detection, 
            and automated compliance enforcement across every cross-border transaction.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            {["Escrow Protected", "AML Screened", "Sanctions Verified", "Audit Trail", "Risk Scored"].map((t) => (
              <span key={t} className="text-xs font-medium text-primary/70 border border-primary/20 rounded-full px-3 py-1">{t}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};



const __InnerDemo_FinancialTrustDashboard = FinancialTrustDashboard;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_FinancialTrustDashboard = () => (
  <__DemoPreviewGate title="Financial Trust Dashboard" description="Cross-border escrow & counterparty trust scoring.">
    <__InnerDemo_FinancialTrustDashboard />
  </__DemoPreviewGate>
);
export default __WrappedDemo_FinancialTrustDashboard;
