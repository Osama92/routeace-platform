/**
 * Industry OS Zero State Component
 * 
 * Shows role-appropriate empty states with guided next actions.
 * No placeholder data, no fake records.
 */
import { Package, Target, Users, Store, FileText, Map, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IndustryModule, IndustryRole } from "@/lib/industry/featureSeparationMatrix";
import { INDUSTRY_ROLE_MATRIX } from "@/lib/industry/featureSeparationMatrix";

interface ZeroStateConfig {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
}

const MODULE_ZERO_STATES: Record<string, ZeroStateConfig> = {
  leads: {
    icon: Target,
    title: "No leads yet",
    description: "Start building your pipeline by capturing your first lead from the field, web, or import.",
    actionLabel: "Create Lead",
    actionUrl: "/sales/leads",
  },
  accounts: {
    icon: Users,
    title: "No accounts created",
    description: "Add your first customer or distributor account to begin managing commercial relationships.",
    actionLabel: "Add Account",
    actionUrl: "/sales/accounts",
  },
  outlets: {
    icon: Store,
    title: "No outlets assigned",
    description: "Outlets will appear here once accounts are created and locations are mapped to your territory.",
  },
  pipeline: {
    icon: TrendingUp,
    title: "Pipeline is empty",
    description: "Convert leads into opportunities or create opportunities directly to build your sales pipeline.",
    actionLabel: "Create Opportunity",
    actionUrl: "/sales/pipeline",
  },
  quotes: {
    icon: FileText,
    title: "No quotes created",
    description: "Build your first quotation from an opportunity or create a standalone quote for a customer.",
    actionLabel: "Create Quote",
    actionUrl: "/sales/quotes",
  },
  orders: {
    icon: Package,
    title: "No orders received",
    description: "Orders will appear here once quotes are accepted or orders are captured from the field.",
  },
  territories: {
    icon: Map,
    title: "No territories configured",
    description: "Set up sales territories to assign reps, track coverage, and measure regional performance.",
    actionLabel: "Create Territory",
    actionUrl: "/sales/forecast",
  },
  forecasting: {
    icon: TrendingUp,
    title: "No forecast available",
    description: "Forecasts are generated from your pipeline data. Build your pipeline to unlock revenue predictions.",
  },
  promotions: {
    icon: Package,
    title: "No promotions active",
    description: "Create trade promotions to drive outlet activation, product trials, and seasonal campaigns.",
  },
  distributor_portal: {
    icon: Users,
    title: "No distributors onboarded",
    description: "Add distributor partners to manage channel sales, track sell-through, and coordinate coverage.",
  },
};

interface IndustryZeroStateProps {
  module: IndustryModule;
  role?: IndustryRole | null;
  onAction?: () => void;
}

export function IndustryZeroState({ module, role, onAction }: IndustryZeroStateProps) {
  const config = MODULE_ZERO_STATES[module];
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <p className="text-muted-foreground">No data available yet.</p>
      </div>
    );
  }

  const Icon = config.icon;
  const roleConfig = role ? INDUSTRY_ROLE_MATRIX[role] : null;
  const canCreate = roleConfig?.category !== "support" && roleConfig?.category !== "distribution";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-sm mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{config.description}</p>
      {config.actionLabel && canCreate && (
        <Button
          variant="default"
          size="sm"
          onClick={onAction}
          className="active:scale-[0.97] transition-transform"
        >
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
}

export default IndustryZeroState;
