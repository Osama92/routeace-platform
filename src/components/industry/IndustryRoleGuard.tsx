import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIndustryRole, type AnyIndustryRole } from "@/hooks/useIndustryRole";
import { hasAnyPermission, hasPermission, type AgriPermission } from "@/lib/agriPermissions";
import { hasAnyPermission as hasAnyPharmaPerm, hasPermission as hasPharmaPerm, type PharmaPermission } from "@/lib/pharmaPermissions";
import { hasAnyPermission as hasAnyBuildingPerm, hasPermission as hasBuildingPerm, type BuildingPermission } from "@/lib/buildingPermissions";
import { hasAnyPermission as hasAnyCosmeticsPerm, hasPermission as hasCosmeticsPerm, type CosmeticsPermission } from "@/lib/cosmeticsPermissions";
import { hasAnyPermission as hasAnyBFSIPerm, hasPermission as hasBFSIPerm, type BFSIPermission } from "@/lib/bfsiPermissions";
import { hasAnyPermission as hasAnyAutoPerm, hasPermission as hasAutoPerm, type AutoPermission } from "@/lib/autoPermissions";
import { hasAnyPermission as hasAnyConsumerPerm, hasPermission as hasConsumerPerm, type ConsumerPermission } from "@/lib/consumerPermissions";
import { hasAnyPermission as hasAnyFMCGPerm, hasPermission as hasFMCGPerm, type FMCGPermission } from "@/lib/fmcgPermissions";
import { ShieldAlert, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type AnyPermission = AgriPermission | PharmaPermission | BuildingPermission | CosmeticsPermission | BFSIPermission | AutoPermission | ConsumerPermission | FMCGPermission;

interface IndustryRoleGuardProps {
  children: React.ReactNode;
  industryCode: string;
  requiredPermissions?: AnyPermission[];
  requiredAllPermissions?: AnyPermission[];
  allowedRoles?: AnyIndustryRole[];
  fallback?: React.ReactNode;
}

function checkAnyPerm(industryCode: string, role: string, permissions: AnyPermission[]): boolean {
  switch (industryCode) {
    case "agri": return hasAnyPermission(role as any, permissions as AgriPermission[]);
    case "pharma": return hasAnyPharmaPerm(role as any, permissions as PharmaPermission[]);
    case "building": return hasAnyBuildingPerm(role as any, permissions as BuildingPermission[]);
    case "cosmetics": return hasAnyCosmeticsPerm(role as any, permissions as CosmeticsPermission[]);
    case "bfsi": return hasAnyBFSIPerm(role as any, permissions as BFSIPermission[]);
    case "auto": return hasAnyAutoPerm(role as any, permissions as AutoPermission[]);
    case "consumer": return hasAnyConsumerPerm(role as any, permissions as ConsumerPermission[]);
    case "fmcg": return hasAnyFMCGPerm(role as any, permissions as FMCGPermission[]);
    default: return false;
  }
}

function checkAllPerm(industryCode: string, role: string, permissions: AnyPermission[]): boolean {
  switch (industryCode) {
    case "agri": return permissions.every(p => hasPermission(role as any, p as AgriPermission));
    case "pharma": return permissions.every(p => hasPharmaPerm(role as any, p as PharmaPermission));
    case "building": return permissions.every(p => hasBuildingPerm(role as any, p as BuildingPermission));
    case "cosmetics": return permissions.every(p => hasCosmeticsPerm(role as any, p as CosmeticsPermission));
    case "bfsi": return permissions.every(p => hasBFSIPerm(role as any, p as BFSIPermission));
    case "auto": return permissions.every(p => hasAutoPerm(role as any, p as AutoPermission));
    case "consumer": return permissions.every(p => hasConsumerPerm(role as any, p as ConsumerPermission));
    case "fmcg": return permissions.every(p => hasFMCGPerm(role as any, p as FMCGPermission));
    default: return false;
  }
}

const IndustryRoleGuard = ({
  children,
  industryCode,
  requiredPermissions,
  requiredAllPermissions,
  allowedRoles,
  fallback,
}: IndustryRoleGuardProps) => {
  const industryRole = useIndustryRole(industryCode);
  const { userRole } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = userRole === "super_admin";

  if (!industryRole || industryRole.loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-muted-foreground">Loading access control...</div>
      </div>
    );
  }

  if (isSuperAdmin) return <>{children}</>;

  if (!industryRole.role) {
    return fallback ? <>{fallback}</> : (
      <AccessDeniedCard
        title="No Role Assigned"
        description="You haven't been assigned a role. Please complete onboarding."
        roleName=""
        onBack={() => navigate(`/industry/${industryCode}/role-auth`)}
        backLabel="Select Role"
      />
    );
  }

  const roleName = industryRole.labels[industryRole.role] || industryRole.role;

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(industryRole.role)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Role Access Denied"
          description={`This module requires: ${allowedRoles.map(r => industryRole.labels[r] || r).join(", ")}.`}
          roleName={roleName}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    if (!checkAnyPerm(industryCode, industryRole.role, requiredPermissions)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Insufficient Permissions"
          description="You don't have the required permissions to access this module."
          roleName={roleName}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  if (requiredAllPermissions && requiredAllPermissions.length > 0) {
    if (!checkAllPerm(industryCode, industryRole.role, requiredAllPermissions)) {
      return fallback ? <>{fallback}</> : (
        <AccessDeniedCard
          title="Insufficient Permissions"
          description="You don't have all required permissions."
          roleName={roleName}
          onBack={() => navigate(-1 as any)}
        />
      );
    }
  }

  return <>{children}</>;
};

const AccessDeniedCard = ({
  title, description, roleName, onBack, backLabel = "Go Back",
}: {
  title: string; description: string; roleName: string; onBack: () => void; backLabel?: string;
}) => (
  <div className="flex items-center justify-center min-h-[60vh] p-6">
    <Card className="max-w-md w-full border-destructive/30">
      <CardContent className="pt-8 pb-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8 text-destructive" />
        </div>
        <div>
          <h2 className="text-xl font-heading font-bold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        </div>
        {roleName && (
          <div className="flex justify-center">
            <Badge variant="outline" className="text-xs">
              <ShieldAlert className="w-3 h-3 mr-1" />
              Current role: {roleName}
            </Badge>
          </div>
        )}
        <Button variant="outline" onClick={onBack} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {backLabel}
        </Button>
      </CardContent>
    </Card>
  </div>
);

export default IndustryRoleGuard;
