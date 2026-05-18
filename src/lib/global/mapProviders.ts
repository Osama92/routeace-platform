/**
 * Map Provider Abstraction Layer
 * 
 * Supports Google Maps (primary) and OpenStreetMap (fallback).
 * Provider selection based on country configuration.
 */

export type MapProviderType = 'google' | 'openstreetmap' | 'mapbox' | 'here';

export interface MapProviderConfig {
  name: MapProviderType;
  displayName: string;
  tileUrl?: string;
  attribution?: string;
  requiresApiKey: boolean;
  supportedFeatures: string[];
}

export const MAP_PROVIDERS: Record<MapProviderType, MapProviderConfig> = {
  google: {
    name: 'google',
    displayName: 'Google Maps',
    requiresApiKey: true,
    supportedFeatures: ['routing', 'traffic', 'places', 'geocoding', 'directions', 'street_view'],
  },
  openstreetmap: {
    name: 'openstreetmap',
    displayName: 'OpenStreetMap',
    tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    requiresApiKey: false,
    supportedFeatures: ['routing', 'geocoding', 'tiles'],
  },
  mapbox: {
    name: 'mapbox',
    displayName: 'Mapbox',
    requiresApiKey: true,
    supportedFeatures: ['routing', 'traffic', 'geocoding', 'directions', 'tiles'],
  },
  here: {
    name: 'here',
    displayName: 'HERE Maps',
    requiresApiKey: true,
    supportedFeatures: ['routing', 'traffic', 'geocoding', 'fleet_management'],
  },
};

/**
 * Get map provider config with fallback chain.
 * Returns primary provider, or fallback if primary unavailable.
 */
export function getMapProvider(
  primary: string = 'google',
  fallback: string | null = 'openstreetmap'
): MapProviderConfig {
  return MAP_PROVIDERS[primary as MapProviderType] ||
    (fallback ? MAP_PROVIDERS[fallback as MapProviderType] : null) ||
    MAP_PROVIDERS.openstreetmap;
}
