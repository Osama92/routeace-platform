/**
 * OSIsolationGuard
 * Prevents users from accessing routes outside their active OS family.
 * Redirects to the correct OS default route if a cross-OS route is detected.
 */

import { ReactNode, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { getOSFamily, routeBelongsToOS } from "@/lib/workspace/osIsolation";

interface OSIsolationGuardProps {
  children: ReactNode;
}

const OSIsolationGuard = ({ children }: OSIsolationGuardProps) => {
  const { activeWorkspace } = useWorkspace();
  const { isSuperAdmin, loading, userRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const currentFamily = getOSFamily(activeWorkspace.id);

  useEffect(() => {
    // Don't redirect while auth is still loading
    if (loading) return;

    // Super admins can access everything
    if (isSuperAdmin) return;

    // Skip public routes
    const publicPrefixes = ["/access-hub", "/welcome", "/auth", "/user-auth", "/signup",
      "/track", "/public-tracking", "/onboarding", "/pricing", "/industry-os-pricing",
      "/ng", "/global"];
    if (publicPrefixes.some(p => location.pathname.startsWith(p))) return;

    // Only bounce when the route DEFINITELY belongs to a *different* OS family.
    // Unknown/un-prefixed routes are allowed through - ProtectedRoute handles RBAC.
    // This prevents shared/cross-cutting features (intelligence, decision tools,
    // customer portal, etc.) from being incorrectly redirected just because
    // they aren't listed in the prefix table.
    const otherFamilies: Array<"logistics" | "industry" | "portodash"> = (
      ["logistics", "industry", "portodash"] as const
    ).filter((f) => f !== currentFamily) as Array<"logistics" | "industry" | "portodash">;

    const belongsToOtherFamily = otherFamilies.some((f) =>
      routeBelongsToOS(location.pathname, f)
    );

    if (belongsToOtherFamily) {
      console.warn(
        `[OSIsolation] Route "${location.pathname}" belongs to a different OS than ${currentFamily}. Redirecting.`
      );
      navigate(activeWorkspace.defaultRoute, { replace: true });
    }
  }, [location.pathname, currentFamily, isSuperAdmin, loading, activeWorkspace.defaultRoute, navigate]);

  return <>{children}</>;
};

export default OSIsolationGuard;
