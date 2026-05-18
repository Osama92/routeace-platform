import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Shield, TrendingUp, Plus, CheckCircle } from "lucide-react";
import { DataZeroState } from "@/components/shared/DataZeroState";

type Token = {
  id: string;
  amount: number;
  yield: number;
  status: string;
  insured: boolean;
};

// Live data wiring pending: backed by future `trade_finance_tokens` table.
const tokens: Token[] = [];

const TradeFinanceTokens = () => {
  const totalIssuance = tokens.reduce((s, t) => s + t.amount, 0);
  const activeCount = tokens.filter((t) => t.status === "active").length;
  const avgYield = tokens.length
    ? (tokens.reduce((s, t) => s + t.yield, 0) / tokens.length).toFixed(1)
    : "—";
  const insuredCount = tokens.filter((t) => t.insured).length;

  return (
    <DashboardLayout title="On-Chain Trade Finance" subtitle="Tokenized freight-backed trade instruments">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Coins className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Issuance</p><p className="text-2xl font-bold">{tokens.length ? `₦${(totalIssuance / 1e6).toFixed(1)}M` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-sm text-muted-foreground">Active Tokens</p><p className="text-2xl font-bold">{tokens.length ? `${activeCount}/${tokens.length}` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-sm text-muted-foreground">Avg Yield</p><p className="text-2xl font-bold">{tokens.length ? `${avgYield}%` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-sm text-muted-foreground">Insurance Backed</p><p className="text-2xl font-bold">{tokens.length ? `${insuredCount}/${tokens.length}` : "—"}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Token Issuance Register</CardTitle>
          <Button size="sm" disabled><Plus className="w-4 h-4 mr-2" />Issue Token</Button>
        </CardHeader>
        <CardContent>
          <DataZeroState
            icon={Coins}
            title="No tokens issued yet"
            description="Tokenized freight receivables and trade-finance instruments will appear here once issuance begins."
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default TradeFinanceTokens;
