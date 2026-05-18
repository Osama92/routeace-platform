import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Clock,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  Edit,
  Trash2,
  MapPin,
  DollarSign,
  Calendar,
  Building2,
} from "lucide-react";

const ZONES = [
  { value: "Southwest", label: "Lagos / Southwest", defaultDays: 2 },
  { value: "South East", label: "South East", defaultDays: 3 },
  { value: "South South", label: "South South", defaultDays: 3 },
  { value: "North", label: "North (General)", defaultDays: 5 },
];

const SLAManagement = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin, isOrgAdmin, can } = usePermissions();
  const { organizationId, tenantMode } = useAuth();
  const [activeTab, setActiveTab] = useState("policies");
  const [policyDialogOpen, setPolicyDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);

  // Defense-in-depth client-side tenant guard (RLS is the primary guard)
  const guardOrg = <T extends { organization_id?: string | null }>(rows: T[] | null | undefined) =>
    (rows || []).filter((r) => !r?.organization_id || r.organization_id === organizationId);

  // Fetch SLA Policies (tenant-scoped)
  const { data: policies = [], isLoading: policiesLoading } = useQuery({
    queryKey: ["sla-policies", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_policies")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("zone", { ascending: true });
      if (error) throw error;
      return guardOrg(data);
    },
  });

  // Fetch SLA Contracts (tenant-scoped)
  const { data: contracts = [], isLoading: contractsLoading } = useQuery({
    queryKey: ["sla-contracts", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_contracts")
        .select("*, customers(company_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return guardOrg(data);
    },
  });

  // Fetch SLA Breach Records (tenant-scoped)
  const { data: breaches = [], isLoading: breachesLoading } = useQuery({
    queryKey: ["sla-breaches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_breach_records")
        .select("*, dispatches(dispatch_number), customers(company_name)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return guardOrg(data);
    },
  });

  // Fetch SLA Settings (tenant-scoped)
  const { data: settings = [] } = useQuery({
    queryKey: ["sla-settings", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sla_settings")
        .select("*")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return guardOrg(data);
    },
  });

  // Live compliance: derived from completed dispatches with an SLA deadline
  const { data: dispatchCompliance } = useQuery({
    queryKey: ["sla-dispatch-compliance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select("id, status, sla_deadline, sla_status, actual_delivery, scheduled_delivery, organization_id")
        .eq("organization_id", organizationId!)
        .not("sla_deadline", "is", null)
        .in("status", ["delivered", "completed"])
        .limit(1000);
      if (error) throw error;
      const rows = guardOrg(data as any[]);
      const total = rows.length;
      const onTime = rows.filter((d: any) => {
        const deadline = d.sla_deadline ? new Date(d.sla_deadline).getTime() : null;
        const actual = d.actual_delivery ? new Date(d.actual_delivery).getTime() : null;
        if (!deadline || !actual) return d.sla_status === "on_track" || d.sla_status === "met";
        return actual <= deadline;
      }).length;
      return { total, onTime };
    },
  });

  // Create/Update Policy Mutation (organization_id auto-injected by trigger; also passed for clarity)
  const policyMutation = useMutation({
    mutationFn: async (policyData: any) => {
      const payload = { ...policyData, organization_id: organizationId };
      if (editingPolicy) {
        const { error } = await supabase
          .from("sla_policies")
          .update(payload)
          .eq("id", editingPolicy.id)
          .eq("organization_id", organizationId!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("sla_policies")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-policies", organizationId] });
      toast.success(editingPolicy ? "Policy updated successfully" : "Policy created successfully");
      setPolicyDialogOpen(false);
      setEditingPolicy(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save policy");
    },
  });

  // Approve Breach Mutation
  const approveBreach = useMutation({
    mutationFn: async ({ breachId, action }: { breachId: string; action: "approved" | "waived" }) => {
      const { error } = await supabase
        .from("sla_breach_records")
        .update({
          breach_status: action,
          approved_by: (await supabase.auth.getUser()).data.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", breachId)
        .eq("organization_id", organizationId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sla-breaches", organizationId] });
      toast.success("Breach status updated");
    },
  });

  const handlePolicySubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const policyData = {
      name: formData.get("name"),
      zone: formData.get("zone"),
      state: formData.get("state") || null,
      sla_duration_days: parseFloat(formData.get("sla_duration_days") as string),
      penalty_per_day: parseFloat(formData.get("penalty_per_day") as string) || 0,
      grace_period_hours: parseInt(formData.get("grace_period_hours") as string) || 0,
      max_penalty_cap: parseFloat(formData.get("max_penalty_cap") as string) || null,
      is_active: true,
    };
    policyMutation.mutate(policyData);
  };

  const getBreachStatusBadge = (status: string) => {
    const badges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      detected: { variant: "destructive", icon: AlertTriangle },
      pending_review: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      waived: { variant: "outline", icon: XCircle },
      invoiced: { variant: "default", icon: FileText },
    };
    const config = badges[status] || badges.detected;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  // KPI calculations - all from live, tenant-scoped data
  const activeBreachesCount = breaches.filter((b: any) => b.breach_status === "detected").length;
  const totalPenalties = breaches.reduce((sum: number, b: any) => sum + (Number(b.total_penalty) || 0), 0);
  const activePolicies = policies.filter((p: any) => p.is_active).length;
  const complianceRate = (() => {
    const total = dispatchCompliance?.total ?? 0;
    if (!total) return null; // no data yet
    return ((dispatchCompliance!.onTime / total) * 100).toFixed(1);
  })();

  const isLoading = policiesLoading || contractsLoading || breachesLoading;
  const hasNoActivity =
    !isLoading &&
    policies.length === 0 &&
    contracts.length === 0 &&
    breaches.length === 0 &&
    (dispatchCompliance?.total ?? 0) === 0;

  return (
    <DashboardLayout title="SLA Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold font-heading">SLA Management</h1>
            <p className="text-muted-foreground">
              Configure service level agreements, track breaches, and manage penalties
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tenantMode && <Badge variant="outline">{tenantMode}</Badge>}
            {organizationId && (
              <Badge variant="secondary" className="font-mono text-xs">
                Org: {organizationId.slice(0, 8)}…
              </Badge>
            )}
          </div>
        </div>

        {hasNoActivity && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-sm text-muted-foreground">
              No SLA activity recorded yet for this organization. Add a zone policy or
              client contract - breach metrics and compliance will populate automatically as dispatches complete.
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between min-w-0 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Active Policies</p>
                  <p className="text-2xl font-bold">{activePolicies}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between min-w-0 gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">Compliance Rate</p>
                  <p className="text-2xl font-bold">
                    {complianceRate === null ? "-" : `${complianceRate}%`}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {dispatchCompliance?.total
                      ? `${dispatchCompliance.onTime}/${dispatchCompliance.total} on-time`
                      : "No completed dispatches yet"}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Breaches</p>
                  <p className="text-2xl font-bold">{breaches.filter((b: any) => b.breach_status === "detected").length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Penalties</p>
                  <p className="text-2xl font-bold">₦{totalPenalties.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="policies">Zone Policies</TabsTrigger>
            <TabsTrigger value="contracts">Client Contracts</TabsTrigger>
            <TabsTrigger value="breaches">Breach Records</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Zone Policies Tab */}
          <TabsContent value="policies" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Zone-Based SLA Policies</CardTitle>
                  <CardDescription>
                    Default SLA durations and penalties by delivery zone
                  </CardDescription>
                </div>
                {(isSuperAdmin || isOrgAdmin) && (
                  <Dialog open={policyDialogOpen} onOpenChange={setPolicyDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => setEditingPolicy(null)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Policy
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingPolicy ? "Edit Policy" : "Create SLA Policy"}</DialogTitle>
                        <DialogDescription>
                          Configure SLA duration and penalty rates for a delivery zone
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handlePolicySubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Policy Name</Label>
                          <Input 
                            id="name" 
                            name="name" 
                            defaultValue={editingPolicy?.name || ""} 
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zone">Zone</Label>
                          <Select name="zone" defaultValue={editingPolicy?.zone || ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select zone" />
                            </SelectTrigger>
                            <SelectContent>
                              {ZONES.map((zone) => (
                                <SelectItem key={zone.value} value={zone.value}>
                                  {zone.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="state">State (Optional Override)</Label>
                          <Input 
                            id="state" 
                            name="state" 
                            defaultValue={editingPolicy?.state || ""} 
                            placeholder="e.g., Kano, Lagos"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="sla_duration_days">SLA Duration (Days)</Label>
                            <Input 
                              id="sla_duration_days" 
                              name="sla_duration_days" 
                              type="number" 
                              step="0.5"
                              defaultValue={editingPolicy?.sla_duration_days || 2} 
                              required 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="grace_period_hours">Grace Period (Hours)</Label>
                            <Input 
                              id="grace_period_hours" 
                              name="grace_period_hours" 
                              type="number" 
                              defaultValue={editingPolicy?.grace_period_hours || 0} 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="penalty_per_day">Penalty/Day (₦)</Label>
                            <Input 
                              id="penalty_per_day" 
                              name="penalty_per_day" 
                              type="number" 
                              defaultValue={editingPolicy?.penalty_per_day || 50000} 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="max_penalty_cap">Max Penalty Cap (₦)</Label>
                            <Input 
                              id="max_penalty_cap" 
                              name="max_penalty_cap" 
                              type="number" 
                              defaultValue={editingPolicy?.max_penalty_cap || ""} 
                              placeholder="No limit"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={policyMutation.isPending}>
                            {policyMutation.isPending ? "Saving..." : "Save Policy"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Zone</TableHead>
                      <TableHead>Policy Name</TableHead>
                      <TableHead>SLA Duration</TableHead>
                      <TableHead>Grace Period</TableHead>
                      <TableHead>Penalty/Day</TableHead>
                      <TableHead>Max Cap</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((policy: any) => (
                      <TableRow key={policy.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {policy.zone}
                            {policy.state && <span className="text-xs text-muted-foreground">({policy.state})</span>}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{policy.name}</TableCell>
                        <TableCell>{policy.sla_duration_days} days</TableCell>
                        <TableCell>{policy.grace_period_hours}h</TableCell>
                        <TableCell>₦{policy.penalty_per_day?.toLocaleString()}</TableCell>
                        <TableCell>
                          {policy.max_penalty_cap ? `₦${policy.max_penalty_cap.toLocaleString()}` : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={policy.is_active ? "default" : "secondary"}>
                            {policy.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {policy.is_default && (
                            <Badge variant="outline" className="ml-1">Default</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {(isSuperAdmin || isOrgAdmin) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingPolicy(policy);
                                setPolicyDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {policies.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No SLA policies configured. Add zone-based policies to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Client Contracts Tab */}
          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Client SLA Contracts</CardTitle>
                  <CardDescription>
                    Custom SLA terms per client with contract-based penalties
                  </CardDescription>
                </div>
                {(isSuperAdmin || isOrgAdmin) && (
                  <Button onClick={() => setContractDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Contract
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contract #</TableHead>
                      <TableHead>SLA Duration</TableHead>
                      <TableHead>Penalty/Day</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contract</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contracts.map((contract: any) => (
                      <TableRow key={contract.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            {contract.customers?.company_name || "-"}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{contract.contract_number}</TableCell>
                        <TableCell>{contract.sla_duration_days} days</TableCell>
                        <TableCell>₦{contract.penalty_per_day?.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3" />
                            {new Date(contract.effective_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                            {contract.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {contract.contract_pdf_url ? (
                            <Button variant="outline" size="sm" asChild>
                              <a href={contract.contract_pdf_url} target="_blank" rel="noopener noreferrer">
                                <FileText className="w-4 h-4" />
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">No file</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {contracts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No client contracts configured. Create contracts to define custom SLA terms.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Breach Records Tab */}
          <TabsContent value="breaches" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SLA Breach Records</CardTitle>
                <CardDescription>
                  Track and manage SLA violations with approval workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dispatch</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Days Breached</TableHead>
                      <TableHead>Penalty</TableHead>
                      <TableHead>Insurance Coverage</TableHead>
                      <TableHead>Net Penalty</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {breaches.map((breach: any) => (
                      <TableRow key={breach.id}>
                        <TableCell className="font-mono text-sm">
                          {breach.dispatches?.dispatch_number || "-"}
                        </TableCell>
                        <TableCell>{breach.customers?.company_name || "-"}</TableCell>
                        <TableCell>
                          <span className="text-red-500 font-medium">
                            {breach.days_breached?.toFixed(1)} days
                          </span>
                        </TableCell>
                        <TableCell>₦{breach.total_penalty?.toLocaleString()}</TableCell>
                        <TableCell>
                          {breach.insurance_coverage_applied > 0 ? (
                            <span className="text-green-500">
                              -₦{breach.insurance_coverage_applied?.toLocaleString()}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          ₦{breach.net_penalty_after_insurance?.toLocaleString()}
                        </TableCell>
                        <TableCell>{getBreachStatusBadge(breach.breach_status)}</TableCell>
                        <TableCell className="text-right">
                          {breach.breach_status === "detected" && (isSuperAdmin || isOrgAdmin) && (
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveBreach.mutate({ breachId: breach.id, action: "approved" })}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => approveBreach.mutate({ breachId: breach.id, action: "waived" })}
                              >
                                Waive
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {breaches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                          No SLA breaches recorded. This is good news!
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>SLA System Settings</CardTitle>
                <CardDescription>
                  Configure global SLA behavior and notification settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Auto-Notify Clients on SLA Risk</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically send notifications when routes are at risk of SLA breach
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Risk Notification Threshold</p>
                    <p className="text-sm text-muted-foreground">
                      Send notifications when SLA risk exceeds this percentage
                    </p>
                  </div>
                  <Select defaultValue="60">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="50">50%</SelectItem>
                      <SelectItem value="60">60%</SelectItem>
                      <SelectItem value="70">70%</SelectItem>
                      <SelectItem value="80">80%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Enable SLA Insurance</p>
                    <p className="text-sm text-muted-foreground">
                      Allow clients to purchase SLA breach insurance coverage
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">Default Grace Period</p>
                    <p className="text-sm text-muted-foreground">
                      Hours before penalties apply after SLA deadline
                    </p>
                  </div>
                  <Select defaultValue="6">
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 hours</SelectItem>
                      <SelectItem value="6">6 hours</SelectItem>
                      <SelectItem value="12">12 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SLAManagement;
