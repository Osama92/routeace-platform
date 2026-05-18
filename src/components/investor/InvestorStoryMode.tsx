import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  ChevronRight,
  ChevronLeft,
  X,
  Target,
  TrendingUp,
  Shield,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  Check,
} from "lucide-react";

interface StoryStep {
  id: number;
  title: string;
  subtitle: string;
  icon: any;
  content: string;
  highlights: string[];
  metrics?: { label: string; value: string }[];
}

const STORY_STEPS: StoryStep[] = [
  {
    id: 1,
    title: "The Problem",
    subtitle: "Nigeria's logistics pain points",
    icon: Target,
    content: "Nigerian businesses lose billions annually to logistics inefficiencies. Manual dispatch, opaque pricing, and poor asset utilization create a fragmented market ripe for disruption.",
    highlights: [
      "₦2.3T annual logistics spend in Nigeria",
      "40% of fleet capacity sits idle daily",
      "Average 25% cost overrun per delivery",
      "No visibility into real-time operations",
    ],
    metrics: [
      { label: "Market Size", value: "₦2.3T" },
      { label: "Inefficiency Rate", value: "40%" },
      { label: "Target Customers", value: "10,000+" },
    ],
  },
  {
    id: 2,
    title: "Fleet Economics",
    subtitle: "How RouteAce optimizes assets",
    icon: Truck,
    content: "RouteAce transforms fleet operations through intelligent dispatch, dynamic pricing, and predictive maintenance. Our platform maximizes asset utilization and minimizes downtime.",
    highlights: [
      "15-20% improvement in fleet utilization",
      "Automated route optimization reduces fuel costs",
      "Predictive maintenance prevents breakdowns",
      "Real-time tracking enables proactive management",
    ],
    metrics: [
      { label: "Avg Utilization", value: "78%" },
      { label: "Cost Reduction", value: "18%" },
      { label: "Downtime", value: "-35%" },
    ],
  },
  {
    id: 3,
    title: "Margin Expansion",
    subtitle: "Path to profitability",
    icon: TrendingUp,
    content: "Our dynamic pricing engine and route-level costing identify margin opportunities. We've achieved consistent gross margin improvement quarter-over-quarter.",
    highlights: [
      "Dynamic pricing captures market demand",
      "Loss-making routes automatically flagged",
      "Customer profitability analysis",
      "Automated cost allocation per trip",
    ],
    metrics: [
      { label: "Gross Margin", value: "32%" },
      { label: "Margin Growth", value: "+8% QoQ" },
      { label: "Route Efficiency", value: "94%" },
    ],
  },
  {
    id: 4,
    title: "Growth Levers",
    subtitle: "Scaling the platform",
    icon: BarChart3,
    content: "Multiple growth vectors: geographic expansion, new verticals (cold chain, dangerous goods), enterprise customers, and platform fees from third-party logistics providers.",
    highlights: [
      "Enterprise tier with white-label option",
      "API integrations for ERP connectivity",
      "Partner network revenue share model",
      "Subscription + transaction fee model",
    ],
    metrics: [
      { label: "Customer Growth", value: "+45% MoM" },
      { label: "Revenue Growth", value: "+38% MoM" },
      { label: "NPS", value: "72" },
    ],
  },
  {
    id: 5,
    title: "Defensibility",
    subtitle: "Competitive moats",
    icon: Shield,
    content: "RouteAce builds sustainable competitive advantages through proprietary data, network effects, switching costs, and deep integration with customer operations.",
    highlights: [
      "Proprietary route pricing data",
      "Network effects from partner ecosystem",
      "High switching costs (ERP integration)",
      "First-mover advantage in Nigeria",
    ],
    metrics: [
      { label: "Data Points", value: "2M+" },
      { label: "Retention", value: "92%" },
      { label: "Partners", value: "150+" },
    ],
  },
];

interface InvestorStoryModeProps {
  isOpen: boolean;
  onClose: () => void;
}

const InvestorStoryMode = ({ isOpen, onClose }: InvestorStoryModeProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const step = STORY_STEPS[currentStep];
  const progress = ((currentStep + 1) / STORY_STEPS.length) * 100;

  const nextStep = () => {
    if (currentStep < STORY_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-4xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold">RouteAce Investment Story</h2>
              <p className="text-muted-foreground">Step {currentStep + 1} of {STORY_STEPS.length}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Progress */}
          <Progress value={progress} className="h-2 mb-6" />

          {/* Step Navigation */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            {STORY_STEPS.map((s, i) => (
              <Button
                key={s.id}
                variant={i === currentStep ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentStep(i)}
                className="whitespace-nowrap"
              >
                <s.icon className="w-4 h-4 mr-2" />
                {s.title}
              </Button>
            ))}
          </div>

          {/* Main Content */}
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                  <step.icon className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1">Step {currentStep + 1}</Badge>
                  <CardTitle className="text-2xl font-heading">{step.title}</CardTitle>
                  <CardDescription>{step.subtitle}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main narrative */}
              <p className="text-lg leading-relaxed">{step.content}</p>

              {/* Key Metrics */}
              {step.metrics && (
                <div className="grid grid-cols-3 gap-4">
                  {step.metrics.map((metric, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="bg-secondary/50 rounded-lg p-4 text-center"
                    >
                      <p className="text-2xl font-bold text-primary">{metric.value}</p>
                      <p className="text-sm text-muted-foreground">{metric.label}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Highlights */}
              <div className="space-y-2">
                <h4 className="font-medium">Key Highlights</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {step.highlights.map((highlight, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 p-2"
                    >
                      <Check className="w-5 h-5 text-success shrink-0 mt-0.5" />
                      <span className="text-sm">{highlight}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>
            
            <div className="flex gap-1">
              {STORY_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            
            {currentStep < STORY_STEPS.length - 1 ? (
              <Button onClick={nextStep}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={onClose}>
                <Check className="w-4 h-4 mr-2" />
                Complete
              </Button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default InvestorStoryMode;
