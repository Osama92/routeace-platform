import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store, MapPin, Target, BarChart3, CreditCard, Users,
  ArrowRight, Brain, TrendingUp, ShieldCheck,
} from "lucide-react";
import IndustryLoginSection from "@/components/landing/IndustryLoginSection";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5 } }),
};

const LandingSalesDistribution = () => (
  <section id="industry-os" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-6">
        <Badge className="mb-4 bg-infra-purple/10 text-infra-purple border-infra-purple/20">Industry Distribution OS</Badge>
        <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
          Turn Route-to-Market into an <span className="text-infra-purple">Intelligence System</span>
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Most FMCG margins are lost in execution. RouteAce replaces manual sales routing with
          AI-Guided Regional Journey Planning.
        </p>
      </div>

      {/* Territory Heatmap Mockup */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass-card p-8 max-w-2xl mx-auto mb-16 relative overflow-hidden"
      >
        <div className="absolute top-3 right-3">
          <span className="flex items-center gap-1.5 text-[10px] text-infra-purple uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-infra-purple animate-pulse" /> AI Journey Planner
          </span>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {[
            { label: "Outlet Coverage", value: "82%", sub: "4,230 outlets" },
            { label: "Revenue Opportunity", value: "₦12.4M", sub: "+18% untapped" },
            { label: "Credit Risk", value: "Low", sub: "94% repayment" },
          ].map(m => (
            <div key={m.label} className="text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
              <p className="text-xl font-bold text-infra-purple">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Animated Territory Bars */}
        <div className="space-y-3 pt-4 border-t border-border/30">
          {[
            { region: "Lagos Mainland", pct: 88, color: "bg-infra-purple" },
            { region: "Abuja Central", pct: 75, color: "bg-info" },
            { region: "Port Harcourt", pct: 62, color: "bg-primary" },
            { region: "Kano Metro", pct: 48, color: "bg-warning" },
          ].map((r, i) => (
            <div key={r.region}>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>{r.region}</span>
                <span>{r.pct}% saturation</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-1.5">
                <motion.div
                  className={`${r.color} h-1.5 rounded-full`}
                  initial={{ width: "0%" }}
                  whileInView={{ width: `${r.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1, delay: i * 0.15 }}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Capabilities */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
        {[
          { icon: Brain, title: "AI Journey Planning", desc: "AI generates optimal outlet sequences, travel time, and revenue opportunity index." },
          { icon: Target, title: "Territory Intelligence", desc: "Saturation analysis, missed-visit probability, and SKU restock scoring." },
          { icon: CreditCard, title: "Credit Risk Scoring", desc: "AI-scored retailer and distributor credit risk with default prediction." },
          { icon: BarChart3, title: "Distribution Analytics", desc: "Numeric distribution, weighted distribution, fill rate, SKU velocity." },
          { icon: ShieldCheck, title: "Regulatory Engine", desc: "Industry-specific compliance checks run before every transaction." },
          { icon: Users, title: "Distributor Intelligence", desc: "Performance ranking, allocation optimization, and churn prediction." },
        ].map((f, i) => (
          <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
            <Card className="h-full hover:border-infra-purple/30 transition-colors bg-card/60">
              <CardContent className="pt-6">
                <div className="w-11 h-11 rounded-xl bg-infra-purple/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-infra-purple" />
                </div>
                <h3 className="font-semibold mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Industry Selection */}
      <IndustryLoginSection />
    </div>
  </section>
);

export default LandingSalesDistribution;
