import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, addMonths, addWeeks, addYears } from "date-fns";

export type PeriodType = "week" | "month" | "year" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  periodType: PeriodType;
}

interface AnalyticsDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function getRange(type: PeriodType, offset: number): DateRange {
  const now = new Date();
  let anchor: Date;
  let start: Date;
  let end: Date;
  let label: string;

  switch (type) {
    case "week":
      anchor = offset === 0 ? now : (offset > 0 ? addWeeks(now, offset) : subWeeks(now, Math.abs(offset)));
      start = startOfWeek(anchor, { weekStartsOn: 1 });
      end = endOfWeek(anchor, { weekStartsOn: 1 });
      label = `Week of ${format(start, "MMM dd")} – ${format(end, "MMM dd, yyyy")}`;
      break;
    case "month":
      anchor = offset === 0 ? now : (offset > 0 ? addMonths(now, offset) : subMonths(now, Math.abs(offset)));
      start = startOfMonth(anchor);
      end = endOfMonth(anchor);
      label = format(anchor, "MMMM yyyy");
      break;
    case "year":
      anchor = offset === 0 ? now : (offset > 0 ? addYears(now, offset) : subYears(now, Math.abs(offset)));
      start = startOfYear(anchor);
      end = endOfYear(anchor);
      label = format(anchor, "yyyy");
      break;
    default:
      start = subDays(now, 14);
      end = now;
      label = "Last 14 days";
  }
  return { start, end, label, periodType: type };
}

export function useAnalyticsDateFilter(initialPeriod: PeriodType = "month") {
  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriod);
  const [offset, setOffset] = useState(0);

  const range = useMemo(() => getRange(periodType, offset), [periodType, offset]);

  const goBack = () => setOffset(o => o - 1);
  const goForward = () => { if (offset < 0) setOffset(o => o + 1); };
  const changePeriod = (p: PeriodType) => { setPeriodType(p); setOffset(0); };

  return { range, periodType, offset, goBack, goForward, changePeriod };
}

export default function AnalyticsDateFilter({ value, onChange }: AnalyticsDateFilterProps & {
  periodType: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  onBack: () => void;
  onForward: () => void;
  canGoForward: boolean;
}) {
  return null; // Use inline version below
}

export function AnalyticsDateFilterBar({
  range,
  periodType,
  onPeriodChange,
  onBack,
  onForward,
  canGoForward,
}: {
  range: DateRange;
  periodType: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  onBack: () => void;
  onForward: () => void;
  canGoForward: boolean;
}) {
  return (
    <div className="flex items-center gap-3 flex-wrap mb-6">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {(["week", "month", "year"] as PeriodType[]).map(p => (
          <Button
            key={p}
            size="sm"
            variant={periodType === p ? "default" : "ghost"}
            className="text-xs capitalize h-7"
            onClick={() => onPeriodChange(p)}
          >
            {p}
          </Button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={onBack}>
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>
        <div className="flex items-center gap-1.5 text-sm font-medium min-w-[180px] justify-center">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {range.label}
        </div>
        <Button size="icon" variant="outline" className="h-7 w-7" onClick={onForward} disabled={!canGoForward}>
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
