import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, UserPlus, UserMinus, Users, Clock, CheckCircle, XCircle, ChevronDown, AlertTriangle, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFMCGRole, FMCG_ROLE_LABELS, type FMCGRole } from "@/hooks/useFMCGRole";
import { useToast } from "@/hooks/use-toast";
import FMCGLayout from "@/components/fmcg/FMCGLayout";

interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  display_name: string;
  fmcg_role: string;
  is_active: boolean;
  created_at: string;
}

interface AccessRequest {
  id: string;
  requester_email: string;
  requester_name: string;
  requested_role: string;
  status: string;
  created_at: string;
}

interface GovernanceLog {
  id: string;
  actor_role: string;
  action: string;
  previous_role: string;
  new_role: string;
  reason: string;
  created_at: string;
}

const ROLE_HIERARCHY: Record<string, string[]> = {
  strategic_leadership: ["regional_sales_manager", "area_sales_manager", "sales_supervisor", "sales_representative", "merchandiser", "finance_manager", "logistics_coordinator", "warehouse_manager", "distributor"],
  regional_sales_manager: ["area_sales_manager", "sales_supervisor", "sales_representative", "merchandiser"],
  area_sales_manager: ["sales_supervisor", "sales_representative", "merchandiser"],
  sales_supervisor: ["sales_representative", "merchandiser"],
  logistics_coordinator: ["warehouse_manager"],
};

const ROLE_COLORS: Record<string, string> = {
  strategic_leadership: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  regional_sales_manager: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  area_sales_manager: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sales_supervisor: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  sales_representative: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  merchandiser: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  distributor: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  warehouse_manager: "bg-slate-500/15 text-slate-400 border-slate-500/30",
  finance_manager: "bg-green-500/15 text-green-400 border-green-500/30",
  logistics_coordinator: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
};

const FMCGTeamAccessConsole = () => {
  const { user, isSuperAdmin } = useAuth();
  const { fmcgRole } = useFMCGRole();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [governanceLogs, setGovernanceLogs] = useState<GovernanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [suspendReason, setSuspendReason] = useState("");

  const manageableRoles = isSuperAdmin
    ? Object.keys(FMCG_ROLE_LABELS)
    : ROLE_HIERARCHY[fmcgRole || ""] || [];

  useEffect(() => {
    fetchTeamData();
  }, []);

  const fetchTeamData = async () => {
    setLoading(true);
    const [membersRes, requestsRes, logsRes] = await Promise.all([
      supabase.from("fmcg_team_members").select("*").order("created_at", { ascending: false }),
      supabase.from("team_access_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
      supabase.from("access_governance_log").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (membersRes.data) setTeamMembers(membersRes.data as TeamMember[]);
    if (requestsRes.data) setAccessRequests(requestsRes.data as AccessRequest[]);
    if (logsRes.data) setGovernanceLogs(logsRes.data as GovernanceLog[]);
    setLoading(false);
  };

  const canManageRole = (targetRole: string) => {
    if (isSuperAdmin) return true;
    return manageableRoles.includes(targetRole);
  };

  const handleApproveRequest = async (request: AccessRequest) => {
    if (!canManageRole(request.requested_role)) {
      toast({ title: "Access Denied", description: "You cannot approve this role level.", variant: "destructive" });
      return;
    }

    await supabase.from("team_access_requests").update({
      status: "approved", approved_by: user?.id, updated_at: new Date().toISOString()
    }).eq("id", request.id);

    await supabase.from("access_governance_log").insert({
      actor_user_id: user?.id || "", actor_role: fmcgRole || "super_admin",
      target_user_id: user?.id || "", action: "approve_access",
      new_role: request.requested_role, reason: "Manager approved"
    });

    toast({ title: "Access Approved", description: `${request.requester_name} has been granted ${FMCG_ROLE_LABELS[request.requested_role as FMCGRole] || request.requested_role} access.` });
    fetchTeamData();
  };

  const handleRejectRequest = async (request: AccessRequest) => {
    await supabase.from("team_access_requests").update({
      status: "rejected", rejected_by: user?.id, updated_at: new Date().toISOString()
    }).eq("id", request.id);

    await supabase.from("access_governance_log").insert({
      actor_user_id: user?.id || "", actor_role: fmcgRole || "super_admin",
      target_user_id: user?.id || "", action: "reject_access",
      new_role: request.requested_role, reason: "Manager rejected"
    });

    toast({ title: "Access Rejected" });
    fetchTeamData();
  };

  const handleSuspendMember = async () => {
    if (!selectedMember) return;

    await supabase.from("fmcg_team_members").update({ is_active: false }).eq("id", selectedMember.id);

    await supabase.from("access_governance_log").insert({
      actor_user_id: user?.id || "", actor_role: fmcgRole || "super_admin",
      target_user_id: selectedMember.user_id, action: "suspend_access",
      previous_role: selectedMember.fmcg_role, reason: suspendReason
    });

    toast({ title: "Member Suspended", description: `${selectedMember.display_name}'s access has been suspended.` });
    setSuspendDialogOpen(false);
    setSuspendReason("");
    setSelectedMember(null);
    fetchTeamData();
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;

    await supabase.from("team_access_requests").insert({
      requester_user_id: user?.id || "", requester_email: inviteEmail,
      requester_name: inviteName || inviteEmail, requested_role: inviteRole,
      manager_user_id: user?.id, status: "approved", approved_by: user?.id,
    });

    await supabase.from("access_governance_log").insert({
      actor_user_id: user?.id || "", actor_role: fmcgRole || "super_admin",
      target_user_id: user?.id || "", action: "invite_member",
      new_role: inviteRole, reason: `Invited by ${fmcgRole || "admin"}`
    });

    toast({ title: "Invitation Sent", description: `${inviteEmail} has been invited as ${FMCG_ROLE_LABELS[inviteRole as FMCGRole] || inviteRole}.` });
    setInviteDialogOpen(false);
    setInviteEmail("");
    setInviteName("");
    setInviteRole("");
    fetchTeamData();
  };

  const myTeam = teamMembers.filter(m => canManageRole(m.fmcg_role));
  const activeCount = myTeam.filter(m => m.is_active).length;
  const suspendedCount = myTeam.filter(m => !m.is_active).length;

  return (
    <FMCGLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
              <Shield className="w-7 h-7 text-primary" />
              Team Access Console
            </h1>
            <p className="text-muted-foreground mt-1">Manage role assignments, approvals, and access for your reporting chain</p>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)} disabled={manageableRoles.length === 0}>
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Team Member
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "My Team", value: myTeam.length, icon: Users, color: "text-primary" },
            { label: "Active", value: activeCount, icon: CheckCircle, color: "text-emerald-400" },
            { label: "Suspended", value: suspendedCount, icon: AlertTriangle, color: "text-amber-400" },
            { label: "Pending Requests", value: accessRequests.length, icon: Clock, color: "text-blue-400" },
          ].map((kpi) => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
                  </div>
                  <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="team" className="space-y-4">
          <TabsList>
            <TabsTrigger value="team">My Team ({myTeam.length})</TabsTrigger>
            <TabsTrigger value="requests">
              Pending Requests
              {accessRequests.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-amber-500/20 text-amber-400">{accessRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="hierarchy">Role Hierarchy</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : myTeam.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No team members in your reporting chain yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myTeam.map((member) => (
                      <motion.div key={member.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">{(member.display_name || "?").charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{member.display_name || member.email}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={ROLE_COLORS[member.fmcg_role] || "bg-secondary"}>
                            {FMCG_ROLE_LABELS[member.fmcg_role as FMCGRole] || member.fmcg_role}
                          </Badge>
                          <Badge variant={member.is_active ? "default" : "destructive"}>
                            {member.is_active ? "Active" : "Suspended"}
                          </Badge>
                          {canManageRole(member.fmcg_role) && member.is_active && (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                              onClick={() => { setSelectedMember(member); setSuspendDialogOpen(true); }}>
                              <UserMinus className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                {accessRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No pending access requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {accessRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                        <div>
                          <p className="font-medium text-foreground">{req.requester_name || req.requester_email}</p>
                          <p className="text-sm text-muted-foreground">
                            Requesting: <span className="text-foreground">{FMCG_ROLE_LABELS[req.requested_role as FMCGRole] || req.requested_role}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleApproveRequest(req)} disabled={!canManageRole(req.requested_role)}>
                            <CheckCircle className="w-4 h-4 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRejectRequest(req)}>
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hierarchy">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><ChevronDown className="w-5 h-5" /> FMCG Role Hierarchy</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(ROLE_HIERARCHY).map(([parent, children]) => (
                    <div key={parent} className="border border-border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={ROLE_COLORS[parent] || "bg-secondary"}>{FMCG_ROLE_LABELS[parent as FMCGRole] || parent}</Badge>
                        <span className="text-xs text-muted-foreground">manages →</span>
                      </div>
                      <div className="flex flex-wrap gap-2 ml-6">
                        {children.map(child => (
                          <Badge key={child} variant="outline" className={ROLE_COLORS[child] || ""}>
                            {FMCG_ROLE_LABELS[child as FMCGRole] || child}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <p className="text-sm text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Users can only manage roles below their own level. RSMs cannot modify Executive roles.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="bg-card border-border">
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="w-5 h-5" /> Access Governance Audit Trail</CardTitle></CardHeader>
              <CardContent>
                {governanceLogs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No governance actions recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {governanceLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 text-sm">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">{log.action.replace(/_/g, " ")}</Badge>
                          <span className="text-muted-foreground">
                            {log.previous_role && <><span className="text-foreground">{log.previous_role}</span> → </>}
                            {log.new_role && <span className="text-foreground">{log.new_role}</span>}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invite Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Email</Label><Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="team@company.com" /></div>
              <div><Label>Full Name</Label><Input value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="John Doe" /></div>
              <div>
                <Label>Assign Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                  <SelectContent>
                    {manageableRoles.map(role => (
                      <SelectItem key={role} value={role}>{FMCG_ROLE_LABELS[role as FMCGRole] || role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleInvite} disabled={!inviteEmail || !inviteRole}>Send Invitation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Suspend Dialog */}
        <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-destructive">Suspend Access</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">Suspend {selectedMember?.display_name}'s access to the FMCG OS. They will not be able to log in until reactivated.</p>
            <div className="py-4">
              <Label>Reason</Label>
              <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
              <Button variant="destructive" onClick={handleSuspendMember}>Suspend Access</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FMCGLayout>
  );
};

export default FMCGTeamAccessConsole;
