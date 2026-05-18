import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

const SalesDeptGuard = ({ children }: Props) => {
  const { user, loading, userRole, tenantMode } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  // Only available inside LOGISTICS_DEPARTMENT orgs.
  // Visible to internal stakeholders ("customer") and to leadership/ops/finance who
  // need to monitor sales & distribution flow. Drivers excluded.
  if (tenantMode !== "LOGISTICS_DEPARTMENT") {
    return <Navigate to="/" replace />;
  }
  const allowed = ["customer", "super_admin", "org_admin", "ops_manager", "finance_manager", "support"];
  if (!allowed.includes(userRole || "")) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default SalesDeptGuard;
