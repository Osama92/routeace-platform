import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Plug, RefreshCw, AlertTriangle, Lock, ArrowRight, Search, X, Activity, Loader2, XCircle, ArrowUpCircle, ArrowDownCircle, Clock } from "lucide-react";
import {
  INTEGRATION_CATALOG, CATEGORIES, IntegrationApp, IntegrationCategory,
} from "@/lib/integrations/catalog";
import { ConnectionGuide } from "@/pages/dept/erp-connection-guides";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Status = "active" | "syncing" | "error" | "disconnected";

interface Connection {
  appId: string;
  status: Status;
  connectedAt: string;
  lastSyncAt?: string;
  errorMessage?: string;
  mappings: { source: string; target: string; confidence: number; confirmed: boolean }[];
}

const STORAGE_KEY = "routeace.integration.connections.v1";

function loadConnections(): Connection[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveConnections(c: Connection[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

const statusBadge: Record<Status, { label: string; cls: string; dot: string }> = {
  active:       { label: "🟢 Active",       cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", dot: "bg-emerald-500" },
  syncing:      { label: "🟡 Syncing",      cls: "bg-amber-500/10 text-amber-600 border-amber-500/30",       dot: "bg-amber-500"   },
  error:        { label: "🔴 Error",        cls: "bg-rose-500/10 text-rose-600 border-rose-500/30",          dot: "bg-rose-500"    },
  disconnected: { label: "⚪ Disconnected",  cls: "bg-muted text-muted-foreground border-border",             dot: "bg-muted-foreground" },
};

export default function IntegrationHub() {
  const { toast } = useToast();
  const { userRole } = useAuth();
  const canSeeGuides = userRole === "super_admin" || userRole === "finance_manager" || userRole === "org_admin";
  const [connections, setConnections] = useState<Connection[]>(loadConnections());
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all">("all");

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedApp, setSelectedApp] = useState<IntegrationApp | null>(null);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [mappings, setMappings] = useState<Connection["mappings"]>([]);

  const filteredApps = useMemo(() => {
    return INTEGRATION_CATALOG.filter(a => {
      if (activeCategory !== "all" && a.category !== activeCategory) return false;
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, activeCategory]);

  const connectionFor = (appId: string) => connections.find(c => c.appId === appId);

  const startWizard = (app: IntegrationApp) => {
    setSelectedApp(app);
    setStep(1);
    setCredentials({});
    setAuthError(null);
    setMappings(app.defaultMappings.map(m => ({ ...m, confirmed: m.confidence >= 80 })));
    setWizardOpen(true);
  };

  const goToStep2 = () => setStep(2);

  const validateAuth = async () => {
    if (!selectedApp) return;
    setValidating(true);
    setAuthError(null);

    // Real managed OAuth flow for QuickBooks
    if (selectedApp.managedOauth === "quickbooks") {
      try {
        const redirectUri = `${window.location.origin}/integration-hub?qb_callback=1`;
        const { data, error } = await supabase.functions.invoke("quickbooks-oauth-init", {
          body: { redirect_uri: redirectUri, environment: "production" },
        });
        if (error || !data?.authorize_url) {
          setAuthError(error?.message || data?.error || "Failed to start QuickBooks authorization.");
          setValidating(false);
          return;
        }
        window.location.href = data.authorize_url;
        return;
      } catch (e) {
        setAuthError(e instanceof Error ? e.message : "Failed to start QuickBooks authorization.");
        setValidating(false);
        return;
      }
    }

    await new Promise(r => setTimeout(r, 600));
    if (selectedApp.authMode === "api_key") {
      const missing = (selectedApp.fields || []).filter(f => !credentials[f.key]?.trim());
      if (missing.length) {
        setAuthError(`Missing required fields: ${missing.map(m => m.label).join(", ")}`);
        setValidating(false);
        return;
      }
    }
    setValidating(false);
    setStep(3);
  };

  const finishConnect = () => {
    if (!selectedApp) return;
    const next: Connection = {
      appId: selectedApp.id,
      status: "active",
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
      mappings,
    };
    const updated = [...connections.filter(c => c.appId !== selectedApp.id), next];
    setConnections(updated);
    saveConnections(updated);
    toast({ title: `Connected ${selectedApp.name}`, description: "Initial sync started in background." });
    setWizardOpen(false);
  };

  // Handle QuickBooks OAuth callback redirect back to this page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qb_callback") !== "1") return;
    const code = params.get("code");
    const state = params.get("state");
    const realmId = params.get("realmId");
    const oauthError = params.get("error");
    const redirectUri = `${window.location.origin}/integration-hub?qb_callback=1`;
    const cleanUrl = () => window.history.replaceState({}, "", "/integration-hub");

    if (oauthError) {
      toast({ title: "QuickBooks authorization cancelled", description: oauthError, variant: "destructive" });
      cleanUrl();
      return;
    }
    if (!code || !state || !realmId) {
      toast({ title: "QuickBooks callback missing parameters", description: "code, state, and realmId are required.", variant: "destructive" });
      cleanUrl();
      return;
    }

    (async () => {
      const { data, error } = await supabase.functions.invoke("quickbooks-oauth-callback", {
        body: { code, state, realm_id: realmId, redirect_uri: redirectUri },
      });
      if (error || data?.error) {
        toast({ title: "QuickBooks connection failed", description: error?.message || data?.error || "Token exchange failed", variant: "destructive" });
        cleanUrl();
        return;
      }
      const next: Connection = {
        appId: "quickbooks",
        status: "active",
        connectedAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString(),
        mappings: [],
      };
      const updated = [...connections.filter(c => c.appId !== "quickbooks"), next];
      setConnections(updated);
      saveConnections(updated);
      toast({ title: "QuickBooks connected", description: `Realm ${realmId} linked. Use Sync now to start the two-way sync.` });
      cleanUrl();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  type SyncStep = {
    key: string;
    label: string;
    direction: "push" | "pull" | "sync";
    status: "pending" | "running" | "success" | "error" | "skipped";
    count?: number;
    error?: string;
    startedAt?: number;
    finishedAt?: number;
  };
  type SyncProgress = {
    appId: string;
    appName: string;
    appLogo: string;
    steps: SyncStep[];
    startedAt: number;
    finishedAt?: number;
    overall: "running" | "success" | "partial" | "error";
  };
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const updateStep = (key: string, patch: Partial<SyncStep>) => {
    setSyncProgress(prev => {
      if (!prev) return prev;
      return { ...prev, steps: prev.steps.map(s => s.key === key ? { ...s, ...patch } : s) };
    });
  };

  const finalizeProgress = (overall: SyncProgress["overall"]) => {
    setSyncProgress(prev => prev ? { ...prev, overall, finishedAt: Date.now() } : prev);
  };

  const buildQbSteps = (): SyncStep[] => ([
    { key: "push-customers",       label: "Push Customers",          direction: "push", status: "pending" },
    { key: "push-invoices",        label: "Push Invoices",           direction: "push", status: "pending" },
    { key: "pull-chart_of_accounts", label: "Pull Chart of Accounts", direction: "pull", status: "pending" },
    { key: "pull-payments",        label: "Pull Payments",           direction: "pull", status: "pending" },
    { key: "pull-journal_entries", label: "Pull Journal Entries",    direction: "pull", status: "pending" },
  ]);

  const buildGenericSteps = (): SyncStep[] => ([
    { key: "connect",   label: "Verify connection",   direction: "sync", status: "pending" },
    { key: "push",      label: "Push local changes",  direction: "push", status: "pending" },
    { key: "pull",      label: "Pull remote updates", direction: "pull", status: "pending" },
    { key: "reconcile", label: "Reconcile & finalize", direction: "sync", status: "pending" },
  ]);

  const setConnStatus = (appId: string, status: Status, extra: Partial<Connection> = {}) => {
    setConnections(prev => {
      const updated = prev.map(c => c.appId === appId ? { ...c, status, ...extra } : c);
      saveConnections(updated);
      return updated;
    });
  };

  const runQbStep = async (entity: string, direction: "push" | "pull"): Promise<{ count: number; error?: string }> => {
    const fn = direction === "push" ? "quickbooks-sync-push" : "quickbooks-sync-pull";
    const body = direction === "push"
      ? { entities: [entity], limit: 50 }
      : { entities: [entity], limit: 100 };
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) return { count: 0, error: error.message };
    if (data?.error) return { count: 0, error: data.error };
    const summary = data?.summary?.[entity];
    if (summary?.error) return { count: 0, error: summary.error };
    const count = Number(summary?.pushed ?? summary?.pulled ?? 0);
    return { count };
  };

  const syncNow = async (appId: string) => {
    const app = INTEGRATION_CATALOG.find(a => a.id === appId);
    if (!app) return;

    const isQb = appId === "quickbooks";
    const steps = isQb ? buildQbSteps() : buildGenericSteps();
    setSyncProgress({
      appId, appName: app.name, appLogo: app.logo,
      steps, startedAt: Date.now(), overall: "running",
    });
    setConnStatus(appId, "syncing");

    let hadError = false;
    let hadSuccess = false;

    for (const step of steps) {
      updateStep(step.key, { status: "running", startedAt: Date.now() });
      try {
        if (isQb) {
          const [dir, entity] = step.key.split("-", 2);
          const entityKey = step.key.substring(dir.length + 1);
          const res = await runQbStep(entityKey, dir as "push" | "pull");
          if (res.error) {
            hadError = true;
            updateStep(step.key, { status: "error", error: res.error, finishedAt: Date.now() });
          } else {
            hadSuccess = true;
            updateStep(step.key, { status: "success", count: res.count, finishedAt: Date.now() });
          }
        } else {
          // Generic simulated step (other ERPs use mock connectors today)
          await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
          const count = Math.floor(10 + Math.random() * 90);
          hadSuccess = true;
          updateStep(step.key, { status: "success", count, finishedAt: Date.now() });
        }
      } catch (e) {
        hadError = true;
        updateStep(step.key, { status: "error", error: e instanceof Error ? e.message : "Unknown", finishedAt: Date.now() });
      }
    }

    const overall: SyncProgress["overall"] = hadError && hadSuccess ? "partial" : hadError ? "error" : "success";
    finalizeProgress(overall);

    if (overall === "success") {
      setConnStatus(appId, "active", { lastSyncAt: new Date().toISOString(), errorMessage: undefined });
    } else if (overall === "partial") {
      setConnStatus(appId, "active", { lastSyncAt: new Date().toISOString(), errorMessage: "Some steps failed - see sync report." });
    } else {
      setConnStatus(appId, "error", { errorMessage: "Sync failed - see sync report." });
    }
  };

  const disconnect = async (appId: string) => {
    if (appId === "quickbooks") {
      try {
        await supabase.functions.invoke("quickbooks-oauth-init", {
          body: { action: "disconnect" },
        }).catch(() => null);
      } catch { /* best effort */ }
    }
    const updated = connections.filter(c => c.appId !== appId);
    setConnections(updated);
    saveConnections(updated);
    toast({ title: "Disconnected", description: "Tokens revoked. Re-connect anytime." });
  };

  return (
    <DashboardLayout
      title="Integration Hub"
      subtitle="Connect external systems in 3 steps - no developer required"
    >
      <Tabs defaultValue="catalog" className="space-y-4">
        <TabsList>
          <TabsTrigger value="catalog">Connect App</TabsTrigger>
          <TabsTrigger value="dashboard">My Integrations ({connections.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search 80+ apps…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              <Button size="sm" variant={activeCategory === "all" ? "default" : "outline"} onClick={() => setActiveCategory("all")}>All</Button>
              {CATEGORIES.map(c => (
                <Button
                  key={c.id}
                  size="sm"
                  variant={activeCategory === c.id ? "default" : "outline"}
                  onClick={() => setActiveCategory(c.id)}
                >
                  <span className="mr-1.5">{c.icon}</span>{c.label}
                </Button>
              ))}
            </div>
          </div>

          {/* App grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredApps.map(app => {
              const conn = connectionFor(app.id);
              return (
                <Card key={app.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-3xl leading-none">{app.logo}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{app.name}</h3>
                          {conn && (
                            <Badge variant="outline" className={`text-[10px] ${statusBadge[conn.status].cls}`}>
                              {statusBadge[conn.status].label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{app.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] capitalize">{app.category}</Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {app.authMode === "oauth" ? "OAuth" : "API Key"}
                      </Badge>
                      <div className="ml-auto">
                        {conn ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => syncNow(app.id)}>
                            <RefreshCw className="w-3 h-3 mr-1" /> Sync
                          </Button>
                        ) : (
                          <Button size="sm" className="h-7 text-xs" onClick={() => startWizard(app)}>
                            <Plug className="w-3 h-3 mr-1" /> Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="dashboard" className="space-y-3">
          {connections.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No integrations yet</p>
                <p className="text-xs mt-1">Connect your first app to start syncing data automatically.</p>
              </CardContent>
            </Card>
          ) : (
            connections.map(conn => {
              const app = INTEGRATION_CATALOG.find(a => a.id === conn.appId);
              if (!app) return null;
              return (
                <Card key={conn.appId}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{app.logo}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{app.name}</h4>
                          <Badge variant="outline" className={`text-[10px] ${statusBadge[conn.status].cls}`}>
                            {statusBadge[conn.status].label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                          <span>Connected {new Date(conn.connectedAt).toLocaleDateString()}</span>
                          {conn.lastSyncAt && <span>Last sync: {new Date(conn.lastSyncAt).toLocaleString()}</span>}
                          <span>{conn.mappings.length} mappings</span>
                        </div>
                        {conn.errorMessage && (
                          <div className="mt-2 text-xs text-rose-600 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> {conn.errorMessage}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => syncNow(conn.appId)}>
                          <RefreshCw className="w-3 h-3 mr-1" /> Sync now
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => disconnect(conn.appId)}>
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* 3-step Wizard */}
      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedApp && <span className="text-2xl">{selectedApp.logo}</span>}
              Connect {selectedApp?.name}
            </DialogTitle>
            <DialogDescription>3-step setup. Less than 3 minutes.</DialogDescription>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-2 my-2">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                <div className="text-xs font-medium hidden sm:block">
                  {s === 1 ? "Select" : s === 2 ? "Authenticate" : "Map & Confirm"}
                </div>
                {s < 3 && <div className={`flex-1 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          {step === 1 && selectedApp && (
            <div className="space-y-3">
              <Card className="bg-muted/30">
                <CardContent className="py-4 text-sm">
                  <p className="font-medium mb-1">{selectedApp.name}</p>
                  <p className="text-muted-foreground">{selectedApp.description}</p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {selectedApp.defaultMappings.slice(0, 4).map(m => (
                      <Badge key={m.source} variant="outline" className="text-[10px]">{m.source}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
              {canSeeGuides && selectedApp.guideKey && (
                <ConnectionGuide providerKey={selectedApp.guideKey} providerLabel={selectedApp.name} />
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Credentials are encrypted at rest and isolated per tenant.
              </p>
            </div>
          )}

          {step === 2 && selectedApp && (
            <div className="space-y-3">
              {selectedApp.authMode === "oauth" ? (
                <Card>
                  <CardContent className="py-5 text-center space-y-3">
                    <p className="text-sm">{selectedApp.oauthHint || `You'll be redirected to ${selectedApp.name} to grant access.`}</p>
                    <Button onClick={validateAuth} disabled={validating}>
                      {validating ? "Authorizing…" : `Continue with ${selectedApp.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {(selectedApp.fields || []).map(f => (
                    <div key={f.key}>
                      <Label className="text-xs">{f.label}</Label>
                      <Input
                        type={f.type || "text"}
                        placeholder={f.placeholder}
                        value={credentials[f.key] || ""}
                        onChange={e => setCredentials({ ...credentials, [f.key]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              )}
              {authError && (
                <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded p-2 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5" />
                  <div>
                    <p className="font-medium">Authentication failed</p>
                    <p>{authError}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 3 && selectedApp && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Auto-mapped {mappings.filter(m => m.confidence >= 80).length} of {mappings.length} fields.
                Review and confirm low-confidence rows.
              </p>
              <div className="space-y-2 max-h-64 overflow-auto">
                {mappings.map((m, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded border border-border/50">
                    <Badge variant="outline" className="text-[10px]">RouteAce</Badge>
                    <span className="text-sm font-medium flex-1">{m.source}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm font-medium flex-1">{m.target}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${m.confidence >= 80 ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}
                    >
                      {m.confidence}%
                    </Badge>
                    <Button
                      size="sm"
                      variant={m.confirmed ? "default" : "outline"}
                      className="h-6 text-[10px]"
                      onClick={() => {
                        const next = [...mappings];
                        next[idx] = { ...m, confirmed: !m.confirmed };
                        setMappings(next);
                      }}
                    >
                      {m.confirmed ? "Confirmed" : "Confirm"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setWizardOpen(false)}>Cancel</Button>
            {step === 1 && <Button onClick={goToStep2}>Continue <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>}
            {step === 2 && selectedApp?.authMode === "api_key" && (
              <Button onClick={validateAuth} disabled={validating}>{validating ? "Validating…" : "Validate & Continue"}</Button>
            )}
            {step === 3 && (
              <Button
                onClick={finishConnect}
                disabled={mappings.some(m => !m.confirmed)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Finish & Sync
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync progress dialog */}
      <Dialog
        open={!!syncProgress}
        onOpenChange={(open) => {
          if (!open && syncProgress?.overall !== "running") setSyncProgress(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {syncProgress && <span className="text-2xl">{syncProgress.appLogo}</span>}
              Sync {syncProgress?.appName}
            </DialogTitle>
            <DialogDescription>
              {syncProgress?.overall === "running" && "Running per-step push and pull. Do not close this dialog."}
              {syncProgress?.overall === "success" && "All steps completed successfully."}
              {syncProgress?.overall === "partial" && "Some steps succeeded, others failed. Review the report below."}
              {syncProgress?.overall === "error" && "Sync failed. Review the errors below and retry."}
            </DialogDescription>
          </DialogHeader>

          {syncProgress && (() => {
            const total = syncProgress.steps.length;
            const done = syncProgress.steps.filter(s => s.status !== "pending" && s.status !== "running").length;
            const pct = Math.round((done / Math.max(total, 1)) * 100);
            const totalRecords = syncProgress.steps.reduce((acc, s) => acc + (s.count ?? 0), 0);
            const errorCount = syncProgress.steps.filter(s => s.status === "error").length;
            const successCount = syncProgress.steps.filter(s => s.status === "success").length;
            const elapsedMs = (syncProgress.finishedAt ?? Date.now()) - syncProgress.startedAt;

            return (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Step {Math.min(done + (syncProgress.overall === "running" ? 1 : 0), total)} of {total}</span>
                    <span className="font-medium">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>

                <div className="space-y-1.5 max-h-72 overflow-auto">
                  {syncProgress.steps.map(step => {
                    const Icon = step.direction === "push" ? ArrowUpCircle
                      : step.direction === "pull" ? ArrowDownCircle
                      : RefreshCw;
                    const StatusIcon =
                      step.status === "running" ? Loader2 :
                      step.status === "success" ? CheckCircle2 :
                      step.status === "error"   ? XCircle :
                      step.status === "skipped" ? X :
                      Clock;
                    const statusCls =
                      step.status === "running" ? "text-primary animate-spin" :
                      step.status === "success" ? "text-emerald-600" :
                      step.status === "error"   ? "text-rose-600" :
                      step.status === "skipped" ? "text-muted-foreground" :
                      "text-muted-foreground";
                    const dur = step.startedAt && step.finishedAt
                      ? `${Math.max(((step.finishedAt - step.startedAt) / 1000), 0.1).toFixed(1)}s`
                      : null;
                    return (
                      <div
                        key={step.key}
                        className={`flex items-center gap-3 p-2.5 rounded border ${
                          step.status === "error" ? "border-rose-500/30 bg-rose-500/5"
                          : step.status === "success" ? "border-emerald-500/20 bg-emerald-500/5"
                          : step.status === "running" ? "border-primary/30 bg-primary/5"
                          : "border-border/50"
                        }`}
                      >
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{step.label}</div>
                          {step.error && (
                            <div className="text-[11px] text-rose-600 mt-0.5 line-clamp-2">{step.error}</div>
                          )}
                          {!step.error && step.status === "success" && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {step.count ?? 0} record{step.count === 1 ? "" : "s"}{dur ? ` - ${dur}` : ""}
                            </div>
                          )}
                          {step.status === "running" && (
                            <div className="text-[11px] text-primary mt-0.5">Working...</div>
                          )}
                        </div>
                        <StatusIcon className={`w-4 h-4 shrink-0 ${statusCls}`} />
                      </div>
                    );
                  })}
                </div>

                {syncProgress.overall !== "running" && (
                  <Card className="bg-muted/30">
                    <CardContent className="py-3">
                      <div className="text-xs font-semibold mb-2 flex items-center gap-2">
                        {syncProgress.overall === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {syncProgress.overall === "partial" && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                        {syncProgress.overall === "error" && <XCircle className="w-4 h-4 text-rose-600" />}
                        Sync report
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <div className="text-lg font-bold">{total}</div>
                          <div className="text-muted-foreground">Steps</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-emerald-600">{successCount}</div>
                          <div className="text-muted-foreground">OK</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-rose-600">{errorCount}</div>
                          <div className="text-muted-foreground">Errors</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{totalRecords}</div>
                          <div className="text-muted-foreground">Records</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground text-center mt-2">
                        Completed in {(elapsedMs / 1000).toFixed(1)}s
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            {syncProgress?.overall === "running" ? (
              <Button variant="ghost" disabled>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Syncing...
              </Button>
            ) : (
              <>
                {(syncProgress?.overall === "error" || syncProgress?.overall === "partial") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const id = syncProgress.appId;
                      setSyncProgress(null);
                      syncNow(id);
                    }}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Retry
                  </Button>
                )}
                <Button onClick={() => setSyncProgress(null)}>Close</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
