import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserPlus, CheckCircle2, XCircle, Pause } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function DeptVendorOnboarding() {
  const { organizationId, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ business_name: "", contact_email: "", contact_phone: "", registration_number: "", insurance_expiry: "", description: "" });
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [score, setScore] = useState(70);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => { if (organizationId) void load(); /* eslint-disable-next-line */ }, [organizationId]);

  async function load() {
    setLoading(true);
    if (!organizationId) { setLoading(false); return; }
    const { data } = await supabase.from("vendor_partners").select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(300);
    setItems(data || []);
    setLoading(false);
  }

  async function addVendor() {
    if (!organizationId || !form.business_name) { toast.error("Business name required"); return; }
    const { error } = await supabase.from("vendor_partners").insert({
      organization_id: organizationId, ...form,
      insurance_expiry: form.insurance_expiry || null,
      onboarding_status: "pending", is_active: false, user_id: user?.id,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor submitted for review");
    setForm({ business_name: "", contact_email: "", contact_phone: "", registration_number: "", insurance_expiry: "", description: "" });
    void load();
  }

  async function approve(id: string) {
    const { error } = await supabase.from("vendor_partners").update({
      onboarding_status: "approved", approved_by: user?.id,
      approved_at: new Date().toISOString(), compliance_score: score, is_active: true, is_verified: true,
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor approved - they can now be assigned to dispatches");
    setReviewId(null); void load();
  }

  async function reject(id: string) {
    if (!rejectReason) { toast.error("Rejection reason required"); return; }
    const { error } = await supabase.from("vendor_partners").update({
      onboarding_status: "rejected", rejection_reason: rejectReason, is_active: false,
    } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor rejected"); setReviewId(null); setRejectReason(""); void load();
  }

  async function suspend(id: string) {
    const { error } = await supabase.from("vendor_partners").update({ onboarding_status: "suspended", is_active: false } as any).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Vendor suspended"); void load();
  }

  const pending = items.filter((i: any) => i.onboarding_status === "pending" || i.onboarding_status === "under_review");
  const approved = items.filter((i: any) => i.onboarding_status === "approved");
  const rejected = items.filter((i: any) => i.onboarding_status === "rejected" || i.onboarding_status === "suspended");

  return (
    <DashboardLayout title="3PL Vendor Qualification" subtitle="Onboard and approve carriers before they can be dispatched.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
            <TabsTrigger value="add">Add for Review</TabsTrigger>
            <TabsTrigger value="approved">Approved ({approved.length})</TabsTrigger>
            <TabsTrigger value="rejected">Rejected/Suspended ({rejected.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card><CardHeader><CardTitle className="text-base">Pending Approval</CardTitle></CardHeader><CardContent>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : pending.length === 0 ? <div className="text-sm text-muted-foreground py-6 text-center">No vendors pending.</div> : (
                <div className="space-y-2">
                  {pending.map((v: any) => (
                    <div key={v.id} className="border rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="font-medium">{v.business_name}</div>
                          <div className="text-xs text-muted-foreground">{v.contact_email} · {v.contact_phone || "-"} · Reg: {v.registration_number || "-"}</div>
                          <div className="text-xs text-muted-foreground">Insurance expires: {v.insurance_expiry || "-"}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setReviewId(reviewId === v.id ? null : v.id); setScore(v.compliance_score || 70); }}>Review</Button>
                      </div>
                      {reviewId === v.id && (
                        <div className="mt-3 space-y-2 border-t pt-3">
                          <div className="text-xs text-muted-foreground">Document Checklist (manual): ✓ Reg Cert · ✓ Insurance · ✓ Vehicles · ✓ Rate Card</div>
                          <div>
                            <label className="text-xs">Compliance Score: <strong>{score}</strong></label>
                            <input type="range" min={0} max={100} value={score} onChange={(e) => setScore(Number(e.target.value))} className="w-full" />
                          </div>
                          <Textarea placeholder="Rejection reason (only if rejecting)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => approve(v.id)}><CheckCircle2 className="h-4 w-4 mr-1" />Approve</Button>
                            <Button size="sm" variant="destructive" onClick={() => reject(v.id)}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="add">
            <Card><CardHeader><CardTitle className="text-base">Add New Vendor for Review</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-w-2xl">
                <div><label className="text-xs text-muted-foreground">Business Name *</label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Contact Email</label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Contact Phone</label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Registration Number (CAC)</label><Input value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Insurance Expiry</label><Input type="date" value={form.insurance_expiry} onChange={(e) => setForm({ ...form, insurance_expiry: e.target.value })} /></div>
                </div>
                <div><label className="text-xs text-muted-foreground">Notes / Coverage</label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} /></div>
                <Button onClick={addVendor}><UserPlus className="h-4 w-4 mr-2" />Submit for Review</Button>
              </CardContent></Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card><CardHeader><CardTitle className="text-base">Approved Vendors</CardTitle></CardHeader><CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr>
                  <th className="text-left py-2">Vendor</th><th>Approved</th><th className="text-right">Compliance</th><th></th>
                </tr></thead>
                <tbody>
                  {approved.map((v: any) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 font-medium">{v.business_name}</td>
                      <td>{v.approved_at?.slice(0, 10) || "-"}</td>
                      <td className="text-right"><Badge variant="outline">{v.compliance_score || 0}</Badge></td>
                      <td><Button size="sm" variant="ghost" onClick={() => suspend(v.id)}><Pause className="h-4 w-4 mr-1" />Suspend</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card><CardHeader><CardTitle className="text-base">Rejected / Suspended</CardTitle></CardHeader><CardContent>
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b"><tr>
                  <th className="text-left py-2">Vendor</th><th>Status</th><th>Reason</th>
                </tr></thead>
                <tbody>
                  {rejected.map((v: any) => (
                    <tr key={v.id} className="border-b">
                      <td className="py-2 font-medium">{v.business_name}</td>
                      <td><Badge variant="destructive">{v.onboarding_status}</Badge></td>
                      <td className="text-xs text-muted-foreground">{v.rejection_reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
