import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/security.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WebhookPayload {
  event: string;
  partner_id?: string;
  data: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // JWT Authentication - only admin/operations can trigger webhook delivery
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const authedClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { data: roleRow } = await authedClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const role = (roleRow as any)?.role as string | undefined;
    if (!role || !new Set(["admin", "operations"]).has(role)) {
      return new Response(
        JSON.stringify({ error: "Forbidden - admin or operations role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { event, partner_id, data }: WebhookPayload = await req.json();

    if (!event || !data) {
      return new Response(
        JSON.stringify({ error: "event and data are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find active webhooks subscribed to this event
    let query = supabase
      .from("partner_webhooks")
      .select("*, partners!inner(id, company_name, tier_id)")
      .eq("is_active", true)
      .contains("events", [event])
      .lt("failure_count", 5); // Skip webhooks that have failed too many times

    if (partner_id) {
      query = query.eq("partner_id", partner_id);
    }

    const { data: webhooks, error: webhookError } = await query;

    if (webhookError) {
      console.error("Error fetching webhooks:", webhookError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch webhooks" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!webhooks || webhooks.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active webhooks found for event", event }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{
      webhook_id: string;
      success: boolean;
      status?: number;
      error?: string;
    }> = [];

    // Deliver webhooks with exponential backoff retry
    for (const webhook of webhooks) {
      const maxRetries = 3;
      let attempt = 0;
      let lastError: Error | null = null;

      while (attempt < maxRetries) {
        attempt++;

        try {
          const payload = {
            event,
            timestamp: new Date().toISOString(),
            webhook_id: webhook.id,
            data,
          };

          const { data: secretRow } = await supabase.rpc("get_partner_webhook_secret", { _webhook_id: webhook.id });
          const webhookSecret = (secretRow as string | null) ?? "";
          if (!webhookSecret) {
            lastError = new Error("Webhook secret not configured");
            break;
          }
          const signature = await signPayload(payload, webhookSecret);

          const response = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-RouteAce-Signature": signature,
              "X-RouteAce-Event": event,
              "X-RouteAce-Delivery-Attempt": attempt.toString(),
            },
            body: JSON.stringify(payload),
          });

          const responseBody = await response.text().catch(() => "");

          // Log delivery
          await supabase.from("webhook_deliveries").insert({
            webhook_id: webhook.id,
            event_type: event,
            payload,
            response_status: response.status,
            response_body: responseBody.substring(0, 1000), // Limit response body size
            attempt_number: attempt,
            delivered_at: response.ok ? new Date().toISOString() : null,
          });

          if (response.ok) {
            // Success - update webhook metadata
            await supabase
              .from("partner_webhooks")
              .update({
                last_triggered_at: new Date().toISOString(),
                last_response_status: response.status,
                failure_count: 0, // Reset failure count on success
              })
              .eq("id", webhook.id);

            results.push({
              webhook_id: webhook.id,
              success: true,
              status: response.status,
            });

            break; // Exit retry loop on success
          } else {
            lastError = new Error(`HTTP ${response.status}: ${responseBody}`);

            // Only retry on 5xx errors
            if (response.status < 500) {
              break;
            }
          }
        } catch (err) {
          lastError = err as Error;
          console.error(`Webhook attempt ${attempt} failed:`, err);
        }

        // Exponential backoff before retry
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }

      // If all retries failed
      if (lastError) {
        await supabase
          .from("partner_webhooks")
          .update({
            last_triggered_at: new Date().toISOString(),
            failure_count: webhook.failure_count + 1,
          })
          .eq("id", webhook.id);

        results.push({
          webhook_id: webhook.id,
          success: false,
          error: lastError.message,
        });

        // Disable webhook if too many failures
        if (webhook.failure_count >= 4) {
          await supabase
            .from("partner_webhooks")
            .update({ is_active: false })
            .eq("id", webhook.id);

          console.warn(`Webhook ${webhook.id} disabled after too many failures`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        delivered: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Webhook delivery error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Sign webhook payload using HMAC-SHA256
async function signPayload(
  payload: Record<string, unknown>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
