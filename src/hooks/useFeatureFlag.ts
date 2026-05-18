/**
 * useFeatureFlag - server-evaluated feature flag with rollout %.
 * Calls public.evaluate_feature_flag(flag_key, organization_id) RPC.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FlagResult {
  flag_key: string;
  enabled: boolean;
  rollout_pct?: number;
  source?: string;
  config?: Record<string, any>;
}

export function useFeatureFlag(flagKey: string) {
  const { organizationId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flag", flagKey, organizationId],
    queryFn: async (): Promise<FlagResult> => {
      const { data, error } = await (supabase as any).rpc("evaluate_feature_flag", {
        _flag_key: flagKey,
        _organization_id: organizationId ?? null,
      });
      if (error) throw error;
      return (data as FlagResult) || { flag_key: flagKey, enabled: false };
    },
    staleTime: 60_000,
  });
  return { enabled: !!data?.enabled, flag: data, isLoading };
}

export function useFeatureFlags(flagKeys: string[]) {
  const { organizationId } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["feature-flags", flagKeys.sort().join(","), organizationId],
    queryFn: async (): Promise<Record<string, FlagResult>> => {
      const { data, error } = await (supabase as any).rpc("evaluate_feature_flags", {
        _flag_keys: flagKeys,
        _organization_id: organizationId ?? null,
      });
      if (error) throw error;
      return (data as Record<string, FlagResult>) || {};
    },
    staleTime: 60_000,
  });
  return { flags: data ?? {}, isEnabled: (k: string) => !!data?.[k]?.enabled, isLoading };
}
