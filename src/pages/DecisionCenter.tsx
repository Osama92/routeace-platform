import React, { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain, Shield, Zap, CheckCircle, XCircle, Clock, AlertTriangle, Activity,
  TrendingUp, DollarSign, Truck, Users, Plus, Play
} from "lucide-react";
import {
  useAutonomousRules, useToggleRule, useCreateRule,
  useAutonomousDecisions, useApproveDecision, useRejectDecision, useExecuteDecision,
  useDecisionKPIs,
} from "@/hooks/useDecisionEngine";
import { format } from "date-fns";

const moduleIcons: Record<string, React.ReactNode> = {
  pricing: <DollarSign className="h-4 w-4" />,
  dispatch: <Truck className="h-4 w-4" />,
  finance: <TrendingUp className="h-4 w-4" />,
  fleet: <Truck className="h-4 w-4" />,
  sales: <Users className="h-4 w-4" />,
  risk: <AlertTriangle className="h-4 w-4" />,
};

const severityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-amber-100 text-amber-800",
  critical: "bg-destructive/10 text-destructive",
};

const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" /> },
  approved: { color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-3 w-3" /> },
  executed: { color: "bg-chart-2/10 text-chart-2", icon: <Zap className="h-3 w-3" /> },
  rejected: { color: "bg-destructive/10 text-destructive", icon: <XCircle className="h-3 w-3" /> },
  expired: { color: "bg-muted text-muted-foreground", icon: <Clock className="h-3 w-3" /> },
};

function CreateRuleDialog() {
  const [open, setOpen] = useState(false);
  const createRule = useCreateRule();
  const [form, setForm] = useState({
    name: "", description: "", module_key: "pricing", trigger_type: "margin_below",
    action_type: "alert", severity: "medium", requires_approval: true, approval_level: "manager",
  });

  const handleSubmit = () => {
    createRule.mutate({
      ...form,
      condition: {},
      action_config: {},
      is_active: true,
    } as any, {
      onSuccess: () => setOpen(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Rule</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Autonomous Rule</DialogTitle>
          <DialogDescription>Define when the system should trigger an automated decision.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Rule Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Block low-margin dispatch" />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this rule does..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Module</Label>
              <Select value={form.module_key} onValueChange={(v) => setForm({ ...form, module_key: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pricing">Pricing</SelectItem>
                  <SelectItem value="dispatch">Dispatch</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Severity</Label>
              <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Trigger Type</Label>
              <Select value={form.trigger_type} onValueChange={(v) => setForm({ ...form, trigger_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="margin_below">Margin Below Threshold</SelectItem>
                  <SelectItem value="cash_threshold">Cash Below Threshold</SelectItem>
                  <SelectItem value="invoice_overdue">Invoice Overdue</SelectItem>
                  <SelectItem value="fleet_idle">Fleet Idle</SelectItem>
                  <SelectItem value="sla_risk">SLA Risk</SelectItem>
                  <SelectItem value="churn_detected">Churn Detected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Action Type</Label>
              <Select value={form.action_type} onValueChange={(v) => setForm({ ...form, action_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alert">Alert Only</SelectItem>
                  <SelectItem value="block_dispatch">Block Dispatch</SelectItem>
                  <SelectItem value="adjust_price">Adjust Price</SelectItem>
                  <SelectItem value="flag_client">Flag Client</SelectItem>
                  <SelectItem value="reassign">Reassign Resource</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Approval Level</Label>
              <Select value={form.approval_level} onValueChange={(v) => setForm({ ...form, approval_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-execute</SelectItem>
                  <SelectItem value="manager">Manager Approval</SelectItem>
                  <SelectItem value="super_admin">Super Admin Approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch checked={form.requires_approval} onCheckedChange={(v) => setForm({ ...form, requires_approval: v })} />
              <Label>Requires Approval</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!form.name || createRule.isPending}>Create Rule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function DecisionCenter() {
  const { data: rules, isLoading: rulesLoading } = useAutonomousRules();
  const { data: decisions, isLoading: decisionsLoading } = useAutonomousDecisions();
  const toggleRule = useToggleRule();
  const approveDecision = useApproveDecision();
  const rejectDecision = useRejectDecision();
  const executeDecision = useExecuteDecision();
  const kpis = useDecisionKPIs();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const pendingDecisions = decisions?.filter((d) => d.status === "pending") || [];
  const approvedDecisions = decisions?.filter((d) => d.status === "approved") || [];

  return (
    <DashboardLayout title="Autonomous Decision Center" subtitle="Rule-driven and AI-assisted decision engine with full audit trail">
      <div className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Active Rules</p>
            <p className="text-2xl font-bold">{kpis.activeRules}/{kpis.totalRules}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Pending</p>
            <p className="text-2xl font-bold text-amber-600">{kpis.pending}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Approved</p>
            <p className="text-2xl font-bold text-blue-600">{kpis.approved}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" /> Executed</p>
            <p className="text-2xl font-bold text-chart-2">{kpis.executed}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1"><XCircle className="h-3 w-3" /> Rejected</p>
            <p className="text-2xl font-bold text-destructive">{kpis.rejected}</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="queue">
          <TabsList>
            <TabsTrigger value="queue">Decision Queue ({pendingDecisions.length})</TabsTrigger>
            <TabsTrigger value="ready">Ready to Execute ({approvedDecisions.length})</TabsTrigger>
            <TabsTrigger value="rules">Rules Engine</TabsTrigger>
            <TabsTrigger value="history">Decision History</TabsTrigger>
          </TabsList>

          {/* Pending Decisions Queue */}
          <TabsContent value="queue">
            {!pendingDecisions.length ? (
              <Card><CardContent className="py-12 text-center">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium">No pending decisions</p>
                <p className="text-sm text-muted-foreground mt-1">The system will create decisions when trigger conditions are met.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {pendingDecisions.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {moduleIcons[d.decision_type] || <Activity className="h-4 w-4" />}
                            <span className="font-medium text-sm capitalize">{d.decision_type}</span>
                            <Badge className={severityColors[d.trigger_data?.severity || "medium"] + " text-xs border-0"}>
                              {d.trigger_data?.severity || "medium"}
                            </Badge>
                            {d.confidence_score && (
                              <Badge variant="outline" className="text-xs">{Math.round(d.confidence_score)}% confidence</Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground">{d.impact_summary || d.trigger_source}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(d.created_at), "MMM d, yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => setRejectId(d.id)}>
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                          <Button size="sm" onClick={() => approveDecision.mutate(d.id)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Ready to Execute */}
          <TabsContent value="ready">
            {!approvedDecisions.length ? (
              <Card><CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium">No approved decisions awaiting execution</p>
                <p className="text-sm text-muted-foreground mt-1">Approve pending decisions to see them here.</p>
              </CardContent></Card>
            ) : (
              <div className="space-y-3">
                {approvedDecisions.map((d) => (
                  <Card key={d.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {moduleIcons[d.decision_type]}
                          <span className="font-medium text-sm capitalize">{d.decision_type}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{d.impact_summary}</p>
                      </div>
                      <Button size="sm" onClick={() => executeDecision.mutate(d.id)}>
                        <Play className="h-3 w-3 mr-1" /> Execute
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Rules Engine */}
          <TabsContent value="rules" className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {rules?.length || 0} rules configured · {kpis.activeRules} active
              </p>
              <CreateRuleDialog />
            </div>
            {rulesLoading ? (
              <p className="text-sm text-muted-foreground">Loading rules…</p>
            ) : !rules?.length ? (
              <Card><CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium">No rules configured</p>
                <p className="text-sm text-muted-foreground mt-1">Create rules to enable autonomous decision-making.</p>
              </CardContent></Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead>Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{r.name}</p>
                        {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {moduleIcons[r.module_key]}
                          <span className="text-xs capitalize">{r.module_key}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.trigger_type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.action_type.replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell><Badge className={severityColors[r.severity] + " text-xs border-0"}>{r.severity}</Badge></TableCell>
                      <TableCell className="text-xs capitalize">{r.requires_approval ? r.approval_level.replace(/_/g, " ") : "Auto"}</TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={(v) => toggleRule.mutate({ id: r.id, is_active: v })} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          {/* Decision History */}
          <TabsContent value="history">
            {decisionsLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : !decisions?.length ? (
              <Card><CardContent className="py-12 text-center">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="font-medium">No decision history</p>
                <p className="text-sm text-muted-foreground mt-1">Decisions will appear here as the system operates.</p>
              </CardContent></Card>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Impact</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decisions.map((d) => {
                    const sc = statusConfig[d.status] || statusConfig.pending;
                    return (
                      <TableRow key={d.id}>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {moduleIcons[d.decision_type]}
                            <span className="text-sm capitalize">{d.decision_type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{d.trigger_source}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{d.impact_summary || "-"}</TableCell>
                        <TableCell>{d.confidence_score ? `${Math.round(d.confidence_score)}%` : "-"}</TableCell>
                        <TableCell>
                          <Badge className={sc.color + " text-xs border-0 gap-1"}>
                            {sc.icon} {d.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(d.created_at), "MMM d, HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject Dialog */}
      <Dialog open={!!rejectId} onOpenChange={() => { setRejectId(null); setRejectReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Decision</DialogTitle>
            <DialogDescription>Provide a reason for rejection (required for audit).</DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason for rejection..." />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Cancel</Button>
            <Button variant="destructive" disabled={!rejectReason}
              onClick={() => { rejectDecision.mutate({ id: rejectId!, reason: rejectReason }); setRejectId(null); setRejectReason(""); }}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
