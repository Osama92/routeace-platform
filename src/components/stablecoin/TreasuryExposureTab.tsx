import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp } from "lucide-react";

const exposureData = [
  { token: "USDT", balance: 189500, pct: 52, volatility: "Low" },
  { token: "USDC", balance: 124300, pct: 34, volatility: "Low" },
  { token: "EURC", balance: 54200, pct: 14, volatility: "Medium" },
];

const recommendations = [
  { action: "Convert $50,000 USDT → NGN", reason: "NGN strengthening, lock favorable rate", priority: "high" },
  { action: "Hold EURC position", reason: "EUR/GBP corridor stable, no urgency", priority: "low" },
  { action: "Rebalance USDC concentration", reason: "34% exceeds single-token threshold of 30%", priority: "medium" },
  { action: "Enable auto-convert on Tron wallet", reason: "Manual conversions causing 0.3% spread loss", priority: "medium" },
];

const TreasuryExposureTab = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Digital Asset Exposure</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {exposureData.map((a, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{a.token}</Badge>
                <span className="font-semibold">${a.balance.toLocaleString()}</span>
              </div>
              <span className="text-sm text-muted-foreground">{a.pct}% of total</span>
            </div>
            <Progress value={a.pct} className="h-2" />
            <p className="text-xs text-muted-foreground">Volatility: {a.volatility}</p>
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Treasury AI Recommendations</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {recommendations.map((r, i) => (
          <div key={i} className="border rounded-lg p-3 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{r.action}</span>
              <Badge className={
                r.priority === "high" ? "bg-destructive/10 text-destructive" :
                r.priority === "medium" ? "bg-amber-500/10 text-amber-500" :
                "bg-muted text-muted-foreground"
              }>{r.priority}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.reason}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default TreasuryExposureTab;
