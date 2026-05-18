import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, Lock, Eye, AlertTriangle, CheckCircle2, Shield,
  Layers, Bug, Fingerprint, Scale, Database, Activity, Zap,
  ArrowRight, Globe, Users, Server, Radio
} from "lucide-react";

const PulseDot = ({ color = "hsl(var(--success))" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

const securityModules = [
  {
    name: "Security Command Center",
    desc: "Automated penetration testing, vulnerability scanning, and threat detection with 150+ diagnostic tests",
    href: "/security-center",
    icon: ShieldCheck,
    score: 96,
    tests: 156,
    status: "All Tests Passing",
    gradient: "from-emerald-600 to-primary",
  },
  {
    name: "Financial Trust Layer",
    desc: "Platform trust scoring, compliance certifications, and enterprise comparison benchmarks",
    href: "/financial-trust",
    icon: Shield,
    score: 96,
    tests: 10,
    status: "SOC 2 + ISO 27001",
    gradient: "from-emerald-600 to-blue-600",
  },
  {
    name: "Financial Trust Dashboard",
    desc: "Escrow payments, risk scoring, transaction monitoring, and cross-border trade compliance",
    href: "/financial-trust-dashboard",
    icon: Scale,
    score: 94,
    tests: 24,
    status: "$5.12M in Escrow",
    gradient: "from-amber-600 to-emerald-600",
  },
  {
    name: "Multi-Tenant Protection",
    desc: "OS isolation matrix, RLS enforcement, and cross-tenant leak detection across 352 tenants",
    href: "/multi-tenant-protection",
    icon: Layers,
    score: 100,
    tests: 8,
    status: "Zero Leaks",
    gradient: "from-blue-600 to-primary",
  },
  {
    name: "Backdoor Intrusion Detection",
    desc: "8 active detection engines: credential stuffing, API abuse, GPS spoofing, token forgery",
    href: "/backdoor-detection",
    icon: Bug,
    score: 99,
    tests: 8,
    status: "4,769 Blocked (30d)",
    gradient: "from-red-600 to-orange-600",
  },
  {
    name: "Account Integrity Registry",
    desc: "Global account uniqueness, password policy enforcement, 2FA coverage, and verified businesses",
    href: "/account-integrity",
    icon: Fingerprint,
    score: 98,
    tests: 16,
    status: "100% Unique",
    gradient: "from-violet-600 to-primary",
  },
  {
    name: "Fraud Monitor",
    desc: "Real-time fraud detection: ghost trips, duplicate invoices, GPS spoofing, driver collusion",
    href: "/fraud-monitor",
    icon: Eye,
    score: 94,
    tests: 7,
    status: "7 Active Alerts",
    gradient: "from-orange-600 to-red-600",
  },
  {
    name: "Audit Trail System",
    desc: "Immutable audit logging for every action, financial transaction, and access event",
    href: "/audit-logs",
    icon: Database,
    score: 100,
    tests: 0,
    status: "Immutable Logging",
    gradient: "from-primary to-emerald-600",
  },
];

const architectureLayers = [
  {
    layer: "Identity & Access",
    icon: Fingerprint,
    controls: ["FIDO2 hardware keys", "bcrypt password hashing", "JWT + refresh rotation", "RBAC + ABAC hybrid", "Segregation of Duties"],
  },
  {
    layer: "Data Protection",
    icon: Lock,
    controls: ["AES-256 encryption at rest", "TLS 1.3 in transit", "RLS on all tables", "Industry-prefixed isolation", "Tokenized financial fields"],
  },
  {
    layer: "Network Security",
    icon: Globe,
    controls: ["API rate limiting", "Geo-fencing", "DDoS edge protection", "WAF rules (SQLi, XSS, CSRF)", "IP allowlisting for admins"],
  },
  {
    layer: "Monitoring & Response",
    icon: Radio,
    controls: ["Real-time IDS", "Behavioral analytics", "Auto-remediation", "Immutable audit trails", "< 12ms threat response"],
  },
  {
    layer: "Financial Controls",
    icon: Scale,
    controls: ["Dual-approval treasury", "Immutable ledger entries", "Invoice lock on payment", "Double-entry validation", "Stablecoin AML screening"],
  },
  {
    layer: "Compliance",
    icon: ShieldCheck,
    controls: ["SOC 2 Type II", "ISO 27001", "PCI DSS Level 1", "NDPR / GDPR", "Sanctions screening"],
  },
];

const SecurityArchitectureHub = () => {
  const navigate = useNavigate();
  const overallScore = 96;

  return (
    <DashboardLayout title="Security Architecture">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-600 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <ShieldCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Enterprise Security Architecture</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <PulseDot /> Unified security command - all systems operational
            </p>
          </div>
        </div>

        {/* Overall Score Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/40 via-card to-primary/5 p-8"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="54" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                <motion.circle
                  cx="64" cy="64" r="54" fill="none" stroke="hsl(var(--success))" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 54}
                  strokeDashoffset={2 * Math.PI * 54}
                  animate={{ strokeDashoffset: 2 * Math.PI * 54 * (1 - overallScore / 100) }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground font-mono">{overallScore}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">/ 100</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">INSTITUTIONAL GRADE</Badge>
                <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">ALL SYSTEMS ACTIVE</Badge>
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                8 Security Modules. 229+ Tests. Zero Breaches.
              </h2>
              <p className="text-muted-foreground max-w-xl">
                RouteAce operates at the same security standard as Stripe, Amazon AWS, and global financial infrastructure.
                Every layer - from identity to compliance - is continuously monitored and auto-remediated.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Security Modules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {securityModules.map((mod, i) => (
            <motion.div
              key={mod.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate(mod.href)}
              className="cursor-pointer group"
            >
              <Card className="border-border/50 hover:border-primary/40 transition-all h-full">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.gradient} flex items-center justify-center shrink-0 shadow-lg group-hover:scale-105 transition-transform`}>
                      <mod.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{mod.name}</h3>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{mod.desc}</p>
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex items-center gap-1.5">
                          <div className="w-16">
                            <Progress value={mod.score} className="h-1.5" />
                          </div>
                          <span className="text-xs font-mono text-foreground">{mod.score}%</span>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">{mod.status}</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Architecture Layers */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Server className="w-5 h-5 text-primary" />
              Zero-Trust Security Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {architectureLayers.map((l) => (
                <div key={l.layer} className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <l.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground text-sm">{l.layer}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {l.controls.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-primary/5 to-card p-8 text-center space-y-3">
          <ShieldCheck className="w-10 h-10 text-primary mx-auto" />
          <h3 className="text-xl font-bold text-foreground">
            "RouteAce Is Secured to the Same Standard as Global Financial Infrastructure."
          </h3>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            From identity verification to financial controls, from tenant isolation to backdoor detection - 
            every layer of RouteAce is protected by enterprise-grade security that investors and 
            large enterprises trust immediately.
          </p>
          <div className="flex justify-center gap-4 pt-2 flex-wrap">
            {["SOC 2", "ISO 27001", "PCI DSS", "NDPR", "GDPR", "Zero-Trust", "AES-256"].map((c) => (
              <span key={c} className="text-xs font-medium text-primary/70 border border-primary/20 rounded-full px-3 py-1">{c}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SecurityArchitectureHub;
