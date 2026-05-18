import DemoDataBanner from "@/components/shared/DemoDataBanner";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, Truck, Globe, Clock,
  FileText, BarChart3, TrendingUp, TrendingDown, MapPin, Euro,
  Zap, AlertCircle, Info, Download, RefreshCw, Activity, Target,
  Package, Fuel, Wind, Scale, Building2, CreditCard, Navigation,
  Timer, Eye, Brain, Thermometer, Flag, BookOpen, Gauge,
} from "lucide-react";

// ─── FEATURE FLAG ────────────────────────────────────────────────────────────
const EU_FREIGHT_COMPLIANCE_V1 = true;

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface DriverCompliance {
  id: string;
  name: string;
  country: string;
  dailyHours: number;
  weeklyHours: number;
  fortnightHours: number;
  lastBreak: number; // minutes ago
  continuousDriving: number; // hours without break
  violations: string[];
  riskScore: number;
  tachographLinked: boolean;
  hgvLicenseValid: boolean;
  licenseExpiry: string;
}

interface CabotageRecord {
  vehicleId: string;
  plate: string;
  hostCountry: string;
  opsCount: number;
  maxOps: number;
  lastOpDate: string;
  coolingPeriodEnd: string | null;
  restricted: boolean;
}

interface TollEstimate {
  country: string;
  flag: string;
  amount: number;
  currency: string;
  route: string;
}

interface ComplianceAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  module: string;
  message: string;
  recommendation: string;
  timestamp: string;
}

// ─── LIVE DATA SOURCES ────────────────────────────────────────────────────────
// These arrays are intentionally empty. Real driver-hours, cabotage, toll, and
// alert records will be loaded from the EU compliance service once wired.
const MOCK_DRIVERS: DriverCompliance[] = [];
const MOCK_CABOTAGE: CabotageRecord[] = [];
const MOCK_TOLLS: TollEstimate[] = [];
const MOCK_ALERTS: ComplianceAlert[] = [];


const EU_COUNTRIES = [
  { code: "DE", name: "Germany", vatRate: 19, citRate: 15, flag: "🇩🇪" },
  { code: "FR", name: "France", vatRate: 20, citRate: 25, flag: "🇫🇷" },
  { code: "IT", name: "Italy", vatRate: 22, citRate: 24, flag: "🇮🇹" },
  { code: "PL", name: "Poland", vatRate: 23, citRate: 19, flag: "🇵🇱" },
  { code: "ES", name: "Spain", vatRate: 21, citRate: 25, flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", vatRate: 21, citRate: 25.8, flag: "🇳🇱" },
  { code: "BE", name: "Belgium", vatRate: 21, citRate: 25, flag: "🇧🇪" },
  { code: "AT", name: "Austria", vatRate: 20, citRate: 23, flag: "🇦🇹" },
];

const EMISSION_ZONES = [
  { city: "London", type: "ULEZ", minClass: "Euro 6", restricted: ["Euro 4", "Euro 5"], chargeEUR: 17.5 },
  { city: "Amsterdam", type: "ZEZ", minClass: "ZEV Only", restricted: ["All diesel by 2025"], chargeEUR: 0 },
  { city: "Paris", type: "ZCR", minClass: "Crit'Air 2", restricted: ["Crit'Air 3+"], chargeEUR: 0 },
  { city: "Milan", type: "Area C", minClass: "Euro 4", restricted: ["Pre-Euro 4"], chargeEUR: 5 },
  { city: "Berlin", type: "Umweltzone", minClass: "Euro 4 (Green)", restricted: ["Euro 3 and below"], chargeEUR: 0 },
  { city: "Madrid", type: "ZBE", minClass: "Eco/0 Label", restricted: ["B label and below"], chargeEUR: 0 },
];

// Feature-flag guard – no throw at module level to avoid render issues


// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function ComplianceScoreRing({ score }: { score: number }) {
  const color = score >= 85 ? "text-green-500" : score >= 65 ? "text-yellow-500" : "text-red-500";
  const label = score >= 85 ? "Compliant" : score >= 65 ? "At Risk" : "Non-Compliant";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`text-5xl font-black ${color}`}>{score}%</div>
      <div className="text-sm font-semibold text-muted-foreground">{label}</div>
    </div>
  );
}

function AlertBadge({ severity }: { severity: ComplianceAlert["severity"] }) {
  if (severity === "critical") return <Badge variant="destructive">Critical</Badge>;
  if (severity === "warning") return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Warning</Badge>;
  return <Badge variant="secondary">Info</Badge>;
}

function HoursBar({ value, max, warn, label }: { value: number; max: number; warn: number; label: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const isOver = value > max;
  const isWarn = value > warn;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-bold ${isOver ? "text-red-500" : isWarn ? "text-yellow-500" : "text-green-500"}`}>
          {value}h / {max}h
        </span>
      </div>
      <Progress value={pct} className={`h-2 ${isOver ? "[&>div]:bg-red-500" : isWarn ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EUFreightCompliance() {
  const [selectedDriver, setSelectedDriver] = useState<DriverCompliance | null>(null);
  const [vatScheme, setVatScheme] = useState("reverse_charge");
  const [selectedCountry, setSelectedCountry] = useState("DE");
  const [eoriNumber, setEoriNumber] = useState("DE123456789");
  const [borderRisk, setBorderRisk] = useState(27);

  const totalToll = MOCK_TOLLS.reduce((s, t) => s + t.amount, 0);
  const criticalAlerts = MOCK_ALERTS.filter(a => a.severity === "critical").length;
  const warningAlerts = MOCK_ALERTS.filter(a => a.severity === "warning").length;
  const compliantDrivers = MOCK_DRIVERS.filter(d => d.violations.length === 0).length;
  const overallScore = 91;

  return (
    <DashboardLayout title="EU Freight Compliance" subtitle="Pan-European regulatory compliance engine">
      <div className="space-y-6">
        <DemoDataBanner feature="EU Freight Compliance" />
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Pan-European Freight Compliance</h1>
                <p className="text-sm text-muted-foreground">EU Regulation EC 561/2006 · Cabotage · LEZ · Toll Intelligence · CMR · IFRS VAT</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                eu_freight_compliance_v1 ✓
              </Badge>
              <Badge variant="outline" className="text-xs">Tenant-Isolated</Badge>
              <Badge variant="outline" className="text-xs">Nigerian Schema Protected</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export EU Report
          </Button>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="col-span-2 md:col-span-1 bg-card border-border">
            <CardContent className="p-4 flex flex-col items-center">
              <ComplianceScoreRing score={overallScore} />
              <p className="text-xs text-muted-foreground mt-1">EU Compliance Score</p>
            </CardContent>
          </Card>
          {[
            { label: "Driver Violations", value: `${MOCK_DRIVERS.filter(d => d.violations.length).length}`, sub: "of 4 drivers", icon: AlertTriangle, color: "text-red-500" },
            { label: "Cabotage Restricted", value: `${MOCK_CABOTAGE.filter(c => c.restricted).length}`, sub: "vehicles", icon: Truck, color: "text-yellow-500" },
            { label: "Total Toll Estimate", value: `€${totalToll.toFixed(2)}`, sub: "this route", icon: Euro, color: "text-blue-500" },
            { label: "Critical Alerts", value: `${criticalAlerts}`, sub: `+${warningAlerts} warnings`, icon: Shield, color: "text-red-500" },
            { label: "Border Risk Score", value: `${borderRisk}%`, sub: "delay probability", icon: Flag, color: "text-yellow-500" },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="p-4">
                <kpi.icon className={`w-5 h-5 ${kpi.color} mb-2`} />
                <div className="text-2xl font-black text-foreground">{kpi.value}</div>
                <div className="text-xs font-semibold text-foreground">{kpi.label}</div>
                <div className="text-xs text-muted-foreground">{kpi.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts > 0 && (
          <Alert className="border-red-500/30 bg-red-500/5">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-700">
              <strong>{criticalAlerts} critical compliance violation{criticalAlerts > 1 ? "s" : ""} detected.</strong> Dispatch may be blocked for affected vehicles/drivers until resolved.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="driver-hours">
          <TabsList className="flex-wrap h-auto gap-1 bg-muted">
            <TabsTrigger value="driver-hours" className="gap-1.5 text-xs"><Clock className="w-3 h-3" />Driver Hours</TabsTrigger>
            <TabsTrigger value="cabotage" className="gap-1.5 text-xs"><Truck className="w-3 h-3" />Cabotage</TabsTrigger>
            <TabsTrigger value="lez" className="gap-1.5 text-xs"><Wind className="w-3 h-3" />LEZ & Emissions</TabsTrigger>
            <TabsTrigger value="tolls" className="gap-1.5 text-xs"><Euro className="w-3 h-3" />Toll Engine</TabsTrigger>
            <TabsTrigger value="vat" className="gap-1.5 text-xs"><FileText className="w-3 h-3" />Cross-Border VAT</TabsTrigger>
            <TabsTrigger value="cmr" className="gap-1.5 text-xs"><Shield className="w-3 h-3" />CMR & Liability</TabsTrigger>
            <TabsTrigger value="routes" className="gap-1.5 text-xs"><Navigation className="w-3 h-3" />EU Route Intel</TabsTrigger>
            <TabsTrigger value="payroll" className="gap-1.5 text-xs"><CreditCard className="w-3 h-3" />Driver Payroll</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1.5 text-xs"><AlertCircle className="w-3 h-3" />AI Risk Layer</TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><BarChart3 className="w-3 h-3" />Dashboard</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: EU DRIVER HOURS ─────────────────────────────────────── */}
          <TabsContent value="driver-hours" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary" />
                      EU Driver Hours Compliance Engine
                    </CardTitle>
                    <CardDescription>EC 561/2006 · EU Mobility Package I · Tachograph Monitoring</CardDescription>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    <RefreshCw className="w-3 h-3" />
                    Sync Tachograph
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg text-xs">
                  <div><span className="text-muted-foreground">Max daily:</span> <strong className="text-foreground">9h (10h×2/wk)</strong></div>
                  <div><span className="text-muted-foreground">Continuous drive:</span> <strong className="text-foreground">4.5h max</strong></div>
                  <div><span className="text-muted-foreground">Weekly limit:</span> <strong className="text-foreground">56h</strong></div>
                  <div><span className="text-muted-foreground">Fortnight limit:</span> <strong className="text-foreground">90h</strong></div>
                </div>

                <div className="space-y-3">
                  {MOCK_DRIVERS.map((driver) => (
                    <div
                      key={driver.id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        driver.violations.length > 0
                          ? "border-red-500/40 bg-red-500/5"
                          : "border-border bg-muted/20 hover:bg-muted/40"
                      } ${selectedDriver?.id === driver.id ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setSelectedDriver(selectedDriver?.id === driver.id ? null : driver)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {driver.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-foreground">{driver.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Flag className="w-3 h-3" />{driver.id} · {driver.country}
                              {driver.tachographLinked
                                ? <span className="text-green-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Digital Tachograph</span>
                                : <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Manual Log</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!driver.hgvLicenseValid && <Badge variant="destructive" className="text-xs">License Expired</Badge>}
                          {driver.violations.length > 0
                            ? <Badge variant="destructive" className="text-xs">{driver.violations.length} violation{driver.violations.length > 1 ? "s" : ""}</Badge>
                            : <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">Compliant</Badge>
                          }
                          <div className={`text-lg font-black ${driver.riskScore > 60 ? "text-red-500" : driver.riskScore > 30 ? "text-yellow-500" : "text-green-500"}`}>
                            {driver.riskScore}
                          </div>
                          <div className="text-xs text-muted-foreground">Risk</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <HoursBar value={driver.dailyHours} max={10} warn={9} label="Daily Hours" />
                        <HoursBar value={driver.weeklyHours} max={56} warn={50} label="Weekly Hours" />
                        <HoursBar value={driver.fortnightHours} max={90} warn={80} label="Fortnight Hours" />
                      </div>
                      {driver.violations.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {driver.violations.map((v, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-red-600">
                              <XCircle className="w-3 h-3 flex-shrink-0" />{v}
                            </div>
                          ))}
                          <Alert className="mt-2 border-red-500/30 bg-red-500/5 py-2">
                            <AlertDescription className="text-xs text-red-600">
                              ⛔ Dispatch blocked until violations resolved. Driver must complete mandatory rest before next assignment.
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                      {selectedDriver?.id === driver.id && (
                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                          <div><span className="text-muted-foreground">Continuous driving: </span><span className={driver.continuousDriving >= 4.5 ? "text-red-500 font-bold" : "text-foreground"}>{driver.continuousDriving}h</span></div>
                          <div><span className="text-muted-foreground">Last break: </span><span className="text-foreground">{driver.lastBreak} min ago</span></div>
                          <div><span className="text-muted-foreground">HGV License: </span><span className={driver.hgvLicenseValid ? "text-green-500" : "text-red-500"}>{driver.hgvLicenseValid ? "Valid" : "EXPIRED"}</span></div>
                          <div><span className="text-muted-foreground">Expiry: </span><span className="text-foreground">{driver.licenseExpiry}</span></div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: CABOTAGE ───────────────────────────────────────────── */}
          <TabsContent value="cabotage" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Truck className="w-4 h-4 text-primary" />
                  EU Cabotage Restriction Monitor
                </CardTitle>
                <CardDescription>Max 3 domestic operations within 7 days · 4-day cooling period enforcement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg mb-4 text-xs text-blue-700">
                  <strong>EU Cabotage Rule:</strong> Non-resident carriers may perform max 3 domestic transport operations in 7 days following international delivery. A mandatory 4-day cooling period applies after limit is reached.
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Host Country</TableHead>
                      <TableHead>Operations</TableHead>
                      <TableHead>Last Operation</TableHead>
                      <TableHead>Cooling Period</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_CABOTAGE.map((cab) => (
                      <TableRow key={cab.vehicleId}>
                        <TableCell>
                          <div className="font-mono text-sm font-bold text-foreground">{cab.plate}</div>
                          <div className="text-xs text-muted-foreground">{cab.vehicleId}</div>
                        </TableCell>
                        <TableCell className="text-foreground">{cab.hostCountry}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={(cab.opsCount / cab.maxOps) * 100} className={`w-16 h-2 ${cab.opsCount >= cab.maxOps ? "[&>div]:bg-red-500" : "[&>div]:bg-primary"}`} />
                            <span className={`text-sm font-bold ${cab.opsCount >= cab.maxOps ? "text-red-500" : "text-foreground"}`}>{cab.opsCount}/{cab.maxOps}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-foreground text-sm">{cab.lastOpDate}</TableCell>
                        <TableCell>
                          {cab.coolingPeriodEnd
                            ? <span className="text-red-500 text-sm font-semibold">Until {cab.coolingPeriodEnd}</span>
                            : <span className="text-green-500 text-sm">N/A</span>
                          }
                        </TableCell>
                        <TableCell>
                          {cab.restricted
                            ? <Badge variant="destructive" className="text-xs">🚫 Restricted</Badge>
                            : <Badge className="bg-green-500/20 text-green-700 border-green-500/30 text-xs">✅ Allowed</Badge>
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: LEZ & EMISSIONS ────────────────────────────────────── */}
          <TabsContent value="lez" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wind className="w-4 h-4 text-primary" />
                    Low Emission Zone Registry
                  </CardTitle>
                  <CardDescription>City-level LEZ/ULEZ restrictions and charges</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {EMISSION_ZONES.map((zone) => (
                    <div key={zone.city} className="p-3 rounded-lg border border-border bg-muted/20">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-sm text-foreground">{zone.city} <span className="text-xs text-muted-foreground">({zone.type})</span></div>
                          <div className="text-xs text-muted-foreground mt-0.5">Min required: <strong className="text-green-600">{zone.minClass}</strong></div>
                          <div className="text-xs text-red-500 mt-0.5">Restricted: {zone.restricted.join(", ")}</div>
                        </div>
                        <Badge variant={zone.chargeEUR > 0 ? "destructive" : "secondary"} className="text-xs">
                          {zone.chargeEUR > 0 ? `€${zone.chargeEUR}/day` : "No Charge"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-primary" />
                    CO₂ & Emissions KPIs
                  </CardTitle>
                  <CardDescription>Fleet emissions intelligence per Ton-KM</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Euro 6 vehicles", value: 65, pct: 65, color: "bg-green-500" },
                    { label: "Euro 5 vehicles", value: 25, pct: 25, color: "bg-yellow-500" },
                    { label: "Euro 4 vehicles", value: 10, pct: 10, color: "bg-red-500" },
                  ].map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-bold text-foreground">{item.value}%</span>
                      </div>
                      <div className="w-full bg-muted h-2 rounded-full">
                        <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="text-muted-foreground">Avg CO₂/Ton-KM</div>
                      <div className="text-xl font-black text-foreground">62g</div>
                    </div>
                    <div className="p-2 bg-muted/30 rounded">
                      <div className="text-muted-foreground">LEZ-eligible fleet</div>
                      <div className="text-xl font-black text-green-500">90%</div>
                    </div>
                  </div>
                  <Alert className="border-yellow-500/30 bg-yellow-500/5">
                    <AlertDescription className="text-xs text-yellow-700">
                      4 vehicles are Euro 4 class and restricted from Milan, Amsterdam ZEZ, and Paris ZCR zones. Route planner will auto-avoid LEZ violations.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 4: TOLL ENGINE ────────────────────────────────────────── */}
          <TabsContent value="tolls" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Euro className="w-4 h-4 text-primary" />
                  Pan-European Toll Calculation Engine
                </CardTitle>
                <CardDescription>DE LKW-MAUT · FR Autoroute · IT Autostrade · PL e-TOLL · ES Toll systems</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Country</TableHead>
                          <TableHead>Route</TableHead>
                          <TableHead className="text-right">Toll</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {MOCK_TOLLS.map((toll) => (
                          <TableRow key={toll.country}>
                            <TableCell>
                              <span className="text-lg mr-2">{toll.flag}</span>
                              <span className="text-sm font-semibold text-foreground">{toll.country}</span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{toll.route}</TableCell>
                            <TableCell className="text-right font-bold text-foreground">€{toll.amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="border-t-2">
                          <TableCell colSpan={2} className="font-bold text-foreground">Total Estimated Toll</TableCell>
                          <TableCell className="text-right text-xl font-black text-primary">€{totalToll.toFixed(2)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                  <div className="space-y-3">
                    <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                      <h4 className="font-semibold text-sm text-foreground">Cost Breakdown (Route: DE→FR→IT)</h4>
                      {[
                        { label: "Toll Costs", value: "€220.30", icon: Euro },
                        { label: "Fuel Cost", value: "€340.00", icon: Fuel },
                        { label: "Driver Cost (EU rates)", value: "€180.00", icon: Timer },
                        { label: "Maintenance Provision", value: "€45.00", icon: Activity },
                        { label: "FX Buffer (EUR)", value: "€12.00", icon: TrendingUp },
                      ].map((item) => (
                        <div key={item.label} className="flex justify-between text-sm">
                          <span className="text-muted-foreground flex items-center gap-1.5"><item.icon className="w-3.5 h-3.5" />{item.label}</span>
                          <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-bold text-foreground">Total Route Cost</span>
                        <span className="text-xl font-black text-foreground">€797.30</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Estimated Revenue</span>
                        <span className="font-bold text-green-500">€1,200.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-bold text-sm text-foreground">Route Margin</span>
                        <span className="font-black text-green-500">33.5%</span>
                      </div>
                    </div>
                    <Alert className="border-green-500/30 bg-green-500/5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-xs text-green-700">
                        Route margin (33.5%) exceeds 12% threshold. Route approved for dispatch.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 5: CROSS-BORDER VAT ───────────────────────────────────── */}
          <TabsContent value="vat" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Intra-EU VAT Intelligence
                  </CardTitle>
                  <CardDescription>Reverse charge · Intrastat · EORI validation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">VAT Scheme</Label>
                    <Select value={vatScheme} onValueChange={setVatScheme}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="domestic">Domestic (Standard VAT)</SelectItem>
                        <SelectItem value="reverse_charge">Reverse Charge (B2B Cross-border)</SelectItem>
                        <SelectItem value="intra_eu">Intra-EU Supply</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {vatScheme === "reverse_charge" && (
                    <Alert className="border-blue-500/30 bg-blue-500/5">
                      <Info className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-xs text-blue-700">
                        Reverse charge applied. VAT liability shifts to buyer. Invoice will show: "VAT reverse charged – Art. 196 EU VAT Directive."
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label className="text-xs">EORI Number</Label>
                    <Input value={eoriNumber} onChange={(e) => setEoriNumber(e.target.value)} className="font-mono text-sm" placeholder="GB123456789000" />
                    <div className="flex items-center gap-1.5 text-xs text-green-500">
                      <CheckCircle2 className="w-3 h-3" /> EORI validated against EU customs registry
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Intrastat Required</Label>
                    <div className="flex items-center gap-2">
                      <Switch defaultChecked />
                      <span className="text-xs text-muted-foreground">Auto-generate monthly Intrastat declaration</span>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg space-y-2 text-xs">
                    <div className="font-semibold text-foreground">VAT Rules by Country</div>
                    <Table>
                      <TableHeader><TableRow><TableHead className="text-xs py-1">Country</TableHead><TableHead className="text-xs py-1">Standard VAT</TableHead><TableHead className="text-xs py-1">B2B Cross-border</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {EU_COUNTRIES.slice(0, 5).map((c) => (
                          <TableRow key={c.code}>
                            <TableCell className="py-1 text-xs">{c.flag} {c.name}</TableCell>
                            <TableCell className="py-1 text-xs">{c.vatRate}%</TableCell>
                            <TableCell className="py-1 text-xs text-blue-600">Reverse Charge</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    Cross-Border Intelligence
                  </CardTitle>
                  <CardDescription>PE risk · Double-tax treaty exposure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { country: "🇩🇪 Germany", peRisk: "Low", treatyApplied: "DE-NG DTA", withholdingReduction: "5% → 0%", status: "clear" },
                    { country: "🇫🇷 France", peRisk: "Medium", treatyApplied: "FR-NG DTA", withholdingReduction: "25% → 10%", status: "review" },
                    { country: "🇮🇹 Italy", peRisk: "High", treatyApplied: "None", withholdingReduction: "Full 30%", status: "risk" },
                    { country: "🇵🇱 Poland", peRisk: "Low", treatyApplied: "EU Directive", withholdingReduction: "0% (EU)", status: "clear" },
                  ].map((row) => (
                    <div key={row.country} className={`p-3 rounded-lg border ${row.status === "risk" ? "border-red-500/30 bg-red-500/5" : row.status === "review" ? "border-yellow-500/30 bg-yellow-500/5" : "border-border bg-muted/20"}`}>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm text-foreground">{row.country}</span>
                        <Badge variant={row.status === "risk" ? "destructive" : row.status === "review" ? "outline" : "secondary"} className="text-xs">
                          PE Risk: {row.peRisk}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Treaty: {row.treatyApplied} · WHT: {row.withholdingReduction}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 6: CMR LIABILITY ──────────────────────────────────────── */}
          <TabsContent value="cmr" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    CMR Convention Liability Framework
                  </CardTitle>
                  <CardDescription>International carriage liability · Cargo insurance coverage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "CMR Liability Limit", value: "€25.00/kg", sub: "Art. 23 CMR Convention" },
                      { label: "Cargo Insured Value", value: "€180,000", sub: "per shipment" },
                      { label: "Carrier Liability Flag", value: "Active", sub: "Full CMR coverage" },
                      { label: "Insurance Valid Until", value: "2026-12-31", sub: "Annual renewal" },
                    ].map((item) => (
                      <div key={item.label} className="p-3 bg-muted/30 rounded-lg">
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="font-bold text-foreground text-sm">{item.value}</div>
                        <div className="text-xs text-muted-foreground">{item.sub}</div>
                      </div>
                    ))}
                  </div>
                  <Alert className="border-green-500/30 bg-green-500/5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-xs text-green-700">
                      CMR liability covered. Cargo value within insured limit. Carrier fully protected for international consignments.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm text-foreground">Auto-Generated EU Documents</h4>
                    {[
                      { doc: "CMR Consignment Note", status: "Ready", icon: FileText },
                      { doc: "International Waybill", status: "Ready", icon: FileText },
                      { doc: "Customs Declaration", status: "Draft", icon: FileText },
                      { doc: "Digital Proof of Delivery", status: "Ready", icon: CheckCircle2 },
                    ].map((d) => (
                      <div key={d.doc} className="flex items-center justify-between p-2 border border-border rounded text-xs">
                        <span className="flex items-center gap-2 text-foreground"><d.icon className="w-3 h-3 text-primary" />{d.doc}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={d.status === "Ready" ? "secondary" : "outline"} className="text-xs">{d.status}</Badge>
                          <Button size="sm" variant="ghost" className="h-6 text-xs gap-1"><Download className="w-3 h-3" />PDF</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Scale className="w-4 h-4 text-primary" />
                    EU Driver Payroll Adjustments
                  </CardTitle>
                  <CardDescription>Posted Workers Directive · Cross-border wage parity</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { driver: "Hans Mueller", country: "🇩🇪 Germany", baseWage: "€18.50/hr", crossBorderAllowance: "€45/day", postedWorker: false, minWageRef: "€12.82/hr" },
                    { driver: "Pierre Dubois", country: "🇫🇷 France", baseWage: "€16.00/hr", crossBorderAllowance: "€38/day", postedWorker: true, minWageRef: "€11.65/hr" },
                    { driver: "Marco Rossi", country: "🇮🇹 Italy", baseWage: "€14.50/hr", crossBorderAllowance: "€40/day", postedWorker: true, minWageRef: "N/A (NCBA)" },
                    { driver: "Jan Kowalski", country: "🇵🇱 Poland", baseWage: "€9.50/hr", crossBorderAllowance: "€35/day", postedWorker: true, minWageRef: "€4.42/hr" },
                  ].map((d) => (
                    <div key={d.driver} className="p-3 rounded-lg border border-border bg-muted/20 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="font-semibold text-foreground">{d.driver} <span className="text-muted-foreground">{d.country}</span></span>
                        {d.postedWorker && <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 text-xs">Posted Worker</Badge>}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <div>Base: <strong className="text-foreground">{d.baseWage}</strong></div>
                        <div>Allowance: <strong className="text-foreground">{d.crossBorderAllowance}</strong></div>
                        <div>Min Ref: <strong className="text-foreground">{d.minWageRef}</strong></div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 7: EU ROUTE INTELLIGENCE ─────────────────────────────── */}
          <TabsContent value="routes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-primary" />
                    European Route Intelligence
                  </CardTitle>
                  <CardDescription>Alpine restrictions · Winter alerts · Border prediction</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { route: "Brenner Pass (A22)", flag: "⛰️", alert: "Alpine weight restriction: max 7.5T per axle. Seasonal chains required Nov–Apr.", severity: "warning" },
                    { route: "UK via Channel Tunnel", flag: "🇬🇧", alert: "Post-Brexit customs declaration mandatory. EORI + T1 transit doc required. Add 2–4hr border estimate.", severity: "info" },
                    { route: "Hamburg → Warsaw (A2/A12)", flag: "🇵🇱", alert: "High-volume route. Border congestion probability: 27%. Recommend early morning crossing.", severity: "info" },
                    { route: "Munich → Milan (A8/A9)", flag: "🇮🇹", alert: "Brenner eco-point zones active. Winter tires mandatory Oct–Apr. Road closure risk during snow.", severity: "warning" },
                    { route: "Paris → Madrid (AP-7)", flag: "🇪🇸", alert: "High toll zone. Vignette required. Construction delays near Barcelona – add 45min buffer.", severity: "info" },
                  ].map((item) => (
                    <div key={item.route} className={`p-3 rounded-lg border text-xs ${item.severity === "warning" ? "border-yellow-500/30 bg-yellow-500/5" : "border-border bg-muted/20"}`}>
                      <div className="font-semibold text-foreground mb-1">{item.flag} {item.route}</div>
                      <div className="text-muted-foreground">{item.alert}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flag className="w-4 h-4 text-primary" />
                    Border Intelligence
                  </CardTitle>
                  <CardDescription>Delay risk prediction per crossing point</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <div className="text-4xl font-black text-yellow-500">{borderRisk}%</div>
                    <div className="text-sm font-semibold text-foreground">Overall Border Delay Risk Score</div>
                    <div className="text-xs text-muted-foreground">Current route: Hamburg → Warsaw → Krakow</div>
                  </div>
                  {[
                    { crossing: "DE/PL – Slubice/Frankfurt Oder", risk: 27, type: "Schengen", delay: "0–30 min" },
                    { crossing: "AT/IT – Brenner", risk: 45, type: "Schengen + Eco-check", delay: "30–60 min" },
                    { crossing: "FR/ES – La Jonquera", risk: 35, type: "Schengen", delay: "15–45 min" },
                    { crossing: "UK/FR – Dover/Calais", risk: 78, type: "Post-Brexit Full Customs", delay: "2–5 hrs" },
                  ].map((border) => (
                    <div key={border.crossing} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground font-medium">{border.crossing}</span>
                        <span className={`font-bold ${border.risk > 60 ? "text-red-500" : border.risk > 30 ? "text-yellow-500" : "text-green-500"}`}>{border.risk}%</span>
                      </div>
                      <Progress value={border.risk} className={`h-1.5 ${border.risk > 60 ? "[&>div]:bg-red-500" : border.risk > 30 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"}`} />
                      <div className="text-xs text-muted-foreground">{border.type} · Est. delay: {border.delay}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── TAB 8: DRIVER PAYROLL ─────────────────────────────────────── */}
          <TabsContent value="payroll">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  EU Driver Payroll Intelligence
                </CardTitle>
                <CardDescription>Multi-currency · Posted Workers Directive · ECB FX rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "EUR Base Rate", value: "1.000", sub: "ECB Reference" },
                    { label: "EUR/PLN", value: "4.262", sub: "Daily rate" },
                    { label: "FX Variance", value: "+0.3%", sub: "vs last week" },
                    { label: "Total Payroll (EUR)", value: "€14,820", sub: "This period" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-xs text-muted-foreground">{item.label}</div>
                      <div className="font-black text-foreground text-lg">{item.value}</div>
                      <div className="text-xs text-muted-foreground">{item.sub}</div>
                    </div>
                  ))}
                </div>
                <Alert className="border-blue-500/30 bg-blue-500/5 mb-4">
                  <Info className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="text-xs text-blue-700">
                    Posted Workers Directive applied for 3 drivers operating cross-border. Host country minimum wage applied where higher than origin country rate.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 9: AI RISK ALERTS ─────────────────────────────────────── */}
          <TabsContent value="alerts" className="space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Brain className="w-4 h-4 text-primary" />
                      AI Compliance Risk Prediction Layer
                    </CardTitle>
                    <CardDescription>Non-compliance probability · Fine exposure forecast · Country risk heatmap</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {MOCK_ALERTS.map((alert) => (
                  <div key={alert.id} className={`p-4 rounded-lg border ${
                    alert.severity === "critical" ? "border-red-500/40 bg-red-500/5" :
                    alert.severity === "warning" ? "border-yellow-500/40 bg-yellow-500/5" :
                    "border-border bg-muted/20"
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertBadge severity={alert.severity} />
                        <span className="text-xs font-semibold text-muted-foreground">{alert.module}</span>
                        <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-foreground mb-1">{alert.message}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Target className="w-3 h-3" />
                      <strong>Recommendation:</strong> {alert.recommendation}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 10: EU DASHBOARD ──────────────────────────────────────── */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  title: "Driver Violation Risk",
                  value: `${MOCK_DRIVERS.filter(d => d.violations.length).length}/4`,
                  sub: "drivers with violations",
                  score: 100 - (MOCK_DRIVERS.filter(d => d.violations.length).length / MOCK_DRIVERS.length * 100),
                  icon: Clock,
                  color: "text-red-500",
                },
                {
                  title: "Cabotage Compliance",
                  value: `${MOCK_CABOTAGE.filter(c => !c.restricted).length}/4`,
                  sub: "vehicles unrestricted",
                  score: (MOCK_CABOTAGE.filter(c => !c.restricted).length / MOCK_CABOTAGE.length) * 100,
                  icon: Truck,
                  color: "text-yellow-500",
                },
                {
                  title: "Emissions Compliance",
                  value: "90%",
                  sub: "fleet LEZ-eligible",
                  score: 90,
                  icon: Wind,
                  color: "text-green-500",
                },
                {
                  title: "Toll Exposure",
                  value: `€${totalToll.toFixed(0)}`,
                  sub: "estimated total",
                  score: 75,
                  icon: Euro,
                  color: "text-blue-500",
                },
                {
                  title: "VAT Risk",
                  value: "Low",
                  sub: "reverse charge applied",
                  score: 92,
                  icon: FileText,
                  color: "text-green-500",
                },
                {
                  title: "Route Confidence",
                  value: "88%",
                  sub: "heavy haul mode",
                  score: 88,
                  icon: Navigation,
                  color: "text-primary",
                },
              ].map((kpi) => (
                <Card key={kpi.title} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                      <span className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</span>
                    </div>
                    <div className="font-semibold text-sm text-foreground">{kpi.title}</div>
                    <div className="text-xs text-muted-foreground mb-2">{kpi.sub}</div>
                    <Progress value={kpi.score} className="h-1.5" />
                    <div className="text-xs text-right text-muted-foreground mt-0.5">{Math.round(kpi.score)}%</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Country Risk Heatmap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { country: "🇩🇪 Germany", risk: 15, issues: 1 },
                    { country: "🇫🇷 France", risk: 68, issues: 3 },
                    { country: "🇮🇹 Italy", risk: 72, issues: 2 },
                    { country: "🇵🇱 Poland", risk: 28, issues: 1 },
                    { country: "🇪🇸 Spain", risk: 55, issues: 2 },
                    { country: "🇳🇱 Netherlands", risk: 12, issues: 0 },
                    { country: "🇧🇪 Belgium", risk: 22, issues: 0 },
                    { country: "🇬🇧 UK (Brexit)", risk: 78, issues: 3 },
                  ].map((c) => (
                    <div key={c.country} className={`p-3 rounded-lg border text-center ${c.risk > 60 ? "border-red-500/30 bg-red-500/5" : c.risk > 30 ? "border-yellow-500/30 bg-yellow-500/5" : "border-green-500/30 bg-green-500/5"}`}>
                      <div className="text-sm font-semibold text-foreground">{c.country}</div>
                      <div className={`text-2xl font-black ${c.risk > 60 ? "text-red-500" : c.risk > 30 ? "text-yellow-500" : "text-green-500"}`}>{c.risk}%</div>
                      <div className="text-xs text-muted-foreground">{c.issues} issue{c.issues !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
