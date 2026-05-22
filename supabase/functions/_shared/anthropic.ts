/**
 * Shared Anthropic Claude API caller.
 * Replaces the Lovable AI gateway (ai.gateway.lovable.dev) across all edge functions.
 *
 * Model mapping from Gemini tiers:
 *   google/gemini-2.5-flash-lite  → claude-haiku-4-5-20251001   (fastest, cheapest)
 *   google/gemini-2.5-flash       → claude-haiku-4-5-20251001   (balanced)
 *   google/gemini-3-flash-preview → claude-sonnet-4-6            (most capable)
 */

export type AnthropicMessage = { role: "user" | "assistant"; content: string };

export interface CallAnthropicOptions {
  /** System prompt. If omitted (or messages[0].role === "system"), extracted automatically. */
  system?: string;
  /** Conversation messages. A leading {role:"system"} entry is auto-promoted to the system param. */
  messages: Array<{ role: string; content: string }>;
  /** Claude model ID. Defaults to claude-haiku-4-5-20251001. */
  model?: string;
  /** Max tokens to generate. Defaults to 2048. */
  maxTokens?: number;
}

export async function callAnthropic(opts: CallAnthropicOptions): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const model = opts.model ?? "claude-haiku-4-5-20251001";
  const maxTokens = opts.maxTokens ?? 2048;

  // Auto-promote a leading system message to the top-level system field
  let system = opts.system ?? "";
  let msgs = [...opts.messages];
  if (msgs.length > 0 && msgs[0].role === "system") {
    system = (system ? system + "\n\n" : "") + msgs[0].content;
    msgs = msgs.slice(1);
  }

  // Anthropic requires alternating user/assistant turns starting with user
  const cleanMsgs: AnthropicMessage[] = msgs
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (cleanMsgs.length === 0) {
    throw new Error("callAnthropic: no user/assistant messages provided");
  }

  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    messages: cleanMsgs,
  };
  if (system) body.system = system;

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Anthropic API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return (data.content as Array<{ type: string; text: string }>)
    ?.find((b) => b.type === "text")?.text ?? "";
}

/** Map legacy Gemini model IDs to Claude equivalents. */
export function mapModel(geminiModel: string): string {
  if (geminiModel.includes("lite")) return "claude-haiku-4-5-20251001";
  if (geminiModel.includes("3-flash") || geminiModel.includes("preview")) return "claude-sonnet-4-6";
  return "claude-haiku-4-5-20251001"; // default for gemini-2.5-flash
}
