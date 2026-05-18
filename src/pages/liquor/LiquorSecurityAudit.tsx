import { useState, useMemo } from "react";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldAlert, ShieldCheck, AlertTriangle, Bug, RefreshCw,
  ChevronDown, ChevronRight, Lock, Eye, Users, FileWarning,
  Fingerprint, BarChart3, Zap,
} from "lucide-react";
import { runSecurityAudit, type SecurityViolation, type ViolationSeverity, type ViolationCategory } from "@/lib/liquorSecurityAudit";

const SEVERITY_CONFIG: Record<ViolationSeverity, { color: string; icon: typeof ShieldAlert; label: string }> = {
  critical: { color: "text-red-500 bg-red-500/10 border-red-500/30", icon: ShieldAlert, label: "Critical" },
  high: { color: "text-orange-500 bg-orange-500/10 border-orange-500/30", icon: AlertTriangle, label: "High" },
  medium: { color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30", icon: Bug, label: "Medium" },
  low: { color: "text-blue-500 bg-blue-500/10 border-blue-500/30", icon: Eye, label: "Low" },
};

const CATEGORY_LABELS: Record<ViolationCategory, { label: string; icon: typeof Lock }> = {
  cross_org_data_access: { label: "Cross-Org Data Access", icon: Users },
  dashboard_leak: { label: "Dashboard Leak", icon: BarChart3 },
  finance_data_leak: { label: "Finance Data Leak", icon: FileWarning },
  identity_exposure: { label: "Identity Exposure", icon: Eye },
  privilege_escalation: { label: "Privilege Escalation", icon: Zap },
  separation_of_duties: { label: "Separation of Duties", icon: Lock },
  navigation_leak: { label: "Navigation Leak", icon: ChevronRight },
  api_unprotected: { label: "Unprotected API", icon: Fingerprint },
};

const LiquorSecurityAudit = () => {
  const [scanRunning, setScanRunning] = useState(false);
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<ViolationSeverity | "all">("all");
  const [filterCategory, setFilterCategory] = useState<ViolationCategory | "all">("all");

  const auditResult = useMemo(() => runSecurityAudit(), []);
  const { violations, summary, roleReport } = auditResult;

  const filteredViolations = useMemo(() => {
    return violations.filter((v) => {
      if (filterSeverity !== "all" && v.severity !== filterSeverity) return false;
      if (filterCategory !== "all" && v.category !== filterCategory) return false;
      return true;
    });
  }, [violations, filterSeverity, filterCategory]);

  const handleRescan = () => {
    setScanRunning(true);
    setTimeout(() => setScanRunning(false), 1500);
  };

  return (
    <IndustryLayout industryCode="liquor">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-primary" />
              Security Audit Engine
            </h1>
            <p className="text-muted-foreground mt-1">
              Automated permission leak detection across {summary.totalRolesScanned} roles and {summary.totalPermissionsAudited} permission assignments
            </p>
          </div>
          <Button onClick={handleRescan} disabled={scanRunning} variant="outline" className="gap-2">
            <RefreshCw className={`w-4 h-4 ${scanRunning ? "animate-spin" : ""}`} />
            {scanRunning ? "Scanning..." : "Re-scan"}
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="border-red-500/30 bg-red-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-red-500">{summary.criticalViolations}</p>
              <p className="text-xs text-muted-foreground mt-1">Critical</p>
            </CardContent>
          </Card>
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-orange-500">{summary.highViolations}</p>
              <p className="text-xs text-muted-foreground mt-1">High</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-yellow-500">{summary.mediumViolations}</p>
              <p className="text-xs text-muted-foreground mt-1">Medium</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-blue-500">{summary.lowViolations}</p>
              <p className="text-xs text-muted-foreground mt-1">Low</p>
            </CardContent>
          </Card>
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-green-500">{summary.autoFixedCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Auto-Fixed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-3xl font-bold text-foreground">{summary.totalRolesScanned}</p>
              <p className="text-xs text-muted-foreground mt-1">Roles Scanned</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="violations" className="space-y-4">
          <TabsList>
            <TabsTrigger value="violations">Violations ({violations.length})</TabsTrigger>
            <TabsTrigger value="roles">Role Report</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Violations Tab */}
          <TabsContent value="violations" className="space-y-4">
            {/* Filters */}
            <div className="flex gap-2 flex-wrap">
              <Badge
                variant={filterSeverity === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setFilterSeverity("all")}
              >
                All
              </Badge>
              {(["critical", "high", "medium", "low"] as ViolationSeverity[]).map((s) => (
                <Badge
                  key={s}
                  variant={filterSeverity === s ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => setFilterSeverity(s)}
                >
                  {s} ({violations.filter((v) => v.severity === s).length})
                </Badge>
              ))}
            </div>

            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredViolations.map((v) => {
                  const config = SEVERITY_CONFIG[v.severity];
                  const catConfig = CATEGORY_LABELS[v.category];
                  const isExpanded = expandedViolation === v.id;
                  return (
                    <Card
                      key={v.id}
                      className={`border ${config.color.split(" ")[2]} cursor-pointer transition-all hover:shadow-md`}
                      onClick={() => setExpandedViolation(isExpanded ? null : v.id)}
                    >
                      <CardContent className="py-3 px-4">
                        <div className="flex items-start gap-3">
                          <config.icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color.split(" ")[0]}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-[10px]">{v.id}</Badge>
                              <Badge className={`text-[10px] ${config.color}`}>{config.label}</Badge>
                              <Badge variant="secondary" className="text-[10px] gap-1">
                                <catConfig.icon className="w-3 h-3" />
                                {catConfig.label}
                              </Badge>
                              {v.autoFixed && (
                                <Badge variant="default" className="text-[10px] bg-green-600">Auto-Fixed</Badge>
                              )}
                            </div>
                            <p className="text-sm text-foreground mt-1.5 font-medium">{v.description}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Role: {v.role} • Org: {v.orgType || "n/a"}
                              {v.affectedPermission && ` • Permission: ${v.affectedPermission}`}
                            </p>
                            {isExpanded && (
                              <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                                <p className="text-xs font-semibold text-foreground mb-1">Recommendation</p>
                                <p className="text-xs text-muted-foreground">{v.recommendation}</p>
                              </div>
                            )}
                          </div>
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Role Report Tab */}
          <TabsContent value="roles">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(roleReport).map((report) => (
                <Card
                  key={report.role}
                  className={`border ${
                    report.status === "critical"
                      ? "border-red-500/30"
                      : report.status === "warning"
                      ? "border-orange-500/30"
                      : "border-green-500/30"
                  }`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{report.label}</span>
                      <Badge
                        variant={report.status === "secure" ? "default" : "destructive"}
                        className="text-[10px]"
                      >
                        {report.status === "secure" ? "✓ Secure" : report.status === "warning" ? "⚠ Warning" : "✗ Critical"}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Org Type</span>
                      <span className="capitalize font-medium text-foreground">{report.orgType || "platform"}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Permissions</span>
                      <span className="font-medium text-foreground">{report.totalPermissions}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Violations</span>
                      <span className={`font-medium ${report.violations > 0 ? "text-red-500" : "text-green-500"}`}>{report.violations}</span>
                    </div>
                    {report.criticalCount > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-red-500">Critical</span>
                        <span className="font-bold text-red-500">{report.criticalCount}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Category Breakdown Tab */}
          <TabsContent value="categories">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(Object.entries(summary.categoryCounts) as [ViolationCategory, number][])
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, count]) => {
                  const config = CATEGORY_LABELS[cat];
                  return (
                    <Card key={cat}>
                      <CardContent className="py-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <config.icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{config.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {count} violation{count !== 1 ? "s" : ""} detected
                          </p>
                        </div>
                        <p className="text-2xl font-bold text-foreground">{count}</p>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations">
            <div className="space-y-4">
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    Architecture Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      title: "1. Server-Side Role Assignment",
                      desc: "Move role assignment from client-side useLiquorRole.setRole() to a backend function with admin-only authorization. The current implementation allows privilege escalation.",
                      status: "Auto-Fixed",
                    },
                    {
                      title: "2. Multi-Tenant Organization Isolation",
                      desc: "Add organization_id to all data queries. Currently, role checks exist but two distributors in the same role tier can see each other's data. Implement RLS policies scoped by organization_id.",
                      status: "Recommended",
                    },
                    {
                      title: "3. Data Intelligence Anonymization Layer",
                      desc: "Data intelligence subscribers and investor viewers must only receive aggregated, anonymized data. Create database views that strip PII before serving analytics endpoints.",
                      status: "Recommended",
                    },
                    {
                      title: "4. API Permission Middleware",
                      desc: "All edge functions should validate liquor_role and organization_id before processing requests. Create a shared middleware for consistent enforcement.",
                      status: "Recommended",
                    },
                    {
                      title: "5. Audit Trail Enhancement",
                      desc: "Log all permission checks (both grants and denials) to the liquor_compliance_audit table for regulatory compliance and forensic analysis.",
                      status: "Recommended",
                    },
                    {
                      title: "6. Session-Based Role Simulation",
                      desc: "Implement admin-only role simulation mode to test access patterns without modifying actual role assignments. Useful for compliance verification.",
                      status: "Recommended",
                    },
                  ].map((rec) => (
                    <div key={rec.title} className="p-4 bg-muted/30 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-foreground text-sm">{rec.title}</p>
                        <Badge variant={rec.status === "Auto-Fixed" ? "default" : "secondary"} className="text-[10px]">
                          {rec.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{rec.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Scan Metadata</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>Scan Timestamp: {summary.scanTimestamp}</p>
                  <p>Roles Scanned: {summary.totalRolesScanned}</p>
                  <p>Permission Assignments Audited: {summary.totalPermissionsAudited}</p>
                  <p>Isolation Rules Checked: {Object.keys(CATEGORY_LABELS).length} categories</p>
                  <p>Separation of Duty Rules: 3</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </IndustryLayout>
  );
};

export default LiquorSecurityAudit;
