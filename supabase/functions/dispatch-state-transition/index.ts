import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, validateJWT, checkUserRole } from "../_shared/security.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

interface TransitionRequest {
  dispatch_id: string;
  new_state: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

interface Webhook {
  id: string;
  partner_id: string;
  url: string;
  secrets_vault_id: string | null;
  events: string[];
  is_active: boolean;
  failure_count: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("authorization");
    const jwtValidation = await validateJWT(authHeader, supabaseUrl, supabaseAnonKey);

    if (!jwtValidation.valid) {
      return new Response(
        JSON.stringify({ error: jwtValidation.error }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = jwtValidation.claims!.sub;

    // Check if user has permission (admin, operations, dispatcher, driver)
    const hasPermission = await checkUserRole(
      userId,
      ["admin", "operations", "dispatcher", "driver"],
      supabaseUrl,
      supabaseServiceKey
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions for state transitions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { dispatch_id, new_state, reason, metadata }: TransitionRequest = await req.json();

    if (!dispatch_id || !new_state) {
      return new Response(
        JSON.stringify({ error: "dispatch_id and new_state are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Execute the transition using the database function
    const { data, error } = await supabase.rpc("execute_dispatch_transition", {
      p_dispatch_id: dispatch_id,
      p_new_state: new_state,
      p_user_id: userId,
      p_reason: reason || null,
      p_metadata: metadata || {},
    });

    if (error) {
      console.error("Transition error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = data as Record<string, unknown>;

    // Check if transition was successful
    if (!result?.success && !result?.valid) {
      return new Response(
        JSON.stringify({ error: result?.error || "Transition failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle auto-triggers
    if (result.auto_trigger === "auto_invoice") {
      // Trigger webhook notifications for invoice creation
      await notifyWebhooks(supabase, dispatch_id, "dispatch.closed", {
        dispatch_id,
        new_state,
        auto_invoice: true,
      });
    }

    // Notify webhooks of state change
    await notifyWebhooks(supabase, dispatch_id, "dispatch.status_changed", {
      dispatch_id,
      from_state: result.from_state,
      to_state: result.to_state,
      changed_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        from_state: result.from_state,
        to_state: result.to_state,
        auto_trigger: result.auto_trigger,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("State transition error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Notify partner webhooks
async function notifyWebhooks(
  supabase: SupabaseClient,
  dispatchId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  try {
    // Get dispatch to find associated partner
    const { data: dispatch } = await supabase
      .from("dispatches")
      .select("customer_id")
      .eq("id", dispatchId)
      .single();

    if (!dispatch) return;

    // Resolve dispatch's organization for tenant scoping
    const { data: dispatchOrg } = await supabase
      .from("dispatches")
      .select("organization_id")
      .eq("id", dispatchId)
      .maybeSingle();
    const dispatchOrgId = (dispatchOrg as { organization_id?: string } | null)?.organization_id;

    // Find webhooks subscribed to this event — scoped to the dispatch's org
    const { data: webhooksData } = await supabase
      .from("partner_webhooks")
      .select("*")
      .eq("is_active", true)
      .eq("organization_id", dispatchOrgId ?? "")
      .contains("events", [eventType]);

    const webhooks = (webhooksData || []) as Webhook[];
    if (webhooks.length === 0) return;

    // Send webhooks in parallel
    const webhookPromises = webhooks.map(async (webhook: Webhook) => {
      try {
        const { data: secretRow } = await supabase.rpc("get_partner_webhook_secret", { _webhook_id: webhook.id });
        const webhookSecret = (secretRow as string | null) ?? "";
        if (!webhookSecret) return;
        const signature = await signPayload(payload, webhookSecret);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-RouteAce-Signature": signature,
            "X-RouteAce-Event": eventType,
          },
          body: JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            data: payload,
          }),
        });

        // Log delivery
        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: response.status,
          response_body: await response.text().catch(() => null),
          delivered_at: new Date().toISOString(),
        });

        // Update webhook last triggered
        await supabase
          .from("partner_webhooks")
          .update({
            last_triggered_at: new Date().toISOString(),
            last_response_status: response.status,
            failure_count: response.ok ? 0 : webhook.failure_count + 1,
          })
          .eq("id", webhook.id);
      } catch (err) {
        console.error(`Webhook delivery failed for ${webhook.id}:`, err);

        // Log failed delivery
        await supabase.from("webhook_deliveries").insert({
          webhook_id: webhook.id,
          event_type: eventType,
          payload,
          response_status: 0,
          response_body: String(err),
        });

        // Increment failure count
        await supabase
          .from("partner_webhooks")
          .update({ failure_count: webhook.failure_count + 1 })
          .eq("id", webhook.id);
      }
    });

    await Promise.all(webhookPromises);
  } catch (error) {
    console.error("Webhook notification error:", error);
  }
}

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
