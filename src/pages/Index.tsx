// Redirect to Landing Page or role-based dashboard
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const getRoleDestination = (userRole: string | null, tenantMode: string): string => {
  if (tenantMode === "LOGISTICS_DEPARTMENT" && userRole === "customer") return "/dept/sales-tracker";
  if ((userRole as string) === "transporter") return "/transporter-portal";
  switch (userRole) {
    case "super_admin": return "/super-admin";
    case "org_admin": return "/org-admin";
    case "ops_manager": return "/ops-manager";
    case "finance_manager": return "/finance-manager";
    case "driver": return "/driver-dashboard";
    case "customer": return "/customer-portal";
    case "core_founder":
    case "core_builder":
    case "core_product":
    case "core_engineer":
    case "internal_team": return "/core/dashboard";
    default: return "/dashboard";
  }
};

const Index = () => {
  const { user, loading, userRole, isApproved, tenantMode } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user && isApproved && userRole) {
    return <Navigate to={getRoleDestination(userRole, tenantMode)} replace />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/access-hub" replace />;
};

export default Index;
