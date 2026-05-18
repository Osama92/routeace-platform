import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Truck, Store, Brain, Zap, Users, Globe, ArrowRight } from "lucide-react";

const FLYWHEEL_STEPS = [
  { icon: Truck, label: "Fleets Deliver", color: "text-primary", desc: "More fleets → faster dispatch, lower cost" },
  { icon: Store, label: "Orders Grow", color: "text-green-500", desc: "More retailers → more orders → fleet demand rises" },
  { icon: Brain, label: "Data Improves AI", color: "text-amber-500", desc: "Every transaction trains routing, pricing, and demand models" },
  { icon: Zap, label: "Efficiency Rises", color: "text-blue-400", desc: "Better AI → faster deliveries, higher margins" },
  { icon: Users, label: "Users Multiply", color: "text-primary", desc: "Better outcomes attract more operators and distributors" },
];

export default function NetworkEffectsFlywheel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Platform Flywheel</CardTitle>
        <CardDescription>Every action compounds value across the ecosystem</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-center gap-2 py-6">
          {FLYWHEEL_STEPS.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.12 }}
                className="flex flex-col items-center p-4 rounded-xl bg-muted/40 border min-w-[120px]"
              >
                <step.icon className={`w-7 h-7 ${step.color} mb-2`} />
                <p className="text-xs font-semibold">{step.label}</p>
                <p className="text-[10px] text-muted-foreground text-center mt-1 max-w-[100px]">{step.desc}</p>
              </motion.div>
              {i < FLYWHEEL_STEPS.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />
              )}
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 italic">
          The cycle repeats - each revolution creates exponentially more value
        </p>
      </CardContent>
    </Card>
  );
}
