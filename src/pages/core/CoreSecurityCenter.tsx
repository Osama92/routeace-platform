import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Shield, ShieldAlert, ShieldCheck, Eye, Database, RefreshCw, Clock, Bug, AlertTriangle, CheckCircle } from "lucide-react";
import { useSecurityEvents } from "@/hooks/useSecurityEvents";
import RLSSmokeTestPanel from "@/components/core/RLSSmokeTestPanel";
import TenantIsolationAuditPanel from "@/components/core/TenantIsolationAuditPanel";
import PlatformObservabilityPanel from "@/components/core/PlatformObservabilityPanel";
import EnterpriseReadinessPanel from "@/components/core/EnterpriseReadinessPanel";
import EnterpriseAuditLogPanel from "@/components/core/EnterpriseAuditLogPanel";
import QueueMonitorPanel from "@/components/core/QueueMonitorPanel";
import TenantIsolationSuitePanel from "@/components/core/TenantIsolationSuitePanel";
import { format } from "date-fns";

const severityColor: Record<string, string> = {
  critical: "text-destructive",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

const CoreSecurityCenter = () => {
  const { threats, auditLogs, stats, loading, refresh } = useSecurityEvents();
  const [activeTab, setActiveTab] = useState("threats");

  const formatTime = (ts: string | null) => {
    if (!ts) return "-";
    try { return format(new Date(ts), "MMM dd, HH:mm"); } catch { return ts; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            Platform Security Monitor
          </h1>
          <p className="text-muted-foreground text-sm">Core team view - all platform security events and audit trails</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refresh()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Threats (24h)", value: stats.threatsBlocked24h, icon: ShieldAlert, color: "text-destructive" },
          { label: "Anomalies (24h)", value: stats.anomalies, icon: Eye, color: "text-orange-500" },
          { label: "Total Accounts", value: stats.totalAccounts, icon: Database, color: "text-primary" },
          { label: "Audit Entries", value: stats.totalAuditEntries, icon: Bug, color: "text-amber-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <s.icon className={`w-5 h-5 mx-auto mb-2 ${s.color}`} />
              <p className="text-xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="threats">Security Events</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="enterprise-audit">Enterprise Audit</TabsTrigger>
          <TabsTrigger value="rls">RLS Smoke</TabsTrigger>
          <TabsTrigger value="isolation-suite">Isolation Suite</TabsTrigger>
          <TabsTrigger value="isolation">Isolation Map</TabsTrigger>
          <TabsTrigger value="queues">Queue Health</TabsTrigger>
          <TabsTrigger value="observability">Observability</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="rls"><RLSSmokeTestPanel /></TabsContent>
        <TabsContent value="isolation-suite"><TenantIsolationSuitePanel /></TabsContent>
        <TabsContent value="isolation"><TenantIsolationAuditPanel /></TabsContent>
        <TabsContent value="enterprise-audit"><EnterpriseAuditLogPanel /></TabsContent>
        <TabsContent value="queues"><QueueMonitorPanel /></TabsContent>
        <TabsContent value="observability"><PlatformObservabilityPanel /></TabsContent>
        <TabsContent value="readiness"><EnterpriseReadinessPanel /></TabsContent>


        <TabsContent value="threats">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><ShieldAlert className="w-4 h-4 text-destructive" />Platform Security Events</CardTitle>
              <CardDescription>All security events across the RouteAce ecosystem</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : threats.length === 0 ? (
                <div className="text-center py-12">
                  <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No security events recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">Events will appear here as they are detected.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {threats.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium text-sm">{e.event_type}</TableCell>
                        <TableCell>
                          <span className={`font-semibold text-xs ${severityColor[e.severity || "low"]}`}>
                            {(e.severity || "low").toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{e.ip_address || "-"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {typeof e.details === "object" && e.details ? JSON.stringify(e.details) : String(e.details || "-")}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatTime(e.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><Database className="w-4 h-4" />Platform Audit Trail</CardTitle>
              <CardDescription>All audit log entries across every OS</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="font-medium text-muted-foreground">No audit entries yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.action}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{a.table_name}</TableCell>
                        <TableCell className="text-xs font-mono">{a.record_id?.substring(0, 8)}...</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{a.user_email || "System"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{formatTime(a.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CoreSecurityCenter;
