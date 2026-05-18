import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { rateLimit } from "../_shared/rate-limit.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) throw new Error("Unauthorized");

    // Phase 9: per-user rate limit (30 req/min - AI credits).
    const rl = rateLimit({ bucket: "governance-ai", identifier: user.id, limit: 30, windowMs: 60_000 });
    if (!rl.allowed) return rl.response!;

    const { action, entity_type, entity_id, entity_data } = await req.json();

    if (action === "score_risk") {
      const riskResult = await scoreRisk(supabase, entity_type, entity_id, entity_data);
      return jsonResponse(riskResult);
    }

    if (action === "detect_fraud") {
      const fraudResult = await detectFraud(supabase, entity_type, entity_id, entity_data);
      return jsonResponse(fraudResult);
    }

    if (action === "predict_delay") {
      const delayResult = await predictDelay(supabase, entity_type, entity_id, entity_data);
      return jsonResponse(delayResult);
    }

    if (action === "compute_treasury_stress") {
      const stressResult = await computeTreasuryStress(supabase);
      return jsonResponse(stressResult);
    }

    if (action === "full_assessment") {
      const [risk, fraud, delay, stress] = await Promise.all([
        scoreRisk(supabase, entity_type, entity_id, entity_data),
        detectFraud(supabase, entity_type, entity_id, entity_data),
        predictDelay(supabase, entity_type, entity_id, entity_data),
        computeTreasuryStress(supabase),
      ]);
      return jsonResponse({ risk, fraud, delay, stress });
    }

    throw new Error("Invalid action: " + action);
  } catch (e) {
    console.error("governance-ai error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function jsonResponse(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function scoreRisk(supabase: any, entityType: string, entityId: string, data: any) {
  const factors: { factor: string; weight: number; score: number; explanation: string }[] = [];
  const amount = data?.amount || data?.total_amount || 0;

  // Factor 1: Amount anomaly
  const { data: historicalAmounts } = await supabase
    .from(entityType === "invoice" ? "invoices" : entityType === "expense" ? "expenses" : "dispatches")
    .select("total_amount, cost")
    .limit(50)
    .order("created_at", { ascending: false });

  if (historicalAmounts?.length > 0) {
    const values = historicalAmounts.map((r: any) => r.total_amount || r.cost || 0).filter((v: number) => v > 0);
    const avg = values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
    const deviation = avg > 0 ? ((amount - avg) / avg) * 100 : 0;
    const amountScore = Math.min(100, Math.max(0, Math.abs(deviation)));
    factors.push({
      factor: "amount_anomaly",
      weight: 0.25,
      score: amountScore,
      explanation: `Amount ${amount > avg ? "exceeds" : "below"} historical average by ${Math.abs(deviation).toFixed(0)}%`,
    });
  }

  // Factor 2: Frequency anomaly (same entity type in last 24h)
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const tableName = entityType === "invoice" ? "invoices" : entityType === "expense" ? "expenses" : "dispatches";
  const { count: recentCount } = await supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .gte("created_at", oneDayAgo);

  const freqScore = Math.min(100, (recentCount || 0) * 5);
  factors.push({
    factor: "frequency_anomaly",
    weight: 0.15,
    score: freqScore,
    explanation: `${recentCount || 0} similar ${entityType}s created in last 24h`,
  });

  // Factor 3: Time-of-day anomaly
  const hour = new Date().getUTCHours();
  const offHours = hour < 6 || hour > 22;
  factors.push({
    factor: "time_anomaly",
    weight: 0.10,
    score: offHours ? 70 : 10,
    explanation: offHours ? "Submitted during off-hours (suspicious)" : "Normal business hours",
  });

  // Factor 4: Treasury liquidity pressure
  const { data: latestStress } = await supabase
    .from("treasury_stress_index")
    .select("stress_score")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const treasuryScore = latestStress?.stress_score || 20;
  factors.push({
    factor: "treasury_pressure",
    weight: 0.20,
    score: treasuryScore,
    explanation: `Treasury stress index at ${treasuryScore}/100`,
  });

  // Factor 5: Round number detection
  const isRound = amount > 0 && amount % 1000 === 0;
  factors.push({
    factor: "round_number",
    weight: 0.10,
    score: isRound ? 40 : 5,
    explanation: isRound ? "Round number amount (potential flag)" : "Non-round amount",
  });

  // Factor 6: VAT/WHT irregularity
  const vatRate = data?.vat_rate || data?.tax_amount ? (data.tax_amount / (data.amount || 1)) * 100 : 0;
  const vatIrregular = vatRate > 0 && (vatRate < 5 || vatRate > 25);
  factors.push({
    factor: "vat_irregularity",
    weight: 0.20,
    score: vatIrregular ? 60 : 5,
    explanation: vatIrregular ? `Unusual VAT rate: ${vatRate.toFixed(1)}%` : "VAT rate within normal range",
  });

  // Compute weighted score
  const riskScore = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0)
  );

  const riskLevel = riskScore <= 30 ? "low" : riskScore <= 60 ? "medium" : riskScore <= 80 ? "high" : "critical";

  const explainability = factors
    .sort((a, b) => b.score * b.weight - a.score * a.weight)
    .map(f => f.explanation)
    .join(". ");

  // Store result
  await supabase.from("approval_risk_scores").insert({
    entity_type: entityType,
    entity_id: entityId,
    risk_score: riskScore,
    risk_level: riskLevel,
    risk_factors: factors,
    explainability_summary: explainability,
  });

  return { risk_score: riskScore, risk_level: riskLevel, factors, explainability_summary: explainability };
}

async function detectFraud(supabase: any, entityType: string, entityId: string, data: any) {
  const flags: { fraud_type: string; confidence: number; explanation: string }[] = [];
  const amount = data?.amount || data?.total_amount || 0;

  // Check 1: Split invoicing (multiple invoices just below threshold)
  if (entityType === "invoice" || entityType === "expense") {
    const { data: policies } = await supabase
      .from("approval_policies")
      .select("min_amount_threshold")
      .eq("entity_type", entityType)
      .limit(1)
      .maybeSingle();

    const threshold = policies?.min_amount_threshold || 500000;
    if (amount > threshold * 0.8 && amount < threshold) {
      flags.push({
        fraud_type: "split_invoicing",
        confidence: 65,
        explanation: `Amount ${amount} is suspiciously close to approval threshold ${threshold} (${((amount / threshold) * 100).toFixed(0)}%)`,
      });
    }
  }

  // Check 2: Duplicate patterns
  const tableName = entityType === "invoice" ? "invoices" : entityType === "expense" ? "expenses" : "dispatches";
  const amountField = entityType === "dispatch" ? "cost" : "total_amount";
  const { data: duplicates } = await supabase
    .from(tableName)
    .select("id")
    .eq(amountField, amount)
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .limit(5);

  if ((duplicates?.length || 0) >= 3) {
    flags.push({
      fraud_type: "duplicate_pattern",
      confidence: 70,
      explanation: `${duplicates.length} identical amounts of ${amount} found in last 7 days`,
    });
  }

  // Check 3: Midnight approval attempt
  const hour = new Date().getUTCHours();
  if (hour >= 0 && hour < 5) {
    flags.push({
      fraud_type: "suspicious_timing",
      confidence: 45,
      explanation: "Transaction submitted during midnight hours (00:00-05:00 UTC)",
    });
  }

  // Check 4: Round number pattern
  if (amount > 0 && amount % 10000 === 0 && amount >= 100000) {
    flags.push({
      fraud_type: "round_number_transaction",
      confidence: 35,
      explanation: `Suspicious round number: ${amount}`,
    });
  }

  // Store flags
  for (const flag of flags) {
    await supabase.from("fraud_flags").insert({
      entity_type: entityType,
      entity_id: entityId,
      fraud_type: flag.fraud_type,
      confidence_score: flag.confidence,
      trigger_source: "governance_ai_engine",
      explanation: flag.explanation,
      flag_status: flag.confidence >= 75 ? "escalated" : "active",
    });
  }

  const maxConfidence = flags.length > 0 ? Math.max(...flags.map(f => f.confidence)) : 0;

  return {
    fraud_detected: flags.length > 0,
    max_confidence: maxConfidence,
    flags,
    action: maxConfidence >= 75 ? "freeze" : maxConfidence >= 40 ? "escalate" : "none",
  };
}

async function predictDelay(supabase: any, entityType: string, entityId: string, data: any) {
  // Get historical approval times
  const { data: history } = await supabase
    .from("approvals")
    .select("created_at, updated_at, status")
    .eq("entity_type", entityType)
    .in("status", ["approved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(30);

  let avgHours = 24; // default
  if (history?.length > 0) {
    const times = history
      .filter((h: any) => h.updated_at && h.created_at)
      .map((h: any) => (new Date(h.updated_at).getTime() - new Date(h.created_at).getTime()) / 3600000);
    if (times.length > 0) {
      avgHours = times.reduce((a: number, b: number) => a + b, 0) / times.length;
    }
  }

  // Adjust for amount
  const amount = data?.amount || data?.total_amount || 0;
  const amountMultiplier = amount > 1000000 ? 1.5 : amount > 500000 ? 1.2 : 1.0;

  // Adjust for treasury stress
  const { data: stress } = await supabase
    .from("treasury_stress_index")
    .select("stress_score")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stressMultiplier = (stress?.stress_score || 0) > 60 ? 1.4 : 1.0;

  const predictedHours = Math.round(avgHours * amountMultiplier * stressMultiplier * 10) / 10;
  const confidence = Math.min(95, 50 + (history?.length || 0) * 1.5);
  const delayRisk = predictedHours > 48 ? "critical" : predictedHours > 24 ? "high" : predictedHours > 8 ? "medium" : "low";

  await supabase.from("approval_delay_predictions").insert({
    entity_type: entityType,
    entity_id: entityId,
    predicted_approval_hours: predictedHours,
    confidence_level: confidence,
    delay_risk_level: delayRisk,
    factors: [
      { factor: "historical_avg", value: avgHours },
      { factor: "amount_multiplier", value: amountMultiplier },
      { factor: "stress_multiplier", value: stressMultiplier },
    ],
  });

  return {
    predicted_hours: predictedHours,
    confidence,
    delay_risk: delayRisk,
    suggestion: predictedHours > 24
      ? "Consider escalating due to predicted delay. Submit during morning hours for faster processing."
      : "Expected to be processed within normal timeframe.",
  };
}

async function computeTreasuryStress(supabase: any) {
  // Cash position
  const { data: wallets } = await supabase.from("wallets").select("balance").eq("status", "active");
  const totalCash = (wallets || []).reduce((s: number, w: any) => s + (w.balance || 0), 0);

  // AR pressure
  const { data: arData } = await supabase.from("accounts_receivable").select("balance").eq("status", "unpaid");
  const totalAR = (arData || []).reduce((s: number, r: any) => s + (r.balance || 0), 0);

  // AP pressure
  const { data: apData } = await supabase.from("accounts_payable").select("balance").in("status", ["pending", "overdue"]);
  const totalAP = (apData || []).reduce((s: number, r: any) => s + (r.balance || 0), 0);

  // Monthly burn estimate
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recentExpenses } = await supabase
    .from("expenses")
    .select("amount")
    .gte("created_at", thirtyDaysAgo);
  const monthlyBurn = (recentExpenses || []).reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const currentRatio = totalAP > 0 ? (totalCash + totalAR) / totalAP : 10;
  const liquidityRatio = monthlyBurn > 0 ? totalCash / monthlyBurn : 10;
  const runwayDays = monthlyBurn > 0 ? (totalCash / (monthlyBurn / 30)) : 365;

  // FX exposure
  const fxExposure = 0; // Would need multi-currency data

  // Compute stress score
  let stressScore = 0;
  if (runwayDays < 30) stressScore += 40;
  else if (runwayDays < 90) stressScore += 25;
  else if (runwayDays < 180) stressScore += 10;

  if (currentRatio < 1) stressScore += 30;
  else if (currentRatio < 1.5) stressScore += 15;

  if (liquidityRatio < 1) stressScore += 20;
  else if (liquidityRatio < 2) stressScore += 10;

  if (totalAP > totalCash) stressScore += 10;

  stressScore = Math.min(100, stressScore);

  await supabase.from("treasury_stress_index").insert({
    stress_score: stressScore,
    liquidity_ratio: Math.round(liquidityRatio * 100) / 100,
    runway_days: Math.round(runwayDays),
    fx_exposure: fxExposure,
    ar_pressure: totalAR,
    ap_pressure: totalAP,
    current_ratio: Math.round(currentRatio * 100) / 100,
    factors: { totalCash, totalAR, totalAP, monthlyBurn },
  });

  return {
    stress_score: stressScore,
    stress_level: stressScore <= 30 ? "stable" : stressScore <= 60 ? "moderate" : stressScore <= 80 ? "high" : "critical",
    liquidity_ratio: Math.round(liquidityRatio * 100) / 100,
    runway_days: Math.round(runwayDays),
    current_ratio: Math.round(currentRatio * 100) / 100,
    dynamic_rules: stressScore > 60
      ? { lower_auto_threshold: true, extra_approval_levels: 1, restrict_high_risk_vendors: true, require_treasury_cosign: stressScore > 80 }
      : { lower_auto_threshold: false, extra_approval_levels: 0, restrict_high_risk_vendors: false, require_treasury_cosign: false },
  };
}
