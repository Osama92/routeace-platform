// Unified Role-Based AI Performance API client
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const BASE = `https://${PROJECT_ID}.supabase.co/functions/v1/role-ai-api`;

type RoleKey = "ops_manager" | "support" | "org_admin" | "super_admin";

async function roleFetch<T = any>(route: string, role: RoleKey, method = "GET", body?: any): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  const [routePath, routeQuery] = route.split("?");
  let url = `${BASE}?route=${encodeURIComponent(routePath)}&role=${role}`;
  if (routeQuery) url += `&${routeQuery}`;
  try {
    const res = await fetch(url, {
      method,
      headers: { "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (res.status === 404) {
      console.warn(`[RoleAI] Function not available for route ${routePath}`);
      return null as T;
    }
    const json = await res.json();
    if (!res.ok || json.success === false) {
      console.warn(`[RoleAI] API error for ${routePath}:`, json.error?.message);
      return null as T;
    }
    return json.data;
  } catch (e) {
    console.warn(`[RoleAI] Network error for ${routePath}:`, e);
    return null as T;
  }
}

export function useRoleScore(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "score"], queryFn: () => roleFetch("/score", role), staleTime: 60_000 });
}
export function useRoleScoreHistory(role: RoleKey, limit = 30) {
  return useQuery({ queryKey: ["role-ai", role, "score-history", limit], queryFn: () => roleFetch(`/score/history?limit=${limit}`, role), staleTime: 120_000 });
}
export function useRoleTasks(role: RoleKey, status?: string) {
  return useQuery({ queryKey: ["role-ai", role, "tasks", status], queryFn: () => roleFetch(status ? `/tasks?status=${status}` : "/tasks", role), staleTime: 30_000 });
}
export function useCompleteRoleTask(role: RoleKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (taskId: string) => roleFetch(`/tasks/${taskId}/complete`, role, "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-ai", role] }); },
  });
}
export function useRoleTransformation(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "transformation"], queryFn: () => roleFetch("/transformation", role), staleTime: 60_000 });
}
export function useCompleteRoleDay(role: RoleKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ day, timeSpent }: { day: number; timeSpent?: number }) => roleFetch(`/transformation/${day}/complete`, role, "POST", { time_spent: timeSpent || 15 }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-ai", role] }); },
  });
}
export function useRoleRisks(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "risks"], queryFn: () => roleFetch("/risks", role), staleTime: 60_000 });
}
export function useRoleInsights(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "insights"], queryFn: () => roleFetch("/insights", role), staleTime: 60_000 });
}
export function useGenerateRoleInsights(role: RoleKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => roleFetch("/insights/generate", role, "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-ai", role] }); },
  });
}
export function useRoleWorkflows(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "workflows"], queryFn: () => roleFetch("/workflows", role), staleTime: 300_000 });
}
export function useRoleDecisions(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "decisions"], queryFn: () => roleFetch("/decisions", role), staleTime: 60_000 });
}
export function useAnalyzeDecision(role: RoleKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { decision_type: string; title: string; description?: string }) => roleFetch("/decisions/analyze", role, "POST", body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-ai", role, "decisions"] }); },
  });
}
export function useExecuteDecision(role: RoleKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (decisionId: string) => roleFetch(`/decisions/${decisionId}/execute`, role, "POST"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["role-ai", role, "decisions"] }); },
  });
}
export function useCrossRoleImpacts(role: RoleKey) {
  return useQuery({ queryKey: ["role-ai", role, "cross-impacts"], queryFn: () => roleFetch("/cross-impacts", role), staleTime: 60_000 });
}
