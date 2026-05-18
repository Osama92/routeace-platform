import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, Clock, Shield } from "lucide-react";

interface SLAStatusIndicatorProps {
  status: "on_track" | "at_risk" | "breached" | null;
  deadline?: string;
  riskScore?: number;
  compact?: boolean;
}

export const SLAStatusIndicator = ({ 
  status, 
  deadline, 
  riskScore,
  compact = false 
}: SLAStatusIndicatorProps) => {
  if (!status) return null;

  const config = {
    on_track: {
      variant: "outline" as const,
      icon: CheckCircle,
      label: "On Track",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
    },
    at_risk: {
      variant: "secondary" as const,
      icon: Clock,
      label: "At Risk",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/30",
    },
    breached: {
      variant: "destructive" as const,
      icon: AlertTriangle,
      label: "Breached",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
    },
  };

  const currentConfig = config[status] || config.on_track;
  const Icon = currentConfig.icon;

  const hoursRemaining = deadline 
    ? Math.max(0, (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60))
    : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`w-8 h-8 rounded-full ${currentConfig.bgColor} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${currentConfig.color}`} />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">SLA: {currentConfig.label}</p>
              {hoursRemaining !== null && (
                <p className="text-xs">
                  {hoursRemaining > 0 
                    ? `${Math.floor(hoursRemaining)}h remaining`
                    : "Deadline passed"}
                </p>
              )}
              {riskScore !== undefined && (
                <p className="text-xs">Risk Score: {riskScore}%</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${currentConfig.bgColor} border ${currentConfig.borderColor}`}>
      <Icon className={`w-4 h-4 ${currentConfig.color}`} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${currentConfig.color}`}>
          SLA: {currentConfig.label}
        </p>
        {hoursRemaining !== null && hoursRemaining > 0 && (
          <p className="text-xs text-muted-foreground">
            {Math.floor(hoursRemaining)}h {Math.floor((hoursRemaining % 1) * 60)}m remaining
          </p>
        )}
      </div>
      {riskScore !== undefined && (
        <Badge variant={currentConfig.variant} className="text-xs">
          {riskScore}%
        </Badge>
      )}
    </div>
  );
};

interface SLAPenaltyBadgeProps {
  penaltyAmount: number;
  insuranceCoverage?: number;
  className?: string;
}

export const SLAPenaltyBadge = ({ 
  penaltyAmount, 
  insuranceCoverage = 0,
  className = "" 
}: SLAPenaltyBadgeProps) => {
  const netPenalty = penaltyAmount - insuranceCoverage;

  if (penaltyAmount <= 0) return null;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-500" />
        <span className="text-sm text-red-500 font-medium">
          SLA Penalty: ₦{penaltyAmount.toLocaleString()}
        </span>
      </div>
      {insuranceCoverage > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-3 h-3 text-green-500" />
          <span className="text-green-500">
            Insurance: -₦{insuranceCoverage.toLocaleString()}
          </span>
          <span className="text-muted-foreground">
            (Net: ₦{netPenalty.toLocaleString()})
          </span>
        </div>
      )}
    </div>
  );
};

export default SLAStatusIndicator;
