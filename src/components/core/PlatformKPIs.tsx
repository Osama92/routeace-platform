import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createClient } from "@supabase/supabase-js";

// Service-role client for core admin cross-org queries — this component is
// only rendered inside CoreDashboard which is gated to core_* roles.
// persistSession: false prevents the logged-in user's JWT from overriding
// the service-role key, which would cause RLS to fire and block cross-org queries.
const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
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
  ownerEmail: string;
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

  // Fetches all rows from a table by paginating in 1 000-row pages so we
  // never silently truncate results as the platform grows.
  const fetchAll = async <T,>(
    builder: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const PAGE = 1000;
    let all: T[] = [];
    let page = 0;
    while (true) {
      const from = page * PAGE;
      const to = from + PAGE - 1;
      const { data, error } = await builder(from, to);
      if (error) throw error;
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      page++;
    }
    return all;
  };

  const loadPlatformMetrics = async () => {
    try {
      if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
        toast.error("Service role key not configured — cannot load platform data");
        setLoading(false);
        return;
      }

      const now = Date.now();
      const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString();
      const sixtyDaysAgo = new Date(now - 60 * 86400000).toISOString();
      const ninetyDaysAgo = new Date(now - 90 * 86400000).toISOString();

      // Paginated fetches — never truncate at a fixed row cap
      const [allOrgs, members, dispatches, invoices, commissions, superAdminRes, owners] =
        await Promise.all([
          fetchAll<any>((from, to) =>
            adminSupabase.from("organizations")
              .select("id, name, subscription_tier, subscription_status, is_active, created_at, subscription_expires_at")
              .range(from, to)
          ),
          fetchAll<any>((from, to) =>
            adminSupabase.from("organization_members")
              .select("user_id, organization_id")
              .eq("is_active", true)
              .range(from, to)
          ),
          // Fetch dispatches with created_at so we can detect recency per org
          fetchAll<any>((from, to) =>
            adminSupabase.from("dispatches")
              .select("id, organization_id, created_at")
              .not("organization_id", "is", null)
              .range(from, to)
          ),
          fetchAll<any>((from, to) =>
            adminSupabase.from("invoices")
              .select("id, organization_id, total_amount, status, created_at")
              .range(from, to)
          ),
          fetchAll<any>((from, to) =>
            adminSupabase.from("commission_ledger")
              .select("source_org_id, gross_amount, routeace_amount")
              .range(from, to)
          ).catch(() => [] as any[]),
          adminSupabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin"),
          // Owner email per org — join organization_members (is_owner=true) → profiles
          fetchAll<any>((from, to) =>
            adminSupabase.from("organization_members")
              .select("organization_id, profiles!inner(email)")
              .eq("is_owner", true)
              .eq("is_active", true)
              .range(from, to)
          ),
        ]);

      const activeOrgs = allOrgs.filter((o: any) => o.is_active !== false);

      // Owner email lookup — first owner record wins per org
      const orgOwnerEmailMap = new Map<string, string>();
      owners.forEach((o: any) => {
        if (o.organization_id && !orgOwnerEmailMap.has(o.organization_id)) {
          orgOwnerEmailMap.set(o.organization_id, o.profiles?.email || "");
        }
      });

      // Per-org user count
      const orgUserMap = new Map<string, number>();
      members.forEach((m: any) => {
        if (m.organization_id) orgUserMap.set(m.organization_id, (orgUserMap.get(m.organization_id) || 0) + 1);
      });

      // Per-org dispatch count + most recent dispatch date (for health scoring)
      const orgDispatchMap = new Map<string, number>();
      const orgLastDispatchMap = new Map<string, string>();
      dispatches.forEach((d: any) => {
        if (!d.organization_id) return;
        orgDispatchMap.set(d.organization_id, (orgDispatchMap.get(d.organization_id) || 0) + 1);
        const prev = orgLastDispatchMap.get(d.organization_id);
        if (!prev || d.created_at > prev) orgLastDispatchMap.set(d.organization_id, d.created_at);
      });

      // Per-org paid revenue
      const orgRevenueMap = new Map<string, number>();
      invoices.filter((i: any) => i.status === "paid").forEach((i: any) => {
        if (i.organization_id)
          orgRevenueMap.set(i.organization_id, (orgRevenueMap.get(i.organization_id) || 0) + Number(i.total_amount || 0));
      });
      commissions.forEach((c: any) => {
        if (c.source_org_id && !orgRevenueMap.has(c.source_org_id))
          orgRevenueMap.set(c.source_org_id, Number(c.gross_amount || 0));
      });

      // Platform aggregates
      const totalRevenue = invoices
        .filter((i: any) => i.status === "paid")
        .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const monthlyRevenue = invoices
        .filter((i: any) => i.status === "paid" && i.created_at >= thirtyDaysAgo)
        .reduce((s: number, i: any) => s + Number(i.total_amount || 0), 0);
      const routeaceCommission = commissions.reduce((s: number, c: any) => s + Number(c.routeace_amount || 0), 0);
      const resellerVolume = commissions.reduce((s: number, c: any) => s + Number(c.gross_amount || 0), 0);
      const recentOrgs = allOrgs.filter((o: any) => o.created_at >= thirtyDaysAgo).length;
      const priorOrgs = allOrgs.filter((o: any) => o.created_at >= sixtyDaysAgo && o.created_at < thirtyDaysAgo).length;
      const growthRate = priorOrgs > 0 ? ((recentOrgs - priorOrgs) / priorOrgs) * 100 : recentOrgs > 0 ? 100 : 0;
      const churnRate = allOrgs.length > 0 ? ((allOrgs.length - activeOrgs.length) / allOrgs.length) * 100 : 0;

      // Multi-factor churn risk scoring
      // Each signal contributes a risk score 0–3; total 0–2 = low, 3–5 = medium, 6+ = high.
      //
      // Signal 1 — Recency of last dispatch (are they actually using the product?)
      //   last dispatch <30d → 0 pts  |  30-90d → 2 pts  |  never / >90d → 3 pts
      // Signal 2 — Subscription health (are they paid and current?)
      //   active & not expired → 0 pts  |  expiring within 14d → 1 pt  |  expired/inactive → 3 pts
      // Signal 3 — User engagement (is the team logged in / active?)
      //   ≥2 users → 0 pts  |  1 user → 1 pt  |  0 users → 2 pts
      // Signal 4 — Invoice payment history (do they pay their bills?)
      //   has paid invoices → 0 pts  |  only unpaid invoices → 1 pt  |  no invoices at all → 0 pts (new, not risky yet)
      const scoreChurnRisk = (org: any): "low" | "medium" | "high" => {
        let score = 0;

        // Signal 1: dispatch recency
        const lastDispatch = orgLastDispatchMap.get(org.id);
        if (!lastDispatch) {
          // Never dispatched — only risky if they're not brand new (joined >30d ago)
          score += org.created_at < thirtyDaysAgo ? 3 : 0;
        } else if (lastDispatch < ninetyDaysAgo) {
          score += 3;
        } else if (lastDispatch < thirtyDaysAgo) {
          score += 2;
        }

        // Signal 2: subscription status
        const expired = org.subscription_expires_at && org.subscription_expires_at < new Date().toISOString();
        const expiringIn14d = org.subscription_expires_at &&
          org.subscription_expires_at < new Date(now + 14 * 86400000).toISOString() &&
          org.subscription_expires_at >= new Date().toISOString();
        if (expired || org.subscription_status === "expired" || org.subscription_status === "cancelled") {
          score += 3;
        } else if (expiringIn14d) {
          score += 1;
        }

        // Signal 3: team size
        const userCount = orgUserMap.get(org.id) || 0;
        if (userCount === 0) score += 2;
        else if (userCount === 1) score += 1;

        // Signal 4: has paid invoices
        const orgInvoices = invoices.filter((i: any) => i.organization_id === org.id);
        if (orgInvoices.length > 0 && !orgInvoices.some((i: any) => i.status === "paid")) {
          score += 1;
        }

        if (score <= 2) return "low";
        if (score <= 5) return "medium";
        return "high";
      };

      setMetrics({
        totalOrganizations: activeOrgs.length,
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
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
          .map((org: any) => ({
            id: org.id,
            name: org.name,
            tier: org.subscription_tier || "starter",
            revenue: orgRevenueMap.get(org.id) || 0,
            users: orgUserMap.get(org.id) || 0,
            dispatches: orgDispatchMap.get(org.id) || 0,
            churnRisk: scoreChurnRisk(org),
            ownerEmail: orgOwnerEmailMap.get(org.id) || "",
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
    console.log("[PlatformKPIs] attempting delete for org:", deleteTarget.id, deleteTarget.name);
    try {
      const { error, data } = await adminSupabase
        .from("organizations")
        .update({ is_active: false })
        .eq("id", deleteTarget.id)
        .select("id, is_active");
      console.log("[PlatformKPIs] delete result — data:", data, "error:", error);
      if (error) throw error;
      const { id: deletedId, name: deletedName } = deleteTarget;
      setDeleteTarget(null);
      setOrganizations((prev) => prev.filter((o) => o.id !== deletedId));
      toast.success(`${deletedName} has been removed`);
    } catch (e: any) {
      console.error("[PlatformKPIs] delete error:", e);
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
            <p className="text-sm text-muted-foreground">Active Organizations</p>
            <p className="text-xs text-muted-foreground mt-1">On platform</p>
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
                  <th className="text-left py-2 px-3">Owner Email</th>
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
                      {org.ownerEmail ? (
                        <a
                          href={`mailto:${org.ownerEmail}`}
                          className="text-blue-400 hover:text-blue-300 hover:underline text-xs"
                        >
                          {org.ownerEmail}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
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
