import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Shield, Truck, ShoppingCart, Building2, Leaf, Code, Network,
  Package, AlertTriangle, CheckCircle, ArrowRight, Eye, ChevronDown,
  ChevronRight, Lock, Coins, Ship, Sparkles, Car, Landmark,
  Pill, Wine, FileWarning, ArrowLeftRight, Layers, ArrowLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  PLATFORM_REGISTRY,
  FEATURE_REGISTRY,
  DATA_EXCHANGE_CONTRACTS,
  detectLeakages,
  getFeaturesByPlatform,
  getContractsForPlatform,
  getPlatformHealth,
  type PlatformId,
  type PlatformCategory,
  type LeakageSeverity,
  type DataSensitivity,
} from "@/lib/platform/registry";

// ─── Icon Mapping ────────────────────────────────────────────────
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck, ShoppingCart, Wine, Leaf, Pill, Building2, Sparkles,
  Landmark, Car, Package, Network, Coins, Code, Shield, Ship,
};

const CATEGORY_LABELS: Record<PlatformCategory, { label: string; color: string }> = {
  operator: { label: "Operator OS", color: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  industry: { label: "Industry OS", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  marketplace: { label: "Marketplace", color: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  infrastructure: { label: "Infrastructure", color: "bg-slate-500/10 text-slate-700 dark:text-slate-400" },
  standalone: { label: "Standalone", color: "bg-violet-500/10 text-violet-700 dark:text-violet-400" },
};

const SEVERITY_CONFIG: Record<LeakageSeverity, { color: string; bg: string }> = {
  critical: { color: "text-red-700 dark:text-red-400", bg: "bg-red-500/10" },
  high: { color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-500/10" },
  medium: { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  low: { color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10" },
};

const SENSITIVITY_BADGE: Record<DataSensitivity, string> = {
  public: "bg-green-500/10 text-green-700",
  internal: "bg-blue-500/10 text-blue-700",
  confidential: "bg-amber-500/10 text-amber-700",
  restricted: "bg-red-500/10 text-red-700",
};

const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

export default function ProductControlTower() {
  const navigate = useNavigate();
  const [expandedPlatform, setExpandedPlatform] = useState<PlatformId | null>(null);
  const health = useMemo(() => getPlatformHealth(), []);
  const leakages = useMemo(() => detectLeakages(), []);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ─── Back Button ─────────────────────────────────────── */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {/* ─── Header ──────────────────────────────────────────── */}
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mb-8">
            <motion.div variants={fadeUp} className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-foreground/5 flex items-center justify-center">
                <Layers className="h-5 w-5 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Product Architecture Control Tower</h1>
                <p className="text-sm text-muted-foreground">Core Team Only - Platform registry, feature ownership, boundary governance, and leakage detection</p>
              </div>
            </motion.div>
          </motion.div>

          {/* ─── Health Summary Cards ────────────────────────────── */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: "Active Platforms", value: health.platforms.length, icon: Shield, accent: "text-foreground" },
              { label: "Registered Features", value: health.totalFeatures, icon: Package, accent: "text-foreground" },
              { label: "Data Contracts", value: health.totalContracts, icon: ArrowLeftRight, accent: "text-foreground" },
              {
                label: "Leakage Alerts",
                value: health.totalLeakages,
                icon: AlertTriangle,
                accent: health.totalLeakages > 0 ? "text-destructive" : "text-foreground",
              },
            ].map((stat) => (
              <motion.div key={stat.label} variants={fadeUp}>
                <Card className="border border-border/50">
                  <CardContent className="pt-5 pb-4 px-5">
                    <div className="flex items-center justify-between mb-2">
                      <stat.icon className={`h-4 w-4 ${stat.accent}`} />
                      <span className={`text-2xl font-bold tabular-nums ${stat.accent}`}>
                        {stat.value}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          {/* ─── Main Tabs ───────────────────────────────────────── */}
          <Tabs defaultValue="platforms" className="space-y-6">
            <TabsList className="bg-muted/50 p-1 h-auto flex-wrap">
              <TabsTrigger value="platforms" className="text-xs">Platform Registry</TabsTrigger>
              <TabsTrigger value="features" className="text-xs">Feature Ownership</TabsTrigger>
              <TabsTrigger value="leakage" className="text-xs">
                Leakage Detector
                {leakages.length > 0 && (
                  <Badge variant="destructive" className="ml-1.5 h-4 px-1 text-[10px]">{leakages.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="contracts" className="text-xs">Data Contracts</TabsTrigger>
              <TabsTrigger value="identity" className="text-xs">Identity Boundaries</TabsTrigger>
            </TabsList>

            {/* ═══ Platform Registry ═══ */}
            <TabsContent value="platforms">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-3">
                {(["operator", "industry", "marketplace", "infrastructure", "standalone"] as PlatformCategory[]).map((cat) => {
                  const platforms = health.platforms.filter((p) => p.category === cat);
                  if (platforms.length === 0) return null;
                  return (
                    <motion.div key={cat} variants={fadeUp}>
                      <div className="flex items-center gap-2 mb-3 mt-4">
                        <Badge className={`${CATEGORY_LABELS[cat].color} border-0 text-[10px] uppercase tracking-wider font-semibold`}>
                          {CATEGORY_LABELS[cat].label}
                        </Badge>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {platforms.map((p) => {
                          const Icon = PLATFORM_ICONS[p.icon] || Shield;
                          const isExpanded = expandedPlatform === p.id;
                          const features = getFeaturesByPlatform(p.id);
                          return (
                            <Card
                              key={p.id}
                              className={`border transition-all duration-200 cursor-pointer hover:shadow-md ${
                                isExpanded ? "ring-1 ring-primary/30 shadow-md" : "border-border/50"
                              }`}
                              onClick={() => setExpandedPlatform(isExpanded ? null : p.id)}
                            >
                              <CardContent className="pt-4 pb-4 px-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-9 h-9 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                                    <Icon className="h-4 w-4 text-foreground" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <h3 className="text-sm font-semibold text-foreground truncate">{p.shortName}</h3>
                                      {p.independentAuth && (
                                        <Tooltip>
                                          <TooltipTrigger>
                                            <Lock className="h-3 w-3 text-muted-foreground" />
                                          </TooltipTrigger>
                                          <TooltipContent className="text-xs">Independent auth</TooltipContent>
                                        </Tooltip>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{p.description}</p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                                      <span>{features.length} features</span>
                                      <span>{p.primaryRoles.length} roles</span>
                                      <span>{p.tenantTypes.length} tenant types</span>
                                      {p.leakageCount > 0 && (
                                        <span className="text-destructive font-medium">{p.leakageCount} leaks</span>
                                      )}
                                    </div>
                                  </div>
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                  )}
                                </div>

                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="mt-4 pt-3 border-t border-border/50 space-y-3"
                                  >
                                    <div>
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Roles</p>
                                      <div className="flex flex-wrap gap-1">
                                        {p.primaryRoles.map((r) => (
                                          <Badge key={r} variant="outline" className="text-[10px] h-5">{r}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Tenant Types</p>
                                      <div className="flex flex-wrap gap-1">
                                        {p.tenantTypes.map((t) => (
                                          <Badge key={t} variant="secondary" className="text-[10px] h-5">{t}</Badge>
                                        ))}
                                      </div>
                                    </div>
                                    {features.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Registered Features</p>
                                        <div className="space-y-1">
                                          {features.map((f) => (
                                            <div key={f.id} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-muted/30">
                                              <span className="text-foreground">{f.name}</span>
                                              <div className="flex items-center gap-1.5">
                                                <Badge className={`${SENSITIVITY_BADGE[f.dataSensitivity]} border-0 text-[9px] h-4`}>
                                                  {f.dataSensitivity}
                                                </Badge>
                                                {f.pricingDependency && (
                                                  <Badge variant="outline" className="text-[9px] h-4">{f.pricingDependency}</Badge>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </motion.div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </TabsContent>

            {/* ═══ Feature Ownership Matrix ═══ */}
            <TabsContent value="features">
              <motion.div initial="hidden" animate="visible" variants={stagger}>
                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Feature Ownership Registry</CardTitle>
                    <p className="text-xs text-muted-foreground">Every feature assigned to exactly one platform with role, pricing, and data sensitivity metadata.</p>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="max-h-[600px]">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50 sticky top-0 z-10">
                          <tr>
                            <th className="text-left py-2.5 px-4 font-medium text-muted-foreground">Feature</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Platform</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Group</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Plan</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Sensitivity</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">AI</th>
                            <th className="text-left py-2.5 px-3 font-medium text-muted-foreground">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {FEATURE_REGISTRY.map((f) => (
                            <motion.tr key={f.id} variants={fadeUp} className="hover:bg-muted/20 transition-colors">
                              <td className="py-2 px-4">
                                <div className="font-medium text-foreground">{f.name}</div>
                                {f.route && <div className="text-[10px] text-muted-foreground font-mono">{f.route}</div>}
                              </td>
                              <td className="py-2 px-3">
                                <Badge variant="outline" className="text-[10px] h-5">
                                  {PLATFORM_REGISTRY.find((p) => p.id === f.owningPlatform)?.shortName}
                                </Badge>
                              </td>
                              <td className="py-2 px-3 text-muted-foreground">{f.moduleGroup}</td>
                              <td className="py-2 px-3">
                                {f.pricingDependency ? (
                                  <Badge variant="secondary" className="text-[10px] h-5 capitalize">{f.pricingDependency}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">Free</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Badge className={`${SENSITIVITY_BADGE[f.dataSensitivity]} border-0 text-[10px] h-5`}>
                                  {f.dataSensitivity}
                                </Badge>
                              </td>
                              <td className="py-2 px-3">
                                {f.aiCreditDependency ? (
                                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Badge
                                  className={`border-0 text-[10px] h-5 ${
                                    f.status === "active" ? "bg-emerald-500/10 text-emerald-700" :
                                    f.status === "beta" ? "bg-blue-500/10 text-blue-700" :
                                    f.status === "deprecated" ? "bg-red-500/10 text-red-700" :
                                    "bg-slate-500/10 text-slate-700"
                                  }`}
                                >
                                  {f.status}
                                </Badge>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ═══ Leakage Detector ═══ */}
            <TabsContent value="leakage">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-4">
                {leakages.length === 0 ? (
                  <Card className="border-border/50">
                    <CardContent className="py-12 text-center">
                      <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
                      <h3 className="font-semibold text-foreground mb-1">No Boundary Leakages Detected</h3>
                      <p className="text-xs text-muted-foreground">All features are correctly assigned to their owning platforms.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <FileWarning className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-semibold text-foreground">
                        {leakages.length} boundary violation{leakages.length !== 1 ? "s" : ""} detected
                      </span>
                    </div>
                    {leakages.map((leak) => (
                      <motion.div key={leak.id} variants={fadeUp}>
                        <Card className={`border-l-4 ${
                          leak.severity === "critical" ? "border-l-red-500" :
                          leak.severity === "high" ? "border-l-orange-500" :
                          leak.severity === "medium" ? "border-l-yellow-500" :
                          "border-l-blue-500"
                        } border-border/50`}>
                          <CardContent className="py-4 px-5">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={`${SEVERITY_CONFIG[leak.severity].bg} ${SEVERITY_CONFIG[leak.severity].color} border-0 text-[10px] uppercase`}>
                                    {leak.severity}
                                  </Badge>
                                  <h4 className="text-sm font-semibold text-foreground">{leak.featureName}</h4>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">{leak.description}</p>
                                <div className="flex items-center gap-2 text-xs">
                                  <Badge variant="outline" className="text-[10px]">
                                    {PLATFORM_REGISTRY.find((p) => p.id === leak.currentPlatform)?.shortName}
                                  </Badge>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                                    {PLATFORM_REGISTRY.find((p) => p.id === leak.correctPlatform)?.shortName}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-[10px] text-muted-foreground mb-2">Recommendation</p>
                                <p className="text-xs text-foreground max-w-[200px]">{leak.recommendation}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            </TabsContent>

            {/* ═══ Data Exchange Contracts ═══ */}
            <TabsContent value="contracts">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">
                  Governed data exchange contracts between platforms. No uncontrolled cross-platform data access allowed.
                </p>
                {DATA_EXCHANGE_CONTRACTS.map((contract) => (
                  <motion.div key={contract.id} variants={fadeUp}>
                    <Card className="border-border/50">
                      <CardContent className="py-4 px-5">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="outline" className="text-[10px]">
                            {PLATFORM_REGISTRY.find((p) => p.id === contract.sourcePlatform)?.shortName}
                          </Badge>
                          <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <Badge variant="outline" className="text-[10px]">
                            {PLATFORM_REGISTRY.find((p) => p.id === contract.destinationPlatform)?.shortName}
                          </Badge>
                          <div className="flex-1" />
                          <Badge className={`border-0 text-[10px] ${contract.isActive ? "bg-emerald-500/10 text-emerald-700" : "bg-red-500/10 text-red-700"}`}>
                            {contract.isActive ? "Active" : "Revoked"}
                          </Badge>
                        </div>
                        <p className="text-xs text-foreground mb-3">{contract.purpose}</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Allowed Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {contract.allowedFields.map((f) => (
                                <Badge key={f} variant="secondary" className="text-[9px] h-4 font-mono">{f}</Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-medium text-muted-foreground uppercase mb-1">Masked Fields</p>
                            <div className="flex flex-wrap gap-1">
                              {contract.maskedFields.map((f) => (
                                <Badge key={f} className="bg-red-500/10 text-red-700 border-0 text-[9px] h-4 font-mono">{f}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                          {contract.requiresTenantAuth && (
                            <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Tenant auth required</span>
                          )}
                          {contract.requiresRoleAuth && (
                            <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Role auth required</span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>
            </TabsContent>

            {/* ═══ Identity Boundaries ═══ */}
            <TabsContent value="identity">
              <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-4">
                {/* RouteAce vs PortoDash */}
                <motion.div variants={fadeUp}>
                  <Card className="border-border/50 border-l-4 border-l-violet-500">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4" />
                        RouteAce ↔ PortoDash Identity Boundary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { label: "Shared Login", value: "Blocked", status: "enforced" },
                          { label: "Cross-Platform Session", value: "Isolated", status: "enforced" },
                          { label: "API Interop Only", value: "Enabled", status: "active" },
                        ].map((rule) => (
                          <div key={rule.label} className="rounded-lg bg-muted/30 p-3">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{rule.label}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-sm font-medium text-foreground">{rule.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted/20 rounded-lg p-3 text-xs text-muted-foreground">
                        <strong className="text-foreground">Rule:</strong> Same company may own accounts on both platforms, but credentials, sessions, tenants, and roles remain strictly platform-specific. Data exchange occurs only through authorized API contracts with audit logging.
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Independent Auth Platforms */}
                <motion.div variants={fadeUp}>
                  <Card className="border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Platform Authentication Boundaries</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {PLATFORM_REGISTRY.map((p) => {
                          const Icon = PLATFORM_ICONS[p.icon] || Shield;
                          return (
                            <div key={p.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/20 transition-colors">
                              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-xs font-medium text-foreground flex-1">{p.shortName}</span>
                              <Badge
                                className={`text-[10px] h-5 border-0 ${
                                  p.independentAuth
                                    ? "bg-violet-500/10 text-violet-700"
                                    : "bg-slate-500/10 text-slate-700"
                                }`}
                              >
                                {p.independentAuth ? "Independent Auth" : "Shared Auth"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5">
                                {p.tenantTypes.length} tenant type{p.tenantTypes.length !== 1 ? "s" : ""}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
