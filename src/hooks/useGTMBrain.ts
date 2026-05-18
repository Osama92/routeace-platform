import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Intent Classification Engine (rule-based MVP) ───────────────
const ACTIVE_BUY_KEYWORDS = [
  "need", "looking for", "searching for", "want", "require", "hiring",
  "delivery company", "logistics provider", "distributor", "supplier",
  "courier service", "freight", "haulage", "dispatch", "shipping company",
  "who can deliver", "recommend a", "help me find",
];

const PROBLEM_AWARE_KEYWORDS = [
  "delayed", "late delivery", "complaints", "poor service", "unreliable",
  "missing packages", "broken", "damaged", "lost shipment", "frustrated",
  "inefficient", "manual", "whatsapp dispatch", "no tracking",
];

const URGENCY_KEYWORDS = ["urgent", "asap", "immediately", "today", "now", "emergency"];

export function classifyIntent(content: string): { type: string; confidence: number; reasoning: string } {
  const lower = content.toLowerCase();
  
  const activeBuyHits = ACTIVE_BUY_KEYWORDS.filter(k => lower.includes(k));
  const problemHits = PROBLEM_AWARE_KEYWORDS.filter(k => lower.includes(k));
  const urgencyHits = URGENCY_KEYWORDS.filter(k => lower.includes(k));
  
  if (activeBuyHits.length >= 2 || (activeBuyHits.length >= 1 && urgencyHits.length >= 1)) {
    return {
      type: "active_buy",
      confidence: Math.min(0.95, 0.6 + activeBuyHits.length * 0.12 + urgencyHits.length * 0.1),
      reasoning: `Active buy signals: ${activeBuyHits.join(", ")}${urgencyHits.length ? ` (urgent: ${urgencyHits.join(", ")})` : ""}`,
    };
  }
  
  if (problemHits.length >= 1) {
    return {
      type: "problem_aware",
      confidence: Math.min(0.88, 0.5 + problemHits.length * 0.15),
      reasoning: `Problem signals detected: ${problemHits.join(", ")}`,
    };
  }
  
  if (activeBuyHits.length === 1) {
    return {
      type: "expansion",
      confidence: 0.55,
      reasoning: `Mild interest signal: ${activeBuyHits[0]}`,
    };
  }
  
  return { type: "passive", confidence: 0.3, reasoning: "No strong intent signals detected" };
}

// ─── Match Score Calculator ──────────────────────────────────────
export function calculateMatchScore(
  opportunity: { geo_location?: string; opportunity_type?: string },
  supplyNode: any
): {
  total: number;
  geo: number;
  serviceFit: number;
  capacity: number;
  performance: number;
  responseSpeed: number;
  historical: number;
} {
  // GEO_PROXIMITY (0.30 weight)
  let geo = 0.4; // default national
  const oppLoc = (opportunity.geo_location || "").toLowerCase();
  const nodeCity = (supplyNode.city || "").toLowerCase();
  const nodeState = (supplyNode.state || "").toLowerCase();
  if (oppLoc && (oppLoc.includes(nodeCity) || nodeCity.includes(oppLoc))) {
    geo = 1.0;
  } else if (oppLoc && (oppLoc.includes(nodeState) || nodeState.includes(oppLoc))) {
    geo = 0.7;
  }
  
  // SERVICE_FIT (0.25 weight)
  let serviceFit = 0.5;
  const oppType = opportunity.opportunity_type || "logistics";
  const nodeType = supplyNode.node_type || "";
  if (
    (oppType === "logistics" && nodeType === "logistics_operator") ||
    (oppType === "distribution" && nodeType === "distributor") ||
    (oppType === "sourcing" && (nodeType === "manufacturer" || nodeType === "distributor"))
  ) {
    serviceFit = 1.0;
  } else if (nodeType.includes("logistics") || nodeType.includes("distributor")) {
    serviceFit = 0.7;
  }
  
  // CAPACITY (0.15)
  const capacity = supplyNode.capacity?.level === "high" ? 1.0 : supplyNode.capacity?.level === "medium" ? 0.7 : 0.4;
  
  // PERFORMANCE (0.15)
  const performance = Math.min(1, (supplyNode.sla_compliance_rate || 0.5) * 0.5 + (supplyNode.delivery_success_rate || 0.5) * 0.5);
  
  // RESPONSE SPEED (0.10)
  const avgMins = supplyNode.avg_response_minutes || 60;
  const responseSpeed = avgMins <= 5 ? 1.0 : avgMins <= 15 ? 0.8 : avgMins <= 30 ? 0.6 : avgMins <= 60 ? 0.4 : 0.2;
  
  // HISTORICAL (0.05)
  const historical = supplyNode.historical_conversion_rate || 0.3;
  
  const total = (0.30 * geo) + (0.25 * serviceFit) + (0.15 * capacity) + (0.15 * performance) + (0.10 * responseSpeed) + (0.05 * historical);
  
  return { total: Math.round(total * 100) / 100, geo, serviceFit, capacity, performance, responseSpeed, historical };
}

// ─── Engagement Message Generator ────────────────────────────────
export function generateEngagementMessage(signal: any, intentType: string): string {
  const content = signal.content || "";
  
  if (intentType === "active_buy") {
    return `We noticed you're looking for logistics support${signal.geo_location ? ` in ${signal.geo_location}` : ""}. RouteAce connects businesses with verified, high-performance logistics operators. Would you like to see available providers in your area?`;
  }
  
  if (intentType === "problem_aware") {
    return `Delivery delays at scale are usually routing and visibility issues, not just rider problems. RouteAce helps operators optimize dispatch, track SLAs, and eliminate manual coordination. How are you currently planning your routes?`;
  }
  
  return `We help businesses find reliable logistics and distribution partners across Nigeria. Can we help you with your delivery needs?`;
}

// ─── Main Hook ───────────────────────────────────────────────────
export function useGTMBrain(osContext: "logistics" | "industry" = "logistics", _industryType?: string) {
  const { user } = useAuth();
  const [signals, setSignals] = useState<any[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [supplyNodes, setSupplyNodes] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [searchQueries, setSearchQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [sigR, entR, oppR, snR, matchR, convR, meetR, sqR] = await Promise.all([
        supabase.from("gtm_signals").select("*").eq("os_context", osContext).order("created_at", { ascending: false }).limit(200),
        supabase.from("gtm_entities").select("*").eq("os_context", osContext).order("created_at", { ascending: false }).limit(200),
        supabase.from("gtm_opportunities").select("*").eq("os_context", osContext).order("created_at", { ascending: false }).limit(200),
        supabase.from("gtm_supply_nodes").select("*").eq("os_context", osContext).order("created_at", { ascending: false }).limit(200),
        supabase.from("gtm_demand_supply_matches").select("*, gtm_opportunities(*), gtm_supply_nodes(*)").order("match_score", { ascending: false }).limit(200),
        supabase.from("gtm_conversations").select("*, gtm_entities(*), gtm_supply_nodes(*)").order("last_message_at", { ascending: false }).limit(100),
        supabase.from("gtm_meetings").select("*, gtm_entities(*), gtm_supply_nodes(*)").order("scheduled_time", { ascending: false }).limit(100),
        supabase.from("gtm_search_queries").select("*").eq("os_context", osContext).order("created_at", { ascending: false }).limit(200),
      ]);
      if (sigR.data) setSignals(sigR.data);
      if (entR.data) setEntities(entR.data);
      if (oppR.data) setOpportunities(oppR.data);
      if (snR.data) setSupplyNodes(snR.data);
      if (matchR.data) setMatches(matchR.data);
      if (convR.data) setConversations(convR.data);
      if (meetR.data) setMeetings(meetR.data);
      if (sqR.data) setSearchQueries(sqR.data);
    } catch (err) {
      console.error("GTM Brain fetch error:", err);
    }
    setLoading(false);
  }, [user, osContext]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Ingest a new signal and auto-classify
  const ingestSignal = useCallback(async (data: {
    source_type: string;
    source_platform: string;
    content: string;
    geo_location?: string;
    author_handle?: string;
    industry_tag?: string;
    raw_payload?: any;
  }) => {
    if (!user) return null;
    
    const { data: signal, error } = await supabase.from("gtm_signals").insert({
      ...data,
      os_context: osContext,
      created_by: user.id,
      is_processed: false,
    } as any).select().single();
    
    if (error) { toast.error("Failed to ingest signal"); return null; }
    
    // Auto-classify intent
    const intent = classifyIntent(data.content);
    await supabase.from("gtm_intent_classifications").insert({
      signal_id: (signal as any).id,
      intent_type: intent.type,
      confidence_score: intent.confidence,
      reasoning: intent.reasoning,
    } as any);
    
    // Auto-create entity if active buy
    let entityId: string | null = null;
    if (intent.type === "active_buy" || intent.type === "problem_aware") {
      const { data: entity } = await supabase.from("gtm_entities").insert({
        name: data.author_handle || `Signal from ${data.source_platform}`,
        entity_type: "company",
        location: data.geo_location || "",
        industry: data.industry_tag || "logistics",
        source_origin: data.source_platform,
        os_context: osContext,
      } as any).select().single();
      if (entity) entityId = (entity as any).id;
      
      // Score the intent
      const score = intent.confidence * 100;
      await supabase.from("gtm_intent_scores").insert({
        signal_id: (signal as any).id,
        entity_id: entityId,
        score,
        tier: score >= 80 ? "tier1" : score >= 50 ? "tier2" : "tier3",
        factors: { intent_confidence: intent.confidence, source: data.source_platform },
      } as any);
    }
    
    // Auto-create opportunity for high-intent signals
    if (intent.type === "active_buy" && intent.confidence >= 0.7) {
      const oppType = osContext === "logistics" ? "logistics" : "distribution";
      const { data: opp } = await supabase.from("gtm_opportunities").insert({
        entity_id: entityId,
        signal_id: (signal as any).id,
        opportunity_type: oppType,
        title: data.content.substring(0, 120),
        description: data.content,
        geo_location: data.geo_location || "",
        industry: data.industry_tag || "",
        stage: "new",
        priority: intent.confidence >= 0.85 ? "critical" : "high",
        os_context: osContext,
      } as any).select().single();
      
      // Auto-match with supply nodes
      if (opp) {
        await autoMatchOpportunity((opp as any).id);
      }
    }
    
    // Mark signal as processed
    await supabase.from("gtm_signals").update({ is_processed: true } as any).eq("id", (signal as any).id);
    
    toast.success(`Signal captured: ${intent.type} (${Math.round(intent.confidence * 100)}% confidence)`);
    await fetchAll();
    return signal;
  }, [user, osContext, fetchAll]);

  // Ingest search query
  const ingestSearchQuery = useCallback(async (data: {
    query_text: string;
    platform?: string;
    geo_location?: string;
    city?: string;
    state?: string;
    intent_type?: string;
  }) => {
    if (!user) return null;
    
    const intentType = data.intent_type || (osContext === "logistics" ? "logistics_needed" : "goods_needed");
    
    const { data: sq, error } = await supabase.from("gtm_search_queries").insert({
      ...data,
      intent_type: intentType,
      os_context: osContext,
      platform: data.platform || "google",
    } as any).select().single();
    
    if (error) { toast.error("Failed to capture search query"); return null; }
    
    // Create opportunity from search
    const { data: opp } = await supabase.from("gtm_opportunities").insert({
      search_query_id: (sq as any).id,
      opportunity_type: intentType === "logistics_needed" ? "logistics" : "distribution",
      title: data.query_text.substring(0, 120),
      description: `Search query from ${data.platform || "google"}: "${data.query_text}"`,
      geo_location: data.geo_location || data.city || "",
      stage: "new",
      priority: "high",
      os_context: osContext,
    } as any).select().single();
    
    if (opp) {
      await autoMatchOpportunity((opp as any).id);
    }
    
    toast.success("Search query captured and matched!");
    await fetchAll();
    return sq;
  }, [user, osContext, fetchAll]);

  // Auto-match opportunity against supply nodes
  const autoMatchOpportunity = useCallback(async (opportunityId: string) => {
    const { data: opp } = await supabase.from("gtm_opportunities").select("*").eq("id", opportunityId).single();
    if (!opp) return;
    
    const { data: nodes } = await supabase.from("gtm_supply_nodes").select("*").eq("is_active", true).eq("os_context", osContext);
    if (!nodes || nodes.length === 0) return;
    
    const scored = nodes.map((node: any) => {
      const scores = calculateMatchScore(opp as any, node);
      return { node, scores };
    }).sort((a, b) => b.scores.total - a.scores.total).slice(0, 5);
    
    for (const { node, scores } of scored) {
      await supabase.from("gtm_demand_supply_matches").insert({
        opportunity_id: opportunityId,
        supply_node_id: node.id,
        match_score: scores.total,
        geo_proximity_score: scores.geo,
        service_fit_score: scores.serviceFit,
        capacity_score: scores.capacity,
        performance_score: scores.performance,
        response_speed_score: scores.responseSpeed,
        historical_score: scores.historical,
        match_reason: `Geo: ${Math.round(scores.geo * 100)}%, Fit: ${Math.round(scores.serviceFit * 100)}%`,
        status: "pending",
      } as any);
    }
  }, [osContext]);

  // Register supply node
  const registerSupplyNode = useCallback(async (data: Partial<any>) => {
    if (!user) return;
    const { error } = await supabase.from("gtm_supply_nodes").insert({
      ...data,
      os_context: osContext,
      created_by: user.id,
    } as any);
    if (error) { toast.error("Failed to register supply node"); return; }
    toast.success("Supply node registered!");
    await fetchAll();
  }, [user, osContext, fetchAll]);

  // Update opportunity stage
  const updateOpportunityStage = useCallback(async (id: string, stage: string) => {
    const updates: any = { stage, updated_at: new Date().toISOString() };
    if (stage === "closed_won" || stage === "closed_lost") updates.closed_at = new Date().toISOString();
    const { error } = await supabase.from("gtm_opportunities").update(updates).eq("id", id);
    if (error) { toast.error("Failed to update stage"); return; }
    toast.success(`Stage updated to ${stage}`);
    await fetchAll();
  }, [fetchAll]);

  // Start conversation
  const startConversation = useCallback(async (entityId: string, supplyNodeId: string, opportunityId?: string, channel = "whatsapp") => {
    if (!user) return;
    const { error } = await supabase.from("gtm_conversations").insert({
      entity_id: entityId,
      supply_node_id: supplyNodeId,
      opportunity_id: opportunityId || null,
      channel,
      status: "active",
    } as any);
    if (error) { toast.error("Failed to start conversation"); return; }
    toast.success("Conversation started!");
    await fetchAll();
  }, [user, fetchAll]);

  // Schedule meeting
  const scheduleMeeting = useCallback(async (data: { entity_id?: string; supply_node_id?: string; opportunity_id?: string; scheduled_time: string; notes?: string }) => {
    if (!user) return;
    const { error } = await supabase.from("gtm_meetings").insert({
      ...data,
      created_by: user.id,
    } as any);
    if (error) { toast.error("Failed to schedule meeting"); return; }
    toast.success("Meeting scheduled!");
    await fetchAll();
  }, [user, fetchAll]);

  // Pipeline stats
  const pipelineStats = {
    new: opportunities.filter(o => o.stage === "new").length,
    contacted: opportunities.filter(o => o.stage === "contacted").length,
    qualified: opportunities.filter(o => o.stage === "qualified").length,
    negotiation: opportunities.filter(o => o.stage === "negotiation").length,
    closedWon: opportunities.filter(o => o.stage === "closed_won").length,
    closedLost: opportunities.filter(o => o.stage === "closed_lost").length,
    totalPipeline: opportunities.filter(o => !["closed_won", "closed_lost"].includes(o.stage)).reduce((s, o) => s + (o.estimated_value || 0), 0),
    wonRevenue: opportunities.filter(o => o.stage === "closed_won").reduce((s, o) => s + (o.estimated_value || 0), 0),
  };

  const highIntentSignals = signals.filter(s => {
    const intent = classifyIntent(s.content);
    return intent.type === "active_buy" && intent.confidence >= 0.7;
  });

  return {
    signals, entities, opportunities, supplyNodes, matches, conversations, meetings, searchQueries,
    loading, pipelineStats, highIntentSignals,
    ingestSignal, ingestSearchQuery, registerSupplyNode,
    updateOpportunityStage, startConversation, scheduleMeeting,
    autoMatchOpportunity, refetch: fetchAll,
  };
}
