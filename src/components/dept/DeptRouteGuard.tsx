import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useTenantMode from "@/hooks/useTenantMode";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolveTenantMode,
  isCompanyOnlyRoute,
  COMPANY_ONLY_ROUTE_PREFIXES,
} from "@/lib/tenant/featureRegistry";

/**
 * Phase 2 (surgical) - LD vs LC route enforcement.
 *
 * Source-of-truth precedence (per user decision):
 *   1. tenant_config.tenant_mode (existing primary signal)
 *   2. user role + industry_code (additive fallback)
 *
 * Behavior:
 *   - Logistics Company tenants pass through unchanged.
 *   - Logistics Department tenants are redirected away from company-only routes.
 *   - If tenant_mode is unset but role+industry_code resolve to LD, the
 *     same redirect applies (hardening - additive only).
 */
const COMPANY_ONLY_PREFIXES: readonly string[] = COMPANY_ONLY_ROUTE_PREFIXES;

const DeptRouteGuard = ({ children }: { children: ReactNode }) => {
  const { isDepartment, isLoading } = useTenantMode();
  const { userRole, industryCode, tenantMode, loading: authLoading } = useAuth();
  const location = useLocation();

  if (isLoading || authLoading) return <>{children}</>;

  const resolvedMode = resolveTenantMode({
    tenantMode,
    industryCode,
    role: userRole,
  });
  const effectiveDept = isDepartment || resolvedMode === "LOGISTICS_DEPARTMENT";

  if (!effectiveDept) return <>{children}</>;

  if (isCompanyOnlyRoute(location.pathname)) {
    return <Navigate to="/" replace />;
  }

  // Legacy prefix list parity (kept for safety in case registry diverges).
  const blocked = COMPANY_ONLY_PREFIXES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );
  if (blocked) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default DeptRouteGuard;
