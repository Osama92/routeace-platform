import { motion } from "framer-motion";
import { Zap } from "lucide-react";

const creditExamples = [
  { action: "Lead scoring", credits: 1 },
  { action: "Forecast generation", credits: 5 },
  { action: "Call transcription", credits: 3 },
  { action: "Route optimization", credits: 2 },
  { action: "Demand prediction", credits: 5 },
  { action: "Follow-up draft", credits: 1 },
];

const IndustryPricingAICredits = () => (
  <section className="py-20 px-6 bg-muted/30 border-t border-border">
    <div className="max-w-4xl mx-auto">
      <motion.div
        className="text-center mb-12"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
        <h2 className="text-3xl font-bold mb-3">Pay Only for the Intelligence You Use</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          AI features consume credits. Each plan includes monthly credits per user. 
          Unused credits roll over for 90 days. Buy more anytime.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {creditExamples.map((ex) => (
          <div
            key={ex.action}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card"
          >
            <span className="text-sm font-medium">{ex.action}</span>
            <span className="text-sm font-bold text-primary">{ex.credits} credit{ex.credits > 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4 text-center text-sm">
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="font-semibold text-foreground">Growth Plan</p>
          <p className="text-2xl font-bold text-primary mt-1">200</p>
          <p className="text-muted-foreground">credits / user / month</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="font-semibold text-foreground">Enterprise Plan</p>
          <p className="text-2xl font-bold text-primary mt-1">1,000</p>
          <p className="text-muted-foreground">credits / user / month</p>
        </div>
        <div className="p-4 rounded-lg border border-border bg-card">
          <p className="font-semibold text-foreground">Rollover</p>
          <p className="text-2xl font-bold text-primary mt-1">90</p>
          <p className="text-muted-foreground">day expiry window</p>
        </div>
      </div>
    </div>
  </section>
);

export default IndustryPricingAICredits;
