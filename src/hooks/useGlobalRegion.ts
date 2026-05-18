/**
 * Global Region Hook
 * 
 * Provides access to region-specific configuration
 * based on the user's country code or organization settings.
 * Falls back to Nigeria (NG) as the default market.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalRegion {
  id: string;
  countryCode: string;
  countryName: string;
  continent: string;
  subRegion: string | null;
  currencyCode: string;
  currencySymbol: string;
  currencyName: string;
  defaultLanguage: string;
  timezone: string;
  callingCode: string | null;
  flagEmoji: string | null;
  mapProvider: string;
  mapFallbackProvider: string | null;
  paymentGateway: string;
  paymentFallbackGateway: string | null;
  vatRate: number;
  taxEngineType: string;
  requiresGdpr: boolean;
  requiresCcpa: boolean;
  requiresEld: boolean;
  requiresCarbonReporting: boolean;
  purchasingPowerIndex: number;
  basePriceMultiplier: number;
  fxBufferPercent: number;
  terrainType: string;
  offlineModePriority: boolean;
  lowBandwidthMode: boolean;
  cashOnDeliveryEnabled: boolean;
  informalWorkforceMode: boolean;
  isActive: boolean;
  isPriorityMarket: boolean;
  launchPhase: number;
}

function mapRow(row: any): GlobalRegion {
  return {
    id: row.id,
    countryCode: row.country_code,
    countryName: row.country_name,
    continent: row.continent,
    subRegion: row.sub_region,
    currencyCode: row.currency_code,
    currencySymbol: row.currency_symbol,
    currencyName: row.currency_name,
    defaultLanguage: row.default_language,
    timezone: row.timezone,
    callingCode: row.calling_code,
    flagEmoji: row.flag_emoji,
    mapProvider: row.map_provider,
    mapFallbackProvider: row.map_fallback_provider,
    paymentGateway: row.payment_gateway,
    paymentFallbackGateway: row.payment_fallback_gateway,
    vatRate: Number(row.vat_rate),
    taxEngineType: row.tax_engine_type,
    requiresGdpr: row.requires_gdpr,
    requiresCcpa: row.requires_ccpa,
    requiresEld: row.requires_eld,
    requiresCarbonReporting: row.requires_carbon_reporting,
    purchasingPowerIndex: Number(row.purchasing_power_index),
    basePriceMultiplier: Number(row.base_price_multiplier),
    fxBufferPercent: Number(row.fx_buffer_percent),
    terrainType: row.terrain_type,
    offlineModePriority: row.offline_mode_priority,
    lowBandwidthMode: row.low_bandwidth_mode,
    cashOnDeliveryEnabled: row.cash_on_delivery_enabled,
    informalWorkforceMode: row.informal_workforce_mode,
    isActive: row.is_active,
    isPriorityMarket: row.is_priority_market,
    launchPhase: row.launch_phase,
  };
}

/** Fetch a single region by country code */
export function useGlobalRegion(countryCode: string = 'NG') {
  return useQuery({
    queryKey: ['global-region', countryCode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_regions')
        .select('*')
        .eq('country_code', countryCode)
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Fetch all active regions */
export function useActiveRegions() {
  return useQuery({
    queryKey: ['global-regions-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_regions')
        .select('*')
        .eq('is_active', true)
        .order('country_name');
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Fetch all regions grouped by continent */
export function useRegionsByContinent() {
  return useQuery({
    queryKey: ['global-regions-by-continent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_regions')
        .select('*')
        .order('continent, country_name');
      if (error) throw error;
      const regions = (data || []).map(mapRow);
      const grouped: Record<string, GlobalRegion[]> = {};
      regions.forEach(r => {
        if (!grouped[r.continent]) grouped[r.continent] = [];
        grouped[r.continent].push(r);
      });
      return grouped;
    },
    staleTime: 1000 * 60 * 30,
  });
}

/** Fetch priority markets only */
export function usePriorityMarkets() {
  return useQuery({
    queryKey: ['global-regions-priority'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_regions')
        .select('*')
        .eq('is_priority_market', true)
        .order('launch_phase, country_name');
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 30,
  });
}
