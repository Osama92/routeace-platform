import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { impactColor, impactLabel, suggestReassignees } from "@/lib/workforce/leaveImpact";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface LeaveReq {
  id: string;
  user_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
  impact_level: string | null;
  impact_details: any;
  active_dispatches_count: number;
  open_tickets_count: number;
  reassignment_confirmed: boolean;
  created_at: string;
  requester?: { full_name?: string; email?: string };
}

export default function LeaveInbox() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = hasRole("super_admin");
  const isCoo = hasRole("org_admin"); // COO == Organization Admin
  const [tab, setTab] = useState(isSuperAdmin ? "pending_super_admin" : "pending");
  const [items, setItems] = useState<LeaveReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<LeaveReq | null>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);

  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle();
      setOrgId(membership?.organization_id ?? null);
    })();
  }, [user]);

  useEffect(() => { load(); }, [tab, orgId]);

  async function load() {
    setLoading(true);
    let q = supabase.from("leave_requests").select("*").order("created_at", { ascending: false }).limit(100);
    if (tab !== "all") q = q.eq("status", tab as any);
    if (orgId) q = q.eq("organization_id", orgId);
    const { data } = await q;
    const reqs = (data ?? []) as LeaveReq[];

    // Fetch requester names
    const userIds = [...new Set(reqs.map((r) => r.user_id))];
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", userIds);
      const map = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      reqs.forEach((r) => { r.requester = map.get(r.user_id) as any; });
    }
    setItems(reqs);
    setLoading(false);
  }

  async function openDetail(r: LeaveReq) {
    setActive(r);
    setNotes("");
    setSuggestions([]);
    if (r.impact_details?.resources?.length) {
      const s = await suggestReassignees(r.impact_details.resources, r.user_id);
      setSuggestions(s);
    }
  }

  async function decide(intent: "approve" | "reject" | "request_changes") {
    if (!active || !user) return;
    let nextStatus: "approved" | "rejected" | "modification_requested" | "pending_super_admin";

    if (intent === "reject") nextStatus = "rejected";
    else if (intent === "request_changes") nextStatus = "modification_requested";
    else {
      // approve
      if (active.status === "pending") {
        // First-stage approval (COO) → escalate
        nextStatus = "pending_super_admin";
      } else {
        // Final approval requires super admin
        if (!isSuperAdmin) {
          toast({
            title: "Super Admin required",
            description: "Final approval can only be granted by the Super Admin.",
            variant: "destructive",
          });
          return;
        }
        nextStatus = "approved";
      }
    }

    if (active.impact_level === "high" && nextStatus === "approved" && !active.reassignment_confirmed) {
      toast({
        title: "Reassignment required",
        description: "Confirm reassignments below before final approval.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({
          status: nextStatus,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: notes.trim() || null,
        })
        .eq("id", active.id);
      if (error) throw error;
      toast({
        title:
          nextStatus === "pending_super_admin"
            ? "Approved by COO - awaiting Super Admin"
            : `Request ${nextStatus.replace("_", " ")}`,
      });
      setActive(null);
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmReassignment() {
    if (!active) return;
    setBusy(true);
    try {
      // Persist suggestions as reassignment rows + flip flag
      const rows = suggestions
        .filter((s) => s.assignee)
        .map((s) => ({
          leave_request_id: active.id,
          resource_type: s.resource.type,
          resource_id: s.resource.id,
          resource_label: s.resource.label,
          suggested_assignee_id: s.assignee.id,
          suggested_assignee_label: s.assignee.label,
          status: "confirmed",
          confirmed_at: new Date().toISOString(),
          confirmed_by: user!.id,
        }));
      if (rows.length > 0) {
        await supabase.from("leave_reassignment_suggestions").insert(rows);
      }
      await supabase
        .from("leave_requests")
        .update({ reassignment_confirmed: true })
        .eq("id", active.id);
      setActive({ ...active, reassignment_confirmed: true });
      toast({ title: "Reassignments recorded" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <DashboardLayout title="Leave Inbox">
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Leave Inbox</h1>
          <p className="text-muted-foreground">Review and act on staff leave requests.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending COO</TabsTrigger>
            <TabsTrigger value="pending_super_admin">Pending Super Admin</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
          <TabsContent value={tab} className="mt-4">
            <Card>
              <CardHeader><CardTitle className="capitalize">{tab} requests</CardTitle></CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading…</div>
                ) : items.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No requests.</div>
                ) : (
                  <div className="space-y-2">
                    {items.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => openDetail(r)}
                        className="w-full text-left flex items-center justify-between border rounded-md px-3 py-3 text-sm hover:bg-accent"
                      >
                        <div className="flex flex-col">
                          <div className="font-medium">{r.requester?.full_name ?? r.requester?.email ?? "Unknown"}</div>
                          <div className="text-xs text-muted-foreground">
                            <span className="capitalize">{r.leave_type}</span> · {r.start_date} → {r.end_date} · {r.total_days}d
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.impact_level && (
                            <Badge className={cn("text-white", impactColor(r.impact_level as any))}>
                              {impactLabel(r.impact_level as any)}
                            </Badge>
                          )}
                          <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>
                            {r.status}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
          <DialogContent className="max-w-2xl">
            {active && (
              <>
                <DialogHeader>
                  <DialogTitle>
                    Leave Request - {active.requester?.full_name ?? active.requester?.email}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Type"><span className="capitalize">{active.leave_type}</span></Field>
                    <Field label="Days">{active.total_days}</Field>
                    <Field label="Start">{active.start_date}</Field>
                    <Field label="End">{active.end_date}</Field>
                  </div>
                  <Field label="Reason"><div className="text-muted-foreground">{active.reason}</div></Field>
                  <Field label="Operational impact">
                    <div className="flex items-center gap-2">
                      {active.impact_level && (
                        <Badge className={cn("text-white", impactColor(active.impact_level as any))}>
                          {impactLabel(active.impact_level as any)}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        {active.active_dispatches_count} dispatch(es), {active.open_tickets_count} ticket(s)
                      </span>
                    </div>
                    {active.impact_details?.reasons && (
                      <ul className="mt-2 text-xs text-muted-foreground list-disc pl-5">
                        {(active.impact_details.reasons as string[]).map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </Field>

                  {suggestions.length > 0 && (active.status === "pending" || active.status === "pending_super_admin") && (
                    <Card className="bg-muted/40">
                      <CardHeader className="pb-2"><CardTitle className="text-sm">Suggested reassignments</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {suggestions.map((s, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span>{s.resource.label}</span>
                            <span className="text-muted-foreground">→ {s.assignee?.label ?? "no candidate"}</span>
                          </div>
                        ))}
                        {!active.reassignment_confirmed && (
                          <Button size="sm" variant="outline" onClick={confirmReassignment} disabled={busy}>
                            Confirm reassignments
                          </Button>
                        )}
                        {active.reassignment_confirmed && (
                          <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Reassignment confirmed</Badge>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {(active.status === "pending" || active.status === "pending_super_admin") && (
                    <div>
                      <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional review notes" rows={2} />
                    </div>
                  )}
                </div>
                {(() => {
                  const stage1 = active.status === "pending" && (isCoo || isSuperAdmin);
                  const stage2 = active.status === "pending_super_admin" && isSuperAdmin;
                  if (!stage1 && !stage2) return null;
                  const approveLabel = stage1 ? "Approve (COO) → Super Admin" : "Final Approve";
                  return (
                    <DialogFooter className="gap-2">
                      <Button variant="outline" onClick={() => decide("request_changes")} disabled={busy}>
                        <MessageSquare className="h-4 w-4 mr-1" />Request changes
                      </Button>
                      <Button variant="destructive" onClick={() => decide("reject")} disabled={busy}>
                        <XCircle className="h-4 w-4 mr-1" />Reject
                      </Button>
                      <Button onClick={() => decide("approve")} disabled={busy}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />{approveLabel}
                      </Button>
                    </DialogFooter>
                  );
                })()}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
