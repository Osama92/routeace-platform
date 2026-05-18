import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  UserCheck, 
  UserX, 
  Crown, 
  Shield, 
  Settings, 
  Headphones, 
  ClipboardList, 
  Truck,
  CreditCard,
  Building2,
  Package
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";

interface UserApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    full_name: string;
    email: string;
  } | null;
  action: "approve" | "reject";
  onConfirm: (role?: string, reason?: string) => Promise<void>;
  loading: boolean;
}

// All 7 roles with descriptions
const AVAILABLE_ROLES = [
  {
    value: "super_admin",
    label: "Super Admin",
    description: "Platform-wide management, organizations, subscriptions",
    icon: Crown,
    color: "text-amber-500"
  },
  {
    value: "org_admin",
    label: "Organization Admin",
    description: "Team management, payout approvals, company settings",
    icon: Shield,
    color: "text-purple-500"
  },
  {
    value: "ops_manager",
    label: "Operations Manager",
    description: "Dispatch management, vehicle/driver assignment, fleet health",
    icon: ClipboardList,
    color: "text-blue-500"
  },
  {
    value: "finance_manager",
    label: "Finance Manager",
    description: "Invoice creation/approval, payout pipeline, ERP sync",
    icon: CreditCard,
    color: "text-green-500"
  },
  {
    value: "dispatcher",
    label: "Dispatcher",
    description: "Job creation, driver assignment, trip management",
    icon: Settings,
    color: "text-cyan-500"
  },
  {
    value: "driver",
    label: "Driver",
    description: "Execute trips, update status, view earnings",
    icon: Truck,
    color: "text-orange-500"
  },
  {
    value: "customer",
    label: "Customer",
    description: "Shipment tracking, invoice downloads, delivery history",
    icon: Package,
    color: "text-pink-500"
  },
  // Legacy roles for backward compatibility
  {
    value: "admin",
    label: "Admin (Legacy)",
    description: "Full access - legacy role",
    icon: Crown,
    color: "text-red-500"
  },
  {
    value: "operations",
    label: "Operations (Legacy)",
    description: "Operations access - legacy role",
    icon: Settings,
    color: "text-gray-500"
  },
  {
    value: "support",
    label: "Support (Legacy)",
    description: "Support access - legacy role",
    icon: Headphones,
    color: "text-gray-500"
  },
];

const UserApprovalDialog = ({
  open,
  onOpenChange,
  user,
  action,
  onConfirm,
  loading,
}: UserApprovalDialogProps) => {
  const { tenantMode } = useAuth();
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [reason, setReason] = useState("");

  const handleConfirm = async () => {
    if (action === "approve" && !selectedRole) {
      return;
    }
    await onConfirm(selectedRole, reason);
    setSelectedRole("");
    setReason("");
  };

  const handleClose = () => {
    setSelectedRole("");
    setReason("");
    onOpenChange(false);
  };

  if (!user) return null;

  const selectedRoleData = AVAILABLE_ROLES.find(r => r.value === selectedRole);
  const roleLabel = (role: string, fallback: string) =>
    tenantMode === "LOGISTICS_DEPARTMENT" ? getRoleDisplay(role, tenantMode).title : fallback;
  const roleDescription = (role: string, fallback: string) =>
    tenantMode === "LOGISTICS_DEPARTMENT" ? getRoleDisplay(role, tenantMode).description || fallback : fallback;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            {action === "approve" ? (
              <>
                <UserCheck className="w-5 h-5 text-success" />
                Approve User
              </>
            ) : (
              <>
                <UserX className="w-5 h-5 text-destructive" />
                Reject User
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {action === "approve"
              ? `Approve ${user.full_name} and assign a role to grant access.`
              : `Reject the registration for ${user.full_name}. They will not be able to access the platform.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">User</p>
            <p className="font-medium text-foreground">{user.full_name}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          {action === "approve" ? (
            <div className="space-y-3">
              <Label>Assign Role <span className="text-destructive">*</span></Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                    Primary Roles
                  </div>
                  {AVAILABLE_ROLES.slice(0, 7).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className={`w-4 h-4 ${role.color}`} />
                        <div className="flex flex-col">
                          <span className="font-medium">{roleLabel(role.value, role.label)}</span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-2">
                    Legacy Roles
                  </div>
                  {AVAILABLE_ROLES.slice(7).map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        <role.icon className={`w-4 h-4 ${role.color}`} />
                        <span>{roleLabel(role.value, role.label)}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedRoleData && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                  <selectedRoleData.icon className={`w-5 h-5 mt-0.5 ${selectedRoleData.color}`} />
                  <div>
                    <p className="font-medium text-sm">{roleLabel(selectedRoleData.value, selectedRoleData.label)}</p>
                    <p className="text-xs text-muted-foreground">{roleDescription(selectedRoleData.value, selectedRoleData.description)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea
                placeholder="Enter reason for rejection (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="bg-secondary/50"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || (action === "approve" && !selectedRole)}
            variant={action === "approve" ? "default" : "destructive"}
          >
            {loading
              ? "Processing..."
              : action === "approve"
              ? "Approve & Assign Role"
              : "Reject User"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserApprovalDialog;
