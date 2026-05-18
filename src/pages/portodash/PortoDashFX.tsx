import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ArrowRight, CheckCircle, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const fxData = [
  { month: "Oct", usd: 180000, ngn: 270 }, { month: "Nov", usd: 250000, ngn: 375 },
  { month: "Dec", usd: 310000, ngn: 465 }, { month: "Jan", usd: 420000, ngn: 630 },
  { month: "Feb", usd: 380000, ngn: 570 }, { month: "Mar", usd: 520000, ngn: 780 },
];

const transactions = [
  { contract: "TradeLink GmbH - Cashew Nuts", usd: "$340,000", ngn: "₦510.7M", rate: "₦1,502/$", bank: "Zenith Bank", date: "2026-02-28", status: "completed" },
  { contract: "Pacific Foods - Sesame Seeds", usd: "$210,000", ngn: "₦315.4M", rate: "₦1,502/$", bank: "Access Bank", date: "2026-03-01", status: "processing" },
  { contract: "Gulf Commodities - Ginger", usd: "$180,000", ngn: "-", rate: "Pending", bank: "FCMB", date: "2026-03-10", status: "pending" },
];

const PortoDashFX = () => (
  <PortoDashLayout title="FX Repatriation" subtitle="Track foreign exchange inflows and Naira conversions">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Total USD Inflow (YTD)", value: "$3.8M", color: "text-primary" },
        { label: "Converted to NGN", value: "₦5.7B", color: "text-[hsl(var(--success))]" },
        { label: "Average Rate", value: "₦1,502/$", color: "text-info" },
        { label: "Pending Conversion", value: "$180K", color: "text-[hsl(var(--warning))]" },
      ].map(m => (
        <Card key={m.label}>
          <CardContent className="pt-5 text-center">
            <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="mb-8">
      <CardHeader><CardTitle className="text-base">Monthly FX Inflows (USD)</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={fxData}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "USD Inflow"]} />
            <Bar dataKey="usd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Repatriation Transactions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {transactions.map(t => (
          <div key={t.contract} className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/10 transition-colors">
            <div>
              <p className="font-semibold text-sm">{t.contract}</p>
              <p className="text-xs text-muted-foreground">{t.bank} · {t.date}</p>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">{t.usd}</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground" />
              <span className="font-medium">{t.ngn}</span>
              <span className="text-xs text-muted-foreground">{t.rate}</span>
              <Badge variant={t.status === "completed" ? "default" : t.status === "processing" ? "secondary" : "outline"} className="capitalize text-xs">{t.status}</Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </PortoDashLayout>
);



const __InnerDemo_PortoDashFX = PortoDashFX;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashFX = () => (
  <__DemoPreviewGate title="PortoDash FX" description="Multi-currency FX exposure & hedging view.">
    <__InnerDemo_PortoDashFX />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashFX;
