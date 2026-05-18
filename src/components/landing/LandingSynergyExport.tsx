import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Ship, CheckCircle, Globe, ShoppingCart,
  Cpu, CreditCard, FileCheck, RefreshCw, ArrowDown,
} from "lucide-react";

const LandingSynergyExport = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* INTEGRATION FLOW */}
      <section className="py-24 px-6 bg-secondary/20">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">End-to-End Intelligence Flow</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            From Retailer Order to <span className="gradient-text">Credit Score Update</span>
          </h2>
          <p className="text-muted-foreground mb-12 max-w-xl mx-auto text-sm">
            Every step is AI-optimized, GPS-verified, and margin-aware. When both OS environments are active, they synchronize automatically.
          </p>

          <div className="flex flex-col items-center gap-1">
            {[
              { icon: ShoppingCart, label: "Retailer Order Placed", sub: "AI-recommended SKU & quantity", color: "text-infra-purple" },
              { icon: Cpu, label: "AI Route Dispatch", sub: "Margin-optimized, traffic-aware", color: "text-primary" },
              { icon: RefreshCw, label: "GPS Delivery Confirmation", sub: "Geo-fenced proof of delivery", color: "text-success" },
              { icon: CreditCard, label: "Invoice Auto-Reconciliation", sub: "Payment matched to delivery", color: "text-info" },
              { icon: FileCheck, label: "Credit Score Updated", sub: "Real-time retailer scoring", color: "text-infra-orange" },
            ].map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="w-full max-w-lg"
              >
                <div className="glass-card p-5 flex items-center gap-4 border-border/40 hover:border-primary/30 transition-colors">
                  <div className="w-12 h-12 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0">
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="text-[11px] text-muted-foreground">{step.sub}</p>
                  </div>
                  <span className="text-xs text-primary font-mono font-bold">{String(i + 1).padStart(2, "0")}</span>
                </div>
                {i < 4 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="w-3.5 h-3.5 text-border" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPORTTECH */}
      <section id="exporttech" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <Badge className="mb-4 bg-infra-orange/10 text-infra-orange border-infra-orange/20">ExportTech · PortoDash</Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
                Africa's First <span className="text-infra-orange">Export Intelligence</span> Infrastructure
              </h2>
              <p className="text-muted-foreground mb-4">
                Small producers can now export. Logistics operators aggregate supply.
                International buyers access verified African suppliers - all in one platform.
              </p>
              <p className="text-sm text-foreground/70 mb-8">
                Input your supply capacity or investment capital - the platform generates contracts sized to your capacity.
              </p>
              <ul className="space-y-3">
                {[
                  "Verified International Buyer Contracts",
                  "Capacity Matching Engine (100kg – 1000 tonnes)",
                  "Export Documentation Automation",
                  "Exporter of Record Compliance",
                  "FX Repatriation Tracking (NGN banks)",
                  "Supply Aggregation to Global Markets",
                ].map(f => (
                  <li key={f} className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-infra-orange shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Button className="mt-8 bg-infra-orange hover:bg-infra-orange/90 text-primary-foreground font-semibold" onClick={() => navigate("/signup/company")}>
                <Ship className="w-4 h-4 mr-2" /> Activate Export Mode
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            {/* Export Trade Map */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card p-8 relative overflow-hidden"
            >
              <h3 className="text-sm font-bold mb-6 text-center uppercase tracking-wider text-muted-foreground">Global Trade Corridors</h3>
              <svg viewBox="0 0 400 250" className="w-full opacity-80">
                <circle cx="180" cy="140" r="8" fill="hsl(var(--infra-orange))" />
                <text x="180" y="162" textAnchor="middle" className="fill-foreground text-[9px] font-bold">Nigeria</text>

                {[
                  { to: { x: 200, y: 50 }, label: "Europe", delay: 0 },
                  { to: { x: 320, y: 100 }, label: "Middle East", delay: 0.5 },
                  { to: { x: 360, y: 160 }, label: "Asia", delay: 1 },
                  { to: { x: 60, y: 80 }, label: "Americas", delay: 1.5 },
                ].map(c => (
                  <g key={c.label}>
                    <motion.line
                      x1="180" y1="140" x2={c.to.x} y2={c.to.y}
                      stroke="hsl(var(--infra-orange))" strokeWidth="1.5" strokeDasharray="4 4"
                      initial={{ pathLength: 0, opacity: 0 }}
                      whileInView={{ pathLength: 1, opacity: 0.6 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: c.delay }}
                    />
                    <circle cx={c.to.x} cy={c.to.y} r="4" fill="hsl(var(--infra-orange))" opacity="0.7" />
                    <text x={c.to.x} y={c.to.y + 14} textAnchor="middle" className="fill-muted-foreground text-[7px]">{c.label}</text>
                  </g>
                ))}
              </svg>

              <div className="grid grid-cols-3 gap-3 mt-6 pt-4 border-t border-border/30">
                {[
                  { label: "Active Contracts", value: "24" },
                  { label: "Aggregated Vol.", value: "450T" },
                  { label: "FX Repatriated", value: "$1.2M" },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <p className="text-lg font-bold text-infra-orange">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingSynergyExport;
