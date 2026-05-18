/**
 * RouteAce Event Bus Service
 * Production-grade cross-OS communication with field-level visibility control.
 * Events flow through the database - never through UI.
 */

import { supabase } from "@/integrations/supabase/client";
import type { OSFamily } from "@/lib/workspace/osIsolation";

export type PlatformEventType =
  | "order.created"
  | "order.assigned"
  | "order.updated"
  | "order.cancelled"
  | "dispatch.created"
  | "dispatch.started"
  | "delivery.in_progress"
  | "delivery.completed"
  | "delivery.failed"
  | "invoice.generated"
  | "payment.initiated"
  | "payment.completed"
  | "payment.failed"
  | "shipment.created"
  | "compliance.validated"
  | "user.created"
  | "tenant.created"
  | "role.updated";

export interface EventPayload {
  eventType: PlatformEventType;
  sourceOS: OSFamily;
  targetOS: OSFamily | "all";
  tenantId?: string;
  resourceId: string;
  resourceType: string;
  payload: Record<string, unknown>;
  visibleFields?: string[];
  restrictedFields?: string[];
}

/** Allowed event flows - source → allowed targets */
const EVENT_FLOW_RULES: Record<string, (OSFamily | "all")[]> = {
  "order.created": ["logistics"],
  "order.assigned": ["logistics"],
  "order.updated": ["logistics"],
  "order.cancelled": ["logistics"],
  "dispatch.created": ["industry", "portodash"],
  "dispatch.started": ["industry", "portodash"],
  "delivery.in_progress": ["industry", "portodash"],
  "delivery.completed": ["industry", "portodash"],
  "delivery.failed": ["industry"],
  "invoice.generated": ["platform"],
  "payment.initiated": ["platform"],
  "payment.completed": ["all"],
  "payment.failed": ["platform"],
  "shipment.created": ["logistics"],
  "compliance.validated": ["portodash"],
  "user.created": ["platform"],
  "tenant.created": ["platform"],
  "role.updated": ["platform"],
};

/** Field masking rules per target OS */
const FIELD_RESTRICTIONS: Record<string, string[]> = {
  logistics: ["customer_name", "order_value", "deal_stage", "sales_rep", "margin"],
  industry: ["driver_name", "driver_phone", "vehicle_details", "internal_cost", "route_details"],
  portodash: ["buyer_name", "export_value", "compliance_details"],
};

function validateEventFlow(eventType: string, targetOS: OSFamily | "all"): boolean {
  const allowed = EVENT_FLOW_RULES[eventType];
  if (!allowed) return false;
  return allowed.includes(targetOS) || allowed.includes("all");
}

function maskPayload(
  payload: Record<string, unknown>,
  targetOS: OSFamily | "all",
  restrictedFields?: string[]
): Record<string, unknown> {
  const restricted = new Set([
    ...(restrictedFields || []),
    ...(targetOS !== "all" ? (FIELD_RESTRICTIONS[targetOS] || []) : []),
  ]);

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (restricted.has(key)) {
      masked[key] = "[RESTRICTED]";
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * Publish an event to the platform event bus
 */
export async function publishEvent(event: EventPayload): Promise<{ success: boolean; eventId?: string; error?: string }> {
  // Validate flow
  if (!validateEventFlow(event.eventType, event.targetOS)) {
    return { success: false, error: `Event ${event.eventType} not allowed to target ${event.targetOS}` };
  }

  // Mask payload for target OS
  const maskedPayload = maskPayload(event.payload, event.targetOS, event.restrictedFields);

  const { data, error } = await supabase
    .from("platform_events" as any)
    .insert({
      event_type: event.eventType,
      source_os: event.sourceOS,
      target_os: event.targetOS,
      tenant_id: event.tenantId || null,
      resource_id: event.resourceId,
      resource_type: event.resourceType,
      payload: maskedPayload,
      visible_fields: event.visibleFields || [],
      restricted_fields: event.restrictedFields || FIELD_RESTRICTIONS[event.targetOS as string] || [],
      status: "pending",
      created_by: (await supabase.auth.getUser()).data.user?.id,
    } as any)
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, eventId: (data as any)?.id };
}

/**
 * Subscribe to events for a specific OS (realtime)
 */
export function subscribeToEvents(
  targetOS: OSFamily,
  callback: (event: any) => void
) {
  const channel = supabase
    .channel(`events-${targetOS}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "platform_events",
        filter: `target_os=eq.${targetOS}`,
      },
      (payload) => callback(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Mark event as processed
 */
export async function acknowledgeEvent(
  eventId: string,
  processorOS: OSFamily,
  actionTaken: string,
  success: boolean,
  processingTimeMs?: number
): Promise<void> {
  await supabase.from("event_processing_log" as any).insert({
    event_id: eventId,
    processor_os: processorOS,
    action_taken: actionTaken,
    result_status: success ? "success" : "failure",
    processing_time_ms: processingTimeMs || 0,
  } as any);

  await supabase
    .from("platform_events" as any)
    .update({ status: success ? "delivered" : "failed", processed_at: new Date().toISOString() } as any)
    .eq("id", eventId);
}
