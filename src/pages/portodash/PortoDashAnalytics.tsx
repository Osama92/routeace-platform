import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Globe, Package, DollarSign, Ship, Target, Users } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

const volumeData = [
  { month: "Oct", volume: 120 }, { month: "Nov", volume: 180 },
  { month: "Dec", volume: 210 }, { month: "Jan", volume: 280 },
  { month: "Feb", volume: 320 }, { month: "Mar", volume: 380 },
];

const productMix = [
  { name: "Cashew", value: 35, color: "hsl(var(--primary))" },
  { name: "Sesame", value: 25, color: "hsl(var(--info))" },
  { name: "Shea Butter", value: 15, color: "hsl(var(--warning))" },
  { name: "Ginger", value: 12, color: "hsl(var(--success))" },
  { name: "Others", value: 13, color: "hsl(var(--muted-foreground))" },
];

const PortoDashAnalytics = () => (
  <PortoDashLayout title="Analytics" subtitle="Comprehensive export performance analytics and reporting">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Export Volume (YTD)", value: "1,490 T", change: "+42%", icon: Package },
        { label: "Revenue (YTD)", value: "$4.2M", change: "+38%", icon: DollarSign },
        { label: "Trade Corridors", value: "12", change: "+3 new", icon: Globe },
        { label: "Active Buyers", value: "24", change: "+6", icon: Users },
      ].map(m => (
        <Card key={m.label}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between mb-2">
              <m.icon className="w-4 h-4 text-primary" />
              <span className="text-xs text-[hsl(var(--success))]">{m.change}</span>
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
            <p className="text-xs text-muted-foreground">{m.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="grid lg:grid-cols-3 gap-6 mb-8">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="text-base">Export Volume Trend (Tonnes)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={volumeData}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--info))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--info))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v}T`, "Volume"]} />
              <Area type="monotone" dataKey="volume" stroke="hsl(var(--info))" fill="url(#volGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Product Mix</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={productMix} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                {productMix.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, "Share"]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {productMix.map(p => (
              <div key={p.name} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                {p.name} ({p.value}%)
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Performance Metrics */}
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Key Performance Metrics</CardTitle></CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { metric: "Order-to-Ship Time", value: "12 days", target: "< 14 days", status: "on_track" },
            { metric: "Document Accuracy", value: "96%", target: "> 95%", status: "on_track" },
            { metric: "Customs Clearance Time", value: "3.2 days", target: "< 3 days", status: "at_risk" },
            { metric: "Buyer Satisfaction", value: "4.6/5", target: "> 4.5", status: "on_track" },
            { metric: "FX Conversion Rate", value: "₦1,502/$", target: "Market +/-2%", status: "on_track" },
            { metric: "Repeat Order Rate", value: "72%", target: "> 70%", status: "on_track" },
          ].map(m => (
            <div key={m.metric} className="p-4 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground">{m.metric}</p>
              <p className="text-xl font-bold mt-1">{m.value}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-muted-foreground">Target: {m.target}</span>
                <Badge variant={m.status === "on_track" ? "default" : "secondary"} className="text-[10px]">
                  {m.status === "on_track" ? "On Track" : "At Risk"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </PortoDashLayout>
);

export default PortoDashAnalytics;
