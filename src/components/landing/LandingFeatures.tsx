import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, BarChart3, Shield, Zap } from "lucide-react";

const features = [
  {
    icon: Truck,
    title: "Fleet Management",
    description: "Track and manage your entire fleet in real-time",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Comprehensive insights and KPIs for your business",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    description: "Role-based access control and data isolation",
  },
  {
    icon: Zap,
    title: "API Access",
    description: "Integrate with your existing systems seamlessly",
  },
];

const LandingFeatures = () => (
  <section className="py-20 px-6 bg-secondary/20">
    <div className="max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold font-heading text-center mb-12">
        Everything You Need to Scale
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * index }}
          >
            <Card className="h-full text-center">
              <CardContent className="pt-6">
                <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default LandingFeatures;
