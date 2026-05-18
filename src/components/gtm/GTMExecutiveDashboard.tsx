import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, TrendingDown, AlertTriangle, Zap, Target, DollarSign,
  BarChart3, Activity, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from "recharts";
import { classifyIntent } from "@/hooks/useGTMBrain";

interface Props {
  signals: any[];
  opportunities: any[];
  matches: any[];
  supplyNodes: any[];
  conversations: any[];
  campaigns: any[];
  searchQueries: any[];
  pipelineStats: {
    new: number; contacted: number; qualified: number; negotiation: number;
    closedWon: number; closedLost: number; totalPipeline: number; wonRevenue: number;
  };
  creditBalance: number;
  osLabel: string;
}

const PIE_COLORS = ["#22c55e", "#f59e0b", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"];

export default function GTMExecutiveDashboard({
  signals, opportunities, matches, supplyNodes, conversations, campaigns, searchQueries, pipelineStats, creditBalance, osLabel,
}: Props) {
  // Derived metrics
  const totalDemandCaptured = signals.length + searchQueries.length;
  const highIntentCount = signals.filter(s => {
    const i = classifyIntent(s.content);
    return i.type === "active_buy" && i.confidence >= 0.7;
  }).length;
  const conversionRate = totalDemandCaptured > 0
    ? ((pipelineStats.closedWon / totalDemandCaptured) * 100).toFixed(1)
    : "0.0";
  const matchRate = opportunities.length > 0
    ? ((matches.length / opportunities.length) * 100).toFixed(0)
    : "0";
  const missedOpportunities = signals.filter(s => {
    const i = classifyIntent(s.content);
    return (i.type === "active_buy" || i.type === "problem_aware") && !s.is_processed;
  }).length;
  const avgMatchScore = matches.length > 0
    ? (matches.reduce((s, m) => s + (m.match_score || 0), 0) / matches.length * 100).toFixed(0)
    : "0";

  // Campaign totals
  const totalAdSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
  const totalConversions = campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const costPerLead = totalConversions > 0 ? (totalAdSpend / totalConversions) : 0;

  // Revenue leakage zones (signal fusion)
  const leakageZones = (() => {
    const regionSignals: Record<string, { complaints: number; demand: number; supply: number }> = {};
    signals.forEach(s => {
      const loc = (s.geo_location || "Unknown").split(",")[0].trim();
      if (!regionSignals[loc]) regionSignals[loc] = { complaints: 0, demand: 0, supply: 0 };
      const intent = classifyIntent(s.content);
      if (intent.type === "problem_aware") regionSignals[loc].complaints++;
      if (intent.type === "active_buy") regionSignals[loc].demand++;
    });
    supplyNodes.forEach(n => {
      const loc = n.city || n.state || "Unknown";
      if (!regionSignals[loc]) regionSignals[loc] = { complaints: 0, demand: 0, supply: 0 };
      regionSignals[loc].supply++;
    });
    return Object.entries(regionSignals)
      .filter(([_, v]) => v.complaints > 0 || (v.demand > 0 && v.supply === 0))
      .map(([region, v]) => ({
        region,
        ...v,
        severity: v.complaints >= 3 || (v.demand >= 2 && v.supply === 0) ? "critical" : "warning",
      }))
      .sort((a, b) => (b.complaints + b.demand) - (a.complaints + a.demand))
      .slice(0, 6);
  })();

  // Weekly signal trend (last 4 weeks)
  const weeklyTrend = (() => {
    const weeks: { week: string; signals: number; queries: number; won: number }[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + 7));
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const label = `W-${i === 0 ? "Now" : i}`;
      weeks.push({
        week: label,
        signals: signals.filter(s => new Date(s.created_at) >= weekStart && new Date(s.created_at) < weekEnd).length,
        queries: searchQueries.filter(s => new Date(s.created_at) >= weekStart && new Date(s.created_at) < weekEnd).length,
        won: opportunities.filter(o => o.stage === "closed_won" && o.closed_at && new Date(o.closed_at) >= weekStart && new Date(o.closed_at) < weekEnd).length,
      });
    }
    return weeks;
  })();

  // Stage distribution for pie
  const stageDistribution = [
    { name: "New", value: pipelineStats.new },
    { name: "Contacted", value: pipelineStats.contacted },
    { name: "Qualified", value: pipelineStats.qualified },
    { name: "Negotiation", value: pipelineStats.negotiation },
    { name: "Won", value: pipelineStats.closedWon },
    { name: "Lost", value: pipelineStats.closedLost },
  ].filter(s => s.value > 0);

  return (
    <div className="space-y-4">
      {/* Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KPICard icon={<Zap className="h-4 w-4 text-amber-400" />} title="Demand Captured" value={totalDemandCaptured} subtitle={`${highIntentCount} high-intent`} trend={highIntentCount > 0 ? "up" : undefined} />
        <KPICard icon={<Target className="h-4 w-4 text-green-400" />} title="Conversion Rate" value={`${conversionRate}%`} subtitle={`${pipelineStats.closedWon} deals won`} trend={parseFloat(conversionRate) > 5 ? "up" : "down"} />
        <KPICard icon={<DollarSign className="h-4 w-4 text-emerald-400" />} title="Won Revenue" value={`₦${(pipelineStats.wonRevenue / 1e6).toFixed(1)}M`} subtitle={`Pipeline: ₦${(pipelineStats.totalPipeline / 1e6).toFixed(1)}M`} trend="up" />
        <KPICard icon={<AlertTriangle className="h-4 w-4 text-red-400" />} title="Missed Opportunities" value={missedOpportunities} subtitle="Unprocessed high-intent" trend={missedOpportunities > 5 ? "down" : undefined} critical={missedOpportunities > 5} />
        <KPICard icon={<Activity className="h-4 w-4 text-blue-400" />} title="Match Rate" value={`${matchRate}%`} subtitle={`Avg score: ${avgMatchScore}%`} trend={parseInt(matchRate) > 50 ? "up" : "down"} />
        <KPICard icon={<BarChart3 className="h-4 w-4 text-purple-400" />} title="Cost Per Lead" value={costPerLead > 0 ? `₦${costPerLead.toFixed(0)}` : "-"} subtitle={`Ad spend: ₦${(totalAdSpend / 1000).toFixed(0)}K`} trend={costPerLead < 3000 && costPerLead > 0 ? "up" : undefined} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Weekly Demand Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={weeklyTrend}>
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="signals" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} name="Signals" />
                <Area type="monotone" dataKey="queries" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} name="Searches" />
                <Area type="monotone" dataKey="won" stackId="2" stroke="#22c55e" fill="#22c55e" fillOpacity={0.5} name="Won" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pipeline Distribution</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={stageDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
                  label={({ name, value }) => `${name} (${value})`}>
                  {stageDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Supply Coverage</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Active Nodes</span>
                <span className="font-bold">{supplyNodes.filter(n => n.is_active).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Open Conversations</span>
                <span className="font-bold">{conversations.filter(c => c.status === "active").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pending Matches</span>
                <span className="font-bold">{matches.filter(m => m.status === "pending").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Credit Balance</span>
                <span className="font-bold font-mono">{creditBalance}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Campaigns Active</span>
                <span className="font-bold">{campaigns.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Leakage Zones (Signal Fusion) */}
      {leakageZones.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Revenue Leakage Zones - Signal Fusion Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {leakageZones.map((zone, i) => (
                <div key={i} className={`p-3 rounded-lg border ${zone.severity === "critical" ? "border-red-500/40 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{zone.region}</span>
                    <Badge className={zone.severity === "critical" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}>
                      {zone.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {zone.complaints > 0 && <p>🔴 {zone.complaints} service complaint{zone.complaints > 1 ? "s" : ""}</p>}
                    {zone.demand > 0 && <p>🟡 {zone.demand} unmet demand signal{zone.demand > 1 ? "s" : ""}</p>}
                    {zone.supply === 0 && <p>⚠️ No supply nodes in this region</p>}
                    {zone.supply > 0 && <p>✅ {zone.supply} supply node{zone.supply > 1 ? "s" : ""} available</p>}
                  </div>
                  {zone.complaints > 0 && zone.demand > 0 && (
                    <p className="text-[10px] text-red-400 mt-1 font-medium">
                      High ad engagement + delivery complaints = Revenue leakage
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPICard({ icon, title, value, subtitle, trend, critical }: {
  icon: React.ReactNode; title: string; value: string | number; subtitle: string;
  trend?: "up" | "down"; critical?: boolean;
}) {
  return (
    <Card className={critical ? "border-red-500/30" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          {icon}
          {trend === "up" && <ArrowUpRight className="h-3 w-3 text-green-400" />}
          {trend === "down" && <ArrowDownRight className="h-3 w-3 text-red-400" />}
        </div>
        <div className="text-xl font-bold">{value}</div>
        <div className="text-[10px] text-muted-foreground">{title}</div>
        <div className="text-[10px] text-muted-foreground/60 mt-0.5">{subtitle}</div>
      </CardContent>
    </Card>
  );
}
