/**
 * Shared Google Gemini API caller.
 * Replaces callAnthropic for the Zaza chat and other AI features.
 *
 * Model reference:
 *   gemini-2.5-flash   — best balance of speed + quality (default)
 *   gemini-2.0-flash   — stable, slightly faster
 *   gemini-1.5-flash   — legacy fallback
 */

export interface GeminiMessage {
  role: "user" | "model"; // Gemini uses "model" not "assistant"
  content: string;
}

export interface CallGeminiOptions {
  /** System instruction (shown before conversation, not part of turn history). */
  system?: string;
  /**
   * Conversation messages. Accepts {role:"user"|"assistant"|"model", content:string}.
   * "assistant" is auto-normalised to "model".
   * Leading "model"/"assistant" messages are stripped — Gemini requires user-first.
   */
  messages: Array<{ role: string; content: string }>;
  /** Gemini model ID. Defaults to gemini-2.5-flash. */
  model?: string;
  /** Max tokens to generate. Defaults to 2048. */
  maxTokens?: number;
  /** Temperature 0-2. Defaults to 1. */
  temperature?: number;
}

export async function callGemini(opts: CallGeminiOptions): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = opts.model ?? "gemini-2.5-flash";
  const maxTokens = opts.maxTokens ?? 2048;
  const temperature = opts.temperature ?? 1;

  // Normalise roles: "assistant" → "model"
  // Strip leading non-user messages (Gemini requires first turn to be user)
  let msgs = opts.messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "model")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : (m.role as "user" | "model"),
      parts: [{ text: m.content }],
    }));

  while (msgs.length > 0 && msgs[0].role !== "user") {
    msgs = msgs.slice(1);
  }

  if (msgs.length === 0) {
    throw new Error("callGemini: no user messages provided");
  }

  const body: Record<string, unknown> = {
    contents: msgs,
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  if (opts.system) {
    body.system_instruction = { parts: [{ text: opts.system }] };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${text}`);
  }

  const data = await resp.json();

  // Extract text from candidates[0].content.parts[0].text
  const text =
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    data?.candidates?.[0]?.output ??
    "";

  if (!text) {
    // Surface finish reason if blocked or empty
    const reason = data?.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`Gemini returned empty response (finishReason: ${reason})`);
  }

  return text;
}

/** Map legacy Gemini model shorthand strings to real Gemini model IDs. */
export function mapGeminiModel(hint: string): string {
  if (hint.includes("lite")) return "gemini-2.0-flash";
  if (hint.includes("2.5")) return "gemini-2.5-flash";
  if (hint.includes("pro")) return "gemini-1.5-pro";
  return "gemini-2.5-flash"; // default
}
