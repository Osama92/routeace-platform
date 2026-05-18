import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Users,
  Shield,
  Crown,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  Search,
  ClipboardList,
  CreditCard,
  Truck,
  Package,
  Headphones,
  Settings,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  approval_status: string;
  is_active: boolean;
  role?: string;
}

interface RoleChangeRequest {
  id: string;
  user_id: string;
  requested_by: string;
  previous_role: string | null;
  requested_role: string;
  reason: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  user_profile?: {
    full_name: string;
    email: string;
  };
  requester_profile?: {
    full_name: string;
    email: string;
  };
}

const roleConfig: Record<string, { icon: React.ElementType; color: string; label: string; description: string }> = {
  super_admin: { icon: Crown, color: "bg-amber-500/15 text-amber-500", label: "Super Admin", description: "Full platform control" },
  org_admin: { icon: Shield, color: "bg-purple-500/15 text-purple-500", label: "Org Admin", description: "Organization management" },
  admin: { icon: Crown, color: "bg-warning/15 text-warning", label: "Admin", description: "Legacy admin role" },
  ops_manager: { icon: ClipboardList, color: "bg-blue-500/15 text-blue-500", label: "Ops Manager", description: "Operations oversight" },
  finance_manager: { icon: CreditCard, color: "bg-green-500/15 text-green-500", label: "Finance Manager", description: "Financial management" },
  dispatcher: { icon: ClipboardList, color: "bg-cyan-500/15 text-cyan-500", label: "Dispatcher", description: "Dispatch operations" },
  driver: { icon: Truck, color: "bg-orange-500/15 text-orange-500", label: "Driver", description: "Trip execution" },
  customer: { icon: Package, color: "bg-pink-500/15 text-pink-500", label: "Customer", description: "Shipment tracking" },
  operations: { icon: Settings, color: "bg-primary/15 text-primary", label: "Operations", description: "Legacy ops role" },
  support: { icon: Headphones, color: "bg-info/15 text-info", label: "Support", description: "Customer support" },
};

const RoleManagement = () => {
  const { toast } = useToast();
  const { user: currentUser, isSuperAdmin, hasAnyRole } = useAuth();
  const { logChange } = useAuditLog();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  // Dialogs
  const [changeRoleDialogOpen, setChangeRoleDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RoleChangeRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const canManageRoles = isSuperAdmin || hasAnyRole(["org_admin"]);
  const canApproveRequests = isSuperAdmin;

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users with roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          ...profile,
          role: userRole?.role || undefined,
        };
      });

      setUsers(usersWithRoles);

      // Fetch role change requests from audit logs as a fallback
      // The role_change_requests table exists but isn't in types yet
      const { data: roleChangeLogs } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("table_name", "role_change_requests")
        .order("created_at", { ascending: false })
        .limit(50);

      // Convert audit logs to role request format
      const roleRequestsFromLogs: RoleChangeRequest[] = (roleChangeLogs || [])
        .filter(log => log.new_data && log.action === "role_change_requested")
        .map(log => {
          const newData = log.new_data as Record<string, any> || {};
          return {
            id: log.id,
            user_id: newData.user_id || log.record_id,
            requested_by: log.user_id || "",
            previous_role: newData.previous_role || null,
            requested_role: newData.requested_role || "",
            reason: newData.reason || null,
            status: newData.status || "pending",
            reviewed_by: newData.reviewed_by || null,
            reviewed_at: newData.reviewed_at || null,
            review_notes: newData.review_notes || null,
            created_at: log.created_at || new Date().toISOString(),
          };
        });

      setRoleRequests(roleRequestsFromLogs);

      // Fetch access logs
      const { data: logs } = await supabase
        .from("audit_logs")
        .select("*")
        .in("action", ["role_changed", "role_assigned", "role_removed", "approved", "rejected", "suspended", "reactivated"])
        .order("created_at", { ascending: false })
        .limit(50);

      setAccessLogs(logs || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDirectRoleChange = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select a user and role",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const roleValue = selectedRole as any;
      const previousRole = selectedUser.role;

      // Update or insert role
      const { data: existing } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", selectedUser.user_id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("user_roles")
          .update({ role: roleValue })
          .eq("user_id", selectedUser.user_id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert([{ user_id: selectedUser.user_id, role: roleValue }]);
        if (error) throw error;
      }

      // Log the change in audit_logs
      await supabase.from("audit_logs").insert({
        table_name: "user_roles",
        record_id: selectedUser.user_id,
        action: "role_changed",
        user_id: currentUser?.id,
        user_email: currentUser?.email,
        old_data: { role: previousRole },
        new_data: { role: selectedRole, reason: changeReason },
      });

      await logChange({
        table_name: "user_roles",
        record_id: selectedUser.user_id,
        action: "update",
        old_data: { role: previousRole },
        new_data: { role: selectedRole, reason: changeReason },
      });

      toast({
        title: "Role Updated",
        description: `${selectedUser.full_name} is now a ${roleConfig[selectedRole]?.label}`,
      });

      setChangeRoleDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      setChangeReason("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestRoleChange = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: "Error",
        description: "Please select a user and role",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Store role change request in audit_logs for now
      await supabase.from("audit_logs").insert({
        table_name: "role_change_requests",
        record_id: selectedUser.user_id,
        action: "role_change_requested",
        user_id: currentUser?.id,
        user_email: currentUser?.email,
        new_data: {
          user_id: selectedUser.user_id,
          previous_role: selectedUser.role,
          requested_role: selectedRole,
          reason: changeReason,
          status: "pending",
        },
      });

      toast({
        title: "Request Submitted",
        description: "Role change request has been submitted for approval",
      });

      setRequestDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
      setChangeReason("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReviewRequest = async (approved: boolean) => {
    if (!selectedRequest) return;

    setSaving(true);
    try {
      // If approved, actually change the role
      if (approved) {
        const roleValue = selectedRequest.requested_role as any;

        const { data: existing } = await supabase
          .from("user_roles")
          .select("id")
          .eq("user_id", selectedRequest.user_id)
          .single();

        if (existing) {
          await supabase
            .from("user_roles")
            .update({ role: roleValue })
            .eq("user_id", selectedRequest.user_id);
        } else {
          await supabase
            .from("user_roles")
            .insert([{ user_id: selectedRequest.user_id, role: roleValue }]);
        }

        // Log the change
        await supabase.from("audit_logs").insert({
          table_name: "user_roles",
          record_id: selectedRequest.user_id,
          action: "role_changed_via_request",
          user_id: currentUser?.id,
          user_email: currentUser?.email,
          old_data: { role: selectedRequest.previous_role },
          new_data: { 
            role: selectedRequest.requested_role, 
            review_notes: reviewNotes,
            approved_by: currentUser?.id,
          },
        });
      }

      toast({
        title: approved ? "Request Approved" : "Request Rejected",
        description: approved
          ? "Role has been updated successfully"
          : "Role change request has been rejected",
      });

      setReviewDialogOpen(false);
      setSelectedRequest(null);
      setReviewNotes("");
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process request",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingRequests = roleRequests.filter((r) => r.status === "pending");

  return (
    <DashboardLayout
      title="Role Management"
      subtitle="Manage user roles and access permissions"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Users & Roles
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Clock className="w-4 h-4 mr-2" />
              Pending Requests
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit">
              <Shield className="w-4 h-4 mr-2" />
              Audit Trail
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <TabsContent value="users">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>View and manage user roles</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/50"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">Loading users...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-muted-foreground">No users found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => {
                      const role = user.role ? roleConfig[user.role] : null;
                      const RoleIcon = role?.icon || Shield;
                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-sm font-medium">
                                  {user.full_name.charAt(0)}
                                </span>
                              </div>
                              <span className="font-medium">{user.full_name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{user.email}</TableCell>
                          <TableCell>
                            {role ? (
                              <Badge className={role.color}>
                                <RoleIcon className="w-3 h-3 mr-1" />
                                {role.label}
                              </Badge>
                            ) : (
                              <Badge variant="outline">No Role</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={user.is_active ? "default" : "secondary"}
                              className={user.is_active ? "bg-success/20 text-success" : ""}
                            >
                              {user.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {canManageRoles ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role || "");
                                  setChangeRoleDialogOpen(true);
                                }}
                              >
                                Change Role
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole("");
                                  setRequestDialogOpen(true);
                                }}
                              >
                                Request Change
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Role Change Requests</CardTitle>
              <CardDescription>
                {canApproveRequests
                  ? "Review and approve role change requests"
                  : "View status of role change requests"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roleRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No role change requests</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">
                    Role change requests will appear here when submitted
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {roleRequests.map((request) => (
                    <div
                      key={request.id}
                      className={`p-4 rounded-lg border ${
                        request.status === "pending"
                          ? "bg-warning/5 border-warning/30"
                          : request.status === "approved"
                          ? "bg-success/5 border-success/30"
                          : "bg-destructive/5 border-destructive/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {request.user_profile?.full_name || "Unknown User"}
                            </span>
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                            <Badge className={roleConfig[request.requested_role]?.color || ""}>
                              {roleConfig[request.requested_role]?.label || request.requested_role}
                            </Badge>
                          </div>
                          {request.previous_role && (
                            <span className="text-sm text-muted-foreground">
                              (from {roleConfig[request.previous_role]?.label || request.previous_role})
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant={
                              request.status === "pending"
                                ? "secondary"
                                : request.status === "approved"
                                ? "default"
                                : "destructive"
                            }
                          >
                            {request.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                            {request.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                            {request.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                          {request.status === "pending" && canApproveRequests && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setReviewDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Reason: {request.reason}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Requested by {request.requester_profile?.full_name || "Unknown"} on{" "}
                        {new Date(request.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Access Audit Trail</CardTitle>
              <CardDescription>History of all role changes and access modifications</CardDescription>
            </CardHeader>
            <CardContent>
              {accessLogs.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">No audit logs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accessLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                    >
                      <div>
                        <p className="font-medium capitalize">
                          {log.action.replace(/_/g, " ")}
                        </p>
                        {log.old_data?.role && log.new_data?.role && (
                          <p className="text-sm text-muted-foreground">
                            {log.old_data.role} → {log.new_data.role}
                          </p>
                        )}
                        {log.new_data?.reason && (
                          <p className="text-xs text-muted-foreground">Reason: {log.new_data.reason}</p>
                        )}
                        <p className="text-xs text-muted-foreground">By: {log.user_email || "System"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Direct Role Change Dialog (Super Admin) */}
      <Dialog open={changeRoleDialogOpen} onOpenChange={setChangeRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Directly update the role for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        <span>{config.label}</span>
                        <span className="text-xs text-muted-foreground">- {config.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Textarea
                placeholder="Document the reason for this role change..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangeRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDirectRoleChange} disabled={saving || !selectedRole}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request Role Change Dialog (Non-Super Admin) */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Role Change</DialogTitle>
            <DialogDescription>
              Submit a request to change the role for {selectedUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Requested Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Justification</Label>
              <Textarea
                placeholder="Why is this role change needed?"
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestRoleChange} disabled={saving || !selectedRole}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Role Change Request</DialogTitle>
            <DialogDescription>
              Approve or reject the role change request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-secondary/30 rounded-lg space-y-2">
                <p>
                  <strong>User:</strong> {selectedRequest.user_profile?.full_name || "Unknown"}
                </p>
                <p>
                  <strong>Current Role:</strong>{" "}
                  {selectedRequest.previous_role
                    ? roleConfig[selectedRequest.previous_role]?.label
                    : "None"}
                </p>
                <p>
                  <strong>Requested Role:</strong>{" "}
                  {roleConfig[selectedRequest.requested_role]?.label}
                </p>
                {selectedRequest.reason && (
                  <p>
                    <strong>Reason:</strong> {selectedRequest.reason}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Review Notes</Label>
                <Textarea
                  placeholder="Add notes about your decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewRequest(false)}
              disabled={saving}
            >
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button onClick={() => handleReviewRequest(true)} disabled={saving}>
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : null}
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default RoleManagement;
