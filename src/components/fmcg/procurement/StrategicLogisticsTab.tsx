import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Truck, Route, Phone, MessageCircle, TrendingUp, AlertTriangle, CheckCircle, MapPin } from "lucide-react";

const transportModes = [
  {
    corridor: "Lagos → Ibadan",
    modes: [
      { mode: "Van (owned)", cost: "₦185/km", transit: "3.2 hrs", reliability: 94, co2: "Low", recommended: true },
      { mode: "3PL Truck", cost: "₦142/km", transit: "4.1 hrs", reliability: 86, co2: "Medium", recommended: false },
      { mode: "Rail + Last Mile", cost: "₦98/km", transit: "6.5 hrs", reliability: 78, co2: "Very Low", recommended: false },
    ],
    aiPick: "Van (owned) - reliability premium justifies 30% cost increase for perishables",
  },
  {
    corridor: "Lagos → Kano",
    modes: [
      { mode: "Heavy Truck (20T)", cost: "₦92/km", transit: "18 hrs", reliability: 82, co2: "High", recommended: false },
      { mode: "Rail Freight", cost: "₦54/km", transit: "24 hrs", reliability: 71, co2: "Low", recommended: false },
      { mode: "Hybrid (Rail + Van)", cost: "₦68/km", transit: "22 hrs", reliability: 88, co2: "Medium", recommended: true },
    ],
    aiPick: "Hybrid - optimal cost-reliability balance for non-perishable staples",
  },
];

const repRouteOptimization = [
  {
    rep: "Adebayo Kunle",
    territory: "Lagos Island",
    currentStops: 18,
    optimizedStops: 22,
    currentDistance: "42 km",
    optimizedDistance: "36 km",
    timeSaved: "1.4 hrs",
    revenueGain: "+₦840K",
    coverage: 78,
    optimalCoverage: 94,
  },
  {
    rep: "Chioma Obi",
    territory: "Lagos Mainland",
    currentStops: 15,
    optimizedStops: 19,
    currentDistance: "38 km",
    optimizedDistance: "31 km",
    timeSaved: "1.1 hrs",
    revenueGain: "+₦620K",
    coverage: 72,
    optimalCoverage: 88,
  },
  {
    rep: "Ibrahim Musa",
    territory: "Ogun Central",
    currentStops: 12,
    optimizedStops: 14,
    currentDistance: "65 km",
    optimizedDistance: "52 km",
    timeSaved: "2.2 hrs",
    revenueGain: "+₦380K",
    coverage: 64,
    optimalCoverage: 82,
  },
];

const conversationInsights = [
  {
    source: "Field call - Retailer #R-2841",
    signal: "Requested smaller pack sizes for sugar - affordability concern",
    category: "Product Gap",
    actionable: true,
    impact: "High",
    recommendation: "Launch 250g Dangote Sugar SKU for Tier-3 outlets",
  },
  {
    source: "WhatsApp - Distributor Lagos East",
    signal: "Competitor offering 5% bulk discount on cooking oil",
    category: "Competitive Intel",
    actionable: true,
    impact: "High",
    recommendation: "Counter with loyalty bonus on next 3 orders",
  },
  {
    source: "Call transcript - Rep #SR-14",
    signal: "Multiple retailers asking for credit extension beyond 14 days",
    category: "Credit Demand",
    actionable: true,
    impact: "Medium",
    recommendation: "Review credit policy for Platinum-tier outlets only",
  },
  {
    source: "Email - Regional Manager South-East",
    signal: "New wholesale market opening in Onitsha - high foot traffic",
    category: "Expansion Signal",
    actionable: true,
    impact: "High",
    recommendation: "Deploy territory mapping team within 2 weeks",
  },
  {
    source: "Field call - Retailer #R-1205",
    signal: "Complaints about damaged packaging on flour deliveries",
    category: "Quality Issue",
    actionable: true,
    impact: "Medium",
    recommendation: "Audit loading process at Lagos DC; switch to reinforced pallets",
  },
];

const StrategicLogisticsTab = () => (
  <div className="space-y-6">
    {/* Transport Mode Optimization */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Multi-Modal Transport Optimizer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {transportModes.map((corridor) => (
            <div key={corridor.corridor} className="border rounded-lg overflow-hidden">
              <div className="p-3 bg-muted/50 flex items-center gap-2">
                <Route className="w-4 h-4 text-primary" />
                <h4 className="font-semibold text-sm">{corridor.corridor}</h4>
              </div>
              <div className="p-4">
                <div className="overflow-x-auto mb-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Mode</th>
                        <th className="pb-2 font-medium">Cost</th>
                        <th className="pb-2 font-medium">Transit</th>
                        <th className="pb-2 font-medium">Reliability</th>
                        <th className="pb-2 font-medium">CO₂</th>
                        <th className="pb-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {corridor.modes.map((m) => (
                        <tr key={m.mode} className={`border-b last:border-0 ${m.recommended ? "bg-primary/5" : ""}`}>
                          <td className="py-2 font-medium">{m.mode}</td>
                          <td className="py-2">{m.cost}</td>
                          <td className="py-2">{m.transit}</td>
                          <td className="py-2">
                            <div className="flex items-center gap-1">
                              <Progress value={m.reliability} className="h-1.5 w-12" />
                              <span className="text-xs font-bold">{m.reliability}%</span>
                            </div>
                          </td>
                          <td className="py-2">
                            <Badge variant={m.co2 === "Very Low" || m.co2 === "Low" ? "default" : "secondary"} className="text-xs">{m.co2}</Badge>
                          </td>
                          <td className="py-2">
                            {m.recommended && <Badge className="text-xs"><CheckCircle className="w-3 h-3 mr-1" />AI Pick</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                  <TrendingUp className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-primary font-medium">{corridor.aiPick}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Rep Route Optimization */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Sales Rep Route Intelligence</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {repRouteOptimization.map((r) => (
            <div key={r.rep} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold">{r.rep}</h4>
                  <p className="text-xs text-muted-foreground">{r.territory}</p>
                </div>
                <Badge variant="default" className="text-xs">{r.revenueGain} potential</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Stops</p>
                  <p className="font-medium">{r.currentStops} → <span className="text-primary font-bold">{r.optimizedStops}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Distance</p>
                  <p className="font-medium">{r.currentDistance} → <span className="text-green-600 font-bold">{r.optimizedDistance}</span></p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Time Saved</p>
                  <p className="font-bold text-green-600">{r.timeSaved}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Coverage</p>
                  <div className="flex items-center gap-1">
                    <Progress value={r.coverage} className="h-2 flex-1" />
                    <span className="text-xs font-bold">{r.coverage}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">AI Optimal</p>
                  <div className="flex items-center gap-1">
                    <Progress value={r.optimalCoverage} className="h-2 flex-1" />
                    <span className="text-xs font-bold text-primary">{r.optimalCoverage}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Conversation Intelligence */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> Conversation Intelligence Engine</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {conversationInsights.map((c, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{c.source}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{c.category}</Badge>
                  <Badge variant={c.impact === "High" ? "destructive" : "secondary"} className="text-xs">{c.impact}</Badge>
                </div>
              </div>
              <p className="text-sm font-medium mb-2">{c.signal}</p>
              <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                <TrendingUp className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary">{c.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default StrategicLogisticsTab;
