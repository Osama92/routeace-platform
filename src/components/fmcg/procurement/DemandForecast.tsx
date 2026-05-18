import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp } from "lucide-react";

const demandForecasts = [
  { sku: "Indomie Chicken 70g", currentDemand: 4200, forecastNext7d: 4800, forecastNext30d: 18500, seasonality: "Ramadan spike", confidence: 92 },
  { sku: "Peak Milk 400g", currentDemand: 2800, forecastNext7d: 3100, forecastNext30d: 12400, seasonality: "School resumption", confidence: 87 },
  { sku: "Dangote Sugar 500g", currentDemand: 3500, forecastNext7d: 5200, forecastNext30d: 22000, seasonality: "Festive season", confidence: 94 },
  { sku: "Golden Penny Flour 2kg", currentDemand: 1800, forecastNext7d: 2100, forecastNext30d: 8200, seasonality: "Stable", confidence: 81 },
  { sku: "Milo 500g", currentDemand: 1200, forecastNext7d: 1600, forecastNext30d: 6800, seasonality: "Promo period", confidence: 76 },
];

const DemandForecast = () => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> AI Demand Forecasting</CardTitle></CardHeader>
    <CardContent>
      <div className="space-y-4">
        {demandForecasts.map((d) => (
          <div key={d.sku} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{d.sku}</h3>
              <Badge variant="outline">{d.seasonality}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Current Weekly</p>
                <p className="text-lg font-bold">{d.currentDemand.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next 7 Days</p>
                <p className={`text-lg font-bold ${d.forecastNext7d > d.currentDemand ? "text-orange-600" : "text-green-600"}`}>
                  {d.forecastNext7d.toLocaleString()}
                  <span className="text-xs ml-1">({d.forecastNext7d > d.currentDemand ? "+" : ""}{Math.round(((d.forecastNext7d - d.currentDemand) / d.currentDemand) * 100)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next 30 Days</p>
                <p className="text-lg font-bold">{d.forecastNext30d.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">AI Confidence</p>
                <div className="flex items-center gap-2">
                  <Progress value={d.confidence} className="h-2 flex-1" />
                  <span className={`text-xs font-bold ${d.confidence > 90 ? "text-green-600" : d.confidence > 80 ? "text-foreground" : "text-orange-600"}`}>{d.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default DemandForecast;
