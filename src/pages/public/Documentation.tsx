import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Truck, Cpu, Fuel, Wrench, Satellite, Plug, Database, Webhook, KeyRound, Code2 } from "lucide-react";

const Section = ({ id, title, icon: Icon, children }: any) => (
  <section id={id} className="space-y-3 scroll-mt-24">
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
    <div className="text-sm text-muted-foreground space-y-3 leading-relaxed">{children}</div>
  </section>
);

const Code = ({ children }: any) => (
  <pre className="bg-muted/40 border border-border/40 rounded-lg p-4 text-xs overflow-x-auto"><code>{children}</code></pre>
);

export default function Documentation() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Documentation - RouteAce Integration Platform</title>
        <meta name="description" content="Integrate GPS trackers, fuel probes, IoT maintenance sensors, and in-house apps with RouteAce. Authentication, ingestion endpoints, webhooks, and SDKs." />
        <link rel="canonical" href="https://routeace.app/docs" />
      </Helmet>

      <header className="border-b border-border/40 bg-card/30">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-bold">RouteAce Docs</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 grid lg:grid-cols-[220px_1fr] gap-10">
        <aside className="hidden lg:block">
          <nav className="sticky top-6 space-y-1 text-sm">
            {[
              ["overview", "Overview"],
              ["auth", "Authentication"],
              ["ingestion", "Data Ingestion"],
              ["gps", "GPS Trackers"],
              ["fuel", "Fuel Probes"],
              ["maintenance", "Maintenance IoT"],
              ["inhouse", "In-house Apps"],
              ["webhooks", "Webhooks"],
              ["sdks", "SDKs & Examples"],
              ["limits", "Rate Limits"],
            ].map(([id, label]) => (
              <a key={id} href={`#${id}`} className="block px-3 py-1.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground">{label}</a>
            ))}
            <Link to="/api-reference" className="block px-3 py-1.5 rounded hover:bg-muted/50 text-primary mt-3">→ API Reference</Link>
          </nav>
        </aside>

        <main className="space-y-12 min-w-0">
          <div className="space-y-3">
            <Badge variant="outline">v1.0 · REST + Webhooks</Badge>
            <h1 className="text-4xl font-black">RouteAce Integration Platform</h1>
            <p className="text-muted-foreground text-lg">
              Stream telemetry, dispatch events, and financial data between RouteAce and your in-house apps,
              GPS trackers, fuel probes, and fleet maintenance IoT devices.
            </p>
          </div>

          <Section id="overview" title="Overview" icon={Plug}>
            <p>RouteAce exposes a tenant-scoped REST API plus a real-time event bus. Every external system, whether a 3rd party GPS device, fuel probe, maintenance IoT module, or an internal back-office app, integrates through one of four surfaces:</p>
            <div className="grid sm:grid-cols-2 gap-3 not-prose">
              <Card className="p-4"><div className="font-semibold mb-1">1. Ingestion API</div><div className="text-xs">Push raw telemetry &amp; transactional records (positions, fuel reads, sensor data, orders, invoices).</div></Card>
              <Card className="p-4"><div className="font-semibold mb-1">2. Resource API</div><div className="text-xs">Read &amp; mutate fleet, dispatch, customers, invoices, drivers.</div></Card>
              <Card className="p-4"><div className="font-semibold mb-1">3. Webhooks</div><div className="text-xs">Subscribe to dispatch, delivery, payment, and exception events.</div></Card>
              <Card className="p-4"><div className="font-semibold mb-1">4. Bulk Import</div><div className="text-xs">CSV/JSON loaders for historical migrations from your existing system.</div></Card>
            </div>
            <p>Base URL: <code className="px-1.5 py-0.5 bg-muted rounded">https://api.routeace.app/v1</code></p>
          </Section>

          <Section id="auth" title="Authentication" icon={KeyRound}>
            <p>All requests use <strong>tenant-scoped API keys</strong> generated from <em>Settings → Integrations → API Keys</em>. Two key types:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Device keys</strong> — for GPS/fuel/IoT hardware. Limited to ingestion endpoints only.</li>
              <li><strong>Application keys</strong> — for in-house apps. Scoped per resource (read/write).</li>
            </ul>
            <Code>{`curl https://api.routeace.app/v1/fleet/vehicles \\
  -H "Authorization: Bearer ra_live_sk_..." \\
  -H "X-Tenant-Id: <tenant-uuid>"`}</Code>
            <p>Keys are signed with HMAC-SHA256. Rotate every 90 days. Device keys can optionally pin to a hardware IMEI.</p>
          </Section>

          <Section id="ingestion" title="Data Ingestion" icon={Database}>
            <p>The ingestion API accepts batches of up to 500 records and is idempotent on <code>external_id</code>. Records land in a raw staging zone, are validated, then materialised into RouteAce's domain tables (fleet_tracking, fuel_reads, maintenance_signals, etc).</p>
            <Code>{`POST /v1/ingest/telemetry
{
  "device_id": "GPS-NG-00231",
  "events": [
    { "external_id": "evt_001", "ts": "2026-05-16T10:00:00Z",
      "lat": 6.5244, "lng": 3.3792, "speed_kph": 42, "heading": 88, "ignition": true }
  ]
}`}</Code>
          </Section>

          <Section id="gps" title="GPS Trackers (3rd party)" icon={Satellite}>
            <p>Supports Teltonika, Concox, Queclink, Ruptela, and any device that can post JSON or TCP/AVL packets. Map your device fields once; RouteAce routes them into the live fleet map, route confidence engine, and accident-prediction model.</p>
            <Code>{`POST /v1/ingest/gps
Headers: Authorization: Bearer ra_device_<key>
Body:
{
  "vehicle_id": "VEH-001",         // RouteAce internal vehicle ID
  "device_imei": "865413050123456",
  "positions": [
    { "ts": "...", "lat": 6.45, "lng": 3.40, "speed_kph": 65,
      "odometer_km": 124530.2, "ignition": true, "satellites": 12 }
  ]
}`}</Code>
            <p>For legacy TCP-only devices, point them to <code>tcp://ingest.routeace.app:5023</code> and pick a parser preset in the Integration Hub.</p>
          </Section>

          <Section id="fuel" title="Fuel Probes → Fuel Intelligence" icon={Fuel}>
            <p>Capacitive probes (Technoton, Escort TD, OMNICOMM) feed the Fuel Intelligence + Fraud Detection engine. Send tank level reads on the natural sampling cadence (10–60s). RouteAce derives fills, drainages, and theft signatures server-side.</p>
            <Code>{`POST /v1/ingest/fuel
{
  "vehicle_id": "VEH-001",
  "probe_id": "PROBE-A",
  "reads": [
    { "ts": "2026-05-16T10:00:00Z", "level_liters": 312.4, "temp_c": 33.1 }
  ]
}`}</Code>
            <p>Optional flow-meter integration: post <code>level_liters</code> alongside <code>flow_liters_delta</code> for hybrid validation.</p>
          </Section>

          <Section id="maintenance" title="Fleet Maintenance IoT" icon={Wrench}>
            <p>OBD-II dongles, CAN-bus readers, vibration/thermal sensors feed the Predictive Maintenance + Health Score engine. Dispatch is auto-blocked when failure risk &gt; 85%.</p>
            <Code>{`POST /v1/ingest/maintenance
{
  "vehicle_id": "VEH-001",
  "signals": [
    { "ts": "...", "type": "engine_temp_c", "value": 104.2 },
    { "ts": "...", "type": "dtc_code", "value": "P0301" },
    { "ts": "...", "type": "vibration_rms_g", "value": 1.8, "axis": "z" }
  ]
}`}</Code>
            <p>Supported signal types: <code>engine_temp_c</code>, <code>oil_pressure_kpa</code>, <code>battery_v</code>, <code>rpm</code>, <code>dtc_code</code>, <code>vibration_rms_g</code>, <code>brake_wear_pct</code>, <code>tyre_pressure_kpa</code>.</p>
          </Section>

          <Section id="inhouse" title="In-house Apps & Private Data Import" icon={Cpu}>
            <p>For internal apps (custom dispatch board, legacy ERP, warehouse handheld), use the Resource API to read/write business objects directly.</p>
            <Code>{`# Create an order from your custom system
POST /v1/dispatch/orders
{
  "external_ref": "MY-ERP-INV-9921",
  "customer_id": "CUST-...",
  "pickup":  { "address": "...", "lat": ..., "lng": ... },
  "dropoff": { "address": "...", "lat": ..., "lng": ... },
  "items":   [ { "sku": "SKU-1", "qty": 12, "weight_kg": 4.2 } ],
  "sla_minutes": 240
}`}</Code>
            <p>Bulk historical import: upload CSV/Parquet to <code>POST /v1/bulk-import</code> with a schema mapping. Migration jobs run async and produce a per-row reconciliation report.</p>
          </Section>

          <Section id="webhooks" title="Webhooks" icon={Webhook}>
            <p>Subscribe to events to push RouteAce data back into your systems. Payloads are signed with <code>X-RouteAce-Signature</code> (HMAC-SHA256).</p>
            <ul className="list-disc list-inside space-y-1">
              <li><code>dispatch.created</code>, <code>dispatch.assigned</code>, <code>dispatch.delivered</code>, <code>dispatch.failed</code></li>
              <li><code>invoice.issued</code>, <code>invoice.paid</code>, <code>invoice.overdue</code></li>
              <li><code>vehicle.health.alert</code>, <code>fuel.theft.detected</code>, <code>driver.safety.breach</code></li>
            </ul>
            <Code>{`POST /v1/webhooks
{ "url": "https://my-erp.example.com/hooks/routeace",
  "events": ["dispatch.delivered","invoice.paid"],
  "secret": "whsec_..." }`}</Code>
          </Section>

          <Section id="sdks" title="SDKs & Examples" icon={Code2}>
            <p>Official SDKs: <code>@routeace/node</code>, <code>@routeace/python</code>, <code>@routeace/go</code>. OpenAPI spec at <code>/v1/openapi.json</code> — generates clients in any language.</p>
            <Code>{`import RouteAce from "@routeace/node";
const ra = new RouteAce({ apiKey: process.env.ROUTEACE_KEY });
await ra.ingest.gps({ vehicle_id: "VEH-001", positions: [...] });`}</Code>
          </Section>

          <Section id="limits" title="Rate Limits" icon={Plug}>
            <ul className="list-disc list-inside space-y-1">
              <li>Ingestion: <strong>5,000 req/min</strong> per tenant, burst 10,000.</li>
              <li>Resource API: <strong>600 req/min</strong> per application key.</li>
              <li>Webhook retries: 8 attempts, exponential backoff up to 24h.</li>
            </ul>
          </Section>

          <div className="pt-8 border-t border-border/40 flex flex-wrap gap-3">
            <Link to="/api-reference" className="text-sm text-primary hover:underline">→ Full API Reference</Link>
            <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground">Need help? Contact us</Link>
          </div>
        </main>
      </div>
    </div>
  );
}
