import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSalesOS } from "@/hooks/useSalesOS";
import { Activity, Plus, ArrowLeft, Phone, Users, MapPin, Mail, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const typeIcons: Record<string, any> = { call: Phone, meeting: Users, visit: MapPin, email: Mail, task: CheckCircle };

const SalesActivities = () => {
  const navigate = useNavigate();
  const { activities, leads, accounts, logActivity } = useSalesOS();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    activity_type: "call", subject: "", description: "", lead_id: "", account_id: "",
    duration_minutes: "", outcome: "", next_action: "", next_action_date: "",
  });

  const handleCreate = async () => {
    if (!form.subject) return;
    await logActivity({
      ...form,
      lead_id: form.lead_id || null,
      account_id: form.account_id || null,
      duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
      next_action_date: form.next_action_date || null,
    } as any);
    setOpen(false);
    setForm({ activity_type: "call", subject: "", description: "", lead_id: "", account_id: "", duration_minutes: "", outcome: "", next_action: "", next_action_date: "" });
  };

  return (
    <DashboardLayout title="Sales Activities" subtitle="Log calls, meetings, visits, and follow-ups">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Log Activity</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log Activity</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={form.activity_type} onValueChange={v => setForm(p => ({ ...p, activity_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["call", "meeting", "visit", "email", "task", "whatsapp", "sms"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} /></div>
                </div>
                <div><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Follow up on Q3 proposal" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Lead</Label>
                    <Select value={form.lead_id} onValueChange={v => setForm(p => ({ ...p, lead_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{leads.map(l => <SelectItem key={l.id} value={l.id}>{l.company_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Account</Label>
                    <Select value={form.account_id} onValueChange={v => setForm(p => ({ ...p, account_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                <div><Label>Outcome</Label><Input value={form.outcome} onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))} placeholder="Interested, will review" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Next Action</Label><Input value={form.next_action} onChange={e => setForm(p => ({ ...p, next_action: e.target.value }))} placeholder="Send proposal" /></div>
                  <div><Label>Next Action Date</Label><Input type="date" value={form.next_action_date} onChange={e => setForm(p => ({ ...p, next_action_date: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Log Activity</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {activities.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No activities yet</p>
              <p className="text-xs text-muted-foreground mb-4">Log calls, meetings, and visits to track sales engagement</p>
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Log First Activity</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {activities.map(a => {
              const Icon = typeIcons[a.activity_type] || Activity;
              return (
                <Card key={a.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                      a.activity_type === "call" ? "bg-blue-100 text-blue-700" :
                      a.activity_type === "meeting" ? "bg-violet-100 text-violet-700" :
                      a.activity_type === "visit" ? "bg-emerald-100 text-emerald-700" :
                      a.activity_type === "email" ? "bg-amber-100 text-amber-700" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm truncate">{a.subject}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{a.activity_type}</Badge>
                        {a.is_completed && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Done</Badge>}
                      </div>
                      {a.description && <p className="text-xs text-muted-foreground mb-1">{a.description}</p>}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {a.activity_date && <span>{new Date(a.activity_date).toLocaleDateString()}</span>}
                        {a.duration_minutes && <span>{a.duration_minutes}min</span>}
                        {a.outcome && <span>→ {a.outcome}</span>}
                      </div>
                      {a.next_action && (
                        <p className="text-xs mt-1 text-primary font-medium">Next: {a.next_action} {a.next_action && `(${a.next_action})`}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesActivities;
