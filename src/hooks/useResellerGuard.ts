/**
 * useResellerGuard - Enforces multi-tenant isolation, 6-month reseller lock,
 * and role-based access control for the API reseller system.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export interface ResellerGuardState {
  /** Whether the current org is locked from reselling (< 6 months) */
  isLocked: boolean;
  /** When the lock expires */
  lockExpiresAt: string | null;
  /** Days remaining in lock period */
  lockDaysRemaining: number;
  /** Whether resale features are accessible */
  canResell: boolean;
  /** Whether the user can provision downstream tenants */
  canProvisionTenants: boolean;
  /** Whether the user can configure API pricing */
  canConfigurePricing: boolean;
  /** Whether the user can onboard downstream users */
  canOnboardDownstream: boolean;
  /** Current org's tenant_id for scoping */
  tenantId: string | null;
  /** Loading state */
  isLoading: boolean;
  /** Revenue split constants */
  revenueSplit: { routeace: number; reseller: number };
}

const ROUTEACE_SHARE = 80;
const RESELLER_SHARE = 20;
const LOCK_PERIOD_MONTHS = 6;

export function useResellerGuard(): ResellerGuardState {
  const { user } = useAuth();

  const { data: orgData, isLoading } = useQuery({
    queryKey: ["reseller-guard", user?.id],
    queryFn: async () => {
      if (!user) return null;

      // Get user's org membership
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id, is_owner")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!membership) return null;

      // Get org details including reseller lock
      const { data: org } = await supabase
        .from("organizations")
        .select("id, reseller_lock_until, max_reseller_licenses, subscription_tier, created_at")
        .eq("id", membership.organization_id)
        .single();

      if (!org) return null;

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      return {
        orgId: org.id,
        resellerLockUntil: org.reseller_lock_until,
        maxResellerLicenses: org.max_reseller_licenses,
        subscriptionTier: org.subscription_tier,
        orgCreatedAt: org.created_at,
        isOwner: membership.is_owner,
        role: roleData?.role || "viewer",
      };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  return useMemo<ResellerGuardState>(() => {
    if (!orgData) {
      return {
        isLocked: true,
        lockExpiresAt: null,
        lockDaysRemaining: LOCK_PERIOD_MONTHS * 30,
        canResell: false,
        canProvisionTenants: false,
        canConfigurePricing: false,
        canOnboardDownstream: false,
        tenantId: null,
        isLoading,
        revenueSplit: { routeace: ROUTEACE_SHARE, reseller: RESELLER_SHARE },
      };
    }

    const now = new Date();
    const lockUntil = orgData.resellerLockUntil ? new Date(orgData.resellerLockUntil) : null;
    
    // If no lock date set, compute from org creation + 6 months
    const effectiveLockDate = lockUntil || (() => {
      const d = new Date(orgData.orgCreatedAt);
      d.setMonth(d.getMonth() + LOCK_PERIOD_MONTHS);
      return d;
    })();

    const isLocked = now < effectiveLockDate;
    const lockDaysRemaining = isLocked
      ? Math.ceil((effectiveLockDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    // Only super_admin and admin can access reseller features
    const isAdminRole = ["super_admin", "admin"].includes(orgData.role);

    return {
      isLocked,
      lockExpiresAt: effectiveLockDate.toISOString(),
      lockDaysRemaining,
      canResell: !isLocked && isAdminRole,
      canProvisionTenants: !isLocked && isAdminRole,
      canConfigurePricing: !isLocked && isAdminRole,
      canOnboardDownstream: !isLocked && isAdminRole,
      tenantId: orgData.orgId,
      isLoading,
      revenueSplit: { routeace: ROUTEACE_SHARE, reseller: RESELLER_SHARE },
    };
  }, [orgData, isLoading]);
}

/**
 * Validates that a request's tenant scope matches the token scope.
 * Used in edge functions for API gateway enforcement.
 */
export function validateTenantScope(
  requestTenantId: string,
  tokenTenantScope: string
): boolean {
  return requestTenantId === tokenTenantScope;
}

/**
 * Calculates the 80/20 revenue split for any transaction amount.
 */
export function calculateRevenueSplit(grossAmount: number): {
  routeaceAmount: number;
  resellerAmount: number;
} {
  return {
    routeaceAmount: Math.round(grossAmount * (ROUTEACE_SHARE / 100) * 100) / 100,
    resellerAmount: Math.round(grossAmount * (RESELLER_SHARE / 100) * 100) / 100,
  };
}
