import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { useToast } from "@/hooks/use-toast";

// Nigeria Tax Calculation
interface TaxDeductibles {
  nhf: number;
  nhis: number;
  pension: number;
  lifeInsurance: number;
  rentRelief: number;
}

export interface PayrollEntry {
  id: string;
  name: string;
  type: "driver" | "owned_staff" | "outsourced_staff";
  salaryType: string;
  grossMonthly: number;
  monthlyTax: number;
  netMonthly: number;
  effectiveRate: number;
  tripCount?: number;
  partnerName?: string;
  remitaRRR?: string;
  remitaStatus?: string;
}

export interface PayrollPreview {
  drivers: PayrollEntry[];
  ownedStaff: PayrollEntry[];
  outsourcedStaff: PayrollEntry[];
  totals: {
    totalEntries: number;
    totalGross: number;
    totalTax: number;
    totalNet: number;
  };
}

export interface ReconciliationStatus {
  isReconciled: boolean;
  varianceGross: number;
  varianceTax: number;
  varianceNet: number;
  hasVariance: boolean;
}

const calculateNigeriaTax = (annualIncome: number, deductibles?: TaxDeductibles) => {
  const totalDeductions = deductibles
    ? (deductibles.nhf || 0) +
      (deductibles.nhis || 0) +
      (deductibles.pension || 0) +
      (deductibles.lifeInsurance || 0) +
      Math.min(deductibles.rentRelief || 0, 500000)
    : 0;

  const taxableIncome = Math.max(0, annualIncome - totalDeductions);
  const MINIMUM_WAGE_THRESHOLD = 840000;

  if (taxableIncome <= MINIMUM_WAGE_THRESHOLD) {
    return { tax: 0, effectiveRate: 0, taxableIncome, totalDeductions };
  }

  let tax = 0;
  let remaining = taxableIncome;

  const brackets = [
    { limit: 800000, rate: 0.0 },
    { limit: 2200000, rate: 0.15 },
    { limit: 9000000, rate: 0.18 },
    { limit: 13000000, rate: 0.21 },
    { limit: 25000000, rate: 0.23 },
    { limit: Infinity, rate: 0.25 },
  ];

  for (const bracket of brackets) {
    if (remaining <= 0) break;
    const taxable = Math.min(remaining, bracket.limit);
    tax += taxable * bracket.rate;
    remaining -= taxable;
  }

  const effectiveRate = annualIncome > 0 ? (tax / annualIncome) * 100 : 0;
  return { tax, effectiveRate, taxableIncome, totalDeductions };
};

/**
 * Unified Payroll Fetch Hook with retry logic, validation, and reconciliation
 */
export function usePayrollFetch(organizationId?: string | null) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [payrollPreview, setPayrollPreview] = useState<PayrollPreview>({
    drivers: [],
    ownedStaff: [],
    outsourcedStaff: [],
    totals: { totalEntries: 0, totalGross: 0, totalTax: 0, totalNet: 0 },
  });
  const [reconciliation, setReconciliation] = useState<ReconciliationStatus>({
    isReconciled: true,
    varianceGross: 0,
    varianceTax: 0,
    varianceNet: 0,
    hasVariance: false,
  });
  const { toast } = useToast();

  const MAX_RETRIES = 2;

  const validateResponse = <T,>(data: T | null, tableName: string): T => {
    if (data === null || data === undefined) {
      throw new Error(`Invalid response from ${tableName}: received null`);
    }
    return data;
  };

  const fetchPayrollData = useCallback(async (selectedMonth: string, attempt = 0) => {
    setLoading(true);
    setError(null);

    try {
      const [year, month] = selectedMonth.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Sentinel UUID = "no org" → returns no rows (prevents cross-tenant leak when org isn't loaded yet).
      const orgFilter = organizationId ?? "00000000-0000-0000-0000-000000000000";

      // Parallel fetch with validation
      const [driversResult, staffResult, dispatchesResult, expensesResult] = await Promise.all([
        supabase
          .from("drivers")
          .select("*")
          .eq("driver_type", "owned")
          .eq("organization_id", orgFilter)
          .order("full_name"),
        supabase
          .from("staff")
          .select(`*, partners(company_name)`)
          .eq("status", "active")
          .eq("organization_id", orgFilter)
          .order("full_name"),
        supabase
          .from("dispatches")
          .select("driver_id")
          .gte("created_at", startDate.toISOString())
          .lte("created_at", endDate.toISOString())
          .eq("status", "delivered")
          .eq("organization_id", orgFilter),
        supabase
          .from("expenses")
          .select("amount, category")
          .gte("expense_date", startDate.toISOString().split("T")[0])
          .lte("expense_date", endDate.toISOString().split("T")[0])
          .in("category", ["driver_salary", "administrative"]),
      ]);

      // Validate responses
      if (driversResult.error) throw new Error(`Drivers fetch failed: ${driversResult.error.message}`);
      if (staffResult.error) throw new Error(`Staff fetch failed: ${staffResult.error.message}`);
      if (dispatchesResult.error) throw new Error(`Dispatches fetch failed: ${dispatchesResult.error.message}`);
      if (expensesResult.error) throw new Error(`Expenses fetch failed: ${expensesResult.error.message}`);

      const drivers = driversResult.data || [];
      const staff = staffResult.data || [];
      const dispatches = dispatchesResult.data || [];
      const expenses = expensesResult.data || [];

      // Count trips per driver (null-safe)
      const tripCounts: Record<string, number> = {};
      dispatches.forEach((d: any) => {
        if (d?.driver_id) {
          tripCounts[d.driver_id] = (tripCounts[d.driver_id] || 0) + 1;
        }
      });

      // Process drivers (null-safe mapping)
      const driverEntries: PayrollEntry[] = drivers
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((d) => {
          const tripCount = tripCounts[d.id] || 0;
          const baseSalary = d.base_salary || 0;
          const salaryType = d.salary_type || "monthly";

          let grossMonthly = 0;
          switch (salaryType) {
            case "per_trip":
              grossMonthly = baseSalary * tripCount;
              break;
            case "bi_monthly":
              grossMonthly = baseSalary * 2;
              break;
            case "monthly":
            default:
              grossMonthly = baseSalary;
              break;
          }

          const deductibles: TaxDeductibles = {
            nhf: d.nhf_contribution || 0,
            nhis: d.nhis_contribution || 0,
            pension: d.pension_contribution || 0,
            lifeInsurance: d.life_insurance || 0,
            rentRelief: d.annual_rent_relief || 0,
          };

          const grossAnnual = grossMonthly * 12;
          const { tax, effectiveRate } = calculateNigeriaTax(grossAnnual, deductibles);
          const monthlyTax = tax / 12;
          const netMonthly = grossMonthly - monthlyTax;

          return {
            id: `driver-${d.id}`,
            name: d.full_name || "Unknown Driver",
            type: "driver" as const,
            salaryType,
            grossMonthly,
            monthlyTax,
            netMonthly,
            effectiveRate,
            tripCount,
          };
        });

      // Process staff (null-safe mapping)
      const ownedStaffEntries: PayrollEntry[] = [];
      const outsourcedStaffEntries: PayrollEntry[] = [];

      staff
        .filter((s): s is NonNullable<typeof s> => s !== null)
        .forEach((s) => {
          const baseSalary = s.base_salary || 0;
          const salaryType = s.salary_type || "monthly";

          let grossMonthly = 0;
          switch (salaryType) {
            case "bi_monthly":
              grossMonthly = baseSalary * 2;
              break;
            case "hourly":
              grossMonthly = baseSalary * 160;
              break;
            case "monthly":
            default:
              grossMonthly = baseSalary;
              break;
          }

          const deductibles: TaxDeductibles = {
            nhf: s.nhf_contribution || 0,
            nhis: s.nhis_contribution || 0,
            pension: s.pension_contribution || 0,
            lifeInsurance: s.life_insurance || 0,
            rentRelief: s.annual_rent_relief || 0,
          };

          const grossAnnual = grossMonthly * 12;
          const { tax, effectiveRate } = calculateNigeriaTax(grossAnnual, deductibles);
          const monthlyTax = tax / 12;
          const netMonthly = grossMonthly - monthlyTax;

          const partnerData = s.partners as { company_name?: string } | null;

          const entry: PayrollEntry = {
            id: `staff-${s.id}`,
            name: s.full_name || "Unknown Staff",
            type: s.employment_type === "owned" ? "owned_staff" : "outsourced_staff",
            salaryType,
            grossMonthly,
            monthlyTax,
            netMonthly,
            effectiveRate,
            partnerName: partnerData?.company_name,
          };

          if (s.employment_type === "owned") {
            ownedStaffEntries.push(entry);
          } else {
            outsourcedStaffEntries.push(entry);
          }
        });

      // Calculate totals
      const allEntries = [...driverEntries, ...ownedStaffEntries, ...outsourcedStaffEntries];
      const totals = {
        totalEntries: allEntries.length,
        totalGross: allEntries.reduce((acc, e) => acc + e.grossMonthly, 0),
        totalTax: allEntries.reduce((acc, e) => acc + e.monthlyTax, 0),
        totalNet: allEntries.reduce((acc, e) => acc + e.netMonthly, 0),
      };

      // Ledger reconciliation check
      const ledgerTotal = expenses.reduce((acc, e) => acc + (e?.amount || 0), 0);
      const varianceNet = Math.abs(totals.totalNet - ledgerTotal);
      const hasVariance = varianceNet > 0.01; // Allow small floating point differences

      setReconciliation({
        isReconciled: !hasVariance,
        varianceGross: 0,
        varianceTax: 0,
        varianceNet,
        hasVariance,
      });

      setPayrollPreview({
        drivers: driverEntries,
        ownedStaff: ownedStaffEntries,
        outsourcedStaff: outsourcedStaffEntries,
        totals,
      });

      setRetryCount(0);
      setError(null);
    } catch (err: any) {
      console.error("Payroll fetch error:", err);
      
      // Retry logic
      if (attempt < MAX_RETRIES) {
        setRetryCount(attempt + 1);
        toast({
          title: "Retrying...",
          description: `Attempt ${attempt + 2} of ${MAX_RETRIES + 1}`,
        });
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        return fetchPayrollData(selectedMonth, attempt + 1);
      }

      setError(err.message || "Failed to fetch payroll data");
      toast({
        title: "Error",
        description: "Failed to fetch payroll data after multiple attempts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, organizationId]);

  const resetError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    loading,
    error,
    retryCount,
    payrollPreview,
    reconciliation,
    fetchPayrollData,
    resetError,
  };
}

export default usePayrollFetch;
