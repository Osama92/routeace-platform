import { ArrowRight } from "lucide-react";

const steps = [
  { plan: "Free", reason: "Get started with basic leads and contacts" },
  { plan: "Growth", reason: "Add AI scoring, quoting, and territory management" },
  { plan: "Enterprise", reason: "Unlock PRM, conversation intelligence, and API access" },
  { plan: "Custom", reason: "Dedicated infrastructure, white-label, unlimited scale" },
];

const IndustryPricingUpgradePath = () => (
  <section className="py-16 px-6 border-t border-border">
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-center mb-8">Your Upgrade Path</h2>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        {steps.map((s, i) => (
          <div key={s.plan} className="flex items-center gap-4">
            <div className="text-center">
              <p className="font-semibold text-sm">{s.plan}</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[140px]">{s.reason}</p>
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-muted-foreground hidden sm:block shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default IndustryPricingUpgradePath;
