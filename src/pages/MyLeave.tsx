import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  computeLeaveImpact, diffDaysInclusive, impactColor, impactLabel,
} from "@/lib/workforce/leaveImpact";
import DashboardLayout from "@/components/layout/DashboardLayout";

type LeaveType = "annual" | "sick" | "emergency";

interface Balance {
  leave_type: LeaveType;
  allocated_days: number;
  used_days: number;
  pending_days: number;
}
interface Request {
  id: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string;
  impact_level: string | null;
  created_at: string;
}

const TYPES: LeaveType[] = ["annual", "sick", "emergency"];

export default function MyLeave() {
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [balances, setBalances] = useState<Balance[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // form state
  const [type, setType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reason, setReason] = useState("");
  const [impact, setImpact] = useState<Awaited<ReturnType<typeof computeLeaveImpact>> | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return diffDaysInclusive(format(startDate, "yyyy-MM-dd"), format(endDate, "yyyy-MM-dd"));
  }, [startDate, endDate]);

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const year = new Date().getFullYear();
    const [{ data: bData }, { data: rData }, { data: mem }] = await Promise.all([
      supabase.from("leave_balances").select("leave_type, allocated_days, used_days, pending_days")
        .eq("user_id", user.id).eq("year", year),
      supabase.from("leave_requests").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(20),
      supabase.from("organization_members").select("organization_id")
        .eq("user_id", user.id).maybeSingle(),
    ]);
    setBalances((bData ?? []) as any);
    setRequests((rData ?? []) as any);
    if (mem?.organization_id) setOrgId(mem.organization_id);
    setLoading(false);
  }

  async function runImpact() {
    if (!user || !startDate || !endDate) return;
    setImpactLoading(true);
    try {
      const r = await computeLeaveImpact({
        userId: user.id,
        userRole,
        startDate: format(startDate, "yyyy-MM-dd"),
        endDate: format(endDate, "yyyy-MM-dd"),
      });
      setImpact(r);
    } finally {
      setImpactLoading(false);
    }
  }

  async function submit() {
    if (!user || !startDate || !endDate || !reason.trim()) {
      toast({ title: "Missing info", description: "Pick dates and add a reason.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // Server-side balance check
      const { data: bal } = await supabase
        .from("leave_balances")
        .select("allocated_days, used_days, pending_days")
        .eq("user_id", user.id)
        .eq("leave_type", type)
        .eq("year", new Date().getFullYear())
        .maybeSingle();
      if (bal) {
        const remaining =
          Number(bal.allocated_days) - Number(bal.used_days) - Number(bal.pending_days);
        if (totalDays > remaining) {
          toast({
            title: "Insufficient leave balance",
            description: `You have ${remaining} day(s) remaining for ${type} leave.`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      const { error } = await supabase.from("leave_requests").insert({
        user_id: user.id,
        organization_id: orgId,
        leave_type: type,
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        total_days: totalDays,
        reason: reason.trim(),
        impact_level: impact?.level ?? null,
        impact_details: (impact ?? {}) as any,
        active_dispatches_count: impact?.activeDispatches ?? 0,
        open_tickets_count: impact?.openTickets ?? 0,
      });
      if (error) throw error;
      toast({ title: "Leave submitted", description: "Your request is pending admin review." });
      setOpen(false);
      setReason(""); setStartDate(undefined); setEndDate(undefined); setImpact(null);
      await load();
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DashboardLayout title="My Leave">
      <div className="container mx-auto py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Leave</h1>
            <p className="text-muted-foreground">Request leave and track your balances.</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Request</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Leave Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as LeaveType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="sick">Sick</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DatePick label="Start" value={startDate} onChange={setStartDate} />
                  <DatePick label="End" value={endDate} onChange={setEndDate} min={startDate} />
                </div>
                {totalDays > 0 && (
                  <div className="text-sm text-muted-foreground">Total: <strong>{totalDays}</strong> day(s)</div>
                )}
                <div>
                  <Label>Reason</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Brief reason for leave" />
                </div>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={runImpact} disabled={!startDate || !endDate || impactLoading}>
                    {impactLoading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Check operational impact
                  </Button>
                  {impact && (
                    <Badge className={cn("text-white", impactColor(impact.level))}>
                      {impactLabel(impact.level)}
                    </Badge>
                  )}
                </div>
                {impact && (
                  <Card className="bg-muted/40">
                    <CardContent className="p-3 text-sm space-y-1">
                      {impact.reasons.map((r, i) => <div key={i}>• {r}</div>)}
                      {impact.level === "high" && (
                        <div className="text-red-500 font-medium pt-2">
                          ⚠ High impact - please reassign your active commitments before submitting.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TYPES.map((t) => {
            const b = balances.find((x) => x.leave_type === t) ?? {
              leave_type: t, allocated_days: 0, used_days: 0, pending_days: 0,
            };
            const remaining = b.allocated_days - Number(b.used_days) - Number(b.pending_days);
            return (
              <Card key={t}>
                <CardHeader className="pb-2">
                  <CardTitle className="capitalize text-base">{t} Leave</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{remaining}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    of {b.allocated_days} days · {Number(b.used_days)} used · {Number(b.pending_days)} pending
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* History */}
        <Card>
          <CardHeader><CardTitle>Recent Requests</CardTitle></CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-muted-foreground">Loading…</div>
            ) : requests.length === 0 ? (
              <div className="text-sm text-muted-foreground">No leave requests yet.</div>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">{r.leave_type}</Badge>
                      <span>{r.start_date} → {r.end_date}</span>
                      <span className="text-muted-foreground">({r.total_days}d)</span>
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function DatePick({
  label, value, onChange, min,
}: { label: string; value?: Date; onChange: (d?: Date) => void; min?: Date }) {
  return (
    <div>
      <Label className="block mb-1">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            disabled={(d) => (min ? d < min : false) || d < new Date(new Date().setHours(0, 0, 0, 0))}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
