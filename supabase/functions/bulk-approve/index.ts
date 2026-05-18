import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { buildCors } from "../_shared/cors.ts";
let corsHeaders: Record<string, string> = buildCors();
interface BulkApprovalRequest {
  entity_type: string;
  entity_ids: string[];
  action: "approve" | "reject";
  reason?: string;
}

interface ApprovalResult {
  entity_id: string;
  success: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  corsHeaders = buildCors(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "No role assigned" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userRole = roleData.role;
    const body: BulkApprovalRequest = await req.json();
    const { entity_type, entity_ids, action, reason } = body;

    if (!entity_type || !entity_ids || !Array.isArray(entity_ids) || entity_ids.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (entity_ids.length > 500) {
      return new Response(JSON.stringify({ error: "Max 500 items per batch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's organization_id
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    const orgId = membership?.organization_id;

    // Try org-specific policy first, fall back to global default (organization_id IS NULL)
    let policy: any = null;
    if (orgId) {
      const { data: orgPolicy } = await supabase
        .from("approval_policies")
        .select("*")
        .eq("entity_type", entity_type)
        .eq("organization_id", orgId)
        .maybeSingle();
      policy = orgPolicy;
    }
    if (!policy) {
      const { data: globalPolicy } = await supabase
        .from("approval_policies")
        .select("*")
        .eq("entity_type", entity_type)
        .is("organization_id", null)
        .maybeSingle();
      policy = globalPolicy;
    }

    // Check role permission
    const allowedRoles = policy?.roles_allowed || ["super_admin", "org_admin"];
    if (!allowedRoles.includes(userRole) && userRole !== "super_admin") {
      return new Response(JSON.stringify({ error: `Role '${userRole}' not allowed to ${action} ${entity_type}` }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: ApprovalResult[] = [];
    const now = new Date().toISOString();

    for (const entityId of entity_ids) {
      try {
        // Check for existing pending approval
        const { data: existingApproval } = await supabase
          .from("approvals")
          .select("*")
          .eq("entity_type", entity_type)
          .eq("entity_id", entityId)
          .eq("status", "pending")
          .maybeSingle();

        if (action === "approve") {
          // Self-approval check
          if (existingApproval?.requested_by === user.id) {
            results.push({ entity_id: entityId, success: false, error: "Cannot approve own submission" });
            continue;
          }

          // Update or create approval record
          if (existingApproval) {
            await supabase
              .from("approvals")
              .update({
                status: "approved",
                approved_by: user.id,
                super_admin_override: userRole === "super_admin",
                reason: reason || null,
                updated_at: now,
              })
              .eq("id", existingApproval.id);
          } else {
            await supabase.from("approvals").insert({
              entity_type,
              entity_id: entityId,
              status: "approved",
              requested_by: user.id,
              approved_by: user.id,
              super_admin_override: userRole === "super_admin",
              reason: reason || null,
            });
          }

          // Apply entity-specific effects
          await applyApprovalEffect(supabase, entity_type, entityId, "approved", user.id, now);

        } else {
          // Reject
          if (existingApproval) {
            await supabase
              .from("approvals")
              .update({
                status: "rejected",
                rejected_by: user.id,
                reason: reason || "Rejected via bulk action",
                updated_at: now,
              })
              .eq("id", existingApproval.id);
          } else {
            await supabase.from("approvals").insert({
              entity_type,
              entity_id: entityId,
              status: "rejected",
              requested_by: user.id,
              rejected_by: user.id,
              reason: reason || "Rejected via bulk action",
            });
          }

          await applyApprovalEffect(supabase, entity_type, entityId, "rejected", user.id, now);
        }

        // Audit log
        await supabase.from("audit_logs").insert({
          table_name: entity_type,
          record_id: entityId,
          action: `bulk_${action}`,
          new_data: { action, reason, bulk: true, approved_by: user.id },
          user_id: user.id,
          user_email: user.email,
        });

        results.push({ entity_id: entityId, success: true });
      } catch (err: any) {
        results.push({ entity_id: entityId, success: false, error: err.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        total: entity_ids.length,
        approved: action === "approve" ? successCount : 0,
        rejected: action === "reject" ? successCount : 0,
        failed: failCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function applyApprovalEffect(
  supabase: any,
  entityType: string,
  entityId: string,
  status: "approved" | "rejected",
  userId: string,
  timestamp: string
) {
  switch (entityType) {
    case "invoice":
      if (status === "approved") {
        await supabase
          .from("invoices")
          .update({
            approval_status: "approved",
            status: "pending",
            approved_by: userId,
            approved_at: timestamp,
          })
          .eq("id", entityId);
      } else {
        await supabase
          .from("invoices")
          .update({ approval_status: "rejected", status: "draft" })
          .eq("id", entityId);
      }
      break;

    case "expense":
      if (status === "approved") {
        await supabase
          .from("expenses")
          .update({
            approval_status: "approved",
            approved_by: userId,
            approved_at: timestamp,
          })
          .eq("id", entityId);
      } else {
        await supabase
          .from("expenses")
          .update({ approval_status: "rejected" })
          .eq("id", entityId);
      }
      break;

    case "payment":
      if (status === "approved") {
        await supabase
          .from("payout_approvals")
          .update({ status: "approved", org_admin_approved_by: userId, org_admin_approved_at: timestamp })
          .eq("id", entityId);
      } else {
        await supabase
          .from("payout_approvals")
          .update({ status: "rejected", rejection_reason: "Rejected via bulk action" })
          .eq("id", entityId);
      }
      break;

    case "dispatch":
      if (status === "approved") {
        await supabase
          .from("dispatches")
          .update({ status: "confirmed" })
          .eq("id", entityId);
      }
      break;

    default:
      break;
  }
}
