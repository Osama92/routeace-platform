/**
 * Global Country Configuration Engine
 * 
 * Config-driven abstraction layer that keeps Nigerian logic intact
 * while enabling global expansion through country-specific adapters.
 */

export interface CountryConfig {
  code: string;
  name: string;
  currencyCode: string;
  currencySymbol: string;
  locale: string;
  isActive: boolean;
  isDefault: boolean;

  // Pricing
  starterPrice: number;
  growthPrice: number;
  enterprisePrice: number;
  perDropPrice: number;
  aiAddonPrice: number;

  // Tax
  taxEngineType: TaxEngineType;
  vatRate: number;

  // Compliance
  requiresGdpr: boolean;
  requiresCcpa: boolean;
  requiresDataLocalization: boolean;

  // Payment & Maps
  paymentProvider: PaymentProvider;
  mapProvider: MapProvider;
  mapFallbackProvider: MapProvider | null;

  // Route weights
  routeWeightSnow: boolean;
  routeWeightMountain: boolean;
  routeWeightToll: boolean;
  routeWeightBorder: boolean;

  // FX
  fxBufferPercent: number;
  settlementCurrency: string;

  // SLA
  slaZones: SLAZone[];

  // Annual
  annualFreeMonths: number;
}

export type TaxEngineType = 
  | 'nigerian_paye' 
  | 'uk_vat' 
  | 'us_state_tax' 
  | 'uae_zero_vat' 
  | 'ca_gst';

export type PaymentProvider = 'paystack' | 'flutterwave' | 'stripe' | 'stripe_sepa';
export type MapProvider = 'google' | 'mapbox' | 'here';

export interface SLAZone {
  zone: string;
  days_min: number;
  days_max: number;
}

export interface PricingTier {
  name: string;
  price: number;
  currencySymbol: string;
  currencyCode: string;
  perVehicle: boolean;
  perDrop: number;
  features: string[];
  highlighted?: boolean;
}

/**
 * Static fallback configs used when DB is unavailable.
 * Nigeria remains the default - all others are additive.
 */
export const COUNTRY_DEFAULTS: Record<string, Partial<CountryConfig>> = {
  NG: {
    code: 'NG',
    name: 'Nigeria',
    currencyCode: 'NGN',
    currencySymbol: '₦',
    locale: 'en-NG',
    isDefault: true,
    starterPrice: 0,
    growthPrice: 5000,
    enterprisePrice: 20000,
    perDropPrice: 50,
    taxEngineType: 'nigerian_paye',
    vatRate: 7.5,
    paymentProvider: 'paystack',
    mapProvider: 'google',
    fxBufferPercent: 0,
    settlementCurrency: 'NGN',
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    currencyCode: 'GBP',
    currencySymbol: '£',
    locale: 'en-GB',
    starterPrice: 99,
    growthPrice: 199,
    enterprisePrice: 499,
    perDropPrice: 0.20,
    aiAddonPrice: 79,
    taxEngineType: 'uk_vat',
    vatRate: 20,
    paymentProvider: 'stripe',
    mapProvider: 'google',
    fxBufferPercent: 6,
    settlementCurrency: 'GBP',
    requiresGdpr: true,
    routeWeightSnow: true,
    routeWeightToll: true,
  },
  US: {
    code: 'US',
    name: 'United States',
    currencyCode: 'USD',
    currencySymbol: '$',
    locale: 'en-US',
    starterPrice: 129,
    growthPrice: 249,
    enterprisePrice: 499,
    perDropPrice: 0.25,
    aiAddonPrice: 79,
    taxEngineType: 'us_state_tax',
    vatRate: 0,
    paymentProvider: 'stripe',
    mapProvider: 'google',
    mapFallbackProvider: 'mapbox',
    fxBufferPercent: 5,
    settlementCurrency: 'USD',
    routeWeightSnow: true,
    routeWeightMountain: true,
    routeWeightToll: true,
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    currencyCode: 'AED',
    currencySymbol: 'د.إ',
    locale: 'en-AE',
    starterPrice: 450,
    growthPrice: 850,
    enterprisePrice: 1500,
    perDropPrice: 0.60,
    aiAddonPrice: 100,
    taxEngineType: 'uae_zero_vat',
    vatRate: 5,
    paymentProvider: 'stripe',
    mapProvider: 'google',
    fxBufferPercent: 7,
    settlementCurrency: 'AED',
    routeWeightToll: true,
    routeWeightBorder: true,
  },
  CA: {
    code: 'CA',
    name: 'Canada',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    locale: 'en-CA',
    starterPrice: 140,
    growthPrice: 260,
    enterprisePrice: 450,
    perDropPrice: 0.22,
    aiAddonPrice: 69,
    taxEngineType: 'ca_gst',
    vatRate: 5,
    paymentProvider: 'stripe',
    mapProvider: 'google',
    mapFallbackProvider: 'mapbox',
    fxBufferPercent: 5,
    settlementCurrency: 'CAD',
    routeWeightSnow: true,
    routeWeightMountain: true,
    routeWeightToll: true,
    routeWeightBorder: true,
  },
};

/** Format a price with the country's currency */
export function formatPrice(amount: number, config: Partial<CountryConfig>): string {
  const { currencyCode = 'NGN', locale = 'en-NG' } = config;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: amount < 1 ? 2 : 0,
    maximumFractionDigits: amount < 1 ? 2 : 0,
  }).format(amount);
}

/** Build pricing tiers for a country */
export function buildPricingTiers(config: Partial<CountryConfig>): PricingTier[] {
  const sym = config.currencySymbol || '₦';
  const code = config.currencyCode || 'NGN';
  const isNigeria = config.code === 'NG';

  return [
    {
      name: 'Starter',
      price: config.starterPrice || 0,
      currencySymbol: sym,
      currencyCode: code,
      perVehicle: !isNigeria,
      perDrop: 0,
      features: isNigeria
        ? ['Single user access', 'Basic dispatch', 'Limited reports', 'Up to 5 vehicles']
        : ['Per vehicle pricing', 'Basic dispatch & tracking', 'Standard reports', 'Email support'],
    },
    {
      name: 'Growth',
      price: config.growthPrice || 0,
      currencySymbol: sym,
      currencyCode: code,
      perVehicle: !isNigeria,
      perDrop: config.perDropPrice || 0,
      features: isNigeria
        ? ['Multi-user (up to 10)', 'Zoho + QuickBooks sync', 'Full operations tools', 'Up to 50 vehicles']
        : ['All Starter features', 'AI route optimization', 'Multi-user team', 'API access', 'Priority support'],
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: config.enterprisePrice || 0,
      currencySymbol: sym,
      currencyCode: code,
      perVehicle: !isNigeria,
      perDrop: config.perDropPrice || 0,
      features: isNigeria
        ? ['Unlimited users', 'WhatsApp + Website orders', 'Role customization', 'White-label resale']
        : ['All Growth features', 'Custom SLA engine', 'White-label portal', 'Dedicated account manager', 'Custom integrations'],
      highlighted: false,
    },
  ];
}

/** Country flag emoji lookup */
export const COUNTRY_FLAGS: Record<string, string> = {
  NG: '🇳🇬',
  GB: '🇬🇧',
  US: '🇺🇸',
  AE: '🇦🇪',
  CA: '🇨🇦',
};
