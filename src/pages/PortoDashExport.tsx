import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Ship, Globe, Users, Shield, TrendingUp, CheckCircle,
  FileText, DollarSign, Package, ArrowRight, Search,
  BarChart3, AlertTriangle, Landmark,
} from "lucide-react";

const PortoDashExport = () => {
  return (
    <DashboardLayout title="PortoDash" subtitle="Africa's First ExportTech Aggregation Infrastructure">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Active Export Contracts", value: "24", change: "+12%", icon: FileText, color: "text-primary" },
          { label: "Aggregated Volume", value: "450 T", change: "+8%", icon: Package, color: "text-[hsl(var(--info))]" },
          { label: "Repatriated FX", value: "$1.2M", change: "+23%", icon: DollarSign, color: "text-[hsl(var(--success))]" },
          { label: "Compliance Pass Rate", value: "96%", change: "+2%", icon: Shield, color: "text-[hsl(var(--warning))]" },
        ].map(m => (
          <Card key={m.label} className="hover:border-primary/30 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <m.icon className={`w-4 h-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-primary mt-1">{m.change} this month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="contracts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="aggregation">Aggregation</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="fx">FX Repatriation</TabsTrigger>
        </TabsList>

        {/* Contracts Tab */}
        <TabsContent value="contracts" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Verified International Buyer Contracts</h3>
            <Button size="sm"><Ship className="w-4 h-4 mr-2" /> New Contract</Button>
          </div>
          <div className="grid gap-4">
            {[
              { buyer: "TradeLink GmbH", country: "Germany", product: "Cashew Nuts", qty: "120T", value: "$340,000", status: "active" },
              { buyer: "Pacific Foods Ltd", country: "China", product: "Sesame Seeds", qty: "80T", value: "$210,000", status: "active" },
              { buyer: "MediterraneanCo", country: "Spain", product: "Shea Butter", qty: "45T", value: "$156,000", status: "pending" },
              { buyer: "Gulf Commodities", country: "UAE", product: "Ginger", qty: "200T", value: "$480,000", status: "draft" },
            ].map(c => (
              <Card key={c.buyer} className="hover:border-primary/20 transition-colors">
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{c.buyer}</p>
                      <p className="text-xs text-muted-foreground">{c.country} · {c.product}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <p className="font-medium">{c.qty}</p>
                      <p className="text-xs text-muted-foreground">Volume</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{c.value}</p>
                      <p className="text-xs text-muted-foreground">Value</p>
                    </div>
                    <Badge variant={c.status === "active" ? "default" : c.status === "pending" ? "secondary" : "outline"}>
                      {c.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Aggregation Tab */}
        <TabsContent value="aggregation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Capacity Matching Engine
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                Input your available supply or capital - the engine matches you to contracts sized to your capacity.
              </p>
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Pooled Suppliers</p>
                  <p className="text-2xl font-bold">38</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Total Aggregated</p>
                  <p className="text-2xl font-bold">450 Tonnes</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground mb-1">Export Ready</p>
                  <p className="text-2xl font-bold text-[hsl(var(--success))]">82%</p>
                </div>
              </div>
              <Button><Search className="w-4 h-4 mr-2" /> Match My Capacity</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Landmark className="w-5 h-5 text-primary" /> Domestic Aggregation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Aggregate local demand and sell to Nigerian FMCGs. Small-scale producers → Aggregated → Sold to FMCGs.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { fmcg: "Dangote Agro", product: "Raw Cashew", qty: "60T", status: "In Progress" },
                  { fmcg: "Olam Nigeria", product: "Sesame", qty: "25T", status: "Completed" },
                ].map(d => (
                  <div key={d.fmcg} className="p-4 rounded-lg border border-border/50 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{d.fmcg}</p>
                      <p className="text-xs text-muted-foreground">{d.product} · {d.qty}</p>
                    </div>
                    <Badge variant="secondary">{d.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Two-Sided Trust Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Buyer Verification
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: "TradeLink GmbH", score: 94, status: "verified" },
                      { name: "Pacific Foods Ltd", score: 88, status: "verified" },
                      { name: "Gulf Commodities", score: 72, status: "pending" },
                    ].map(v => (
                      <div key={v.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div>
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">Reliability: {v.score}%</p>
                        </div>
                        <Badge variant={v.status === "verified" ? "default" : "secondary"}>{v.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" /> Supplier Verification
                  </h4>
                  <div className="space-y-3">
                    {[
                      { name: "Kano Cashew Coop", score: 91, status: "verified" },
                      { name: "Benue Sesame Farm", score: 85, status: "verified" },
                      { name: "Ogun Shea Collective", score: 67, status: "review" },
                    ].map(v => (
                      <div key={v.name} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                        <div>
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">Reliability: {v.score}%</p>
                        </div>
                        <Badge variant={v.status === "verified" ? "default" : "secondary"}>{v.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Exporter of Record System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-6">
                PortoDash licensed partner agencies act as Exporter of Record - handling documentation, compliance, and regulatory controls.
              </p>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Export Readiness", value: "82%", color: "text-[hsl(var(--success))]" },
                  { label: "Documentation Complete", value: "19/24", color: "text-primary" },
                  { label: "Compliance Alerts", value: "3", color: "text-[hsl(var(--warning))]" },
                ].map(s => (
                  <div key={s.label} className="p-4 rounded-lg border border-border bg-secondary/30 text-center">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FX Repatriation Tab */}
        <TabsContent value="fx" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-primary" /> FX Repatriation Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Total Inflow (USD)</p>
                  <p className="text-2xl font-bold">$1,186,000</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Converted (NGN)</p>
                  <p className="text-2xl font-bold">₦1.78B</p>
                </div>
                <div className="p-4 rounded-lg border border-border bg-secondary/30">
                  <p className="text-xs text-muted-foreground">Avg FX Rate</p>
                  <p className="text-2xl font-bold">₦1,502/$</p>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { contract: "TradeLink GmbH - Cashew", amount: "$340,000", ngn: "₦510.7M", date: "2026-02-28", status: "completed" },
                  { contract: "Pacific Foods - Sesame", amount: "$210,000", ngn: "₦315.4M", date: "2026-03-01", status: "processing" },
                ].map(fx => (
                  <div key={fx.contract} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                    <div>
                      <p className="text-sm font-medium">{fx.contract}</p>
                      <p className="text-xs text-muted-foreground">{fx.date}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{fx.amount}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{fx.ngn}</span>
                      <Badge variant={fx.status === "completed" ? "default" : "secondary"}>{fx.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};



const __InnerDemo_PortoDashExport = PortoDashExport;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashExport = () => (
  <__DemoPreviewGate title="PortoDash Export" description="Standalone export trade workspace.">
    <__InnerDemo_PortoDashExport />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashExport;
