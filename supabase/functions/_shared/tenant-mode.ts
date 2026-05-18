// Shared tenant-mode resolver for LC vs LD module separation.
// Use in any edge function that touches financial data to ensure
// Logistics Department (LD) tenants are blocked at the server boundary.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

export type TenantMode =
  | "LOGISTICS_COMPANY"
  | "LOGISTICS_DEPARTMENT"
  | "TRANSPORTER"
  | "INDUSTRY"
  | "UNKNOWN";

export async function resolveTenantMode(userId: string): Promise<{
  organizationId: string | null;
  tenantMode: TenantMode;
  isLD: boolean;
  isLC: boolean;
}> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, service);

  const { data: member } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  const organizationId = member?.organization_id ?? null;
  if (!organizationId) {
    return { organizationId: null, tenantMode: "UNKNOWN", isLD: false, isLC: false };
  }

  const { data: org } = await admin
    .from("organizations")
    .select("tenant_mode")
    .eq("id", organizationId)
    .maybeSingle();

  const raw = (org?.tenant_mode || "UNKNOWN").toString().toUpperCase() as TenantMode;
  return {
    organizationId,
    tenantMode: raw,
    isLD: raw === "LOGISTICS_DEPARTMENT",
    isLC: raw === "LOGISTICS_COMPANY",
  };
}

// Returns a 403 Response if the caller's tenant is LD (no financial access).
export function blockIfLD(
  ctx: { isLD: boolean; tenantMode: TenantMode },
  reason = "Financial data is not available for Logistics Department tenants",
): Response | null {
  if (!ctx.isLD) return null;
  return new Response(
    JSON.stringify({
      error: "FORBIDDEN_LD_FINANCIAL_ACCESS",
      message: reason,
      tenant_mode: ctx.tenantMode,
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
