import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarRange, X } from "lucide-react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = [2024, 2025, 2026, 2027];

export interface MonthRange {
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
}

/** The current month, both ends — what every screen opens on and resets to. */
export const currentMonthRange = (): MonthRange => {
  const now = new Date();
  return {
    startMonth: now.getMonth(),
    startYear: now.getFullYear(),
    endMonth: now.getMonth(),
    endYear: now.getFullYear(),
  };
};

/**
 * Month-to-month range picker, extracted from the Bills toolbar so Expenses
 * and Invoices read identically rather than three near-copies drifting apart.
 *
 * Finance works in whole months — a VAT return, a vendor statement, a period
 * close — so the control is month/year rather than a day-level date picker.
 *
 * The range is deliberately NOT validated to start before it ends: an
 * inverted range simply returns nothing, which is self-evident on screen, and
 * silently reordering the user's choice is more confusing than an empty list.
 */
const MonthRangeFilter = ({
  value,
  onChange,
}: {
  value: MonthRange;
  onChange: (r: MonthRange) => void;
}) => (
  <div className="flex items-center gap-2 text-sm">
    <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />

    <Select
      value={String(value.startMonth)}
      onValueChange={(v) => onChange({ ...value, startMonth: Number(v) })}
    >
      <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select
      value={String(value.startYear)}
      onValueChange={(v) => onChange({ ...value, startYear: Number(v) })}
    >
      <SelectTrigger className="w-[88px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
    </Select>

    <span className="text-muted-foreground">→</span>

    <Select
      value={String(value.endMonth)}
      onValueChange={(v) => onChange({ ...value, endMonth: Number(v) })}
    >
      <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {MONTHS.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select
      value={String(value.endYear)}
      onValueChange={(v) => onChange({ ...value, endYear: Number(v) })}
    >
      <SelectTrigger className="w-[88px] h-9"><SelectValue /></SelectTrigger>
      <SelectContent>
        {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
      </SelectContent>
    </Select>

    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9 shrink-0"
      title="Reset to this month"
      onClick={() => onChange(currentMonthRange())}
    >
      <X className="w-4 h-4" />
    </Button>
  </div>
);

export default MonthRangeFilter;
