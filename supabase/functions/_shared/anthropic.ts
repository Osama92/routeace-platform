/**
 * Compatibility shim — all functions that import from this file now use Gemini.
 * Delegates to _shared/gemini.ts (the canonical Gemini caller).
 *
 * Model mapping (legacy tier names → current Gemini stable IDs):
 *   google/gemini-2.5-flash-lite  → gemini-2.0-flash   (fast, cheap)
 *   google/gemini-2.5-flash       → gemini-2.5-flash    (balanced)
 *   google/gemini-3-flash-preview → gemini-2.5-flash    (most capable)
 */

export { callGemini } from "./gemini.ts";
import { callGemini } from "./gemini.ts";

export type CallAnthropicOptions = {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  model?: string;
  maxTokens?: number;
};

/** Drop-in replacement for the old callAnthropic — now calls Gemini. */
export async function callAnthropic(opts: CallAnthropicOptions): Promise<string> {
  return callGemini({
    system: opts.system,
    messages: opts.messages,
    model: opts.model,
    maxTokens: opts.maxTokens,
  });
}

/** Map legacy Gemini model tier strings to real Gemini model IDs. */
export function mapModel(geminiModel: string): string {
  if (geminiModel.includes("lite")) return "gemini-2.0-flash";
  if (geminiModel.includes("3-flash") || geminiModel.includes("preview")) return "gemini-2.0-flash";
  return "gemini-2.0-flash";
}
