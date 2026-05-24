import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Settings as SettingsIcon,
  Mail,
  Map,
  FileText,
  Bell,
  Shield,
  Users,
  MessageSquare,
  Zap,
  ExternalLink,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  Upload,
  Image,
  Pen,
  Truck,
  Receipt,
  Wallet,
  BookOpen,
  FileCheck,
  Banknote,
  Wrench,
  BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import SubscriptionManager from "@/components/subscription/SubscriptionManager";


interface Integration {
  id: string;
  name: string;
  type: string;
  is_enabled: boolean | null;
  config: Record<string, any> | null;
  last_sync_at: string | null;
  organization_id: string | null;
  secrets_vault_id?: string | null;
}

const SettingsPage = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { toast } = useToast();
  const { hasAnyRole, user, isSuperAdmin, organizationId } = useAuth();
  const queryClient = useQueryClient();

  // Approval Workflow Manager state (super admin only)
  const { data: approvalPolicies = [] } = useQuery({
    queryKey: ["approval_policies", organizationId],
    enabled: !!organizationId && isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_policies")
        .select("*")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [editPolicyOpen, setEditPolicyOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [policyForm, setPolicyForm] = useState({
    approval_levels_required: "1",
    roles_allowed: [] as string[],
    requires_super_admin_override: false,
    auto_approve_if_below_threshold: false,
    min_amount_threshold: "",
  });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const getPolicy = (entityType: string) =>
    approvalPolicies.find((p: any) => p.entity_type === entityType) ?? null;

  const handleSavePolicy = async () => {
    if (!editingWorkflow || !organizationId) return;
    if (policyForm.roles_allowed.length === 0) {
      toast({ title: "Select at least one approver role", variant: "destructive" });
      return;
    }
    setSavingPolicy(true);
    try {
      const existing = getPolicy(editingWorkflow.entity_type);
      const payload = {
        approval_levels_required: Number(policyForm.approval_levels_required),
        roles_allowed: policyForm.roles_allowed,
        requires_super_admin_override: policyForm.requires_super_admin_override,
        auto_approve_if_below_threshold: policyForm.auto_approve_if_below_threshold,
        min_amount_threshold:
          policyForm.auto_approve_if_below_threshold && policyForm.min_amount_threshold
            ? Number(policyForm.min_amount_threshold)
            : null,
      };
      if (existing) {
        const { error } = await supabase
          .from("approval_policies")
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("approval_policies")
          .insert({
            organization_id: organizationId,
            entity_type: editingWorkflow.entity_type,
            ...payload,
          });
        if (error) throw error;
      }
      await queryClient.invalidateQueries({ queryKey: ["approval_policies", organizationId] });
      toast({ title: "Approval workflow saved" });
      setEditPolicyOpen(false);
    } catch (e: any) {
      toast({ title: "Failed to save", description: e.message, variant: "destructive" });
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleResetPolicy = async () => {
    if (!editingWorkflow) return;
    const existing = getPolicy(editingWorkflow.entity_type);
    if (!existing) return;
    setSavingPolicy(true);
    try {
      await supabase.from("approval_policies").delete().eq("id", existing.id);
      await queryClient.invalidateQueries({ queryKey: ["approval_policies", organizationId] });
      toast({ title: "Reset to platform defaults" });
      setEditPolicyOpen(false);
    } catch (e: any) {
      toast({ title: "Reset failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingPolicy(false);
    }
  };

  const WORKFLOWS = [
    { entity_type: "dispatch", label: "Dispatch Approval", description: "Who can approve a dispatch before it goes live", hasThreshold: false, icon: Truck },
    { entity_type: "expense", label: "Expense Approval", description: "Who can approve submitted expenses", hasThreshold: true, icon: Receipt },
    { entity_type: "invoice", label: "Invoice Approval", description: "Who can approve outgoing invoices", hasThreshold: true, icon: FileText },
    { entity_type: "payment", label: "Payment Approval", description: "Who can authorise outgoing payments", hasThreshold: true, icon: Banknote },
    { entity_type: "vendor_onboarding", label: "Vendor Onboarding", description: "Who can approve new vendor registrations", hasThreshold: false, icon: Users },
    { entity_type: "wallet_transfer", label: "Wallet Transfer", description: "Who can authorise wallet transfers", hasThreshold: true, icon: Wallet },
    { entity_type: "journal_entry", label: "Journal Entry", description: "Who can approve accounting journal entries", hasThreshold: false, icon: BookOpen },
    { entity_type: "credit_note", label: "Credit Note", description: "Who can approve issued credit notes", hasThreshold: false, icon: FileCheck },
    { entity_type: "rate_approval", label: "Rate Card", description: "Who can approve new or modified rate cards", hasThreshold: false, icon: BarChart3 },
    { entity_type: "payout", label: "Payout / Payroll", description: "Who can approve payout cycles", hasThreshold: false, icon: Banknote },
    { entity_type: "maintenance_work_order", label: "Maintenance Work Order", description: "Who can approve vehicle maintenance spend", hasThreshold: true, icon: Wrench },
    { entity_type: "tax_filing", label: "Tax Filing", description: "Who can authorise tax submissions", hasThreshold: false, icon: FileCheck },
  ];

  const LC_ROLES = [
    { value: "super_admin", label: "Super Admin" },
    { value: "org_admin", label: "Org Admin" },
    { value: "ops_manager", label: "Operations Manager" },
    { value: "finance_manager", label: "Finance Manager" },
    { value: "dispatcher", label: "Dispatcher" },
    { value: "support", label: "Support" },
  ];

  const { settings: companySettings, updateSettings: updateCompanySettings, uploadAndSaveSignature, uploadAndSaveLogo, loading: companyLoading, forceRefresh } = useCompanySettings();

  const signatureInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [signaturePreview, setSignaturePreview] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isAdmin = hasAnyRole(["admin", "super_admin", "org_admin"]);

  const [formData, setFormData] = useState({
    resend_api_key: "",
    erp_client_id: "",
    erp_client_secret: "",
    erp_organization_id: "",
    mapbox_token: "",
    google_maps_key: "",
    leadership_email: "",
    support_email: "",
    sla_sms_recipients: "",
  });

  const [companyFormData, setCompanyFormData] = useState({
    company_name: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
    bank_name: "",
    bank_account_name: "",
    bank_account_number: "",
  });

  // Update company form when settings load
  useEffect(() => {
    if (companySettings) {
      setCompanyFormData({
        company_name: companySettings.company_name || "",
        tagline: companySettings.tagline || "",
        email: companySettings.email || "",
        phone: companySettings.phone || "",
        address: companySettings.address || "",
        bank_name: companySettings.bank_name || "",
        bank_account_name: companySettings.bank_account_name || "",
        bank_account_number: companySettings.bank_account_number || "",
      });
      if (companySettings.signature_url) {
        setSignaturePreview(companySettings.signature_url);
      }
      if (companySettings.logo_url) {
        setLogoPreview(companySettings.logo_url);
      }
    }
  }, [companySettings]);

  const fetchIntegrations = async () => {
    try {
      if (!organizationId) {
        setIntegrations([]);
        return;
      }
      const { data, error } = await supabase
        .from("integrations")
        .select("*")
        .eq("organization_id", organizationId)
        .order("name");

      if (error) throw error;

      if (data) {
        const typedData = data.map(item => ({
          ...item,
          config: (item.config as Record<string, any>) || {},
          is_enabled: item.is_enabled ?? false,
        }));
        setIntegrations(typedData);

        const notif = typedData.find((i) => i.name === "notifications");
        const defaultLeadership =
          (notif?.config?.leadership_email as string | undefined) || user?.email || "";
        const defaultSupport = (notif?.config?.support_email as string | undefined) || "";
        setFormData((prev) => ({
          ...prev,
          leadership_email: defaultLeadership,
          support_email: defaultSupport,
        }));

        // Pre-fill non-secret form fields only. API keys / client secrets are now
        // encrypted in the Vault and are write-only from the UI (admin must re-enter to rotate).
        typedData.forEach((integration) => {
          if (integration.name === "zoho" || integration.name === "erp") {
            setFormData(prev => ({
              ...prev,
              erp_client_id: integration.config?.client_id || "",
              erp_organization_id: integration.config?.organization_id || "",
            }));
          }
          if (integration.name === "notifications") {
            setFormData(prev => ({
              ...prev,
              leadership_email: integration.config?.leadership_email || user?.email || "",
              support_email: integration.config?.support_email || "",
            }));
          }
          if (integration.name === "sms_notifications") {
            setFormData(prev => ({
              ...prev,
              sla_sms_recipients: integration.config?.sla_sms_recipients || "",
            }));
          }
        });
      }
    } catch (error: any) {
      console.error("Error fetching integrations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin && organizationId) {
      fetchIntegrations();
    } else if (!isAdmin) {
      setLoading(false);
    }
  }, [isAdmin, organizationId]);

  const handleSaveIntegration = async (type: string) => {
    setSaving(type);
    try {
      if (!organizationId) {
        toast({
          title: "No organization",
          description: "You must belong to an organization to save settings.",
          variant: "destructive",
        });
        setSaving(null);
        return;
      }

      // Split fields into non-secret config (stored on the row) and secrets (stored in Vault via RPC).
      let config: Record<string, any> = {};
      let secrets: Record<string, string> = {};
      let name = type;

      switch (type) {
        case "resend":
          if (formData.resend_api_key) secrets.api_key = formData.resend_api_key;
          break;
        case "zoho":
          config = {
            client_id: formData.erp_client_id,
            organization_id: formData.erp_organization_id,
          };
          if (formData.erp_client_secret) secrets.client_secret = formData.erp_client_secret;
          break;
        case "notifications":
          config = {
            leadership_email: formData.leadership_email,
            support_email: formData.support_email,
          };
          break;
        case "sms_notifications":
          config = {
            sla_sms_recipients: formData.sla_sms_recipients,
          };
          name = "sms_notifications";
          break;
        default:
          break;
      }

      const existingIntegration = integrations.find(
        (i) => i.name === name && i.organization_id === organizationId,
      );

      let integrationId: string | undefined = existingIntegration?.id;

      if (existingIntegration) {
        const { error } = await supabase
          .from("integrations")
          .update({ config, is_enabled: true, updated_at: new Date().toISOString() })
          .eq("id", existingIntegration.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("integrations")
          .insert({ name, type, config, is_enabled: true, organization_id: organizationId })
          .select("id")
          .single();
        if (error) throw error;
        integrationId = inserted?.id;
      }

      // Encrypt secrets in Vault (only if user entered any)
      if (integrationId && Object.keys(secrets).length > 0) {
        const { error: secErr } = await supabase.rpc("set_integration_secrets", {
          _integration_id: integrationId,
          _secrets: secrets,
        });
        if (secErr) throw secErr;
        // Clear secret form fields after successful write (write-only behaviour)
        setFormData(prev => ({ ...prev, resend_api_key: "", erp_client_secret: "" }));
      }

      toast({
        title: "Settings Saved",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} settings have been updated.`,
      });

      fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  };

  const handleToggleIntegration = async (integration: Integration) => {
    try {
      const { error } = await supabase
        .from("integrations")
        .update({ is_enabled: !integration.is_enabled })
        .eq("id", integration.id);

      if (error) throw error;

      toast({
        title: integration.is_enabled ? "Integration Disabled" : "Integration Enabled",
        description: `${integration.name} has been ${integration.is_enabled ? "disabled" : "enabled"}.`,
      });

      fetchIntegrations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to toggle integration",
        variant: "destructive",
      });
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout title="Settings" subtitle="Manage platform settings and integrations">
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="w-16 h-16 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
          <p className="text-muted-foreground text-center max-w-md">
            You don't have permission to access settings. Please contact an administrator.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Manage platform settings and integrations"
    >
      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="integrations">
            <Zap className="w-4 h-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="billing">
            <Building2 className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="general">
              <SettingsIcon className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
          )}
          {isSuperAdmin && (
            <TabsTrigger value="approvals">
              <Shield className="w-4 h-4 mr-2" />
              Approval Workflows
            </TabsTrigger>
          )}
        </TabsList>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <SubscriptionManager />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Zoho Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">ERP Integration</CardTitle>
                        <CardDescription>Sync invoices with your ERP (Zoho, SAP, Oracle, QuickBooks)</CardDescription>
                      </div>
                    </div>
                    {integrations.find(i => i.name === "zoho" || i.name === "erp")?.is_enabled && (
                      <Check className="w-5 h-5 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="erp_client_id">Client ID</Label>
                    <Input
                      id="erp_client_id"
                      value={formData.erp_client_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, erp_client_id: e.target.value }))}
                      placeholder="Enter ERP Client ID"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="erp_client_secret">Client Secret</Label>
                    <Input
                      id="erp_client_secret"
                      type="password"
                      value={formData.erp_client_secret}
                      onChange={(e) => setFormData(prev => ({ ...prev, erp_client_secret: e.target.value }))}
                      placeholder={integrations.find(i => i.name === "zoho")?.secrets_vault_id ? "•••••••• (encrypted in vault — enter to rotate)" : "Enter ERP Client Secret"}
                      className="bg-secondary/50"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">Stored encrypted via Supabase Vault. Leave blank to keep the current secret.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="erp_organization_id">Organization ID</Label>
                    <Input
                      id="erp_organization_id"
                      value={formData.erp_organization_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, erp_organization_id: e.target.value }))}
                      placeholder="Enter ERP Organization ID"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <a
                      href="https://accounts.zoho.com/developerconsole"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      Get API Keys <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      onClick={() => handleSaveIntegration("zoho")}
                      disabled={saving === "zoho"}
                    >
                      {saving === "zoho" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Save & Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Resend Email Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-info/20 flex items-center justify-center">
                        <Mail className="w-5 h-5 text-info" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Resend Email</CardTitle>
                        <CardDescription>Send delivery notifications</CardDescription>
                      </div>
                    </div>
                    {integrations.find(i => i.name === "resend")?.is_enabled && (
                      <Check className="w-5 h-5 text-success" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resend_api_key">API Key</Label>
                    <Input
                      id="resend_api_key"
                      type="password"
                      value={formData.resend_api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, resend_api_key: e.target.value }))}
                      placeholder={integrations.find(i => i.name === "resend")?.is_enabled ? "•••••••• (encrypted in vault — enter to rotate)" : "re_xxxxxxxxxx"}
                      className="bg-secondary/50"
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">Stored encrypted via Supabase Vault. Leave blank to keep the current key.</p>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <a
                      href="https://resend.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      onClick={() => handleSaveIntegration("resend")}
                      disabled={saving === "resend"}
                    >
                      {saving === "resend" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Save & Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Maps placeholder - for future use */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass-card">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                      <Map className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Google Maps / Routes</CardTitle>
                      <CardDescription>Route optimization & tracking</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="google_maps_key">Google Maps API Key</Label>
                    <Input
                      id="google_maps_key"
                      type="password"
                      value={formData.google_maps_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, google_maps_key: e.target.value }))}
                      placeholder="AIza..."
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      Get API Key <ExternalLink className="w-3 h-3" />
                    </a>
                    <Button
                      onClick={() => handleSaveIntegration("google_maps")}
                      disabled={saving === "google_maps"}
                    >
                      {saving === "google_maps" ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : null}
                      Save & Connect
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Email Notification Settings</CardTitle>
                <CardDescription>
                  Configure where delivery status updates are sent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                  These emails are specific to your organization. Update them now so your clients see <strong>your</strong> support address on every dispatch update — not the platform default.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="leadership_email">Leadership Email</Label>
                    <Input
                      id="leadership_email"
                      type="email"
                      value={formData.leadership_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, leadership_email: e.target.value }))}
                      placeholder="leadership@company.com"
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Receives all delivery status updates
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="support_email">Support Team Email</Label>
                    <Input
                      id="support_email"
                      type="email"
                      value={formData.support_email}
                      onChange={(e) => setFormData(prev => ({ ...prev, support_email: e.target.value }))}
                      placeholder="support@company.com"
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Receives customer support-related updates
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleSaveIntegration("notifications")}
                  disabled={saving === "notifications"}
                >
                  {saving === "notifications" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Notification Events</CardTitle>
                <CardDescription>
                  Choose which events trigger email notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { id: "dispatch_created", label: "New Dispatch Created", description: "When a new delivery is dispatched" },
                  { id: "pickup_started", label: "Pickup Started", description: "When driver starts pickup" },
                  { id: "in_transit", label: "In Transit", description: "When package is in transit" },
                  { id: "delivered", label: "Delivered", description: "When package is delivered" },
                  { id: "document_expiry", label: "Document Expiry Alerts", description: "7 days before document expires" },
                ].map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium text-foreground">{event.label}</p>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* SMS Notifications Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">SMS Notifications</CardTitle>
                    <CardDescription>Configure SMS alerts for critical events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sla_sms_recipients">SLA Breach SMS Recipients</Label>
                  <Input
                    id="sla_sms_recipients"
                    value={formData.sla_sms_recipients}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      sla_sms_recipients: e.target.value 
                    }))}
                    placeholder="+2348012345678, +2349012345678"
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated phone numbers in international format (+234...)
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    SMS notifications will be sent via Africa's Talking when SLA breaches are detected.
                    Standard SMS rates apply.
                  </p>
                </div>
                <Button 
                  onClick={() => handleSaveIntegration("sms_notifications")}
                  disabled={saving === "sms_notifications"}
                >
                  {saving === "sms_notifications" ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : null}
                  Save SMS Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="general" className="space-y-6">
          {/* Company Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Company Profile</CardTitle>
                    <CardDescription>Configure your company details for invoices and payslips</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company_name">Company Name *</Label>
                    <Input
                      id="company_name"
                      value={companyFormData.company_name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, company_name: e.target.value }))}
                      placeholder="Enter company name"
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      This will appear on all invoices and payslips
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input
                      id="tagline"
                      value={companyFormData.tagline}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, tagline: e.target.value }))}
                      placeholder="e.g. Professional Logistics Solutions"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">Email</Label>
                    <Input
                      id="company_email"
                      type="email"
                      value={companyFormData.email}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="accounts@company.com"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Phone</Label>
                    <Input
                      id="company_phone"
                      value={companyFormData.phone}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+234 XXX XXX XXXX"
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company_address">Address</Label>
                  <Textarea
                    id="company_address"
                    value={companyFormData.address}
                    onChange={(e) => setCompanyFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter full company address"
                    className="bg-secondary/50"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Bank Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Bank Account Details</CardTitle>
                <CardDescription>Payment information displayed on invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={companyFormData.bank_name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, bank_name: e.target.value }))}
                      placeholder="e.g. First Bank of Nigeria"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_name">Account Name</Label>
                    <Input
                      id="bank_account_name"
                      value={companyFormData.bank_account_name}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, bank_account_name: e.target.value }))}
                      placeholder="Company Name Ltd"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account_number">Account Number</Label>
                    <Input
                      id="bank_account_number"
                      value={companyFormData.bank_account_number}
                      onChange={(e) => setCompanyFormData(prev => ({ ...prev, bank_account_number: e.target.value }))}
                      placeholder="0123456789"
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Signature & Logo Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Signature & Logo</CardTitle>
                <CardDescription>Upload signature and logo for invoices</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Signature Upload */}
                  <div className="space-y-3">
                    <Label>Authorized Signature</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => signatureInputRef.current?.click()}
                    >
                      {signaturePreview ? (
                        <div className="space-y-2">
                          <img 
                            src={signaturePreview} 
                            alt="Signature" 
                            className="max-h-20 mx-auto object-contain"
                          />
                          <p className="text-xs text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Pen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Upload signature image</p>
                          <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Please upload an image under 2MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setUploadingSignature(true);
                          const url = await uploadAndSaveSignature(file);
                          if (url) {
                            setSignaturePreview(url);
                          }
                          setUploadingSignature(false);
                        }
                      }}
                    />
                    {uploadingSignature && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <Label>Company Logo</Label>
                    <div 
                      className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {logoPreview ? (
                        <div className="space-y-2">
                          <img 
                            src={logoPreview} 
                            alt="Logo" 
                            className="max-h-20 mx-auto object-contain"
                          />
                          <p className="text-xs text-muted-foreground">Click to change</p>
                        </div>
                      ) : (
                        <div className="py-4">
                          <Image className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">Upload company logo</p>
                          <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 2 * 1024 * 1024) {
                            toast({
                              title: "File too large",
                              description: "Please upload an image under 2MB",
                              variant: "destructive",
                            });
                            return;
                          }
                          setUploadingLogo(true);
                          const url = await uploadAndSaveLogo(file);
                          if (url) {
                            setLogoPreview(url);
                          }
                          setUploadingLogo(false);
                        }
                      }}
                    />
                    {uploadingLogo && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              onClick={async () => {
                setSaving("company");
                const result = await updateCompanySettings(companyFormData);
                // Only update local state if save succeeded - result contains saved record
                if (result) {
                  setCompanyFormData({
                    company_name: result.company_name || "",
                    tagline: result.tagline || "",
                    email: result.email || "",
                    phone: result.phone || "",
                    address: result.address || "",
                    bank_name: result.bank_name || "",
                    bank_account_name: result.bank_account_name || "",
                    bank_account_number: result.bank_account_number || "",
                  });
                  if (result.signature_url) setSignaturePreview(result.signature_url);
                  if (result.logo_url) setLogoPreview(result.logo_url);
                }
                setSaving(null);
              }}
              disabled={saving === "company"}
              size="lg"
            >
              {saving === "company" ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Save Company Settings
            </Button>
          </div>
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="approvals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Approval Workflow Settings
                </CardTitle>
                <CardDescription>
                  Configure who can approve each workflow type in your organisation. These settings apply only to your organisation.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORKFLOWS.map((wf) => {
                  const policy = getPolicy(wf.entity_type);
                  const roles: string[] =
                    (policy?.roles_allowed as string[] | undefined) ?? ["super_admin", "org_admin"];
                  const levels = policy?.approval_levels_required ?? 1;
                  const isCustom = !!policy;
                  const Icon = wf.icon;
                  return (
                    <div
                      key={wf.entity_type}
                      className="rounded-lg border border-border bg-secondary/30 p-4 flex flex-col gap-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{wf.label}</span>
                              {!isCustom && (
                                <Badge variant="outline" className="text-[10px]">
                                  Platform default
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {wf.description}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="text-[10px]">
                          {levels === 1 ? "Single approver" : "Two-level approval"}
                        </Badge>
                        {roles.map((r) => (
                          <Badge key={r} variant="outline" className="text-[10px] capitalize">
                            {r.replace(/_/g, " ")}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-start"
                        onClick={() => {
                          setEditingWorkflow(wf);
                          setPolicyForm({
                            approval_levels_required: String(levels),
                            roles_allowed: [...roles],
                            requires_super_admin_override:
                              policy?.requires_super_admin_override ?? false,
                            auto_approve_if_below_threshold:
                              policy?.auto_approve_if_below_threshold ?? false,
                            min_amount_threshold: policy?.min_amount_threshold
                              ? String(policy.min_amount_threshold)
                              : "",
                          });
                          setEditPolicyOpen(true);
                        }}
                      >
                        Configure
                      </Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Edit Approval Policy Dialog */}
      <Dialog open={editPolicyOpen} onOpenChange={setEditPolicyOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure: {editingWorkflow?.label}</DialogTitle>
            <DialogDescription>
              {editingWorkflow?.description}. Settings apply to your organisation only.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Approval levels */}
            <div className="space-y-2">
              <Label>Approval Levels</Label>
              <Select
                value={policyForm.approval_levels_required}
                onValueChange={(v) =>
                  setPolicyForm((p) => ({ ...p, approval_levels_required: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Single Approver - one person approves</SelectItem>
                  <SelectItem value="2">Two-Level - two approvals required in sequence</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Approver roles */}
            <div className="space-y-2">
              <Label>Approver Roles</Label>
              <p className="text-xs text-muted-foreground">
                Users with these roles can approve this workflow. At least one is required.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {LC_ROLES.map((role) => (
                  <label
                    key={role.value}
                    className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border/60 px-3 py-2 hover:bg-secondary/40"
                  >
                    <Checkbox
                      checked={policyForm.roles_allowed.includes(role.value)}
                      onCheckedChange={(checked) => {
                        setPolicyForm((p) => ({
                          ...p,
                          roles_allowed: checked
                            ? [...p.roles_allowed, role.value]
                            : p.roles_allowed.filter((r) => r !== role.value),
                        }));
                      }}
                    />
                    <span>{role.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Super admin override */}
            <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 px-3 py-2">
              <div>
                <Label className="text-sm">Super Admin Override</Label>
                <p className="text-xs text-muted-foreground">
                  Super admin can always approve regardless of assigned roles
                </p>
              </div>
              <Switch
                checked={policyForm.requires_super_admin_override}
                onCheckedChange={(v) =>
                  setPolicyForm((p) => ({ ...p, requires_super_admin_override: v }))
                }
              />
            </div>

            {/* Auto-approve threshold */}
            {editingWorkflow?.hasThreshold && (
              <div className="space-y-2 rounded-md border border-border/60 px-3 py-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Label className="text-sm">Auto-Approve Threshold</Label>
                    <p className="text-xs text-muted-foreground">
                      Transactions below this amount are auto-approved
                    </p>
                  </div>
                  <Switch
                    checked={policyForm.auto_approve_if_below_threshold}
                    onCheckedChange={(v) =>
                      setPolicyForm((p) => ({ ...p, auto_approve_if_below_threshold: v }))
                    }
                  />
                </div>
                {policyForm.auto_approve_if_below_threshold && (
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={policyForm.min_amount_threshold}
                    onChange={(e) =>
                      setPolicyForm((p) => ({ ...p, min_amount_threshold: e.target.value }))
                    }
                    className="bg-secondary/50"
                  />
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between gap-2">
            <Button
              variant="ghost"
              onClick={handleResetPolicy}
              disabled={savingPolicy || !getPolicy(editingWorkflow?.entity_type)}
            >
              Reset to Default
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditPolicyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePolicy} disabled={savingPolicy}>
                {savingPolicy ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SettingsPage;