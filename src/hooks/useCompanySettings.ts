import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export interface CompanySettings {
  id: string;
  organization_id: string | null;
  company_name: string;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  signature_url: string | null;
  logo_url: string | null;
}

type SettingsRow = {
  id: string;
  organization_id: string | null;
  company_name: string;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  signature_url: string | null;
  logo_url: string | null;
};

type BankRow = {
  bank_name: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
};

const mergeSettings = (base: SettingsRow | null, bank: BankRow | null): CompanySettings | null => {
  if (!base) return null;
  return {
    ...base,
    bank_name: bank?.bank_name ?? null,
    bank_account_name: bank?.bank_account_name ?? null,
    bank_account_number: bank?.bank_account_number ?? null,
  };
};

export const useCompanySettings = () => {
  const { organizationId } = useAuth();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    if (!organizationId) {
      setSettings(null);
      setLoading(false);
      return null;
    }
    try {
      setLoading(true);
      const { data: base, error } = await supabase
        .from("company_settings")
        .select("id, organization_id, company_name, tagline, email, phone, address, signature_url, logo_url")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Bank details may be restricted; ignore RLS errors silently
      const { data: bank } = await supabase
        .from("company_bank_details")
        .select("bank_name, bank_account_name, bank_account_number")
        .eq("organization_id", organizationId)
        .maybeSingle();

      const merged = mergeSettings(base as SettingsRow | null, bank as BankRow | null);
      setSettings(merged);
      return merged;
    } catch (error: any) {
      console.error("Error fetching company settings:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  const updateSettings = async (updates: Partial<CompanySettings>): Promise<CompanySettings | null> => {
    if (!organizationId) {
      toast({ title: "Error", description: "No organization context - please re-login.", variant: "destructive" });
      return null;
    }
    try {
      const { data: existing, error: fetchError } = await supabase
        .from("company_settings")
        .select("id, organization_id, company_name, tagline, email, phone, address, signature_url, logo_url")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let savedBase: SettingsRow | null = null;

      const brandingFields: (keyof CompanySettings)[] = [
        "company_name", "tagline", "email", "phone", "address", "signature_url", "logo_url",
      ];
      const hasBranding = brandingFields.some((f) => f in updates);
      const hasBank = ["bank_name", "bank_account_name", "bank_account_number"].some((f) => f in updates);

      if (!existing) {
        const insertPayload: Record<string, any> = {
          organization_id: organizationId,
          company_name: updates.company_name || "My Company",
          tagline: updates.tagline ?? null,
          email: updates.email ?? null,
          phone: updates.phone ?? null,
          address: updates.address ?? null,
          signature_url: updates.signature_url ?? null,
          logo_url: updates.logo_url ?? null,
        };

        const { data, error } = await supabase
          .from("company_settings")
          .insert(insertPayload)
          .select("id, organization_id, company_name, tagline, email, phone, address, signature_url, logo_url");

        if (error) throw error;
        savedBase = (Array.isArray(data) ? data[0] : data) as SettingsRow;
        if (!savedBase) throw new Error("Insert returned no data - check access rules");
      } else if (hasBranding) {
        const mergedPayload: Record<string, any> = { updated_at: new Date().toISOString() };
        for (const f of brandingFields) {
          if (f in updates) mergedPayload[f as string] = (updates as any)[f];
        }

        const { data, error } = await supabase
          .from("company_settings")
          .update(mergedPayload)
          .eq("id", existing.id)
          .eq("organization_id", organizationId)
          .select("id, organization_id, company_name, tagline, email, phone, address, signature_url, logo_url");

        if (error) throw error;
        savedBase = (Array.isArray(data) ? data[0] : data) as SettingsRow;
      } else {
        savedBase = existing as SettingsRow;
      }

      // Upsert bank details if provided (restricted to finance/admin roles by RLS)
      let savedBank: BankRow | null = null;
      if (hasBank) {
        const bankPayload = {
          organization_id: organizationId,
          bank_name: "bank_name" in updates ? updates.bank_name ?? null : undefined,
          bank_account_name: "bank_account_name" in updates ? updates.bank_account_name ?? null : undefined,
          bank_account_number: "bank_account_number" in updates ? updates.bank_account_number ?? null : undefined,
        };

        const { data: bankData, error: bankError } = await supabase
          .from("company_bank_details")
          .upsert([bankPayload], { onConflict: "organization_id" })
          .select("bank_name, bank_account_name, bank_account_number")
          .maybeSingle();

        if (bankError) throw bankError;
        savedBank = bankData as BankRow | null;
      } else {
        const { data: bankData } = await supabase
          .from("company_bank_details")
          .select("bank_name, bank_account_name, bank_account_number")
          .eq("organization_id", organizationId)
          .maybeSingle();
        savedBank = bankData as BankRow | null;
      }

      const merged = mergeSettings(savedBase, savedBank);
      setSettings(merged);
      toast({ title: "Settings Saved", description: "Company settings updated successfully" });
      return merged;
    } catch (error: any) {
      console.error("Error saving company settings:", error);
      toast({ title: "Error", description: error.message || "Failed to save settings", variant: "destructive" });
      return null;
    }
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!organizationId) {
      toast({ title: "Error", description: "No organization context.", variant: "destructive" });
      return null;
    }
    try {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) throw new Error("Invalid file type. Please upload PNG, JPG, SVG or WEBP.");
      if (file.size > 2 * 1024 * 1024) throw new Error("File too large. Maximum size is 2MB.");

      const fileExt = file.name.split(".").pop()?.toLowerCase() || 'png';
      const fileName = `${folder}-${Date.now()}.${fileExt}`;
      const filePath = `${organizationId}/${folder}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error(`${folder} upload error:`, error);
      toast({ title: "Upload Error", description: error.message || `Failed to upload ${folder}`, variant: "destructive" });
      return null;
    }
  };

  const uploadAndSaveSignature = async (file: File): Promise<string | null> => {
    const url = await uploadFile(file, 'signatures');
    if (!url) return null;
    const saved = await updateSettings({ signature_url: url });
    return saved ? saved.signature_url : null;
  };

  const uploadAndSaveLogo = async (file: File): Promise<string | null> => {
    const url = await uploadFile(file, 'logos');
    if (!url) return null;
    const saved = await updateSettings({ logo_url: url });
    return saved ? saved.logo_url : null;
  };

  const forceRefresh = useCallback(async () => fetchSettings(), [fetchSettings]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return {
    settings,
    loading,
    updateSettings,
    uploadAndSaveSignature,
    uploadAndSaveLogo,
    refetch: fetchSettings,
    forceRefresh,
  };
};

export default useCompanySettings;
