/**
 * Payment Provider Abstraction Layer
 * 
 * Maps countries to payment providers.
 * Nigerian Paystack/Flutterwave flows remain unchanged.
 * Global markets use Stripe.
 */

import type { PaymentProvider } from './countryConfig';

export interface PaymentProviderConfig {
  name: string;
  displayName: string;
  supportedCurrencies: string[];
  supportsSubscriptions: boolean;
  supportsPerDropBilling: boolean;
  webhookPath: string;
}

export const PAYMENT_PROVIDERS: Record<PaymentProvider, PaymentProviderConfig> = {
  paystack: {
    name: 'paystack',
    displayName: 'Paystack',
    supportedCurrencies: ['NGN', 'GHS', 'ZAR', 'USD'],
    supportsSubscriptions: true,
    supportsPerDropBilling: true,
    webhookPath: '/webhooks/paystack',
  },
  flutterwave: {
    name: 'flutterwave',
    displayName: 'Flutterwave',
    supportedCurrencies: ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'GBP', 'EUR'],
    supportsSubscriptions: true,
    supportsPerDropBilling: true,
    webhookPath: '/webhooks/flutterwave',
  },
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    supportedCurrencies: ['USD', 'GBP', 'EUR', 'CAD', 'AED', 'AUD'],
    supportsSubscriptions: true,
    supportsPerDropBilling: true,
    webhookPath: '/webhooks/stripe',
  },
  stripe_sepa: {
    name: 'stripe_sepa',
    displayName: 'Stripe (SEPA)',
    supportedCurrencies: ['EUR'],
    supportsSubscriptions: true,
    supportsPerDropBilling: false,
    webhookPath: '/webhooks/stripe',
  },
};

/**
 * Get payment provider config for a country.
 * Falls back to paystack (Nigeria default).
 */
export function getPaymentProvider(provider: PaymentProvider): PaymentProviderConfig {
  return PAYMENT_PROVIDERS[provider] || PAYMENT_PROVIDERS.paystack;
}
