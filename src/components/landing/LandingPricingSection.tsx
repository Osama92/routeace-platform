import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Bike, Truck, Layers, Building2, Lock, ArrowRight, Calculator } from "lucide-react";
import PricingSimulator from "./PricingSimulator";
import { LC_PRICING_PLANS } from "@/config/lcPricingPlans";

const PLAN_ICON: Record<string, any> = {
  starter: Truck,
  bikes_vans: Bike,
  heavy_fleet: Truck,
  mixed_fleet: Layers,
};

const LOGISTICS_PLANS = LC_PRICING_PLANS.map((p) => ({
  name: p.name,
  // landing concatenates price + period (e.g. "₦5,000/vehicle/mo") for compactness
  price: p.period ? `${p.price}${p.period}` : p.price,
  sub: p.sub,
  icon: PLAN_ICON[p.id] ?? Truck,
  features: p.features,
  highlighted: !!p.popular,
}));

const DEPT_PLANS = [
  {
    name: "Foundation",
    price: "₦150,000/mo",
    sub: "Up to 5 users · ₦10,000/extra user",
    icon: Building2,
    features: [
      "Core Transport Module",
      "Dispatch & Real-Time Tracking",
      "Fleet Management",
      "Basic 3PL Vendor Management",
      "SLA Tracking Dashboard",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₦350,000/mo",
    sub: "Up to 15 users · ₦7,500/extra user",
    icon: Layers,
    features: [
      "Everything in Foundation",
      "AI Dispatch Optimization",
      "Vendor Rate Card Upload (Excel)",
      "3PL vs Internal Cost AI",
      "Automated Vendor Payouts",
      "Maintenance Intelligence",
    ],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "₦1,200,000/mo",
    sub: "Up to 50 users · ₦5,000/extra user",
    icon: Building2,
    features: [
      "Everything in Growth",
      "AI CFO (Cost & Margin Intelligence)",
      "Autonomous Dispatch Rebalancing",
      "Multi-Warehouse / Multi-Region",
      "ERP & WMS API Integrations",
      "Sales Department E2E Tracking Portal",
    ],
    highlighted: false,
  },
];

type LogisticsView = "company" | "department";

const LandingPricingSection = () => {
  const navigate = useNavigate();
  const [logisticsView, setLogisticsView] = useState<LogisticsView>("company");

  const renderLogisticsColumn = () => (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Truck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-heading font-bold text-lg leading-tight">Logistics OS</h3>
          <p className="text-xs text-muted-foreground">Two pricing models. Pick the one that fits your business.</p>
        </div>
      </div>

      {/* Sub-tab: Company vs Department */}
      <div className="flex gap-1 mt-4 mb-2 p-1 rounded-lg bg-muted/60">
        <button
          onClick={() => setLogisticsView("company")}
          className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
            logisticsView === "company" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Logistics Company
        </button>
        <button
          onClick={() => setLogisticsView("department")}
          className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
            logisticsView === "department" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Logistics Department
        </button>
      </div>

      {logisticsView === "department" && (
        <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
          <p className="text-xs font-medium">Enterprise Logistics Control. Priced for departments, not per seat.</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pay for operational control. Scale your team without per-seat fees.</p>
        </div>
      )}

      <div className="grid gap-3 mt-3">
        {(logisticsView === "company" ? LOGISTICS_PLANS : DEPT_PLANS).map((p: any, i) => (
          <motion.div
            key={p.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className={`${p.highlighted ? "border-primary/40 shadow-md ring-1 ring-primary/10" : "border-border/40"} bg-card/80 transition-shadow hover:shadow-lg`}>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <p.icon className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">{p.name}</span>
                  {p.highlighted && (
                    <Badge className="bg-primary/10 text-primary text-[10px] ml-auto border-0">
                      {logisticsView === "department" ? "Most Popular" : "Popular"}
                    </Badge>
                  )}
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold tracking-tight">{p.price}</span>
                  <span className="text-xs text-muted-foreground">{p.sub}</span>
                </div>
                <ul className="space-y-1.5">
                  {p.features.map((f: string) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle className="w-3 h-3 text-primary shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {logisticsView === "department" && (
        <p className="text-[11px] text-muted-foreground mt-3 px-2">
          60-day free trial included on all department plans. No card required. Different from per-seat pricing: you pay for operational control, not for how many people log in. Extra users billed at end of each cycle.
        </p>
      )}
      {logisticsView === "company" && (
        <p className="text-[11px] text-muted-foreground mt-3 px-2">
          30-day free trial on all LC plans. No card required.
        </p>
      )}

      <Button
        className="w-full mt-5 bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        onClick={() =>
          navigate(
            logisticsView === "department"
              ? "/signup/company?mode=LOGISTICS_DEPARTMENT"
              : "/signup/company?mode=LOGISTICS_COMPANY"
          )
        }
      >
        {logisticsView === "department" ? "Start as Logistics Department" : "Start as Logistics Company"} <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Transparent, Usage-Based Pricing
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Whether you run a fleet or manage an enterprise logistics team: no hidden fees, no long contracts.
          </p>
        </motion.div>

        {/* Single column layout */}
        <div className="max-w-2xl mx-auto">
          {renderLogisticsColumn()}
        </div>

        {/* Interactive Pricing Simulator */}
        <motion.div
          className="mt-16 max-w-xl mx-auto"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-primary mb-2">
              <Calculator className="w-4 h-4" /> Pricing Simulator
            </div>
            <h3 className="text-xl font-bold font-heading">See what you'll actually pay</h3>
            <p className="text-xs text-muted-foreground mt-1">Adjust the sliders to match your scale</p>
          </div>
          <PricingSimulator />
        </motion.div>

        {/* Positioning strip */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
            Not just software. Infrastructure.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-primary" /> Logistics operations</span>
          </div>
        </motion.div>

        {/* Security / isolation message */}
        <motion.div
          className="mt-8 text-center glass-card p-4 max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <p className="text-xs text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
            <Lock className="w-3.5 h-3.5" />
            Your data is fully isolated from every other organisation on the platform.
            Role-based access controls. Nigerian data residency. NDPA 2023 compliant.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default LandingPricingSection;
