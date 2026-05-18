// Unified Finance Manager API client hook
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/fm-api`;

async function fmFetch<T = any>(route: string, method = "GET", body?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");

  const url = `${BASE}?route=${encodeURIComponent(route)}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  if (!res.ok || json.success === false) throw new Error(json.error?.message || json.error || "API Error");
  return json.data;
}

// ── Score ──────────────────────────────────────────────────────────
export function usePerformanceScore() {
  return useQuery({
    queryKey: ["fm", "score"],
    queryFn: () => fmFetch("/score"),
    staleTime: 60_000,
  });
}

export function useScoreHistory(limit = 30) {
  return useQuery({
    queryKey: ["fm", "score-history", limit],
    queryFn: () => fmFetch(`/score/history?limit=${limit}`),
    staleTime: 120_000,
  });
}

// ── Finance ───────────────────────────────────────────────────────
export function usePnL(period = "monthly") {
  return useQuery({
    queryKey: ["fm", "pnl", period],
    queryFn: () => fmFetch(`/finance/pnl?period=${period}`),
    staleTime: 120_000,
  });
}

export function useCashFlow() {
  return useQuery({
    queryKey: ["fm", "cashflow"],
    queryFn: () => fmFetch("/finance/cashflow"),
    staleTime: 120_000,
  });
}

export function useReceivables() {
  return useQuery({
    queryKey: ["fm", "receivables"],
    queryFn: () => fmFetch("/finance/receivables"),
    staleTime: 120_000,
  });
}

export function useBills() {
  return useQuery({
    queryKey: ["fm", "bills"],
    queryFn: () => fmFetch("/finance/bills"),
    staleTime: 120_000,
  });
}

// ── Tasks ─────────────────────────────────────────────────────────
export function useFMTasks(status?: string) {
  return useQuery({
    queryKey: ["fm", "tasks", status],
    queryFn: () => fmFetch(status ? `/tasks?status=${status}` : "/tasks"),
    staleTime: 30_000,
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => fmFetch(`/tasks/${taskId}/complete`, "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fm", "tasks"] }); qc.invalidateQueries({ queryKey: ["fm", "score"] }); },
  });
}

// ── Risks ─────────────────────────────────────────────────────────
export function useRisks() {
  return useQuery({
    queryKey: ["fm", "risks"],
    queryFn: () => fmFetch("/risks"),
    staleTime: 60_000,
  });
}

export function useResolveRisk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ riskId, notes }: { riskId: string; notes?: string }) => fmFetch(`/risks/${riskId}/resolve`, "POST", { notes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fm", "risks"] }),
  });
}

// ── Transformation ────────────────────────────────────────────────
export function useTransformation() {
  return useQuery({
    queryKey: ["fm", "transformation"],
    queryFn: () => fmFetch("/transformation"),
    staleTime: 60_000,
  });
}

export function useCompleteDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ day, timeSpent }: { day: number; timeSpent?: number }) => fmFetch(`/transformation/${day}/complete`, "POST", { time_spent: timeSpent || 15 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fm", "transformation"] }); qc.invalidateQueries({ queryKey: ["fm", "score"] }); },
  });
}

// ── AI Insights ───────────────────────────────────────────────────
export function useAIInsights() {
  return useQuery({
    queryKey: ["fm", "insights"],
    queryFn: () => fmFetch("/ai/insights"),
    staleTime: 60_000,
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => fmFetch("/ai/insights/generate", "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["fm", "insights"] }); qc.invalidateQueries({ queryKey: ["fm", "tasks"] }); },
  });
}

// ── AI Recommendations ────────────────────────────────────────────
export function useAIRecommendations() {
  return useQuery({
    queryKey: ["fm", "recommendations"],
    queryFn: () => fmFetch("/ai/recommendations"),
    staleTime: 60_000,
  });
}

// ── Workflows ─────────────────────────────────────────────────────
export function useWorkflows() {
  return useQuery({
    queryKey: ["fm", "workflows"],
    queryFn: () => fmFetch("/finance/workflows"),
    staleTime: 300_000,
  });
}

// ── Events ────────────────────────────────────────────────────────
export function useFireEvent() {
  return useMutation({
    mutationFn: (event: { event_type: string; entity_id?: string; [key: string]: any }) => fmFetch("/events", "POST", event),
  });
}
