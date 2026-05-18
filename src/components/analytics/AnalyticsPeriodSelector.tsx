import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

export type PeriodType = "monthly" | "annually";

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
  const monthOptions = getMonthOptions();
  const yearOptions = getYearOptions();
  const options = periodType === "monthly" ? monthOptions : yearOptions;

  const handlePeriodTypeSwitch = (type: PeriodType) => {
    onPeriodTypeChange(type);
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
      </div>
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
