/**
 * Route Confidence Score Engine - Weighted Predictive Model
 *
 * Score = Traffic Predictability (25%) + Historical SLA Compliance (25%)
 *       + Driver Reliability (15%) + Fuel Variance Stability (15%)
 *       + Border/Compliance Risk (20%)
 *
 * All inputs normalized 0–100 (higher = better).
 * Final score = weighted sum (0–100).
 */

export interface ConfidenceInputs {
  /** Historical on-time delivery rate for this corridor, 0-100 */
  trafficPredictability: number;
  /** Historical SLA compliance % for this corridor, 0-100 */
  historicalSLACompliance: number;
  /** Driver reliability score (ratings, on-time, route adherence), 0-100 */
  driverReliability: number;
  /** Fuel price stability - 100 minus variance severity, 0-100 */
  fuelVarianceStability: number;
  /** Border/compliance risk - 100 minus risk index, 0-100 */
  borderComplianceRisk: number;
}

export interface ConfidenceResult {
  score: number;            // 0–100
  label: string;            // Human readable label
  color: "green" | "yellow" | "red";
  breakdown: {
    traffic: number;
    sla: number;
    driver: number;
    fuel: number;
    border: number;
  };
  hasData: boolean;
  displayText: string;
}

const WEIGHTS = {
  traffic: 0.25,
  sla: 0.25,
  driver: 0.15,
  fuel: 0.15,
  border: 0.20,
};

const SENTINEL = -1; // marks "no data available"

export function calculateRouteConfidence(inputs: Partial<ConfidenceInputs>): ConfidenceResult {
  const {
    trafficPredictability = SENTINEL,
    historicalSLACompliance = SENTINEL,
    driverReliability = SENTINEL,
    fuelVarianceStability = SENTINEL,
    borderComplianceRisk = SENTINEL,
  } = inputs;

  const hasData =
    trafficPredictability !== SENTINEL &&
    historicalSLACompliance !== SENTINEL &&
    driverReliability !== SENTINEL;

  if (!hasData) {
    return {
      score: 0,
      label: "Pending",
      color: "yellow",
      breakdown: { traffic: 0, sla: 0, driver: 0, fuel: 0, border: 0 },
      hasData: false,
      displayText: "Insufficient Data - Confidence Pending",
    };
  }

  // Clamp each to 0–100
  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const t = clamp(trafficPredictability);
  const s = clamp(historicalSLACompliance);
  const d = clamp(driverReliability);
  const f = fuelVarianceStability !== SENTINEL ? clamp(fuelVarianceStability) : 70; // default moderate
  const b = borderComplianceRisk !== SENTINEL ? clamp(borderComplianceRisk) : 75; // default moderate

  const score = Math.round(
    t * WEIGHTS.traffic +
    s * WEIGHTS.sla +
    d * WEIGHTS.driver +
    f * WEIGHTS.fuel +
    b * WEIGHTS.border
  );

  const label =
    score >= 90 ? "Very High Confidence" :
    score >= 80 ? "High Confidence" :
    score >= 65 ? "Moderate Confidence" :
    score >= 50 ? "Low Confidence" :
    "High Risk";

  const color: "green" | "yellow" | "red" =
    score >= 75 ? "green" : score >= 55 ? "yellow" : "red";

  const slaLabel =
    score >= 80 ? "Low SLA Risk" :
    score >= 60 ? "Moderate SLA Risk" :
    "High SLA Risk";

  return {
    score,
    label,
    color,
    breakdown: {
      traffic: Math.round(t * WEIGHTS.traffic),
      sla: Math.round(s * WEIGHTS.sla),
      driver: Math.round(d * WEIGHTS.driver),
      fuel: Math.round(f * WEIGHTS.fuel),
      border: Math.round(b * WEIGHTS.border),
    },
    hasData: true,
    displayText: `Route Confidence: ${score}% - ${slaLabel}`,
  };
}

/**
 * Derive confidence inputs from available corridor data.
 * Used when we have aggregate metrics but not explicit scores.
 */
export function deriveConfidenceFromCorridor(params: {
  congestionPct: number;       // 0-100, higher = worse
  historicalSLAPct: number;    // 0-100, higher = better
  fuelVariancePct: number;     // 0-100, higher = more variance (worse)
  theftRiskIndex: number;      // 0-100, higher = more risk (worse)
  politicalRiskIndex: number;  // 0-100, higher = more risk (worse)
  driverRatingAvg?: number;    // 0-5 stars → normalized to 0-100
}): ConfidenceInputs {
  return {
    trafficPredictability: Math.max(0, 100 - params.congestionPct),
    historicalSLACompliance: params.historicalSLAPct,
    driverReliability: params.driverRatingAvg != null
      ? (params.driverRatingAvg / 5) * 100
      : 75, // default
    fuelVarianceStability: Math.max(0, 100 - params.fuelVariancePct),
    borderComplianceRisk: Math.max(
      0,
      100 - ((params.theftRiskIndex + params.politicalRiskIndex) / 2)
    ),
  };
}

/**
 * Compute ETA in days using the standard formula:
 * ETA_days = (travel_hours + drops × 2h) / 24
 * Rounded to nearest 0.5 day (minimum 0.5).
 */
export function computeETADays(travelHours: number, numberOfDrops: number): number {
  const total = travelHours + numberOfDrops * 2;
  const raw = total / 24;
  // Round to nearest 0.5
  return Math.max(0.5, Math.round(raw * 2) / 2);
}

export function formatETADays(days: number): string {
  if (days < 1) return `${Math.round(days * 24)}h`;
  if (days === 1) return "1 day";
  if (days % 1 === 0) return `${days} days`;
  return `${days} days`;
}

/**
 * Dynamic Insurance Premium Calculator
 * Formula: Base Rate × Risk Multiplier × Cargo Value Modifier
 */
export interface InsurancePricingInput {
  baseRatePercent: number;      // e.g. 1.2 (1.2%)
  routeRiskIndex: number;       // 0–100 (from risk hedge engine)
  cargoValueNGN: number;        // cargo declared value in NGN
  cargoType: "general" | "petroleum" | "electronics" | "perishable" | "construction" | "pharma";
  corridorTheftRisk: number;    // 0-100
  driverReliabilityScore: number; // 0-100
}

const CARGO_MODIFIERS: Record<string, number> = {
  general: 1.0,
  petroleum: 2.3,
  electronics: 2.8,
  perishable: 1.5,
  construction: 1.3,
  pharma: 1.8,
};

export interface InsurancePricingResult {
  premiumRatePercent: number;  // final %
  premiumAmountNGN: number;    // ₦ value
  riskMultiplier: number;
  cargoModifier: number;
  autoApproved: boolean;
  underwritingNote: string;
}

export function calculateInsurancePremium(input: InsurancePricingInput): InsurancePricingResult {
  const riskMult = 1 + (input.routeRiskIndex / 100) * 1.5;
  const cargoMod = CARGO_MODIFIERS[input.cargoType] ?? 1.0;
  // Driver reliability discount: high reliability = up to 20% discount
  const driverDiscount = 1 - (input.driverReliabilityScore / 100) * 0.2;

  const finalRate = input.baseRatePercent * riskMult * cargoMod * driverDiscount;
  const premiumNGN = Math.round((finalRate / 100) * input.cargoValueNGN);

  const autoApproved = input.routeRiskIndex < 70 && input.corridorTheftRisk < 65;

  const underwritingNote =
    input.routeRiskIndex >= 85
      ? "⚠ Special terms required - senior underwriter sign-off needed"
      : input.routeRiskIndex >= 70
      ? "Manual review required before policy issuance"
      : "Auto-approved - standard terms apply";

  return {
    premiumRatePercent: Math.round(finalRate * 100) / 100,
    premiumAmountNGN: premiumNGN,
    riskMultiplier: Math.round(riskMult * 100) / 100,
    cargoModifier: cargoMod,
    autoApproved,
    underwritingNote,
  };
}
