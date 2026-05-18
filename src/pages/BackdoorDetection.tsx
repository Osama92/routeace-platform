import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";
import {
  ShieldCheck, Lock, Eye, AlertTriangle, CheckCircle2, Ban,
  Activity, Zap, Shield, Fingerprint, Server, Radio,
  Terminal, Bug, Scan, RefreshCw, XCircle, Clock
} from "lucide-react";

const PulseDot = ({ color = "hsl(var(--success))" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: color }} />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: color }} />
  </span>
);

const detectionEngines = [
  { name: "Credential Stuffing Detector", status: true, detections: 1247, blocked: 1247, accuracy: 99.8 },
  { name: "API Abuse Pattern Analyzer", status: true, detections: 890, blocked: 890, accuracy: 99.5 },
  { name: "Hidden Query Scanner", status: true, detections: 34, blocked: 34, accuracy: 100 },
  { name: "Admin Behavior Anomaly AI", status: true, detections: 12, blocked: 8, accuracy: 97.2 },
  { name: "Session Replay Detector", status: true, detections: 67, blocked: 67, accuracy: 99.9 },
  { name: "Token Forgery Analyzer", status: true, detections: 23, blocked: 23, accuracy: 100 },
  { name: "GPS Spoofing Detection", status: true, detections: 156, blocked: 156, accuracy: 98.7 },
  { name: "Rate Anomaly Engine", status: true, detections: 2340, blocked: 2340, accuracy: 99.6 },
];

const liveIncidents = [
  { id: "INC-001", type: "Credential Stuffing", source: "41.58.xx.xx (Lagos)", target: "/auth/login", attempts: 847, blocked: true, time: "3 min ago", severity: "critical" as const, response: "IP banned 24h + account locked" },
  { id: "INC-002", type: "Hidden DB Query", source: "Internal API", target: "profiles (SELECT *)", attempts: 1, blocked: true, time: "12 min ago", severity: "critical" as const, response: "Query rejected + alert raised" },
  { id: "INC-003", type: "Unusual Admin Activity", source: "admin@tenant-44.ng", target: "user_roles (bulk UPDATE)", attempts: 1, blocked: false, time: "28 min ago", severity: "high" as const, response: "Flagged for review - admin notified" },
  { id: "INC-004", type: "Token Replay Attack", source: "185.220.xx.xx (EU)", target: "/api/invoices", attempts: 14, blocked: true, time: "45 min ago", severity: "high" as const, response: "Token revoked + session invalidated" },
  { id: "INC-005", type: "API Enumeration", source: "194.5.xx.xx (Unknown)", target: "/api/users?id=*", attempts: 2100, blocked: true, time: "1h ago", severity: "medium" as const, response: "Rate limited + IP flagged" },
  { id: "INC-006", type: "GPS Spoofing", source: "Driver ENO-445-BC", target: "Location service", attempts: 3, blocked: true, time: "2h ago", severity: "medium" as const, response: "Trip invalidated + driver flagged" },
];

const autoResponses = [
  { trigger: "≥5 failed logins in 60s", action: "Account locked 15 min + IP throttled", icon: Lock },
  { trigger: "≥100 requests/min from single IP", action: "Rate limited + CAPTCHA required", icon: Ban },
  { trigger: "Token used from new country", action: "Session invalidated + email verification", icon: Fingerprint },
  { trigger: "Bulk data export detected", action: "Export paused + admin notification", icon: AlertTriangle },
  { trigger: "SQL pattern in request body", action: "Request blocked + WAF rule updated", icon: Shield },
  { trigger: "Admin role change outside business hours", action: "Change held for dual approval", icon: Clock },
];

const BackdoorDetection = () => {
  const [scanning, setScanning] = useState(false);

  return (
    <DashboardLayout title="Backdoor Detection">
      <div className="space-y-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-destructive/20">
              <Bug className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">Backdoor Intrusion Detection</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <PulseDot /> 8 detection engines active - real-time monitoring
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 4000); }} disabled={scanning} className="gap-2">
            <Scan className={`w-4 h-4 ${scanning ? "animate-spin" : ""}`} />
            {scanning ? "Deep Scanning..." : "Run Deep Scan"}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Threats Detected (30d)", value: "4,769", icon: Eye, color: "text-primary" },
            { label: "Auto-Blocked", value: "4,765", icon: Ban, color: "text-emerald-400" },
            { label: "Mean Response", value: "< 12ms", icon: Zap, color: "text-amber-400" },
            { label: "Detection Engines", value: "8/8 Active", icon: Radio, color: "text-primary" },
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

        {/* Detection Engines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Radio className="w-5 h-5 text-primary" />
              Active Detection Engines
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detectionEngines.map((e, i) => (
                <motion.div
                  key={e.name}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/50"
                >
                  <Switch checked={e.status} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{e.name}</p>
                    <p className="text-xs text-muted-foreground">{e.detections.toLocaleString()} detected • {e.blocked.toLocaleString()} blocked</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">{e.accuracy}%</Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Live Incident Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <PulseDot /> Live Intrusion Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {liveIncidents.map((inc, i) => (
              <motion.div
                key={inc.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className="p-4 rounded-xl border border-border/50 bg-card/50"
              >
                <div className="flex items-start gap-3">
                  {inc.blocked ? (
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                      <Ban className="w-4 h-4 text-emerald-400" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{inc.type}</p>
                      <Badge className={`text-[10px] ${
                        inc.severity === "critical" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        inc.severity === "high" ? "bg-orange-500/10 text-orange-400 border-orange-500/30" :
                        "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}>{inc.severity}</Badge>
                      {inc.blocked && <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">AUTO-BLOCKED</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Source: {inc.source} → Target: {inc.target} • {inc.attempts} attempt{inc.attempts > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-primary mt-1">Response: {inc.response}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{inc.time}</span>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Automated Response Rules */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Automated Response Protocol
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {autoResponses.map((r) => (
                <div key={r.trigger} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-card/50">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <r.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Trigger: {r.trigger}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">→ {r.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default BackdoorDetection;
