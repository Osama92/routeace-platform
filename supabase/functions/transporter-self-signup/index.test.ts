import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const ENDPOINT = `${SUPABASE_URL}/functions/v1/transporter-self-signup`;

async function callValidate(token: string, origin = "https://test.lovable.app") {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "apikey": SUPABASE_ANON_KEY,
      "Origin": origin,
    },
    body: JSON.stringify({ validate_only: true, token }),
  });
  const body = await res.json();
  return { status: res.status, body, cors: res.headers.get("access-control-allow-origin") };
}

Deno.test("CORS reflects allowed lovable preview origin", async () => {
  const r = await callValidate("nonexistent_token", "https://abc.lovableproject.com");
  assertEquals(r.cors, "https://abc.lovableproject.com");
});

Deno.test("CORS falls back to production origin for unknown origins", async () => {
  const r = await callValidate("nonexistent_token", "https://evil.example.com");
  assertEquals(r.cors, "https://routeace.app");
});

Deno.test("validate_only returns reason=token_not_found for bogus token", async () => {
  const r = await callValidate("definitely_not_a_real_token_xyz");
  assertEquals(r.status, 200);
  assertEquals(r.body.valid, false);
  assertEquals(r.body.reason, "token_not_found");
});

Deno.test("validate_only returns reason=missing_token when token blank", async () => {
  const r = await callValidate("");
  assertEquals(r.body.valid, false);
  assertEquals(r.body.reason, "missing_token");
});

// Live-data scenarios - only run when service key is present
if (SERVICE_KEY) {
  Deno.test("live: real LD-org token validates true", async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: tok } = await admin
      .from("transporter_invite_tokens")
      .select("token, organization_id")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!tok) return; // skip if no active token
    const { data: org } = await admin
      .from("organizations")
      .select("tenant_mode")
      .eq("id", tok.organization_id)
      .maybeSingle();
    const r = await callValidate(tok.token);
    if (org?.tenant_mode === "LOGISTICS_DEPARTMENT") {
      assertEquals(r.body.valid, true);
      assert(typeof r.body.org_name === "string");
    } else {
      assertEquals(r.body.valid, false);
      assertEquals(r.body.reason, "tenant_mode_mismatch");
    }
  });

  Deno.test("live: deactivated token returns reason=deactivated", async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: org } = await admin
      .from("organizations").select("id").eq("tenant_mode", "LOGISTICS_DEPARTMENT").limit(1).maybeSingle();
    if (!org) return;
    const { data: created } = await admin
      .from("transporter_invite_tokens")
      .insert({ organization_id: org.id, is_active: false, expires_at: new Date(Date.now() + 86400000).toISOString() })
      .select("id, token").single();
    if (!created) return;
    try {
      const r = await callValidate(created.token);
      assertEquals(r.body.valid, false);
      assertEquals(r.body.reason, "deactivated");
    } finally {
      await admin.from("transporter_invite_tokens").delete().eq("id", created.id);
    }
  });

  Deno.test("live: expired token returns reason=expired", async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: org } = await admin
      .from("organizations").select("id").eq("tenant_mode", "LOGISTICS_DEPARTMENT").limit(1).maybeSingle();
    if (!org) return;
    const { data: created } = await admin
      .from("transporter_invite_tokens")
      .insert({ organization_id: org.id, is_active: true, expires_at: new Date(Date.now() - 60000).toISOString() })
      .select("id, token").single();
    if (!created) return;
    try {
      const r = await callValidate(created.token);
      assertEquals(r.body.valid, false);
      assertEquals(r.body.reason, "expired");
    } finally {
      await admin.from("transporter_invite_tokens").delete().eq("id", created.id);
    }
  });

  Deno.test("live: LC-org token returns reason=tenant_mode_mismatch", async () => {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: org } = await admin
      .from("organizations").select("id").eq("tenant_mode", "LOGISTICS_COMPANY").limit(1).maybeSingle();
    if (!org) return;
    const { data: created } = await admin
      .from("transporter_invite_tokens")
      .insert({ organization_id: org.id, is_active: true, expires_at: new Date(Date.now() + 86400000).toISOString() })
      .select("id, token").single();
    if (!created) return;
    try {
      const r = await callValidate(created.token);
      assertEquals(r.body.valid, false);
      assertEquals(r.body.reason, "tenant_mode_mismatch");
    } finally {
      await admin.from("transporter_invite_tokens").delete().eq("id", created.id);
    }
  });
}
