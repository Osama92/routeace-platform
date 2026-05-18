import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  UserPlus,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Users,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

const ROLES = [
  { value: "org_admin", label: "Organization Admin" },
  { value: "ops_manager", label: "Operations Manager" },
  { value: "finance_manager", label: "Finance Manager" },
  { value: "dispatcher", label: "Dispatcher" },
  { value: "support", label: "Support" },
];

const OrganizationInvitations = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("dispatcher");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get user's organization
  const { data: membership } = useQuery({
    queryKey: ["user-org-membership", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id, is_owner, organizations:organization_id(id, name)")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single();
      
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Fetch invitations
  const { data: invitations, isLoading } = useQuery({
    queryKey: ["org-invitations", membership?.organization_id],
    queryFn: async () => {
      if (!membership?.organization_id) return [];
      const { data, error } = await supabase
        .from("organization_invitations")
        .select("*")
        .eq("organization_id", membership.organization_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Invitation[];
    },
    enabled: !!membership?.organization_id,
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      if (!membership?.organization_id || !user) throw new Error("No organization");

      const { error } = await supabase
        .from("organization_invitations")
        .insert({
          organization_id: membership.organization_id,
          email,
          role,
          invited_by: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["org-invitations"] });
      toast.success("Invitation sent successfully");
      setDialogOpen(false);
      setEmail("");
      setRole("dispatcher");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to send invitation");
    },
  });

  const handleInvite = async () => {
    if (!email) {
      toast.error("Please enter an email address");
      return;
    }
    setIsSubmitting(true);
    await createInvitationMutation.mutateAsync();
    setIsSubmitting(false);
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/signup/join?token=${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  if (!membership) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>You are not part of any organization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Team Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Invite team members to join {(membership.organizations as any)?.name}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending & Recent Invitations</CardTitle>
          <CardDescription>
            Invitations expire after 7 days if not accepted
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations?.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell className="capitalize">
                      {invitation.role.replace("_", " ")}
                    </TableCell>
                    <TableCell>{getStatusBadge(invitation)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {!invitation.accepted_at && new Date(invitation.expires_at) > new Date() && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyInviteLink(invitation.token)}
                        >
                          <Copy className="w-4 h-4 mr-1" />
                          Copy Link
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!invitations || invitations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No invitations sent yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationInvitations;
