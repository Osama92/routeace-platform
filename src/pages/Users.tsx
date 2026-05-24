import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Users,
  Shield,
  Mail,
  Phone,
  MoreVertical,
  UserCheck,
  UserX,
  Crown,
  Headphones,
  Settings,
  Truck,
  ClipboardList,
  CreditCard,
  Package,
  Clock,
  Ban,
  UserPlus,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdminGuard } from "@/hooks/useSuperAdminGuard";
import UserApprovalDialog from "@/components/users/UserApprovalDialog";
import UserSuspendDialog from "@/components/users/UserSuspendDialog";
import CreateUserDialog from "@/components/users/CreateUserDialog";
import LeaveAllocationDialog from "@/components/users/LeaveAllocationDialog";
import { CalendarDays } from "lucide-react";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  created_at: string;
  approval_status: string;
  is_active: boolean;
  suspension_reason: string | null;
  role?: string;
}

// Updated role taxonomy with correct labels
const roleInfo: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  super_admin: { icon: Crown, color: "bg-amber-500/15 text-amber-500", label: "Super Admin / Company Owner" },
  org_admin: { icon: Shield, color: "bg-purple-500/15 text-purple-500", label: "Organization Admin" },
  admin: { icon: Crown, color: "bg-warning/15 text-warning", label: "Admin / Business Manager" },
  ops_manager: { icon: ClipboardList, color: "bg-blue-500/15 text-blue-500", label: "Operations Manager" },
  finance_manager: { icon: CreditCard, color: "bg-green-500/15 text-green-500", label: "Finance Manager" },
  dispatcher: { icon: ClipboardList, color: "bg-cyan-500/15 text-cyan-500", label: "Dispatcher" },
  driver: { icon: Truck, color: "bg-orange-500/15 text-orange-500", label: "Driver" },
  customer: { icon: Package, color: "bg-pink-500/15 text-pink-500", label: "Customer" },
  support: { icon: Headphones, color: "bg-info/15 text-info", label: "Support" },
  // Legacy mappings
  operations: { icon: ClipboardList, color: "bg-blue-500/15 text-blue-500", label: "Operations Manager" },
};

const statusInfo: Record<string, { color: string; label: string; icon: React.ElementType }> = {
  pending: { color: "bg-warning/15 text-warning", label: "Pending", icon: Clock },
  approved: { color: "bg-success/15 text-success", label: "Approved", icon: CheckCircle },
  suspended: { color: "bg-destructive/15 text-destructive", label: "Suspended", icon: Ban },
  rejected: { color: "bg-muted text-muted-foreground", label: "Rejected", icon: XCircle },
};

const UsersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { hasRole, user: currentUser, isSuperAdmin, organizationId, tenantMode } = useAuth();
  const { canChangeToRole, canModifyUserRole, getAssignableRoles, showBlockedError } = useSuperAdminGuard();

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  
  // Approval/Suspend dialogs
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [suspendAction, setSuspendAction] = useState<"suspend" | "reactivate">("suspend");
  const [leaveAllocOpen, setLeaveAllocOpen] = useState(false);

  const activeTab = searchParams.get("tab") || "all";
  const canManage = hasRole("admin") || hasRole("super_admin") || hasRole("org_admin");

  const currentOrgId = organizationId;

  const fetchUsers = async () => {
    try {
      if (!currentUser?.id || !organizationId) {
        setUsers([]);
        setLoading(false);
        return;
      }

      // Always scope to the admin's own workspace - Super Admins are tenant owners,
      // not platform-wide operators, so they only see members of their own organization.
      const { data: members, error: membersError } = await supabase
        .from("organization_members")
        .select("user_id, role, is_active, is_owner")
        .eq("organization_id", organizationId);

      if (membersError) throw membersError;

      const memberUserIds = (members ?? []).map((m) => m.user_id);

      let usersWithRoles: any[] = [];

      if (memberUserIds.length > 0) {
        // Get profiles for those users only
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .in("user_id", memberUserIds)
          .order("created_at", { ascending: false });

        if (profilesError) throw profilesError;

        // Resolve canonical role from user_roles for these users only
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", memberUserIds);

        const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as string]));
        const coreRoles = ["core_founder", "core_cofounder", "core_builder", "core_product", "core_engineer", "core_analyst", "internal_team"];

        usersWithRoles = (profiles ?? [])
          .map((profile) => ({
            ...profile,
            role: roleMap.get(profile.user_id) ?? undefined,
          }))
          .filter((u) => !coreRoles.includes(u.role ?? ""));
      }

      // Also show pending users who are not yet in any org
      // (self-signup users awaiting Super Admin approval)
      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false })
        .limit(100);

      const pendingNotInOrg = (pendingProfiles ?? []).filter(
        (p) => !memberUserIds.includes(p.user_id)
      );

      const merged = [
        ...usersWithRoles,
        ...pendingNotInOrg.map((p) => ({ ...p, role: undefined })),
      ];

      setUsers(merged);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [organizationId, isSuperAdmin]);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select a role",
        variant: "destructive",
      });
      return;
    }

    // Check if user can assign this role
    if (!canChangeToRole(selectedRole)) {
      showBlockedError("assign this role");
      return;
    }

    // Check if user can modify this user's role
    if (!canModifyUserRole(selectedUser.role)) {
      showBlockedError("modify this user's role");
      return;
    }

    setSaving(true);
    try {
      const roleValue = selectedRole as "admin" | "operations" | "support" | "dispatcher" | "driver" | "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "customer";
      
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id, role")
        .eq("user_id", selectedUser.user_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: roleValue })
          .eq("user_id", selectedUser.user_id);

        if (error) throw error;

        // Log role change
        await supabase.from("audit_logs").insert({
          table_name: "user_roles",
          record_id: selectedUser.user_id,
          action: "update",
          user_id: currentUser?.id,
          user_email: currentUser?.email,
          old_data: { role: existing.role },
          new_data: { role: roleValue, changed_by: currentUser?.email },
        });
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert([{ user_id: selectedUser.user_id, role: roleValue }]);

        if (error) throw error;

        // Log role assignment
        await supabase.from("audit_logs").insert({
          table_name: "user_roles",
          record_id: selectedUser.user_id,
          action: "insert",
          user_id: currentUser?.id,
          user_email: currentUser?.email,
          new_data: { role: roleValue, assigned_by: currentUser?.email },
        });
      }

      toast({
        title: "Success",
        description: `Role ${roleInfo[selectedRole]?.label || selectedRole} assigned to ${selectedUser.full_name}`,
      });
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApproveReject = async (role?: string, reason?: string) => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      if (approvalAction === "approve") {
        // Use force_approve_user_profile RPC - bypasses protect_profile trigger safely
        const { error: approveError } = await supabase.rpc("force_approve_user_profile", {
          p_user_id: selectedUser.user_id,
        });
        if (approveError) throw approveError;

        // Stamp approver (not protected by trigger)
        await supabase
          .from("profiles")
          .update({ approved_by: currentUser?.id })
          .eq("user_id", selectedUser.user_id);

        // Assign/update exactly one canonical role for the approved user.
        if (role) {
          const roleValue = role as "admin" | "operations" | "support" | "dispatcher" | "driver" | "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "customer";
          const { data: existingRole } = await supabase
            .from("user_roles")
            .select("id")
            .eq("user_id", selectedUser.user_id)
            .maybeSingle();

          const { error: roleError } = existingRole
            ? await supabase
                .from("user_roles")
                .update({ role: roleValue })
                .eq("id", existingRole.id)
            : await supabase
            .from("user_roles")
                .insert([{ user_id: selectedUser.user_id, role: roleValue }]);

          if (roleError) throw roleError;
        }

        // Add to approver's organization if not already a member
        if (organizationId) {
          const { data: existingMember } = await supabase
            .from("organization_members")
            .select("id")
            .eq("user_id", selectedUser.user_id)
            .eq("organization_id", organizationId)
            .maybeSingle();

          if (!existingMember) {
            await supabase.from("organization_members").insert({
              user_id: selectedUser.user_id,
              organization_id: organizationId,
              role: (role ?? "support") as any,
              is_owner: false,
              is_active: true,
              joined_at: new Date().toISOString(),
              invited_by: currentUser!.id,
            });
          }
        }

        // Log approval
        await supabase.from("user_access_log").insert({
          user_id: selectedUser.user_id,
          action: "approved",
          performed_by: currentUser?.id,
          previous_status: selectedUser.approval_status,
          new_status: "approved",
          new_role: role,
        });

        // Notify approved user by email (non-fatal)
        try {
          const loginUrl = `${window.location.origin}/auth`;
          await supabase.functions.invoke("send-notification-email", {
            body: {
              recipient_email: selectedUser.email,
              recipient_type: "user",
              subject: "✅ Your RouteAce account has been approved",
              body: `Hi ${selectedUser.full_name ?? "there"},\n\nYour RouteAce account has been approved. You have been assigned the ${role ?? "team member"} role and can now sign in.\n\nSign in: ${loginUrl}\n\nNeed help? Contact your administrator.`,
              notification_type: "user_approved",
              include_dispatch_details: false,
            },
          });
        } catch (e) {
          console.warn("approval email failed (non-fatal)", e);
        }

        toast({
          title: "User Approved",
          description: `${selectedUser.full_name} has been approved and assigned the ${role} role.`,
        });
      } else {
        // Reject user
        const { error } = await supabase
          .from("profiles")
          .update({
            approval_status: "rejected",
            is_active: false,
            suspension_reason: reason,
          })
          .eq("user_id", selectedUser.user_id);

        if (error) throw error;

        // Log rejection
        await supabase.from("user_access_log").insert({
          user_id: selectedUser.user_id,
          action: "rejected",
          performed_by: currentUser?.id,
          previous_status: selectedUser.approval_status,
          new_status: "rejected",
          reason,
        });

        // Notify rejected user (non-fatal)
        try {
          await supabase.functions.invoke("send-notification-email", {
            body: {
              recipient_email: selectedUser.email,
              recipient_type: "user",
              subject: "Update on your RouteAce account application",
              body: `Hi ${selectedUser.full_name ?? "there"},\n\nUnfortunately, your RouteAce account application was not approved at this time.\n\n${reason ? `Reason: ${reason}\n\n` : ""}If you believe this is an error, please contact your organisation administrator.`,
              notification_type: "user_rejected",
              include_dispatch_details: false,
            },
          });
        } catch (e) {
          console.warn("rejection email failed (non-fatal)", e);
        }

        toast({
          title: "User Rejected",
          description: `${selectedUser.full_name}'s registration has been rejected.`,
        });
      }

      setApprovalDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSuspendReactivate = async (reason?: string) => {
    if (!selectedUser) return;

    setSaving(true);
    try {
      if (suspendAction === "suspend") {
        const { error } = await supabase
          .from("profiles")
          .update({
            approval_status: "suspended",
            is_active: false,
            suspended_at: new Date().toISOString(),
            suspended_by: currentUser?.id,
            suspension_reason: reason,
          })
          .eq("user_id", selectedUser.user_id);

        if (error) throw error;

        // Log suspension
        await supabase.from("user_access_log").insert({
          user_id: selectedUser.user_id,
          action: "suspended",
          performed_by: currentUser?.id,
          previous_status: selectedUser.approval_status,
          new_status: "suspended",
          reason,
        });

        toast({
          title: "User Suspended",
          description: `${selectedUser.full_name}'s access has been suspended.`,
        });
      } else {
        const { error } = await supabase
          .from("profiles")
          .update({
            approval_status: "approved",
            is_active: true,
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
          })
          .eq("user_id", selectedUser.user_id);

        if (error) throw error;

        // Log reactivation
        await supabase.from("user_access_log").insert({
          user_id: selectedUser.user_id,
          action: "reactivated",
          performed_by: currentUser?.id,
          previous_status: selectedUser.approval_status,
          new_status: "approved",
        });

        toast({
          title: "User Reactivated",
          description: `${selectedUser.full_name}'s access has been restored.`,
        });
      }

      setSuspendDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (user: UserProfile) => {
    if (!user.role) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.user_id);

      if (error) throw error;

      // Log role removal
      await supabase.from("user_access_log").insert({
        user_id: user.user_id,
        action: "role_removed",
        performed_by: currentUser?.id,
        previous_role: user.role,
      });

      toast({
        title: "Role Removed",
        description: `Role removed from ${user.full_name}`,
      });
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;

    // Filter by tab
    if (activeTab === "pending") {
      filtered = filtered.filter((u) => u.approval_status === "pending");
    } else if (activeTab === "suspended") {
      filtered = filtered.filter((u) => u.approval_status === "suspended");
    } else if (activeTab === "active") {
      filtered = filtered.filter((u) => u.approval_status === "approved" && u.is_active);
    }

    // Filter by search
    filtered = filtered.filter((user) => {
      const matchesSearch =
        user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();
  const pendingCount = users.filter((u) => u.approval_status === "pending").length;
  const suspendedCount = users.filter((u) => u.approval_status === "suspended").length;
  const activeCount = users.filter((u) => u.approval_status === "approved" && u.is_active).length;
  const roleLabel = (role?: string | null) => role ? getRoleDisplay(role, tenantMode).title : "No Role";

  const renderUserTable = (userList: UserProfile[]) => (
    <Table>
      <TableHeader>
        <TableRow className="border-border/50 hover:bg-transparent">
          <TableHead className="text-muted-foreground">User</TableHead>
          <TableHead className="text-muted-foreground">Email</TableHead>
          <TableHead className="text-muted-foreground">Status</TableHead>
          <TableHead className="text-muted-foreground">Role</TableHead>
          <TableHead className="text-muted-foreground">Joined</TableHead>
          <TableHead className="text-muted-foreground w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12">
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-muted-foreground">Loading users...</span>
              </div>
            </TableCell>
          </TableRow>
        ) : userList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No users found</p>
            </TableCell>
          </TableRow>
        ) : (
          userList.map((user) => {
            const role = user.role ? roleInfo[user.role] : null;
            const status = statusInfo[user.approval_status] || statusInfo.pending;
            const RoleIcon = role?.icon || Shield;
            const StatusIcon = status.icon;
            
            return (
              <TableRow key={user.id} className="data-table-row">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-foreground">{user.full_name}</span>
                      {user.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`${status.color} gap-1`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.role ? (
                    <Badge className={`${role?.color} gap-1`}>
                      <RoleIcon className="w-3 h-3" />
                      {user.role ? roleLabel(user.role) : role?.label}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      No Role
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {user.approval_status === "pending" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setApprovalAction("approve");
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <UserCheck className="w-4 h-4 mr-2 text-success" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setApprovalAction("reject");
                                setApprovalDialogOpen(true);
                              }}
                            >
                              <XCircle className="w-4 h-4 mr-2 text-destructive" />
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                        {user.approval_status === "approved" && (
                          <>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setSelectedRole(user.role || "");
                                setIsRoleDialogOpen(true);
                              }}
                            >
                              <Shield className="w-4 h-4 mr-2" />
                              {user.role ? "Change Role" : "Assign Role"}
                            </DropdownMenuItem>
                            {user.role && (
                              <DropdownMenuItem onClick={() => handleRemoveRole(user)}>
                                <UserX className="w-4 h-4 mr-2" />
                                Remove Role
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setLeaveAllocOpen(true);
                              }}
                            >
                              <CalendarDays className="w-4 h-4 mr-2 text-primary" />
                              Edit Leave Allocation
                            </DropdownMenuItem>
                            {canModifyUserRole(user.role) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setSuspendAction("suspend");
                                    setSuspendDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Ban className="w-4 h-4 mr-2" />
                                  Suspend Access
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                        {user.approval_status === "suspended" && canModifyUserRole(user.role) && (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(user);
                              setSuspendAction("reactivate");
                              setSuspendDialogOpen(true);
                            }}
                          >
                            <RefreshCw className="w-4 h-4 mr-2 text-success" />
                            Reactivate
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout
      title="User Management"
      subtitle="Manage users, approvals, and access control"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-6 cursor-pointer hover:ring-2 hover:ring-warning/50"
          onClick={() => setSearchParams({ tab: "pending" })}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-6 cursor-pointer hover:ring-2 hover:ring-success/50"
          onClick={() => setSearchParams({ tab: "active" })}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{activeCount}</p>
              <p className="text-sm text-muted-foreground">Active Users</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 cursor-pointer hover:ring-2 hover:ring-destructive/50"
          onClick={() => setSearchParams({ tab: "suspended" })}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/20 flex items-center justify-center">
              <Ban className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-foreground">{suspendedCount}</p>
              <p className="text-sm text-muted-foreground">Suspended</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(val) => setSearchParams({ tab: val })} className="mb-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="bg-warning/15 text-warning text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="suspended">Suspended</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48 bg-secondary/50 border-border/50">
              <SelectValue placeholder="Filter by Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="super_admin">{roleLabel("super_admin")}</SelectItem>
              <SelectItem value="org_admin">{roleLabel("org_admin")}</SelectItem>
              <SelectItem value="admin">{roleLabel("admin")}</SelectItem>
              <SelectItem value="ops_manager">{roleLabel("ops_manager")}</SelectItem>
              <SelectItem value="finance_manager">{roleLabel("finance_manager")}</SelectItem>
              <SelectItem value="dispatcher">{roleLabel("dispatcher")}</SelectItem>
              <SelectItem value="customer">{roleLabel("customer")}</SelectItem>
              <SelectItem value="support">Support</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {canManage && (
          <Button
            onClick={() => setCreateUserOpen(true)}
            className="gap-2"
            disabled={!organizationId}
          >
            <UserPlus className="w-4 h-4" />
            {organizationId ? "Create User" : "Loading..."}
          </Button>
        )}
      </div>

      <CreateUserDialog
        open={createUserOpen}
        onOpenChange={setCreateUserOpen}
        onCreated={fetchUsers}
        allowedRoles={getAssignableRoles?.() as string[] | undefined}
        organizationId={currentOrgId ?? undefined}
      />

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card overflow-hidden"
      >
        {renderUserTable(filteredUsers)}
      </motion.div>

      {/* Assign Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {selectedUser?.role ? "Update Role" : "Assign Role"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.role
                ? `Change role for ${selectedUser?.full_name}`
                : `Assign a role to ${selectedUser?.full_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="role">Select Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="mt-2 bg-secondary/50">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && (
                  <>
                    <SelectItem value="super_admin">
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        {roleLabel("super_admin")}
                      </div>
                    </SelectItem>
                    <SelectItem value="org_admin">
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-500" />
                        {roleLabel("org_admin")}
                      </div>
                    </SelectItem>
                  </>
                )}
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    {roleLabel("admin")}
                  </div>
                </SelectItem>
                <SelectItem value="ops_manager">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    {roleLabel("ops_manager")}
                  </div>
                </SelectItem>
                <SelectItem value="finance_manager">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    {roleLabel("finance_manager")}
                  </div>
                </SelectItem>
                <SelectItem value="dispatcher">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    {roleLabel("dispatcher")}
                  </div>
                </SelectItem>
                <SelectItem value="customer">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    {roleLabel("customer")}
                  </div>
                </SelectItem>
                <SelectItem value="support">
                  <div className="flex items-center gap-2">
                    <Headphones className="w-4 h-4" />
                    Support
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {selectedUser?.role === "super_admin" && !isSuperAdmin && (
              <p className="text-sm text-warning mt-2">
                ⚠️ Cannot modify {roleLabel("super_admin")} role.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={saving}>
              {saving ? "Saving..." : selectedUser?.role ? "Update Role" : "Assign Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <UserApprovalDialog
        open={approvalDialogOpen}
        onOpenChange={setApprovalDialogOpen}
        user={selectedUser}
        action={approvalAction}
        onConfirm={handleApproveReject}
        loading={saving}
      />

      {/* Suspend Dialog */}
      <UserSuspendDialog
        open={suspendDialogOpen}
        onOpenChange={setSuspendDialogOpen}
        user={selectedUser}
        action={suspendAction}
        onConfirm={handleSuspendReactivate}
        loading={saving}
      />
      <LeaveAllocationDialog
        open={leaveAllocOpen}
        onOpenChange={setLeaveAllocOpen}
        user={selectedUser as any}
      />
    </DashboardLayout>
  );
};

export default UsersPage;
