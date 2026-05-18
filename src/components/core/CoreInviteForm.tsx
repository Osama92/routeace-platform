import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import type { CoreRole } from "@/hooks/useCoreAuth";

interface CoreInviteFormProps {
  currentUserId: string;
  currentUserRole: CoreRole;
  onInviteSuccess: () => void;
}

const CoreInviteForm = ({ currentUserId, currentUserRole, onInviteSuccess }: CoreInviteFormProps) => {
  const { toast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<CoreRole>("core_engineer");
  const [inviting, setInviting] = useState(false);

  // Available roles based on current user's role
  const getAvailableRoles = (): { value: CoreRole; label: string }[] => {
    const allRoles = [
      { value: "core_founder" as CoreRole, label: "Founder" },
      { value: "core_cofounder" as CoreRole, label: "Co-Founder" },
      { value: "core_product" as CoreRole, label: "Product Manager" },
      { value: "core_engineer" as CoreRole, label: "Engineer" },
      { value: "core_analyst" as CoreRole, label: "Data Analyst" },
      { value: "core_builder" as CoreRole, label: "Builder" },
    ];

    // Only founders can assign any role
    if (currentUserRole === "core_founder") {
      return allRoles;
    }

    // Other roles shouldn't be able to invite (this is just for safety)
    return allRoles.filter(r => !["core_founder", "core_cofounder"].includes(r.value));
  };

  const handleInvite = async () => {
    if (!inviteEmail || !inviteRole) return;
    setInviting(true);

    try {
      // First check if user exists in profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email, full_name")
        .eq("email", inviteEmail)
        .single();

      if (!profiles) {
        toast({
          title: "User Not Found",
          description: "Please ensure the user has created an account before inviting them to the Core Team.",
          variant: "destructive",
        });
        setInviting(false);
        return;
      }

      // Check if already a core team member
      const { data: existingMember } = await supabase
        .from("core_team_members")
        .select("id, is_active")
        .eq("user_id", profiles.user_id)
        .single();

      if (existingMember?.is_active) {
        toast({
          title: "Already a Member",
          description: "This user is already an active Core Team member.",
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

      // Add or reactivate in core_team_members
      if (existingMember) {
        const { error: updateError } = await supabase
          .from("core_team_members")
          .update({
            core_role: inviteRole,
            is_active: true,
            display_name: profiles.full_name,
            email: profiles.email,
          })
          .eq("id", existingMember.id);

        if (updateError) throw updateError;
      } else {
        const { error: memberError } = await supabase
          .from("core_team_members")
          .insert({
            user_id: profiles.user_id,
            core_role: inviteRole,
            invited_by: currentUserId,
            display_name: profiles.full_name,
            email: profiles.email,
            is_active: true,
          });

        if (memberError) throw memberError;
      }

      // Log the action
      await supabase.from("core_access_logs").insert({
        user_id: currentUserId,
        core_role: currentUserRole,
        action: "invite_member",
        resource: inviteEmail,
        metadata: { invited_role: inviteRole, invited_user_id: profiles.user_id },
      });

      toast({
        title: "Team Member Invited",
        description: `${profiles.full_name || inviteEmail} has been added as ${inviteRole.replace("core_", "").replace("_", " ")}`,
      });

      setInviteEmail("");
      onInviteSuccess();
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

  return (
    <Card className="border-amber-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Invite Core Team Member
        </CardTitle>
        <CardDescription>
          Add a new member to the RouteAce Core System. They must have an existing account.
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
                {getAvailableRoles().map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
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
  );
};

export default CoreInviteForm;
