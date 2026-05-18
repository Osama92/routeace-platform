/**
 * Generic empty-state for data-backed dashboards.
 * No fake data — show an honest "nothing here yet" with optional CTA.
 */
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DataZeroStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function DataZeroState({
  icon: Icon = Inbox,
  title = "No data yet",
  description = "This view will populate as soon as live data is recorded.",
  actionLabel,
  onAction,
  className = "",
}: DataZeroStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-10 text-center max-w-sm mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default DataZeroState;
