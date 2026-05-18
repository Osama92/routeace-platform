import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  Shield,
  Eye,
  Zap,
  MapPin,
  Fuel,
  FileText,
  Users,
  Radio,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Brain,
} from "lucide-react";

// ─── Types ───
interface FraudAlert {
  id: string;
  type: "ghost_trip" | "fake_multidrop" | "duplicate_invoice" | "driver_collusion" | "fuel_fraud" | "sla_manipulation" | "gps_spoofing";
  severity: "critical" | "high" | "medium" | "low";
  entity: string;
  description: string;
  detectedAt: string;
  confidence: number;
  status: "active" | "investigating" | "resolved" | "dismissed";
}

const ALERTS: FraudAlert[] = [
  { id: "1", type: "fuel_fraud", severity: "critical", entity: "KAN-567-RT / Musa Garba", description: "Fuel consumption 40% above route benchmark. 45L discrepancy between receipts and GPS distance.", detectedAt: "12:14 today", confidence: 94, status: "active" },
  { id: "2", type: "gps_spoofing", severity: "critical", entity: "ENO-445-BC / Tunde Bello", description: "GPS coordinates inconsistent with mobile network location. Possible location spoofing on 3 consecutive trips.", detectedAt: "11:50 today", confidence: 91, status: "investigating" },
  { id: "3", type: "duplicate_invoice", severity: "high", entity: "INV-20250218-0044 / INV-20250218-0089", description: "Two invoices share identical customer, route, weight, and dispatch date. Possible duplicate billing.", detectedAt: "Yesterday 17:22", confidence: 87, status: "active" },
  { id: "4", type: "ghost_trip", severity: "high", entity: "DSP-20250217-0031", description: "Dispatch marked 'Delivered' but customer confirms no delivery received. Driver GPS showed stationary.", detectedAt: "Yesterday 14:05", confidence: 82, status: "investigating" },
  { id: "5", type: "driver_collusion", severity: "medium", entity: "Emeka Obi + Chukwu Ada", description: "Two drivers repeatedly assigned to routes for the same customer, both reporting similar excessive fuel usage.", detectedAt: "2 days ago", confidence: 68, status: "investigating" },
  { id: "6", type: "sla_manipulation", severity: "medium", entity: "DSP-20250215-0019", description: "SLA deadline retroactively modified 4 hours before breach detection. No authorisation trail found.", detectedAt: "3 days ago", confidence: 76, status: "resolved" },
  { id: "7", type: "fake_multidrop", severity: "low", entity: "DSP-20250210-0007", description: "4 multi-drop stops logged but GPS indicates only 2 unique locations visited.", detectedAt: "1 week ago", confidence: 61, status: "dismissed" },
];

const TYPE_LABELS: Record<string, string> = {
  ghost_trip: "Ghost Trip",
  fake_multidrop: "Fake Multi-Drop",
  duplicate_invoice: "Duplicate Invoice",
  driver_collusion: "Driver Collusion",
  fuel_fraud: "Fuel Fraud",
  sla_manipulation: "SLA Manipulation",
  gps_spoofing: "GPS Spoofing",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ghost_trip: <Eye className="w-4 h-4" />,
  fake_multidrop: <MapPin className="w-4 h-4" />,
  duplicate_invoice: <FileText className="w-4 h-4" />,
  driver_collusion: <Users className="w-4 h-4" />,
  fuel_fraud: <Fuel className="w-4 h-4" />,
  sla_manipulation: <Clock className="w-4 h-4" />,
  gps_spoofing: <Radio className="w-4 h-4" />,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-destructive/20 text-destructive border-destructive",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500",
  low: "bg-muted text-muted-foreground border-border",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-destructive/20 text-destructive",
  investigating: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/20 text-green-700 dark:text-green-400",
  dismissed: "bg-muted text-muted-foreground",
};

const stats = [
  { label: "Active Fraud Alerts", value: ALERTS.filter(a => a.status === "active").length, icon: AlertTriangle, color: "text-destructive" },
  { label: "Under Investigation", value: ALERTS.filter(a => a.status === "investigating").length, icon: Eye, color: "text-yellow-500" },
  { label: "Resolved This Month", value: 18, icon: CheckCircle, color: "text-green-500" },
  { label: "Financial Risk (Est.)", value: "₦4.2M", icon: TrendingUp, color: "text-orange-500" },
  { label: "AI Confidence Avg", value: "81%", icon: Brain, color: "text-primary" },
  { label: "Prevention Rate", value: "76%", icon: Shield, color: "text-blue-500" },
];

export default function FraudMonitor() {
  const [activeTab, setActiveTab] = useState("alerts");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = ALERTS.filter((a) => {
    if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    return true;
  });

  const criticalAlerts = ALERTS.filter(a => a.severity === "critical" && a.status === "active");

  return (
    <DashboardLayout title="Fraud & Transparency Monitor" subtitle="AI-powered fraud detection and prevention engine">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Alerts Banner */}
      {criticalAlerts.length > 0 && (
        <Alert className="mb-4 border-destructive bg-destructive/10">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <AlertDescription className="text-destructive font-semibold">
            ⚠️ {criticalAlerts.length} critical fraud alert{criticalAlerts.length > 1 ? "s" : ""} require immediate review.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="alerts">All Alerts</TabsTrigger>
          <TabsTrigger value="patterns">Pattern Analysis</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Audit</TabsTrigger>
          <TabsTrigger value="gps">GPS Integrity</TabsTrigger>
          <TabsTrigger value="invoices">Invoice Integrity</TabsTrigger>
        </TabsList>

        {/* ─── ALL ALERTS ─── */}
        <TabsContent value="alerts">
          {/* Filter Row */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["all", "critical", "high", "medium", "low"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterSeverity === s ? "default" : "outline"}
                onClick={() => setFilterSeverity(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>

          <div className="space-y-3">
            {filtered.map((alert) => (
              <Card key={alert.id} className={`border ${SEVERITY_COLORS[alert.severity]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${SEVERITY_COLORS[alert.severity]} flex-shrink-0`}>
                      {TYPE_ICONS[alert.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-sm">{TYPE_LABELS[alert.type]}</p>
                        <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[alert.severity]}`}>{alert.severity}</Badge>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[alert.status]}`}>{alert.status}</span>
                        <span className="text-xs text-muted-foreground ml-auto">{alert.detectedAt}</span>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">{alert.entity}</p>
                      <p className="text-sm">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Brain className="w-3 h-3 text-primary" />
                          <span className="text-xs text-muted-foreground">AI Confidence</span>
                          <Progress value={alert.confidence} className="h-1.5 flex-1 max-w-24" />
                          <span className="text-xs font-medium">{alert.confidence}%</span>
                        </div>
                        {alert.status === "active" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="h-7 text-xs">Investigate</Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-green-600">Resolve</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground">Dismiss</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─── PATTERN ANALYSIS ─── */}
        <TabsContent value="patterns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Brain className="w-4 h-4 text-primary" />AI Pattern Detection</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { pattern: "Repeated excess fuel on Kano routes", confidence: 89, risk: "high" },
                  { pattern: "Driver pair Emeka+Chukwu: shared anomalies", confidence: 68, risk: "medium" },
                  { pattern: "Friday afternoon deliveries: 3x ghost trip rate", confidence: 74, risk: "high" },
                  { pattern: "Supplier X invoices: 12% duplication rate", confidence: 92, risk: "critical" },
                ].map((p) => (
                  <div key={p.pattern} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-sm font-medium">{p.pattern}</p>
                    <div className="flex items-center gap-3">
                      <Progress value={p.confidence} className="h-1.5 flex-1" />
                      <span className="text-xs">{p.confidence}%</span>
                      <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[p.risk as keyof typeof SEVERITY_COLORS]}`}>{p.risk}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Fraud by Type (30 days)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { type: "Fuel Fraud", count: 14, pct: 38 },
                  { type: "Ghost Trips", count: 8, pct: 22 },
                  { type: "Duplicate Invoices", count: 7, pct: 19 },
                  { type: "GPS Spoofing", count: 5, pct: 14 },
                  { type: "SLA Manipulation", count: 3, pct: 8 },
                ].map((t) => (
                  <div key={t.type} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="flex items-center gap-2">{TYPE_ICONS[t.type.toLowerCase().replace(" ", "_")]} {t.type}</span>
                      <span>{t.count} alerts</span>
                    </div>
                    <Progress value={t.pct} className="h-1.5" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── FUEL AUDIT ─── */}
        <TabsContent value="fuel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Fuel className="w-4 h-4" />Fuel Audit Trail</CardTitle>
              <CardDescription>Actual consumption vs route-distance benchmarks</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Benchmark</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Variance</TableHead>
                    <TableHead>Flag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { vehicle: "KAN-567-RT", driver: "Musa Garba", route: "Kano→Kaduna", benchmark: 85, actual: 122, flag: true },
                    { vehicle: "LAG-234-KT", driver: "Emeka Obi", route: "Lagos→Ibadan", benchmark: 62, actual: 65, flag: false },
                    { vehicle: "PHC-123-GA", driver: "Amina Sule", route: "PHC→Warri", benchmark: 48, actual: 51, flag: false },
                    { vehicle: "ABJ-890-LM", driver: "Chukwu Ada", route: "Abuja→Kano", benchmark: 95, actual: 108, flag: true },
                  ].map((row) => {
                    const variance = row.actual - row.benchmark;
                    const pct = ((variance / row.benchmark) * 100).toFixed(1);
                    return (
                      <TableRow key={row.vehicle}>
                        <TableCell className="font-mono text-sm">{row.vehicle}</TableCell>
                        <TableCell className="text-sm">{row.driver}</TableCell>
                        <TableCell className="text-sm">{row.route}</TableCell>
                        <TableCell className="text-sm">{row.benchmark}L</TableCell>
                        <TableCell className="text-sm">{row.actual}L</TableCell>
                        <TableCell className={`text-sm font-medium ${row.flag ? "text-destructive" : "text-green-500"}`}>
                          +{variance}L (+{pct}%)
                        </TableCell>
                        <TableCell>
                          {row.flag ? (
                            <Badge variant="destructive" className="text-xs flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-3 h-3" />Fraud Risk
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 w-fit text-green-600">
                              <CheckCircle className="w-3 h-3" />Normal
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── GPS INTEGRITY ─── */}
        <TabsContent value="gps">
          <div className="space-y-4">
            {[
              { vehicle: "ENO-445-BC", driver: "Tunde Bello", issue: "GPS coordinates differ from cell-tower location by >8km on 3 consecutive trips", severity: "critical", confidence: 91 },
              { vehicle: "KAN-567-RT", driver: "Musa Garba", issue: "Vehicle reported stationary at depot while dispatch marked 'In Transit'", severity: "high", confidence: 85 },
            ].map((item) => (
              <Card key={item.vehicle} className={`border ${SEVERITY_COLORS[item.severity]}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Radio className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">{item.vehicle} - {item.driver}</p>
                      <p className="text-sm text-muted-foreground mt-1">{item.issue}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">AI Confidence: {item.confidence}%</span>
                        <Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[item.severity]}`}>{item.severity}</Badge>
                        <Button size="sm" variant="outline" className="h-6 text-xs">Freeze Driver Account</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
                <p className="font-medium">3 vehicles passed GPS integrity checks today</p>
                <p className="text-sm text-muted-foreground">LAG-234-KT, PHC-123-GA, ABJ-890-LM - all GPS coordinates verified</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── INVOICE INTEGRITY ─── */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4" />Invoice Integrity Check</CardTitle>
              <CardDescription>AI deduplication and anomaly detection on all invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice A</TableHead>
                    <TableHead>Invoice B</TableHead>
                    <TableHead>Match Fields</TableHead>
                    <TableHead>Similarity</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { a: "INV-0044", b: "INV-0089", fields: "Customer, Route, Weight, Date", sim: 94, risk: "critical" },
                    { a: "INV-0031", b: "INV-0033", fields: "Customer, Amount", sim: 71, risk: "medium" },
                    { a: "INV-0022", b: "INV-0028", fields: "Route, Driver", sim: 58, risk: "low" },
                  ].map((row) => (
                    <TableRow key={row.a}>
                      <TableCell className="font-mono text-sm">{row.a}</TableCell>
                      <TableCell className="font-mono text-sm">{row.b}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{row.fields}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={row.sim} className="h-1.5 w-16" />
                          <span className="text-xs">{row.sim}%</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${SEVERITY_COLORS[row.risk]}`}>{row.risk}</Badge></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-6 text-xs">Review</Button>
                          {row.risk === "critical" && <Button size="sm" variant="destructive" className="h-6 text-xs">Block</Button>}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
