import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Truck, MapPin, Users, Zap, Shield, Brain,
  TrendingUp, Fuel, BarChart3, ArrowRight, Crown, Factory, Building2,
} from "lucide-react";
import ctaBgVideo from "@/assets/landing/cta-bg.mp4";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5 } }),
};

const features = [
  { icon: Brain, title: "Zaza AI Operations Co-pilot", desc: "Ask your data questions. Get route, cost, and SLA answers in plain English." },
  { icon: Truck, title: "Driver Super App", desc: "Mobile-optimised portal for jobs, POD upload, earnings, and performance coaching." },
  { icon: MapPin, title: "Geopolitical Zone SLA", desc: "Lagos 1–2 days, South East 3, North 4–5." },
  { icon: Users, title: "Payroll Automation", desc: "PAYE, pension, NHF - Nigerian tax built in." },
  { icon: Zap, title: "Per-Drop Billing", desc: "₦50/drop for bikes/vans. No subscription needed." },
  { icon: Shield, title: "White-Label Resale", desc: "Turn RouteAce into your own logistics brand." },
];

const LandingLogisticsOS = () => {
  const navigate = useNavigate();

  return (
    <section id="logistics-os" className="relative overflow-hidden py-24 px-6 bg-secondary/20">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover object-center z-0"
      >
        <source src={ctaBgVideo} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-background/85 z-10" />
      <div className="max-w-7xl mx-auto relative z-20">
        <div className="text-center mb-6">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Logistics Operator OS</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            AI Route Intelligence Built for Nigerian Fleets
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Plan routes that survive Lagos traffic. Predict SLA failures before they happen.
            Optimize delivery margins in volatile fuel markets.
          </p>
        </div>

        {/* Live Route Simulation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-8 max-w-2xl mx-auto mb-16 relative overflow-hidden"
        >
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1.5 text-[10px] text-success uppercase tracking-widest font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Platform Demo
            </span>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Route Intelligence", value: "Active", color: "text-success" },
              { label: "SLA Monitoring", value: "Live", color: "text-success" },
              { label: "Cost Awareness", value: "On", color: "text-primary" },
              { label: "Fuel Tracking", value: "Per Trip", color: "text-warning" },
            ].map(m => (
              <div key={m.label} className="text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground text-center mb-4">
            Zaza AI continuously analyses every dispatch decision against route, cost, and SLA constraints.
          </p>

          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border/30">
            {[
              { icon: Brain, label: "AI Confidence" },
              { icon: TrendingUp, label: "Margin-Aware" },
              { icon: Fuel, label: "Fuel Forecast" },
              { icon: BarChart3, label: "What-If Sim" },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-1.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[10px] text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
              <Card className="h-full hover:border-primary/30 transition-colors bg-card/60">
                <CardContent className="pt-6">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-1.5 text-sm">{f.title}</h3>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Mode picker - Company vs Department */}
        <div className="mt-12 max-w-4xl mx-auto">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold mb-2">Choose your operating mode</h3>
            <p className="text-sm text-muted-foreground">
              Same engine. Two tailored experiences. Pick what fits your business.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/signup/company?mode=LOGISTICS_COMPANY")}
              className="group text-left rounded-2xl border-2 border-primary/20 hover:border-primary p-6 bg-card transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px]">3PL · Haulage</Badge>
                    <h4 className="font-bold text-lg">Logistics Company</h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  We serve clients & manage fleets. Revenue, invoicing, profit per truck, white-label resale.
                </p>
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Crown className="w-4 h-4" /> Start as Logistics Company
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/signup/company?mode=LOGISTICS_DEPARTMENT")}
              className="group text-left rounded-2xl border-2 border-infra-purple/20 hover:border-infra-purple p-6 bg-card transition-all relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-infra-purple/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-infra-purple/10 flex items-center justify-center">
                    <Factory className="w-6 h-6 text-infra-purple" />
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1 text-[10px]">FMCG · Manufacturer · Retailer</Badge>
                    <h4 className="font-bold text-lg">Logistics Department</h4>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  We manage logistics internally. Cost per delivery, SLA, warehouse-to-customer efficiency.
                </p>
                <div className="flex items-center gap-2 text-infra-purple font-semibold text-sm">
                  <Building2 className="w-4 h-4" /> Start as Logistics Department
                  <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingLogisticsOS;
