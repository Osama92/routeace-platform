import { Package, TrendingUp, Users, Store, Truck, BarChart3, MapPin, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FMCGZeroStateProps {
  role: string;
  onAction?: () => void;
}

const ROLE_ZERO_STATES: Record<string, { icon: React.ComponentType<{ className?: string }>; title: string; description: string; actionLabel?: string }> = {
  strategic_leadership: {
    icon: TrendingUp,
    title: "No distribution data yet",
    description: "Revenue, outlet coverage, and delivery KPIs will appear here once your team starts capturing orders and completing deliveries.",
  },
  regional_sales_manager: {
    icon: MapPin,
    title: "No regional data yet",
    description: "Regional performance, territory coverage, and rep activity will populate as your sales team begins field operations.",
  },
  area_sales_manager: {
    icon: Store,
    title: "No area data yet",
    description: "Territory overview, rep performance, and retailer coverage will appear once sales activities are recorded.",
  },
  sales_supervisor: {
    icon: Users,
    title: "No team activity yet",
    description: "Team status, visit compliance, and daily targets will show here once your reps begin their routes.",
  },
  sales_representative: {
    icon: MapPin,
    title: "No route assigned yet",
    description: "Your daily route, outlet visits, and order targets will appear once your manager assigns your territory.",
    actionLabel: "View Territory",
  },
  merchandiser: {
    icon: Camera,
    title: "No audits assigned yet",
    description: "Planogram audits, shelf compliance tasks, and photo verification will appear once assignments are created.",
  },
  distributor: {
    icon: Package,
    title: "No distribution activity yet",
    description: "Orders, inventory levels, and delivery tracking will populate once your distribution operations begin.",
    actionLabel: "Add Inventory",
  },
  warehouse_manager: {
    icon: Package,
    title: "No warehouse data yet",
    description: "Stock levels, dispatch queues, and receiving logs will appear once inventory is added to the system.",
    actionLabel: "Add Stock",
  },
  finance_manager: {
    icon: TrendingUp,
    title: "No financial data yet",
    description: "Revenue, collections, AR aging, and credit exposure will populate from completed orders and recorded payments.",
  },
  logistics_coordinator: {
    icon: Truck,
    title: "No logistics data yet",
    description: "Fleet tracking, route execution, and delivery status will appear once dispatches are created and vehicles assigned.",
  },
};

export function FMCGZeroState({ role, onAction }: FMCGZeroStateProps) {
  const config = ROLE_ZERO_STATES[role] || ROLE_ZERO_STATES.strategic_leadership;
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-6">
        <Icon className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">{config.description}</p>
      {config.actionLabel && onAction && (
        <Button variant="default" size="sm" onClick={onAction}>
          {config.actionLabel}
        </Button>
      )}
    </div>
  );
}

export default FMCGZeroState;
