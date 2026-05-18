import IndustryLayout from "@/components/industry/IndustryLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Rocket, CheckCircle, Clock, Lock, ArrowRight, Star, Target, Zap, Brain } from "lucide-react";
import { getOrgTypeFromRole } from "@/lib/liquorPermissions";
import { useLiquorRole } from "@/hooks/useLiquorRole";

interface JourneyPhase {
  phase: number;
  title: string;
  description: string;
  steps: { name: string; completed: boolean }[];
  icon: React.ComponentType<{ className?: string }>;
}

const distributorJourney: JourneyPhase[] = [
  { phase: 1, title: "Foundation", description: "Onboarding, catalog setup & retailer import", icon: Rocket, steps: [
    { name: "Complete organization profile", completed: true },
    { name: "Import product catalog", completed: true },
    { name: "Add retailer network", completed: true },
    { name: "Configure pricing tiers", completed: false },
    { name: "Set up warehouse locations", completed: false },
  ]},
  { phase: 2, title: "Operational Excellence", description: "Route optimization, warehouse digitization & field automation", icon: Target, steps: [
    { name: "Enable AI route optimization", completed: false },
    { name: "Digitize warehouse operations", completed: false },
    { name: "Deploy sales rep mobile app", completed: false },
    { name: "Set up digital proof of delivery", completed: false },
  ]},
  { phase: 3, title: "Data Intelligence", description: "Analytics, territory heatmaps & demand forecasting", icon: Brain, steps: [
    { name: "Activate territory heatmaps", completed: false },
    { name: "Enable demand forecasting", completed: false },
    { name: "Configure account scoring", completed: false },
    { name: "Set up retailer segmentation", completed: false },
  ]},
  { phase: 4, title: "Platform Scale", description: "Commerce exchange, embedded finance & revenue engines", icon: Star, steps: [
    { name: "Join Commerce Exchange marketplace", completed: false },
    { name: "Enable embedded finance", completed: false },
    { name: "Activate retailer loyalty program", completed: false },
    { name: "Configure automated ordering", completed: false },
  ]},
];

const supplierJourney: JourneyPhase[] = [
  { phase: 1, title: "Brand Activation", description: "Distribution setup & brand profile", icon: Rocket, steps: [
    { name: "Create brand profile", completed: true },
    { name: "Define product portfolio", completed: true },
    { name: "Map distributor network", completed: false },
  ]},
  { phase: 2, title: "Market Intelligence", description: "Analytics & territory insights", icon: Brain, steps: [
    { name: "Activate brand performance analytics", completed: false },
    { name: "Enable territory heatmaps", completed: false },
    { name: "Configure market share tracking", completed: false },
  ]},
  { phase: 3, title: "Demand Generation", description: "Campaigns, promotions & retailer incentives", icon: Zap, steps: [
    { name: "Launch first trade promotion", completed: false },
    { name: "Set up campaign funding", completed: false },
    { name: "Configure allocation engine", completed: false },
  ]},
];

const retailerJourney: JourneyPhase[] = [
  { phase: 1, title: "Get Started", description: "Product discovery & first order", icon: Rocket, steps: [
    { name: "Browse product catalog", completed: true },
    { name: "Place first order", completed: true },
    { name: "Set up payment method", completed: false },
  ]},
  { phase: 2, title: "Smart Ordering", description: "Credit access & automated replenishment", icon: Target, steps: [
    { name: "Apply for trade credit", completed: false },
    { name: "Enable auto-ordering rules", completed: false },
    { name: "Join loyalty program", completed: false },
  ]},
  { phase: 3, title: "Growth Mode", description: "Demand prediction & portfolio optimization", icon: Star, steps: [
    { name: "Access allocation releases", completed: false },
    { name: "Review demand predictions", completed: false },
    { name: "Optimize product mix", completed: false },
  ]},
];

const LiquorOrgJourney = () => {
  const { liquorRole } = useLiquorRole();
  const orgType = getOrgTypeFromRole(liquorRole);

  const journey = orgType === "supplier" ? supplierJourney : orgType === "retailer" ? retailerJourney : distributorJourney;
  const orgLabel = orgType === "supplier" ? "Supplier" : orgType === "retailer" ? "Retailer" : "Distributor";

  const totalSteps = journey.reduce((a, p) => a + p.steps.length, 0);
  const completedSteps = journey.reduce((a, p) => a + p.steps.filter((s) => s.completed).length, 0);
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <IndustryLayout industryCode="liquor">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-primary/70">
            <Rocket className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">{orgLabel} Success Journey</h1>
            <p className="text-sm text-muted-foreground">Your guided path to platform mastery</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold">Overall Progress</p>
              <p className="text-sm text-muted-foreground">{completedSteps} of {totalSteps} steps completed</p>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="text-right text-sm font-bold mt-1">{progress}%</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {journey.map((phase, pi) => {
            const phaseComplete = phase.steps.filter((s) => s.completed).length;
            const phaseTotal = phase.steps.length;
            const PhaseIcon = phase.icon;
            return (
              <motion.div key={phase.phase} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: pi * 0.08 }}>
                <Card className={phaseComplete === phaseTotal ? "border-emerald-500/30" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <PhaseIcon className="w-4 h-4 text-primary" />
                      </div>
                      Phase {phase.phase}: {phase.title}
                      {phaseComplete === phaseTotal && <Badge className="bg-emerald-500/15 text-emerald-600">Complete</Badge>}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground ml-11">{phase.description}</p>
                  </CardHeader>
                  <CardContent className="pl-11 space-y-2">
                    {phase.steps.map((step, si) => (
                      <div key={si} className="flex items-center gap-3 py-1.5">
                        {step.completed ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${step.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>{step.name}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </IndustryLayout>
  );
};

export default LiquorOrgJourney;
