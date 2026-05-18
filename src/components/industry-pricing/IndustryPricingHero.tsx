import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const IndustryPricingHero = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 px-6 text-center bg-gradient-to-b from-muted/40 to-background">
      <motion.div
        className="max-w-3xl mx-auto"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="text-sm font-medium text-primary tracking-wide uppercase mb-4">
          RouteAce Industry OS
        </p>
        <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
          Run Sales, Distribution, and Revenue Operations in One Platform
        </h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Built for African businesses. Close deals, manage distributors, generate orders, 
          and forecast revenue - all powered by AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/signup/company")}
            className="px-8 py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity active:scale-[0.97]"
          >
            Start Free
          </button>
          <a
            href="#pricing"
            className="px-8 py-3 rounded-lg border border-border font-semibold hover:bg-muted transition-colors active:scale-[0.97]"
          >
            See Pricing
          </a>
          <button
            onClick={() => navigate("/signup/company")}
            className="px-8 py-3 rounded-lg border border-border font-semibold hover:bg-muted transition-colors active:scale-[0.97]"
          >
            Book Demo
          </button>
        </div>
      </motion.div>
    </section>
  );
};

export default IndustryPricingHero;
