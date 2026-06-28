import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Service-role client for core admin cross-org queries — this component is
// only rendered inside CoreDashboard which is gated to core_* roles.
const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
);
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Activity,
  GitBranch,
  Percent,
  ArrowUpRight,
  Globe,
  Trash2,
} from "lucide-react";

interface PlatformMetrics {
  totalOrganizations: number;
  activeOrganizations: number;
  totalSuperAdmins: number;
  totalRevenue: number;
  monthlyRecurring: number;
  churnRate: number;
  avgRevenuePerTenant: number;
  totalResellerVolume: number;
  routeaceCommission: number;
  apiUsage: number;
  growthRate: number;
}

interface OrganizationSummary {
  id: string;
  name: string;
  tier: string;
  revenue: number;
  users: number;
  dispatches: number;
  churnRisk: "low" | "medium" | "high";
}

const PlatformKPIs = () => {
  const [metrics, setMetrics] = useState<PlatformMetrics>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalSuperAdmins: 0,
    totalRevenue: 0,
    monthlyRecurring: 0,
    churnRate: 0,
    avgRevenuePerTenant: 0,
    totalResellerVolume: 0,
    routeaceCommission: 0,
    apiUsage: 0,
    growthRate: 0,
  });

  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<OrganizationSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadPlatformMetrics();
  }, []);

  const loadPlatformMetrics = async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        toast.error("Service role key not configured — cannot load platform data");
        setLoading(false);
        return;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86400000).toISOString();

      // All queries use adminSupabase (service role) to bypass RLS for cross-org aggregation
      const [orgsRes, profilesRes, dispatchesRes, invoicesRes, superAdminRes, commissionRes] =
        await Promise.all([
          adminSupabase.from("organizations").select("id, name, subscription_tier, is_active, created_at"),
          adminSupabase.from("profiles").select("id, organization_id"),
          adminSupabase.from("dispatches").select("id, organization_id"),
          adminSupabase.from("invoices").select("id, organization_id, total_amount, status, created_at"),
          adminSupabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin"),
          adminSupabase.from("commission_ledger").select("source_org_id, gross_amount, routeace_amount").then((r) => r).catch(() => ({ data: [] as any[], error: null })),
        ]);

      if (orgsRes.error) {
        console.error("Organizations query error:", orgsRes.error);
        toast.error("Failed to load organizations: " + orgsRes.error.message);
      }

      const allOrgs = orgsRes.data || [];
      const activeOrgs = allOrgs.filter((o) => o.is_active !== false);
      const profiles = profilesRes.data || [];
      const dispatches = dispatchesRes.data || [];
      const invoices = invoicesRes.data || [];
      const commissions = (commissionRes as any).data || [];

      // Per-org maps
      const orgUserMap = new Map<string, number>();
      profiles.forEach((p: any) => {
        if (p.organization_id) orgUserMap.set(p.organization_id, (orgUserMap.get(p.organization_id) || 0) + 1);
      });

      const orgDispatchMap = new Map<string, number>();
      dispatches.forEach((d: any) => {
        if (d.organization_id) orgDispatchMap.set(d.organization_id, (orgDispatchMap.get(d.organization_id) || 0) + 1);
      });

      const orgRevenueMap = new Map<string, number>();
      invoices.filter((i: any) => i.status === "paid").forEach((i: any) => {
        if (i.organization_id) orgRevenueMap.set(i.organization_id, (orgRevenueMap.get(i.organization_id) || 0) + Number(i.total_amount || 0));
      });
      commissions.forEach((c: any) => {
        if (c.source_org_id && !orgRevenueMap.has(c.source_org_id))
          orgRevenueMap.set(c.source_org_id, Number(c.gross_amount || 0));
      });

      // Platform aggregates
      const totalRevenue = invoices.filter((i: any) => i.status === "paid")
        .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const monthlyRevenue = invoices
        .filter((i: any) => i.status === "paid" && i.created_at >= thirtyDaysAgo)
        .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const routeaceCommission = commissions.reduce((s: number, c: any) => s + Number(c.routeace_amount || 0), 0);
      const resellerVolume = commissions.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0);
      const recentOrgs = allOrgs.filter((o) => o.created_at >= thirtyDaysAgo).length;
      const priorOrgs = allOrgs.filter((o) => o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo).length;
      const growthRate = priorOrgs > 0 ? ((recentOrgs - priorOrgs) / priorOrgs) * 100 : (recentOrgs > 0 ? 100 : 0);
      const churnRate = allOrgs.length > 0 ? ((allOrgs.length - activeOrgs.length) / allOrgs.length) * 100 : 0;

      setMetrics({
        totalOrganizations: allOrgs.length,
        activeOrganizations: activeOrgs.length,
        totalSuperAdmins: superAdminRes.count || 0,
        totalRevenue,
        monthlyRecurring: monthlyRevenue,
        churnRate: Math.round(churnRate * 10) / 10,
        avgRevenuePerTenant: activeOrgs.length > 0 ? totalRevenue / activeOrgs.length : 0,
        totalResellerVolume: resellerVolume,
        routeaceCommission,
        apiUsage: 0,
        growthRate: Math.round(growthRate * 10) / 10,
      });

      setOrganizations(
        [...activeOrgs]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((org) => ({
            id: org.id,
            name: org.name,
            tier: org.subscription_tier || "starter",
            revenue: orgRevenueMap.get(org.id) || 0,
            users: orgUserMap.get(org.id) || 0,
            dispatches: orgDispatchMap.get(org.id) || 0,
            churnRisk: (orgDispatchMap.get(org.id) || 0) > 5 ? "low" : (orgDispatchMap.get(org.id) || 0) > 0 ? "medium" : "high",
          }))
      );
    } catch (error) {
      console.error("Error loading platform metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrg = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await adminSupabase
        .from("organizations")
        .update({ is_active: false })
        .eq("id", deleteTarget.id);
      if (error) throw error;
      setOrganizations((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      toast.success(`${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
    } catch (e: any) {
      toast.error(e.message || "Failed to remove organisation");
    } finally {
      setDeleting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `₦${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `₦${(amount / 1000).toFixed(0)}K`;
    }
    return `₦${amount.toFixed(0)}`;
  };

  const getChurnRiskColor = (risk: string) => {
    switch (risk) {
      case "low": return "bg-green-500/20 text-green-400";
      case "medium": return "bg-amber-500/20 text-amber-400";
      case "high": return "bg-red-500/20 text-red-400";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "professional": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="h-32 bg-secondary/30" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Organisation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove <strong>{deleteTarget?.name}</strong> from the platform? The organisation will be deactivated and will no longer appear in this list. Their data is preserved in the database.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteOrg}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Removing..." : "Remove Organisation"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <div className="space-y-6">
      {/* Primary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="w-3 h-3 mr-1" />
                +{metrics.growthRate}%
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics.totalOrganizations}</p>
            <p className="text-sm text-muted-foreground">Total Organizations</p>
            <p className="text-xs text-green-400 mt-1">{metrics.activeOrganizations} active</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-muted-foreground" />
              <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                Super Admins
              </Badge>
            </div>
            <p className="text-2xl font-bold">{metrics.totalSuperAdmins}</p>
            <p className="text-sm text-muted-foreground">Company Owners</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <ArrowUpRight className="w-4 h-4 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</p>
            <p className="text-sm text-muted-foreground">Total Platform Revenue</p>
            <p className="text-xs text-muted-foreground mt-1">
              MRR: {formatCurrency(metrics.monthlyRecurring)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-5 h-5 text-muted-foreground" />
              {metrics.churnRate > 5 ? (
                <TrendingUp className="w-4 h-4 text-red-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-green-400" />
              )}
            </div>
            <p className="text-2xl font-bold">{metrics.churnRate}%</p>
            <p className="text-sm text-muted-foreground">Churn Rate</p>
            <p className="text-xs text-green-400 mt-1">Target: &lt;5%</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-purple-400" />
              <span className="text-sm font-medium">Reseller Network</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics.totalResellerVolume)}</p>
            <p className="text-sm text-muted-foreground">White-label Volume</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-medium text-amber-400">RouteAce Commission (20%)</span>
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(metrics.routeaceCommission)}</p>
            <p className="text-sm text-muted-foreground">From reseller transactions</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-medium">API Usage</span>
            </div>
            <p className="text-2xl font-bold">{metrics.apiUsage.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total API Calls</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium">Avg Revenue/Tenant</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(metrics.avgRevenuePerTenant)}</p>
            <p className="text-sm text-muted-foreground">Per organization</p>
          </CardContent>
        </Card>
      </div>

      {/* Organization Table */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Organization Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3">Organization</th>
                  <th className="text-left py-2 px-3">Tier</th>
                  <th className="text-right py-2 px-3">Revenue</th>
                  <th className="text-right py-2 px-3">Users</th>
                  <th className="text-right py-2 px-3">Dispatches</th>
                  <th className="text-center py-2 px-3">Churn Risk</th>
                  <th className="py-2 px-3" />
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-border/50 hover:bg-secondary/30">
                    <td className="py-2 px-3 font-medium">{org.name}</td>
                    <td className="py-2 px-3">
                      <Badge className={`${getTierBadge(org.tier)} border capitalize text-xs`}>
                        {org.tier}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{formatCurrency(org.revenue)}</td>
                    <td className="py-2 px-3 text-right">{org.users}</td>
                    <td className="py-2 px-3 text-right">{org.dispatches}</td>
                    <td className="py-2 px-3 text-center">
                      <Badge className={`${getChurnRiskColor(org.churnRisk)} text-xs capitalize`}>
                        {org.churnRisk}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(org)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
};

export default PlatformKPIs;
