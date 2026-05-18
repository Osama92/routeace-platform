import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Code, Globe, Zap, Package, Truck, DollarSign,
  Shield, Store, Terminal, Puzzle, Activity,
  Key, BookOpen, Clock, Users,
  CheckCircle, Copy, ExternalLink, Cpu, Loader2, ArrowLeft,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const fadeIn = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const embeddedAPIs = [
  { name: "Order Engine", desc: "Create distribution orders programmatically", endpoint: "/v1/orders", status: "stable", latency: "45ms" },
  { name: "Logistics Orchestration", desc: "Book & track deliveries via API", endpoint: "/v1/logistics", status: "stable", latency: "62ms" },
  { name: "Distributor Marketplace", desc: "Match retailers with verified distributors", endpoint: "/v1/distributors", status: "stable", latency: "38ms" },
  { name: "Warehouse Network", desc: "Reserve storage & schedule shipments", endpoint: "/v1/warehouses", status: "stable", latency: "55ms" },
  { name: "Export Market Access", desc: "Connect producers with global buyers", endpoint: "/v1/exports", status: "stable", latency: "78ms" },
  { name: "Trade Finance", desc: "Embed financing into checkout flows", endpoint: "/v1/finance", status: "stable", latency: "120ms" },
  { name: "Compliance Engine", desc: "Verify export docs & business status", endpoint: "/v1/compliance", status: "stable", latency: "92ms" },
  { name: "Commerce Analytics", desc: "Access aggregated market intelligence", endpoint: "/v1/analytics", status: "stable", latency: "85ms" },
];

const sdks = [
  { lang: "JavaScript", version: "3.2.1", downloads: "124K/mo", color: "#f7df1e" },
  { lang: "Python", version: "2.8.4", downloads: "89K/mo", color: "#3776ab" },
  { lang: "Java", version: "1.6.2", downloads: "67K/mo", color: "#ed8b00" },
  { lang: "Go", version: "1.4.0", downloads: "42K/mo", color: "#00add8" },
  { lang: "Node.js", version: "3.1.0", downloads: "98K/mo", color: "#68a063" },
];

const widgets = [
  { name: "Order Distributor", desc: "Drop-in ordering widget for retail sites", installs: "4,280", size: "12KB" },
  { name: "Book Logistics", desc: "Embed delivery booking in any platform", installs: "3,140", size: "9KB" },
  { name: "Trade Finance Apply", desc: "Financing application embedded widget", installs: "1,860", size: "14KB" },
  { name: "Warehouse Reserve", desc: "Storage reservation component", installs: "1,420", size: "8KB" },
];

const topApps = [
  { name: "InventoryIQ", category: "Inventory Optimization", installs: "2,840", rating: 4.8 },
  { name: "RetailPulse", category: "Retail Analytics", installs: "1,960", rating: 4.6 },
  { name: "ExportFlow", category: "Export Management", installs: "1,420", rating: 4.7 },
  { name: "LogiOptima", category: "Route Optimization", installs: "3,100", rating: 4.9 },
  { name: "TradeGuard", category: "Compliance", installs: "980", rating: 4.5 },
];

const codeExample = `import RouteAce from '@routeace/sdk';

const client = new RouteAce({
  apiKey: 'ra_live_...',
  environment: 'production'
});

// Create a distribution order
const order = await client.orders.create({
  product_sku: 'SKU-RICE-50KG',
  quantity: 500,
  delivery_address: 'Lagos, Nigeria',
  priority: 'standard'
});

// Book logistics automatically
const delivery = await client.logistics.book({
  order_id: order.id,
  pickup: 'Warehouse-LOS-01',
  optimize_route: true
});

console.log(delivery.eta); // "2026-03-10T14:00:00Z"`;

export default function EmbeddedCommerceLayer() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    apiKeys: 0, apiRequests: 0, dispatches: 0,
    partners: 0, exchangeListings: 0, invoices: 0,
  });
  const [apiTraffic, setApiTraffic] = useState<any[]>([]);

  useEffect(() => { fetchMetrics(); }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    const [apiKeys, apiLogs, dispatches, partners, supplyListings, invoices] = await Promise.all([
      supabase.from("api_keys").select("id, is_active", { count: "exact" }),
      supabase.from("api_request_logs").select("id, created_at, status_code", { count: "exact" }),
      supabase.from("dispatches").select("id", { count: "exact", head: true }),
      supabase.from("partners").select("id", { count: "exact", head: true }),
      supabase.from("exchange_supply_listings").select("id", { count: "exact", head: true }),
      supabase.from("invoices").select("id", { count: "exact", head: true }),
    ]);

    const activeKeys = (apiKeys.data || []).filter((k: any) => k.is_active);
    setMetrics({
      apiKeys: activeKeys.length,
      apiRequests: apiLogs.count || 0,
      dispatches: dispatches.count || 0,
      partners: partners.count || 0,
      exchangeListings: supplyListings.count || 0,
      invoices: invoices.count || 0,
    });

    const logData = apiLogs.data || [];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const traffic = hours.filter((_, i) => i % 2 === 0).map(hour => ({
      hour,
      calls: logData.filter((l: any) => {
        const h = new Date(l.created_at).getHours();
        return h === parseInt(hour);
      }).length,
    }));
    setApiTraffic(traffic);
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeExample);
    toast({ title: "Copied!", description: "Code example copied to clipboard" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/30 via-background to-blue-950/20" />
        <div className="relative p-6 md:p-10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
                <Code className="h-7 w-7 text-violet-400" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Embedded Commerce Layer</h1>
                <p className="text-sm text-muted-foreground">Developer infrastructure embedding distribution, logistics & trade into external platforms</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
            {[
              { label: "Active API Keys", value: metrics.apiKeys.toLocaleString(), icon: Key },
              { label: "API Requests Logged", value: metrics.apiRequests.toLocaleString(), icon: Zap },
              { label: "Total Dispatches", value: metrics.dispatches.toLocaleString(), icon: Truck },
              { label: "Partner Integrations", value: metrics.partners.toLocaleString(), icon: Puzzle },
              { label: "Exchange Listings", value: metrics.exchangeListings.toLocaleString(), icon: Package },
              { label: "Invoices Processed", value: metrics.invoices.toLocaleString(), icon: DollarSign },
            ].map((m, i) => (
              <motion.div key={m.label} variants={fadeIn} transition={{ delay: i * 0.05 }}>
                <Card className="bg-card/60 backdrop-blur border-border/50">
                  <CardContent className="p-3">
                    <m.icon className="h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-lg font-bold text-foreground">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{m.label}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="p-6 md:p-10 space-y-8">
        <Tabs defaultValue="apis" className="space-y-6">
          <TabsList className="bg-muted/50 flex-wrap h-auto gap-1">
            <TabsTrigger value="apis">API Platform</TabsTrigger>
            <TabsTrigger value="sdks">SDKs & Widgets</TabsTrigger>
            <TabsTrigger value="marketplace">App Marketplace</TabsTrigger>
            <TabsTrigger value="gateway">API Gateway</TabsTrigger>
          </TabsList>

          <TabsContent value="apis" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-violet-400" />Embedded API Catalog
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
                  {embeddedAPIs.map((api, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-violet-500/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-foreground">{api.name}</h4>
                          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/20">{api.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{api.desc}</p>
                        <code className="text-[10px] text-violet-400 font-mono">{api.endpoint}</code>
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <p className="text-[10px] text-muted-foreground">p50: {api.latency}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code className="h-4 w-4 text-violet-400" />Quick Start
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={copyCode}><Copy className="h-3 w-3" />Copy</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted/30 border border-border/30 rounded-lg p-3 overflow-x-auto text-[10px] leading-relaxed font-mono text-foreground">
                    {codeExample}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sdks" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-violet-400" />SDK Libraries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sdks.map((sdk, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sdk.color }} />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{sdk.lang}</p>
                          <p className="text-[10px] text-muted-foreground">v{sdk.version}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-foreground">{sdk.downloads}</p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-violet-400 gap-1 px-2">
                          <ExternalLink className="h-3 w-3" />Docs
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-card/80 border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Puzzle className="h-4 w-4 text-cyan-400" />Embedded Widgets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {widgets.map((w, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">{w.name}</h4>
                        <Badge variant="outline" className="text-[10px]">{w.size} gzipped</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{w.desc}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{w.installs} installs</span>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1 px-2 text-violet-400">
                          <Copy className="h-3 w-3" />Embed Code
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="marketplace" className="space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Store className="h-4 w-4 text-violet-400" />RouteAce App Marketplace
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topApps.map((app, i) => (
                    <motion.div key={i} variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: i * 0.08 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/30 to-violet-950/10 border border-border/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Package className="h-5 w-5 text-violet-400" />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-amber-400">★</span>
                          <span className="text-xs text-foreground">{app.rating}</span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm">{app.name}</h4>
                        <p className="text-xs text-muted-foreground">{app.category}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{app.installs} installs</span>
                        <Button variant="outline" size="sm" className="h-6 text-[10px]">Install</Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="gateway" className="space-y-6">
            <Card className="bg-card/80 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-violet-400" />API Gateway Traffic
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={apiTraffic}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="calls" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="API Calls" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-card to-violet-950/10 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Key className="h-4 w-4 text-amber-400" />Developer Platform Access
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-4">
                  {[
                    { step: "1", title: "Create Account", desc: "Register on developer portal", icon: Users },
                    { step: "2", title: "Get API Keys", desc: "Generate auth tokens & keys", icon: Key },
                    { step: "3", title: "Sandbox Testing", desc: "Test with sandbox environment", icon: Cpu },
                    { step: "4", title: "Go Live", desc: "Switch to production", icon: CheckCircle },
                  ].map((s, i) => (
                    <div key={i} className="p-4 rounded-lg bg-muted/20 border border-border/30 text-center space-y-2">
                      <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto">
                        <span className="text-sm font-bold text-violet-400">{s.step}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
