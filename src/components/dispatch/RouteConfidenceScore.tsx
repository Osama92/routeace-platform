import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  TrendingUp,
  Clock,
  MapPin,
  Car,
  Cloud,
  History,
  Info
} from "lucide-react";

export interface RouteConfidence {
  overall: number;
  band: "high" | "medium" | "low";
  factors: {
    historicalSuccess: number;
    trafficVolatility: number;
    dropDensity: number;
    driverWorkload: number;
    roadRisk: number;
    delayFrequency: number;
  };
  risks: {
    factor: string;
    severity: "low" | "medium" | "high";
    impact: number;
  }[];
  explanation: string;
}

interface RouteConfidenceScoreProps {
  confidence: RouteConfidence | null;
  compact?: boolean;
}

const RouteConfidenceScore = ({ confidence, compact = false }: RouteConfidenceScoreProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!confidence) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg text-center">
        <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">
          Generate a route to see AI confidence score
        </p>
      </div>
    );
  }

  const getBandColor = (band: string) => {
    switch (band) {
      case "high": return "bg-success text-success-foreground";
      case "medium": return "bg-warning text-warning-foreground";
      case "low": return "bg-destructive text-destructive-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getBandIcon = (band: string) => {
    switch (band) {
      case "high": return <ShieldCheck className="w-5 h-5" />;
      case "medium": return <AlertTriangle className="w-5 h-5" />;
      case "low": return <AlertCircle className="w-5 h-5" />;
      default: return <Info className="w-5 h-5" />;
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 85) return "bg-success";
    if (value >= 65) return "bg-warning";
    return "bg-destructive";
  };

  const factorLabels = {
    historicalSuccess: { label: "Historical Success", icon: History },
    trafficVolatility: { label: "Traffic Stability", icon: Car },
    dropDensity: { label: "Drop Density", icon: MapPin },
    driverWorkload: { label: "Driver Capacity", icon: Clock },
    roadRisk: { label: "Road Safety", icon: Cloud },
    delayFrequency: { label: "Delay History", icon: TrendingUp },
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Badge className={`${getBandColor(confidence.band)} gap-1`}>
                {getBandIcon(confidence.band)}
                <span className="font-bold">{confidence.overall}%</span>
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium mb-1">AI Route Confidence: {confidence.overall}%</p>
            <p className="text-xs text-muted-foreground">{confidence.explanation}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-primary/20">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                AI Route Confidence
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge className={`${getBandColor(confidence.band)} gap-1 text-lg px-3 py-1`}>
                  {getBandIcon(confidence.band)}
                  <span className="font-bold">{confidence.overall}%</span>
                </Badge>
                <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Confidence Explanation */}
            <div className={`p-3 rounded-lg ${
              confidence.band === "high" ? "bg-success/10 border border-success/20" :
              confidence.band === "medium" ? "bg-warning/10 border border-warning/20" :
              "bg-destructive/10 border border-destructive/20"
            }`}>
              <p className="text-sm">{confidence.explanation}</p>
            </div>

            {/* Factor Breakdown */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Confidence Factors
              </p>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(confidence.factors).map(([key, value]) => {
                  const factorInfo = factorLabels[key as keyof typeof factorLabels];
                  const Icon = factorInfo?.icon || Info;
                  return (
                    <div key={key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Icon className="w-3 h-3" />
                          {factorInfo?.label || key}
                        </span>
                        <span className="font-medium">{value}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(value)} transition-all`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Risk Factors */}
            {confidence.risks.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Risk Drivers
                </p>
                <div className="space-y-2">
                  {confidence.risks.map((risk, idx) => (
                    <div 
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        risk.severity === "high" ? "bg-destructive/10" :
                        risk.severity === "medium" ? "bg-warning/10" :
                        "bg-muted/50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {risk.severity === "high" ? <AlertCircle className="w-4 h-4 text-destructive" /> :
                         risk.severity === "medium" ? <AlertTriangle className="w-4 h-4 text-warning" /> :
                         <Info className="w-4 h-4 text-muted-foreground" />}
                        {risk.factor}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        -{risk.impact}%
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-success" />
                85-100% High
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-warning" />
                65-84% Medium
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-destructive" />
                {"<65% Low"}
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default RouteConfidenceScore;
