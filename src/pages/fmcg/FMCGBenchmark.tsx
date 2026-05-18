import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";

const benchmarks = [
  { metric: "Avg Stockout Rate", yours: 5.8, market: 8.2, unit: "%", better: true },
  { metric: "Avg Distributor Margin", yours: 14.2, market: 12.8, unit: "%", better: true },
  { metric: "Sales Velocity (units/outlet/week)", yours: 142, market: 118, unit: "", better: true },
  { metric: "Channel Profitability", yours: 18.4, market: 15.6, unit: "%", better: true },
  { metric: "Credit Default Rate", yours: 4.2, market: 6.8, unit: "%", better: true },
  { metric: "Delivery On-Time Rate", yours: 91.3, market: 84.5, unit: "%", better: true },
  { metric: "Fill Rate", yours: 94.2, market: 89.1, unit: "%", better: true },
  { metric: "Reconciliation Speed (hours)", yours: 4.2, market: 18.6, unit: "h", better: true },
];

const FMCGBenchmark = () => {
  return (
    <FMCGLayout title="Pan-African FMCG Benchmark" subtitle="Anonymized industry comparison across Africa">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="border-2 border-green-200 bg-green-50/50">
          <CardContent className="pt-6 text-center">
            <Globe className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <p className="text-4xl font-bold text-green-700">87th</p>
            <p className="text-sm text-muted-foreground mt-1">Percentile Overall</p>
            <p className="text-xs text-green-600 mt-2">You outperform 87% of FMCG operators in Africa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <p className="text-4xl font-bold">8/8</p>
            <p className="text-sm text-muted-foreground mt-1">Metrics Above Market</p>
            <p className="text-xs text-blue-600 mt-2">All tracked metrics exceed market average</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your Performance vs Market Average</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4">
            {benchmarks.map((b) => {
              const diff = b.metric.includes("Default") || b.metric.includes("Stockout") || b.metric.includes("hours")
                ? b.market - b.yours
                : b.yours - b.market;
              const pctDiff = Math.abs(((b.yours - b.market) / b.market) * 100).toFixed(1);

              return (
                <div key={b.metric} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className="flex-1 font-medium">{b.metric}</div>
                  <div className="w-24 text-right">
                    <p className="font-bold">{b.yours}{b.unit}</p>
                    <p className="text-xs text-muted-foreground">You</p>
                  </div>
                  <div className="w-24 text-right">
                    <p className="font-medium text-muted-foreground">{b.market}{b.unit}</p>
                    <p className="text-xs text-muted-foreground">Market</p>
                  </div>
                  <div className="w-28 flex items-center gap-1">
                    {diff > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : diff < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Minus className="w-4 h-4 text-gray-400" />
                    )}
                    <Badge variant={diff > 0 ? "default" : "destructive"}>
                      {diff > 0 ? "+" : ""}{pctDiff}%
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </FMCGLayout>
  );
};

export default FMCGBenchmark;
