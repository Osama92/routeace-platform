import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Route,
  Cpu,
  Target,
  Truck,
  BarChart3,
  Shield,
  Zap,
  Award,
  Info
} from "lucide-react";
import DemoDataBanner from "@/components/shared/DemoDataBanner";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer
} from "recharts";

interface CompetitorMetric {
  dimension: string;
  routeAce: number;
  onfleet: number;
  routific: number;
  bringg: number;
}

interface BenchmarkResult {
  metric: string;
  description: string;
  routeAceScore: number;
  competitorAvg: number;
  advantage: number;
  icon: any;
}

const COMPETITOR_DATA: CompetitorMetric[] = [
  { dimension: "Route Efficiency", routeAce: 92, onfleet: 85, routific: 88, bringg: 82 },
  { dimension: "Drop Density Handling", routeAce: 88, onfleet: 80, routific: 83, bringg: 78 },
  { dimension: "Multi-Vehicle Optimization", routeAce: 90, onfleet: 82, routific: 85, bringg: 86 },
  { dimension: "AI Explainability", routeAce: 95, onfleet: 65, routific: 70, bringg: 72 },
  { dimension: "Confidence Scoring", routeAce: 98, onfleet: 40, routific: 55, bringg: 50 },
  { dimension: "Dispatch-Route Linkage", routeAce: 94, onfleet: 78, routific: 82, bringg: 80 },
  { dimension: "Investor Analytics", routeAce: 96, onfleet: 45, routific: 50, bringg: 55 },
  { dimension: "Cost Intelligence", routeAce: 91, onfleet: 75, routific: 78, bringg: 76 }
];

const BENCHMARK_RESULTS: BenchmarkResult[] = [
  {
    metric: "Route Efficiency",
    description: "Optimized distance vs baseline routing",
    routeAceScore: 92,
    competitorAvg: 85,
    advantage: 8.2,
    icon: Route
  },
  {
    metric: "Drop Density Handling",
    description: "Efficient clustering of multi-drop deliveries",
    routeAceScore: 88,
    competitorAvg: 80,
    advantage: 10.0,
    icon: Target
  },
  {
    metric: "Multi-Vehicle Optimization",
    description: "Fleet-wide route coordination",
    routeAceScore: 90,
    competitorAvg: 84,
    advantage: 7.1,
    icon: Truck
  },
  {
    metric: "AI Explainability",
    description: "Transparent reasoning for route decisions",
    routeAceScore: 95,
    competitorAvg: 69,
    advantage: 37.7,
    icon: Cpu
  },
  {
    metric: "Confidence Scoring",
    description: "Risk-aware route assessment",
    routeAceScore: 98,
    competitorAvg: 48,
    advantage: 104.2,
    icon: Shield
  },
  {
    metric: "Dispatch-Route Linkage",
    description: "Seamless workflow integration",
    routeAceScore: 94,
    competitorAvg: 80,
    advantage: 17.5,
    icon: Zap
  },
  {
    metric: "Investor Analytics",
    description: "Board-ready reporting and metrics",
    routeAceScore: 96,
    competitorAvg: 50,
    advantage: 92.0,
    icon: BarChart3
  },
  {
    metric: "Cost Intelligence",
    description: "Detailed cost breakdown per route",
    routeAceScore: 91,
    competitorAvg: 76,
    advantage: 19.7,
    icon: Award
  }
];

const CompetitiveBenchmarking = () => {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>("all");

  const radarData = COMPETITOR_DATA.map(item => ({
    subject: item.dimension,
    RouteAce: item.routeAce,
    Onfleet: item.onfleet,
    Routific: item.routific,
    Bringg: item.bringg
  }));

  const overallAdvantage = BENCHMARK_RESULTS.reduce((sum, b) => sum + b.advantage, 0) / BENCHMARK_RESULTS.length;

  return (
    <div className="space-y-6">
      <DemoDataBanner
        feature="Competitive Benchmarking"
        message="Competitor scores (Onfleet, Routific, Bringg) are illustrative reference values based on public documentation - there is no live competitor data feed. RouteAce scores reflect internal capability assessment, not real-time tenant metrics."
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading flex items-center gap-2">
            <Award className="w-6 h-6 text-primary" />
            Competitive Benchmarking
          </h2>
          <p className="text-muted-foreground">
            Internal analysis comparing RouteAce route intelligence vs market leaders
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          Internal Reference Only
        </Badge>
      </div>

      {/* Overall Performance */}
      <Card className="glass-card bg-gradient-to-r from-primary/10 to-success/10 border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Performance Advantage</p>
              <p className="text-4xl font-bold text-primary">
                +{overallAdvantage.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">vs competitor average</p>
            </div>
            <div className="text-right">
              <Badge className="bg-success text-success-foreground text-lg px-4 py-2">
                <TrendingUp className="w-5 h-5 mr-2" />
                Industry Leader
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                Based on 8 key dimensions
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Radar Chart Comparison */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Multi-Dimensional Comparison</CardTitle>
          <CardDescription>
            RouteAce vs Onfleet, Routific, and Bringg across key capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid className="opacity-30" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar
                  name="RouteAce"
                  dataKey="RouteAce"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.4}
                  strokeWidth={2}
                />
                <Radar
                  name="Onfleet"
                  dataKey="Onfleet"
                  stroke="hsl(var(--muted-foreground))"
                  fill="hsl(var(--muted-foreground))"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Radar
                  name="Routific"
                  dataKey="Routific"
                  stroke="hsl(var(--warning))"
                  fill="hsl(var(--warning))"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Radar
                  name="Bringg"
                  dataKey="Bringg"
                  stroke="hsl(var(--destructive))"
                  fill="hsl(var(--destructive))"
                  fillOpacity={0.1}
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Benchmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BENCHMARK_RESULTS.map((benchmark) => {
          const Icon = benchmark.icon;
          const isLeading = benchmark.routeAceScore > benchmark.competitorAvg;
          
          return (
            <Card key={benchmark.metric} className="glass-card">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium">{benchmark.metric}</h4>
                      <Badge 
                        variant={isLeading ? "default" : "secondary"}
                        className={isLeading ? "bg-success" : ""}
                      >
                        {isLeading ? <TrendingUp className="w-3 h-3 mr-1" /> : <Minus className="w-3 h-3 mr-1" />}
                        {benchmark.advantage > 0 ? "+" : ""}{benchmark.advantage.toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{benchmark.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-20">RouteAce</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${benchmark.routeAceScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-10">{benchmark.routeAceScore}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-20 text-muted-foreground">Avg Comp.</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-muted-foreground/50 rounded-full transition-all"
                            style={{ width: `${benchmark.competitorAvg}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-10">{benchmark.competitorAvg}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Differentiators */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Key Differentiators</CardTitle>
          <CardDescription>What makes RouteAce unique in the market</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
              <Shield className="w-8 h-8 text-primary mb-3" />
              <h4 className="font-medium mb-1">AI Confidence Scoring</h4>
              <p className="text-sm text-muted-foreground">
                Industry-first 0-100% confidence scores with explainable risk factors. 
                Competitors lack this transparency.
              </p>
              <p className="text-xs text-primary mt-2">+104% vs competitors</p>
            </div>
            
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <BarChart3 className="w-8 h-8 text-success mb-3" />
              <h4 className="font-medium mb-1">Investor-Grade Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Board-ready dashboards with unit economics, cohort analysis, 
                and financial projections built-in.
              </p>
              <p className="text-xs text-success mt-2">+92% vs competitors</p>
            </div>
            
            <div className="p-4 bg-info/10 rounded-lg border border-info/20">
              <Cpu className="w-8 h-8 text-info mb-3" />
              <h4 className="font-medium mb-1">AI Explainability</h4>
              <p className="text-sm text-muted-foreground">
                Every route decision includes "why" explanations. 
                No black-box algorithms.
              </p>
              <p className="text-xs text-info mt-2">+38% vs competitors</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="text-xs text-muted-foreground text-center p-4 bg-muted/30 rounded-lg">
        <Info className="w-4 h-4 inline mr-1" />
        This benchmark uses anonymized internal simulation data for reference purposes only. 
        No external API calls or proprietary competitor data accessed. 
        Scores represent estimated capability comparisons based on public documentation.
      </div>
    </div>
  );
};

export default CompetitiveBenchmarking;
