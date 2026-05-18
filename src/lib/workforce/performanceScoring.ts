// Workforce Performance Scoring Engine (Module 9)
// Pure-function scorer + recommendation generator. Non-destructive - reads only.

export type ScoreInputs = {
  signins: Array<{ status: string; signin_at: string | null; signin_date: string }>;
  kpis: Array<{ metric_key: string; metric_value: number; target_value: number | null; unit?: string | null }>;
  periodDays: number;
};

export type ScoreOutput = {
  score: number;
  tier: "top" | "strong" | "developing" | "at_risk";
  attendance_score: number;
  productivity_score: number;
  quality_score: number;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  ai_summary: string;
};

export function computePerformance(inputs: ScoreInputs): ScoreOutput {
  const { signins, kpis, periodDays } = inputs;

  // --- Attendance (40% of total) ---
  const present = signins.filter((s) => s.status !== "absent").length;
  const onTime = signins.filter((s) => s.status === "on_time" || s.status === "remote").length;
  const attendance_rate = periodDays > 0 ? present / periodDays : 0;
  const punctuality_rate = present > 0 ? onTime / present : 0;
  const attendance_score = Math.round((attendance_rate * 0.6 + punctuality_rate * 0.4) * 100);

  // --- Productivity (40%) - average of KPI achievement ratios ---
  const kpisWithTarget = kpis.filter((k) => k.target_value && k.target_value > 0);
  const productivity_score = kpisWithTarget.length
    ? Math.round(
        Math.min(
          100,
          (kpisWithTarget.reduce(
            (sum, k) => sum + Math.min(1.5, k.metric_value / (k.target_value || 1)),
            0
          ) /
            kpisWithTarget.length) *
            100
        )
      )
    : 60;

  // --- Quality (20%) - placeholder: derived from any "quality"/"csat" metrics ---
  const qualityKpis = kpis.filter((k) =>
    /quality|csat|rating|accuracy|sla/i.test(k.metric_key)
  );
  const quality_score = qualityKpis.length
    ? Math.round(
        (qualityKpis.reduce((s, k) => s + Math.min(100, k.metric_value), 0) / qualityKpis.length) *
          (qualityKpis[0].unit === "%" ? 1 : 1)
      )
    : 70;

  const score = Math.round(
    attendance_score * 0.4 + productivity_score * 0.4 + quality_score * 0.2
  );

  const tier: ScoreOutput["tier"] =
    score >= 85 ? "top" : score >= 70 ? "strong" : score >= 55 ? "developing" : "at_risk";

  const strengths: string[] = [];
  const gaps: string[] = [];
  const recommendations: string[] = [];

  if (attendance_score >= 90) strengths.push("Excellent attendance & punctuality");
  else if (attendance_score < 70) {
    gaps.push("Attendance below target");
    recommendations.push("Schedule a check-in to discuss attendance patterns");
  }

  if (productivity_score >= 85) strengths.push("Consistently exceeds KPI targets");
  else if (productivity_score < 60) {
    gaps.push("KPI achievement below target");
    recommendations.push("Pair with a high-performer for one week of shadowing");
  }

  if (quality_score >= 85) strengths.push("Strong service quality scores");
  else if (quality_score < 60) {
    gaps.push("Quality / CSAT below benchmark");
    recommendations.push("Enroll in a focused quality micro-training (15 min/day)");
  }

  if (recommendations.length === 0) {
    recommendations.push("Maintain current cadence - review again next period");
  }

  const ai_summary = `${tier.toUpperCase()} performer (${score}/100). Attendance ${attendance_score}, Productivity ${productivity_score}, Quality ${quality_score}.`;

  return {
    score,
    tier,
    attendance_score,
    productivity_score,
    quality_score,
    strengths,
    gaps,
    recommendations,
    ai_summary,
  };
}
