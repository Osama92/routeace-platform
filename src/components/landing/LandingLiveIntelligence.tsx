import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Activity, Brain, Target, TrendingUp, Shield, Fuel, BarChart3,
  Package, Globe, CheckCircle,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.08 * i, duration: 0.5 } }),
};

const LandingLiveIntelligence = () => {
  return (
    <>
      {/* AFRICAN LOGISTICS MARKET OPPORTUNITY */}
      <section className="py-20 px-6 bg-secondary/20 border-y border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs text-primary uppercase tracking-widest font-medium">African Logistics Market Opportunity</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold font-heading">
              The Problem Is Real. The Cost Is Measurable.
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Nigeria Logistics Market", value: "$10.95B", icon: Activity },
              { label: "Fleet Fraud Rate (Avg)", value: "12–18%", icon: Shield },
              { label: "Invoice Dispute Rate", value: "18% of trips", icon: Package },
              { label: "Asset Utilisation Gap", value: "55% → 75%", icon: TrendingUp },
              { label: "Africa Logistics TAM", value: "$92B", icon: Globe },
              { label: "Deploy Time (Cloud ERP)", value: "< 1 day", icon: CheckCircle },
            ].map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card p-4 text-center hover:border-primary/30 transition-colors"
              >
                <m.icon className="w-4 h-4 text-primary mx-auto mb-2" />
                <p className="text-xl md:text-2xl font-bold font-heading">{m.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{m.label}</p>
              </motion.div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-4">
            Sources: NARTO, World Bank Africa Logistics Report 2024, Statista Nigeria Transport Market 2025.
          </p>
        </div>
      </section>

      {/* ADEI - African Distribution Efficiency Index */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Continental Benchmark</Badge>
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
              African Distribution Efficiency Index
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">
              RouteAce's internal benchmark scoring model. Composite of delivery speed, route reliability, retail reach, and logistics cost efficiency. Scores reflect RouteAce estimates based on World Bank, UNCTAD, and country logistics performance index data.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Country Scores */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Continental Rankings</h3>
              <div className="space-y-4">
                {[
                  { country: "Rwanda", flag: "🇷🇼", score: 82 },
                  { country: "South Africa", flag: "🇿🇦", score: 79 },
                  { country: "Kenya", flag: "🇰🇪", score: 74 },
                  { country: "Nigeria", flag: "🇳🇬", score: 71 },
                  { country: "Ghana", flag: "🇬🇭", score: 68 },
                ].map((c, i) => (
                  <div key={c.country}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{c.flag} {c.country}</span>
                      <span className="font-bold text-primary">{c.score}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <motion.div
                        className="bg-primary h-1.5 rounded-full"
                        initial={{ width: "0%" }}
                        whileInView={{ width: `${c.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nigeria City Breakdown */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">🇳🇬 Nigeria City Rankings</h3>
              <div className="space-y-4">
                {[
                  { city: "Lagos", score: 78 },
                  { city: "Abuja", score: 74 },
                  { city: "Port Harcourt", score: 70 },
                  { city: "Kano", score: 66 },
                  { city: "Ibadan", score: 64 },
                ].map((c, i) => (
                  <div key={c.city}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{c.city}</span>
                      <span className="font-bold text-primary">{c.score}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <motion.div
                        className="bg-gradient-to-r from-primary to-info h-1.5 rounded-full"
                        initial={{ width: "0%" }}
                        whileInView={{ width: `${c.score}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-3 italic">
            RouteAce benchmark estimates. Not a published third-party index. Sources: World Bank LPI 2023, UNCTAD Transport Review 2024.
          </p>
        </div>
      </section>

      {/* PREDICTIVE INTELLIGENCE */}
      <section className="py-20 px-6 bg-secondary/20">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Both OS Environments</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Not Just Software. <span className="gradient-text">Distribution Intelligence.</span>
          </h2>
          <p className="text-muted-foreground mb-12 max-w-2xl mx-auto text-sm">
            Every decision is risk-scored. Every route is cost-aware. Built on African logistics data: Nigerian corridors, ECOWAS routes and East African supply chains.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Margin Compression Forecast", desc: "Predict and prevent margin erosion before it happens." },
              { icon: Target, title: "SLA Risk Alerts", desc: "Real-time monitoring flags at-risk deliveries before they breach your SLA window." },
              { icon: TrendingUp, title: "Revenue Opportunity Index", desc: "Identify untapped revenue corridors across territories." },
              { icon: Shield, title: "Credit Default Prediction", desc: "AI-scored retailer and distributor credit risk." },
              { icon: Fuel, title: "Cost Escalation Warning", desc: "Fuel, toll, and operational cost spike alerts." },
              { icon: BarChart3, title: "Route Delay Patterns", desc: "Identifies corridors and time windows with highest historical SLA breach rates." },
            ].map((f, i) => (
              <motion.div key={f.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}>
                <Card className="h-full text-center hover:border-primary/30 transition-colors bg-card/60">
                  <CardContent className="pt-6">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-1 text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingLiveIntelligence;
