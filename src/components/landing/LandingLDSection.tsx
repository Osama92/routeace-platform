import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, ArrowRight, Target, Package, Users, BarChart3, Shield, Globe,
} from "lucide-react";

const pillars = [
  { icon: Target, title: "OTIF & Delivery KPIs", desc: "On-Time In Full, DQI (damage ppm), refusal root cause and KM deviation. Measured to DPO book standards.", color: "text-primary" },
  { icon: Users, title: "3PL Transporter Portal", desc: "Invite 3PL carriers with a link. They confirm pickups, update location, upload POD. You see it all in real time.", color: "text-teal-500" },
  { icon: Globe, title: "ERP / WMS Integration", desc: "Connect SAP, Odoo, Oracle, Microsoft D365 and 25+ others. Inventory DOI auto-syncs from your warehouse.", color: "text-info" },
  { icon: BarChart3, title: "Planning Pillar KPIs", desc: "S&OP meeting tracker, risk register (probability × impact), peak period planning, inventory min/max.", color: "text-infra-purple" },
  { icon: Package, title: "Inbound & Outbound Control", desc: "Outbound dispatch creation, waybill management and inbound receipting. Visible to every role in your hierarchy.", color: "text-infra-orange" },
  { icon: Shield, title: "Role Hierarchy", desc: "Head of Logistics, Logistics Manager, Outbound Officer, Finance Controller, Sales Department and 3PL Transporter. Each sees only what they need.", color: "text-success" },
];

const erps = ["SAP", "Oracle", "Odoo", "Microsoft D365", "Sage", "QuickBooks", "NetSuite", "+ 22 more"];

const plans = [
  { name: "Foundation", price: "₦150,000/mo", users: "5 users", cta: false },
  { name: "Growth", price: "₦350,000/mo", users: "15 users", cta: true },
  { name: "Enterprise", price: "₦1,200,000/mo", users: "50 users", cta: false },
];

export default function LandingLDSection() {
  const navigate = useNavigate();
  return (
    <section id="ld-section" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-teal-500/10 text-teal-500 border-teal-500/20">For Enterprise Logistics Departments</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Your Logistics Department.<br />
            <span className="gradient-text">Running at World-Class Standard.</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            FMCG, Manufacturing, Oil & Gas, Retail. RouteAce gives your logistics team
            the same intelligence infrastructure global brands use, at African pricing.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: 0.06 * i, duration: 0.5 }}
            >
              <Card className="h-full bg-card/80 hover:border-teal-500/30 transition-colors">
                <CardContent className="pt-6">
                  <div className="w-11 h-11 rounded-xl bg-secondary/60 flex items-center justify-center mb-4">
                    <p.icon className={`w-5 h-5 ${p.color}`} />
                  </div>
                  <h3 className="font-semibold mb-1.5 text-sm">{p.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* ERP integrations */}
        <div className="text-center mb-14">
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-4">
            Connects to your existing ERP or WMS
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {erps.map(e => (
              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
            ))}
          </div>
        </div>

        {/* Pricing summary */}
        <div className="grid md:grid-cols-3 gap-4 mb-12 max-w-4xl mx-auto">
          {plans.map(p => (
            <Card
              key={p.name}
              className={`${p.cta ? "border-teal-500/40 ring-1 ring-teal-500/10" : "border-border/40"} bg-card/80 text-center`}
            >
              <CardContent className="pt-6">
                {p.cta && <Badge className="mb-2 bg-teal-500/10 text-teal-500 border-0">Most Popular</Badge>}
                <h4 className="font-semibold text-sm mb-2">{p.name}</h4>
                <p className="text-2xl font-bold font-heading text-foreground mb-1">{p.price}</p>
                <p className="text-xs text-muted-foreground">{p.users} · 60-day free trial</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            onClick={() => navigate("/signup/company?mode=LOGISTICS_DEPARTMENT")}
            size="lg"
            className="gap-2 px-8 bg-teal-600 hover:bg-teal-700 text-primary-foreground"
          >
            <Building2 className="w-4 h-4" />
            Start Your 60-Day Free Trial
            <ArrowRight className="w-4 h-4" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">3PL Transporter Portal: ₦2,000/vehicle/mo + ₦50/drop</p>
        </div>
      </div>
    </section>
  );
}
