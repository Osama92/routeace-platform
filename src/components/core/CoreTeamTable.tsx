import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Check, X, RefreshCw, Eye, EyeOff } from "lucide-react";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { CoreRole } from "@/hooks/useCoreAuth";

interface CoreMember {
  id: string;
  user_id: string;
  core_role: CoreRole;
  display_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  login_count: number;
}

interface CoreTeamTableProps {
  members: CoreMember[];
  currentUserId: string;
  currentUserRole: CoreRole;
  onRefresh: () => void;
}

const CoreTeamTable = ({ members, currentUserId, currentUserRole, onRefresh }: CoreTeamTableProps) => {
  const { toast } = useToast();
  const [processing, setProcessing] = useState<string | null>(null);

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

  const handleToggleActive = async (member: CoreMember) => {
    setProcessing(member.id);
    try {
      const newStatus = !member.is_active;
      
      await supabase
        .from("core_team_members")
        .update({ is_active: newStatus })
        .eq("id", member.id);

      // Log the action
      await supabase.from("core_access_logs").insert({
        user_id: currentUserId,
        core_role: currentUserRole,
        action: newStatus ? "activate_member" : "deactivate_member",
        resource: member.user_id,
      });

      toast({
        title: newStatus ? "Member Activated" : "Member Deactivated",
        description: `Access has been ${newStatus ? "restored" : "revoked"} for this team member.`,
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleRemove = async (member: CoreMember) => {
    setProcessing(member.id);
    try {
      // Remove from user_roles
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", member.user_id)
        .in("role", ["core_founder", "core_cofounder", "core_builder", "core_product", "core_engineer", "core_analyst", "internal_team"]);

      // Deactivate in core_team_members
      await supabase
        .from("core_team_members")
        .update({ is_active: false })
        .eq("id", member.id);

      // Log the action
      await supabase.from("core_access_logs").insert({
        user_id: currentUserId,
        core_role: currentUserRole,
        action: "remove_member",
        resource: member.user_id,
      });

      toast({
        title: "Member Removed",
        description: "Team member has been removed from Core System access.",
      });

      onRefresh();
    } catch (error: any) {
      toast({
        title: "Remove Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(null);
    }
  };

  const canRemoveMember = (member: CoreMember) => {
    // Cannot remove yourself
    if (member.user_id === currentUserId) return false;
    // Founders can remove anyone except themselves
    if (currentUserRole === "core_founder") return true;
    // Co-founders cannot remove founders
    if (currentUserRole === "core_cofounder" && member.core_role === "core_founder") return false;
    // Other roles cannot remove anyone
    return false;
  };

  const formatLastSeen = (date: string | null) => {
    if (!date) return "Never";
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Member</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead>Login Count</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell>
              <div>
                <p className="font-medium">{member.display_name || "-"}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {member.email || member.user_id.slice(0, 8) + "..."}
                </p>
              </div>
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
            <TableCell className="text-muted-foreground text-sm">
              {formatLastSeen(member.last_login_at)}
            </TableCell>
            <TableCell className="font-mono text-sm">
              {member.login_count || 0}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {new Date(member.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right space-x-2">
              {/* Toggle Active */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleActive(member)}
                disabled={processing === member.id || member.core_role === "core_founder"}
              >
                {member.is_active ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-green-400" />
                )}
              </Button>

              {/* Remove */}
              {canRemoveMember(member) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" disabled={processing === member.id}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove {member.display_name || "this user"} from the Core System.
                        They will lose all internal access. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleRemove(member)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default CoreTeamTable;
