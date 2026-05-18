import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";
import useTenantMode from "@/hooks/useTenantMode";
import { DeptSuperAdminDashboard } from "@/pages/dept/DeptDashboards";
import OpsOnboardingChecklist from "@/components/operations/OpsOnboardingChecklist";
import { useOpsOnboardingCounts } from "@/hooks/useOpsOnboardingCounts";
import RevenueInsightsPanel from "@/components/analytics/RevenueInsightsPanel";
import RouteLevelCosting from "@/components/analytics/RouteLevelCosting";
import CustomerProfitabilityReport from "@/components/analytics/CustomerProfitabilityReport";
import RouteRiskRegister from "@/components/operations/RouteRiskRegister";
import WeeklyOpsDashboard from "@/components/operations/WeeklyOpsDashboard";
import KPIEngineDashboard from "@/components/kpi/KPIEngineDashboard";
import FleetMaintenancePanel from "@/components/fleet/FleetMaintenancePanel";
import WaitDaysKPICard from "@/components/kpi/WaitDaysKPICard";
import AssetProfitabilityCard from "@/components/kpi/AssetProfitabilityCard";
import OrderInboxPanel from "@/components/inbox/OrderInboxPanel";
import { DemoPreviewToggleCard } from "@/components/demo/DemoPreviewToggleCard";
import SOPDiagnosisPanel from "@/components/operations/SOPDiagnosisPanel";
import DynamicPricingEngine from "@/components/pricing/DynamicPricingEngine";
import IdleAssetMonetization from "@/components/fleet/IdleAssetMonetization";
import LossRouteDetector from "@/components/analytics/LossRouteDetector";
import FleetROIDashboard from "@/components/analytics/FleetROIDashboard";
import BoardKPIDashboard from "@/components/analytics/BoardKPIDashboard";
import FleetKPIPanel from "@/components/fleet/FleetKPIPanel";
import TopDelayReasonsCard from "@/components/analytics/TopDelayReasonsCard";
import { AnalyticsPeriodSelector, getDefaultPeriodRange, type PeriodType, type PeriodRange } from "@/components/analytics/AnalyticsPeriodSelector";
import CustomerVendorApprovalQueue from "@/components/approvals/CustomerVendorApprovalQueue";
import { 
  Building2, 
  Shield, 
  CreditCard, 
  Users, 
  Clock,
  TrendingUp,
  Globe,
  Key,
  Smartphone,
  HardDrive,
  Plus,
  Trash2,
  RefreshCw,
  FileText,
  Ban,
  CheckCircle,
  XCircle,
  BarChart3,
  MapPin,
  AlertTriangle
} from "lucide-react";
import { format } from "date-fns";

// Permission Matrix Definition
interface Permission {
  label: string;
  description: string;
  actions: string[];
  restricted?: boolean;
}

const SUPER_ADMIN_PERMISSIONS: Record<string, Permission> = {
  organizations: {
    label: "Organization Management",
    description: "View, create, suspend partner organizations",
    actions: ["view", "create", "suspend", "delete"]
  },
  analytics: {
    label: "Platform Analytics",
    description: "Platform-wide metrics and performance data",
    actions: ["view"]
  },
  subscriptions: {
    label: "Subscription & Billing",
    description: "Manage partner subscriptions and payments",
    actions: ["view", "update", "cancel"]
  },
  settings: {
    label: "Platform Settings",
    description: "Global configuration and feature flags",
    actions: ["view", "update"]
  },
  accounts: {
    label: "Account Control",
    description: "Suspend/reactivate user accounts",
    actions: ["suspend", "reactivate"]
  },
  auditLogs: {
    label: "Audit Logs",
    description: "Access platform-wide security logs",
    actions: ["view"]
  },
  financialContent: {
    label: "Client Financial Transactions",
    description: "View individual financial transaction content",
    actions: [],
    restricted: true
  }
};

interface PartnerOrg {
  id: string;
  company_name: string;
  contact_email: string | null;
  approval_status: string;
  created_at: string;
  organization_subscriptions: {
    id: string;
    status: string;
    monthly_amount: number | null;
    tier_id: string | null;
    started_at: string | null;
    expires_at: string | null;
  }[];
}

const SuperAdminDashboard = () => {
  const { isDepartment } = useTenantMode();
  if (isDepartment) return <DeptSuperAdminDashboard />;
  return <SuperAdminDashboardInner />;
};

const SuperAdminDashboardInner = () => {
  const { toast } = useToast();
  const { user, tenantMode, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerOrg | null>(null);
  const [ipDialogOpen, setIpDialogOpen] = useState(false);
  const [newIpAddress, setNewIpAddress] = useState("");
  const [newIpDescription, setNewIpDescription] = useState("");
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedPeriod, setSelectedPeriod] = useState("month-0");
  const [periodRange, setPeriodRange] = useState<PeriodRange>(getDefaultPeriodRange());
  const { data: onboardingCounts } = useOpsOnboardingCounts();

  // Fetch platform statistics
  const { data: platformStats } = useQuery({
    queryKey: ["platform-stats", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      // Scope strictly to the current organization - no cross-org leakage
      const sb: any = supabase;
      // Get partner ids for this org (subscriptions are keyed by partner_id)
      const { data: orgPartners } = await sb.from("partners").select("id").eq("organization_id", organizationId!);
      const partnerIds = (orgPartners ?? []).map((p: any) => p.id);

      const [subscriptions, members, memberRows] = await Promise.all([
        partnerIds.length
          ? sb.from("organization_subscriptions").select("id, status, monthly_amount").in("partner_id", partnerIds)
          : Promise.resolve({ data: [] }),
        sb.from("organization_members").select("user_id", { count: "exact", head: true }).eq("organization_id", organizationId!).eq("is_active", true),
        sb.from("organization_members").select("user_id").eq("organization_id", organizationId!).eq("is_active", true),
      ]);
      const partners = { count: partnerIds.length };

      const memberIds = (memberRows.data ?? []).map((r: any) => r.user_id);
      let pendingCount = 0;
      if (memberIds.length > 0) {
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .in("user_id", memberIds)
          .eq("approval_status", "pending");
        pendingCount = count || 0;
      }

      const activeSubscriptions = subscriptions.data?.filter(s => s.status === "active") || [];
      const mrr = activeSubscriptions.reduce((sum, s) => sum + (s.monthly_amount || 0), 0);

      return {
        totalOrganizations: partners.count || 0,
        activeSubscriptions: activeSubscriptions.length,
        totalUsers: members.count || 0,
        pendingUsers: pendingCount,
        mrr
      };
    }
  });

  // Fetch organizations/partners
  const { data: organizations } = useQuery({
    queryKey: ["super-admin-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select(`
          id,
          company_name,
          contact_email,
          approval_status,
          created_at,
          organization_subscriptions (
            id,
            status,
            monthly_amount,
            tier_id,
            started_at,
            expires_at
          )
        `)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PartnerOrg[];
    }
  });

  // Fetch platform audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ["platform-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch IP allowlist
  const { data: ipAllowlist } = useQuery({
    queryKey: ["ip-allowlist", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("ip_allowlist")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  // Fetch MFA settings
  const { data: mfaSettings } = useQuery({
    queryKey: ["mfa-settings", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("mfa_requirements")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!user
  });

  // Suspend organization mutation
  const suspendOrgMutation = useMutation({
    mutationFn: async ({ partnerId, suspend }: { partnerId: string; suspend: boolean }) => {
      const { error } = await supabase
        .from("partners")
        .update({ approval_status: suspend ? "suspended" : "approved" })
        .eq("id", partnerId);
      
      if (error) throw error;

      // Log the action
      await supabase.from("platform_audit_logs").insert({
        action: suspend ? "organization_suspended" : "organization_reactivated",
        entity_type: "partner",
        entity_id: partnerId,
        performed_by: user?.id,
        details: { partner_id: partnerId }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin-organizations"] });
      toast({ title: "Success", description: "Organization status updated" });
      setSuspendDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Add IP to allowlist
  const addIpMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("ip_allowlist").insert({
        user_id: user.id,
        ip_address: newIpAddress,
        description: newIpDescription,
        created_by: user.id
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-allowlist"] });
      toast({ title: "Success", description: "IP address added to allowlist" });
      setIpDialogOpen(false);
      setNewIpAddress("");
      setNewIpDescription("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Delete IP from allowlist
  const deleteIpMutation = useMutation({
    mutationFn: async (ipId: string) => {
      const { error } = await supabase.from("ip_allowlist").delete().eq("id", ipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ip-allowlist"] });
      toast({ title: "Success", description: "IP address removed" });
    }
  });

  // Update MFA settings
  const updateMfaMutation = useMutation({
    mutationFn: async ({ enabled, method }: { enabled: boolean; method?: string }) => {
      if (!user) throw new Error("Not authenticated");
      
      const { data: existing } = await supabase
        .from("mfa_requirements")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("mfa_requirements")
          .update({ mfa_enabled: enabled, mfa_method: method, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mfa_requirements")
          .insert({ user_id: user.id, mfa_enabled: enabled, mfa_method: method });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mfa-settings"] });
      toast({ title: "Success", description: "MFA settings updated" });
    }
  });

  const superAdminDisplay = getRoleDisplay("super_admin", tenantMode);

  return (
    <DashboardLayout
      title={tenantMode === "LOGISTICS_DEPARTMENT" ? `${superAdminDisplay.title} Console` : "Super Admin Console"}
      subtitle={tenantMode === "LOGISTICS_DEPARTMENT" ? "Department-wide logistics governance and oversight" : "Platform-wide management and oversight"}
    >
      {/* Onboarding Checklist (auto-hides once complete) */}
      <div className="mb-6">
        <OpsOnboardingChecklist
          fleetCount={onboardingCounts?.fleetCount ?? 0}
          vehicleCount={onboardingCounts?.vehicleCount ?? 0}
          driverCount={onboardingCounts?.driverCount ?? 0}
          dispatchCount={onboardingCounts?.dispatchCount ?? 0}
          orderCount={onboardingCounts?.orderCount ?? 0}
          routePlanCount={onboardingCounts?.routePlanCount ?? 0}
          waybillCount={onboardingCounts?.waybillCount ?? 0}
        />
      </div>

      {/* Platform Stats - hidden in LOGISTICS_DEPARTMENT mode (no multi-tenant SaaS context) */}
      {tenantMode !== "LOGISTICS_DEPARTMENT" && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-2xl font-bold">{platformStats?.totalOrganizations || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CreditCard className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{platformStats?.activeSubscriptions || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{platformStats?.totalUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold">{platformStats?.pendingUsers || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <TrendingUp className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">MRR</p>
                <p className="text-2xl font-bold">₦{(platformStats?.mrr || 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="board">Board KPIs</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          {tenantMode !== "LOGISTICS_DEPARTMENT" && <TabsTrigger value="pricing">Dynamic Pricing</TabsTrigger>}
          <TabsTrigger value="roi">Fleet ROI</TabsTrigger>
          {tenantMode !== "LOGISTICS_DEPARTMENT" && <TabsTrigger value="organizations">Organizations</TabsTrigger>}
          <TabsTrigger value="analytics">{tenantMode === "LOGISTICS_DEPARTMENT" ? "Department Analytics" : "Business Analytics"}</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="fleet">Fleet</TabsTrigger>
          <TabsTrigger value="inbox">Order Inbox</TabsTrigger>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="fleet-kpis">Fleet KPIs</TabsTrigger>
        </TabsList>

        {/* Board KPIs Tab */}
        <TabsContent value="board">
          <BoardKPIDashboard />
        </TabsContent>

        {/* Dynamic Pricing Tab */}
        {tenantMode !== "LOGISTICS_DEPARTMENT" && (
          <TabsContent value="pricing">
            <DynamicPricingEngine />
          </TabsContent>
        )}

        {/* Fleet ROI Tab */}
        <TabsContent value="roi">
          <div className="space-y-6">
            <FleetROIDashboard />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IdleAssetMonetization />
              <LossRouteDetector />
            </div>
          </div>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis">
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WaitDaysKPICard />
              <AssetProfitabilityCard />
            </div>
            <KPIEngineDashboard />
          </div>
        </TabsContent>

        {/* Fleet Tab */}
        <TabsContent value="fleet">
          <FleetMaintenancePanel />
        </TabsContent>

        {/* Fleet KPIs Tab */}
        <TabsContent value="fleet-kpis">
          <FleetKPIPanel />
        </TabsContent>

        {/* Order Inbox Tab */}
        <TabsContent value="inbox">
          <OrderInboxPanel />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-4">
          {organizationId && (
            <CustomerVendorApprovalQueue level="sa" organizationId={organizationId} />
          )}
          <DemoPreviewToggleCard />
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4" />
                    <span>MFA Status</span>
                  </div>
                  <Badge variant={mfaSettings?.mfa_enabled ? "default" : "destructive"}>
                    {mfaSettings?.mfa_enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    <span>IP Allowlist</span>
                  </div>
                  <Badge variant={(ipAllowlist?.length || 0) > 0 ? "default" : "secondary"}>
                    {ipAllowlist?.length || 0} IPs configured
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    <span>Hardware Token</span>
                  </div>
                  <Badge variant={mfaSettings?.hardware_token_id ? "default" : "secondary"}>
                    {mfaSettings?.hardware_token_id ? "Registered" : "Not configured"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {auditLogs?.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="p-1.5 rounded-full bg-primary/10">
                        <FileText className="w-3 h-3 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{log.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Partner Organizations</CardTitle>
              <CardDescription>Manage partner accounts and subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Monthly Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations?.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{org.company_name}</p>
                          <p className="text-sm text-muted-foreground">{org.contact_email || "No email"}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.approval_status === "approved" ? "default" : "destructive"}>
                          {org.approval_status || "pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={org.organization_subscriptions?.[0]?.status === "active" ? "default" : "secondary"}>
                          {org.organization_subscriptions?.[0]?.status || "none"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ₦{(org.organization_subscriptions?.[0]?.monthly_amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(org);
                            setSuspendDialogOpen(true);
                          }}
                        >
                          {org.approval_status === "suspended" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <Ban className="w-4 h-4 text-destructive" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!organizations || organizations.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No organizations found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Business Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Business Analytics</h3>
            <AnalyticsPeriodSelector
              periodType={periodType}
              onPeriodTypeChange={setPeriodType}
              selectedPeriod={selectedPeriod}
              onPeriodChange={(value, range) => {
                setSelectedPeriod(value);
                setPeriodRange(range);
              }}
            />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopDelayReasonsCard startDate={periodRange.start} endDate={periodRange.end} />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Period: {periodRange.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Showing data from {format(periodRange.start, "MMM d, yyyy")} to {format(periodRange.end, "MMM d, yyyy")}
                </p>
              </CardContent>
            </Card>
          </div>
          <RevenueInsightsPanel />
          <RouteLevelCosting />
          <CustomerProfitabilityReport />
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-6">
          <WeeklyOpsDashboard />
          <RouteRiskRegister />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* MFA Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Multi-Factor Authentication
                </CardTitle>
                <CardDescription>Require MFA for super admin access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="mfa-toggle">Enable MFA</Label>
                  <Switch
                    id="mfa-toggle"
                    checked={mfaSettings?.mfa_enabled || false}
                    onCheckedChange={(checked) => updateMfaMutation.mutate({ enabled: checked, method: "totp" })}
                  />
                </div>
                {mfaSettings?.mfa_enabled && (
                  <div className="space-y-2">
                    <Label>MFA Method</Label>
                    <Select
                      value={mfaSettings?.mfa_method || "totp"}
                      onValueChange={(value) => updateMfaMutation.mutate({ enabled: true, method: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="totp">Authenticator App (TOTP)</SelectItem>
                        <SelectItem value="hardware_token">Hardware Token (YubiKey)</SelectItem>
                        <SelectItem value="sms">SMS (Less Secure)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {mfaSettings?.mfa_method === "hardware_token" && (
                  <div className="space-y-2">
                    <Label>Hardware Token ID</Label>
                    <Input
                      placeholder="Enter YubiKey serial number"
                      value={mfaSettings?.hardware_token_id || ""}
                      disabled
                    />
                    <Button variant="outline" size="sm" className="w-full">
                      <HardDrive className="w-4 h-4 mr-2" />
                      Register Hardware Token
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* IP Allowlist */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="w-5 h-5" />
                      IP Allowlist
                    </CardTitle>
                    <CardDescription>Restrict access to specific IP addresses</CardDescription>
                  </div>
                  <Dialog open={ipDialogOpen} onOpenChange={setIpDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Add IP
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add IP Address</DialogTitle>
                        <DialogDescription>Add an IP address to your allowlist</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>IP Address</Label>
                          <Input
                            placeholder="e.g., 192.168.1.1"
                            value={newIpAddress}
                            onChange={(e) => setNewIpAddress(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            placeholder="e.g., Office Network"
                            value={newIpDescription}
                            onChange={(e) => setNewIpDescription(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIpDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => addIpMutation.mutate()} disabled={!newIpAddress}>
                          Add IP
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ipAllowlist?.map((ip) => (
                    <div key={ip.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-mono text-sm">{String(ip.ip_address)}</p>
                        <p className="text-xs text-muted-foreground">{ip.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIpMutation.mutate(ip.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  {(!ipAllowlist || ipAllowlist.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No IP addresses configured. All IPs are currently allowed.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audit Logs Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Platform Audit Logs</CardTitle>
                  <CardDescription>Track all super admin actions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["platform-audit-logs"] })}>
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs?.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{log.entity_type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs">{log.ip_address ? String(log.ip_address) : "-"}</span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(log.details || {}).slice(0, 50)}...
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No audit logs found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Super Admin Permission Matrix</CardTitle>
              <CardDescription>Overview of super admin capabilities and restrictions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Allowed Actions</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(SUPER_ADMIN_PERMISSIONS).map(([key, permission]) => (
                    <TableRow key={key}>
                      <TableCell className="font-medium">{permission.label}</TableCell>
                      <TableCell className="text-muted-foreground">{permission.description}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {permission.actions.length > 0 ? (
                            permission.actions.map((action) => (
                              <Badge key={action} variant="secondary" className="text-xs">
                                {action}
                              </Badge>
                            ))
                          ) : (
                            <Badge variant="destructive" className="text-xs">NO ACCESS</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {permission.restricted ? (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm">Restricted</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm">Active</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Suspend Organization Dialog */}
      <Dialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedPartner?.approval_status === "suspended" ? "Reactivate" : "Suspend"} Organization
            </DialogTitle>
            <DialogDescription>
              {selectedPartner?.approval_status === "suspended" 
                ? `Are you sure you want to reactivate ${selectedPartner?.company_name}?`
                : `Are you sure you want to suspend ${selectedPartner?.company_name}? This will immediately revoke all access.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendDialogOpen(false)}>Cancel</Button>
            <Button
              variant={selectedPartner?.approval_status === "suspended" ? "default" : "destructive"}
              onClick={() => selectedPartner && suspendOrgMutation.mutate({
                partnerId: selectedPartner.id,
                suspend: selectedPartner.approval_status !== "suspended"
              })}
            >
              {selectedPartner?.approval_status === "suspended" ? "Reactivate" : "Suspend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SuperAdminDashboard;
