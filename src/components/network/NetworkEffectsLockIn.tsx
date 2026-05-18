import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart3, Link2, CreditCard, Network, Brain, Shield } from "lucide-react";

const LOCK_IN_MECHANISMS = [
  { title: "Data Lock-In", desc: "Historical deliveries, customer relationships, pricing intelligence - lost if you leave.", icon: BarChart3, strength: 92 },
  { title: "Workflow Lock-In", desc: "Dispatch → sales → payment pipelines deeply embedded in operations.", icon: Link2, strength: 88 },
  { title: "Financial Lock-In", desc: "Active credit lines, financing agreements, and revenue tracking tied to platform.", icon: CreditCard, strength: 85 },
  { title: "Network Lock-In", desc: "Distributor, retailer, and fleet relationships exist inside the network.", icon: Network, strength: 90 },
  { title: "AI Lock-In", desc: "Personalized models improve the longer you stay - routes, demand, credit.", icon: Brain, strength: 78 },
  { title: "Trust Lock-In", desc: "Commerce Identity (RCID) with verified history - portable only within RouteAce.", icon: Shield, strength: 95 },
];

export default function NetworkEffectsLockIn() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" /> Platform Lock-In Layers</CardTitle>
        <CardDescription>Compounding switching costs that make RouteAce increasingly indispensable</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LOCK_IN_MECHANISMS.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="p-4 rounded-lg border bg-muted/20 space-y-3"
            >
              <div className="flex items-center gap-2">
                <m.icon className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">{m.title}</p>
              </div>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Switching Cost Depth</span>
                  <span>{m.strength}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${m.strength}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
