import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarRange } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear,
  startOfDay, endOfDay } from "date-fns";

export type PeriodType = "monthly" | "annually" | "all" | "custom";

/**
 * Lower bound for "All time". Every real record falls comfortably inside it,
 * so inception-to-date does not require probing the database first.
 */
const INCEPTION = new Date("2020-01-01T00:00:00Z");

export interface PeriodRange {
  type: PeriodType;
  label: string;
  start: Date;
  end: Date;
}

const getMonthOptions = (): { value: string; label: string; start: Date; end: Date }[] => {
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = subMonths(new Date(), i);
    options.push({
      value: `month-${i}`,
      label: format(d, "MMMM yyyy"),
      start: startOfMonth(d),
      end: endOfMonth(d),
    });
  }
  return options;
};

const getYearOptions = (): { value: string; label: string; start: Date; end: Date }[] => {
  const currentYear = new Date().getFullYear();
  return [0, 1, 2].map((i) => {
    const year = currentYear - i;
    return {
      value: `year-${year}`,
      label: `${year}`,
      start: startOfYear(new Date(year, 0, 1)),
      end: endOfYear(new Date(year, 0, 1)),
    };
  });
};

interface AnalyticsPeriodSelectorProps {
  periodType: PeriodType;
  onPeriodTypeChange: (type: PeriodType) => void;
  selectedPeriod: string;
  onPeriodChange: (value: string, range: PeriodRange) => void;
}

export const AnalyticsPeriodSelector = ({
  periodType,
  onPeriodTypeChange,
  selectedPeriod,
  onPeriodChange,
}: AnalyticsPeriodSelectorProps) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [customRange, setCustomRange] = useState<{ from?: Date; to?: Date }>({});
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();
  const options = periodType === "monthly" ? monthOptions : yearOptions;
  // All-time and custom have nothing to enumerate, so the period dropdown is
  // hidden for them rather than shown empty.
  const showPeriodDropdown = periodType === "monthly" || periodType === "annually";

  const applyCustom = (r: { from?: Date; to?: Date }) => {
    setCustomRange(r);
    if (!r.from) return;
    // While only a start is chosen, treat it as a single day so the view
    // stays valid mid-selection.
    const from = startOfDay(r.from);
    const to = r.to ? endOfDay(r.to) : endOfDay(r.from);
    onPeriodTypeChange("custom");
    onPeriodChange("custom", {
      type: "custom",
      label: format(from, "dd MMM yyyy") === format(to, "dd MMM yyyy")
        ? format(from, "dd MMM yyyy")
        : `${format(from, "dd MMM yyyy")} – ${format(to, "dd MMM yyyy")}`,
      start: from,
      end: to,
    });
  };

  const handlePeriodTypeSwitch = (type: PeriodType) => {
    onPeriodTypeChange(type);

    if (type === "all") {
      onPeriodChange("all", {
        type,
        label: "All time",
        start: INCEPTION,
        end: endOfDay(new Date()),
      });
      return;
    }
    if (type === "custom") {
      // Opens the picker; nothing is applied until dates are chosen.
      setPickerOpen(true);
      return;
    }

    const defaultOpt = type === "monthly" ? getMonthOptions()[0] : getYearOptions()[0];
    onPeriodChange(defaultOpt.value, {
      type,
      label: defaultOpt.label,
      start: defaultOpt.start,
      end: defaultOpt.end,
    });
  };

  const handleSelect = (value: string) => {
    const opt = options.find((o) => o.value === value);
    if (opt) {
      onPeriodChange(value, {
        type: periodType,
        label: opt.label,
        start: opt.start,
        end: opt.end,
      });
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <div className="flex rounded-lg border border-border overflow-hidden">
        <button
          onClick={() => handlePeriodTypeSwitch("monthly")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            periodType === "monthly"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => handlePeriodTypeSwitch("annually")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            periodType === "annually"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          Annually
        </button>
        <button
          onClick={() => handlePeriodTypeSwitch("all")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            periodType === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-background text-muted-foreground hover:text-foreground"
          }`}
        >
          All time
        </button>

        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={() => onPeriodTypeChange("custom")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${
                periodType === "custom"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              Range
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarPicker
              mode="range"
              selected={customRange as any}
              onSelect={(r: any) => applyCustom({ from: r?.from, to: r?.to })}
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
      </div>

      {showPeriodDropdown && (
        <Select value={selectedPeriod} onValueChange={handleSelect}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export const getDefaultPeriodRange = (): PeriodRange => {
  const now = new Date();
  return {
    type: "monthly",
    label: format(now, "MMMM yyyy"),
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};
