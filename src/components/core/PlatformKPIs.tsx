import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

  useEffect(() => {
    loadPlatformMetrics();
  }, []);

  const loadPlatformMetrics = async () => {
    try {
      // Load organizations
      const { data: orgsData, count: orgCount } = await supabase
        .from("organizations")
        .select("*", { count: "exact" });

      // Load super admins
      const { count: superAdminCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact" })
        .eq("role", "super_admin");

      // Load reseller data
      const { data: resellerData } = await supabase
        .from("reseller_relationships")
        .select("*")
        .eq("is_active", true);

      // Load commission ledger
      const { data: commissionData } = await supabase
        .from("commission_ledger")
        .select("gross_amount, routeace_amount, reseller_amount");

      // Load invoices for revenue
      const { data: invoiceData } = await supabase
        .from("invoices")
        .select("total_amount, created_at");

      // Load API usage
      const { count: apiCount } = await supabase
        .from("api_request_logs")
        .select("*", { count: "exact" });

      const totalRevenue = invoiceData?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const routeaceCommission = commissionData?.reduce((sum, c) => sum + (c.routeace_amount || 0), 0) || 0;
      const resellerVolume = commissionData?.reduce((sum, c) => sum + (c.gross_amount || 0), 0) || 0;
      const activeOrgs = orgsData?.filter(o => o.is_active).length || 0;

      // Calculate growth rate from org creation dates (last 30 days vs prior 30)
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);
      const recentOrgs = (orgsData || []).filter(o => new Date(o.created_at) >= thirtyDaysAgo).length;
      const priorOrgs = (orgsData || []).filter(o => new Date(o.created_at) >= sixtyDaysAgo && new Date(o.created_at) < thirtyDaysAgo).length;
      const growthRate = priorOrgs > 0 ? ((recentOrgs - priorOrgs) / priorOrgs) * 100 : (recentOrgs > 0 ? 100 : 0);

      // Calculate churn from inactive orgs ratio
      const totalOrgs = orgCount || 0;
      const churnRate = totalOrgs > 0 ? ((totalOrgs - activeOrgs) / totalOrgs) * 100 : 0;

      // MRR from invoices created in last 30 days
      const recentRevenue = (invoiceData || [])
        .filter(inv => new Date(inv.created_at) >= thirtyDaysAgo)
        .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

      setMetrics({
        totalOrganizations: totalOrgs,
        activeOrganizations: activeOrgs,
        totalSuperAdmins: superAdminCount || 0,
        totalRevenue,
        monthlyRecurring: recentRevenue,
        churnRate: Math.round(churnRate * 10) / 10,
        avgRevenuePerTenant: activeOrgs > 0 ? totalRevenue / activeOrgs : 0,
        totalResellerVolume: resellerVolume,
        routeaceCommission,
        apiUsage: apiCount || 0,
        growthRate: Math.round(growthRate * 10) / 10,
      });

      // Build organization summaries with real data from commission_ledger
      const { data: memberCounts } = await supabase
        .from("organization_members")
        .select("organization_id");
      
      const { data: dispatchCounts } = await supabase
        .from("dispatches")
        .select("id, created_by");

      const orgMemberMap = new Map<string, number>();
      (memberCounts || []).forEach((m: any) => {
        orgMemberMap.set(m.organization_id, (orgMemberMap.get(m.organization_id) || 0) + 1);
      });

      // Get per-org commission revenue
      const { data: orgRevenue } = await supabase
        .from("commission_ledger")
        .select("source_org_id, gross_amount");
      const orgRevenueMap = new Map<string, number>();
      (orgRevenue || []).forEach((r: any) => {
        orgRevenueMap.set(r.source_org_id, (orgRevenueMap.get(r.source_org_id) || 0) + Number(r.gross_amount || 0));
      });

      const orgSummaries: OrganizationSummary[] = (orgsData || []).slice(0, 10).map((org) => ({
        id: org.id,
        name: org.name,
        tier: org.subscription_tier,
        revenue: orgRevenueMap.get(org.id) || 0,
        users: orgMemberMap.get(org.id) || 0,
        dispatches: 0,
        churnRisk: (orgRevenueMap.get(org.id) || 0) > 100000 ? "low" : (orgRevenueMap.get(org.id) || 0) > 10000 ? "medium" : "high",
      }));

      setOrganizations(orgSummaries);
    } catch (error) {
      console.error("Error loading platform metrics:", error);
    } finally {
      setLoading(false);
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformKPIs;
