/**
 * Payment Gateways Hook
 * 
 * Provides access to the payment gateway registry.
 * Supports multi-gateway routing based on country configuration.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PaymentGateway {
  id: string;
  gatewayCode: string;
  displayName: string;
  supportedCurrencies: string[];
  supportsSubscriptions: boolean;
  supportsPerDropBilling: boolean;
  supportsMobileMoney: boolean;
  webhookPath: string | null;
  isActive: boolean;
}

function mapRow(row: any): PaymentGateway {
  return {
    id: row.id,
    gatewayCode: row.gateway_code,
    displayName: row.display_name,
    supportedCurrencies: row.supported_currencies || [],
    supportsSubscriptions: row.supports_subscriptions,
    supportsPerDropBilling: row.supports_per_drop_billing,
    supportsMobileMoney: row.supports_mobile_money,
    webhookPath: row.webhook_path,
    isActive: row.is_active,
  };
}

export function usePaymentGateways() {
  return useQuery({
    queryKey: ['payment-gateways'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_gateways')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    staleTime: 1000 * 60 * 60, // 1 hour cache
  });
}

/** Get the best gateway for a specific currency */
export function useGatewayForCurrency(currencyCode: string) {
  const { data: gateways } = usePaymentGateways();

  if (!gateways) return null;

  return gateways.find(g => g.supportedCurrencies.includes(currencyCode)) || 
         gateways.find(g => g.gatewayCode === 'stripe') || 
         null;
}
