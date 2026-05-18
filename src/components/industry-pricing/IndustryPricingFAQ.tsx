import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    q: "How do AI credits work?",
    a: "AI credits are consumed when you use intelligent features like lead scoring, forecasting, or conversation insights. Each action costs a fixed number of credits. Growth plans include 200 credits per user per month, Enterprise includes 1,000. Unused credits roll over for 90 days.",
  },
  {
    q: "What happens when credits run out?",
    a: "AI-powered actions are temporarily paused. You can purchase additional credit packs at any time from your admin workspace, or upgrade your plan for a higher monthly allocation.",
  },
  {
    q: "Can I switch plans anytime?",
    a: "Yes. Upgrades take effect immediately and unlock new features. Downgrades apply at the next billing cycle. No data is lost during plan changes.",
  },
  {
    q: "Do you support WhatsApp-based sales?",
    a: "Yes. Growth and Enterprise plans include native WhatsApp sync for lead capture, sales engagement logging, and follow-up automation.",
  },
  {
    q: "Is this different from a CRM?",
    a: "RouteAce Industry OS is a full revenue operating system - not just a contact database. It combines sales force automation, distribution management, order capture, pricing governance, and AI intelligence. It also connects directly to logistics for fulfillment handoff.",
  },
  {
    q: "Can I use it offline?",
    a: "Growth plans include basic offline mode. Enterprise and Custom plans include full offline capability - critical for field reps in low-connectivity areas.",
  },
];

const IndustryPricingFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="py-20 px-6 bg-muted/30 border-t border-border">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-10">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Collapsible
              key={i}
              open={openIndex === i}
              onOpenChange={(open) => setOpenIndex(open ? i : null)}
            >
              <CollapsibleTrigger className="w-full flex items-center justify-between p-4 rounded-lg border border-border bg-card text-left hover:bg-muted/50 transition-colors">
                <span className="font-medium text-sm">{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 pt-2 text-sm text-muted-foreground">
                {faq.a}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustryPricingFAQ;
