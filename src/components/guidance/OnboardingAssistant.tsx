import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Truck,
  Users,
  DollarSign,
  Package,
  Send,
  FileText,
  RefreshCw,
  CheckCircle,
  Circle,
  X,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

const STEP_ICONS: Record<string, React.ElementType> = {
  setup_company: Building2,
  setup_vehicles: Truck,
  setup_drivers: Users,
  setup_pricing: DollarSign,
  first_order: Package,
  first_dispatch: Send,
  first_invoice: FileText,
  zoho_sync: RefreshCw
};

const STEP_ROUTES: Record<string, string> = {
  setup_company: "/settings",
  setup_vehicles: "/fleet",
  setup_drivers: "/drivers",
  setup_pricing: "/trip-rate-config",
  first_order: "/dispatch",
  first_dispatch: "/dispatch",
  first_invoice: "/invoices",
  zoho_sync: "/analytics"
};

/**
 * Onboarding Assistant - Section I
 * Step-by-step guidance for first-time users
 */
export function OnboardingAssistant() {
  const navigate = useNavigate();
  const {
    steps,
    currentStep,
    currentStepIndex,
    onboardingState,
    showOnboarding,
    completedSteps,
    progress,
    dismissOnboarding,
    loading
  } = useOnboarding();

  if (loading || !showOnboarding) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed bottom-4 right-4 z-50 w-96"
      >
        <Card className="shadow-xl border-primary/20">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Getting Started</CardTitle>
                  <CardDescription>
                    {completedSteps}/{steps.length} steps complete
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={dismissOnboarding}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Progress value={progress} className="h-2 mt-3" />
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Current Step Highlight */}
            {currentStep && (
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-start gap-3">
                  {React.createElement(STEP_ICONS[currentStep.key] || Circle, {
                    className: "w-5 h-5 text-primary mt-0.5"
                  })}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{currentStep.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentStep.description}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full mt-3"
                  onClick={() => navigate(STEP_ROUTES[currentStep.key] || "/dashboard")}
                >
                  Start This Step
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {steps.map((step, index) => {
                const isComplete = onboardingState?.[step.key as keyof typeof onboardingState];
                const isCurrent = index === currentStepIndex;
                const Icon = STEP_ICONS[step.key] || Circle;

                return (
                  <div
                    key={step.key}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                      isCurrent ? "bg-muted" : ""
                    } ${isComplete ? "opacity-60" : ""}`}
                  >
                    <div className={`p-1.5 rounded-full ${
                      isComplete 
                        ? "bg-green-500/10" 
                        : isCurrent 
                          ? "bg-primary/10" 
                          : "bg-muted"
                    }`}>
                      {isComplete ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Icon className={`w-4 h-4 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${
                      isComplete ? "line-through text-muted-foreground" : ""
                    }`}>
                      {step.title}
                    </span>
                    {isCurrent && !isComplete && (
                      <Badge variant="secondary" className="text-xs">Current</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Compact onboarding banner for dashboard
 */
export function OnboardingBanner() {
  const navigate = useNavigate();
  const { currentStep, progress, showOnboarding, loading } = useOnboarding();

  if (loading || !showOnboarding || !currentStep) {
    return null;
  }

  const Icon = STEP_ICONS[currentStep.key] || Circle;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Next step</p>
              <p className="font-medium">{currentStep.title}</p>
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{Math.round(progress)}%</p>
              <Button
                size="sm"
                onClick={() => navigate(STEP_ROUTES[currentStep.key] || "/dashboard")}
              >
                Continue
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-1.5 mt-3" />
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default OnboardingAssistant;
