import { buildCors, preflight, json, validateBody } from "../_shared/cors.ts";
import { callGemini } from "../_shared/gemini.ts";
import { checkAndDeductCredits } from "../_shared/ai-credits.ts";
import { requireAuth } from "../_shared/require-auth.ts";
import { rateLimit } from "../_shared/rate-limit.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const CREDIT_COST = 2;

Deno.serve(async (req) => {
  const cors = buildCors(req);
  if (req.method === "OPTIONS") return preflight(cors);

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const rl = rateLimit({ bucket: "dept-ai", identifier: auth.user.id, limit: 30, windowMs: 60_000 });
  if (!rl.allowed) return rl.response!;

  try {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch (_e) {
      return json({ error: "Invalid JSON body" }, 400, cors);
    }

    const invalid = validateBody(body, ["messages"], cors);
    if (invalid) return invalid;

    const { messages, context, userRole, scope, navigationCatalog, organizationId, conversationId } = body as any;

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: "messages must be a non-empty array of {role, content} objects" }, 400, cors);
    }
    for (const m of messages) {
      if (!m.role || !m.content) {
        return json({ error: "Each message must have role and content fields" }, 400, cors);
      }
    }

    // Credit enforcement
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const credit = await checkAndDeductCredits(supabase, {
      organizationId: organizationId ?? null,
      userId: auth.user.id,
      cost: CREDIT_COST,
    });
    if (!credit.allowed) {
      return json({ error: credit.reason ?? "Insufficient AI credits" }, 402, cors);
    }

    const roleFraming = ({
      ops_manager: "You are advising an Operations Manager. Focus on dispatch flow, SLA risk, route efficiency, and driver/vehicle utilisation. Do not discuss vendor payment terms or budget variance unless asked.",
      dispatcher: "You are advising a Dispatcher. Focus on dispatch flow, SLA risk, route efficiency, and driver/vehicle utilisation. Do not discuss vendor payment terms or budget variance unless asked.",
      finance_manager: "You are advising a Finance Manager. Focus on cost-per-drop, vendor invoice accuracy, budget variance, and payment status. Do not discuss specific driver names or vehicle registrations.",
      support: "You are advising a Support team member. Focus only on delivery status, SLA breach resolution, and POD confirmation. Do not discuss costs or financials.",
      org_admin: "You are advising a Logistics Manager with full visibility across operations and cost.",
      super_admin: "You are advising the Logistics Director with full org-wide visibility.",
    } as Record<string, string>)[userRole as string] ?? "You are advising a logistics team member.";

    const systemPrompt = `${roleFraming}

You are Zaza - RouteAce's Logistics Intelligence Advisor, an embedded expert for enterprise logistics departments. You help in-house logistics teams (not 3PL companies) make excellence-driven decisions on:
- Route planning, dispatch consolidation, multi-drop optimization
- Cost control: cost-per-drop, fuel variance, vendor benchmarking
- SLA risk, on-time delivery, exception handling
- Internal cost booking, budget variance vs plan
- Vendor rate cards, dynamic pricing, ERP sync hygiene
- Org & tenant context: company profile, plan tier, enabled modules, team members, branches, fleet composition, billing cycle, AI credit usage, onboarding status, and any organization-scoped settings present in the snapshot

You may answer ANY question scoped to this organization/tenant using the snapshot below - including who is on the team, what plan they're on, what modules are enabled, where they operate, and how their org is configured. If the user asks about org/tenant details and the snapshot has the answer, give it directly.

Use the LIVE OPERATIONAL & ORG SNAPSHOT in the context below as your source of truth.
Never ask the user for data already in the snapshot. Cite specific numbers from it. If something is genuinely missing from the snapshot, say so plainly and suggest where in the app to find it.

${context ?? "No live context provided."}

${(() => {
  const cat = Array.isArray(navigationCatalog) ? navigationCatalog : [];
  const safe = cat
    .filter((i: any) => i && typeof i.path === "string" && typeof i.name === "string" && i.path.startsWith("/"))
    .slice(0, 200);
  if (safe.length === 0) return "NAVIGATION CATALOG: (none provided - do NOT suggest in-app links)";
  const list = safe.map((i: any) => `- [${i.name}](${i.path}) - ${i.description ?? ""}`).join("\n");
  const scopeLabel = scope === "LD"
    ? "LOGISTICS DEPARTMENT (in-house)"
    : scope === "LC"
      ? "LOGISTICS COMPANY (3PL operator)"
      : "CURRENT WORKSPACE";
  return `NAVIGATION CATALOG (scope: ${scopeLabel}):
The user is asking inside the ${scopeLabel} workspace. When the user asks
"where is X", "take me to X", "open X", "give me a link to X", or anything that
implies they want to navigate, respond with a clickable markdown link in the
form [Feature Name](/path) - and ONLY use paths from the list below. NEVER
invent paths. NEVER suggest a route from another workspace/scope. If the
requested feature is not in this catalog, say it is not available in this
workspace and stop. Do not speculate about other tenants or workspaces.

${list}`;
})()}

Always answer concisely with concrete next actions and KPIs. When suggesting
navigation, embed the link inline in your sentence using markdown
\`[Label](/path)\` so the user can click it directly.`;

    const reply = await callGemini({
      system: systemPrompt,
      messages,
      model: "gemini-2.5-flash",
      maxTokens: 2048,
    });

    // Persist conversation to database
    try {
      const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
      if (lastUserMsg) {
        const convId = conversationId ?? crypto.randomUUID();
        await supabase.from("zaza_conversations" as any).insert([
          {
            id: crypto.randomUUID(),
            conversation_id: convId,
            organization_id: organizationId ?? null,
            user_id: auth.user.id,
            role: "user",
            content: lastUserMsg.content,
            created_at: new Date().toISOString(),
          },
          {
            id: crypto.randomUUID(),
            conversation_id: convId,
            organization_id: organizationId ?? null,
            user_id: auth.user.id,
            role: "assistant",
            content: reply,
            created_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (histErr) {
      // History save failures are non-fatal
      console.error("Failed to save conversation history:", histErr);
    }

    return json({ reply }, 200, cors);
  } catch (e) {
    return json({ error: String(e) }, 500, cors);
  }
});
