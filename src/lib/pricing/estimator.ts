/**
 * RouteAce Dynamic Pricing Personalization Engine
 * Calculates real-time cost estimates based on user inputs.
 */

export type PlatformType = "logistics" | "industry" | "hybrid";
export type LogisticsModel = "haulage" | "multidrop" | "bikes" | "mixed" | "hybrid" | "";

export interface LogisticsInputs {
  model: LogisticsModel;
  vehicleCount: number;
  monthlyDeliveries: number;
  currency: string;
}

export interface IndustryInputs {
  userCount: number;
  outletCount: number;
  needsAPI: boolean;
  needsWhiteLabel: boolean;
  multiCountry: boolean;
  currency: string;
}

export interface PricingEstimate {
  baseCost: number;
  usageCost: number;
  aiCreditsIncluded: number;
  aiCreditsCost: number;
  totalMonthly: number;
  recommendedPlan: string;
  planLabel: string;
  currency: string;
  currencySymbol: string;
  breakdown: { label: string; amount: number }[];
  nudge: string;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GBP: "£", EUR: "€", KES: "KSh", ZAR: "R",
};

// ── Logistics OS Pricing (Naira-first, PER VEHICLE) ─────────────────

// Per-vehicle subscription model.
// Haulage: ₦5,000/vehicle/mo. Hybrid/Mixed: ₦5,000/vehicle/mo + ₦50/drop. Bikes/Multidrop: pay-per-drop only.
const LOGISTICS_RATES_NGN: Record<string, { perDrop: number; basePerVehicle: number }> = {
  bikes:     { perDrop: 50, basePerVehicle: 0 },
  multidrop: { perDrop: 50, basePerVehicle: 0 },
  haulage:   { perDrop: 0,  basePerVehicle: 5_000 },
  mixed:     { perDrop: 50, basePerVehicle: 5_000 },
  hybrid:    { perDrop: 50, basePerVehicle: 5_000 },
};

const NGN_TO_USD = 1 / 1600;

function getLogisticsRates(currency: string) {
  const rates = { ...LOGISTICS_RATES_NGN };
  if (currency !== "NGN") {
    const fx = NGN_TO_USD;
    for (const key of Object.keys(rates)) {
      if (!key) continue;
      rates[key] = {
        perDrop: Math.round(rates[key].perDrop * fx * 100) / 100,
        basePerVehicle: Math.round(rates[key].basePerVehicle * fx * 100) / 100,
      };
    }
  }
  return rates;
}

export function estimateLogisticsCost(inputs: LogisticsInputs): PricingEstimate {
  const { model, vehicleCount, monthlyDeliveries, currency } = inputs;
  const sym = CURRENCY_SYMBOLS[currency] || currency;
  const rates = getLogisticsRates(currency);

  if (!model) {
    return emptyEstimate(currency, sym);
  }

  const r = rates[model];
  const fleetSize = Math.max(1, vehicleCount || 1);
  // Per-vehicle subscription. Multidrop ignores fleet size (pure usage).
  const baseCost = r.basePerVehicle * (r.basePerVehicle > 0 ? fleetSize : 1);
  const usageCost = r.perDrop * monthlyDeliveries;
  const totalMonthly = baseCost + usageCost;

  const breakdown: { label: string; amount: number }[] = [];
  if (baseCost > 0) breakdown.push({ label: `Per-vehicle subscription (${fleetSize} vehicle${fleetSize === 1 ? "" : "s"} × ${sym}${r.basePerVehicle.toLocaleString()})`, amount: baseCost });
  if (usageCost > 0) breakdown.push({ label: `Per-drop charges (${monthlyDeliveries.toLocaleString()} deliveries × ${sym}${r.perDrop})`, amount: usageCost });

  const aiCreditsIncluded = model === "haulage" ? 0 : 500;

  let recommendedPlan = "free";
  let planLabel = "Free";
  if (vehicleCount > 1 || monthlyDeliveries > 10) {
    recommendedPlan = "starter";
    planLabel = "Starter";
  }
  if (vehicleCount > 20 || monthlyDeliveries > 500) {
    recommendedPlan = "growth";
    planLabel = "Growth";
  }
  if (vehicleCount > 100 || monthlyDeliveries > 5000) {
    recommendedPlan = "enterprise";
    planLabel = "Enterprise";
  }

  const nudge = getNudge(recommendedPlan, "logistics");

  return {
    baseCost, usageCost, aiCreditsIncluded, aiCreditsCost: 0,
    totalMonthly, recommendedPlan, planLabel, currency, currencySymbol: sym,
    breakdown, nudge,
  };
}

// ── Industry OS Pricing (Naira per-user) ────────────────────────────

export function estimateIndustryCost(inputs: IndustryInputs): PricingEstimate {
  const { userCount, outletCount, needsAPI, needsWhiteLabel, multiCountry, currency } = inputs;
  const sym = CURRENCY_SYMBOLS[currency] || currency;

  let recommendedPlan = "free";
  let planLabel = "Free";
  let pricePerUser = 0;
  let aiCredits = 0;

  if (userCount <= 2 && !needsAPI && !needsWhiteLabel) {
    recommendedPlan = "free";
    planLabel = "Free";
    pricePerUser = 0;
    aiCredits = 0;
  } else if (outletCount <= 5000 && !needsAPI && !needsWhiteLabel && !multiCountry) {
    recommendedPlan = "growth";
    planLabel = "Growth";
    pricePerUser = currency === "NGN" ? 20_000 : 13;
    aiCredits = 200;
  } else if (!needsWhiteLabel && !multiCountry) {
    recommendedPlan = "enterprise";
    planLabel = "Enterprise";
    pricePerUser = currency === "NGN" ? 45_000 : 28;
    aiCredits = 1000;
  } else {
    recommendedPlan = "custom";
    planLabel = "Custom";
    pricePerUser = currency === "NGN" ? 60_000 : 38;
    aiCredits = 2000;
  }

  const baseCost = pricePerUser * Math.max(1, userCount);
  const totalMonthly = baseCost;

  const breakdown: { label: string; amount: number }[] = [];
  if (baseCost > 0) {
    breakdown.push({ label: `${planLabel} plan (${userCount} user${userCount > 1 ? "s" : ""} × ${sym}${pricePerUser.toLocaleString()})`, amount: baseCost });
  }
  if (aiCredits > 0) {
    breakdown.push({ label: `AI credits included (${aiCredits}/user/mo)`, amount: 0 });
  }

  const nudge = getNudge(recommendedPlan, "industry");

  return {
    baseCost, usageCost: 0, aiCreditsIncluded: aiCredits * Math.max(1, userCount),
    aiCreditsCost: 0, totalMonthly, recommendedPlan, planLabel,
    currency, currencySymbol: sym, breakdown, nudge,
  };
}

// ── AI Credit Prediction ────────────────────────────────────────────

export interface AICreditPrediction {
  predictedMonthly: number;
  included: number;
  overage: number;
  overageCost: number;
  recommendation: string;
}

const AI_CREDIT_PRICE_NGN = 50; // per credit above allocation
const AI_CREDIT_PRICE_USD = 0.03;

export function predictAICredits(inputs: {
  os: "logistics" | "industry";
  plan: string;
  userCount: number;
  monthlyDeliveries: number;
  currency: string;
}): AICreditPrediction {
  const { os, plan, userCount, monthlyDeliveries, currency } = inputs;
  const creditPrice = currency === "NGN" ? AI_CREDIT_PRICE_NGN : AI_CREDIT_PRICE_USD;

  let included = 0;
  if (os === "logistics") {
    included = plan === "growth" ? 500 : plan === "enterprise" ? 2000 : 0;
  } else {
    const perUser = plan === "growth" ? 200 : plan === "enterprise" ? 1000 : plan === "custom" ? 2000 : 0;
    included = perUser * Math.max(1, userCount);
  }

  // Predict usage based on activity
  let predicted = 0;
  if (os === "logistics") {
    predicted = Math.ceil(monthlyDeliveries * 0.05) + 20; // route opt + dispatch AI
  } else {
    predicted = Math.ceil(userCount * 45); // lead scoring + forecasting + summaries
  }

  const overage = Math.max(0, predicted - included);
  const overageCost = overage * creditPrice;

  let recommendation = "";
  if (overage > 0 && plan !== "enterprise" && plan !== "custom") {
    recommendation = `Upgrading to ${os === "logistics" ? "Growth" : "Enterprise"} would save you ${(CURRENCY_SYMBOLS[currency] || currency)}${overageCost.toLocaleString()}/mo in AI credits.`;
  } else if (overage > 0) {
    recommendation = `Consider purchasing an AI credit pack for additional usage.`;
  }

  return { predictedMonthly: predicted, included, overage, overageCost, recommendation };
}

// ── Upgrade Triggers ────────────────────────────────────────────────

export interface UpgradeTrigger {
  triggered: boolean;
  reason: string;
  suggestedPlan: string;
  savingsPercent: number;
}

export function checkUpgradeTriggers(inputs: {
  os: "logistics" | "industry";
  currentPlan: string;
  vehicleCount: number;
  monthlyDeliveries: number;
  userCount: number;
  outletCount: number;
  aiCreditsUsed: number;
  aiCreditsIncluded: number;
}): UpgradeTrigger[] {
  const triggers: UpgradeTrigger[] = [];
  const { os, currentPlan, vehicleCount, monthlyDeliveries, userCount, outletCount, aiCreditsUsed, aiCreditsIncluded } = inputs;

  if (os === "logistics") {
    if (currentPlan === "free" && (vehicleCount > 1 || monthlyDeliveries > 10)) {
      triggers.push({ triggered: true, reason: "Your fleet size exceeds Free tier limits.", suggestedPlan: "starter", savingsPercent: 0 });
    }
    if (currentPlan === "starter" && monthlyDeliveries > 500) {
      triggers.push({ triggered: true, reason: "High delivery volume - Growth unlocks AI optimization.", suggestedPlan: "growth", savingsPercent: 18 });
    }
  } else {
    if (currentPlan === "free" && userCount > 2) {
      triggers.push({ triggered: true, reason: "You've exceeded the 2-user Free limit.", suggestedPlan: "growth", savingsPercent: 0 });
    }
    if (currentPlan === "growth" && outletCount > 5000) {
      triggers.push({ triggered: true, reason: "Enterprise unlocks unlimited outlets and advanced AI.", suggestedPlan: "enterprise", savingsPercent: 22 });
    }
  }

  if (aiCreditsIncluded > 0 && aiCreditsUsed > aiCreditsIncluded * 0.85) {
    triggers.push({ triggered: true, reason: "AI credit usage at 85%+ - upgrade for higher allocation.", suggestedPlan: currentPlan === "growth" ? "enterprise" : "custom", savingsPercent: 15 });
  }

  return triggers;
}

// ── Helpers ─────────────────────────────────────────────────────────

function emptyEstimate(currency: string, sym: string): PricingEstimate {
  return {
    baseCost: 0, usageCost: 0, aiCreditsIncluded: 0, aiCreditsCost: 0,
    totalMonthly: 0, recommendedPlan: "free", planLabel: "Free",
    currency, currencySymbol: sym, breakdown: [], nudge: "",
  };
}

function getNudge(plan: string, os: "logistics" | "industry"): string {
  if (os === "logistics") {
    switch (plan) {
      case "free": return "Start free - upgrade when you scale.";
      case "starter": return "Most fleet operators your size choose Starter.";
      case "growth": return "Growth unlocks AI route optimization and 500 credits.";
      case "enterprise": return "Enterprise gives unlimited dispatches and dedicated support.";
      default: return "";
    }
  }
  switch (plan) {
    case "free": return "Try free with up to 2 users - no card required.";
    case "growth": return "Most sales teams your size choose Growth.";
    case "enterprise": return "Enterprise unlocks full API, PRM, and 1,000 AI credits/user.";
    case "custom": return "Let's design a custom package for your scale.";
    default: return "";
  }
}
