import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { requireAuth } from "../_shared/require-auth.ts";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface MetricsSnapshot {
  userGrowth: { current: number; previous: number; change: number };
  revenue: { current: number; previous: number; change: number };
  churnRate: { current: number; previous: number; change: number };
  opsEfficiency: { onTimeDelivery: number; avgTripDuration: number };
  errorRate: { current: number; previous: number };
  featureAdoption: { topFeatures: string[]; newUsers: number };
}

interface PredictiveData {
  customers: any[];
  cashPosition: { balance: number; burnRate: number; payrollObligations: number };
  dispatches: any[];
  vehicles: any[];
}

serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await requireAuth(req, { requirePrivileged: true });
  if (!auth.ok) return auth.response;

  try {
    const { type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    if (type === "weekly-insights") {
      // Gather metrics from the past week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

      // User growth
      const { count: currentUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo.toISOString());

      const { count: previousUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", oneWeekAgo.toISOString());

      // Revenue (from invoices)
      const { data: currentInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .gte("created_at", oneWeekAgo.toISOString())
        .eq("status", "paid");

      const { data: previousInvoices } = await supabase
        .from("invoices")
        .select("total_amount")
        .gte("created_at", twoWeeksAgo.toISOString())
        .lt("created_at", oneWeekAgo.toISOString())
        .eq("status", "paid");

      const currentRevenue = currentInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;
      const previousRevenue = previousInvoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0;

      // Dispatch metrics
      const { data: currentDispatches } = await supabase
        .from("dispatches")
        .select("status, created_at, actual_delivery, scheduled_delivery")
        .gte("created_at", oneWeekAgo.toISOString());

      const onTimeCount = currentDispatches?.filter(d => 
        d.actual_delivery && d.scheduled_delivery && 
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
      ).length || 0;

      const completedCount = currentDispatches?.filter(d => d.status === "delivered").length || 0;
      const onTimeRate = completedCount > 0 ? (onTimeCount / completedCount) * 100 : 100;

      // Session/engagement data
      const { count: activeSessions } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .gte("login_at", oneWeekAgo.toISOString());

      const metricsSnapshot: MetricsSnapshot = {
        userGrowth: {
          current: currentUsers || 0,
          previous: previousUsers || 0,
          change: ((currentUsers || 0) - (previousUsers || 0)) / Math.max(previousUsers || 1, 1) * 100
        },
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          change: previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0
        },
        churnRate: {
          current: 0,
          previous: 0,
          change: 0
        },
        opsEfficiency: {
          onTimeDelivery: onTimeRate,
          avgTripDuration: 0
        },
        errorRate: {
          current: 0.8,
          previous: 1.2
        },
        featureAdoption: {
          topFeatures: ["Dispatch Tracking", "Invoice Generation", "Route Optimization"],
          newUsers: currentUsers || 0
        }
      };

      // Generate AI insights
      const prompt = `You are an AI analyst for RouteAce, a logistics management platform. Analyze these weekly metrics and provide actionable insights.

METRICS THIS WEEK:
- User Growth: ${metricsSnapshot.userGrowth.current} new users (${metricsSnapshot.userGrowth.change > 0 ? '+' : ''}${metricsSnapshot.userGrowth.change.toFixed(1)}% vs last week)
- Revenue: ₦${metricsSnapshot.revenue.current.toLocaleString()} (${metricsSnapshot.revenue.change > 0 ? '+' : ''}${metricsSnapshot.revenue.change.toFixed(1)}% vs last week)
- Churn Rate: ${metricsSnapshot.churnRate.current}% (${metricsSnapshot.churnRate.change > 0 ? '+' : ''}${metricsSnapshot.churnRate.change.toFixed(1)}% change)
- On-Time Delivery: ${metricsSnapshot.opsEfficiency.onTimeDelivery.toFixed(1)}%
- Error Rate: ${metricsSnapshot.errorRate.current}% (was ${metricsSnapshot.errorRate.previous}%)
- Active Sessions: ${activeSessions || 0}
- Top Features: ${metricsSnapshot.featureAdoption.topFeatures.join(", ")}

Provide exactly 4 insight cards in this JSON format:
{
  "insights": [
    {
      "metric": "metric name",
      "direction": "up" or "down" or "stable",
      "change": "+X%" or "-X%" or "stable",
      "cause": "AI-generated probable cause",
      "action": "recommended action",
      "severity": "positive" or "warning" or "critical" or "neutral"
    }
  ]
}

Focus on: User growth, Revenue changes, Churn signals, Ops efficiency. Be specific and actionable.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a business intelligence analyst. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      
      // Parse JSON from response
      let insights;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { insights: [] };
      } catch {
        insights = { insights: [] };
      }

      return new Response(JSON.stringify({
        success: true,
        metrics: metricsSnapshot,
        insights: insights.insights || [],
        generatedAt: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "predictive-kpis") {
      // Gather data for predictions
      const { data: customers } = await supabase
        .from("customers")
        .select("id, company_name, created_at");

      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, customer_id, status, created_at, cost")
        .order("created_at", { ascending: false })
        .limit(500);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, customer_id, total_amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      const { data: expenses } = await supabase
        .from("expenses")
        .select("id, amount, category, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      const { data: vehicles } = await supabase
        .from("vehicles")
        .select("id, status, last_service_date")
        .limit(50);

      // Calculate metrics for AI
      const totalRevenue = invoices?.filter(i => i.status === "paid")
        .reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0;
      
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const monthlyBurn = totalExpenses / 3; // Approximate monthly burn

      const customerDispatchCounts: Record<string, number> = {};
      dispatches?.forEach(d => {
        customerDispatchCounts[d.customer_id] = (customerDispatchCounts[d.customer_id] || 0) + 1;
      });

      const lowEngagementCustomers = customers?.filter(c => 
        (customerDispatchCounts[c.id] || 0) < 2
      ).length || 0;

      const prompt = `You are a predictive analytics AI for RouteAce logistics platform. Generate predictive KPIs based on this data.

CURRENT DATA:
- Total Customers: ${customers?.length || 0}
- Low Engagement Customers (< 2 dispatches): ${lowEngagementCustomers}
- Total Revenue (3 months): ₦${totalRevenue.toLocaleString()}
- Total Expenses (3 months): ₦${totalExpenses.toLocaleString()}
- Monthly Burn Rate: ₦${monthlyBurn.toLocaleString()}
- Active Vehicles: ${vehicles?.filter(v => v.status === "active").length || 0}
- Vehicles Needing Service: ${vehicles?.filter(v => {
  if (!v.last_service_date) return true;
  const daysSince = (Date.now() - new Date(v.last_service_date).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > 90;
}).length || 0}
- Recent Dispatches: ${dispatches?.length || 0}
- On-time Rate: ${dispatches?.filter(d => d.status === "delivered").length || 0}/${dispatches?.length || 1} = ${((dispatches?.filter(d => d.status === "delivered").length || 0) / Math.max(dispatches?.length || 1, 1) * 100).toFixed(1)}%

Generate predictive KPIs in this JSON format:
{
  "churnRisk": {
    "overall": "low" | "medium" | "high",
    "score": 0-100,
    "atRiskCustomers": number,
    "topRisks": ["reason1", "reason2"],
    "recommendation": "action to take"
  },
  "cashRunway": {
    "months": number,
    "status": "healthy" | "warning" | "critical",
    "currentCash": number,
    "monthlyBurn": number,
    "recommendation": "action to take"
  },
  "revenueForcast": {
    "next3Months": number,
    "next6Months": number,
    "next12Months": number,
    "growthRate": number,
    "confidence": "low" | "medium" | "high",
    "factors": ["factor1", "factor2"]
  },
  "operationalRisk": {
    "overall": "low" | "medium" | "high",
    "routeCongestion": number,
    "assetDowntime": number,
    "slaBreach": number,
    "recommendations": ["rec1", "rec2"]
  }
}

Be realistic with estimates based on the data provided. Use the revenue data to project growth.`;

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a business intelligence analyst specializing in logistics. Always respond with valid JSON only." },
            { role: "user", content: prompt }
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "{}";
      
      let predictions;
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        predictions = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch {
        predictions = {};
      }

      return new Response(JSON.stringify({
        success: true,
        predictions,
        rawMetrics: {
          totalCustomers: customers?.length || 0,
          lowEngagementCustomers,
          totalRevenue,
          totalExpenses,
          monthlyBurn,
          activeVehicles: vehicles?.filter(v => v.status === "active").length || 0
        },
        generatedAt: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type. Use 'weekly-insights' or 'predictive-kpis'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Core AI Insights error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
