import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, Trash2, Check, X } from "lucide-react";
import useCoreAuth, { CoreRole } from "@/hooks/useCoreAuth";

interface CoreMember {
  id: string;
  user_id: string;
  core_role: CoreRole;
  display_name: string | null;
  is_active: boolean;
  created_at: string;
  email?: string;
}

/**
 * Core Team Management - FOUNDER ONLY
 * Allows founders to invite and manage core team members
 */
const CoreTeamManagement = () => {
  const { coreRole, permissions, user } = useCoreAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<CoreMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CoreRole>("core_engineer");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (permissions.canManageTeam) {
      loadMembers();
    }
  }, [permissions.canManageTeam]);

  const loadMembers = async () => {
    try {
      const { data, error } = await supabase
        .from("core_team_members")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMembers((data || []).map(d => ({
        ...d,
        core_role: d.core_role as CoreRole
      })));
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;
    setInviting(true);

    try {
      // First check if user exists
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("email", inviteEmail)
        .single();

      if (!profiles) {
        toast({
          title: "User Not Found",
          description: "Please ensure the user has an account before inviting them.",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      // Add to user_roles table with core role
      const { error: roleError } = await supabase
        .from("user_roles")
        .upsert({
          user_id: profiles.user_id,
          role: inviteRole,
        });

      if (roleError) throw roleError;

      // Add to core_team_members
      const { error: memberError } = await supabase
        .from("core_team_members")
        .insert({
          user_id: profiles.user_id,
          core_role: inviteRole,
          invited_by: user?.id,
        });

      if (memberError && !memberError.message.includes("duplicate")) {
        throw memberError;
      }

      // Log the action
      await supabase.from("core_access_logs").insert({
        user_id: user?.id,
        core_role: coreRole,
        action: "invite_member",
        resource: inviteEmail,
        metadata: { invited_role: inviteRole },
      });

      toast({
        title: "Team Member Invited",
        description: `${inviteEmail} has been added as ${inviteRole.replace("core_", "").replace("_", " ")}`,
      });

      setInviteEmail("");
      loadMembers();
    } catch (error: any) {
      toast({
        title: "Invite Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (member: CoreMember) => {
    try {
      // Remove from user_roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", member.user_id)
        .in("role", ["core_founder", "core_builder", "core_product", "core_engineer", "internal_team"]);

      // Update core_team_members
      await supabase
        .from("core_team_members")
        .update({ is_active: false })
        .eq("id", member.id);

      // Log the action
      await supabase.from("core_access_logs").insert({
        user_id: user?.id,
        core_role: coreRole,
        action: "remove_member",
        resource: member.user_id,
      });

      toast({
        title: "Member Removed",
        description: "Team member has been removed from Core System access.",
      });

      loadMembers();
    } catch (error: any) {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: CoreRole) => {
    const colors: Record<CoreRole, string> = {
      core_founder: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      core_cofounder: "bg-amber-400/20 text-amber-300 border-amber-400/30",
      core_builder: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      core_product: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      core_engineer: "bg-green-500/20 text-green-400 border-green-500/30",
      core_analyst: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
      internal_team: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    const labels: Record<CoreRole, string> = {
      core_founder: "Founder",
      core_cofounder: "Co-Founder",
      core_builder: "Builder",
      core_product: "Product",
      core_engineer: "Engineer",
      core_analyst: "Analyst",
      internal_team: "Internal",
    };
    return (
      <Badge className={`${colors[role]} border`}>
        {labels[role]}
      </Badge>
    );
  };

  if (!permissions.canManageTeam) {
    return (
      <Card className="border-amber-500/20">
        <CardContent className="py-12 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Founder Access Required</h3>
          <p className="text-muted-foreground">Only Founders can manage Core Team members.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      <Card className="border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite Core Team Member
          </CardTitle>
          <CardDescription>
            Add a new member to the RouteAce Core System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="team@routeace.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as CoreRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="core_founder">Founder</SelectItem>
                  <SelectItem value="core_cofounder">Co-Founder</SelectItem>
                  <SelectItem value="core_product">Product Manager</SelectItem>
                  <SelectItem value="core_engineer">Engineer</SelectItem>
                  <SelectItem value="core_analyst">Data Analyst</SelectItem>
                  <SelectItem value="core_builder">Builder</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting ? "Inviting..." : "Invite"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Core Team Members</CardTitle>
          <CardDescription>
            All members with access to the Core System
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No core team members yet. Invite your first team member above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-mono text-xs">
                      {member.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{getRoleBadge(member.core_role)}</TableCell>
                    <TableCell>
                      {member.is_active ? (
                        <Badge variant="outline" className="text-green-400 border-green-500/30">
                          <Check className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-400 border-red-500/30">
                          <X className="w-3 h-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {member.is_active && member.core_role !== "core_founder" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(member)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoreTeamManagement;
