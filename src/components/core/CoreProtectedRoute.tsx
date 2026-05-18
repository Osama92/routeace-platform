import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import OnlineUsersIndicator from "@/components/shared/OnlineUsersIndicator";

type CoreRole = "core_founder" | "core_builder" | "core_product" | "core_engineer" | "internal_team";

interface CoreProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: CoreRole[];
}

/**
 * Protected route wrapper for Core System pages
 * Completely separate from customer authentication
 */
const CoreProtectedRoute = ({ children, allowedRoles }: CoreProtectedRouteProps) => {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [coreRole, setCoreRole] = useState<CoreRole | null>(null);

  useEffect(() => {
    checkCoreAccess();
  }, [location.pathname]);

  const checkCoreAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role as string;
      const isCoreTeam = role?.startsWith("core_") || role === "internal_team";

      if (!isCoreTeam) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setCoreRole(role as CoreRole);

      // Check specific role permissions if specified
      if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = allowedRoles.includes(role as CoreRole);
        setIsAuthorized(hasPermission);
      } else {
        setIsAuthorized(true);
      }

      // Log access
      await supabase.from("core_access_logs").insert({
        user_id: user.id,
        core_role: role,
        action: "page_view",
        resource: location.pathname,
        user_agent: navigator.userAgent,
      });

      setLoading(false);
    } catch (error) {
      console.error("Core access check failed:", error);
      setIsAuthorized(false);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Verifying Core Access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/core/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {children}
      <OnlineUsersIndicator />
    </>
  );
};

export default CoreProtectedRoute;
