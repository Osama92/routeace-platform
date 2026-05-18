// Resolves the caller's organization_id for AI / data engines.
// Uses getTenantScope; for unrestricted (super_admin / internal_team)
// callers, allows ?organization_id= override or falls back to first
// membership. Returns null when no org can be resolved (caller must 403).
import { getTenantScope, makeAdminClient } from "./require-auth.ts";

export async function resolveCallerOrgId(
  req: Request,
  userId: string,
  userRoles: string[],
): Promise<string | null> {
  const tenant = await getTenantScope(userId, userRoles);
  let orgId: string | null = tenant.orgIds[0] ?? null;

  if (tenant.unrestricted) {
    const url = new URL(req.url);
    const override = url.searchParams.get("organization_id");
    if (override) return override;
    if (orgId) return orgId;
    const admin = makeAdminClient();
    const { data } = await admin
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();
    return (data as any)?.organization_id ?? null;
  }

  return orgId;
}
