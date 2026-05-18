// Phase 14 - AI failsafe: standardize low-confidence handling across AI
// edge functions. When a model returns a confidence score below the
// configured threshold, we refuse to auto-act and surface an
// "escalate-to-human" payload instead of a fabricated decision.
//
// This is intentionally framework-agnostic: callers pass in a numeric
// confidence (0..1 or 0..100, auto-normalised) plus the proposed
// action, and get back either { ok: true, action } or
// { ok: false, escalation }.

export interface FailsafeInput<T> {
  confidence: number;          // 0..1 or 0..100
  action: T;
  context?: Record<string, unknown>;
  threshold?: number;          // default 0.6 (60%)
  reason?: string;             // optional human-readable rationale
}

export interface FailsafeEscalation {
  status: "escalate";
  confidence: number;
  threshold: number;
  reason: string;
  context?: Record<string, unknown>;
  recommended_review: "human_supervisor" | "ops_manager" | "finance_manager";
  created_at: string;
}

export type FailsafeResult<T> =
  | { ok: true; action: T; confidence: number }
  | { ok: false; escalation: FailsafeEscalation };

function normaliseConfidence(c: number): number {
  if (!Number.isFinite(c)) return 0;
  if (c < 0) return 0;
  if (c > 1 && c <= 100) return c / 100;
  if (c > 1) return 1;
  return c;
}

export function aiFailsafe<T>(input: FailsafeInput<T>): FailsafeResult<T> {
  const confidence = normaliseConfidence(input.confidence);
  const threshold = input.threshold ?? 0.6;
  if (confidence >= threshold) {
    return { ok: true, action: input.action, confidence };
  }
  return {
    ok: false,
    escalation: {
      status: "escalate",
      confidence,
      threshold,
      reason: input.reason ||
        `Model confidence ${(confidence * 100).toFixed(1)}% below required ${(threshold * 100).toFixed(0)}%`,
      context: input.context,
      recommended_review: "human_supervisor",
      created_at: new Date().toISOString(),
    },
  };
}
