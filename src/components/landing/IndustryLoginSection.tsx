import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { INDUSTRY_LIST } from "@/lib/industryConfig";
import { ArrowRight, Cpu } from "lucide-react";

const IndustryLoginSection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-6 bg-secondary/20">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold font-heading mb-3">Industry Distribution OS</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select your industry to access a specialized distribution intelligence platform - 
            AI-powered, fully isolated, industry-native.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {INDUSTRY_LIST.map((industry, i) => {
            const Icon = industry.icon;
            const isOther = industry.code === "other";
            return (
              <motion.button
                key={industry.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                onClick={() => navigate(isOther ? "/industry/os-generator" : `/industry/${industry.code}/auth`)}
                className={`group rounded-2xl border p-6 text-center transition-all bg-card ${
                  isOther 
                    ? "border-dashed border-primary/40 hover:border-primary/70" 
                    : "border-border/50 hover:border-primary/40"
                }`}
              >
                <div
                  className={`w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform ${
                    isOther ? "bg-gradient-to-br from-primary/20 to-primary/5" : ""
                  }`}
                  style={isOther ? {} : {
                    background: `linear-gradient(135deg, hsl(${industry.colorPrimary}), hsl(${industry.colorSecondary}))`,
                  }}
                >
                  {isOther ? (
                    <Cpu className="w-7 h-7 text-primary" />
                  ) : (
                    <Icon className="w-7 h-7 text-white" />
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1">
                  {isOther ? "Others" : industry.name}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {isOther ? "AI-generate any industry OS" : industry.description.substring(0, 50)}
                </p>
                <div className="mt-3 flex items-center justify-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {isOther ? "Generate" : "Enter"} <ArrowRight className="w-3 h-3" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default IndustryLoginSection;
