/**
 * DeptPlanningKPIs.tsx - DPO Planning Pillar features
 * Covers: S&OP Meeting Tracker, Inventory DOI Policy, Risk Register,
 * Peak Period Planner. Used by Logistics Manager (canLog=true) and
 * Head of Logistics (canLog=false).
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Calendar, Package, Shield, Plus, AlertTriangle, Activity } from "lucide-react";

interface Props { orgId: string; canLog: boolean; }

const RISK_CAT: Record<string, string> = {
  natural_disaster: "Natural disaster",
  health_safety: "Health & safety",
  security: "Security",
  regulatory: "Regulatory",
  political: "Political",
  labor: "Labor",
  supplier: "Supplier",
  technology: "Technology",
  financial: "Financial",
  other: "Other",
};

export default function DeptPlanningKPIs({ orgId, canLog }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: meetings = [] } = useQuery({
    queryKey: ["ld-sop", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ld_sop_meetings")
        .select("*").eq("organization_id", orgId).order("meeting_date", { ascending: false }).limit(30);
      return (data ?? []) as any[];
    },
  });

  const { data: doiItems = [] } = useQuery({
    queryKey: ["dept-doi", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("dept_inventory_doi")
        .select("*").eq("organization_id", orgId).order("doi_status", { ascending: true });
      return (data ?? []) as any[];
    },
  });

  const { data: risks = [] } = useQuery({
    queryKey: ["ld-risks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ld_risk_register")
        .select("*").eq("organization_id", orgId).order("risk_score", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: peaks = [] } = useQuery({
    queryKey: ["ld-peaks", orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await (supabase as any).from("ld_peak_periods")
        .select("*").eq("organization_id", orgId).order("start_date", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  // ─── Forms ──────────────────────────────────────────────────────
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetForm, setMeetForm] = useState({
    meeting_date: new Date().toISOString().slice(0, 10),
    meeting_type: "weekly_review",
    attendees_text: "", kpis_text: "", red_kpis_text: "", notes: "", next_meeting_date: "",
  });
  const logMeeting = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Auth required");
      const { error } = await (supabase as any).from("ld_sop_meetings").insert({
        organization_id: orgId,
        meeting_date: meetForm.meeting_date,
        meeting_type: meetForm.meeting_type,
        attendees: meetForm.attendees_text.split(",").map((s) => s.trim()).filter(Boolean),
        kpis_reviewed: meetForm.kpis_text.split(",").map((s) => s.trim()).filter(Boolean),
        red_kpis: meetForm.red_kpis_text.split(",").map((s) => s.trim()).filter(Boolean),
        notes: meetForm.notes || null,
        next_meeting_date: meetForm.next_meeting_date || null,
        logged_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Meeting logged"); setMeetOpen(false); qc.invalidateQueries({ queryKey: ["ld-sop", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [riskOpen, setRiskOpen] = useState(false);
  const [riskForm, setRiskForm] = useState({ risk_title: "", risk_category: "supplier", risk_description: "", likelihood: "3", impact: "3", mitigation_plan: "", owner: "" });
  const logRisk = useMutation({
    mutationFn: async () => {
      if (!user || !riskForm.risk_title) throw new Error("Title required");
      const { error } = await (supabase as any).from("ld_risk_register").insert({
        organization_id: orgId,
        risk_title: riskForm.risk_title,
        risk_category: riskForm.risk_category,
        risk_description: riskForm.risk_description || null,
        likelihood: parseInt(riskForm.likelihood),
        impact: parseInt(riskForm.impact),
        mitigation_plan: riskForm.mitigation_plan || null,
        owner: riskForm.owner || null,
        logged_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Risk logged"); setRiskOpen(false); qc.invalidateQueries({ queryKey: ["ld-risks", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [peakOpen, setPeakOpen] = useState(false);
  const [peakForm, setPeakForm] = useState({ period_name: "", start_date: "", end_date: "", expected_volume_multiplier: "1.3", capacity_plan: "" });
  const logPeak = useMutation({
    mutationFn: async () => {
      if (!user || !peakForm.period_name || !peakForm.start_date || !peakForm.end_date) throw new Error("Fill required fields");
      const { error } = await (supabase as any).from("ld_peak_periods").insert({
        organization_id: orgId,
        period_name: peakForm.period_name,
        start_date: peakForm.start_date,
        end_date: peakForm.end_date,
        expected_volume_multiplier: Number(peakForm.expected_volume_multiplier) || 1.3,
        capacity_plan: peakForm.capacity_plan || null,
        logged_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Peak period saved"); setPeakOpen(false); qc.invalidateQueries({ queryKey: ["ld-peaks", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [doiOpen, setDoiOpen] = useState(false);
  const [doiForm, setDoiForm] = useState({ sku_code: "", sku_name: "", current_stock: "", avg_daily_usage: "", doi_minimum: "3", doi_maximum: "30" });
  const upsertDoi = useMutation({
    mutationFn: async () => {
      if (!doiForm.sku_code) throw new Error("SKU required");
      const { error } = await (supabase as any).from("dept_inventory_doi").upsert({
        organization_id: orgId,
        sku_code: doiForm.sku_code,
        sku_name: doiForm.sku_name || null,
        current_stock: Number(doiForm.current_stock) || 0,
        avg_daily_usage: Number(doiForm.avg_daily_usage) || 1,
        doi_minimum: Number(doiForm.doi_minimum) || 3,
        doi_maximum: Number(doiForm.doi_maximum) || 30,
        source_system: "manual",
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "organization_id,sku_code" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("DOI saved"); setDoiOpen(false); qc.invalidateQueries({ queryKey: ["dept-doi", orgId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const doiOutOfRange = doiItems.filter((d: any) => d.doi_status !== "in_range").length;

  return (
    <Tabs defaultValue="sop" className="w-full">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="sop"><Calendar className="w-3.5 h-3.5 mr-1" />S&OP Meetings</TabsTrigger>
        <TabsTrigger value="doi"><Package className="w-3.5 h-3.5 mr-1" />Inventory DOI</TabsTrigger>
        <TabsTrigger value="risks"><Shield className="w-3.5 h-3.5 mr-1" />Risk Register</TabsTrigger>
        <TabsTrigger value="peak"><Activity className="w-3.5 h-3.5 mr-1" />Peak Periods</TabsTrigger>
      </TabsList>

      {/* S&OP MEETINGS */}
      <TabsContent value="sop" className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">S&OP Meeting Tracker</h3>
            <p className="text-xs text-muted-foreground">Mandatory weekly review of KPIs with Sales and Operations (Planning Pillar §3.1)</p>
          </div>
          {canLog && (
            <Dialog open={meetOpen} onOpenChange={setMeetOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Log meeting</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log S&OP meeting</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Date</Label><Input type="date" value={meetForm.meeting_date} onChange={(e) => setMeetForm((f) => ({ ...f, meeting_date: e.target.value }))} /></div>
                    <div>
                      <Label>Type</Label>
                      <Select value={meetForm.meeting_type} onValueChange={(v) => setMeetForm((f) => ({ ...f, meeting_type: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="weekly_review">Weekly review</SelectItem>
                          <SelectItem value="monthly_ops">Monthly ops</SelectItem>
                          <SelectItem value="peak_planning">Peak planning</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                          <SelectItem value="s_and_op">S&OP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Attendees (comma-separated)</Label><Input value={meetForm.attendees_text} onChange={(e) => setMeetForm((f) => ({ ...f, attendees_text: e.target.value }))} /></div>
                  <div><Label>KPIs reviewed (comma-separated)</Label><Input value={meetForm.kpis_text} onChange={(e) => setMeetForm((f) => ({ ...f, kpis_text: e.target.value }))} /></div>
                  <div><Label>RED KPIs needing action</Label><Input value={meetForm.red_kpis_text} onChange={(e) => setMeetForm((f) => ({ ...f, red_kpis_text: e.target.value }))} /></div>
                  <div><Label>Notes</Label><Textarea value={meetForm.notes} onChange={(e) => setMeetForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                  <div><Label>Next meeting</Label><Input type="date" value={meetForm.next_meeting_date} onChange={(e) => setMeetForm((f) => ({ ...f, next_meeting_date: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => logMeeting.mutate()} disabled={logMeeting.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Card><CardContent className="pt-3">
          {meetings.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No meetings logged yet.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Attendees</TableHead><TableHead>RED KPIs</TableHead><TableHead>Next</TableHead></TableRow></TableHeader>
              <TableBody>
                {meetings.slice(0, 15).map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs">{m.meeting_date}</TableCell>
                    <TableCell className="text-xs">{m.meeting_type}</TableCell>
                    <TableCell className="text-xs">{(m.attendees ?? []).slice(0, 2).join(", ")}{(m.attendees ?? []).length > 2 ? ` +${m.attendees.length - 2}` : ""}</TableCell>
                    <TableCell className="text-xs">{(m.red_kpis ?? []).length > 0 ? <Badge className="text-[9px] bg-amber-500">{(m.red_kpis ?? []).length} red</Badge> : <span className="text-emerald-600 text-xs">All green ✓</span>}</TableCell>
                    <TableCell className="text-xs">{m.next_meeting_date ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </TabsContent>

      {/* INVENTORY DOI */}
      <TabsContent value="doi" className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Inventory Days-of-Inventory Policy</h3>
            <p className="text-xs text-muted-foreground">{doiOutOfRange > 0 ? <span className="text-amber-600">{doiOutOfRange} SKUs out of range</span> : "All SKUs within DOI policy"}</p>
          </div>
          {canLog && (
            <Dialog open={doiOpen} onOpenChange={setDoiOpen}>
              <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" />Add SKU manually</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add / update SKU DOI</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>SKU code</Label><Input value={doiForm.sku_code} onChange={(e) => setDoiForm((f) => ({ ...f, sku_code: e.target.value }))} /></div>
                    <div><Label>Name</Label><Input value={doiForm.sku_name} onChange={(e) => setDoiForm((f) => ({ ...f, sku_name: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Current stock</Label><Input type="number" value={doiForm.current_stock} onChange={(e) => setDoiForm((f) => ({ ...f, current_stock: e.target.value }))} /></div>
                    <div><Label>Avg daily usage</Label><Input type="number" value={doiForm.avg_daily_usage} onChange={(e) => setDoiForm((f) => ({ ...f, avg_daily_usage: e.target.value }))} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>DOI min</Label><Input type="number" value={doiForm.doi_minimum} onChange={(e) => setDoiForm((f) => ({ ...f, doi_minimum: e.target.value }))} /></div>
                    <div><Label>DOI max</Label><Input type="number" value={doiForm.doi_maximum} onChange={(e) => setDoiForm((f) => ({ ...f, doi_maximum: e.target.value }))} /></div>
                  </div>
                </div>
                <DialogFooter><Button onClick={() => upsertDoi.mutate()} disabled={upsertDoi.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Card><CardContent className="pt-3">
          {doiItems.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No DOI data. Connect a WMS via ERP Integrations or add SKUs manually.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>SKU</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Daily use</TableHead><TableHead className="text-right">DOI</TableHead><TableHead>Range</TableHead><TableHead>Status</TableHead><TableHead>Source</TableHead></TableRow></TableHeader>
              <TableBody>
                {doiItems.slice(0, 30).map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-xs">{d.sku_code}{d.sku_name && <div className="text-[10px] text-muted-foreground">{d.sku_name}</div>}</TableCell>
                    <TableCell className="text-xs text-right">{Number(d.current_stock).toFixed(0)}</TableCell>
                    <TableCell className="text-xs text-right">{Number(d.avg_daily_usage).toFixed(1)}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{d.doi_current ?? "-"}</TableCell>
                    <TableCell className="text-xs">{d.doi_minimum}–{d.doi_maximum}</TableCell>
                    <TableCell><Badge className={`text-[9px] ${d.doi_status === "in_range" ? "" : "bg-amber-500"}`} variant={d.doi_status === "in_range" ? "default" : "secondary"}>{d.doi_status}</Badge></TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{d.source_system}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </TabsContent>

      {/* RISK REGISTER */}
      <TabsContent value="risks" className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Risk Register (Probability × Impact)</h3>
          {canLog && (
            <Dialog open={riskOpen} onOpenChange={setRiskOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Add risk</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Log a risk</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Title</Label><Input value={riskForm.risk_title} onChange={(e) => setRiskForm((f) => ({ ...f, risk_title: e.target.value }))} /></div>
                  <div>
                    <Label>Category</Label>
                    <Select value={riskForm.risk_category} onValueChange={(v) => setRiskForm((f) => ({ ...f, risk_category: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(RISK_CAT).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Description</Label><Textarea value={riskForm.risk_description} onChange={(e) => setRiskForm((f) => ({ ...f, risk_description: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Likelihood (1-5)</Label>
                      <Select value={riskForm.likelihood} onValueChange={(v) => setRiskForm((f) => ({ ...f, likelihood: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Impact (1-5)</Label>
                      <Select value={riskForm.impact} onValueChange={(v) => setRiskForm((f) => ({ ...f, impact: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-xs">Risk score: <strong>{parseInt(riskForm.likelihood) * parseInt(riskForm.impact)} / 25</strong>{parseInt(riskForm.likelihood) * parseInt(riskForm.impact) >= 15 && <span className="text-red-600"> - CRITICAL</span>}</p>
                  <div><Label>Mitigation plan</Label><Textarea value={riskForm.mitigation_plan} onChange={(e) => setRiskForm((f) => ({ ...f, mitigation_plan: e.target.value }))} /></div>
                  <div><Label>Owner</Label><Input value={riskForm.owner} onChange={(e) => setRiskForm((f) => ({ ...f, owner: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => logRisk.mutate()} disabled={logRisk.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Card><CardContent className="pt-3">
          {risks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No risks logged.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead className="text-right">L</TableHead><TableHead className="text-right">I</TableHead><TableHead className="text-right">Score</TableHead><TableHead>Level</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {risks.slice(0, 30).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.risk_title}</TableCell>
                    <TableCell className="text-xs">{RISK_CAT[r.risk_category] ?? r.risk_category}</TableCell>
                    <TableCell className="text-xs text-right">{r.likelihood}</TableCell>
                    <TableCell className="text-xs text-right">{r.impact}</TableCell>
                    <TableCell className="text-xs text-right font-semibold">{r.risk_score}</TableCell>
                    <TableCell><Badge variant={r.risk_level === "critical" || r.risk_level === "high" ? "destructive" : "secondary"} className="text-[9px]">{r.risk_level}</Badge></TableCell>
                    <TableCell className="text-xs">{r.status}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </TabsContent>

      {/* PEAK PERIODS */}
      <TabsContent value="peak" className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Peak Period Planner</h3>
          {canLog && (
            <Dialog open={peakOpen} onOpenChange={setPeakOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-3.5 h-3.5 mr-1" />Add peak period</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Plan a peak period</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Name</Label><Input placeholder="e.g. Christmas 2026" value={peakForm.period_name} onChange={(e) => setPeakForm((f) => ({ ...f, period_name: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>Start</Label><Input type="date" value={peakForm.start_date} onChange={(e) => setPeakForm((f) => ({ ...f, start_date: e.target.value }))} /></div>
                    <div><Label>End</Label><Input type="date" value={peakForm.end_date} onChange={(e) => setPeakForm((f) => ({ ...f, end_date: e.target.value }))} /></div>
                  </div>
                  <div><Label>Volume multiplier (e.g. 1.3 = +30%)</Label><Input type="number" step="0.1" value={peakForm.expected_volume_multiplier} onChange={(e) => setPeakForm((f) => ({ ...f, expected_volume_multiplier: e.target.value }))} /></div>
                  <div><Label>Capacity plan</Label><Textarea value={peakForm.capacity_plan} onChange={(e) => setPeakForm((f) => ({ ...f, capacity_plan: e.target.value }))} /></div>
                </div>
                <DialogFooter><Button onClick={() => logPeak.mutate()} disabled={logPeak.isPending}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        <Card><CardContent className="pt-3">
          {peaks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No peak periods planned.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead className="text-right">Multiplier</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {peaks.slice(0, 20).map((p: any) => {
                  const isActive = new Date(p.start_date) <= new Date() && new Date(p.end_date) >= new Date();
                  return (
                    <TableRow key={p.id} className={isActive ? "bg-primary/5" : ""}>
                      <TableCell className="text-xs">{p.period_name}{isActive && <Badge className="ml-2 text-[9px]"><AlertTriangle className="w-2.5 h-2.5 mr-1" />Active</Badge>}</TableCell>
                      <TableCell className="text-xs">{p.start_date}</TableCell>
                      <TableCell className="text-xs">{p.end_date}</TableCell>
                      <TableCell className="text-xs text-right">×{Number(p.expected_volume_multiplier).toFixed(1)}</TableCell>
                      <TableCell className="text-xs">{p.status}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent></Card>
      </TabsContent>
    </Tabs>
  );
}
