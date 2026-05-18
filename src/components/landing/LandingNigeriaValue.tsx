import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const REASONS = [
  { icon: "₦", title: "Priced in Naira", body: "No dollar invoices that change every month when the exchange rate moves. ₦5,000 per vehicle is ₦5,000 — always." },
  { icon: "🛣️", title: "Built for Nigerian roads", body: "LASTMA checkpoints, NARTO rate cards, Nigerian waybill formats, and corridor intelligence from Lagos–Kano to Port Harcourt–Abuja. Not US suburbs." },
  { icon: "🎁", title: "30-day free trial", body: "No credit card. No dollar billing. No automatic charge. Sign up, use the full platform, and pay only when you are ready." },
  { icon: "🕐", title: "Support in your timezone", body: "WAT support — not a US help desk 6 hours behind you. When something breaks at 8am Lagos time, someone answers." },
  { icon: "💰", title: "30–60% less than global tools", body: "International logistics SaaS platforms typically cost $35–$200/month before add-ons. RouteAce starts at ₦5,000 per vehicle — and covers more of what Nigerian operations actually need." },
  { icon: "🏭", title: "LC, LD and FMCG in one platform", body: "Run a fleet company, a corporate logistics department, or an FMCG distribution operation — all on one platform. No global tool covers all three." },
];

const COST_ROWS = [
  { label: "RouteAce", amount: "₦50,000", width: "25%", highlight: true },
  { label: "Typical global platform (entry tier)", amount: "~₦67,000", width: "33%", highlight: false },
  { label: "Typical global platform (mid tier)", amount: "~₦133,000", width: "66%", highlight: false },
  { label: "Typical global platform (enterprise)", amount: "~₦273,000+", width: "100%", highlight: false },
];

const LandingNigeriaValue = () => {
  const navigate = useNavigate();
  return (
    <section className="py-20 px-6 border-t border-border/40 bg-muted/20">
      <div className="max-w-5xl mx-auto space-y-10">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 className="text-3xl md:text-4xl font-bold font-heading mb-3">
            Why Nigerian businesses choose RouteAce over international alternatives
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
            Most logistics software was built for US and European roads. RouteAce was built for Nigeria — with Nigerian pricing, Nigerian infrastructure, and Nigerian operations in mind.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {REASONS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-xl border border-border/50 bg-card p-5 flex flex-col gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl">
                {item.icon}
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="font-semibold text-sm mb-4">Typical monthly cost — 10 vehicles</h3>
          <div className="space-y-3">
            {COST_ROWS.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs ${row.highlight ? "font-semibold text-primary" : "text-muted-foreground"}`}>{row.label}</span>
                  <span className={`text-xs font-semibold ${row.highlight ? "text-primary" : "text-foreground"}`}>{row.amount}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${row.highlight ? "bg-primary" : "bg-muted-foreground/30"}`}
                    style={{ width: row.width }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Global platform prices are approximate starting tiers converted at ₦1,367/$1 as of May 2026. Actual pricing varies by provider and plan. RouteAce price shown for 10 vehicles on the LC Professional plan.
          </p>
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Join Nigerian fleet operators, logistics directors, and FMCG distributors already on RouteAce.
          </p>
          <Button size="lg" onClick={() => navigate("/signup")}>Start free 30-day trial</Button>
          <p className="text-xs text-muted-foreground mt-2">No credit card · No dollar billing · Cancel anytime</p>
        </div>
      </div>
    </section>
  );
};

export default LandingNigeriaValue;
