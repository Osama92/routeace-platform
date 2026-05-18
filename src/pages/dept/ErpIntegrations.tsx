import { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plug, RefreshCw, Lock, CheckCircle2, AlertCircle, Zap, ExternalLink, HelpCircle, Download, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { ConnectionGuide } from "./erp-connection-guides";

const PROVIDERS = [
  { value: "jaggaer", label: "Jaggaer" },
  { value: "sap", label: "SAP" },
  { value: "sap_wms", label: "SAP WMS Cloud" },
  { value: "oracle", label: "Oracle ERP" },
  { value: "netsuite", label: "NetSuite" },
  { value: "odoo", label: "Odoo" },
  { value: "dynamics365", label: "Microsoft Dynamics 365" },
  { value: "blue_yonder", label: "Blue Yonder" },
  { value: "manhattan", label: "Manhattan Associates" },
  { value: "infor_wms", label: "Infor WMS" },
  { value: "cin7", label: "Cin7" },
  { value: "zoho_inventory", label: "Zoho Inventory" },
  { value: "fishbowl", label: "Fishbowl" },
  { value: "sage", label: "Sage" },
  { value: "quickbooks_online", label: "QuickBooks Online" },
  { value: "xero", label: "Xero" },
  { value: "zoho_books", label: "Zoho Books" },
];

// Providers that support one-click OAuth
const OAUTH_PROVIDERS = new Set(["xero", "quickbooks_online", "zoho_books", "zoho_inventory"]);

// Per-provider setup guides shown inline (where to find each credential)
const SETUP_GUIDES: Record<string, { steps: string[]; docs?: string }> = {
  jaggaer: {
    steps: [
      "Log in to Jaggaer as an administrator.",
      "Navigate to Setup → Integration → API Access.",
      "Create a new OAuth client; copy the Client ID and Client Secret.",
      "Use your Jaggaer instance URL (e.g. https://yourorg.jaggaer.com) as Instance URL.",
    ],
    docs: "https://www.jaggaer.com/api-documentation",
  },
  sap: {
    steps: [
      "In SAP, open Communication Arrangements → Create New.",
      "Select scenario SAP_COM_0008 (or your applicable scenario) and assign a Communication User.",
      "Copy the user ID as Client ID and the password as Client Secret.",
      "Instance URL is your SAP API base, e.g. https://my123456.s4hana.ondemand.com.",
    ],
  },
  oracle: {
    steps: [
      "In Oracle Cloud, open Identity Cloud Service → Applications.",
      "Create a Confidential Application; under Client Configuration enable Client Credentials.",
      "Copy Client ID and Client Secret.",
      "Instance URL is your Oracle Cloud REST API endpoint.",
    ],
  },
  netsuite: {
    steps: [
      "In NetSuite, enable Token-Based Authentication (Setup → Company → Enable Features → SuiteCloud).",
      "Create an Integration record (Setup → Integration → Manage Integrations → New).",
      "Copy the Consumer Key as Client ID and Consumer Secret as Client Secret.",
      "Instance URL is https://[ACCOUNT_ID].suitetalk.api.netsuite.com.",
    ],
  },
  odoo: {
    steps: [
      "In Odoo, open Settings → Users & Companies → API Keys.",
      "Generate a new API key - use your login email as Client ID and the key as Client Secret.",
      "Instance URL is your Odoo base URL (e.g. https://yourcompany.odoo.com).",
    ],
  },
  dynamics365: {
    steps: [
      "In Azure Portal, open App Registrations → New registration.",
      "Under Certificates & secrets, create a Client Secret.",
      "Copy Application (client) ID and the secret value.",
      "Instance URL is your Dynamics environment URL (e.g. https://yourorg.crm.dynamics.com).",
    ],
  },
  xero: {
    steps: [
      "Click Connect with Xero below - no manual credentials needed.",
      "Sign in to Xero and select the organization to connect.",
      "Approve the requested permissions; you'll be returned here automatically.",
    ],
    docs: "https://developer.xero.com/documentation/",
  },
  quickbooks_online: {
    steps: [
      "Click Connect with QuickBooks below - no manual credentials needed.",
      "Sign in to Intuit and pick the QuickBooks company file to connect.",
      "Approve the permissions; tokens are stored securely on our backend.",
    ],
    docs: "https://developer.intuit.com/app/developer/qbo/docs/get-started",
  },
  zoho_books: {
    steps: [
      "Click Connect with Zoho below - no manual credentials needed.",
      "Sign in to Zoho and select your Zoho Books organization.",
      "Approve the permissions; we'll refresh the access token automatically.",
    ],
    docs: "https://www.zoho.com/books/api/v3/",
  },
  zoho_inventory: {
    steps: [
      "Click Connect with Zoho below - no manual credentials needed.",
      "Sign in to Zoho and select your Zoho Inventory organization.",
      "Approve the permissions.",
    ],
  },
  sage: {
    steps: [
      "In Sage, go to Settings → Business settings → API Access.",
      "Create a new API integration; copy the Client ID and Client Secret.",
      "Instance URL is the Sage API endpoint provided in the integration page.",
    ],
  },
  sap_wms: { steps: ["Same as SAP - use SAP_COM_0008 or the WMS-specific scenario."] },
  blue_yonder: { steps: ["Contact your Blue Yonder admin to create API credentials. Paste them below."] },
  manhattan: { steps: ["Contact your Manhattan Associates admin to provision OAuth credentials."] },
  infor_wms: { steps: ["In Infor ION, create an OAuth Backend Service Account; copy the credentials."] },
  cin7: { steps: ["In Cin7, go to Integrations & API → Manage API v1 → Add User. Use the API username and key."] },
  fishbowl: { steps: ["Generate API credentials in Fishbowl Server → User Group → Integration."] },
};

export default function ErpIntegrations() {
  const { organizationId, hasAnyRole } = useAuth();
  const canManage = hasAnyRole(["super_admin", "org_admin"]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [configs, setConfigs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [oauthing, setOauthing] = useState(false);
  // Last pull breakdown per provider (resources -> {count, ok, error?})
  const [pullBreakdown, setPullBreakdown] = useState<Record<string, any>>({});
  const [form, setForm] = useState({ provider: "jaggaer", instance_url: "", client_id: "", client_secret: "" });

  const load = async () => {
    if (!organizationId) return;
    const { data: cfg } = await supabase
      .from("integration_configs")
      .select("id,provider,instance_url,client_id,is_active,last_sync_at,last_sync_status,auth_method")
      .eq("organization_id", organizationId);
    setConfigs(cfg ?? []);
    const { data: lg } = await supabase
      .from("integration_sync_log")
      .select("*")
      .eq("organization_id", organizationId)
      .order("started_at", { ascending: false })
      .limit(20);
    setLogs(lg ?? []);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [organizationId]);

  // Handle OAuth callback redirect (?oauth=success|error)
  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (!oauth) return;
    if (oauth === "success") {
      toast.success(`Connected ${searchParams.get("provider") ?? "provider"} successfully`);
      load();
    } else {
      toast.error(`Connection failed: ${searchParams.get("reason") ?? "unknown"}`);
    }
    searchParams.delete("oauth");
    searchParams.delete("provider");
    searchParams.delete("reason");
    setSearchParams(searchParams, { replace: true });
    // eslint-disable-next-line
  }, [searchParams]);

  const save = async () => {
    if (!organizationId) return;
    const { data: upserted, error } = await supabase
      .from("integration_configs")
      .upsert({
        organization_id: organizationId,
        integration_type: form.provider,
        provider: form.provider,
        instance_url: form.instance_url,
        client_id: form.client_id,
        is_active: true,
        auth_method: "manual",
      } as any, { onConflict: "organization_id,provider" })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    if (upserted?.id && form.client_secret) {
      const { error: secErr } = await supabase.rpc("set_integration_config_secrets", {
        _integration_config_id: upserted.id,
        _secrets: { client_secret: form.client_secret },
      });
      if (secErr) return toast.error(secErr.message);
    }
    toast.success("Integration saved");
    setForm({ ...form, client_secret: "" });
    load();
  };

  const testConnection = async (config_id?: string) => {
    setTesting(true);
    const body = config_id
      ? { config_id }
      : { provider: form.provider, instance_url: form.instance_url, client_id: form.client_id, client_secret: form.client_secret, organization_id: organizationId };
    const { data, error } = await supabase.functions.invoke("erp-test-connection", { body });
    setTesting(false);
    if (error) return toast.error(error.message);
    if (data?.ok) {
      toast.success(data.details ?? "Connection successful");
    } else {
      toast.error(data?.error ?? "Connection test failed", { description: data?.details });
    }
  };

  const startOAuth = async (provider: string, instance_url?: string) => {
    if (!organizationId) return;
    setOauthing(true);
    const { data, error } = await supabase.functions.invoke("erp-oauth-initiate", {
      body: {
        provider,
        organization_id: organizationId,
        instance_url,
        redirect_after: window.location.origin + "/dept/erp-integrations",
      },
    });
    setOauthing(false);
    if (error || !data?.authorize_url) {
      return toast.error(error?.message ?? data?.error ?? "Could not start OAuth");
    }
    window.location.href = data.authorize_url;
  };

  const sync = async (provider: string, sync_type: "pull" | "push" | "manual" = "manual") => {
    if (!organizationId) return;
    setSyncing(`${provider}:${sync_type}`);
    const { data, error } = await supabase.functions.invoke("erp-sync", {
      body: { organization_id: organizationId, provider, sync_type },
    });
    setSyncing(null);
    if (error) return toast.error(error.message);
    const summary: any = data?.summary ?? {};
    const resources = summary?.resources;
    if (sync_type === "pull" && resources) {
      setPullBreakdown((prev) => ({ ...prev, [provider]: { ...resources, _at: Date.now(), partial: !!summary.partial } }));
      const parts: string[] = [];
      const fmt = (label: string, key: string) => {
        const r = resources[key];
        if (!r) return;
        parts.push(r.ok ? `${label}: ${r.count}` : `${label}: failed`);
      };
      fmt("CC", "cost_centres");
      fmt("PO", "purchase_orders");
      fmt("SO", "sales_orders");
      const desc = parts.join(" · ");
      if (summary.partial) {
        toast.warning(`Partial pull from ${provider}`, { description: desc });
      } else {
        toast.success(`Pulled from ${provider}`, { description: desc });
      }
    } else {
      const label = sync_type === "pull" ? "Pulled" : sync_type === "push" ? "Pushed" : "Synced";
      toast.success(`${label} ${data?.status}: ${data?.records_processed ?? 0} records`);
    }
    load();
  };

  if (!canManage) {
    return (
      <DashboardLayout title="ERP Integrations">
        <div className="p-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Restricted</CardTitle></CardHeader>
            <CardContent className="text-muted-foreground">Only org admins can manage ERP credentials.</CardContent></Card>
        </div>
      </DashboardLayout>
    );
  }

  const guide = SETUP_GUIDES[form.provider];
  const isOAuthProvider = OAUTH_PROVIDERS.has(form.provider);

  return (
    <DashboardLayout title="ERP Integrations">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Plug className="h-7 w-7" />ERP Integrations</h1>
          <p className="text-muted-foreground">Self-service connection to your accounting and ERP platforms. Credentials stay encrypted on our backend.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connect a Platform</CardTitle>
            <CardDescription>Pick your platform - we'll show one-click OAuth where supported, otherwise a guided manual setup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm({ ...form, provider: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{PROVIDERS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!isOAuthProvider && (
                <div>
                  <Label>Instance URL</Label>
                  <Input value={form.instance_url} onChange={(e) => setForm({ ...form, instance_url: e.target.value })} placeholder="https://yourorg.example.com" />
                </div>
              )}
            </div>

            <ConnectionGuide
              providerKey={form.provider}
              providerLabel={PROVIDERS.find(p => p.value === form.provider)?.label ?? form.provider}
            />


            {/* Inline setup guide */}
            {guide && (
              <Accordion type="single" collapsible className="border rounded-md">
                <AccordionItem value="guide" className="border-0">
                  <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline">
                    <span className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />Where do I find these credentials?</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <ol className="list-decimal list-inside text-sm space-y-1 text-muted-foreground">
                      {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                    {guide.docs && (
                      <a href={guide.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                        Official docs <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            {isOAuthProvider ? (
              <div className="rounded-md border bg-muted/30 p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />One-click connect available</p>
                  <p className="text-xs text-muted-foreground mt-1">No need to copy keys - sign in to your account and approve.</p>
                </div>
                <Button onClick={() => startOAuth(form.provider, form.instance_url)} disabled={oauthing}>
                  {oauthing ? "Redirecting…" : `Connect with ${PROVIDERS.find(p => p.value === form.provider)?.label}`}
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Client ID</Label><Input value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} /></div>
                  <div><Label>Client Secret</Label><Input type="password" value={form.client_secret} onChange={(e) => setForm({ ...form, client_secret: e.target.value })} /></div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => testConnection()} disabled={testing}>
                    {testing ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                    Test Connection
                  </Button>
                  <Button onClick={save}>Save Credentials</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Configured Integrations</CardTitle><CardDescription>Test, sync, or remove existing connections.</CardDescription></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Auth</TableHead><TableHead>Instance</TableHead><TableHead>Last Sync</TableHead><TableHead>Status</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {configs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No integrations configured</TableCell></TableRow>
                  : configs.map(c => {
                    const bd = pullBreakdown[c.provider];
                    const Pill = ({ label, r }: { label: string; r?: { count: number; ok: boolean; error?: string } }) => {
                      if (!r) return null;
                      return (
                        <Badge
                          variant={r.ok ? "secondary" : "destructive"}
                          className="text-[10px] mr-1"
                          title={r.error ?? ""}
                        >
                          {label}: {r.ok ? r.count : "failed"}
                        </Badge>
                      );
                    };
                    return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.provider}</TableCell>
                      <TableCell>
                        <Badge variant={c.auth_method === "oauth" ? "default" : "outline"} className="text-[10px]">
                          {c.auth_method === "oauth" ? "OAuth" : "Manual"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.instance_url}</TableCell>
                      <TableCell>
                        <div>{c.last_sync_at ? new Date(c.last_sync_at).toLocaleString() : "-"}</div>
                        {bd && (
                          <div className="mt-1">
                            <Pill label="CC" r={bd.cost_centres} />
                            <Pill label="PO" r={bd.purchase_orders} />
                            <Pill label="SO" r={bd.sales_orders} />
                            {bd.partial && <span className="text-[10px] text-amber-600">partial</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.last_sync_status === "success" ? "default" : c.last_sync_status === "failed" ? "destructive" : "secondary"}>
                          {c.last_sync_status ?? "never"}
                        </Badge>
                      </TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => testConnection(c.id)} disabled={testing}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />Test
                        </Button>
                        <Button size="sm" disabled={syncing === `${c.provider}:pull`} onClick={() => sync(c.provider, "pull")}>
                          <Download className={`h-3 w-3 mr-1 ${syncing === `${c.provider}:pull` ? "animate-pulse" : ""}`} />
                          Pull from {PROVIDERS.find(p => p.value === c.provider)?.label ?? c.provider}
                        </Button>
                        <Button size="sm" variant="outline" disabled={syncing === `${c.provider}:push`} onClick={() => sync(c.provider, "push")}>
                          <Upload className={`h-3 w-3 mr-1 ${syncing === `${c.provider}:push` ? "animate-pulse" : ""}`} />
                          Push to {PROVIDERS.find(p => p.value === c.provider)?.label ?? c.provider}
                        </Button>
                      </TableCell>
                    </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Sync Activity</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Provider</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Records</TableHead><TableHead>Started</TableHead></TableRow></TableHeader>
              <TableBody>
                {logs.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No activity yet</TableCell></TableRow>
                  : logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell>{l.provider}</TableCell><TableCell>{l.sync_type}</TableCell>
                      <TableCell><Badge variant={l.status === "success" ? "default" : l.status === "failed" ? "destructive" : "secondary"}>{l.status}</Badge></TableCell>
                      <TableCell>{l.records_processed}</TableCell>
                      <TableCell className="text-xs">{new Date(l.started_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
