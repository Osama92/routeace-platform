import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Ship, Globe, Package, FileText, DollarSign, Shield,
  TrendingUp, AlertTriangle, ArrowRight, CheckCircle,
  Clock, MapPin, Users,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

const revenueData = [
  { month: "Sep", value: 320000 }, { month: "Oct", value: 480000 },
  { month: "Nov", value: 410000 }, { month: "Dec", value: 620000 },
  { month: "Jan", value: 550000 }, { month: "Feb", value: 780000 },
  { month: "Mar", value: 920000 },
];

const corridorData = [
  { corridor: "EU", volume: 340 }, { corridor: "Asia", volume: 210 },
  { corridor: "Middle East", volume: 180 }, { corridor: "Americas", volume: 95 },
  { corridor: "UK", volume: 75 },
];

const PortoDashCommandCenter = () => (
  <PortoDashLayout title="Command Center" subtitle="Africa's ExportTech Infrastructure - Real-Time Overview">
    {/* KPI Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Active Export Contracts", value: "47", change: "+18%", icon: FileText, color: "text-primary" },
        { label: "Total Export Volume", value: "1,240 T", change: "+24%", icon: Package, color: "text-info" },
        { label: "Repatriated FX", value: "$3.8M", change: "+31%", icon: DollarSign, color: "text-[hsl(var(--success))]" },
        { label: "Compliance Score", value: "97.2%", change: "+1.8%", icon: Shield, color: "text-[hsl(var(--warning))]" },
      ].map(m => (
        <Card key={m.label} className="hover:border-primary/30 transition-colors">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-primary mt-1">{m.change} vs last quarter</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      {/* Revenue Trend */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Export Revenue Trend (USD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="exportGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
              <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#exportGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Trade Corridors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-info" /> Trade Corridors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={corridorData} layout="vertical">
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis dataKey="corridor" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={80} />
              <Tooltip formatter={(v: number) => [`${v}T`, "Volume"]} />
              <Bar dataKey="volume" fill="hsl(var(--info))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>

    {/* Active Shipments */}
    <Card className="mb-8">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Ship className="w-4 h-4 text-primary" /> Active Shipments
          </CardTitle>
          <Button variant="outline" size="sm">View All</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[
            { id: "PD-2026-0341", product: "Cashew Nuts", dest: "Hamburg, Germany", buyer: "TradeLink GmbH", volume: "120T", status: "in_transit", progress: 65 },
            { id: "PD-2026-0342", product: "Sesame Seeds", dest: "Shanghai, China", buyer: "Pacific Foods", volume: "80T", status: "customs_clearance", progress: 40 },
            { id: "PD-2026-0343", product: "Shea Butter", dest: "Barcelona, Spain", buyer: "MediterraneanCo", volume: "45T", status: "loading", progress: 20 },
            { id: "PD-2026-0344", product: "Hibiscus Flowers", dest: "Dubai, UAE", buyer: "Gulf Commodities", volume: "60T", status: "documentation", progress: 10 },
          ].map(s => (
            <div key={s.id} className="p-4 rounded-lg border border-border/50 hover:border-primary/20 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Ship className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{s.product}</p>
                    <p className="text-xs text-muted-foreground">{s.id} · {s.volume}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{s.buyer}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <MapPin className="w-3 h-3" /> {s.dest}
                  </p>
                </div>
                <Badge variant={s.status === "in_transit" ? "default" : "secondary"} className="text-xs capitalize">
                  {s.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <Progress value={s.progress} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Alerts */}
    <div className="grid md:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[hsl(var(--warning))]" /> Compliance Alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { msg: "Certificate of Origin expires in 5 days - Sesame shipment PD-0342", severity: "warning" },
            { msg: "Phytosanitary inspection required - Hibiscus PD-0344", severity: "info" },
            { msg: "Export license renewal due - Shea Butter category", severity: "warning" },
          ].map((a, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${a.severity === "warning" ? "text-[hsl(var(--warning))]" : "text-info"}`} />
              {a.msg}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Pending Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { action: "Approve freight booking for PD-0343", type: "logistics" },
            { action: "Sign commercial invoice - Gulf Commodities", type: "finance" },
            { action: "Upload quality certificate - Cashew shipment", type: "compliance" },
          ].map((a, i) => (
            <button key={i} className="w-full flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs hover:bg-muted transition-colors">
              <span className="text-muted-foreground">{a.action}</span>
              <ArrowRight className="w-3 h-3 text-primary" />
            </button>
          ))}
        </CardContent>
      </Card>
    </div>
  </PortoDashLayout>
);



const __InnerDemo_PortoDashCommandCenter = PortoDashCommandCenter;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashCommandCenter = () => (
  <__DemoPreviewGate title="PortoDash Command Center" description="Unified export operations dashboard.">
    <__InnerDemo_PortoDashCommandCenter />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashCommandCenter;
