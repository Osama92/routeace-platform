import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, TrendingUp, Users, Target, BarChart3,
  Zap, Globe, CheckCircle,
} from "lucide-react";

const funnelStages = [
  { label: "Awareness", value: "142.8K", sub: "Monthly visitors", color: "bg-primary/80", width: "100%" },
  { label: "Interest", value: "28.4K", sub: "Product demos viewed", color: "bg-primary/70", width: "80%" },
  { label: "Lead Capture", value: "8,200", sub: "Qualified leads", color: "bg-primary/60", width: "60%" },
  { label: "Trial", value: "2,400", sub: "Active trials", color: "bg-info/70", width: "40%" },
  { label: "Converted", value: "842", sub: "Paying customers", color: "bg-success/70", width: "25%" },
];

const userPaths = [
  { icon: Users, label: "Logistics Operators", desc: "Fleet owners & 3PLs" },
  { icon: Target, label: "Distributors", desc: "FMCG & industry distributors" },
  { icon: Globe, label: "Exporters", desc: "African producers going global" },
  { icon: BarChart3, label: "Enterprise", desc: "Supply chain managers" },
];

const LandingGrowthFunnel = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 bg-secondary/20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">
            Growth Funnel OS
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
            Every User Path Leads to <span className="gradient-text">Conversion</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">
            Multi-path acquisition funnels tailored for every user type - from fleet operators to enterprise supply chain managers.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Funnel visualization */}
          <div className="space-y-3">
            {funnelStages.map((stage, i) => (
              <motion.div
                key={stage.label}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4"
              >
                <div className="w-24 text-right">
                  <p className="text-xs font-semibold text-foreground">{stage.label}</p>
                </div>
                <div className="flex-1">
                  <div
                    className={`${stage.color} rounded-lg py-3 px-4 flex items-center justify-between transition-all`}
                    style={{ width: stage.width }}
                  >
                    <span className="text-sm font-bold text-primary-foreground">{stage.value}</span>
                    <span className="text-[10px] text-primary-foreground/80 hidden sm:inline">{stage.sub}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* User paths */}
          <div>
            <h3 className="text-lg font-bold font-heading mb-6">Multi-Path Acquisition</h3>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {userPaths.map((path, i) => (
                <motion.div
                  key={path.label}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card p-4 hover:border-primary/30 transition-colors"
                >
                  <path.icon className="w-5 h-5 text-primary mb-2" />
                  <p className="text-sm font-semibold">{path.label}</p>
                  <p className="text-[10px] text-muted-foreground">{path.desc}</p>
                </motion.div>
              ))}
            </div>

            <ul className="space-y-2 mb-8">
              {[
                "AI-powered lead scoring & qualification",
                "Industry-specific onboarding flows",
                "ROI calculators & savings simulations",
                "Interactive product demos with live data",
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-primary shrink-0" /> {f}
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate("/growth-funnel")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Explore Growth Funnel
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingGrowthFunnel;
