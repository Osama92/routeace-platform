import { ReactNode } from "react";
import FMCGSidebar from "./FMCGSidebar";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { useFMCGRole, FMCG_ROLE_LABELS } from "@/hooks/useFMCGRole";
import { useAuth } from "@/contexts/AuthContext";

export interface FMCGLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

const FMCGLayout = ({ children, title, subtitle }: FMCGLayoutProps) => {
  const { isSuperAdmin } = useAuth();
  const { fmcgRole } = useFMCGRole();

  const roleName = isSuperAdmin
    ? "Super Admin"
    : fmcgRole
      ? FMCG_ROLE_LABELS[fmcgRole]
      : "No Role";

  return (
    <div className="min-h-screen bg-background">
      <FMCGSidebar />
      <main className="ml-[280px] transition-all duration-300">
        <Header title={title} subtitle={subtitle} />
        <div className="px-8 pt-2 pb-1">
          <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600">
            {roleName}
          </Badge>
        </div>
        <div className="p-8 pt-4">{children}</div>
      </main>
    </div>
  );
};

export default FMCGLayout;
