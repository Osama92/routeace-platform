import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function DeptRouteApprovals() {
  const navigate = useNavigate();
  const { hasAnyRole } = useAuth();
  const canApprove = hasAnyRole(["super_admin", "org_admin", "finance_manager", "ops_manager"] as any);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ route_name: "", origin: "", destination: "", estimated_cost: "", justification: "" });

  const load = async () => {
    const { data, error } = await (supabase as any)
      .from("dept_route_approvals").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message); else setRows(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data: mem } = await (supabase as any)
      .from("organization_members").select("organization_id").eq("user_id", u.user?.id).maybeSingle();
    if (!mem?.organization_id) { toast.error("No organization"); return; }
    const { error } = await (supabase as any).from("dept_route_approvals").insert({
      organization_id: mem.organization_id,
      requested_by: u.user?.id,
      route_name: form.route_name,
      origin: form.origin,
      destination: form.destination,
      estimated_cost: Number(form.estimated_cost) || 0,
      justification: form.justification,
    });
    if (error) toast.error(error.message);
    else { toast.success("Request submitted"); setOpen(false); setForm({ route_name: "", origin: "", destination: "", estimated_cost: "", justification: "" }); load(); }
  };

  const decide = async (id: string, status: "approved" | "rejected") => {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from("dept_route_approvals").update({
      status, reviewed_by: u.user?.id, reviewed_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Route ${status}`); load(); }
  };

  return (
    <DashboardLayout title="Route Approvals" subtitle="Internal route requests for the Logistics Department">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold">Route Approvals</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Request</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Request Route Approval</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Route name</Label><Input value={form.route_name} onChange={(e) => setForm({ ...form, route_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Origin</Label><Input value={form.origin} onChange={(e) => setForm({ ...form, origin: e.target.value })} /></div>
                  <div><Label>Destination</Label><Input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
                </div>
                <div><Label>Estimated cost</Label><Input type="number" value={form.estimated_cost} onChange={(e) => setForm({ ...form, estimated_cost: e.target.value })} /></div>
                <div><Label>Justification</Label><Textarea value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} /></div>
                <Button onClick={submit} className="w-full">Submit</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader><CardTitle>Pending & recent requests</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}
            {rows.map((r) => (
              <div key={r.id} className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{r.route_name}</div>
                  <div className="text-xs text-muted-foreground">{r.origin} → {r.destination} · ₦{Number(r.estimated_cost).toLocaleString()}</div>
                  {r.justification && <div className="text-xs mt-1">{r.justification}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>
                  {canApprove && r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "approved")}><Check className="h-4 w-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}><X className="h-4 w-4" /></Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
