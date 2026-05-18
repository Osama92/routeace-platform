import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DollarSign, Calculator, Info, Receipt, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

interface DriverSalaryData {
  driver_type: "owned" | "third_party";
  salary_type: "per_trip" | "bi_monthly" | "monthly";
  base_salary: number;
  tax_id?: string;
  nhf_contribution: number;
  nhis_contribution: number;
  pension_contribution: number;
  life_insurance: number;
  annual_rent_relief: number;
}

interface DriverSalarySectionProps {
  data: DriverSalaryData;
  onChange: (data: DriverSalaryData) => void;
  isEditing: boolean;
  tripAmount?: number;
}

// Nigeria Tax Act 2024 (New Law) Personal Income Tax Brackets
const calculateNigeriaTax = (
  annualIncome: number,
  deductibles: {
    nhf: number;
    nhis: number;
    pension: number;
    lifeInsurance: number;
    rentRelief: number;
  }
): { tax: number; effectiveRate: number; taxableIncome: number; totalDeductions: number } => {
  // Calculate total deductions - Rent relief capped at ₦500,000
  const totalDeductions = 
    deductibles.nhf +
    deductibles.nhis +
    deductibles.pension +
    deductibles.lifeInsurance +
    Math.min(deductibles.rentRelief, 500000);

  // Taxable income after deductions
  const taxableIncome = Math.max(0, annualIncome - totalDeductions);

  // 2024 New Law PIT brackets
  // First ₦800,000 - 0% (Exempt)
  // Next ₦2,200,000 - 15%
  // Next ₦9,000,000 - 18%
  // Next ₦13,000,000 - 21%
  // Next ₦25,000,000 - 23%
  // Above ₦50,000,000 - 25%
  const brackets = [
    { limit: 800000, rate: 0.00 },
    { limit: 2200000, rate: 0.15 },
    { limit: 9000000, rate: 0.18 },
    { limit: 13000000, rate: 0.21 },
    { limit: 25000000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 },
  ];

  let tax = 0;
  let remaining = taxableIncome;

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  const effectiveRate = annualIncome > 0 ? (tax / annualIncome) * 100 : 0;
  return { tax, effectiveRate, taxableIncome, totalDeductions };
};

// Calculate salary based on type
// IMPORTANT: baseSalary is always the UNIT amount (per trip, bi-monthly payment, or monthly)
// actualTripsInPeriod is used for per_trip to calculate actual monthly earnings
const calculateSalaryBreakdown = (
  salaryType: string,
  baseSalary: number,
  deductibles: {
    nhf: number;
    nhis: number;
    pension: number;
    lifeInsurance: number;
    rentRelief: number;
  },
  actualTripsInPeriod?: number
) => {
  // For per_trip, use actual trip count if provided, otherwise estimate 8 trips/month
  const tripsPerMonth = actualTripsInPeriod ?? 8;
  
  let grossMonthly = 0;
  let grossAnnual = 0;

  switch (salaryType) {
    case "per_trip":
      // baseSalary is GROSS per trip
      grossMonthly = baseSalary * tripsPerMonth;
      break;
    case "bi_monthly":
      grossMonthly = baseSalary * 2;
      break;
    case "monthly":
      grossMonthly = baseSalary;
      break;
  }

  grossAnnual = grossMonthly * 12;
  const { tax, effectiveRate, taxableIncome, totalDeductions } = calculateNigeriaTax(grossAnnual, deductibles);
  const monthlyTax = tax / 12;
  const netMonthly = grossMonthly - monthlyTax;
  
  // Calculate net per trip for per_trip drivers
  const netPerTrip = salaryType === "per_trip" && tripsPerMonth > 0 
    ? netMonthly / tripsPerMonth 
    : 0;

  return {
    grossMonthly,
    grossAnnual,
    annualTax: tax,
    monthlyTax,
    netMonthly,
    effectiveRate,
    taxableIncome,
    totalDeductions,
    tripsUsed: tripsPerMonth,
    netPerTrip,
    grossPerTrip: salaryType === "per_trip" ? baseSalary : 0,
  };
};

// Calculate GROSS PER UNIT from desired NET PER UNIT
// For per_trip: given desired net per trip, calculate required gross per trip
// For bi_monthly: given desired net bi-monthly, calculate required gross bi-monthly
// For monthly: given desired net monthly, calculate required gross monthly
const calculateGrossFromNet = (
  desiredNetPerUnit: number,
  salaryType: string,
  deductibles: {
    nhf: number;
    nhis: number;
    pension: number;
    lifeInsurance: number;
    rentRelief: number;
  },
  estimatedUnitsPerMonth: number = 8 // trips for per_trip, 2 for bi_monthly, 1 for monthly
): number => {
  if (desiredNetPerUnit <= 0) return 0;
  
  // Determine units per month based on salary type
  let unitsPerMonth = estimatedUnitsPerMonth;
  if (salaryType === "bi_monthly") unitsPerMonth = 2;
  if (salaryType === "monthly") unitsPerMonth = 1;
  
  // Convert desired net per unit to monthly net
  const desiredNetMonthly = desiredNetPerUnit * unitsPerMonth;
  
  // Initial estimate: add ~20% buffer for taxes
  let grossPerUnit = desiredNetPerUnit * 1.2;
  
  // Iterate to find the gross per unit that yields the desired net per unit
  for (let i = 0; i < 50; i++) {
    // Calculate breakdown using current gross estimate
    const breakdown = calculateSalaryBreakdown(salaryType, grossPerUnit, deductibles, unitsPerMonth);
    
    // Get net per unit from the breakdown
    let actualNetPerUnit = 0;
    if (salaryType === "per_trip") {
      actualNetPerUnit = breakdown.netPerTrip;
    } else {
      actualNetPerUnit = breakdown.netMonthly / unitsPerMonth;
    }
    
    const diff = desiredNetPerUnit - actualNetPerUnit;
    
    // Close enough (within ₦1)
    if (Math.abs(diff) < 1) break;
    
    // Adjust gross estimate
    grossPerUnit += diff;
    
    // Safety cap to prevent runaway calculations
    if (grossPerUnit > 50000000) {
      console.warn('Gross calculation exceeded safety limit, using estimate');
      grossPerUnit = desiredNetPerUnit * 1.25;
      break;
    }
    
    // Prevent negative values
    if (grossPerUnit < 0) {
      grossPerUnit = desiredNetPerUnit;
      break;
    }
  }
  
  return Math.round(grossPerUnit);
};

// Calculate auto deductibles based on annual basic salary
const calculateAutoDeductibles = (annualBasic: number) => {
  return {
    nhf: Math.round(annualBasic * 0.025), // 2.5% of basic
    pension: Math.round(annualBasic * 0.08), // 8% employee contribution
  };
};

const DriverSalarySection = ({
  data,
  onChange,
  isEditing,
  tripAmount,
}: DriverSalarySectionProps) => {
  const [inputMode, setInputMode] = useState<"gross" | "net">("gross");
  const [netSalaryInput, setNetSalaryInput] = useState<number>(0);
  // Estimated trips per month for per_trip calculations
  const [estimatedTripsPerMonth, setEstimatedTripsPerMonth] = useState<number>(8);

  const deductibles = {
    nhf: data.nhf_contribution || 0,
    nhis: data.nhis_contribution || 0,
    pension: data.pension_contribution || 0,
    lifeInsurance: data.life_insurance || 0,
    rentRelief: data.annual_rent_relief || 0,
  };

  // Use tripAmount if provided (actual trips from payroll), otherwise use estimate
  const tripsForCalculation = tripAmount || estimatedTripsPerMonth;

  const breakdown = calculateSalaryBreakdown(
    data.salary_type,
    data.base_salary,
    deductibles,
    tripsForCalculation
  );

  // When switching to net mode, calculate initial net per unit from current gross
  useEffect(() => {
    if (inputMode === "net" && data.base_salary > 0) {
      // For per_trip, show net per trip; for others, show net per unit
      if (data.salary_type === "per_trip") {
        setNetSalaryInput(Math.round(breakdown.netPerTrip));
      } else if (data.salary_type === "bi_monthly") {
        setNetSalaryInput(Math.round(breakdown.netMonthly / 2));
      } else {
        setNetSalaryInput(Math.round(breakdown.netMonthly));
      }
    }
  }, [inputMode]);

  // When net salary input changes, calculate and update gross per unit
  useEffect(() => {
    if (inputMode === "net" && netSalaryInput > 0) {
      const calculatedGross = calculateGrossFromNet(
        netSalaryInput, 
        data.salary_type, 
        deductibles,
        estimatedTripsPerMonth
      );
      // Add safety check to prevent astronomically large values
      if (calculatedGross > 0 && calculatedGross < 50000000 && calculatedGross !== data.base_salary) {
        onChange({ ...data, base_salary: calculatedGross });
      }
    }
  }, [netSalaryInput, inputMode, data.salary_type, estimatedTripsPerMonth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate annual basic for auto-deductibles
  const getAnnualBasic = () => {
    switch (data.salary_type) {
      case "per_trip":
        return data.base_salary * 8 * 12; // 8 trips/month
      case "bi_monthly":
        return data.base_salary * 2 * 12;
      case "monthly":
        return data.base_salary * 12;
      default:
        return data.base_salary * 12;
    }
  };

  const handleAutoFillDeductibles = () => {
    const annualBasic = getAnnualBasic();
    const auto = calculateAutoDeductibles(annualBasic);
    onChange({
      ...data,
      nhf_contribution: auto.nhf,
      pension_contribution: auto.pension,
    });
  };

  // Handle net salary input change
  const handleNetSalaryChange = (value: number) => {
    setNetSalaryInput(value);
  };

  // Handle gross salary input change
  const handleGrossSalaryChange = (value: number) => {
    onChange({ ...data, base_salary: value });
  };

  // If third party driver, show minimal info
  if (data.driver_type === "third_party") {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Salary Information
          </CardTitle>
          <CardDescription>Third-party driver - No salary tracking required</CardDescription>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Driver Type</Label>
                <Select
                  value={data.driver_type}
                  onValueChange={(value: "owned" | "third_party") =>
                    onChange({ ...data, driver_type: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned Driver</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-muted/30 rounded-lg text-center">
              <Badge variant="secondary" className="mb-2">Third Party Driver</Badge>
              <p className="text-sm text-muted-foreground">
                Payment handled externally through partner agreements
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Salary Information
            </CardTitle>
            <CardDescription>Based on Nigeria Tax Act 2024 PIT</CardDescription>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Tax calculated using Nigeria Personal Income Tax brackets:
                  0%-25% progressive rates based on annual income after deductions.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Driver Type</Label>
                <Select
                  value={data.driver_type}
                  onValueChange={(value: "owned" | "third_party") =>
                    onChange({ ...data, driver_type: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owned">Owned Driver</SelectItem>
                    <SelectItem value="third_party">Third Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Salary Type</Label>
                <Select
                  value={data.salary_type}
                  onValueChange={(value: "per_trip" | "bi_monthly" | "monthly") =>
                    onChange({ ...data, salary_type: value })
                  }
                >
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_trip">Per Trip</SelectItem>
                    <SelectItem value="bi_monthly">Bi-Monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Net-to-Gross Toggle and Salary Input */}
            <div className="p-4 bg-secondary/20 rounded-lg border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Salary Entry Mode</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${inputMode === "gross" ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    Gross
                  </span>
                  <Switch
                    checked={inputMode === "net"}
                    onCheckedChange={(checked) => setInputMode(checked ? "net" : "gross")}
                  />
                  <span className={`text-sm ${inputMode === "net" ? "text-primary font-medium" : "text-muted-foreground"}`}>
                    Net
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    {inputMode === "net" ? (
                      <>
                        Net {data.salary_type === "per_trip"
                          ? "Per Trip"
                          : data.salary_type === "bi_monthly"
                          ? "Bi-Monthly"
                          : "Monthly"} (₦)
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3 h-3 ml-1 inline text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">
                                Enter what the driver should receive after tax. 
                                The system will calculate the required gross salary.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    ) : (
                      data.salary_type === "per_trip"
                        ? "Amount Per Trip (₦)"
                        : data.salary_type === "bi_monthly"
                        ? "Bi-Monthly Amount (₦)"
                        : "Monthly Salary (₦)"
                    )}
                  </Label>
                  <Input
                    type="number"
                    value={inputMode === "net" ? netSalaryInput || "" : data.base_salary || ""}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      if (inputMode === "net") {
                        handleNetSalaryChange(value);
                      } else {
                        handleGrossSalaryChange(value);
                      }
                    }}
                    placeholder={inputMode === "net" ? "e.g., 30000" : "e.g., 50000"}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID (Optional)</Label>
                  <Input
                    value={data.tax_id || ""}
                    onChange={(e) =>
                      onChange({ ...data, tax_id: e.target.value })
                    }
                    placeholder="TIN Number"
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              {/* Show calculated values based on mode */}
              {inputMode === "net" && netSalaryInput > 0 && (
                <div className="mt-4 p-3 bg-primary/10 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Net (as entered):</span>
                      <span className="ml-2 font-semibold text-success">{formatCurrency(netSalaryInput)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Calculated Gross:</span>
                      <span className="ml-2 font-semibold">{formatCurrency(data.base_salary)}</span>
                    </div>
                  </div>
                </div>
              )}
              {inputMode === "gross" && data.base_salary > 0 && (
                <div className="mt-4 p-3 bg-success/10 rounded-md">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Gross (as entered):</span>
                      <span className="ml-2 font-semibold">{formatCurrency(data.base_salary)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Est. Net:</span>
                      <span className="ml-2 font-semibold text-success">{formatCurrency(breakdown.netMonthly)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tax Deductibles Section */}
            <div className="border-t border-border/50 pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm">Tax Deductibles</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-xs">
                          These deductions reduce taxable income per Nigeria Tax Act 2024.
                          Annual amounts are used for tax calculation.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAutoFillDeductibles}
                  className="text-xs"
                  disabled={data.base_salary <= 0}
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Auto-Calculate NHF & Pension
                </Button>
              </div>

              {/* Show auto-calculated hints */}
              {data.base_salary > 0 && (
                <div className="mb-4 p-3 bg-info/10 rounded-md text-xs text-muted-foreground">
                  <span className="font-medium text-info">Auto-calculate suggestion:</span> Based on annual basic of {formatCurrency(getAnnualBasic())}:
                  NHF (2.5%) = {formatCurrency(calculateAutoDeductibles(getAnnualBasic()).nhf)}, 
                  Pension (8%) = {formatCurrency(calculateAutoDeductibles(getAnnualBasic()).pension)}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">
                    NHF Contribution (Annual)
                    <span className="text-muted-foreground ml-1">(2.5% of basic)</span>
                  </Label>
                  <Input
                    type="number"
                    value={data.nhf_contribution || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        nhf_contribution: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 30000"
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    NHIS Contribution (Annual)
                    <span className="text-muted-foreground ml-1">(Health)</span>
                  </Label>
                  <Input
                    type="number"
                    value={data.nhis_contribution || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        nhis_contribution: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 50000"
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    Pension Contribution (Annual)
                    <span className="text-muted-foreground ml-1">(8% employee)</span>
                  </Label>
                  <Input
                    type="number"
                    value={data.pension_contribution || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        pension_contribution: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 96000"
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">
                    Life Insurance (Annual)
                    <span className="text-muted-foreground ml-1">(Self & spouse)</span>
                  </Label>
                  <Input
                    type="number"
                    value={data.life_insurance || ""}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        life_insurance: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="e.g., 25000"
                    className="bg-secondary/50"
                  />
                </div>
              </div>
              <div className="space-y-2 mt-4">
                <Label className="text-xs">
                  Annual Rent Relief
                  <span className="text-muted-foreground ml-1">(Capped at ₦500,000)</span>
                </Label>
                <Input
                  type="number"
                  value={data.annual_rent_relief || ""}
                  onChange={(e) =>
                    onChange({
                      ...data,
                      annual_rent_relief: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="e.g., 500000"
                  className="bg-secondary/50"
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Display mode */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Driver Type</p>
                <Badge variant="default" className="capitalize">
                  {data.driver_type.replace("_", " ")}
                </Badge>
              </div>
              <div className="p-3 bg-secondary/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Salary Type</p>
                <Badge variant="secondary" className="capitalize">
                  {data.salary_type.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {/* Display deductibles in view mode */}
            {(deductibles.nhf > 0 || deductibles.nhis > 0 || deductibles.pension > 0 || deductibles.lifeInsurance > 0 || deductibles.rentRelief > 0) && (
              <div className="p-4 bg-secondary/20 rounded-lg border border-border/30">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Tax Deductibles</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {deductibles.nhf > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NHF:</span>
                      <span>{formatCurrency(deductibles.nhf)}</span>
                    </div>
                  )}
                  {deductibles.nhis > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NHIS:</span>
                      <span>{formatCurrency(deductibles.nhis)}</span>
                    </div>
                  )}
                  {deductibles.pension > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pension:</span>
                      <span>{formatCurrency(deductibles.pension)}</span>
                    </div>
                  )}
                  {deductibles.lifeInsurance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Life Insurance:</span>
                      <span>{formatCurrency(deductibles.lifeInsurance)}</span>
                    </div>
                  )}
                  {deductibles.rentRelief > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rent Relief:</span>
                      <span>{formatCurrency(Math.min(deductibles.rentRelief, 500000))}</span>
                    </div>
                  )}
                </div>
                <div className="mt-2 pt-2 border-t border-border/30 flex justify-between font-medium text-sm">
                  <span>Total Deductions:</span>
                  <span className="text-primary">{formatCurrency(breakdown.totalDeductions)}</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Zone-Based Rate Information for per_trip drivers */}
        {data.salary_type === "per_trip" && (
          <div className="p-4 bg-info/5 rounded-lg border border-info/20">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-info" />
              <span className="font-medium text-sm">Zone-Based Trip Rates</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Standard Trucks (5T-20T)</span>
                <div className="text-right">
                  <span className="font-medium">₦20k</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="font-medium">₦30k</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/30">
                <span className="text-muted-foreground">Trailers</span>
                <div className="text-right">
                  <span className="font-medium">₦30k</span>
                  <span className="text-muted-foreground mx-1">/</span>
                  <span className="font-medium">₦70k</span>
                </div>
              </div>
              <div className="flex gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  <span>Within Zone (Lagos, Ibadan, Sagamu, Abeokuta)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-warning"></div>
                  <span>Outside Zone</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Salary Breakdown - Always show for owned drivers */}
        {data.base_salary > 0 && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="font-medium text-sm">Salary & Tax Breakdown (2024 New Law)</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {data.salary_type === "per_trip" ? "Per Trip (base)" : "Base Amount"}
                </p>
                <p className="font-semibold">{formatCurrency(data.base_salary)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Monthly Gross</p>
                <p className="font-semibold">{formatCurrency(breakdown.grossMonthly)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual Gross</p>
                <p className="font-semibold">{formatCurrency(breakdown.grossAnnual)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Less: Deductions</p>
                <p className="font-semibold text-info">
                  -{formatCurrency(breakdown.totalDeductions)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Taxable Income</p>
                <p className="font-semibold">{formatCurrency(breakdown.taxableIncome)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Annual Tax (PIT)</p>
                <p className="font-semibold text-destructive">
                  -{formatCurrency(breakdown.annualTax)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Monthly Tax</p>
                <p className="font-semibold text-destructive">
                  -{formatCurrency(breakdown.monthlyTax)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Est. Net Monthly</p>
                <p className="font-semibold text-success">
                  {formatCurrency(breakdown.netMonthly)}
                </p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Effective Tax Rate</span>
                <span>{breakdown.effectiveRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Tax Bracket Info</span>
                <span>₦0-800k: 0% | ₦800k-3M: 15% | ₦3M-12M: 18%...</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DriverSalarySection;
