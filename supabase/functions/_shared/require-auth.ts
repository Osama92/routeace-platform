// Shared auth gate for sensitive AI / data edge functions.
// Returns { user, supabase, admin } when authorized, or a Response on failure.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { buildCors } from "./cors.ts";

const PRIVILEGED_ROLES = new Set([
  "admin",
  "super_admin",
  "org_admin",
  "finance_manager",
  "ops_manager",
  "operations",
  "core_founder",
  "core_cofounder",
  "internal_team",
]);

export async function requireAuth(
  req: Request,
  opts: { requirePrivileged?: boolean } = {},
): Promise<
  | { ok: true; user: { id: string }; userRoles: string[] }
  | { ok: false; response: Response }
> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...buildCors(req), "Content-Type": "application/json" },
      }),
    };
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supa = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await supa.auth.getUser();
  if (error || !user) {
    return {
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...buildCors(req), "Content-Type": "application/json" },
      }),
    };
  }

  let userRoles: string[] = [];
  if (opts.requirePrivileged) {
    const admin = createClient(url, service);
    const { data } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    userRoles = (data || []).map((r: any) => r.role);
    if (!userRoles.some((r) => PRIVILEGED_ROLES.has(r))) {
      return {
        ok: false,
        response: new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...buildCors(req), "Content-Type": "application/json" },
        }),
      };
    }
  }

  return { ok: true, user: { id: user.id }, userRoles };
}

/* ------------------------------------------------------------------ *
 * Phase 7 - Tenant scoping helpers for AI/data edge functions.
 * Resolves the caller's organization scope and validates that input
 * resource IDs (driver_id, vehicle_id, dispatch_id, etc.) belong to
 * the same org. Super-admin / internal-team roles are unrestricted.
 * ------------------------------------------------------------------ */

const UNRESTRICTED_ROLES = new Set([
  "super_admin",
  "core_founder",
  "core_cofounder",
  "core_builder",
  "core_product",
  "core_engineer",
  "internal_team",
]);

export interface TenantScope {
  unrestricted: boolean;
  orgIds: string[];
}

export function makeAdminClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, service);
}

// Phase 11 - short-TTL cache to avoid hitting organization_members on
// every AI request. Per-instance only; safe because membership changes
// are infrequent and a 30s window is acceptable staleness.
const SCOPE_TTL_MS = 30_000;
const scopeCache = new Map<string, { scope: TenantScope; expiresAt: number }>();

export async function getTenantScope(
  userId: string,
  userRoles: string[],
): Promise<TenantScope> {
  if (userRoles.some((r) => UNRESTRICTED_ROLES.has(r))) {
    return { unrestricted: true, orgIds: [] };
  }
  const cached = scopeCache.get(userId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.scope;

  const admin = makeAdminClient();
  const { data } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  const orgIds = Array.from(
    new Set((data || []).map((r: any) => r.organization_id).filter(Boolean)),
  );
  const scope: TenantScope = { unrestricted: false, orgIds };
  scopeCache.set(userId, { scope, expiresAt: now + SCOPE_TTL_MS });
  return scope;
}

/**
 * Verify that a row in `table` with `id` belongs to one of the caller's orgs.
 * Returns null if allowed, or a 403 Response if not.
 * Missing rows return 404. Tables without organization_id are skipped.
 */
export async function assertResourceOrg(params: {
  scope: TenantScope;
  table: string;
  id: string;
  idColumn?: string;
}): Promise<Response | null> {
  const { scope, table, id } = params;
  const idColumn = params.idColumn || "id";
  if (!id) return null;
  if (scope.unrestricted) return null;
  if (scope.orgIds.length === 0) {
    return new Response(
      JSON.stringify({ error: "Forbidden: no organization scope" }),
      {
        status: 403,
        headers: { ...buildCors(), "Content-Type": "application/json" },
      },
    );
  }
  const admin = makeAdminClient();
  const { data, error } = await admin
    .from(table)
    .select("organization_id")
    .eq(idColumn, id)
    .maybeSingle();
  if (error) {
    return new Response(
      JSON.stringify({ error: `Lookup failed for ${table}` }),
      {
        status: 500,
        headers: { ...buildCors(), "Content-Type": "application/json" },
      },
    );
  }
  if (!data) {
    return new Response(
      JSON.stringify({ error: `${table} not found` }),
      {
        status: 404,
        headers: { ...buildCors(), "Content-Type": "application/json" },
      },
    );
  }
  if (!data.organization_id || !scope.orgIds.includes(data.organization_id)) {
    return new Response(
      JSON.stringify({ error: "Forbidden: cross-tenant access denied" }),
      {
        status: 403,
        headers: { ...buildCors(), "Content-Type": "application/json" },
      },
    );
  }
  return null;
}
