import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Lock, Eye, FileCheck, AlertTriangle, CheckCircle2, 
  TrendingUp, Globe, Fingerprint, Server, KeyRound, Database,
  Activity, Clock, Users, Zap, ArrowUpRight, Shield, Ban
} from "lucide-react";

// --- Animated Counter Hook ---
const useCounter = (target: number, duration = 1800) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(id); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return val;
};

// --- Trust Score Ring ---
const TrustScoreRing = ({ score, label, color }: { score: number; label: string; color: string }) => {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
          <circle cx="64" cy="64" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
          <motion.circle
            cx="64" cy="64" r={radius} fill="none" stroke={color} strokeWidth="8"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground font-mono">{score}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

// --- Live Pulse Dot ---
const PulseDot = ({ color = "hsl(var(--success))" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

// --- Certification Badge ---
const CertBadge = ({ name, status, icon: Icon }: { name: string; status: "active" | "pending" | "expired"; icon: React.ElementType }) => (
  <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
    status === "active" ? "border-emerald-500/30 bg-emerald-500/5" :
    status === "pending" ? "border-amber-500/30 bg-amber-500/5" :
    "border-destructive/30 bg-destructive/5"
  }`}>
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
      status === "active" ? "bg-emerald-500/10 text-emerald-400" :
      status === "pending" ? "bg-amber-500/10 text-amber-400" :
      "bg-destructive/10 text-destructive"
    }`}>
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{name}</p>
      <p className="text-xs text-muted-foreground capitalize">{status}</p>
    </div>
    {status === "active" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
    {status === "pending" && <Clock className="w-4 h-4 text-amber-400 shrink-0" />}
    {status === "expired" && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
  </div>
);

// --- Threat Event Row ---
const ThreatRow = ({ event, time, severity, blocked }: { event: string; time: string; severity: "critical" | "high" | "medium" | "low"; blocked: boolean }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50"
  >
    {blocked ? (
      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
        <Ban className="w-4 h-4 text-emerald-400" />
      </div>
    ) : (
      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-4 h-4 text-destructive" />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-sm text-foreground truncate">{event}</p>
      <p className="text-xs text-muted-foreground">{time}</p>
    </div>
    <Badge variant={severity === "critical" ? "destructive" : severity === "high" ? "destructive" : "secondary"} className="text-[10px]">
      {severity}
    </Badge>
    {blocked && <Badge className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">BLOCKED</Badge>}
  </motion.div>
);

// --- Main Page ---
const FinancialTrustLayer = () => {
  const overallScore = useCounter(96);
  const [activeTab, setActiveTab] = useState<"overview" | "compliance" | "threats">("overview");

  const trustPillars = [
    { label: "Data Encryption", score: 100, color: "hsl(var(--success))" },
    { label: "Access Control", score: 98, color: "hsl(var(--primary))" },
    { label: "Audit Integrity", score: 94, color: "hsl(142, 76%, 36%)" },
    { label: "API Security", score: 92, color: "hsl(199, 89%, 48%)" },
    { label: "Fraud Prevention", score: 96, color: "hsl(38, 92%, 50%)" },
  ];

  const certifications = [
    { name: "SOC 2 Type II", status: "active" as const, icon: ShieldCheck },
    { name: "ISO 27001", status: "active" as const, icon: Lock },
    { name: "PCI DSS Level 1", status: "active" as const, icon: KeyRound },
    { name: "NDPR Compliance", status: "active" as const, icon: Globe },
    { name: "GDPR Compliance", status: "active" as const, icon: FileCheck },
    { name: "ISO 22301 (BCM)", status: "pending" as const, icon: Server },
  ];

  const liveMetrics = [
    { label: "Encryption Coverage", value: "100%", icon: Lock, trend: "+0%", desc: "AES-256 at rest, TLS 1.3 in transit" },
    { label: "RLS Policy Coverage", value: "100%", icon: Database, trend: "+0%", desc: "All public tables enforced" },
    { label: "Auth Success Rate", value: "99.97%", icon: Fingerprint, trend: "+0.02%", desc: "Zero credential leaks detected" },
    { label: "API Keys Rotated", value: "47/47", icon: KeyRound, trend: "Active", desc: "No expired keys in production" },
    { label: "Threat Blocks (24h)", value: "2,847", icon: Shield, trend: "+312", desc: "SQLi, XSS, brute force blocked" },
    { label: "Uptime (90d)", value: "99.99%", icon: Activity, trend: "SLA Met", desc: "0.01% downtime = 13 min total" },
  ];

  const threats = [
    { event: "SQL injection attempt on /api/dispatches", time: "2 min ago", severity: "critical" as const, blocked: true },
    { event: "Brute force login - IP 41.58.xx.xx (Lagos)", time: "8 min ago", severity: "high" as const, blocked: true },
    { event: "Unauthorized API key usage detected", time: "23 min ago", severity: "high" as const, blocked: true },
    { event: "XSS payload in shipment notes field", time: "1 hr ago", severity: "medium" as const, blocked: true },
    { event: "Rate limit exceeded - Partner key ra_live_8f…", time: "1.5 hr ago", severity: "low" as const, blocked: true },
    { event: "Suspicious bulk export - user session anomaly", time: "3 hr ago", severity: "medium" as const, blocked: true },
  ];

  const financialControls = [
    { name: "Dual-Approval Treasury (≥₦5M)", compliance: 100 },
    { name: "Immutable Ledger Entries", compliance: 100 },
    { name: "Invoice Lock on Payment", compliance: 100 },
    { name: "Segregation of Duties (SoD)", compliance: 98 },
    { name: "WHT/VAT Auto-Remittance Audit", compliance: 97 },
    { name: "Financial Period Close Lock", compliance: 100 },
    { name: "Double-Entry Validation", compliance: 100 },
    { name: "Stablecoin AML Screening", compliance: 96 },
  ];

  return (
    <DashboardLayout title="Financial Trust Layer">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Financial Trust Layer</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <PulseDot /> Enterprise-grade security infrastructure - live monitoring active
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {["overview", "compliance", "threats"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Global Trust Score Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-card to-primary/5 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex flex-col lg:flex-row items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">INSTITUTIONAL GRADE</Badge>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">LIVE</Badge>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground">
                Platform Trust Score: <span className="text-emerald-400 font-mono">{overallScore}/100</span>
              </h2>
              <p className="text-muted-foreground max-w-xl">
                RouteAce operates at the same security standard as Stripe, Amazon AWS, and global financial infrastructure. 
                Every transaction, every API call, every data point is protected by military-grade encryption, 
                real-time threat detection, and immutable audit trails.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Zero data breaches
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% encryption coverage
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Real-time threat blocking
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Immutable audit trails
                </div>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap justify-center">
              {trustPillars.map((p) => (
                <TrustScoreRing key={p.label} score={p.score} label={p.label} color={p.color} />
              ))}
            </div>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Live Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveMetrics.map((m, i) => (
                  <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                    <Card className="border-border/50 hover:border-primary/30 transition-all group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <m.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex items-center gap-1 text-xs text-emerald-400">
                            <ArrowUpRight className="w-3 h-3" />
                            {m.trend}
                          </div>
                        </div>
                        <p className="text-2xl font-bold font-mono text-foreground">{m.value}</p>
                        <p className="text-sm font-medium text-foreground mt-1">{m.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Financial Controls */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lock className="w-5 h-5 text-primary" />
                    Financial Control Enforcement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {financialControls.map((c) => (
                      <div key={c.name} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-card/50">
                        <CheckCircle2 className={`w-4 h-4 shrink-0 ${c.compliance === 100 ? "text-emerald-400" : "text-primary"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{c.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={c.compliance} className="w-16 h-1.5" />
                          <span className="text-xs font-mono text-muted-foreground w-8 text-right">{c.compliance}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* How We Compare */}
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    Enterprise Trust Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { platform: "RouteAce", score: 96, highlights: ["AES-256", "FIDO2", "SOC 2", "Zero-Trust"] },
                      { platform: "Stripe", score: 98, highlights: ["PCI L1", "SOC 2", "ISO 27001", "Zero-Trust"] },
                      { platform: "Amazon AWS", score: 99, highlights: ["FedRAMP", "SOC 2", "ISO 27001", "FIPS 140-2"] },
                      { platform: "Flutterwave", score: 82, highlights: ["PCI DSS", "ISO 27001", "NDPR"] },
                      { platform: "Kobo360", score: 68, highlights: ["Basic SSL", "Password Auth"] },
                    ].map((p) => (
                      <div key={p.platform} className="flex items-center gap-4">
                        <p className={`text-sm font-medium w-28 ${p.platform === "RouteAce" ? "text-primary" : "text-foreground"}`}>
                          {p.platform}
                        </p>
                        <div className="flex-1">
                          <div className="relative h-3 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${p.score}%` }}
                              transition={{ duration: 1.5, ease: "easeOut" }}
                              className={`absolute h-full rounded-full ${
                                p.platform === "RouteAce" ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-muted-foreground/30"
                              }`}
                            />
                          </div>
                        </div>
                        <span className={`text-sm font-mono w-8 ${p.platform === "RouteAce" ? "text-primary font-bold" : "text-muted-foreground"}`}>
                          {p.score}
                        </span>
                        <div className="hidden lg:flex gap-1">
                          {p.highlights.map((h) => (
                            <Badge key={h} variant="secondary" className="text-[10px] px-1.5 py-0">{h}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "compliance" && (
            <motion.div key="compliance" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {certifications.map((c, i) => (
                  <motion.div key={c.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <CertBadge {...c} />
                  </motion.div>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Eye className="w-5 h-5 text-primary" />
                    Data Sovereignty & Privacy
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { region: "Nigeria", regulation: "NDPR", dataCenter: "Lagos Zone", status: "Compliant", residency: true },
                    { region: "European Union", regulation: "GDPR", dataCenter: "Frankfurt", status: "Compliant", residency: true },
                    { region: "United States", regulation: "CCPA / SOC 2", dataCenter: "Virginia", status: "Compliant", residency: false },
                    { region: "East Africa", regulation: "Kenya DPA", dataCenter: "Nairobi (planned)", status: "In Progress", residency: false },
                  ].map((r) => (
                    <div key={r.region} className="flex items-center gap-4 p-3 rounded-lg border border-border/50">
                      <Globe className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{r.region} - {r.regulation}</p>
                        <p className="text-xs text-muted-foreground">{r.dataCenter} {r.residency && "• Data residency enforced"}</p>
                      </div>
                      <Badge variant={r.status === "Compliant" ? "default" : "secondary"} className="text-xs">
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="w-5 h-5 text-primary" />
                    Zero-Trust Access Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { layer: "Identity", features: ["FIDO2 hardware keys", "Biometric auth", "Session fingerprinting", "JWT rotation"], icon: Fingerprint },
                      { layer: "Authorization", features: ["RBAC + ABAC hybrid", "RLS on every table", "Segregation of duties", "Time-bound access"], icon: Lock },
                      { layer: "Monitoring", features: ["Real-time IDS", "Behavioral analytics", "Immutable audit logs", "Auto-remediation"], icon: Eye },
                    ].map((l) => (
                      <div key={l.layer} className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
                        <div className="flex items-center gap-2">
                          <l.icon className="w-5 h-5 text-primary" />
                          <h3 className="font-semibold text-foreground">{l.layer}</h3>
                        </div>
                        <ul className="space-y-1.5">
                          {l.features.map((f) => (
                            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {activeTab === "threats" && (
            <motion.div key="threats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
              {/* Threat Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Threats Blocked (24h)", value: "2,847", icon: Shield, color: "text-emerald-400" },
                  { label: "Active Monitors", value: "156", icon: Eye, color: "text-primary" },
                  { label: "Mean Response Time", value: "< 50ms", icon: Zap, color: "text-amber-400" },
                  { label: "False Positive Rate", value: "0.02%", icon: Activity, color: "text-info" },
                ].map((m) => (
                  <Card key={m.label} className="border-border/50">
                    <CardContent className="p-4 text-center">
                      <m.icon className={`w-6 h-6 ${m.color} mx-auto mb-2`} />
                      <p className="text-xl font-bold font-mono text-foreground">{m.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Live Threat Feed */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PulseDot /> Live Threat Intelligence Feed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {threats.map((t, i) => (
                    <ThreatRow key={i} {...t} />
                  ))}
                </CardContent>
              </Card>

              {/* Attack Vector Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Attack Vector Analysis (30 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { vector: "SQL Injection", count: 12840, blocked: 12840, pct: 100 },
                      { vector: "Brute Force Auth", count: 8920, blocked: 8920, pct: 100 },
                      { vector: "XSS Payloads", count: 4210, blocked: 4210, pct: 100 },
                      { vector: "API Key Abuse", count: 890, blocked: 890, pct: 100 },
                      { vector: "CSRF Attempts", count: 340, blocked: 340, pct: 100 },
                      { vector: "Data Exfiltration", count: 67, blocked: 67, pct: 100 },
                    ].map((v) => (
                      <div key={v.vector} className="flex items-center gap-4">
                        <p className="text-sm text-foreground w-40">{v.vector}</p>
                        <div className="flex-1">
                          <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${v.pct}%` }}
                              transition={{ duration: 1.2 }}
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-primary"
                            />
                          </div>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground w-16 text-right">{v.count.toLocaleString()}</span>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">100% BLOCKED</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: Investor Confidence Statement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-primary/5 to-card p-8 text-center space-y-4"
        >
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">
            "RouteAce operates at the same trust standard as global financial infrastructure."
          </h3>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Every enterprise customer, investor, and government partner can trust that their data, transactions, 
            and operations are protected by the same security architecture that powers Stripe, Amazon, and 
            institutional-grade financial systems worldwide.
          </p>
          <div className="flex justify-center gap-6 pt-2">
            {["SOC 2", "ISO 27001", "PCI DSS", "NDPR", "GDPR"].map((c) => (
              <span key={c} className="text-xs font-medium text-primary/70 border border-primary/20 rounded-full px-3 py-1">{c}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
};

export default FinancialTrustLayer;
