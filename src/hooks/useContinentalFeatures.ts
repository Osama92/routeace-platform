/**
 * Continental Features Hook
 * 
 * Provides access to feature flags by continent or country.
 * Enables conditional loading of region-specific modules.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContinentalFeature {
  id: string;
  featureKey: string;
  featureName: string;
  description: string | null;
  continent: string | null;
  countryCode: string | null;
  isEnabled: boolean;
  config: Record<string, any>;
}

function mapRow(row: any): ContinentalFeature {
  return {
    id: row.id,
    featureKey: row.feature_key,
    featureName: row.feature_name,
    description: row.description,
    continent: row.continent,
    countryCode: row.country_code,
    isEnabled: row.is_enabled,
    config: row.config || {},
  };
}

/** Check if a specific feature is enabled for a given continent/country */
export function useFeatureEnabled(featureKey: string, continent?: string, countryCode?: string) {
  return useQuery({
    queryKey: ['continental-feature', featureKey, continent, countryCode],
    queryFn: async () => {
      let query = supabase
        .from('continental_features')
        .select('*')
        .eq('feature_key', featureKey)
        .eq('is_enabled', true);

      const { data, error } = await query;
      if (error) throw error;

      // Check for country-specific, then continent, then global (null continent)
      const features = (data || []).map(mapRow);
      const countryMatch = countryCode ? features.find(f => f.countryCode === countryCode) : null;
      const continentMatch = continent ? features.find(f => f.continent === continent && !f.countryCode) : null;
      const globalMatch = features.find(f => !f.continent && !f.countryCode);

      return countryMatch || continentMatch || globalMatch || null;
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Get all features for a continent */
export function useContinentFeatures(continent: string) {
  return useQuery({
    queryKey: ['continental-features', continent],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continental_features')
        .select('*')
        .or(`continent.eq.${continent},continent.is.null`)
        .eq('is_enabled', true);
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Get all enabled features */
export function useAllFeatures() {
  return useQuery({
    queryKey: ['continental-features-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('continental_features')
        .select('*')
        .eq('is_enabled', true);
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 30,
  });
}
