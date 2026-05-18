/**
 * Region Mode Engine
 * Controls feature visibility, UI segmentation, and contextual onboarding
 * between NG_MODE (Nigeria) and GLOBAL_MODE.
 * 
 * CRITICAL: Never auto-switches. Set at signup, only changed via explicit migration.
 */
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type RegionMode = "NG" | "GLOBAL";

export interface RegionConfig {
  mode: RegionMode;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  label: string;
  flag: string;
}

const NG_CONFIG: RegionConfig = {
  mode: "NG",
  countryCode: "NG",
  currency: "NGN",
  currencySymbol: "₦",
  label: "Nigeria",
  flag: "🇳🇬",
};

const GLOBAL_CONFIG: RegionConfig = {
  mode: "GLOBAL",
  countryCode: "GB",
  currency: "USD",
  currencySymbol: "$",
  label: "Global",
  flag: "🌍",
};

// Feature flags - which region each nav item/feature belongs to
export type FeatureRegion = "NG_ONLY" | "GLOBAL_ONLY" | "BOTH";

export const FEATURE_REGION_MAP: Record<string, FeatureRegion> = {
  // NG-only features
  "ng-sla-zones": "NG_ONLY",
  "ng-tax-automation": "NG_ONLY",
  "ng-per-drop-billing": "NG_ONLY",
  "ng-payroll": "NG_ONLY",
  "ng-banking": "NG_ONLY",
  "ng-corridor-intelligence": "NG_ONLY",

  // Global-only features
  "eu-freight-compliance": "GLOBAL_ONLY",
  "us-interstate-ai": "GLOBAL_ONLY",
  "belt-road-asia": "GLOBAL_ONLY",
  "gcc-trade-corridor": "GLOBAL_ONLY",
  "global-tax-compliance": "GLOBAL_ONLY",
  "wallet-banking": "GLOBAL_ONLY",
  "tec-corridor": "GLOBAL_ONLY",
  "gfix": "GLOBAL_ONLY",
  "multi-currency-treasury": "GLOBAL_ONLY",

  // Shared features
  "dispatch": "BOTH",
  "routes": "BOTH",
  "tracking": "BOTH",
  "drivers": "BOTH",
  "fleet": "BOTH",
  "customers": "BOTH",
  "invoices": "BOTH",
  "analytics": "BOTH",
  "payroll": "BOTH",
  "freight-intelligence": "BOTH",
  "risk-hedge-engine": "BOTH",
  "ai-operations": "BOTH",
  "autonomous-distribution-ai": "BOTH",
};

// Nav route → feature key mapping
export const ROUTE_FEATURE_MAP: Record<string, string> = {
  "/compliance/eu-dashboard": "eu-freight-compliance",
  "/analytics/eu-corridor-dashboard": "eu-freight-compliance",
  "/analytics/us-interstate-ai": "us-interstate-ai",
  "/analytics/bri-asia-engine": "belt-road-asia",
  "/analytics/gcc-corridor-ai": "gcc-trade-corridor",
  "/global-tax-compliance": "global-tax-compliance",
  "/wallet-banking": "wallet-banking",
  "/analytics/gfix": "gfix",
  "/tax-automation": "BOTH",
};

interface RegionContextType {
  region: RegionConfig;
  isNGMode: boolean;
  isGlobalMode: boolean;
  loading: boolean;
  setRegionMode: (mode: RegionMode, countryCode?: string) => Promise<void>;
  isFeatureVisible: (featureKey: string) => boolean;
  isRouteVisible: (route: string) => boolean;
}

const RegionContext = createContext<RegionContextType | undefined>(undefined);

export const useRegion = () => {
  const ctx = useContext(RegionContext);
  if (!ctx) throw new Error("useRegion must be used within RegionProvider");
  return ctx;
};

export const RegionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [regionMode, setRegionModeState] = useState<RegionMode>("NG");
  const [countryCode, setCountryCode] = useState("NG");
  const [loading, setLoading] = useState(true);

  // Fetch region from profile on auth change
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchRegion = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("region_mode, country_code")
          .eq("user_id", user.id)
          .single();

        if (!error && data) {
          setRegionModeState((data.region_mode as RegionMode) || "NG");
          setCountryCode(data.country_code || "NG");
        }
      } catch (e) {
        console.error("Failed to fetch region config:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchRegion();
  }, [user?.id]);

  const setRegionMode = useCallback(async (mode: RegionMode, code?: string) => {
    if (!user) return;
    const newCode = code || (mode === "NG" ? "NG" : "GB");
    
    setRegionModeState(mode);
    setCountryCode(newCode);

    await supabase
      .from("profiles")
      .update({ region_mode: mode, country_code: newCode })
      .eq("user_id", user.id);
  }, [user]);

  const region: RegionConfig = regionMode === "NG"
    ? NG_CONFIG
    : { ...GLOBAL_CONFIG, countryCode };

  const isFeatureVisible = useCallback((featureKey: string): boolean => {
    const mapping = FEATURE_REGION_MAP[featureKey];
    if (!mapping || mapping === "BOTH") return true;
    if (mapping === "NG_ONLY") return regionMode === "NG";
    if (mapping === "GLOBAL_ONLY") return regionMode === "GLOBAL";
    return true;
  }, [regionMode]);

  const isRouteVisible = useCallback((route: string): boolean => {
    const featureKey = ROUTE_FEATURE_MAP[route];
    if (!featureKey) return true;
    return isFeatureVisible(featureKey);
  }, [isFeatureVisible]);

  return (
    <RegionContext.Provider value={{
      region,
      isNGMode: regionMode === "NG",
      isGlobalMode: regionMode === "GLOBAL",
      loading,
      setRegionMode,
      isFeatureVisible,
      isRouteVisible,
    }}>
      {children}
    </RegionContext.Provider>
  );
};
