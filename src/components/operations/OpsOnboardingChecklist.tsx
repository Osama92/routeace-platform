import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Truck, Users, Package, Plus, Wrench, CheckCircle, Clock,
  AlertTriangle, FileText, Route, Inbox, MapPin,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SetupStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  completed: boolean;
  href: string;
}

interface OpsOnboardingChecklistProps {
  fleetCount: number;
  vehicleCount: number;
  driverCount: number;
  dispatchCount: number;
  orderCount: number;
  routePlanCount?: number;
  waybillCount?: number;
}

const OpsOnboardingChecklist = ({
  fleetCount, vehicleCount, driverCount, dispatchCount, orderCount,
  routePlanCount = 0, waybillCount = 0,
}: OpsOnboardingChecklistProps) => {
  const navigate = useNavigate();

  const steps: SetupStep[] = [
    { id: "fleet", label: "Add your first fleet", icon: Truck, completed: fleetCount > 0, href: "/fleet" },
    { id: "vehicle", label: "Register vehicles", icon: Truck, completed: vehicleCount > 0, href: "/fleet" },
    { id: "driver", label: "Add drivers", icon: Users, completed: driverCount > 0, href: "/drivers" },
    { id: "order", label: "Receive first order", icon: Inbox, completed: orderCount > 0, href: "/ops-manager" },
    { id: "dispatch", label: "Create first dispatch", icon: Package, completed: dispatchCount > 0, href: "/dispatch" },
    { id: "route", label: "Build a route plan", icon: Route, completed: routePlanCount > 0, href: "/advanced-route-planner" },
    { id: "waybill", label: "Generate first waybill", icon: FileText, completed: waybillCount > 0, href: "/ops-manager" },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  if (completedCount === steps.length) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          Operations Setup Checklist
        </CardTitle>
        <CardDescription>Complete these steps to get your logistics operations running</CardDescription>
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

export default OpsOnboardingChecklist;
