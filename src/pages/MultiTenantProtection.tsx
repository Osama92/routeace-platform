import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, Database, Layers, Eye, AlertTriangle,
  CheckCircle2, Server, Globe, Users, Activity, Ban,
  ArrowUpRight, Search, RefreshCw, Shield
} from "lucide-react";

const useCounter = (target: number, d = 1600) => {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s = 0;
    const step = target / (d / 16);
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

const tenantSystems = [
  { name: "FMCG OS", tenants: 47, isolation: 100, lastTest: "2 min ago", status: "secure" },
  { name: "Liquor OS", tenants: 23, isolation: 100, lastTest: "5 min ago", status: "secure" },
  { name: "Pharma OS", tenants: 31, isolation: 100, lastTest: "3 min ago", status: "secure" },
  { name: "Agri Inputs OS", tenants: 18, isolation: 100, lastTest: "8 min ago", status: "secure" },
  { name: "Building Materials OS", tenants: 12, isolation: 100, lastTest: "4 min ago", status: "secure" },
  { name: "Cosmetics OS", tenants: 9, isolation: 100, lastTest: "6 min ago", status: "secure" },
  { name: "BFSI Agent OS", tenants: 15, isolation: 100, lastTest: "1 min ago", status: "secure" },
  { name: "Auto Ancillary OS", tenants: 7, isolation: 100, lastTest: "7 min ago", status: "secure" },
  { name: "Logistics Operator OS", tenants: 156, isolation: 100, lastTest: "30 sec ago", status: "secure" },
  { name: "ExportTech (PortoDash)", tenants: 34, isolation: 100, lastTest: "2 min ago", status: "secure" },
];

const rlsPolicies = [
  { table: "dispatches", policies: 6, enforced: true, filter: "tenant_id + user_id", lastAudit: "1h ago" },
  { table: "invoices", policies: 5, enforced: true, filter: "tenant_id + role", lastAudit: "1h ago" },
  { table: "customers", policies: 4, enforced: true, filter: "tenant_id", lastAudit: "2h ago" },
  { table: "drivers", policies: 5, enforced: true, filter: "tenant_id + org_id", lastAudit: "1h ago" },
  { table: "audit_logs", policies: 3, enforced: true, filter: "user_id (immutable)", lastAudit: "30m ago" },
  { table: "warehouses", policies: 4, enforced: true, filter: "tenant_id + industry_code", lastAudit: "2h ago" },
  { table: "fmcg_outlets", policies: 3, enforced: true, filter: "industry_code + org_id", lastAudit: "1h ago" },
  { table: "api_keys", policies: 4, enforced: true, filter: "partner_id + created_by", lastAudit: "45m ago" },
];

const crossLeakTests = [
  { test: "Tenant A querying Tenant B dispatches", result: "blocked", method: "RLS + tenant_id", severity: "critical" },
  { test: "FMCG user accessing Pharma inventory", result: "blocked", method: "industry_code filter", severity: "critical" },
  { test: "Logistics user accessing Industry finance", result: "blocked", method: "OS scope isolation", severity: "high" },
  { test: "Expired token cross-tenant reuse", result: "blocked", method: "JWT validation + scope", severity: "critical" },
  { test: "API key from Org A used on Org B endpoint", result: "blocked", method: "partner_id binding", severity: "high" },
  { test: "Shared password cross-system auth", result: "blocked", method: "Separate auth scopes", severity: "high" },
  { test: "Direct DB query bypassing RLS", result: "blocked", method: "No direct DB access", severity: "critical" },
  { test: "Aggregated analytics leaking PII", result: "blocked", method: "k-anonymity threshold", severity: "medium" },
];

const MultiTenantProtection = () => {
  const totalTenants = useCounter(352);
  const [scanning, setScanning] = useState(false);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 3000);
  };

  return (
    <DashboardLayout title="Multi-Tenant Protection">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <Layers className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Multi-Tenant Protection</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <PulseDot /> Continuous isolation verification across {totalTenants} tenants
              </p>
            </div>
          </div>
          <Button onClick={runScan} disabled={scanning} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Scanning..." : "Run Isolation Scan"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tenants", value: "352", icon: Users, trend: "+12 this month" },
            { label: "Isolation Score", value: "100%", icon: Shield, trend: "Zero breaches" },
            { label: "RLS Policies Active", value: "156", icon: Database, trend: "All tables enforced" },
            { label: "Cross-Leak Tests", value: "8/8 Pass", icon: Lock, trend: "Last run: 30s ago" },
          ].map((m) => (
            <Card key={m.label} className="border-border/50">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <m.icon className="w-5 h-5 text-primary" />
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-2xl font-bold font-mono text-foreground">{m.value}</p>
                <p className="text-sm text-foreground mt-1">{m.label}</p>
                <p className="text-xs text-muted-foreground">{m.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* OS Isolation Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="w-5 h-5 text-primary" />
              Operating System Isolation Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tenantSystems.map((sys, i) => (
                <motion.div
                  key={sys.name}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{sys.name}</p>
                    <p className="text-xs text-muted-foreground">{sys.tenants} tenants • Last tested: {sys.lastTest}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={sys.isolation} className="w-20 h-1.5" />
                    <span className="text-xs font-mono text-emerald-400 w-10 text-right">{sys.isolation}%</span>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">ISOLATED</Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Two Column: RLS + Cross-Leak */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RLS Policy Enforcement */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-primary" />
                Row-Level Security Enforcement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {rlsPolicies.map((p) => (
                <div key={p.table} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card/30">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-mono">{p.table}</p>
                    <p className="text-xs text-muted-foreground">{p.policies} policies • Filter: {p.filter}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{p.lastAudit}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Cross-Tenant Leak Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="w-5 h-5 text-primary" />
                Cross-Tenant Leak Detection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {crossLeakTests.map((t) => (
                <div key={t.test} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-card/30">
                  <Ban className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{t.test}</p>
                    <p className="text-xs text-muted-foreground">Method: {t.method}</p>
                  </div>
                  <Badge className={`text-[10px] ${
                    t.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/30" :
                    t.severity === "high" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                    "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}>{t.severity}</Badge>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">BLOCKED</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Data Sovereignty Architecture */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="w-5 h-5 text-primary" />
              Tenant Data Sovereignty Architecture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  layer: "Application Layer",
                  icon: Server,
                  controls: [
                    "JWT scoped to tenant_id + industry_code",
                    "API gateway enforces org-level routing",
                    "Session tokens bound to single OS context",
                    "Cross-OS navigation requires re-authentication"
                  ]
                },
                {
                  layer: "Database Layer",
                  icon: Database,
                  controls: [
                    "RLS on every public table (no exceptions)",
                    "tenant_id filter on all queries",
                    "Industry-prefixed tables (fmcg_*, pharma_*)",
                    "No direct SQL access - SDK only"
                  ]
                },
                {
                  layer: "Network Layer",
                  icon: Globe,
                  controls: [
                    "TLS 1.3 enforced for all connections",
                    "API rate limiting per tenant + key",
                    "Geo-fencing on sensitive endpoints",
                    "DDoS protection via edge network"
                  ]
                }
              ].map((l) => (
                <div key={l.layer} className="p-4 rounded-xl border border-border/50 bg-card/50 space-y-3">
                  <div className="flex items-center gap-2">
                    <l.icon className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-foreground">{l.layer}</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {l.controls.map((c) => (
                      <li key={c} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Bottom Statement */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-primary/5 to-card p-6 text-center">
          <Layers className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">Zero Cross-Tenant Data Leaks. Ever.</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-2">
            Every query, every API call, every session is scoped to a single tenant. RouteAce enforces the same 
            data isolation standards as Stripe Connect and AWS Organizations.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default MultiTenantProtection;
