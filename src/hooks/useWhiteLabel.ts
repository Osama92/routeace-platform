import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface WhiteLabelState {
  brandName: string;
  brandSuffix: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  showPoweredBy: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  // Surface scopes - consumers can decide whether to apply branding to a given surface
  applyToCustomerPortal: boolean;
  applyToTracking: boolean;
  applyToReports: boolean;
  applyToEmails: boolean;
  applyToInvoices: boolean;
}

const DEFAULTS = {
  brandName: "RouteAce",
  brandSuffix: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  showPoweredBy: false,
  isEnabled: false,
  applyToCustomerPortal: false,
  applyToTracking: false,
  applyToReports: false,
  applyToEmails: false,
  applyToInvoices: false,
};

export function useWhiteLabel(): WhiteLabelState {
  const { user, organizationId } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["white-label-config", organizationId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      let query = supabase.from("white_label_config").select("*");
      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      } else {
        // Fall back to activator-scoped row when org not yet resolved
        query = query.eq("activated_by", user.id);
      }
      const { data, error } = await query.limit(1).maybeSingle();
      if (error) {
        console.warn("[useWhiteLabel] fetch failed:", error.message);
        return null;
      }
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!data || data.is_active !== true || !data.brand_name) {
    return { ...DEFAULTS, isLoading };
  }

  return {
    brandName: data.brand_name,
    brandSuffix: data.brand_suffix || null,
    logoUrl: data.logo_url || null,
    primaryColor: data.primary_color || null,
    secondaryColor: data.secondary_color || null,
    showPoweredBy: data.show_powered_by ?? true,
    isEnabled: true,
    isLoading,
    applyToCustomerPortal: data.apply_to_customer_portal ?? true,
    applyToTracking: data.apply_to_tracking ?? true,
    applyToReports: data.apply_to_reports ?? true,
    applyToEmails: data.apply_to_emails ?? true,
    applyToInvoices: data.apply_to_invoices ?? true,
  };
}

export default useWhiteLabel;
