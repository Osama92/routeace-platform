import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/core-platform-metrics`,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();

      const m = json.metrics;

      // super_admin count still comes from client (no RLS conflict for counting own role)
      const { count: superAdminCount } = await supabase
        .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "super_admin");

      setMetrics({
        totalOrganizations: m.totalOrganizations,
        activeOrganizations: m.activeOrganizations,
        totalSuperAdmins: superAdminCount || 0,
        totalRevenue: m.totalRevenue,
        monthlyRecurring: m.monthlyRecurring,
        churnRate: m.churnRate,
        avgRevenuePerTenant: m.avgRevenuePerTenant,
        totalResellerVolume: m.totalResellerVolume,
        routeaceCommission: m.routeaceCommission,
        apiUsage: m.apiUsage,
        growthRate: m.growthRate,
      });

      // Filter to active only (edge function may return all orgs on older deployment)
      setOrganizations((json.organizations || []).filter((o: any) => o.is_active !== false));
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
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No auth session");

      // Use service-role client via edge function to bypass RLS
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/core-platform-metrics`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: deleteTarget.id }),
        },
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Removal failed");

      // Remove from local state immediately so it disappears from the table
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
