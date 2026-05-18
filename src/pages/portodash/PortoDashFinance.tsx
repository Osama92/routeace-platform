import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, DollarSign, Shield, FileText, TrendingUp, Clock, CheckCircle } from "lucide-react";

const PortoDashFinance = () => (
  <PortoDashLayout title="Trade Finance" subtitle="Export financing, invoice factoring, and trade insurance">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "Active Facilities", value: "$1.2M", icon: CreditCard, color: "text-primary" },
        { label: "Invoices Factored", value: "12", icon: FileText, color: "text-info" },
        { label: "Insurance Coverage", value: "$2.4M", icon: Shield, color: "text-[hsl(var(--success))]" },
        { label: "Escrow Balance", value: "$340K", icon: DollarSign, color: "text-[hsl(var(--warning))]" },
      ].map(m => (
        <Card key={m.label}>
          <CardContent className="pt-5">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <m.icon className={`w-4 h-4 ${m.color}`} />
            </div>
            <p className="text-2xl font-bold">{m.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>

    <Tabs defaultValue="financing">
      <TabsList className="mb-6">
        <TabsTrigger value="financing">Export Financing</TabsTrigger>
        <TabsTrigger value="factoring">Invoice Factoring</TabsTrigger>
        <TabsTrigger value="insurance">Trade Insurance</TabsTrigger>
        <TabsTrigger value="escrow">Payment Escrow</TabsTrigger>
      </TabsList>

      <TabsContent value="financing" className="space-y-4">
        {[
          { facility: "Pre-Export Finance - Cashew Q1", provider: "Zenith Bank", amount: "$400,000", rate: "12% p.a.", tenor: "90 days", status: "active", disbursed: "2026-01-15" },
          { facility: "Working Capital - Sesame Procurement", provider: "Access Bank", amount: "$250,000", rate: "14% p.a.", tenor: "60 days", status: "active", disbursed: "2026-02-01" },
          { facility: "Export Credit Line - H2 2026", provider: "NEXIM Bank", amount: "$600,000", rate: "9% p.a.", tenor: "180 days", status: "approved", disbursed: "Pending" },
        ].map(f => (
          <Card key={f.facility} className="hover:border-primary/10 transition-colors">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{f.facility}</p>
                <p className="text-xs text-muted-foreground">{f.provider} · {f.rate} · {f.tenor}</p>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <p className="font-bold text-primary">{f.amount}</p>
                <Badge variant={f.status === "active" ? "default" : "secondary"} className="capitalize">{f.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="factoring" className="space-y-4">
        {[
          { invoice: "INV-PD-0341", buyer: "TradeLink GmbH", amount: "$340,000", advance: "80%", fee: "2.5%", status: "funded" },
          { invoice: "INV-PD-0342", buyer: "Pacific Foods", amount: "$210,000", advance: "75%", fee: "3%", status: "pending" },
        ].map(f => (
          <Card key={f.invoice} className="hover:border-primary/10 transition-colors">
            <CardContent className="py-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{f.invoice} - {f.buyer}</p>
                <p className="text-xs text-muted-foreground">Advance: {f.advance} · Fee: {f.fee}</p>
              </div>
              <div className="flex items-center gap-4">
                <p className="font-bold">{f.amount}</p>
                <Badge variant={f.status === "funded" ? "default" : "secondary"} className="capitalize">{f.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      <TabsContent value="insurance">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { type: "Credit Insurance", coverage: "$1.2M", provider: "NEXIM", premium: "$12,000/yr" },
                { type: "Marine Cargo Insurance", coverage: "$800K", provider: "AXA Mansard", premium: "$8,500/yr" },
                { type: "Political Risk Insurance", coverage: "$400K", provider: "MIGA", premium: "$6,000/yr" },
              ].map(i => (
                <div key={i.type} className="p-4 rounded-lg border border-border/50">
                  <Shield className="w-5 h-5 text-[hsl(var(--success))] mb-2" />
                  <p className="font-semibold text-sm">{i.type}</p>
                  <p className="text-xl font-bold text-primary mt-1">{i.coverage}</p>
                  <p className="text-xs text-muted-foreground mt-1">{i.provider} · {i.premium}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="escrow">
        <Card>
          <CardContent className="pt-6 space-y-3">
            {[
              { contract: "TradeLink GmbH - Cashew", escrow: "$340,000", released: "$170,000", remaining: "$170,000", milestones: "2/4 completed" },
              { contract: "Pacific Foods - Sesame", escrow: "$210,000", released: "$0", remaining: "$210,000", milestones: "0/3 completed" },
            ].map(e => (
              <div key={e.contract} className="p-4 rounded-lg border border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">{e.contract}</p>
                  <p className="text-xs text-muted-foreground">{e.milestones}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-medium">{e.escrow}</p>
                    <p className="text-[10px] text-muted-foreground">Total Escrow</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-[hsl(var(--success))]">{e.released}</p>
                    <p className="text-[10px] text-muted-foreground">Released</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{e.remaining}</p>
                    <p className="text-[10px] text-muted-foreground">Remaining</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  </PortoDashLayout>
);



const __InnerDemo_PortoDashFinance = PortoDashFinance;


/* ── Demo-Preview Gate (auto-added) ──────────────────────────── */
import { DemoPreviewGate as __DemoPreviewGate } from "@/components/demo/DemoPreviewGate";
const __WrappedDemo_PortoDashFinance = () => (
  <__DemoPreviewGate title="PortoDash Finance" description="Trade finance & payment settlement view.">
    <__InnerDemo_PortoDashFinance />
  </__DemoPreviewGate>
);
export default __WrappedDemo_PortoDashFinance;
