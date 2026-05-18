import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { Loader2, Sparkles, TrendingUp, AlertTriangle, Trophy, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { computePerformance, type ScoreOutput } from "@/lib/workforce/performanceScoring";

interface StaffMember {
  user_id: string;
  full_name: string;
  email: string | null;
}

const TIER_STYLE: Record<string, string> = {
  top: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  strong: "bg-sky-500/10 text-sky-700 border-sky-300",
  developing: "bg-amber-500/10 text-amber-700 border-amber-300",
  at_risk: "bg-red-500/10 text-red-700 border-red-300",
};

export default function PerformancePanel() {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [periodDays, setPeriodDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreOutput | null>(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    void loadStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  async function loadStaff() {
    // Always tenant-scope the staff picker to the active organization.
    // Super Admin is powerful inside their org, not across every database row.
    if (!organizationId) {
      setStaff([]);
      setSelected("");
      return;
    }

    const { data: members, error: memberError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("is_active", true);

    if (memberError) {
      setStaff([]);
      setSelected("");
      toast({ title: "Couldn't load org staff", description: memberError.message, variant: "destructive" });
      return;
    }

    const userIds = Array.from(new Set((members ?? []).map((r: any) => r.user_id).filter(Boolean)));
    if (userIds.length === 0) {
      setStaff([]);
      setSelected("");
      return;
    }

    let q = supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .order("full_name", { ascending: true })
      .limit(500);
    q = q.in("user_id", userIds);

    const { data: profiles } = await q;
    const nextStaff = (profiles ?? []) as StaffMember[];
    setStaff(nextStaff);
    setSelected((current) => nextStaff.some((s) => s.user_id === current) ? current : "");
  }

  async function compute() {
    if (!selected) return;
    if (!staff.some((s) => s.user_id === selected)) {
      toast({ title: "Staff outside current org", description: "Select a staff member assigned to this organization.", variant: "destructive" });
      setSelected("");
      return;
    }
    setLoading(true);
    setScore(null);
    const start = format(subDays(new Date(), periodDays - 1), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");

    const [{ data: signins }, { data: kpis }] = await Promise.all([
      supabase
        .from("staff_signins")
        .select("status,signin_at,signin_date")
        .eq("user_id", selected)
        .gte("signin_date", start)
        .lte("signin_date", end),
      supabase
        .from("staff_kpi_entries")
        .select("metric_key,metric_value,target_value,unit")
        .eq("user_id", selected)
        .gte("entry_date", start)
        .lte("entry_date", end),
    ]);

    const result = computePerformance({
      signins: (signins ?? []) as any,
      kpis: (kpis ?? []) as any,
      periodDays,
    });
    setScore(result);
    setLoading(false);
  }

  async function publish() {
    if (!score || !selected || !user) return;
    if (!staff.some((s) => s.user_id === selected)) {
      toast({ title: "Publish blocked", description: "This staff member is not assigned to the current organization.", variant: "destructive" });
      setSelected("");
      return;
    }
    setPublishing(true);
    const start = format(subDays(new Date(), periodDays - 1), "yyyy-MM-dd");
    const end = format(new Date(), "yyyy-MM-dd");
    const period_type = periodDays <= 1 ? "daily" : periodDays <= 7 ? "weekly" : periodDays <= 31 ? "monthly" : "quarterly";

    // Resolve staff_id (FK to staff table) so downstream joins work
    const { data: staffRow } = await (supabase.from("staff") as any)
      .select("id")
      .eq("user_id", selected)
      .maybeSingle();
    const staffId = (staffRow as any)?.id ?? null;

    const { error } = await (supabase.from("staff_performance_scores") as any).upsert({
      user_id: selected,
      staff_id: staffId,
      period_type,
      period_start: start,
      period_end: end,
      score: score.score,
      tier: score.tier,
      attendance_score: score.attendance_score,
      productivity_score: score.productivity_score,
      quality_score: score.quality_score,
      strengths: score.strengths,
      gaps: score.gaps,
      recommendations: score.recommendations,
      ai_summary: score.ai_summary,
      computed_by: "ai",
    }, { onConflict: "user_id,period_type,period_start" });

    // Audit log (non-blocking)
    await supabase.from("workforce_audit_log").insert({
      actor_id: user.id,
      target_user_id: selected,
      action: "perf_publish",
      entity_type: "staff_performance_scores",
      pin_confirmed: false,
      metadata: { score: score.score, tier: score.tier, period_type },
    });

    setPublishing(false);
    if (error) {
      toast({ title: "Publish failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Performance published", description: `${score.tier.toUpperCase()} • ${score.score}/100` });
  }

  const selectedStaff = useMemo(() => staff.find((s) => s.user_id === selected), [staff, selected]);

  return (
    <DashboardLayout title="AI Performance Panel" subtitle="Score staff using attendance + KPI signals and publish recommendations.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">
        <Card>
          <CardHeader>
            <CardTitle><Sparkles className="h-4 w-4 inline mr-2" />Compute performance</CardTitle>
            <CardDescription>Pick a teammate and a window. The model blends attendance (40%), productivity (40%), and quality (20%).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger><SelectValue placeholder="Select staff member" /></SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      {s.full_name || s.email || s.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(periodDays)} onValueChange={(v) => setPeriodDays(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={compute} disabled={!selected || loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Compute
              </Button>
            </div>
          </CardContent>
        </Card>

        {score && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle>{selectedStaff?.full_name || "Staff member"}</CardTitle>
                  <CardDescription>{score.ai_summary}</CardDescription>
                </div>
                <Badge className={TIER_STYLE[score.tier]} variant="outline">
                  {score.tier === "top" && <Trophy className="h-3.5 w-3.5 mr-1" />}
                  {score.tier === "at_risk" && <AlertTriangle className="h-3.5 w-3.5 mr-1" />}
                  {score.tier.replace("_", " ").toUpperCase()} • {score.score}/100
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <ScoreBar label="Attendance" value={score.attendance_score} />
                <ScoreBar label="Productivity" value={score.productivity_score} />
                <ScoreBar label="Quality" value={score.quality_score} />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <Section title="Strengths" tone="emerald" items={score.strengths} empty="No standout strengths yet." />
                <Section title="Gaps" tone="amber" items={score.gaps} empty="No gaps detected." />
                <Section title="Recommendations" tone="sky" items={score.recommendations} empty="-" />
              </div>

              <div className="flex justify-end">
                <Button onClick={publish} disabled={publishing}>
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Publish to staff record
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <Progress value={value} />
    </div>
  );
}

function Section({ title, tone, items, empty }: { title: string; tone: string; items: string[]; empty: string }) {
  const toneClass: Record<string, string> = {
    emerald: "border-emerald-200 bg-emerald-50/50",
    amber: "border-amber-200 bg-amber-50/50",
    sky: "border-sky-200 bg-sky-50/50",
  };
  return (
    <div className={`border rounded-lg p-3 ${toneClass[tone]}`}>
      <div className="font-medium text-sm mb-2 flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5" /> {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{empty}</p>
      ) : (
        <ul className="text-sm space-y-1 list-disc pl-5">
          {items.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}
