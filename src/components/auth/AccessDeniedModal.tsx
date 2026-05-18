import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, Home, Mail, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface AccessDeniedModalProps {
  isOpen: boolean;
  onClose?: () => void;
  requiredRoles?: string[];
  currentRole?: string | null;
  attemptedRoute?: string;
}

const roleDisplayNames: Record<string, string> = {
  super_admin: "Super Admin (Company Owner)",
  org_admin: "Organization Admin",
  admin: "Admin",
  ops_manager: "Operations Manager",
  finance_manager: "Finance Manager",
  dispatcher: "Dispatcher",
  driver: "Driver",
  customer: "Customer",
  operations: "Operations",
  support: "Support",
};

export function AccessDeniedModal({
  isOpen,
  onClose,
  requiredRoles = [],
  currentRole,
  attemptedRoute,
}: AccessDeniedModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleReturnToDashboard = () => {
    onClose?.();
    navigate("/dashboard");
  };

  const handleRequestAccess = async () => {
    if (!user) {
      toast.error("You must be logged in to request access");
      return;
    }

    try {
      // Log access request to audit logs
      await supabase.from("audit_logs").insert({
        action: "access_request",
        table_name: "access_control",
        record_id: attemptedRoute || "unknown",
        user_id: user.id,
        user_email: user.email,
        new_data: {
          requested_roles: requiredRoles,
          current_role: currentRole,
          attempted_route: attemptedRoute,
          requested_at: new Date().toISOString(),
        },
      });

      toast.success(
        "Access request submitted. An administrator will review your request.",
        { duration: 5000 }
      );
      onClose?.();
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit access request:", error);
      toast.error("Failed to submit access request. Please try again.");
    }
  };

  const formatRoles = (roles: string[]) => {
    if (roles.length === 0) return "Administrator";
    return roles.map((r) => roleDisplayNames[r] || r).join(" or ");
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose?.()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl font-bold">Access Restricted</DialogTitle>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p>You don't have permission to access this page.</p>
            
            <div className="rounded-lg bg-muted p-4 text-left space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Required Role:</span>
                <span className="font-medium text-foreground">
                  {formatRoles(requiredRoles)}
                </span>
              </div>
              
              {currentRole && (
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Your Role:</span>
                  <span className="font-medium text-foreground">
                    {roleDisplayNames[currentRole] || currentRole}
                  </span>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-center pt-4">
          <Button
            variant="outline"
            onClick={handleReturnToDashboard}
            className="w-full sm:w-auto"
          >
            <Home className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
          <Button
            onClick={handleRequestAccess}
            className="w-full sm:w-auto"
          >
            <Mail className="mr-2 h-4 w-4" />
            Request Access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AccessDeniedModal;
