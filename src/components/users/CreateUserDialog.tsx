import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
  /** Restrict the role dropdown to a subset (e.g. for org_admin who can't create super_admins) */
  allowedRoles?: string[];
  /** Pre-set organization id when invoked from an org context */
  organizationId?: string;
}

const ALL_ROLES: { value: string; label: string }[] = [
  { value: "super_admin", label: "Super Admin / Company Owner" },
  { value: "org_admin", label: "Organization Admin" },
  { value: "admin", label: "Admin / Business Manager" },
  { value: "ops_manager", label: "Operations Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "driver", label: "Driver" },
  { value: "support", label: "Support" },
  { value: "customer", label: "Customer" },
];

export default function CreateUserDialog({
  open,
  onOpenChange,
  onCreated,
  allowedRoles,
  organizationId,
}: CreateUserDialogProps) {
  const { toast } = useToast();
  const { tenantMode } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [annualLeaveDays, setAnnualLeaveDays] = useState<string>("21");

  const roles = allowedRoles
    ? ALL_ROLES.filter((r) => allowedRoles.includes(r.value))
    : ALL_ROLES;

  const reset = () => {
    setEmail("");
    setFullName("");
    setPhone("");
    setRole("");
    setTempPassword("");
    setAnnualLeaveDays("21");
  };

  const handleSubmit = async () => {
    if (!email || !fullName || !role) {
      toast({ title: "Missing fields", description: "Email, full name and role are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        body: {
          email,
          full_name: fullName,
          phone: phone || undefined,
          role,
          organization_id: organizationId,
          temporary_password: tempPassword || undefined,
          annual_leave_days: Math.max(0, parseInt(annualLeaveDays || "0", 10) || 0),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast({
        title: "User created",
        description: `${fullName} was added as ${role}. They can now sign in.`,
      });
      reset();
      onOpenChange(false);
      onCreated?.();
    } catch (err: any) {
      toast({
        title: "Failed to create user",
        description: err?.message || "Unexpected error.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Create User
          </DialogTitle>
          <DialogDescription>
            Provision a new user with a role assignment. They will receive sign-in credentials by email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cu-email">Email *</Label>
            <Input id="cu-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-name">Full Name *</Label>
            <Input id="cu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-phone">Phone (optional)</Label>
            <Input id="cu-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234..." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-role">Role *</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="cu-role"><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{tenantMode === "LOGISTICS_DEPARTMENT" ? getRoleDisplay(r.value, tenantMode).title : r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-pw">Temporary password (optional)</Label>
            <Input id="cu-pw" type="text" value={tempPassword} onChange={(e) => setTempPassword(e.target.value)} placeholder="Auto-generated if blank" />
            <p className="text-xs text-muted-foreground">Leave blank to auto-generate a secure password.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cu-leave">Annual leave days *</Label>
            <Input
              id="cu-leave"
              type="number"
              min={0}
              max={60}
              value={annualLeaveDays}
              onChange={(e) => setAnnualLeaveDays(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              The user cannot exceed this entitlement; the counter is enforced server-side.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <>Create User</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
