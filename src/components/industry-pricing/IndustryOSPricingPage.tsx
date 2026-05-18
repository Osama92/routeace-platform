import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { INDUSTRY_PLANS, type IndustryPlanTier } from "@/lib/entitlements/engine";
import IndustryPricingHero from "./IndustryPricingHero";
import IndustryPricingTierCard from "./IndustryPricingTierCard";
import IndustryPricingModules from "./IndustryPricingModules";
import IndustryPricingAICredits from "./IndustryPricingAICredits";
import IndustryPricingIndustries from "./IndustryPricingIndustries";
import IndustryPricingComparison from "./IndustryPricingComparison";
import IndustryPricingFAQ from "./IndustryPricingFAQ";
import IndustryPricingUpgradePath from "./IndustryPricingUpgradePath";

const TIER_ORDER: IndustryPlanTier[] = ["free", "growth", "enterprise", "custom"];

const TIER_META: Record<IndustryPlanTier, { tagline: string; cta: string; popular?: boolean }> = {
  free:       { tagline: "For small teams getting started", cta: "Start Free" },
  growth:     { tagline: "For growing sales teams", cta: "Start Growth", popular: true },
  enterprise: { tagline: "For advanced operations", cta: "Contact Sales" },
  custom:     { tagline: "For large-scale businesses", cta: "Talk to Enterprise Team" },
};

const TIER_FEATURES: Record<IndustryPlanTier, string[]> = {
  free: [
    "Lead management (basic)",
    "Accounts & contacts",
    "Opportunity tracking (limited)",
    "Manual order entry",
    "Basic reporting",
    "Max 2 users",
    "No AI",
    "No integrations",
  ],
  growth: [
    "Full Sales OS (embedded SFA)",
    "Lead scoring & routing",
    "WhatsApp & email sync",
    "Pipeline management",
    "Quote generation & price books",
    "Order management",
    "Territory management",
    "Basic forecasting",
    "Distributor sales tracking",
    "200 AI credits / user / month",
  ],
  enterprise: [
    "Everything in Growth",
    "Advanced forecasting",
    "AI conversation intelligence",
    "Commission & incentives engine",
    "Partner / distributor management (PRM)",
    "Workflow automation",
    "Multi-region sales operations",
    "Full API access",
    "1,000 AI credits / user / month",
  ],
  custom: [
    "Everything in Enterprise",
    "Unlimited users",
    "White-label deployment",
    "Custom workflows & AI models",
    "Dedicated infrastructure",
    "Data isolation",
    "Unlimited integrations",
    "Dedicated support",
  ],
};

const IndustryOSPricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <IndustryPricingHero />

      {/* Positioning Strip */}
      <section className="py-12 px-6 border-b border-border bg-muted/30">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
          {[
            { title: "Sales + Orders + Distribution", desc: "All in one platform - no bolting tools together." },
            { title: "Offline + WhatsApp-first", desc: "Built for markets where field reps work without WiFi." },
            { title: "AI included, not an add-on", desc: "Every Growth plan comes with AI credits baked in." },
            { title: "Priced in ₦, built for scale", desc: "No USD surprises - local currency, local support." },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-semibold text-foreground">{item.title}</p>
              <p className="text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-3">Choose Your Plan</h2>
          <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
            Every plan includes the full Sales OS. Upgrade for more AI, automation, and enterprise controls.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {TIER_ORDER.map((tier, i) => {
              const plan = INDUSTRY_PLANS[tier];
              const meta = TIER_META[tier];
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <IndustryPricingTierCard
                    tier={tier}
                    label={plan.label}
                    priceNGN={plan.pricePerUserNGN}
                    tagline={meta.tagline}
                    features={TIER_FEATURES[tier]}
                    cta={meta.cta}
                    popular={meta.popular}
                    onCTA={() => navigate(tier === "enterprise" || tier === "custom" ? "/signup/company" : "/signup/company")}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What You Get */}
      <IndustryPricingModules />

      {/* AI Credit Explainer */}
      <IndustryPricingAICredits />

      {/* Industry Customization */}
      <IndustryPricingIndustries />

      {/* Comparison Table */}
      <IndustryPricingComparison />

      {/* Upgrade Path */}
      <IndustryPricingUpgradePath />

      {/* FAQ */}
      <IndustryPricingFAQ />

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Move from scattered sales activity to controlled revenue execution.
          </h2>
          <p className="text-muted-foreground mb-8">
            Stop losing deals to spreadsheets and disconnected tools.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/signup/company")}
              className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Start Free
            </button>
            <button
              onClick={() => navigate("/signup/company")}
              className="px-8 py-3 rounded-lg border border-border font-semibold hover:bg-muted transition-colors"
            >
              Book Sales OS Demo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndustryOSPricingPage;
