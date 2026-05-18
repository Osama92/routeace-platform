import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Building2, Users, DollarSign, TrendingUp, Plus, Truck, Bike, Package, RefreshCw,
  Shield, AlertTriangle, Code2, Zap, Eye, Lock, Clock, FileText, CreditCard, Activity, ShieldAlert
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useResellerGuard } from "@/hooks/useResellerGuard";

const OP_TYPES = [
  { value: "haulage", label: "Haulage", icon: Truck, color: "text-amber-600" },
  { value: "bikes", label: "Bikes / Riders", icon: Bike, color: "text-green-600" },
  { value: "multidrop", label: "Multidrop", icon: Package, color: "text-blue-600" },
  { value: "hybrid", label: "Hybrid", icon: RefreshCw, color: "text-purple-600" },
];

const PLAN_TIERS = ["free", "starter", "growth", "enterprise"];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    trial: "bg-amber-100 text-amber-800",
    active: "bg-emerald-100 text-emerald-800",
    churned: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-800",
    draft: "bg-gray-100 text-gray-700",
    issued: "bg-blue-100 text-blue-800",
    paid: "bg-emerald-100 text-emerald-800",
    failed: "bg-red-100 text-red-800",
    overdue: "bg-orange-100 text-orange-800",
    pending: "bg-amber-100 text-amber-800",
    processing: "bg-blue-100 text-blue-800",
    held: "bg-gray-100 text-gray-700",
    approved: "bg-emerald-100 text-emerald-800",
    expired: "bg-gray-100 text-gray-600",
    revoked: "bg-red-100 text-red-800",
    low: "bg-yellow-100 text-yellow-800",
    medium: "bg-orange-100 text-orange-800",
    high: "bg-red-100 text-red-800",
    critical: "bg-red-200 text-red-900",
  };
  return <Badge className={map[status] || "bg-muted"}>{status}</Badge>;
}

function severityBadge(severity: string) {
  const map: Record<string, string> = {
    low: "border-yellow-300 text-yellow-700",
    medium: "border-orange-300 text-orange-700",
    high: "border-red-300 text-red-700",
    critical: "border-red-500 text-red-900 bg-red-50",
  };
  return <Badge variant="outline" className={map[severity] || ""}>{severity}</Badge>;
}

export default function PartnerConsole() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const resellerGuard = useResellerGuard();
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ customer_id: "", reason: "", scope: "dashboard,fleet", duration_hours: "24" });
  const [form, setForm] = useState({
    company_name: "", operating_type: "haulage", plan_tier: "starter",
    billing_ownership: "platform_collected", contact_name: "", contact_email: "", country: "NG",
  });

  // Fetch partner account
  const { data: partner, isLoading: partnerLoading } = useQuery({
    queryKey: ["partner-account", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("partner_accounts" as any).select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!user,
  });

  // Fetch downstream customers
  const { data: customers = [] } = useQuery({
    queryKey: ["partner-customers", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("partner_customers" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Fetch commissions
  const { data: commissions = [] } = useQuery({
    queryKey: ["partner-commissions", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("partner_commissions" as any).select("*").eq("partner_id", partner.id).order("period_end", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Fetch partner invoices
  const { data: invoices = [] } = useQuery({
    queryKey: ["partner-invoices", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("partner_invoices" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Fetch payouts
  const { data: payouts = [] } = useQuery({
    queryKey: ["partner-payouts", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("partner_payouts" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Fetch API products
  const { data: apiProducts = [] } = useQuery({
    queryKey: ["api-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("api_products" as any).select("*").eq("is_active", true).order("product_name");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Fetch delegated access sessions
  const { data: supportSessions = [] } = useQuery({
    queryKey: ["delegated-sessions", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("delegated_access_sessions" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Fetch risk events
  const { data: riskEvents = [] } = useQuery({
    queryKey: ["partner-risk-events", partner?.id],
    queryFn: async () => {
      if (!partner?.id) return [];
      const { data, error } = await supabase.from("partner_risk_events" as any).select("*").eq("partner_id", partner.id).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!partner?.id,
  });

  // Register as partner
  const registerPartner = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("partner_accounts" as any).insert({
        user_id: user.id, company_name: user.email?.split("@")[0] || "My Partner Co",
        partner_type: "reseller", billing_model: "platform_collected",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["partner-account"] }); toast.success("Partner account created"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Provision downstream customer
  const provisionCustomer = useMutation({
    mutationFn: async () => {
      if (!partner?.id) throw new Error("No partner account");
      const { error } = await supabase.from("partner_customers" as any).insert({ partner_id: partner.id, ...form } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-customers"] });
      toast.success("Customer tenant provisioned");
      setProvisionOpen(false);
      setForm({ company_name: "", operating_type: "haulage", plan_tier: "starter", billing_ownership: "platform_collected", contact_name: "", contact_email: "", country: "NG" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Request delegated support
  const requestSupport = useMutation({
    mutationFn: async () => {
      if (!partner?.id || !user) throw new Error("Missing context");
      const expiresAt = new Date(Date.now() + parseInt(supportForm.duration_hours) * 3600000).toISOString();
      const { error } = await supabase.from("delegated_access_sessions" as any).insert({
        partner_id: partner.id, customer_id: supportForm.customer_id, requested_by: user.id,
        access_scope: supportForm.scope.split(",").map(s => s.trim()),
        reason: supportForm.reason, expires_at: expiresAt,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delegated-sessions"] });
      toast.success("Support access requested");
      setSupportOpen(false);
      setSupportForm({ customer_id: "", reason: "", scope: "dashboard,fleet", duration_hours: "24" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (partnerLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-background p-6 md:p-10">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
        <div className="max-w-lg mx-auto text-center space-y-6 mt-20">
          <Building2 className="w-16 h-16 mx-auto text-primary/60" />
          <h1 className="text-2xl font-bold">Become a RouteAce Partner</h1>
          <p className="text-muted-foreground">Resell haulage, bikes, and multidrop logistics infrastructure. Earn recurring commission without building the stack yourself.</p>
          <Button size="lg" onClick={() => registerPartner.mutate()} disabled={registerPartner.isPending}>
            {registerPartner.isPending ? "Creating…" : "Register as Partner"}
          </Button>
        </div>
      </div>
    );
  }

  // KPIs
  const activeCustomers = customers.filter((c: any) => c.status === "active").length;
  const trialCustomers = customers.filter((c: any) => c.status === "trial").length;
  const totalMRR = customers.reduce((s: number, c: any) => s + (c.monthly_bill || 0), 0);
  const totalCommission = commissions.reduce((s: number, c: any) => s + (c.commission_amount || 0), 0);
  const totalPaid = payouts.filter((p: any) => p.status === "paid").reduce((s: number, p: any) => s + (p.net_payout || 0), 0);
  const pendingPayouts = payouts.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + (p.net_payout || 0), 0);
  const unresolvedRisks = riskEvents.filter((r: any) => !r.resolved).length;

  // 6-month reseller lock status
  const isResellerLocked = resellerGuard.isLocked;
  const lockDaysRemaining = resellerGuard.lockDaysRemaining;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-xl font-bold">Partner Console</h1>
            <p className="text-sm text-muted-foreground">{partner.company_name}</p>
          </div>
          {partner.is_verified ? (
            <Badge variant="outline" className="border-emerald-500 text-emerald-700"><Shield className="w-3 h-3 mr-1" />Verified</Badge>
          ) : (
            <Badge variant="outline" className="border-amber-500 text-amber-700"><AlertTriangle className="w-3 h-3 mr-1" />Unverified</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Eye className="w-3.5 h-3.5 mr-1" /> Request Support Access</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Request Delegated Support Access</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Customer Tenant *</Label>
                  <Select value={supportForm.customer_id} onValueChange={v => setSupportForm(f => ({ ...f, customer_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                    <SelectContent>{customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Reason *</Label><Textarea value={supportForm.reason} onChange={e => setSupportForm(f => ({ ...f, reason: e.target.value }))} placeholder="Describe the support issue" /></div>
                <div><Label>Access Scope (comma-separated)</Label><Input value={supportForm.scope} onChange={e => setSupportForm(f => ({ ...f, scope: e.target.value }))} placeholder="dashboard,fleet,dispatch" /></div>
                <div>
                  <Label>Duration</Label>
                  <Select value={supportForm.duration_hours} onValueChange={v => setSupportForm(f => ({ ...f, duration_hours: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hour</SelectItem><SelectItem value="4">4 hours</SelectItem>
                      <SelectItem value="24">24 hours</SelectItem><SelectItem value="72">3 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => requestSupport.mutate()} disabled={!supportForm.customer_id || !supportForm.reason || requestSupport.isPending}>
                  {requestSupport.isPending ? "Requesting…" : "Submit Request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={provisionOpen} onOpenChange={setProvisionOpen}>
            <DialogTrigger asChild><Button disabled={isResellerLocked}><Plus className="w-4 h-4 mr-1" /> {isResellerLocked ? "Locked" : "Provision Customer"}</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Provision Downstream Customer</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div><Label>Company Name *</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Acme Logistics" /></div>
                <div><Label>Contact Name</Label><Input value={form.contact_name} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} /></div>
                <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div><Label>Operation Type *</Label>
                  <Select value={form.operating_type} onValueChange={v => setForm(f => ({ ...f, operating_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{OP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Plan Tier *</Label>
                  <Select value={form.plan_tier} onValueChange={v => setForm(f => ({ ...f, plan_tier: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PLAN_TIERS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Billing Model</Label>
                  <Select value={form.billing_ownership} onValueChange={v => setForm(f => ({ ...f, billing_ownership: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_collected">Platform Collects</SelectItem>
                      <SelectItem value="reseller_billed">Reseller Bills</SelectItem>
                      <SelectItem value="hybrid_split">Hybrid Split</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="NG" /></div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                <Button onClick={() => provisionCustomer.mutate()} disabled={!form.company_name || provisionCustomer.isPending}>
                  {provisionCustomer.isPending ? "Provisioning…" : "Create Tenant"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* 6-Month Reseller Lock Banner */}
      {isResellerLocked && (
        <div className="mx-6 mt-4 border border-amber-300 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300">Reseller Lock Active - {lockDaysRemaining} days remaining</h3>
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
              New accounts undergo a 6-month evaluation period before resale features activate.
              During this period you can consume APIs, build integrations, and use the platform normally.
              Provisioning downstream tenants, API resale, and pricing configuration are disabled.
            </p>
            <div className="mt-2">
              <Progress value={Math.max(0, 100 - (lockDaysRemaining / 180) * 100)} className="h-2 w-64" />
              <p className="text-xs text-amber-600 mt-1">
                Unlocks: {resellerGuard.lockExpiresAt ? new Date(resellerGuard.lockExpiresAt).toLocaleDateString() : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Split Notice */}
      <div className="mx-6 mt-3 border border-border rounded-lg p-3 flex items-center gap-2 bg-muted/30">
        <DollarSign className="w-4 h-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Revenue Split:</span> RouteAce {resellerGuard.revenueSplit.routeace}% / Reseller {resellerGuard.revenueSplit.reseller}% - Applied automatically to all API sales, subscriptions, and module fees.
        </p>
      </div>

      <div className="p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Downstream Tenants</p>
            <p className="text-2xl font-bold mt-1">{customers.length}</p>
            <p className="text-xs text-muted-foreground">{activeCustomers} active · {trialCustomers} trial</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Revenue</p>
            <p className="text-2xl font-bold mt-1">${totalMRR.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Commission Earned</p>
            <p className="text-2xl font-bold mt-1">${totalCommission.toLocaleString()}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pending Payouts</p>
            <p className="text-2xl font-bold mt-1">${pendingPayouts.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">${totalPaid.toLocaleString()} paid</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Risk Alerts</p>
            <p className="text-2xl font-bold mt-1">{unresolvedRisks}</p>
            {unresolvedRisks > 0 && <p className="text-xs text-destructive">Requires attention</p>}
          </CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="customers">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="customers"><Users className="w-3.5 h-3.5 mr-1" />Tenants</TabsTrigger>
            <TabsTrigger value="billing"><FileText className="w-3.5 h-3.5 mr-1" />Billing</TabsTrigger>
            <TabsTrigger value="payouts"><CreditCard className="w-3.5 h-3.5 mr-1" />Payouts</TabsTrigger>
            <TabsTrigger value="api"><Code2 className="w-3.5 h-3.5 mr-1" />API Catalog</TabsTrigger>
            <TabsTrigger value="usage"><Activity className="w-3.5 h-3.5 mr-1" />Usage</TabsTrigger>
            <TabsTrigger value="support"><Eye className="w-3.5 h-3.5 mr-1" />Support Access</TabsTrigger>
            <TabsTrigger value="risk"><ShieldAlert className="w-3.5 h-3.5 mr-1" />Risk & Audit</TabsTrigger>
          </TabsList>

          {/* Customers tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Downstream Customer Accounts</CardTitle>
                <CardDescription>Tenants provisioned through your partner account</CardDescription>
              </CardHeader>
              <CardContent>
                {customers.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No customers provisioned yet</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setProvisionOpen(true)}><Plus className="w-3 h-3 mr-1" /> Provision First Customer</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Company</TableHead><TableHead>Type</TableHead><TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead><TableHead>Billing</TableHead>
                          <TableHead className="text-right">Monthly Bill</TableHead><TableHead className="text-right">Vehicles</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customers.map((c: any) => {
                          const opType = OP_TYPES.find(t => t.value === c.operating_type);
                          const OpIcon = opType?.icon || Truck;
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">{c.company_name}</TableCell>
                              <TableCell><span className="flex items-center gap-1"><OpIcon className={`w-3.5 h-3.5 ${opType?.color}`} />{opType?.label}</span></TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{c.plan_tier}</Badge></TableCell>
                              <TableCell>{statusBadge(c.status)}</TableCell>
                              <TableCell className="text-xs">{c.billing_ownership === "platform_collected" ? "Platform" : c.billing_ownership === "reseller_billed" ? "Reseller" : "Hybrid"}</TableCell>
                              <TableCell className="text-right">${(c.monthly_bill || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-right">{c.vehicles_count}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing tab */}
          <TabsContent value="billing">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Gross Billings</p>
                  <p className="text-xl font-bold">${invoices.reduce((s: number, i: any) => s + (i.total_amount || 0), 0).toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Platform Share</p>
                  <p className="text-xl font-bold">${invoices.reduce((s: number, i: any) => s + (i.platform_share || 0), 0).toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Partner Share</p>
                  <p className="text-xl font-bold text-emerald-600">${invoices.reduce((s: number, i: any) => s + (i.partner_share || 0), 0).toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Failed Collections</p>
                  <p className="text-xl font-bold text-destructive">{invoices.filter((i: any) => i.status === "failed").length}</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Invoice Ledger</CardTitle><CardDescription>Immutable billing record for all downstream tenants</CardDescription></CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No invoices generated yet</p></div>
                  ) : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Invoice #</TableHead><TableHead>Period</TableHead><TableHead className="text-right">Subscription</TableHead>
                        <TableHead className="text-right">Usage</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {invoices.map((inv: any) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                            <TableCell className="text-sm">{inv.period_start} → {inv.period_end}</TableCell>
                            <TableCell className="text-right">${(inv.subscription_amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${((inv.usage_amount || 0) + (inv.api_usage_amount || 0)).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">${(inv.total_amount || 0).toLocaleString()}</TableCell>
                            <TableCell>{statusBadge(inv.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Payouts tab */}
          <TabsContent value="payouts">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                  <p className="text-xl font-bold text-emerald-600">${totalPaid.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Pending Payout</p>
                  <p className="text-xl font-bold">${pendingPayouts.toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Reserve Held</p>
                  <p className="text-xl font-bold">${payouts.reduce((s: number, p: any) => s + (p.reserve_holdback || 0), 0).toLocaleString()}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Commission Rate</p>
                  <p className="text-xl font-bold">{partner.commission_rate}%</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Payout Ledger</CardTitle><CardDescription>Immutable record of all partner payouts</CardDescription></CardHeader>
                <CardContent>
                  {payouts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground"><CreditCard className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No payouts processed yet</p><p className="text-xs mt-1">Payouts accrue as downstream customers generate revenue</p></div>
                  ) : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Period</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Reserve</TableHead>
                        <TableHead className="text-right">Net Payout</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {payouts.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="text-sm">{p.period_start} → {p.period_end}</TableCell>
                            <TableCell className="text-right">${(p.amount || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right text-muted-foreground">-${(p.reserve_holdback || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-medium">${(p.net_payout || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-sm">{p.payout_method || "-"}</TableCell>
                            <TableCell>{statusBadge(p.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Catalog tab */}
          <TabsContent value="api">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">API Resale Catalog</CardTitle>
                <CardDescription>Metered API products available for resale to downstream tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {apiProducts.map((p: any) => (
                    <div key={p.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{p.product_name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                        </div>
                        <Badge variant="outline" className="capitalize text-xs">{p.requires_plan}+</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Wholesale:</span> <span className="font-medium">${p.wholesale_price_per_call}/call</span></div>
                        <div><span className="text-muted-foreground">Retail:</span> <span className="font-medium">${p.suggested_retail_price}/call</span></div>
                        <div><span className="text-muted-foreground">Bundled:</span> <span className="font-medium">{p.bundled_credits.toLocaleString()} calls</span></div>
                        <div><span className="text-muted-foreground">Rate:</span> <span className="font-medium">{p.rate_limit_per_minute}/min</span></div>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-mono text-xs text-muted-foreground">{p.product_code}</span>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">Sandbox</Badge>
                          <Badge variant="outline" className="text-xs">Production</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {apiProducts.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground"><Code2 className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No API products available</p></div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage tab */}
          <TabsContent value="usage">
            <Card>
              <CardHeader><CardTitle className="text-base">Usage Metering Summary</CardTitle><CardDescription>Aggregate usage across all downstream tenants</CardDescription></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Total Vehicles</p>
                    <p className="text-xl font-bold">{customers.reduce((s: number, c: any) => s + (c.vehicles_count || 0), 0)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Dispatches This Month</p>
                    <p className="text-xl font-bold">{customers.reduce((s: number, c: any) => s + (c.dispatches_this_month || 0), 0)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">AI Credits Used</p>
                    <p className="text-xl font-bold">{customers.reduce((s: number, c: any) => s + (c.ai_credits_used || 0), 0)}</p>
                  </div>
                  <div className="border rounded-lg p-4">
                    <p className="text-xs text-muted-foreground">Churn Risk (Avg)</p>
                    <p className="text-xl font-bold">
                      {customers.length ? Math.round(customers.reduce((s: number, c: any) => s + (c.churn_risk_score || 0), 0) / customers.length) : 0}%
                    </p>
                  </div>
                </div>
                {customers.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium mb-3">Per-Tenant Breakdown</h4>
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Tenant</TableHead><TableHead className="text-right">Vehicles</TableHead><TableHead className="text-right">Dispatches</TableHead>
                        <TableHead className="text-right">AI Credits</TableHead><TableHead className="text-right">Churn Risk</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {customers.map((c: any) => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.company_name}</TableCell>
                            <TableCell className="text-right">{c.vehicles_count}</TableCell>
                            <TableCell className="text-right">{c.dispatches_this_month}</TableCell>
                            <TableCell className="text-right">{c.ai_credits_used}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline" className={c.churn_risk_score > 60 ? "border-red-300 text-red-700" : c.churn_risk_score > 30 ? "border-amber-300 text-amber-700" : "border-emerald-300 text-emerald-700"}>
                                {c.churn_risk_score}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Delegated Support tab */}
          <TabsContent value="support">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" /> Delegated Support Access</CardTitle>
                <CardDescription>Scoped, time-bound, audited access to downstream tenant data. No permanent impersonation.</CardDescription>
              </CardHeader>
              <CardContent>
                {supportSessions.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Eye className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>No support access sessions</p>
                    <p className="text-xs mt-1">Request scoped access when a tenant needs help</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={() => setSupportOpen(true)}>Request Access</Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Tenant</TableHead><TableHead>Scope</TableHead><TableHead>Reason</TableHead>
                      <TableHead>Duration</TableHead><TableHead>Status</TableHead><TableHead>Requested</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {supportSessions.map((s: any) => {
                        const tenant = customers.find((c: any) => c.id === s.customer_id);
                        return (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{tenant?.company_name || "-"}</TableCell>
                            <TableCell><div className="flex flex-wrap gap-1">{(s.access_scope || []).map((sc: string) => <Badge key={sc} variant="outline" className="text-xs">{sc}</Badge>)}</div></TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">{s.reason}</TableCell>
                            <TableCell className="text-sm">{s.expires_at ? new Date(s.expires_at).toLocaleString() : "-"}</TableCell>
                            <TableCell>{statusBadge(s.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risk & Audit tab */}
          <TabsContent value="risk">
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Unresolved Alerts</p>
                  <p className="text-xl font-bold text-destructive">{unresolvedRisks}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Active Support Sessions</p>
                  <p className="text-xl font-bold">{supportSessions.filter((s: any) => s.status === "active").length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Failed Payments</p>
                  <p className="text-xl font-bold">{invoices.filter((i: any) => i.status === "failed").length}</p>
                </CardContent></Card>
                <Card><CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground">Total Events</p>
                  <p className="text-xl font-bold">{riskEvents.length}</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Risk Events</CardTitle><CardDescription>Security, billing, and operational risk alerts</CardDescription></CardHeader>
                <CardContent>
                  {riskEvents.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p>No risk events detected</p>
                      <p className="text-xs mt-1">The system monitors for billing failures, API abuse, and cross-tenant access attempts</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Event</TableHead><TableHead>Severity</TableHead><TableHead>Description</TableHead>
                        <TableHead>Tenant</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {riskEvents.map((r: any) => {
                          const tenant = customers.find((c: any) => c.id === r.customer_id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium text-sm">{r.event_type}</TableCell>
                              <TableCell>{severityBadge(r.severity)}</TableCell>
                              <TableCell className="text-sm max-w-[250px] truncate">{r.description}</TableCell>
                              <TableCell className="text-sm">{tenant?.company_name || "Platform"}</TableCell>
                              <TableCell>{r.resolved ? <Badge className="bg-emerald-100 text-emerald-800">Resolved</Badge> : <Badge className="bg-amber-100 text-amber-800">Open</Badge>}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
