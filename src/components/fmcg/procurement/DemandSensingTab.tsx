import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Radar, Zap, TrendingUp, AlertTriangle, Eye, BarChart3, Activity } from "lucide-react";

const demandSignals = [
  { source: "CRM Pipeline", signal: "₦18.2M new deals in Lagos East", impact: "high", skusAffected: 12, timestamp: "2 min ago", confidence: 94 },
  { source: "Weather API", signal: "Heatwave forecast - South-West region", impact: "medium", skusAffected: 5, timestamp: "15 min ago", confidence: 87 },
  { source: "ERP Orders", signal: "Unusual bulk order spike - Dangote Sugar", impact: "high", skusAffected: 1, timestamp: "28 min ago", confidence: 91 },
  { source: "Competitor Intel", signal: "Competitor stockout detected - Peak Milk segment", impact: "high", skusAffected: 3, timestamp: "1 hr ago", confidence: 78 },
  { source: "Social Listening", signal: "Ramadan prep trending - cooking oil + flour", impact: "medium", skusAffected: 8, timestamp: "2 hr ago", confidence: 72 },
];

const predictiveModels = [
  { sku: "Indomie Chicken 70g", currentForecast: 4800, mlAdjusted: 5340, delta: "+11.3%", drivers: ["Ramadan +18%", "Competitor exit +6%", "Weather neutral"], accuracy30d: 94, accuracyTrend: "up" },
  { sku: "Dangote Sugar 500g", currentForecast: 5200, mlAdjusted: 6100, delta: "+17.3%", drivers: ["Festive season +22%", "Price elasticity -5%"], accuracy30d: 91, accuracyTrend: "up" },
  { sku: "Peak Milk 400g", currentForecast: 3100, mlAdjusted: 3650, delta: "+17.7%", drivers: ["School resumption +12%", "Competitor stockout +8%"], accuracy30d: 88, accuracyTrend: "stable" },
  { sku: "Golden Penny Flour 2kg", currentForecast: 2100, mlAdjusted: 2450, delta: "+16.7%", drivers: ["Ramadan baking +20%", "Price increase -4%"], accuracy30d: 85, accuracyTrend: "up" },
];

const revenueIntel = [
  { territory: "Lagos Mainland", pipelineValue: "₦42.8M", winProbability: 78, flagged: false, sandbagged: 0, inflated: 1, healthScore: 88 },
  { territory: "Ogun State", pipelineValue: "₦18.4M", winProbability: 65, flagged: true, sandbagged: 2, inflated: 0, healthScore: 62 },
  { territory: "South-East", pipelineValue: "₦31.2M", winProbability: 72, flagged: false, sandbagged: 1, inflated: 1, healthScore: 74 },
  { territory: "Abuja FCT", pipelineValue: "₦24.6M", winProbability: 81, flagged: false, sandbagged: 0, inflated: 0, healthScore: 92 },
];

const DemandSensingTab = () => (
  <div className="space-y-6">
    {/* Real-time Signal Feed */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Radar className="w-5 h-5 text-primary" /> Real-Time Demand Signals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {demandSignals.map((s, i) => (
            <div key={i} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
              <div className={`w-2 h-2 rounded-full animate-pulse ${s.impact === "high" ? "bg-destructive" : "bg-yellow-500"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">{s.source}</Badge>
                  <span className="text-xs text-muted-foreground">{s.timestamp}</span>
                </div>
                <p className="text-sm font-medium truncate">{s.signal}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-muted-foreground">{s.skusAffected} SKUs</p>
                <div className="flex items-center gap-1">
                  <Progress value={s.confidence} className="h-1.5 w-16" />
                  <span className="text-xs font-bold">{s.confidence}%</span>
                </div>
              </div>
              <Badge variant={s.impact === "high" ? "destructive" : "secondary"} className="flex-shrink-0">{s.impact}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Predictive Demand Models */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /> ML-Adjusted Demand Models</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {predictiveModels.map((m) => (
            <div key={m.sku} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">{m.sku}</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">30d Accuracy: {m.accuracy30d}%</Badge>
                  <Badge variant={m.accuracyTrend === "up" ? "default" : "secondary"}>
                    {m.accuracyTrend === "up" ? "↑ Improving" : "→ Stable"}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Base Forecast</p>
                  <p className="text-lg font-bold">{m.currentForecast.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">ML-Adjusted</p>
                  <p className="text-lg font-bold text-primary">{m.mlAdjusted.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Delta</p>
                  <p className="text-lg font-bold text-orange-600">{m.delta}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.drivers.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{d}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Revenue Intelligence */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Eye className="w-5 h-5 text-primary" /> Revenue Pipeline Intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">Territory</th>
                <th className="pb-3 font-medium">Pipeline</th>
                <th className="pb-3 font-medium">Win Prob.</th>
                <th className="pb-3 font-medium">Sandbagged</th>
                <th className="pb-3 font-medium">Inflated</th>
                <th className="pb-3 font-medium">Health</th>
                <th className="pb-3 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {revenueIntel.map((r) => (
                <tr key={r.territory} className="border-b last:border-0">
                  <td className="py-3 font-medium">{r.territory}</td>
                  <td className="py-3 font-bold">{r.pipelineValue}</td>
                  <td className="py-3">{r.winProbability}%</td>
                  <td className="py-3"><span className={r.sandbagged > 0 ? "text-orange-600 font-bold" : "text-muted-foreground"}>{r.sandbagged}</span></td>
                  <td className="py-3"><span className={r.inflated > 0 ? "text-destructive font-bold" : "text-muted-foreground"}>{r.inflated}</span></td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <Progress value={r.healthScore} className="h-2 w-16" />
                      <span className={`text-xs font-bold ${r.healthScore > 80 ? "text-green-600" : r.healthScore > 65 ? "text-orange-600" : "text-destructive"}`}>{r.healthScore}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    {r.flagged && <AlertTriangle className="w-4 h-4 text-orange-500" />}
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

export default DemandSensingTab;
