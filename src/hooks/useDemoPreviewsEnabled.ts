import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the current tenant has opted into seeing
 * illustrative "showcase" preview pages (escrow trust, supplier
 * intelligence, distributor financing, PortoDash demo, etc.).
 *
 * Default: OFF. Fresh tenants never see other companies' demo names.
 * A Super Admin can flip `tenant_config.show_demo_previews = true`
 * to enable them for sales demos.
 */
export function useDemoPreviewsEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ["tenant_config", "show_demo_previews"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data: row } = await supabase
        .from("tenant_config")
        .select("show_demo_previews")
        .eq("user_id", u.user.id)
        .maybeSingle();
      return !!row?.show_demo_previews;
    },
    staleTime: 60_000,
  });
  return { enabled: !!data, isLoading };
}
