import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Shield, CheckCircle, ArrowRight, FileCheck, Fuel, Wrench,
  ClipboardCheck, Zap, DollarSign,
} from "lucide-react";
import mechanicImg from "@/assets/landing/img-2-mechanic.png";

const FLEET_IMAGE = mechanicImg;

const pains = [
  { icon: Shield, pain: "Drivers ghost-fueling and falsifying trips", fix: "GPS-verified dispatch + driver fraud scoring on every trip" },
  { icon: FileCheck, pain: "Clients disputing invoices you can't prove", fix: "Time-stamped PODs, digital waybills, SLA evidence trail" },
  { icon: Fuel, pain: "Fuel costs eating 35%+ of every trip", fix: "Fuel logs per vehicle, km-per-litre tracking, anomaly alerts" },
  { icon: Wrench, pain: "Logistics assets breaking down with zero warning", fix: "Pre-trip checklists by drivers, digital work orders, maintenance SLA tracking" },
  { icon: ClipboardCheck, pain: "Document compliance failures blocking contracts", fix: "Vehicle document expiry tracker. Alerts 30 days before expiry." },
  { icon: DollarSign, pain: "No idea which vehicles make or lose money", fix: "Revenue per vehicle, utilisation %, idle-loss calculation" },
];

export default function LandingLCSection() {
  const navigate = useNavigate();
  return (
    <section id="lc-section" className="relative py-24 px-6 bg-secondary/10 overflow-hidden">
      <img src={FLEET_IMAGE} alt="Mechanic servicing logistics asset" className="absolute inset-0 w-full h-full object-cover opacity-[0.06] pointer-events-none" />
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">For Logistics Companies</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Every Problem You Have Today.<br />
            <span className="gradient-text">RouteAce Has the Fix.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            We did not build a generic fleet tracker. We built specifically for Nigerian road logistics:
            Nigerian roads, Nigerian fuel prices, Nigerian client expectations.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {pains.map((item, i) => (
            <motion.div
              key={item.pain}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.06 * i, duration: 0.5 }}
            >
              <Card className="h-full bg-card/80 hover:border-primary/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border/30">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{item.pain}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.fix}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Button onClick={() => navigate("/signup/company?mode=LOGISTICS_COMPANY")} size="lg" className="gap-2 px-8">
            <Zap className="w-4 h-4" />
            Start Free. See the Difference in 30 Days.
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">No credit card. No hardware. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
