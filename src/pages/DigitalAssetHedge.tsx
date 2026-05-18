import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertTriangle, Activity, PieChart } from "lucide-react";
import { DataZeroState } from "@/components/shared/DataZeroState";

type Exposure = {
  asset: string;
  exposure: number;
  hedgeRatio: number;
  volatility: number;
  risk: number;
  action: string;
};

// Live data wiring pending: backed by future `treasury_asset_exposure` table.
// Until then, render honest empty state — no fabricated risk numbers.
const exposures: Exposure[] = [];

const DigitalAssetHedge = () => {
  const totalRisk = exposures.length
    ? Math.round(exposures.reduce((s, e) => s + e.risk * (e.exposure / 100), 0))
    : 0;
  const avgHedge = exposures.length
    ? (exposures.reduce((s, e) => s + e.hedgeRatio * (e.exposure / 100), 0) * 100).toFixed(0)
    : "—";
  const alertCount = exposures.filter((e) => e.risk > 20).length;

  return (
    <DashboardLayout title="Digital Asset Hedge Engine" subtitle="Volatility protection & treasury rebalancing">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><PieChart className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Portfolio Risk</p><p className="text-2xl font-bold">{exposures.length ? `${totalRisk}/100` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><Shield className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Hedge Ratio</p><p className="text-2xl font-bold">{exposures.length ? `${avgHedge}%` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><AlertTriangle className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-sm text-muted-foreground">Risk Alerts</p><p className="text-2xl font-bold">{alertCount}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Activity className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-sm text-muted-foreground">Assets Tracked</p><p className="text-2xl font-bold">{exposures.length}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Treasury Exposure</CardTitle></CardHeader>
        <CardContent>
          <DataZeroState
            icon={PieChart}
            title="No treasury exposures recorded"
            description="Hedge positions, exposures, and rebalance signals will appear here once your treasury feeds are connected."
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default DigitalAssetHedge;
