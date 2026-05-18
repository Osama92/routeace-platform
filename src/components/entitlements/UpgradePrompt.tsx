/**
 * UpgradePrompt - Displayed when a user attempts to access a locked feature.
 * 
 * Shows contextual messaging based on denial reason:
 * - plan_locked: "Available on X plan"
 * - credits_exhausted: "Purchase AI credits"
 * - usage_limit_reached: "Upgrade to increase limit"
 * - role_denied: "Contact admin"
 * - reseller_restricted: "Data not available"
 */
import { Lock, Zap, Users, ShieldAlert, ArrowUpRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntitlementDenialReason } from "@/lib/entitlements/engine";

interface UpgradePromptProps {
  reason: EntitlementDenialReason;
  message: string;
  upgradeTo?: string;
  creditsNeeded?: number;
  creditsAvailable?: number;
  featureLabel?: string;
  compact?: boolean;
}

const REASON_CONFIG: Record<EntitlementDenialReason, {
  icon: typeof Lock;
  iconColor: string;
  bgColor: string;
  ctaLabel: string;
  ctaAction: "upgrade" | "purchase" | "contact" | "none";
}> = {
  plan_locked: {
    icon: Lock,
    iconColor: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/20",
    ctaLabel: "View Plans",
    ctaAction: "upgrade",
  },
  credits_exhausted: {
    icon: Sparkles,
    iconColor: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
    ctaLabel: "Purchase Credits",
    ctaAction: "purchase",
  },
  usage_limit_reached: {
    icon: Zap,
    iconColor: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
    ctaLabel: "Upgrade Plan",
    ctaAction: "upgrade",
  },
  role_denied: {
    icon: ShieldAlert,
    iconColor: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950/20",
    ctaLabel: "Request Access",
    ctaAction: "contact",
  },
  os_boundary: {
    icon: Lock,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
    ctaLabel: "",
    ctaAction: "none",
  },
  reseller_restricted: {
    icon: ShieldAlert,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
    ctaLabel: "",
    ctaAction: "none",
  },
  not_authenticated: {
    icon: Users,
    iconColor: "text-muted-foreground",
    bgColor: "bg-muted/50",
    ctaLabel: "Sign In",
    ctaAction: "none",
  },
};

export function UpgradePrompt({
  reason,
  message,
  upgradeTo,
  creditsNeeded,
  creditsAvailable,
  featureLabel,
  compact = false,
}: UpgradePromptProps) {
  const config = REASON_CONFIG[reason] || REASON_CONFIG.plan_locked;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${config.bgColor}`}>
        <Icon className={`w-3.5 h-3.5 ${config.iconColor}`} />
        <span className="text-muted-foreground">{message}</span>
        {config.ctaAction === "upgrade" && (
          <Button variant="link" size="sm" className="h-auto p-0 text-xs gap-1">
            Upgrade <ArrowUpRight className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-10 text-center max-w-sm mx-auto">
      <div className={`w-14 h-14 rounded-2xl ${config.bgColor} flex items-center justify-center mb-5`}>
        <Icon className={`w-6 h-6 ${config.iconColor}`} />
      </div>

      {featureLabel && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          {featureLabel}
        </p>
      )}

      <h3 className="text-base font-semibold text-foreground mb-2">
        {reason === "plan_locked" && upgradeTo
          ? `Available on ${upgradeTo.charAt(0).toUpperCase() + upgradeTo.slice(1)} plan`
          : reason === "credits_exhausted"
          ? "AI Credits Exhausted"
          : reason === "usage_limit_reached"
          ? "Usage Limit Reached"
          : reason === "role_denied"
          ? "Access Restricted"
          : "Not Available"}
      </h3>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
        {message}
      </p>

      {reason === "credits_exhausted" && creditsNeeded !== undefined && (
        <div className="flex items-center gap-3 mb-5 text-xs">
          <div className="px-2.5 py-1 rounded-md bg-muted">
            <span className="text-muted-foreground">Need:</span>{" "}
            <span className="font-medium text-foreground">{creditsNeeded}</span>
          </div>
          <div className="px-2.5 py-1 rounded-md bg-muted">
            <span className="text-muted-foreground">Have:</span>{" "}
            <span className="font-medium text-foreground">{creditsAvailable ?? 0}</span>
          </div>
        </div>
      )}

      {config.ctaAction !== "none" && (
        <Button variant="default" size="sm" className="gap-2">
          {config.ctaLabel}
          <ArrowUpRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Inline upgrade badge for sidebar items and buttons
 */
export function UpgradeBadge({ plan }: { plan: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      <Lock className="w-2.5 h-2.5" />
      {plan}
    </span>
  );
}

export default UpgradePrompt;
