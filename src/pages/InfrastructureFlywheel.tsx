import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import {
  Truck, Globe, Shield, DollarSign, Database, Layers, Network,
  TrendingUp, Users, Building2, BarChart3, Zap, ArrowRight
} from "lucide-react";

const ENGINES = [
  { id: 1, name: "Industry Operating Systems", icon: Layers, color: "hsl(199, 89%, 48%)", desc: "FMCG, Pharma, Agri, Liquor, Auto, Building, Beauty, Consumer, BFSI verticals" },
  { id: 2, name: "Logistics Operator OS", icon: Truck, color: "hsl(173, 80%, 40%)", desc: "Fleet management, dispatch, driver management, delivery execution" },
  { id: 3, name: "Distribution Exchange", icon: Network, color: "hsl(262, 83%, 58%)", desc: "Supply-demand-logistics matching marketplace" },
  { id: 4, name: "Distribution Liquidity Engine", icon: Zap, color: "hsl(25, 95%, 53%)", desc: "Ensures supply chains never stall - continuous capacity balancing" },
  { id: 5, name: "Trade Finance Network", icon: DollarSign, color: "hsl(142, 76%, 36%)", desc: "Invoice financing, fleet financing, credit scoring" },
  { id: 6, name: "Commerce Identity & Trust", icon: Shield, color: "hsl(346, 77%, 50%)", desc: "RCID passport, trust scoring, verification" },
  { id: 7, name: "Embedded Commerce Layer", icon: Globe, color: "hsl(221, 83%, 53%)", desc: "REST APIs, SDKs, ERP/POS integrations" },
];

const METRICS = [
  { label: "Businesses Onboarded", value: "1,250+", icon: Building2 },
  { label: "Fleets Connected", value: "340+", icon: Truck },
  { label: "Distributors Active", value: "890+", icon: Users },
  { label: "Trade Finance Volume", value: "₦2.4B", icon: DollarSign },
  { label: "API Integrations", value: "45+", icon: Globe },
  { label: "Routes Optimized", value: "125K+", icon: TrendingUp },
];

const INVESTOR_METRICS = [
  { label: "Platform GMV", value: "₦18.7B", change: "+34% QoQ" },
  { label: "Network Liquidity Index", value: "78.4", change: "+12 pts" },
  { label: "SaaS Revenue (ARR)", value: "₦420M", change: "+67% YoY" },
  { label: "Transaction Revenue", value: "₦85M", change: "+41% QoQ" },
  { label: "Trade Finance Rev", value: "₦156M", change: "+89% YoY" },
  { label: "Net Revenue Retention", value: "138%", change: "+8 pts" },
];

export default function InfrastructureFlywheel() {
  const [investorMode, setInvestorMode] = useState(false);
  const [activeEngine, setActiveEngine] = useState<number | null>(null);

  return (
    <DashboardLayout title="Infrastructure Flywheel" subtitle="RouteAce Platform Architecture & Growth Engine">
      <div className="flex items-center justify-end gap-3 mb-6">
        <span className="text-sm text-muted-foreground">Investor View</span>
        <Switch checked={investorMode} onCheckedChange={setInvestorMode} />
      </div>

      {/* Network Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {(investorMode ? INVESTOR_METRICS : METRICS).map(m => (
          <Card key={m.label}>
            <CardContent className="p-4 text-center">
              {"icon" in m && <m.icon className="w-5 h-5 mx-auto mb-2 text-primary" />}
              <p className="text-lg font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              {"change" in m && <Badge variant="secondary" className="mt-1 text-xs">{m.change}</Badge>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Flywheel Visualization */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>RouteAce Commerce Infrastructure</CardTitle>
          <CardDescription>7 interconnected platform engines creating a self-reinforcing growth flywheel</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative flex items-center justify-center py-12">
            {/* Center Hub */}
            <div className="absolute z-10 flex flex-col items-center justify-center w-40 h-40 rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-xl">
              <Database className="w-8 h-8 mb-1" />
              <p className="text-xs font-bold text-center leading-tight">RouteAce<br/>Commerce<br/>Infrastructure</p>
            </div>
            {/* Orbit Ring */}
            <div className="w-[520px] h-[520px] rounded-full border-2 border-dashed border-muted-foreground/20 relative">
              {ENGINES.map((engine, i) => {
                const angle = (i * 360) / ENGINES.length - 90;
                const rad = (angle * Math.PI) / 180;
                const x = 260 + 220 * Math.cos(rad) - 60;
                const y = 260 + 220 * Math.sin(rad) - 35;
                return (
                  <button
                    key={engine.id}
                    onClick={() => setActiveEngine(activeEngine === engine.id ? null : engine.id)}
                    className={`absolute w-[120px] p-2 rounded-xl border-2 transition-all text-center hover:scale-105 ${
                      activeEngine === engine.id
                        ? "border-primary bg-primary/10 shadow-lg"
                        : "border-border bg-card shadow-sm hover:border-primary/50"
                    }`}
                    style={{ left: x, top: y }}
                  >
                    <engine.icon className="w-5 h-5 mx-auto mb-1" style={{ color: engine.color }} />
                    <p className="text-[10px] font-semibold leading-tight">{engine.name}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {activeEngine && (
            <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
              {(() => {
                const e = ENGINES.find(x => x.id === activeEngine)!;
                return (
                  <div className="flex items-start gap-3">
                    <e.icon className="w-6 h-6 mt-0.5" style={{ color: e.color }} />
                    <div>
                      <p className="font-semibold">{e.name}</p>
                      <p className="text-sm text-muted-foreground">{e.desc}</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Flow */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Data Flow</CardTitle>
          <CardDescription>How value flows between engines creating network effects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { from: "Industry OS", to: "Distribution Exchange", flow: "Product demand & supply signals" },
              { from: "Distribution Exchange", to: "Logistics OS", flow: "Delivery orders & capacity matching" },
              { from: "Logistics OS", to: "Trade Finance", flow: "Receivables, delivery proof, fleet CCC" },
              { from: "Trade Finance", to: "Commerce Identity", flow: "Credit scores & payment reliability" },
              { from: "Commerce Identity", to: "Embedded Commerce", flow: "Verified identities & trust data" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                <Badge variant="outline" className="min-w-[140px] justify-center">{f.from}</Badge>
                <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <Badge variant="outline" className="min-w-[140px] justify-center">{f.to}</Badge>
                <span className="text-sm text-muted-foreground ml-2">{f.flow}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
