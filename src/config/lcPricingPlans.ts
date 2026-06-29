/**
 * Single source of truth for Logistics Company (LC) pricing tiers.
 *
 * Used by:
 *   • src/components/landing/LandingPricingSection.tsx (public marketing page)
 *   • src/components/subscription/SubscriptionManager.tsx (in-app Settings → Billing)
 *   • supabase/functions/initiate-subscription-payment (server-side amount calc)
 *
 * If you change a price here you MUST also update the corresponding constant
 * in `supabase/functions/initiate-subscription-payment/index.ts` (PLAN_PRICES_KOBO).
 * The runtime consistency check (`usePricingConsistencyCheck`) will flag drift.
 */

export type LcBillingModel = "free" | "per_drop" | "per_vehicle" | "hybrid";

export interface LcPlan {
  /** Stable plan id sent to the edge function. */
  id: "starter" | "bikes_vans" | "heavy_fleet" | "mixed_fleet";
  name: string;
  /** Display price string (must match landing + settings). */
  price: string;
  /** Suffix shown next to price (e.g. "/vehicle/mo"). */
  period: string;
  /** Short tagline under the price. */
  sub: string;
  features: string[];
  /** Pricing model, drives whether monthly subscribe is allowed. */
  billingModel: LcBillingModel;
  /** Monthly subscription amount in kobo (per active vehicle for per_vehicle/hybrid). 0 = not subscribable. */
  monthlyBaseKobo: number;
  /** Per-drop overage in kobo (0 if not applicable). */
  perDropKobo: number;
  /** Card highlight flag. */
  popular?: boolean;
  /** Whether this tier can be subscribed to from the in-app billing screen. */
  subscribable: boolean;
}

export const LC_PRICING_PLANS: LcPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    period: "",
    sub: "Single operator access",
    features: [
      "Single user access",
      "Create & manage dispatches",
      "Raise invoices",
      "Capture expenses",
      "Send emails to customers",
      "Real-time tracking",
    ],
    billingModel: "free",
    monthlyBaseKobo: 0,
    perDropKobo: 0,
    subscribable: false,
  },
  {
    id: "bikes_vans",
    name: "Bikes / Vans",
    price: "₦50",
    period: "/drop",
    sub: "Pay per delivery",
    features: ["Dispatch & tracking", "Driver management", "Basic analytics"],
    billingModel: "per_drop",
    monthlyBaseKobo: 0,
    perDropKobo: 5_000, // ₦50 in kobo
    subscribable: false, // billed per delivery, not via monthly checkout
  },
  {
    id: "heavy_fleet",
    name: "Heavy Fleet / Haulage",
    price: "₦5,000",
    period: "/vehicle/mo",
    sub: "VAT exclusive · per active vehicle",
    features: [
      "Full fleet management",
      "SLA engine & breach costing",
      "Resell up to 10 licenses",
      "Admin panel access",
    ],
    billingModel: "per_vehicle",
    monthlyBaseKobo: 500_000, // ₦5,000 per vehicle
    perDropKobo: 0,
    popular: true,
    subscribable: true,
  },
  {
    id: "mixed_fleet",
    name: "Mixed Fleet",
    price: "₦5,000/vehicle + ₦50/drop",
    period: "",
    sub: "Hybrid · best of both",
    features: [
      "All vehicle types",
      "Full platform access",
      "Team management & approvals",
      "ERP & external integrations",
    ],
    billingModel: "hybrid",
    monthlyBaseKobo: 500_000, // ₦5,000 per vehicle base
    perDropKobo: 5_000,
    subscribable: true,
  },
];

/** Map UI plan id → subscription_plans.tier (DB enum). */
export const LC_PLAN_DB_TIER: Record<LcPlan["id"], "starter" | "professional" | "enterprise"> = {
  starter: "starter",
  bikes_vans: "starter", // per-drop billed separately
  heavy_fleet: "professional",
  mixed_fleet: "professional",
};

export function getPlanById(id: string): LcPlan | undefined {
  return LC_PRICING_PLANS.find((p) => p.id === id);
}
