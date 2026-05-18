import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Fingerprint, Lock, Shield, Users, CheckCircle2, AlertTriangle,
  Key, Eye, Mail, Smartphone, Activity, Database, Ban, ShieldCheck, Clock
} from "lucide-react";

const PulseDot = ({ color = "hsl(var(--success))" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

const passwordPolicy = [
  { rule: "Minimum 12 characters", enforced: true },
  { rule: "At least 1 uppercase letter", enforced: true },
  { rule: "At least 1 lowercase letter", enforced: true },
  { rule: "At least 1 number", enforced: true },
  { rule: "At least 1 special character", enforced: true },
  { rule: "No common passwords (breached DB check)", enforced: true },
  { rule: "bcrypt hashing (cost factor 12)", enforced: true },
  { rule: "Password history - last 5 not reusable", enforced: true },
];

const twoFactorStats = [
  { method: "Authenticator App (TOTP)", users: 234, pct: 68 },
  { method: "Email Verification", users: 89, pct: 26 },
  { method: "SMS Verification", users: 21, pct: 6 },
];

const sessionControls = [
  { control: "Access token expiry", value: "3600s (1 hour)", status: "enforced" },
  { control: "Refresh token rotation", value: "On every use", status: "enforced" },
  { control: "Device fingerprinting", value: "Browser + OS + IP", status: "enforced" },
  { control: "Concurrent session limit", value: "3 devices max", status: "enforced" },
  { control: "Idle timeout", value: "30 min inactivity", status: "enforced" },
  { control: "Suspicious login re-auth", value: "New IP/device/country", status: "enforced" },
];

const identityRegistryStats = [
  { metric: "Total Registered Accounts", value: "4,821" },
  { metric: "Unique Emails Verified", value: "4,821 (100%)" },
  { metric: "Duplicate Attempts Blocked", value: "347" },
  { metric: "Compromised Credentials Blocked", value: "89" },
  { metric: "Password Resets (30d)", value: "156" },
  { metric: "2FA Adoption Rate", value: "68%" },
];

const verifiedBadges = [
  { company: "Dangote Industries", verified: true, level: "enterprise", checks: ["Business Reg", "TIN", "Ownership", "Bank"] },
  { company: "Nigerian Breweries", verified: true, level: "enterprise", checks: ["Business Reg", "TIN", "Ownership", "Bank"] },
  { company: "Konga Logistics", verified: true, level: "standard", checks: ["Business Reg", "TIN", "Ownership"] },
  { company: "TechLogix NG", verified: true, level: "standard", checks: ["Business Reg", "TIN"] },
  { company: "New Exporter Co", verified: false, level: "pending", checks: ["Business Reg"] },
];

const AccountIntegrity = () => {
  return (
    <DashboardLayout title="Account Integrity">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <Fingerprint className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Account Integrity & Identity Registry</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <PulseDot /> Global account uniqueness, password security, and verified identities
            </p>
          </div>
        </div>

        {/* Identity Registry Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {identityRegistryStats.map((s) => (
            <Card key={s.metric} className="border-border/50">
              <CardContent className="p-4 text-center">
                <p className="text-lg font-bold font-mono text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.metric}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Password Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-primary" />
                Password Security Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {passwordPolicy.map((p) => (
                <div key={p.rule} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <p className="text-sm text-foreground flex-1">{p.rule}</p>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">ENFORCED</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Session Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-primary" />
                Session Security Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessionControls.map((c) => (
                <div key={c.control} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30">
                  <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{c.control}</p>
                    <p className="text-xs text-muted-foreground">{c.value}</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">ACTIVE</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="w-5 h-5 text-primary" />
              Two-Factor Authentication Coverage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {twoFactorStats.map((t) => (
                <div key={t.method} className="p-4 rounded-xl border border-border/50 bg-card/50 text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">{t.method}</p>
                  <p className="text-3xl font-bold font-mono text-primary">{t.pct}%</p>
                  <p className="text-xs text-muted-foreground">{t.users} users enrolled</p>
                  <Progress value={t.pct} className="h-1.5" />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">2FA recommended for all users performing sensitive actions</p>
                <p className="text-xs text-muted-foreground">Financial transactions, export contracts, and trade confirmations require identity re-verification</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verified Business Profiles */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-primary" />
              RouteAce Verified Business Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {verifiedBadges.map((c, i) => (
              <motion.div
                key={c.company}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-4 p-3 rounded-xl border border-border/50 bg-card/50"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  c.verified ? "bg-emerald-500/10" : "bg-amber-500/10"
                }`}>
                  {c.verified ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <Clock className="w-5 h-5 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{c.company}</p>
                    {c.verified && (
                      <Badge className={`text-[10px] ${
                        c.level === "enterprise" ? "bg-primary/10 text-primary border-primary/30" :
                        "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      }`}>{c.level === "enterprise" ? "ENTERPRISE VERIFIED" : "VERIFIED"}</Badge>
                    )}
                    {!c.verified && <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">PENDING</Badge>}
                  </div>
                  <div className="flex gap-1.5 mt-1">
                    {c.checks.map((ch) => (
                      <span key={ch} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{ch}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Bottom */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-card via-primary/5 to-card p-6 text-center">
          <Fingerprint className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold text-foreground">Every Account. Unique. Verified. Protected.</h3>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto mt-2">
            RouteAce enforces global identity uniqueness, enterprise-grade password security, and multi-factor 
            authentication - ensuring the same trust infrastructure as Stripe and Amazon.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};




const __InnerDemo_AccountIntegrity = AccountIntegrity;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_AccountIntegrity = () => (
  <__DemoPreviewGate title="Account Integrity" description="Reputation & verification scoring across the trade network.">
    <__InnerDemo_AccountIntegrity />
  </__DemoPreviewGate>
);
export default __WrappedDemo_AccountIntegrity;
