import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Target, MapPin, TrendingUp, Users, Package, DollarSign,
  ArrowUpRight, BarChart3, Zap, Globe, Brain,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

// Live expansion opportunities come from the territory analytics service.
// Empty until backend wired so the UI surfaces an honest empty state.
interface ExpansionOpportunity {
  territory: string;
  state: string;
  score: number;
  outlets: number;
  coverage: string;
  demand: string;
  infra: string;
  opportunity: string;
  reason: string;
  competitors: number;
}
const expansionOpportunities: ExpansionOpportunity[] = [];

// Scoring-model weights are configuration, not data — kept as-is.
const factorData = [
  { factor: "Retail Density", weight: 25 },
  { factor: "Demand Patterns", weight: 20 },
  { factor: "Coverage Gaps", weight: 20 },
  { factor: "Infrastructure", weight: 15 },
  { factor: "Purchasing Power", weight: 10 },
  { factor: "Competition", weight: 10 },
];


import { useAuth } from "@/contexts/AuthContext";
import { ZeroState } from "@/components/ui/ZeroState";
import { Lock } from "lucide-react";

const TerritoryExpansionEngine = () => {
  const { isSuperAdmin } = useAuth() as any;
  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Territory Expansion Engine" subtitle="Internal Glyde Systems planning tool">
        <ZeroState
          icon={Lock}
          title="Restricted to Glyde Systems team"
          description="Territory Expansion Engine is an internal planning workspace and is not available for tenant operations."
        />
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout title="Territory Expansion Engine" subtitle="AI-powered identification of high-potential expansion markets">
      <div className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Opportunities Found", value: String(expansionOpportunities.length), icon: Target, color: "text-emerald-500" },
            { label: "Total Market Value", value: "—", icon: DollarSign, color: "text-blue-500" },
            { label: "Unserved Outlets", value: "—", icon: MapPin, color: "text-amber-500" },
            { label: "Avg Expansion Score", value: "—", icon: Brain, color: "text-purple-500" },
          ].map((s) => (
            <Card key={s.label} className="bg-card/80 border-border/50">
              <CardContent className="p-3 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <p className="text-xl font-bold">{s.value}</p>
                <p className="text-[10px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Expansion Map Legend */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Expansion Opportunity Map</CardTitle>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500" /> Opportunity</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-500" /> Saturated</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500" /> Emerging</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/20 rounded-xl p-6 min-h-[250px] flex items-center justify-center">
              <svg viewBox="0 0 600 250" className="w-full max-w-xl">
                {/* Simplified Nigeria map regions */}
                {expansionOpportunities.map((opp, i) => {
                  const positions = [
                    { x: 200, y: 120 }, { x: 380, y: 180 }, { x: 280, y: 60 },
                    { x: 300, y: 150 }, { x: 360, y: 140 },
                  ];
                  const p = positions[i];
                  const color = opp.score >= 85 ? "hsl(142 76% 36%)" : opp.score >= 80 ? "hsl(217 91% 60%)" : "hsl(45 93% 47%)";
                  return (
                    <g key={opp.territory}>
                      <circle cx={p.x} cy={p.y} r={Math.max(12, opp.score / 4)} fill={color} opacity="0.3" />
                      <circle cx={p.x} cy={p.y} r="6" fill={color} />
                      <text x={p.x} y={p.y - 14} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9" fontWeight="600">{opp.territory}</text>
                      <text x={p.x} y={p.y + 20} textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="8">{opp.opportunity}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Opportunities List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Top Expansion Opportunities</h3>
          {expansionOpportunities.length === 0 && (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
              Live territory opportunities will appear once the expansion analytics service is connected.
            </CardContent></Card>
          )}
          {expansionOpportunities.map((opp, i) => (
            <motion.div key={opp.territory} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="font-bold text-sm text-primary">{opp.score}</span>
                      </div>
                      <div>
                        <p className="font-semibold">{opp.territory}, {opp.state}</p>
                        <p className="text-xs text-muted-foreground">{opp.reason}</p>
                      </div>
                    </div>
                    <Button size="sm"><Zap className="w-3 h-3 mr-1" /> Expand</Button>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    {[
                      { label: "Outlets", value: opp.outlets.toLocaleString(), icon: MapPin },
                      { label: "Coverage", value: opp.coverage, icon: Target },
                      { label: "Demand", value: opp.demand, icon: TrendingUp },
                      { label: "Opportunity", value: opp.opportunity, icon: DollarSign },
                      { label: "Competitors", value: String(opp.competitors), icon: Users },
                    ].map((m) => (
                      <div key={m.label} className="text-center p-2 bg-muted/30 rounded-lg">
                        <m.icon className="w-3 h-3 mx-auto mb-1 text-muted-foreground" />
                        <p className="text-sm font-bold">{m.value}</p>
                        <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Scoring Model */}
        <Card>
          <CardHeader><CardTitle className="text-sm">AI Scoring Model - Factor Weights</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={factorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" domain={[0, 30]} fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="factor" fontSize={10} stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip />
                <Bar dataKey="weight" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TerritoryExpansionEngine;
