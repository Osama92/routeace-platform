import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTenantConfig } from "@/hooks/useTenantConfig";
import {
  Palette,
  Globe,
  FileText,
  Mail,
  Receipt,
  Eye,
  Save,
  Loader2,
  Lock,
  Crown,
} from "lucide-react";

interface WhiteLabelSettings {
  brandName: string;
  brandSuffix: string;
  showPoweredBy: boolean;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  applyToCustomerPortal: boolean;
  applyToTracking: boolean;
  applyToReports: boolean;
  applyToEmails: boolean;
  applyToInvoices: boolean;
}

const SUFFIX_OPTIONS = [
  { value: "Track", label: "Track", example: "DDhaul Track" },
  { value: "Route", label: "Route", example: "DDhaul Route" },
  { value: "Insights", label: "Insights", example: "DDhaul Insights" },
  { value: "Logistics", label: "Logistics", example: "DDhaul Logistics" },
  { value: "", label: "None", example: "DDhaul" },
];

const WhiteLabelConfig = () => {
  const { user, userRole, organizationId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { config: tenantConfig } = useTenantConfig();

  // Live subscription tier - fetched from organizations table (not hardcoded).
  // Falls back to tenant_config.plan_tier, then "starter".
  const [subscriptionTier, setSubscriptionTier] = useState<string>(
    tenantConfig?.plan_tier || "starter"
  );

  useEffect(() => {
    if (!organizationId) return;
    supabase
      .from("organizations")
      .select("subscription_tier")
      .eq("id", organizationId)
      .single()
      .then(({ data }) => {
        if (data?.subscription_tier) setSubscriptionTier(data.subscription_tier);
      });
  }, [organizationId]);

  // Treat "growth" as the legacy "professional" entry-point for white-label.
  const rawTier = subscriptionTier;
  const tierLabel =
    rawTier === "growth" || rawTier === "professional"
      ? "Professional"
      : rawTier === "enterprise"
      ? "Enterprise"
      : rawTier;
  const canUseWhiteLabel =
    rawTier === "growth" || rawTier === "professional" || rawTier === "enterprise";
  const canFullCustomize = rawTier === "enterprise";

  const [settings, setSettings] = useState<WhiteLabelSettings>({
    brandName: "",
    brandSuffix: "Track",
    showPoweredBy: true,
    logoUrl: "",
    primaryColor: "#6366f1",
    secondaryColor: "#22c55e",
    applyToCustomerPortal: true,
    applyToTracking: true,
    applyToReports: true,
    applyToEmails: true,
    applyToInvoices: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("white_label_config")
        .select("*")
        .single();

      if (data) {
        setSettings({
          brandName: data.brand_name || "",
          brandSuffix: data.brand_suffix || "Track",
          showPoweredBy: data.show_powered_by ?? true,
          logoUrl: data.logo_url || "",
          primaryColor: data.primary_color || "#6366f1",
          secondaryColor: data.secondary_color || "#22c55e",
          applyToCustomerPortal: data.apply_to_customer_portal ?? true,
          applyToTracking: data.apply_to_tracking ?? true,
          applyToReports: data.apply_to_reports ?? true,
          applyToEmails: data.apply_to_emails ?? true,
          applyToInvoices: data.apply_to_invoices ?? true,
        });
      }
    } catch (error) {
      // No existing config - use defaults
      console.log("No existing white label config");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings.brandName) {
      toast({
        title: "Error",
        description: "Please enter a brand name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("white_label_config")
        .upsert({
          brand_name: settings.brandName,
          brand_suffix: canFullCustomize ? settings.brandSuffix : "Track",
          show_powered_by: canFullCustomize ? settings.showPoweredBy : true,
          logo_url: settings.logoUrl,
          primary_color: settings.primaryColor,
          secondary_color: settings.secondaryColor,
          apply_to_customer_portal: settings.applyToCustomerPortal,
          apply_to_tracking: settings.applyToTracking,
          apply_to_reports: settings.applyToReports,
          apply_to_emails: settings.applyToEmails,
          apply_to_invoices: settings.applyToInvoices,
          subscription_tier: rawTier,
          is_active: true,
          activated_at: new Date().toISOString(),
          activated_by: user?.id,
          organization_id: tenantConfig?.organization_id || user?.id,
        });

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: "Your white-label configuration has been updated",
      });

      // Log the change for audit
      await supabase.from("audit_logs").insert({
        action: "white_label_updated",
        table_name: "white_label_config",
        record_id: "config",
        user_id: user?.id,
        user_email: user?.email,
        new_data: settings as any,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getPreviewName = () => {
    if (!settings.brandName) return "Your Brand";
    if (settings.brandSuffix) {
      return `${settings.brandName} ${settings.brandSuffix}`;
    }
    return settings.brandName;
  };

  if (!canUseWhiteLabel) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg font-heading flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            White-Label Branding
          </CardTitle>
          <CardDescription>Customize your customer-facing experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Upgrade Required</h3>
            <p className="text-muted-foreground mb-4">
              White-label branding is available on Professional and Enterprise plans.
            </p>
            <div className="flex justify-center gap-4">
              <Badge variant="outline">Professional: ₦5,000/mo</Badge>
              <Badge>Enterprise: ₦10,000/mo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-heading flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              White-Label Branding
            </CardTitle>
            <CardDescription>Customize your customer-facing experience</CardDescription>
          </div>
          <Badge variant={rawTier === "enterprise" ? "default" : "secondary"}>
            <Crown className="w-3 h-3 mr-1" />
            {tierLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Brand Name */}
        <div className="space-y-2">
          <Label>Brand Name</Label>
          <Input
            placeholder="e.g., DDhaul, MyLogistics, etc."
            value={settings.brandName}
            onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
          />
        </div>

        {/* Brand Suffix */}
        <div className="space-y-3">
          <Label>Brand Suffix</Label>
          <RadioGroup
            value={settings.brandSuffix}
            onValueChange={(v) => setSettings({ ...settings, brandSuffix: v })}
            disabled={!canFullCustomize}
          >
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {SUFFIX_OPTIONS.map((option) => (
                <div
                  key={option.value}
                  className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                    settings.brandSuffix === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  } ${!canFullCustomize && option.value === "" ? "opacity-50" : ""}`}
                  onClick={() => canFullCustomize && setSettings({ ...settings, brandSuffix: option.value })}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground">{option.example}</p>
                </div>
              ))}
            </div>
          </RadioGroup>
          {!canFullCustomize && (
            <p className="text-xs text-muted-foreground">
              <Lock className="inline w-3 h-3 mr-1" />
              Custom suffix options require Enterprise plan
            </p>
          )}
        </div>

        {/* Powered By Toggle */}
        <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
          <div>
            <p className="font-medium">Show "Powered by RouteAce"</p>
            <p className="text-sm text-muted-foreground">
              Display attribution in footer
            </p>
          </div>
          <Switch
            checked={settings.showPoweredBy}
            onCheckedChange={(checked) => setSettings({ ...settings, showPoweredBy: checked })}
            disabled={!canFullCustomize}
          />
        </div>

        {/* Logo URL */}
        <div className="space-y-2">
          <Label>Logo URL</Label>
          <Input
            placeholder="https://yoursite.com/logo.png"
            value={settings.logoUrl}
            onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            Recommended size: 200x50px, PNG or SVG
          </p>
        </div>

        {/* Color Options */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Application Scope */}
        <div className="space-y-3">
          <Label>Apply White-Label To:</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: "applyToCustomerPortal", label: "Customer Portal", icon: Globe },
              { key: "applyToTracking", label: "Tracking Links", icon: Eye },
              { key: "applyToReports", label: "Reports", icon: FileText },
              { key: "applyToEmails", label: "Emails", icon: Mail },
              { key: "applyToInvoices", label: "Invoices", icon: Receipt },
            ].map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  settings[key as keyof WhiteLabelSettings]
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                onClick={() => setSettings({ ...settings, [key]: !settings[key as keyof WhiteLabelSettings] })}
              >
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">{label}</span>
                <Switch
                  checked={settings[key as keyof WhiteLabelSettings] as boolean}
                  onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })}
                  className="ml-auto"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="border border-border rounded-lg p-6 bg-secondary/30">
          <h4 className="text-sm font-medium mb-4">Preview</h4>
          <div className="flex items-center gap-3 mb-4">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
              <div 
                className="w-10 h-10 rounded flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: settings.primaryColor }}
              >
                {settings.brandName?.charAt(0) || "B"}
              </div>
            )}
            <div>
              <p className="font-bold text-lg" style={{ color: settings.primaryColor }}>
                {getPreviewName()}
              </p>
              {settings.showPoweredBy && (
                <p className="text-xs text-muted-foreground">Powered by RouteAce</p>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button size="sm" style={{ backgroundColor: settings.primaryColor }}>
              Track Shipment
            </Button>
            <Button size="sm" variant="outline" style={{ borderColor: settings.secondaryColor, color: settings.secondaryColor }}>
              View Invoice
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <Button onClick={saveSettings} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>

        {/* Cost Notice */}
        <p className="text-xs text-muted-foreground text-center">
          White-label branding costs ₦{rawTier === "enterprise" ? "10,000" : "5,000"}/month
        </p>
      </CardContent>
    </Card>
  );
};

export default WhiteLabelConfig;
