import { Crown, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { getRoleDisplay } from "@/lib/deptRoleDisplay";

interface SuperAdminBadgeProps {
  variant?: "inline" | "compact" | "full";
  className?: string;
}

export function SuperAdminBadge({ variant = "inline", className }: SuperAdminBadgeProps) {
  const { tenantMode } = useAuth();
  const display = getRoleDisplay("super_admin", tenantMode);

  if (variant === "compact") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            "flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg",
            className
          )}>
            <Crown className="h-3.5 w-3.5 text-white" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-semibold">{display.title}</p>
          <p className="text-xs text-muted-foreground">{display.description || "Full system access"}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "full") {
    return (
      <div className={cn(
        "flex items-center gap-2 rounded-lg bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 px-3 py-2",
        className
      )}>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg">
          <Crown className="h-4 w-4 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
            {display.badge}
          </span>
          <span className="text-xs text-muted-foreground">
            {tenantMode === "LOGISTICS_DEPARTMENT" ? "Department Lead" : "Company Owner"}
          </span>
        </div>
        <Shield className="ml-auto h-4 w-4 text-amber-500/50" />
      </div>
    );
  }

  // Default inline variant
  return (
    <Badge
      variant="outline"
      className={cn(
        "border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400",
        className
      )}
    >
      <Crown className="mr-1 h-3 w-3" />
      {display.badge}
    </Badge>
  );
}

export default SuperAdminBadge;
