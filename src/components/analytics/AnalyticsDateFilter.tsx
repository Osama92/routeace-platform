import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Calendar, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import {
  format, subDays, subWeeks, subMonths, subYears,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, addMonths, addWeeks, addYears,
  startOfDay, endOfDay,
} from "date-fns";

export type PeriodType = "week" | "month" | "year" | "all" | "custom";

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
  periodType: PeriodType;
}

/**
 * The earliest date the platform could hold data for. Used as the lower
 * bound for "All time" so inception-to-date does not depend on scanning
 * the database first — every real record falls comfortably inside it.
 */
const INCEPTION = new Date("2020-01-01T00:00:00Z");

function getRange(type: PeriodType, offset: number, custom?: { from?: Date; to?: Date }): DateRange {
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
    case "custom": {
      // A half-open selection (start picked, end not yet) is treated as a
      // single day so the view stays valid while the user is still choosing.
      const from = custom?.from ? startOfDay(custom.from) : startOfMonth(now);
      const to = custom?.to ? endOfDay(custom.to) : endOfDay(from);
      start = from;
      end = to;
      label = format(from, "dd MMM yyyy") === format(to, "dd MMM yyyy")
        ? format(from, "dd MMM yyyy")
        : `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`;
      break;
    }
    case "all":
    default:
      start = INCEPTION;
      end = endOfDay(now);
      label = "All time";
      break;
  }
  return { start, end, label, periodType: type };
}

export function useAnalyticsDateFilter(initialPeriod: PeriodType = "all") {
  const [periodType, setPeriodType] = useState<PeriodType>(initialPeriod);
  const [offset, setOffset] = useState(0);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});

  const range = useMemo(
    () => getRange(periodType, offset, customRange),
    [periodType, offset, customRange],
  );

  const goBack = () => setOffset(o => o - 1);
  const goForward = () => { if (offset < 0) setOffset(o => o + 1); };
  const changePeriod = (p: PeriodType) => { setPeriodType(p); setOffset(0); };
  const setCustom = (r: { from?: Date; to?: Date }) => {
    setCustomRange(r);
    setPeriodType("custom");
    setOffset(0);
  };

  return { range, periodType, offset, customRange, goBack, goForward, changePeriod, setCustom };
}

/**
 * Stepping backwards/forwards only makes sense for a fixed-length period.
 * "All time" and a custom range have nothing to step through.
 */
const STEPPABLE: PeriodType[] = ["week", "month", "year"];

export function AnalyticsDateFilterBar({
  range,
  periodType,
  onPeriodChange,
  onBack,
  onForward,
  canGoForward,
  customRange,
  onCustomChange,
}: {
  range: DateRange;
  periodType: PeriodType;
  onPeriodChange: (p: PeriodType) => void;
  onBack: () => void;
  onForward: () => void;
  canGoForward: boolean;
  customRange?: { from?: Date; to?: Date };
  onCustomChange?: (r: { from?: Date; to?: Date }) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const isSteppable = STEPPABLE.includes(periodType);

  return (
    <div className="flex items-center gap-3 flex-wrap mb-6">
      <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
        {(["all", "week", "month", "year"] as PeriodType[]).map(p => (
          <Button
            key={p}
            size="sm"
            variant={periodType === p ? "default" : "ghost"}
            className="text-xs capitalize h-7"
            onClick={() => onPeriodChange(p)}
          >
            {p === "all" ? "All time" : p}
          </Button>
        ))}

        {onCustomChange && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant={periodType === "custom" ? "default" : "ghost"}
                className="text-xs h-7 gap-1"
              >
                <CalendarRange className="w-3.5 h-3.5" />
                Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarPicker
                mode="range"
                selected={customRange as any}
                onSelect={(r: any) => onCustomChange({ from: r?.from, to: r?.to })}
                numberOfMonths={2}
                defaultMonth={customRange?.from ?? subMonths(new Date(), 1)}
                className="pointer-events-auto"
              />
              <div className="flex items-center justify-between gap-2 border-t p-2">
                <span className="text-xs text-muted-foreground px-1">
                  {customRange?.from && customRange?.to
                    ? `${format(customRange.from, "dd MMM yyyy")} – ${format(customRange.to, "dd MMM yyyy")}`
                    : "Pick a start and end date"}
                </span>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!customRange?.from || !customRange?.to}
                  onClick={() => setPickerOpen(false)}
                >
                  Apply
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isSteppable && (
          <Button size="icon" variant="outline" className="h-7 w-7" onClick={onBack}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
        )}
        <div className="flex items-center gap-1.5 text-sm font-medium min-w-[180px] justify-center">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          {range.label}
        </div>
        {isSteppable && (
          <Button
            size="icon"
            variant="outline"
            className="h-7 w-7"
            onClick={onForward}
            disabled={!canGoForward}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDateFilterBar;
