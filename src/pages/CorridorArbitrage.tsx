import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, TrendingUp, Globe, RefreshCw, Zap } from "lucide-react";
import { useState } from "react";
import { DataZeroState } from "@/components/shared/DataZeroState";

type Corridor = {
  id: string;
  liquidity: number;
  spread: number;
  arbitrage: boolean;
};

// Live data wiring pending: backed by future `corridor_arbitrage_quotes` table.
const corridors: Corridor[] = [];

const CorridorArbitrage = () => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  };

  const activeArbitrageCount = corridors.filter((c) => c.arbitrage).length;
  const totalLiquidity = corridors.reduce((s, c) => s + c.liquidity, 0);
  const avgSpread = corridors.length
    ? corridors.reduce((s, c) => s + c.spread, 0) / corridors.length
    : 0;

  return (
    <DashboardLayout title="Stablecoin Corridor Arbitrage" subtitle="Cross-border settlement optimization via pricing inefficiencies">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><ArrowRightLeft className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Active Corridors</p><p className="text-2xl font-bold">{corridors.length}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Zap className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-sm text-muted-foreground">Arbitrage Opportunities</p><p className="text-2xl font-bold">{activeArbitrageCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Globe className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-sm text-muted-foreground">Total Liquidity</p><p className="text-2xl font-bold">{corridors.length ? `$${(totalLiquidity / 1e6).toFixed(1)}M` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><TrendingUp className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Spread</p><p className="text-2xl font-bold">{corridors.length ? `${avgSpread.toFixed(2)}%` : "—"}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Corridor Monitor</CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Rates
          </Button>
        </CardHeader>
        <CardContent>
          <DataZeroState
            icon={ArrowRightLeft}
            title="No corridor quotes yet"
            description="Cross-border on/off-ramp pricing and arbitrage signals will appear here once liquidity providers are connected."
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CorridorArbitrage;
