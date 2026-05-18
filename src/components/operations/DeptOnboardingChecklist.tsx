import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Settings, Truck, Package, Database, Brain, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SetupStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  href: string;
}

interface DeptOnboardingChecklistProps {
  departmentConfigured: boolean;
  vendorCount: number;
  dispatchCount: number;
  erpConnected: boolean;
  zazaConfigured: boolean;
}

const DeptOnboardingChecklist = ({
  departmentConfigured,
  vendorCount,
  dispatchCount,
  erpConnected,
  zazaConfigured,
}: DeptOnboardingChecklistProps) => {
  const navigate = useNavigate();

  const steps: SetupStep[] = [
    { id: "dept", label: "Configure your department", icon: Settings, completed: departmentConfigured, href: "/settings" },
    { id: "vendors", label: "Add vendors / 3PL transporters", icon: Truck, completed: vendorCount > 0, href: "/dept/transporter-roster" },
    { id: "dispatch", label: "Create first outbound request", icon: Package, completed: dispatchCount > 0, href: "/dept/dispatches" },
    { id: "erp", label: "Connect your ERP", icon: Database, completed: erpConnected, href: "/dept/erp-integration" },
    { id: "zaza", label: "Set up Zaza AI", icon: Brain, completed: zazaConfigured, href: "/dept/ai-advisor" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Department Setup Checklist
        </CardTitle>
        <CardDescription>Complete these steps to activate your department operations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{completedCount}/{steps.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => navigate(step.href)}
              className={`flex items-center gap-2.5 p-2.5 rounded-lg text-left text-sm transition-colors ${
                step.completed
                  ? "bg-green-500/10 text-green-700 line-through opacity-60"
                  : "bg-background border hover:bg-muted/50 cursor-pointer"
              }`}
            >
              {step.completed ? (
                <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              ) : (
                <step.icon className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span>{step.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeptOnboardingChecklist;
