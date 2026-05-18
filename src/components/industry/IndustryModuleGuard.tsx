/**
 * IndustryModuleGuard - Page/component-level guard for Industry OS
 * 
 * Renders children only if the current user's role + plan allows
 * access to the specified module. Shows upgrade prompt or denied state otherwise.
 */
import React from "react";
import { useIndustryFeatureAccess } from "@/hooks/useIndustryFeatureAccess";
import type { IndustryModule, IndustryRole, SalesPlanTier, IndustryVertical } from "@/lib/industry/featureSeparationMatrix";
import { SALES_PLAN_MODULES, isIndustryOnlyModule } from "@/lib/industry/featureSeparationMatrix";
import { Lock, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IndustryModuleGuardProps {
  module: IndustryModule;
  role: IndustryRole | null;
  plan?: SalesPlanTier;
  industry?: IndustryVertical;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/** Find the minimum plan that includes a module */
function getMinPlanForModule(module: IndustryModule): SalesPlanTier | null {
  const tiers: SalesPlanTier[] = ["free", "starter", "pro", "enterprise", "unlimited"];
  for (const tier of tiers) {
    if (SALES_PLAN_MODULES[tier]?.includes(module)) return tier;
  }
  return null;
}

const PLAN_LABELS: Record<SalesPlanTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
  unlimited: "Unlimited",
};

export function IndustryModuleGuard({
  module,
  role,
  plan = "free",
  industry = "fmcg",
  children,
  fallback,
}: IndustryModuleGuardProps) {
  const access = useIndustryFeatureAccess(role, plan, industry);

  if (access.canAccess(module)) {
    return <>{children}</>;
  }

  if (fallback) return <>{fallback}</>;

  // Determine if it's a plan issue or role issue
  const minPlan = getMinPlanForModule(module);
  const isPlanLocked = minPlan && !SALES_PLAN_MODULES[plan]?.includes(module);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center max-w-md mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <Lock className="w-6 h-6 text-muted-foreground" />
      </div>
      {isPlanLocked ? (
        <>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Available on {PLAN_LABELS[minPlan!]} plan
          </h3>
          <p className="text-sm text-muted-foreground mb-6">
            Upgrade your plan to access this module and unlock additional capabilities for your team.
          </p>
          <Button variant="default" size="sm" className="gap-2">
            View Plans <ArrowUpRight className="w-4 h-4" />
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Access Restricted
          </h3>
          <p className="text-sm text-muted-foreground">
            Your current role does not include access to this module. Contact your administrator to request access.
          </p>
        </>
      )}
    </div>
  );
}

/** Button-level guard - hides or disables buttons based on role permissions */
export function IndustryActionGuard({
  module,
  action,
  role,
  plan = "free",
  industry = "fmcg",
  children,
  hideWhenDenied = true,
}: {
  module: IndustryModule;
  action: "approve" | "export" | "view";
  role: IndustryRole | null;
  plan?: SalesPlanTier;
  industry?: IndustryVertical;
  children: React.ReactNode;
  hideWhenDenied?: boolean;
}) {
  const access = useIndustryFeatureAccess(role, plan, industry);

  let allowed = false;
  if (action === "approve") allowed = access.canApprove(module);
  else if (action === "export") allowed = access.canExport(module);
  else allowed = access.canAccess(module);

  if (!allowed) {
    return hideWhenDenied ? null : <>{children}</>;
  }

  return <>{children}</>;
}

/** Cross-OS delineation guard - blocks logistics modules from appearing */
export function CrossOSGuard({
  moduleId,
  currentOS,
  children,
}: {
  moduleId: string;
  currentOS: "industry_os" | "logistics_os";
  children: React.ReactNode;
}) {
  const access = useIndustryFeatureAccess(null, "free", "fmcg");

  if (currentOS === "industry_os" && access.isBlockedLogisticsModule(moduleId)) {
    return null;
  }

  // In Logistics OS, block industry-only modules
  if (currentOS === "logistics_os" && isIndustryOnlyModule(moduleId)) {
    return null;
  }

  return <>{children}</>;
}

export default IndustryModuleGuard;
