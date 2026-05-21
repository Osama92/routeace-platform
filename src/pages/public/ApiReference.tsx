import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck } from "lucide-react";

type Endpoint = { method: "GET" | "POST" | "PATCH" | "DELETE"; path: string; desc: string; body?: string };

const GROUPS: { name: string; endpoints: Endpoint[] }[] = [
  {
    name: "Authentication",
    endpoints: [
      { method: "POST", path: "/v1/auth/keys", desc: "Create a tenant API key (device or application)." },
      { method: "GET",  path: "/v1/auth/keys", desc: "List active API keys for the tenant." },
      { method: "DELETE", path: "/v1/auth/keys/:id", desc: "Revoke a key." },
    ],
  },
  {
    name: "Ingestion - Telemetry",
    endpoints: [
      { method: "POST", path: "/v1/ingest/gps", desc: "Push GPS positions (3rd party trackers).", body: '{ vehicle_id, device_imei, positions:[{ts,lat,lng,speed_kph,ignition}] }' },
      { method: "POST", path: "/v1/ingest/fuel", desc: "Push fuel-probe tank reads.", body: '{ vehicle_id, probe_id, reads:[{ts,level_liters,temp_c}] }' },
      { method: "POST", path: "/v1/ingest/maintenance", desc: "Push OBD/CAN/vibration signals.", body: '{ vehicle_id, signals:[{ts,type,value}] }' },
      { method: "POST", path: "/v1/ingest/telemetry", desc: "Generic catch-all telemetry batch." },
    ],
  },
  {
    name: "Fleet",
    endpoints: [
      { method: "GET",  path: "/v1/fleet/vehicles", desc: "List vehicles, filter by status, region, type." },
      { method: "POST", path: "/v1/fleet/vehicles", desc: "Register a vehicle." },
      { method: "GET",  path: "/v1/fleet/vehicles/:id/health", desc: "Latest health score (0-100) and risk drivers." },
      { method: "GET",  path: "/v1/fleet/vehicles/:id/positions", desc: "Position history with time range." },
    ],
  },
  {
    name: "Dispatch & Orders",
    endpoints: [
      { method: "POST", path: "/v1/dispatch/orders", desc: "Create an order (from your ERP/in-house app)." },
      { method: "GET",  path: "/v1/dispatch/orders/:id", desc: "Read order + state machine stage." },
      { method: "PATCH", path: "/v1/dispatch/orders/:id", desc: "Update items, addresses, SLA before assignment." },
      { method: "POST", path: "/v1/dispatch/orders/:id/assign", desc: "Assign vehicle + driver." },
      { method: "POST", path: "/v1/dispatch/orders/:id/cancel", desc: "Cancel (only pre-In Transit)." },
    ],
  },
  {
    name: "Drivers",
    endpoints: [
      { method: "GET",  path: "/v1/drivers", desc: "List drivers with safety scores." },
      { method: "POST", path: "/v1/drivers", desc: "Onboard a driver (KYC fields required)." },
      { method: "GET",  path: "/v1/drivers/:id/score", desc: "Behavior + safety scoring breakdown." },
    ],
  },
  {
    name: "Customers & Invoicing",
    endpoints: [
      { method: "GET",  path: "/v1/customers", desc: "List customers." },
      { method: "POST", path: "/v1/customers", desc: "Create a customer." },
      { method: "POST", path: "/v1/invoices", desc: "Issue an invoice from external billing source." },
      { method: "GET",  path: "/v1/invoices/:id", desc: "Read invoice + payment status." },
    ],
  },
  {
    name: "Fuel Intelligence",
    endpoints: [
      { method: "GET", path: "/v1/fuel/anomalies", desc: "Detected theft/drainage events." },
      { method: "GET", path: "/v1/fuel/usage", desc: "Per-vehicle consumption rollup." },
    ],
  },
  {
    name: "Maintenance",
    endpoints: [
      { method: "GET", path: "/v1/maintenance/alerts", desc: "Active predictive-maintenance alerts." },
      { method: "POST", path: "/v1/maintenance/workorders", desc: "Create a work order (manual or from alert)." },
    ],
  },
  {
    name: "Webhooks",
    endpoints: [
      { method: "POST", path: "/v1/webhooks", desc: "Subscribe a URL to event types." },
      { method: "GET",  path: "/v1/webhooks", desc: "List subscriptions." },
      { method: "DELETE", path: "/v1/webhooks/:id", desc: "Remove subscription." },
    ],
  },
  {
    name: "Bulk Import",
    endpoints: [
      { method: "POST", path: "/v1/bulk-import", desc: "Upload CSV/Parquet with schema mapping for historical migration." },
      { method: "GET",  path: "/v1/bulk-import/:job_id", desc: "Job status + per-row reconciliation." },
    ],
  },
];

const methodColor: Record<string, string> = {
  GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  POST: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  PATCH: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  DELETE: "bg-rose-500/10 text-rose-500 border-rose-500/30",
};

export default function ApiReference() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>API Reference - RouteAce</title>
        <meta name="description" content="Complete REST API reference for RouteAce: fleet, dispatch, ingestion, fuel intelligence, maintenance, webhooks." />
        <link rel="canonical" href="https://routeace.app/api-reference" />
      </Helmet>

      <header className="border-b border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-bold">API Reference</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div className="space-y-3">
          <Badge variant="outline">REST · JSON · v1</Badge>
          <h1 className="text-4xl font-black">API Reference</h1>
          <p className="text-muted-foreground">
            Base URL: <code className="px-1.5 py-0.5 bg-muted rounded">https://api.routeace.app/v1</code>. All
            requests require <code>Authorization: Bearer &lt;key&gt;</code> and <code>X-Tenant-Id</code> headers. See the {" "}
            <Link to="/docs" className="text-primary hover:underline">Documentation</Link> for getting-started guides.
          </p>
        </div>

        <div className="grid lg:grid-cols-[200px_1fr] gap-8">
          <aside className="hidden lg:block">
            <nav className="sticky top-6 space-y-1 text-sm">
              {GROUPS.map((g) => (
                <a key={g.name} href={`#${g.name.replace(/\s+/g, "-")}`} className="block px-3 py-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">{g.name}</a>
              ))}
            </nav>
          </aside>

          <main className="space-y-10 min-w-0">
            {GROUPS.map((g) => (
              <section key={g.name} id={g.name.replace(/\s+/g, "-")} className="space-y-3 scroll-mt-24">
                <h2 className="text-xl font-bold">{g.name}</h2>
                <div className="space-y-2">
                  {g.endpoints.map((e) => (
                    <Card key={e.method + e.path} className="p-4">
                      <div className="flex items-start gap-3 flex-wrap">
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${methodColor[e.method]}`}>{e.method}</span>
                        <code className="text-sm font-mono">{e.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{e.desc}</p>
                      {e.body && <pre className="mt-2 text-xs bg-muted/40 rounded p-2 overflow-x-auto"><code>{e.body}</code></pre>}
                    </Card>
                  ))}
                </div>
              </section>
            ))}

            <section className="pt-6 border-t border-border/40 text-sm text-muted-foreground">
              <p>Need an endpoint that's not listed? <Link to="/contact" className="text-primary hover:underline">Talk to our integrations team</Link>.</p>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
