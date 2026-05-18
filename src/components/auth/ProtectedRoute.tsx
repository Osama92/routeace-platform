import { useEffect, useRef, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import useAuditLog from "@/hooks/useAuditLog";
import { useTenantMode } from "@/hooks/useTenantMode";
import { isCompanyOnlyRoute } from "@/lib/tenant/featureRegistry";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "sonner";
import PendingApprovalScreen from "./PendingApprovalScreen";
import SuspendedAccountScreen from "./SuspendedAccountScreen";
import TrialExpiredScreen from "./TrialExpiredScreen";
import AccessDeniedModal from "./AccessDeniedModal";
import AccountProvisioningScreen from "./AccountProvisioningScreen";
import { AlertTriangle } from "lucide-react";

const LOADING_TIMEOUT_MS = 12000; // 12 seconds max before we bail out of spinner

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ("admin" | "operations" | "support" | "dispatcher" | "driver" | "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "customer" | "internal_team" | "core_founder" | "core_builder" | "core_product" | "core_engineer")[];
  /** When true, the route is only available to LOGISTICS_COMPANY tenants. LD users are redirected. */
  lcOnly?: boolean;
}

const ProtectedRoute = ({ children, allowedRoles, lcOnly }: ProtectedRouteProps) => {
  const { user, userRole, loading, isApproved, approvalStatus, suspensionReason, isSuperAdmin, trialExpired } = useAuth();
  const location = useLocation();
  const { logAccessDenied } = useAuditLog();
  const { isDepartment } = useTenantMode();
  const hasLoggedDenial = useRef(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // CRITICAL: Super Admin bypasses ALL role restrictions
  const isSuperAdminBypass = userRole === "super_admin";

  // Tenant-scope enforcement: a Logistics Department tenant must NEVER reach
  // a Logistics Company route, even if a sidebar link or deep-link slips through.
  const isCompanyOnlyPath = lcOnly || isCompanyOnlyRoute(location.pathname);
  const blockedByTenantScope =
    !loading && user && isApproved && isDepartment && isCompanyOnlyPath && !isSuperAdminBypass;

  // Check if access should be denied based on role (but NOT for Super Admin)
  const isAccessDenied = !loading && user && isApproved && 
    allowedRoles && allowedRoles.length > 0 && 
    userRole && !allowedRoles.includes(userRole) && !isSuperAdminBypass;

  // Spinner timeout failsafe - never allow infinite loading
  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      console.warn("[ProtectedRoute] Loading timed out - forcing redirect to /auth");
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [loading]);

  // Log access denial (once per route)
  useEffect(() => {
    if (isAccessDenied && !hasLoggedDenial.current) {
      hasLoggedDenial.current = true;
      logAccessDenied({
        attempted_route: location.pathname,
        user_role: userRole || "unknown",
        allowed_roles: allowedRoles || [],
      });
      // Show modal instead of dead-end page
      setShowAccessDeniedModal(true);
    }
  }, [isAccessDenied, location.pathname, userRole, allowedRoles, logAccessDenied]);

  // Reset logging flag when route changes
  useEffect(() => {
    hasLoggedDenial.current = false;
    setShowAccessDeniedModal(false);
  }, [location.pathname]);

  // Spinner timed out - redirect to auth rather than spinning forever
  if (loadingTimedOut) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Provisioning not complete yet - no role assigned. Show provisioning screen
  // instead of "Pending Approval" so the user understands the system is still
  // setting up their workspace (vs. waiting on a human reviewer).
  if (!userRole) {
    return <AccountProvisioningScreen />;
  }

  // Check approval status (only after provisioning is detected)
  if (approvalStatus === "pending") {
    return <PendingApprovalScreen />;
  }

  if (approvalStatus === "suspended") {
    return <SuspendedAccountScreen reason={suspensionReason || undefined} />;
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="glass-card p-8 text-center max-w-md">
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">Registration Rejected</h2>
          <p className="text-muted-foreground mb-4">
            Your registration request was not approved. Please contact an administrator for more information.
          </p>
        </div>
      </div>
    );
  }

  // Only check roles if user is approved
  if (!isApproved) {
    return <PendingApprovalScreen />;
  }

  // TRIAL EXPIRED LOCKOUT - Super Admin always bypasses so they can upgrade.
  if (trialExpired && !isSuperAdminBypass && location.pathname !== "/settings") {
    return <TrialExpiredScreen />;
  }

  // SUPER ADMIN BYPASS: Allow access to everything
  if (isSuperAdminBypass) {
    return <>{children}</>;
  }

  // CUSTOMER ISOLATION: invited customers must remain inside the customer portal.
  // They must not reach internal dashboards through direct URLs or generic protected routes.
  if (userRole === "customer" && location.pathname !== "/customer-portal") {
    return <Navigate to="/customer-portal" replace />;
  }

  // TENANT-SCOPE BLOCK: LD tenants are redirected away from LC-only routes.
  // Fires a real-time alert + records a `intel_scope_violation` security event.
  if (blockedByTenantScope) {
    console.warn(`[ProtectedRoute] LD tenant blocked from LC-only route: ${location.pathname}`);
    sonnerToast.error("Access blocked", {
      description: `This page is reserved for Logistics Company tenants. Your attempt was logged for security review.`,
      duration: 5000,
    });
    const attemptedModule = location.pathname.includes("driver-intelligence")
      ? "driver_intelligence"
      : location.pathname.includes("fleet-intelligence")
      ? "fleet_intelligence"
      : "lc_route";
    void (supabase as any).rpc("record_intel_scope_violation", {
      p_route: location.pathname,
      p_attempted_module: attemptedModule,
      p_view_scope: "LD",
      p_details: { user_role: userRole, ts: new Date().toISOString() },
    });
    return <Navigate to="/dashboard" state={{ blockedRoute: location.pathname }} replace />;
  }

  // Show AccessDeniedModal instead of dead-end page
  if (isAccessDenied) {
    return (
      <>
        <AccessDeniedModal
          isOpen={showAccessDeniedModal}
          onClose={() => setShowAccessDeniedModal(false)}
          requiredRoles={allowedRoles}
          currentRole={userRole}
          attemptedRoute={location.pathname}
        />
        {/* Show empty state behind modal */}
        <div className="min-h-screen bg-background" />
      </>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
