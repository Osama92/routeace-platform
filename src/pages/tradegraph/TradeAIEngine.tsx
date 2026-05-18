import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Brain, TrendingUp, MapPin, AlertTriangle, Lightbulb, Target, Zap, Globe, Store, Truck, Ship, Package } from "lucide-react";

const aiPredictions = [
  { insight: "High demand growth for beverages detected in Northern Nigeria with limited distribution coverage", confidence: 94, category: "Market Opportunity", impact: "₦2.4B potential", icon: TrendingUp, color: "text-emerald-500" },
  { insight: "Cocoa export prices likely to increase 18% in Q2 due to West African supply constraints", confidence: 88, category: "Price Signal", impact: "$4.2M opportunity", icon: Globe, color: "text-info" },
  { insight: "Ibadan has 58K retailers but only 128 distributors - highest gap-to-density ratio in Nigeria", confidence: 96, category: "Distribution Gap", impact: "Critical", icon: AlertTriangle, color: "text-amber-500" },
  { insight: "Nairobi-Kampala corridor showing 32% growth - recommend capacity expansion", confidence: 82, category: "Corridor Growth", impact: "KSh 1.8B potential", icon: Truck, color: "text-purple-500" },
  { insight: "Building materials demand in Abuja projected to surge 40% due to new housing projects", confidence: 91, category: "Demand Forecast", impact: "₦3.6B opportunity", icon: Package, color: "text-primary" },
  { insight: "Lagos-Rotterdam shipping route underutilized - sesame export window in next 60 days", confidence: 86, category: "Export Window", impact: "$2.8M opportunity", icon: Ship, color: "text-rose-500" },
];

const recommendations = [
  { role: "Distributors", recs: ["Expand into Ibadan - 58K retailers, only 54% covered", "Add cold chain capacity for Kano pharmaceutical corridor", "Partner with 3PL providers on Lagos-Abuja route"] },
  { role: "Suppliers", recs: ["Northern Nigeria shows highest growth for agri-inputs (+22%)", "Cosmetics demand surging in PH waterfront cluster (+28%)", "Building materials orders accelerating in Abuja CBD"] },
  { role: "Exporters", recs: ["Target Rotterdam for sesame - best margin window in 6 months", "Dubai market showing strong cashew demand signals", "Consider Mombasa as alternative export port for East Africa"] },
  { role: "Logistics", recs: ["Optimize Ore toll plaza routing - saves 2.4 hours per trip", "Add Lokoja bypass to route planning algorithms", "Increase fleet on Mombasa-Nairobi corridor (+32% demand)"] },
];

const networkEffects = [
  { metric: "New Nodes This Week", value: "8,420", delta: "+12%", description: "Retailers, distributors, and exporters joining the network" },
  { metric: "New Edges Formed", value: "24,800", delta: "+18%", description: "New trade relationships and supply contracts" },
  { metric: "Graph Density", value: "0.847", delta: "+0.02", description: "Network connectivity strength - higher is better" },
  { metric: "Prediction Accuracy", value: "91.4%", delta: "+1.2%", description: "AI model accuracy on 30-day forecasts" },
];

const TradeAIEngine = () => (
  <DashboardLayout title="Trade Intelligence AI" subtitle="AI-powered predictions, recommendations, and network effect analysis">
    <div className="space-y-6">
      {/* Network Effect Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {networkEffects.map((n) => (
          <Card key={n.metric}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{n.metric}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold text-foreground">{n.value}</p>
                <span className="text-xs text-emerald-500 font-semibold">{n.delta}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{n.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2"><Brain className="w-4 h-4 text-primary" /> AI Trade Predictions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiPredictions.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="p-4 rounded-xl bg-muted/30 border border-border/50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5"><p.icon className={`w-5 h-5 ${p.color}`} /></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{p.insight}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                    <span className="text-xs text-muted-foreground">Confidence: {p.confidence}%</span>
                    <Badge className="bg-primary/10 text-primary text-[10px]">{p.impact}</Badge>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Strategic Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {recommendations.map((r) => (
          <Card key={r.role}>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> For {r.role}</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {r.recs.map((rec, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-sm text-foreground">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  </DashboardLayout>
);

export default TradeAIEngine;
