import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  ChevronDown,
  Truck,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  DollarSign,
  Navigation,
  Users,
  Zap,
  Target,
  Info,
  Flame
} from "lucide-react";

export interface RouteInsight {
  id: string;
  category: "grouping" | "vehicle" | "timing" | "risk" | "efficiency";
  title: string;
  description: string;
  confidence: number;
  impact: "positive" | "neutral" | "negative";
  metric?: {
    label: string;
    value: string;
    delta?: number;
  };
}

interface RouteInsightsPanelProps {
  routeName: string;
  totalDrops: number;
  estimatedDays: number;
  vehicleType: string;
  confidenceScore: number;
  profitMargin: number;
  utilizationPercent: number;
  totalDistance: number;
  insights?: RouteInsight[];
  riskFactors?: string[];
  expectedDelays?: string[];
  bufferRecommendation?: string;
}

const DEFAULT_INSIGHTS: RouteInsight[] = [
  {
    id: "1",
    category: "grouping",
    title: "Optimal Cluster Detected",
    description: "Orders are within a 4.2km radius, minimizing detour time",
    confidence: 92,
    impact: "positive",
    metric: { label: "Cluster Radius", value: "4.2km", delta: -12 }
  },
  {
    id: "2",
    category: "vehicle",
    title: "Vehicle Match",
    description: "15T truck is optimal for current load at 82% capacity",
    confidence: 88,
    impact: "positive",
    metric: { label: "Capacity Fit", value: "82%", delta: 0 }
  },
  {
    id: "3",
    category: "timing",
    title: "Wait Time Buffer",
    description: "2-hour wait per drop factored into ETA calculation",
    confidence: 85,
    impact: "neutral",
    metric: { label: "Buffer/Drop", value: "2 hrs" }
  }
];

const RouteInsightsPanel = ({
  routeName,
  totalDrops,
  estimatedDays,
  vehicleType,
  confidenceScore,
  profitMargin,
  utilizationPercent,
  totalDistance,
  insights = DEFAULT_INSIGHTS,
  riskFactors = [],
  expectedDelays = [],
  bufferRecommendation
}: RouteInsightsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "grouping": return Zap;
      case "vehicle": return Truck;
      case "timing": return Clock;
      case "risk": return AlertTriangle;
      case "efficiency": return TrendingUp;
      default: return Info;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "positive": return "text-success";
      case "negative": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 85) return "bg-success";
    if (score >= 65) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                AI Route Insights
                <Badge variant="outline" className="text-xs">Explainable</Badge>
              </CardTitle>
              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-0">
            {/* Route Summary */}
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-lg">{routeName}</h4>
                  <p className="text-sm text-muted-foreground">
                    {totalDrops} drops • {totalDistance}km • {estimatedDays} days
                  </p>
                </div>
                <Badge className={`${getConfidenceColor(confidenceScore)} text-white px-3 py-1`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {confidenceScore}% Confidence
                </Badge>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-2 bg-background/50 rounded text-center">
                  <Truck className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Vehicle</p>
                  <p className="font-semibold text-sm">{vehicleType}</p>
                </div>
                <div className="p-2 bg-background/50 rounded text-center">
                  <Target className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Utilization</p>
                  <p className="font-semibold text-sm">{utilizationPercent}%</p>
                </div>
                <div className="p-2 bg-background/50 rounded text-center">
                  <DollarSign className="w-4 h-4 mx-auto mb-1 text-success" />
                  <p className="text-xs text-muted-foreground">Margin</p>
                  <p className="font-semibold text-sm text-success">+{profitMargin}%</p>
                </div>
                <div className="p-2 bg-background/50 rounded text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">ETA</p>
                  <p className="font-semibold text-sm">{estimatedDays}d</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* AI Insights */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Why This Route Works
              </h4>

              <div className="space-y-2">
                {insights.map(insight => {
                  const Icon = getCategoryIcon(insight.category);
                  return (
                    <div 
                      key={insight.id}
                      className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg"
                    >
                      <div className={`p-2 rounded ${
                        insight.impact === "positive" ? "bg-success/10" :
                        insight.impact === "negative" ? "bg-destructive/10" :
                        "bg-muted"
                      }`}>
                        <Icon className={`w-4 h-4 ${getImpactColor(insight.impact)}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{insight.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {insight.confidence}% confidence
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        {insight.metric && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {insight.metric.label}: {insight.metric.value}
                              {insight.metric.delta !== undefined && (
                                <span className={insight.metric.delta >= 0 ? "text-success" : "text-destructive"}>
                                  {" "}({insight.metric.delta >= 0 ? "+" : ""}{insight.metric.delta}%)
                                </span>
                              )}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Factors */}
            {riskFactors.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning" />
                    Risk Factors to Watch
                  </h4>
                  <div className="space-y-2">
                    {riskFactors.map((risk, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-warning/10 rounded text-sm">
                        <Flame className="w-4 h-4 text-warning" />
                        <span>{risk}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Expected Delays */}
            {expectedDelays.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Expected Delays & Buffers
                  </h4>
                  <div className="space-y-2">
                    {expectedDelays.map((delay, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{delay}</span>
                      </div>
                    ))}
                  </div>
                  {bufferRecommendation && (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <p className="text-sm">
                        <strong>Recommendation:</strong> {bufferRecommendation}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Summary Statement */}
            <div className="p-4 bg-gradient-to-r from-primary/10 to-success/10 rounded-lg border border-primary/20">
              <p className="text-sm italic">
                "This route groups {totalDrops} orders within a concentrated area, 
                fits a {vehicleType} at {utilizationPercent}% utilization, 
                and completes in {estimatedDays} days including wait times. 
                {confidenceScore >= 85 
                  ? " High confidence score indicates reliable delivery."
                  : confidenceScore >= 65
                  ? " Moderate confidence - consider buffer time."
                  : " Low confidence - review route adjustments."}
                "
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default RouteInsightsPanel;
