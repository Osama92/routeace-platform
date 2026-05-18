/**
 * usePricingEngine - Single source of truth for platform pricing.
 * Per-vehicle model:
 *   • Haulage  → ₦5,000/vehicle/month (no per-drop)
 *   • Bikes/Vans/Multidrop → ₦0 base, ₦50 per drop
 *   • Mixed/Hybrid → ₦5,000/vehicle/month + ₦50/drop
 * Also manages API pricing alignment and onboarding-based billing classification.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ─── LANDING PAGE TRUTH (NON-NEGOTIABLE, PER-VEHICLE) ───
// basePrice is PER VEHICLE per month for haulage/mixed.
// Multidrop has no base - pure per-drop.
export const PRICING_TRUTH = {
  logistics: {
    haulage: {
      code: "heavy_truck",
      name: "Heavy Truck / Haulage",
      basePrice: 5000, // per vehicle / month
      currency: "NGN",
      billingCycle: "monthly_per_vehicle",
      pricePerDrop: null,
      description: "₦5,000 per vehicle, per month - unlimited dispatches",
      features: ["Per-vehicle subscription", "Unlimited dispatches", "Full fleet management", "Route optimization"],
    },
    multidrop: {
      code: "bikes_vans",
      name: "Bikes / Vans / Buses",
      basePrice: 0,
      currency: "NGN",
      billingCycle: "per_drop",
      pricePerDrop: 50,
      description: "Pay only for what you deliver",
      features: ["No monthly fee", "Pay per delivery", "Real-time tracking"],
    },
    mixed: {
      code: "mixed",
      name: "Mixed Fleet",
      basePrice: 5000, // per vehicle / month
      currency: "NGN",
      billingCycle: "monthly_per_vehicle_plus_drop",
      pricePerDrop: 50,
      description: "₦5,000 per vehicle, per month + ₦50 per delivery drop",
      features: ["Per-vehicle subscription", "Per-drop billing", "All vehicle types", "Team management"],
    },
  },
  global: {
    perDrop: { min: 0.04, max: 0.12, currency: "USD" },
    perApiCall: { min: 0.01, max: 0.05, currency: "USD" },
    marketAverage: 0.15, // competitor benchmark per stop
  },
  revenueSplit: {
    routeace: 80,
    reseller: 20,
  },
} as const;

export interface PricingTier {
  code: string;
  name: string;
  basePrice: number;
  currency: string;
  billingCycle: string;
  pricePerDrop: number | null;
}

export interface OnboardingBillingResult {
  tier: PricingTier;
  estimatedMonthlyCost: number;
  vatAmount: number;
  totalWithVat: number;
  billingType: "subscription" | "usage" | "hybrid";
}

const VAT_RATE = 0.075; // Nigeria 7.5% VAT

export function usePricingEngine() {
  // Fetch backend billing_plans for validation
  const { data: backendPlans } = useQuery({
    queryKey: ["pricing-engine-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("billing_plans")
        .select("plan_code, plan_name, base_price, price_per_drop, pricing_model, billing_cycle, currency, is_active")
        .eq("is_active", true);
      return data || [];
    },
    staleTime: 300_000,
  });

  // Detect mismatches between backend and landing page truth
  const pricingMismatches = useMemo(() => {
    if (!backendPlans?.length) return [];
    const mismatches: string[] = [];

    const truthMap: Record<string, { basePrice: number; pricePerDrop: number | null }> = {
      heavy_truck: { basePrice: 5000, pricePerDrop: null },
      bikes_vans: { basePrice: 0, pricePerDrop: 50 },
      mixed: { basePrice: 5000, pricePerDrop: 50 },
    };

    for (const plan of backendPlans as any[]) {
      const truth = truthMap[plan.plan_code];
      if (!truth) continue;

      if (Number(plan.base_price) !== truth.basePrice) {
        mismatches.push(
          `${plan.plan_code}: backend base_price ₦${plan.base_price} ≠ landing page ₦${truth.basePrice}`
        );
      }
      if (truth.pricePerDrop !== null && Number(plan.price_per_drop) !== truth.pricePerDrop) {
        mismatches.push(
          `${plan.plan_code}: backend price_per_drop ₦${plan.price_per_drop} ≠ landing page ₦${truth.pricePerDrop}`
        );
      }
    }

    return mismatches;
  }, [backendPlans]);

  /**
   * Calculate billing for an onboarding type + usage estimate.
   * Pricing is PER VEHICLE for haulage and mixed.
   */
  function calculateOnboardingBilling(
    businessType: "heavy_truck" | "bikes_vans" | "mixed",
    estimatedMonthlyDrops: number = 0,
    vehicleCount: number = 1,
  ): OnboardingBillingResult {
    const tierMap = {
      heavy_truck: PRICING_TRUTH.logistics.haulage,
      bikes_vans: PRICING_TRUTH.logistics.multidrop,
      mixed: PRICING_TRUTH.logistics.mixed,
    };

    const tier = tierMap[businessType];
    const fleetMultiplier = businessType === "bikes_vans" ? 1 : Math.max(1, vehicleCount);
    const subscriptionCost = tier.basePrice * fleetMultiplier;
    const dropCost = (tier.pricePerDrop || 0) * estimatedMonthlyDrops;
    const estimatedMonthlyCost = subscriptionCost + dropCost;
    const vatAmount = Math.round(estimatedMonthlyCost * VAT_RATE);
    const totalWithVat = estimatedMonthlyCost + vatAmount;

    const billingType: "subscription" | "usage" | "hybrid" =
      businessType === "heavy_truck" ? "subscription" :
      businessType === "bikes_vans" ? "usage" : "hybrid";

    return {
      tier: {
        code: tier.code,
        name: tier.name,
        basePrice: tier.basePrice,
        currency: tier.currency,
        billingCycle: tier.billingCycle,
        pricePerDrop: tier.pricePerDrop,
      },
      estimatedMonthlyCost,
      vatAmount,
      totalWithVat,
      billingType,
    };
  }

  /**
   * Calculate API resale revenue split.
   */
  function calculateApiRevenueSplit(grossAmount: number) {
    const { routeace, reseller } = PRICING_TRUTH.revenueSplit;
    return {
      routeaceAmount: Math.round(grossAmount * (routeace / 100) * 100) / 100,
      resellerAmount: Math.round(grossAmount * (reseller / 100) * 100) / 100,
      routeacePercent: routeace,
      resellerPercent: reseller,
    };
  }

  return {
    pricingTruth: PRICING_TRUTH,
    pricingMismatches,
    hasMismatches: pricingMismatches.length > 0,
    calculateOnboardingBilling,
    calculateApiRevenueSplit,
    vatRate: VAT_RATE,
  };
}
