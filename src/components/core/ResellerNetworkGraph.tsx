import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GitBranch,
  Building2,
  ArrowRight,
  DollarSign,
  Users,
  ChevronDown,
  ChevronRight,
  Percent,
} from "lucide-react";

interface ResellerNode {
  id: string;
  orgId: string;
  orgName: string;
  tier: string;
  clients: ResellerNode[];
  totalRevenue: number;
  commissionEarned: number;
  routeaceCommission: number;
}

interface ResellerRelation {
  id: string;
  reseller_org_id: string;
  client_org_id: string;
  commission_rate: number;
  routeace_commission_rate: number;
  reseller_org?: { name: string; subscription_tier: string };
  client_org?: { name: string; subscription_tier: string };
}

const ResellerNetworkGraph = () => {
  const [network, setNetwork] = useState<ResellerNode[]>([]);
  const [relationships, setRelationships] = useState<ResellerRelation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const [stats, setStats] = useState({
    totalResellers: 0,
    totalClients: 0,
    totalVolume: 0,
    totalRouteaceCommission: 0,
  });

  useEffect(() => {
    loadResellerNetwork();
  }, []);

  const loadResellerNetwork = async () => {
    try {
      const { data: relationsData } = await supabase
        .from("reseller_relationships")
        .select(`
          id,
          reseller_org_id,
          client_org_id,
          commission_rate,
          routeace_commission_rate,
          is_active
        `)
        .eq("is_active", true);

      if (!relationsData) {
        setLoading(false);
        return;
      }

      // Get organization details
      const orgIds = new Set<string>();
      relationsData.forEach((r) => {
        orgIds.add(r.reseller_org_id);
        orgIds.add(r.client_org_id);
      });

      const { data: orgsData } = await supabase
        .from("organizations")
        .select("id, name, subscription_tier")
        .in("id", Array.from(orgIds));

      const orgMap = new Map(orgsData?.map((o) => [o.id, o]) || []);

      // Enrich relationships
      const enrichedRelations: ResellerRelation[] = relationsData.map((r) => ({
        ...r,
        reseller_org: orgMap.get(r.reseller_org_id),
        client_org: orgMap.get(r.client_org_id),
      }));

      setRelationships(enrichedRelations);

      // Build tree structure
      const resellerSet = new Set(relationsData.map((r) => r.reseller_org_id));
      const clientSet = new Set(relationsData.map((r) => r.client_org_id));

      // Root resellers (those who are resellers but not clients of anyone)
      const rootResellers = Array.from(resellerSet).filter((id) => !clientSet.has(id));

      // Build per-org revenue from commission_ledger
      const { data: commissions } = await supabase
        .from("commission_ledger")
        .select("source_org_id, reseller_org_id, gross_amount, reseller_amount, routeace_amount");
      
      const resellerRevenueMap = new Map<string, { total: number; commission: number; routeace: number }>();
      (commissions || []).forEach((c: any) => {
        const rid = c.reseller_org_id;
        if (!rid) return;
        const existing = resellerRevenueMap.get(rid) || { total: 0, commission: 0, routeace: 0 };
        existing.total += Number(c.gross_amount || 0);
        existing.commission += Number(c.reseller_amount || 0);
        existing.routeace += Number(c.routeace_amount || 0);
        resellerRevenueMap.set(rid, existing);
      });

      const buildNode = (orgId: string): ResellerNode | null => {
        const org = orgMap.get(orgId);
        if (!org) return null;

        const clientRelations = enrichedRelations.filter((r) => r.reseller_org_id === orgId);
        const clients = clientRelations
          .map((r) => buildNode(r.client_org_id))
          .filter((n): n is ResellerNode => n !== null);

        const revenueData = resellerRevenueMap.get(orgId) || { total: 0, commission: 0, routeace: 0 };

        return {
          id: orgId,
          orgId,
          orgName: org.name,
          tier: org.subscription_tier,
          clients,
          totalRevenue: revenueData.total,
          commissionEarned: revenueData.commission,
          routeaceCommission: revenueData.routeace,
        };
      };

      const networkTree = rootResellers
        .map((id) => buildNode(id))
        .filter((n): n is ResellerNode => n !== null);

      setNetwork(networkTree);

      // Calculate stats
      const uniqueResellers = new Set(enrichedRelations.map((r) => r.reseller_org_id)).size;
      const uniqueClients = new Set(enrichedRelations.map((r) => r.client_org_id)).size;

      setStats({
        totalResellers: uniqueResellers,
        totalClients: uniqueClients,
        totalVolume: networkTree.reduce((sum, n) => sum + n.totalRevenue, 0),
        totalRouteaceCommission: networkTree.reduce((sum, n) => sum + n.routeaceCommission, 0),
      });
    } catch (error) {
      console.error("Error loading reseller network:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
    return `₦${amount.toFixed(0)}`;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "professional": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const renderNode = (node: ResellerNode, level: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasClients = node.clients.length > 0;

    return (
      <div key={node.id} className={`${level > 0 ? "ml-6 border-l-2 border-border pl-4" : ""}`}>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors ${
            level === 0 ? "bg-primary/5 border-primary/20" : ""
          }`}
        >
          {hasClients ? (
            <button onClick={() => toggleNode(node.id)} className="p-1 hover:bg-secondary rounded">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <Building2 className="w-5 h-5 text-muted-foreground" />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{node.orgName}</span>
              <Badge className={`${getTierColor(node.tier)} border text-xs capitalize`}>
                {node.tier}
              </Badge>
              {hasClients && (
                <Badge variant="outline" className="text-xs">
                  {node.clients.length} clients
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-mono text-green-400">{formatCurrency(node.commissionEarned)}</p>
              <p className="text-xs text-muted-foreground">Earned (80%)</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-amber-400">{formatCurrency(node.routeaceCommission)}</p>
              <p className="text-xs text-muted-foreground">RouteAce (20%)</p>
            </div>
          </div>
        </div>

        {isExpanded && hasClients && (
          <div className="mt-2 space-y-2">
            {node.clients.map((client) => renderNode(client, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalResellers}</p>
            <p className="text-sm text-muted-foreground">Active Resellers</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{stats.totalClients}</p>
            <p className="text-sm text-muted-foreground">Resold Clients</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</p>
            <p className="text-sm text-muted-foreground">Total Resale Volume</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalRouteaceCommission)}</p>
            <p className="text-sm text-muted-foreground">RouteAce Commission (20%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Tree */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="w-5 h-5" />
            Reseller Attribution Tree
          </CardTitle>
        </CardHeader>
        <CardContent>
          {network.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No reseller relationships found</p>
              <p className="text-sm">Enterprise tier organizations can start reselling to build the network</p>
            </div>
          ) : (
            <div className="space-y-3">
              {network.map((node) => renderNode(node))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Recent Commission Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Commission ledger will populate as transactions occur</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerNetworkGraph;
