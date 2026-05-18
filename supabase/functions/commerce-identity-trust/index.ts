import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { action, rcid, entity_data } = await req.json();

    if (action === "compute_trust_scores") {
      const result = await computeTrustScores(supabase);
      return jsonResponse(result);
    }

    if (action === "get_identity_overview") {
      const result = await getIdentityOverview(supabase);
      return jsonResponse(result);
    }

    if (action === "verify_business") {
      const result = await verifyBusiness(supabase, rcid, entity_data);
      return jsonResponse(result);
    }

    if (action === "detect_identity_fraud") {
      const result = await detectIdentityFraud(supabase);
      return jsonResponse(result);
    }

    if (action === "get_trust_analytics") {
      const result = await getTrustAnalytics(supabase);
      return jsonResponse(result);
    }

    throw new Error("Invalid action: " + action);
  } catch (e) {
    console.error("commerce-identity-trust error:", e);
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

async function computeTrustScores(supabase: any) {
  const { data: identities } = await supabase
    .from("commerce_identities")
    .select("*")
    .eq("is_active", true);

  if (!identities?.length) return { updated: 0, scores: [] };

  const scores: any[] = [];

  for (const identity of identities) {
    // Get trade history stats
    const { data: trades } = await supabase
      .from("trade_history_ledger")
      .select("amount, status, performance_rating")
      .eq("rcid", identity.rcid);

    const totalTrades = trades?.length || 0;
    const completedTrades = trades?.filter((t: any) => t.status === "completed").length || 0;
    const avgRating = trades?.length
      ? trades.filter((t: any) => t.performance_rating).reduce((s: number, t: any) => s + (t.performance_rating || 0), 0) / Math.max(1, trades.filter((t: any) => t.performance_rating).length)
      : 0;
    const tradeVolume = trades?.reduce((s: number, t: any) => s + (t.amount || 0), 0) || 0;

    // Get disputes
    const { count: openDisputes } = await supabase
      .from("trade_disputes")
      .select("id", { count: "exact", head: true })
      .or(`complainant_rcid.eq.${identity.rcid},respondent_rcid.eq.${identity.rcid}`)
      .eq("status", "open");

    // Get compliance records
    const { count: validCompliance } = await supabase
      .from("compliance_registry")
      .select("id", { count: "exact", head: true })
      .eq("rcid", identity.rcid)
      .eq("status", "valid");

    // Compute trust score (0-100)
    let trustScore = 30; // base

    // Trade completion rate (max +25)
    const completionRate = totalTrades > 0 ? completedTrades / totalTrades : 0;
    trustScore += Math.round(completionRate * 25);

    // Rating bonus (max +20)
    trustScore += Math.round((avgRating / 5) * 20);

    // Volume bonus (max +10)
    if (tradeVolume > 10000000) trustScore += 10;
    else if (tradeVolume > 1000000) trustScore += 7;
    else if (tradeVolume > 100000) trustScore += 4;

    // Compliance bonus (max +10)
    trustScore += Math.min(10, (validCompliance || 0) * 3);

    // Verification bonus (+5)
    if (identity.verification_level === "verified") trustScore += 5;

    // Dispute penalty
    trustScore -= Math.min(20, (openDisputes || 0) * 5);

    trustScore = Math.max(0, Math.min(100, trustScore));

    const trustGrade = trustScore >= 90 ? "AAA" : trustScore >= 80 ? "AA" : trustScore >= 70 ? "A" : trustScore >= 60 ? "BBB" : trustScore >= 50 ? "BB" : trustScore >= 40 ? "B" : "C";

    // Determine badges
    const badges: string[] = [];
    if (identity.verification_level === "verified") badges.push("Verified Business");
    if (completionRate >= 0.95 && totalTrades >= 10) badges.push("High Reliability");
    if (avgRating >= 4.5) badges.push("Top Rated");
    if (tradeVolume >= 10000000) badges.push("High Volume Trader");
    if ((validCompliance || 0) >= 3) badges.push("Fully Compliant");
    if ((openDisputes || 0) === 0 && totalTrades >= 5) badges.push("Dispute Free");

    await supabase
      .from("commerce_identities")
      .update({
        trust_score: trustScore,
        trust_grade: trustGrade,
        trade_volume_total: tradeVolume,
        delivery_completion_rate: Math.round(completionRate * 100),
        payment_reliability_score: Math.round(avgRating * 20),
        dispute_count: openDisputes || 0,
        badges,
        updated_at: new Date().toISOString(),
      })
      .eq("id", identity.id);

    scores.push({
      rcid: identity.rcid,
      business_name: identity.business_name,
      trust_score: trustScore,
      trust_grade: trustGrade,
      badges,
    });
  }

  return { updated: scores.length, scores };
}

async function getIdentityOverview(supabase: any) {
  const { data: identities, count: totalIdentities } = await supabase
    .from("commerce_identities")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("trust_score", { ascending: false })
    .limit(50);

  const { count: verified } = await supabase
    .from("commerce_identities")
    .select("id", { count: "exact", head: true })
    .eq("verification_level", "verified");

  const { count: openDisputes } = await supabase
    .from("trade_disputes")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");

  const { count: activeContracts } = await supabase
    .from("trade_contracts")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalBadges } = await supabase
    .from("trust_badges")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const avgTrustScore = identities?.length
    ? Math.round(identities.reduce((s: number, i: any) => s + (i.trust_score || 0), 0) / identities.length)
    : 0;

  // Trust grade distribution
  const gradeDistribution: Record<string, number> = {};
  (identities || []).forEach((i: any) => {
    gradeDistribution[i.trust_grade || "unrated"] = (gradeDistribution[i.trust_grade || "unrated"] || 0) + 1;
  });

  // Entity type distribution
  const entityDistribution: Record<string, number> = {};
  (identities || []).forEach((i: any) => {
    entityDistribution[i.entity_type || "other"] = (entityDistribution[i.entity_type || "other"] || 0) + 1;
  });

  return {
    total_identities: totalIdentities || 0,
    verified_count: verified || 0,
    open_disputes: openDisputes || 0,
    active_contracts: activeContracts || 0,
    total_badges: totalBadges || 0,
    avg_trust_score: avgTrustScore,
    grade_distribution: gradeDistribution,
    entity_distribution: entityDistribution,
    top_entities: (identities || []).slice(0, 10),
  };
}

async function verifyBusiness(supabase: any, rcid: string, data: any) {
  const checks: Record<string, boolean> = {};

  // Registration check
  checks.registration = !!(data?.registration_number && data.registration_number.length >= 6);
  // Tax ID check
  checks.tax_id = !!(data?.tax_id && data.tax_id.length >= 8);
  // Contact verification
  checks.email = !!(data?.email && data.email.includes("@"));
  checks.phone = !!(data?.phone && data.phone.length >= 10);
  // Bank verification
  checks.bank_account = !!(data?.bank_account_number);

  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const verificationLevel = passedChecks >= 4 ? "verified" : passedChecks >= 2 ? "partial" : "unverified";

  await supabase
    .from("commerce_identities")
    .update({
      verification_level: verificationLevel,
      verification_checks: checks,
      verified_at: verificationLevel === "verified" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("rcid", rcid);

  // Award badge
  if (verificationLevel === "verified") {
    await supabase.from("trust_badges").insert({
      rcid,
      badge_type: "verification",
      badge_name: "RouteAce Verified",
      criteria_met: checks,
    });
  }

  return {
    rcid,
    verification_level: verificationLevel,
    checks,
    passed: passedChecks,
    total: totalChecks,
  };
}

async function detectIdentityFraud(supabase: any) {
  const flags: any[] = [];

  // Check duplicate registrations
  const { data: identities } = await supabase
    .from("commerce_identities")
    .select("rcid, registration_number, tax_id, business_name")
    .eq("is_active", true);

  const regMap = new Map<string, string[]>();
  const taxMap = new Map<string, string[]>();

  (identities || []).forEach((i: any) => {
    if (i.registration_number) {
      const arr = regMap.get(i.registration_number) || [];
      arr.push(i.rcid);
      regMap.set(i.registration_number, arr);
    }
    if (i.tax_id) {
      const arr = taxMap.get(i.tax_id) || [];
      arr.push(i.rcid);
      taxMap.set(i.tax_id, arr);
    }
  });

  regMap.forEach((rcids, regNum) => {
    if (rcids.length > 1) {
      flags.push({
        type: "duplicate_registration",
        severity: "high",
        details: `Registration ${regNum} used by ${rcids.length} entities: ${rcids.join(", ")}`,
        rcids,
      });
    }
  });

  taxMap.forEach((rcids, taxId) => {
    if (rcids.length > 1) {
      flags.push({
        type: "duplicate_tax_id",
        severity: "critical",
        details: `Tax ID ${taxId} used by ${rcids.length} entities: ${rcids.join(", ")}`,
        rcids,
      });
    }
  });

  // Check for entities with high disputes and low trust
  const { data: highRisk } = await supabase
    .from("commerce_identities")
    .select("rcid, business_name, trust_score, dispute_count")
    .lt("trust_score", 30)
    .gt("dispute_count", 3);

  (highRisk || []).forEach((entity: any) => {
    flags.push({
      type: "high_risk_entity",
      severity: "high",
      details: `${entity.business_name} (${entity.rcid}) has trust score ${entity.trust_score} with ${entity.dispute_count} disputes`,
      rcids: [entity.rcid],
    });
  });

  return { fraud_flags: flags, total_flags: flags.length };
}

async function getTrustAnalytics(supabase: any) {
  const { data: identities } = await supabase
    .from("commerce_identities")
    .select("trust_score, trust_grade, entity_type, country_code, trade_volume_total, delivery_completion_rate, payment_reliability_score, created_at")
    .eq("is_active", true);

  // Regional benchmarks
  const countryScores: Record<string, number[]> = {};
  (identities || []).forEach((i: any) => {
    const cc = i.country_code || "NG";
    if (!countryScores[cc]) countryScores[cc] = [];
    countryScores[cc].push(i.trust_score || 0);
  });

  const benchmarks: Record<string, number> = {};
  Object.entries(countryScores).forEach(([cc, scores]) => {
    benchmarks[cc] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  });

  // Monthly trend (last 6 months)
  const trend: { month: string; avg_score: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const month = d.toISOString().slice(0, 7);
    const monthEntities = (identities || []).filter((e: any) => e.created_at?.startsWith(month));
    trend.push({
      month,
      avg_score: monthEntities.length ? Math.round(monthEntities.reduce((s: number, e: any) => s + (e.trust_score || 0), 0) / monthEntities.length) : 0,
      count: monthEntities.length,
    });
  }

  return {
    total_entities: identities?.length || 0,
    regional_benchmarks: benchmarks,
    trend,
    avg_delivery_completion: identities?.length
      ? Math.round((identities.reduce((s: number, i: any) => s + (i.delivery_completion_rate || 0), 0) / identities.length))
      : 0,
    avg_payment_reliability: identities?.length
      ? Math.round((identities.reduce((s: number, i: any) => s + (i.payment_reliability_score || 0), 0) / identities.length))
      : 0,
  };
}
