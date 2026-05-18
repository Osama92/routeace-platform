import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Code, Zap, Shield, Globe, ArrowRight, Lock, Activity, Webhook,
  Key, BookOpen, Terminal, CheckCircle, Copy, Truck, Package,
  BarChart3, FileText, MapPin, DollarSign,
} from "lucide-react";

const API_ENDPOINTS = [
  { method: "POST", path: "/api/v1/dispatch/create", desc: "Create a new dispatch", perCall: "$0.025", auth: "API Key" },
  { method: "POST", path: "/api/v1/route/optimize", desc: "AI-powered route optimization", perCall: "$0.05", auth: "API Key" },
  { method: "GET", path: "/api/v1/tracking/:id", desc: "Real-time tracking by dispatch ID", perCall: "$0.01", auth: "API Key" },
  { method: "GET", path: "/api/v1/fleet/vehicles", desc: "List fleet vehicles", perCall: "$0.02", auth: "API Key" },
  { method: "POST", path: "/api/v1/pricing/calculate", desc: "Get dynamic rate quote", perCall: "$0.015", auth: "API Key" },
  { method: "POST", path: "/api/v1/cost-estimate", desc: "Get fuel, time & cost estimate for a route", perCall: "$0.02", auth: "API Key" },
  { method: "POST", path: "/api/v1/pod/verify", desc: "Submit proof of delivery", perCall: "$0.02", auth: "API Key" },
  { method: "GET", path: "/api/v1/analytics/performance", desc: "Fleet performance metrics", perCall: "$0.035", auth: "API Key" },
  { method: "POST", path: "/api/v1/invoice/create", desc: "Generate invoice programmatically", perCall: "$0.03", auth: "API Key" },
  { method: "POST", path: "/api/v1/webhook/register", desc: "Register webhook endpoint", perCall: "Free", auth: "API Key" },
  { method: "GET", path: "/api/v1/order/:id/status", desc: "Get order delivery status", perCall: "$0.01", auth: "API Key" },
  { method: "POST", path: "/api/v1/fleet/add", desc: "Add vehicle to fleet", perCall: "$0.02", auth: "API Key" },
  { method: "GET", path: "/api/v1/fleet/status", desc: "Real-time fleet status overview", perCall: "$0.015", auth: "API Key" },
];

const WEBHOOK_EVENTS = [
  { event: "dispatch.created", desc: "New dispatch created" },
  { event: "dispatch.assigned", desc: "Driver assigned to dispatch" },
  { event: "delivery.picked_up", desc: "Package picked up by driver" },
  { event: "delivery.completed", desc: "Delivery successfully completed" },
  { event: "delivery.failed", desc: "Delivery attempt failed" },
  { event: "invoice.paid", desc: "Invoice payment received" },
  { event: "sla.breach_warning", desc: "SLA breach imminent" },
  { event: "fleet.vehicle_alert", desc: "Vehicle maintenance alert" },
];

const CODE_EXAMPLE = `// Create a dispatch via RouteAce API
const response = await fetch('https://api.routeace.com/v1/dispatch/create', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ra_live_your_api_key_here',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    pickup: { address: '123 Main St', lat: 6.5244, lng: 3.3792 },
    delivery: { address: '456 Oak Ave', lat: 6.4541, lng: 3.3947 },
    package: { weight_kg: 5, type: 'parcel' },
    priority: 'standard',
  }),
});

const dispatch = await response.json();
console.log(dispatch.id, dispatch.tracking_url);`;

const WEBHOOK_EXAMPLE = `// Webhook payload for delivery.completed
{
  "event": "delivery.completed",
  "timestamp": "2026-03-27T14:30:00Z",
  "data": {
    "dispatch_id": "dsp-abc123",
    "driver_id": "drv-xyz789",
    "delivery_time": "2026-03-27T14:28:00Z",
    "pod": {
      "signature_url": "https://cdn.routeace.com/pod/sig_abc.png",
      "photo_url": "https://cdn.routeace.com/pod/photo_abc.jpg"
    },
    "recipient": "Jane Doe"
  }
}`;

const DeveloperPlatform = () => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Truck className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">RouteAce</h1>
              <p className="text-xs text-muted-foreground">Developer Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/pricing")}>Pricing</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/global")}>Home</Button>
            <Button size="sm" onClick={() => navigate("/signup/company")}>Get API Key</Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(199,89%,48%,0.06),transparent_60%)]" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge variant="secondary" className="mb-4">
              <Code className="w-3 h-3 mr-1" /> API v1
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold font-heading mb-6 leading-tight">
              Build Logistics Into Your Product
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              Dispatch, tracking, route optimization, and invoicing - all via simple REST APIs.
              Pay per call. Scale to millions.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/signup/company")}>
                Get API Key <Key className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline">
                <BookOpen className="w-4 h-4 mr-2" /> Read Docs
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="px-6 -mt-4 mb-12">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Zap, label: "99.9% Uptime", desc: "Enterprise SLA" },
            { icon: Globe, label: "5 Regions", desc: "Global coverage" },
            { icon: Activity, label: "<200ms", desc: "Avg response time" },
            { icon: Shield, label: "SOC 2", desc: "Security compliant" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
              <Card className="text-center">
                <CardContent className="pt-6 pb-4">
                  <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="font-bold text-lg">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Tabs: Endpoints, Webhooks, Code */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="endpoints" className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3 mb-8">
              <TabsTrigger value="endpoints" className="gap-1.5">
                <Terminal className="w-4 h-4" /> Endpoints
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="gap-1.5">
                <Webhook className="w-4 h-4" /> Webhooks
              </TabsTrigger>
              <TabsTrigger value="quickstart" className="gap-1.5">
                <Code className="w-4 h-4" /> Quick Start
              </TabsTrigger>
            </TabsList>

            {/* Endpoints */}
            <TabsContent value="endpoints">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-primary" />
                    REST API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-24">Per Call</TableHead>
                        <TableHead className="w-24">Auth</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {API_ENDPOINTS.map((ep) => (
                        <TableRow key={ep.path}>
                          <TableCell>
                            <Badge variant={ep.method === "POST" ? "default" : "secondary"} className="text-xs font-mono">
                              {ep.method}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                          <TableCell className="text-sm">{ep.desc}</TableCell>
                          <TableCell className="font-bold text-sm">{ep.perCall}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="w-3 h-3" /> {ep.auth}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Webhooks */}
            <TabsContent value="webhooks">
              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Webhook className="w-5 h-5 text-primary" />
                      Available Events
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {WEBHOOK_EVENTS.map((ev) => (
                        <div key={ev.event} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                          <Badge variant="outline" className="font-mono text-xs shrink-0 mt-0.5">{ev.event}</Badge>
                          <span className="text-sm text-muted-foreground">{ev.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Webhook Payload Example</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyCode(WEBHOOK_EXAMPLE, "webhook")}
                        className="gap-1.5"
                      >
                        {copied === "webhook" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied === "webhook" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      <code>{WEBHOOK_EXAMPLE}</code>
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Quick Start */}
            <TabsContent value="quickstart">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Code className="w-5 h-5 text-primary" />
                      Quick Start - Create a Dispatch
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyCode(CODE_EXAMPLE, "code")}
                      className="gap-1.5"
                    >
                      {copied === "code" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied === "code" ? "Copied" : "Copy"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{CODE_EXAMPLE}</code>
                  </pre>

                  <div className="mt-8 space-y-4">
                    <h3 className="font-semibold">Getting Started</h3>
                    <div className="space-y-3">
                      {[
                        { step: "1", title: "Create an account", desc: "Sign up at routeace.com and verify your email." },
                        { step: "2", title: "Generate an API key", desc: "Go to Settings → API Access and create a new key." },
                        { step: "3", title: "Make your first call", desc: "Use the code example above to create your first dispatch." },
                        { step: "4", title: "Register webhooks", desc: "Subscribe to events like delivery.completed for real-time updates." },
                      ].map((s) => (
                        <div key={s.step} className="flex items-start gap-3">
                          <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                            {s.step}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 px-6 bg-secondary/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-heading mb-4">Ready to Build?</h2>
          <p className="text-muted-foreground mb-8">
            Get your API key in 60 seconds. Start with 1,000 free requests/day.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/signup/company")}>
              Get Free API Key <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            <span className="font-heading font-bold">RouteAce</span>
            <span className="text-xs text-muted-foreground">Developer Platform</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 RouteAce. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default DeveloperPlatform;
