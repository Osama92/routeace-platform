import { motion } from "framer-motion";

const industries = [
  { name: "FMCG", pain: "Disconnected distributor and retail sales", use: "Outlet tracking, beat plans, distributor sell-out" },
  { name: "Pharmaceuticals", pain: "Untracked medical rep visits and compliance gaps", use: "Hospital accounts, sample logs, compliance notes" },
  { name: "Cosmetics", pain: "Scattered campaign-led retail execution", use: "Retail activation, promoter tracking, campaign sell-in" },
  { name: "Agri-inputs", pain: "Seasonal demand blindness", use: "Farmer segmentation, planting calendar, agro-dealer networks" },
  { name: "Auto Ancillary", pain: "Invisible dealer network performance", use: "Dealer accounts, parts catalog, reorder patterns" },
  { name: "Building Materials", pain: "Complex project-based quoting", use: "Contractor accounts, bulk orders, staged delivery" },
];

const IndustryPricingIndustries = () => (
  <section className="py-20 px-6 border-t border-border">
    <div className="max-w-5xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-3">Built for Your Industry</h2>
      <p className="text-center text-muted-foreground mb-12">
        Same powerful engine, customized workflows for each vertical.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {industries.map((ind, i) => (
          <motion.div
            key={ind.name}
            className="rounded-xl border border-border p-5 bg-card"
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <h3 className="font-semibold text-base mb-2">{ind.name}</h3>
            <p className="text-sm text-destructive/80 mb-2">Pain: {ind.pain}</p>
            <p className="text-sm text-muted-foreground">Modules: {ind.use}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default IndustryPricingIndustries;
