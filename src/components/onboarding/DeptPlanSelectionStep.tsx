import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X, Sparkles } from "lucide-react";

export type DeptPlanChoice = "foundation" | "growth" | "enterprise" | "";

interface Props {
  selected: DeptPlanChoice;
  onChange: (p: DeptPlanChoice) => void;
  userCount: string;
}

interface Plan {
  id: Exclude<DeptPlanChoice, "">;
  title: string;
  price: string;
  subtext: string;
  includedUsers: number;
  extraUserPrice: string;
  features: { label: string; included: boolean }[];
}

const PLANS: Plan[] = [
  {
    id: "foundation",
    title: "Foundation",
    price: "₦150,000 / month",
    subtext: "For small internal logistics teams (3–10 users)",
    includedUsers: 5,
    extraUserPrice: "₦10,000 / user / month",
    features: [
      { label: "Core Transport Module (Dispatch, Tracking, Fleet)", included: true },
      { label: "Vendor Management (basic 3PL onboarding)", included: true },
      { label: "SLA Tracking", included: true },
      { label: "Operations Dashboard", included: true },
      { label: "AI Dispatch Optimization", included: false },
      { label: "Advanced Finance Tools", included: false },
      { label: "Dynamic Vendor Rate Engine", included: false },
    ],
  },
  {
    id: "growth",
    title: "Growth",
    price: "₦350,000 / month",
    subtext: "For scaling departments (10–30 users)",
    includedUsers: 15,
    extraUserPrice: "₦7,500 / user / month",
    features: [
      { label: "Everything in Foundation", included: true },
      { label: "AI Dispatch Optimization", included: true },
      { label: "Vendor Rate Card Upload (Excel)", included: true },
      { label: "3PL Cost vs Internal Fleet Comparison (AI)", included: true },
      { label: "Automated Vendor Payout Engine (basic)", included: true },
      { label: "Maintenance Intelligence", included: true },
      { label: "Performance Dashboards", included: true },
      { label: "AI CFO (Cost/Margin Intelligence)", included: false },
      { label: "ERP/API Integrations", included: false },
      { label: "Approval Workflows", included: false },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    price: "₦1,200,000 / month",
    subtext: "Full logistics control tower for mega companies",
    includedUsers: 50,
    extraUserPrice: "₦5,000 / user / month",
    features: [
      { label: "Everything in Growth", included: true },
      { label: "AI CFO (Cost, Margin, Capital Insights)", included: true },
      { label: "Vendor Performance Intelligence", included: true },
      { label: "Autonomous Dispatch Rebalancing", included: true },
      { label: "Multi-Warehouse / Multi-Region Support", included: true },
      { label: "ERP & WMS API Integrations", included: true },
      { label: "Advanced Approval Workflows", included: true },
      { label: "Dedicated Analytics Layer", included: true },
      { label: "Sales Department E2E Tracking Portal", included: true },
    ],
  },
];

function recommend(userCount: number): Exclude<DeptPlanChoice, ""> {
  if (userCount <= 5) return "foundation";
  if (userCount <= 15) return "growth";
  return "enterprise";
}

const DeptPlanSelectionStep = ({ selected, onChange, userCount }: Props) => {
  const parsed = parseInt(userCount, 10);
  const recommended = !isNaN(parsed) && parsed > 0 ? recommend(parsed) : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold">Select your plan</h2>
        <p className="text-muted-foreground mt-2">
          Pay for operational control. Scale your team without per-seat fees.
        </p>
      </div>

      {recommended && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center text-sm">
          <Sparkles className="inline w-4 h-4 mr-1 text-primary" />
          Based on <strong>{parsed}</strong> users, we recommend the{" "}
          <strong className="capitalize">{recommended}</strong> plan -{" "}
          {PLANS.find((p) => p.id === recommended)?.includedUsers} users included.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          const isPopular = recommended === plan.id;
          return (
            <Card
              key={plan.id}
              onClick={() => onChange(plan.id)}
              className={`cursor-pointer transition-all relative ${
                isSelected
                  ? "border-primary ring-2 ring-primary/30 shadow-lg"
                  : "border-border/50 hover:border-primary/30"
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px]">
                  Most Popular
                </Badge>
              )}
              <CardContent className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-lg">{plan.title}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">{plan.subtext}</p>
                </div>
                <div>
                  <div className="text-2xl font-bold">{plan.price}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.includedUsers} users included · Extra: {plan.extraUserPrice}
                  </p>
                </div>
                <ul className="space-y-1.5 pt-2 border-t border-border/40">
                  {plan.features.map((f) => (
                    <li
                      key={f.label}
                      className={`flex items-start gap-2 text-xs ${
                        f.included ? "text-foreground" : "text-muted-foreground/60"
                      }`}
                    >
                      {f.included ? (
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      )}
                      {f.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Prices shown in NGN. Billed monthly. Extra users charged at end of billing cycle.
      </p>
    </motion.div>
  );
};

export default DeptPlanSelectionStep;
