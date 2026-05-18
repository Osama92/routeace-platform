import { motion } from "framer-motion";
import { Target, ShoppingCart, Brain } from "lucide-react";

const modules = [
  {
    icon: Target,
    title: "Sales Engine (SFA Built-in)",
    items: [
      "Leads & pipeline management",
      "Accounts, outlets & contacts",
      "Deal tracking & opportunity stages",
      "Sales engagement (calls, WhatsApp, email)",
      "Quotes, price books & discount rules",
      "Revenue forecasting",
    ],
  },
  {
    icon: ShoppingCart,
    title: "Distribution Engine",
    items: [
      "Order management & capture",
      "Distributor network tracking",
      "Outlet coverage & visits",
      "Regional sales performance",
      "Channel sales visibility",
      "Territory management",
    ],
  },
  {
    icon: Brain,
    title: "AI Intelligence",
    items: [
      "Lead scoring & prioritization",
      "Forecast prediction & adjustments",
      "Demand insights by region",
      "Sales performance analysis",
      "Conversation intelligence",
      "Next best action suggestions",
    ],
  },
];

const IndustryPricingModules = () => (
  <section className="py-20 px-6 border-t border-border">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-3">What You Get</h2>
      <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
        Industry OS = Sales OS + Distribution Engine + AI Intelligence. One platform, not three bolted together.
      </p>
      <div className="grid md:grid-cols-3 gap-8">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.title}
            className="rounded-xl border border-border p-6 bg-card"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <mod.icon className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-4">{mod.title}</h3>
            <ul className="space-y-2">
              {mod.items.map((item) => (
                <li key={item} className="text-sm text-muted-foreground">• {item}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default IndustryPricingModules;
