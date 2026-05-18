import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Mail, Send, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type TemplateKey =
  | "delay-alert"
  | "pickup-confirmation"
  | "delivery-proof"
  | "payment-advice"
  | "collections-reminder";

type LanguageCode = "en" | "fr" | "sw";
const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "sw", label: "Kiswahili" },
];

interface TemplateMeta {
  key: TemplateKey;
  title: string;
  description: string;
  defaultBrand: string;
  trigger: string;
}

const TEMPLATES: TemplateMeta[] = [
  {
    key: "delay-alert",
    title: "Delay alert",
    description: "Sent to customers when a dispatch's SLA is at risk or breached.",
    defaultBrand: "#dc2626",
    trigger: "Auto-sent on SLA status change (at_risk / breached)",
  },
  {
    key: "pickup-confirmation",
    title: "Pickup confirmation",
    description: "Sent to customers as soon as cargo is picked up.",
    defaultBrand: "#16a34a",
    trigger: "Auto-sent when dispatch status changes to picked_up",
  },
  {
    key: "delivery-proof",
    title: "Delivery proof (POD)",
    description: "Sent to customers with proof of delivery once the dispatch is completed.",
    defaultBrand: "#0284c7",
    trigger: "Auto-sent on proof of delivery confirmation",
  },
  {
    key: "payment-advice",
    title: "Payment advice",
    description: "Sent to customers as a receipt when an invoice is marked paid.",
    defaultBrand: "#0f172a",
    trigger: "Auto-sent when invoice status changes to paid",
  },
  {
    key: "collections-reminder",
    title: "Collections reminder",
    description: "Sent (email + SMS) to clients when an invoice is older than 10 days.",
    defaultBrand: "#b91c1c",
    trigger: "Auto-sent daily by the collections engine for invoices overdue 10+ days",
  },
];

interface ConfigRow {
  id?: string;
  organization_id: string;
  template_key: TemplateKey;
  language: LanguageCode;
  enabled: boolean;
  subject_override: string | null;
  intro_text: string | null;
  outro_text: string | null;
  sms_template: string | null;
  brand_color: string | null;
  logo_url: string | null;
  support_email: string | null;
}

function emptyConfig(orgId: string, key: TemplateKey, language: LanguageCode): ConfigRow {
  return {
    organization_id: orgId,
    template_key: key,
    language,
    enabled: true,
    subject_override: "",
    intro_text: "",
    outro_text: "",
    sms_template: "",
    brand_color: "",
    logo_url: "",
    support_email: "",
  };
}

function TemplateEditor({ meta, orgId }: { meta: TemplateMeta; orgId: string }) {
  const qc = useQueryClient();
  const [language, setLanguage] = useState<LanguageCode>("en");
  const [draft, setDraft] = useState<ConfigRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["email-tpl-config", orgId, meta.key, language],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_template_configs")
        .select("*")
        .eq("organization_id", orgId)
        .eq("template_key", meta.key)
        .eq("language", language)
        .maybeSingle();
      if (error) throw error;
      return (data as ConfigRow) ?? emptyConfig(orgId, meta.key, language);
    },
  });

  useEffect(() => { if (data) setDraft(data); }, [data]);

  const onSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        organization_id: orgId,
        template_key: meta.key,
        language,
        enabled: draft.enabled,
        subject_override: draft.subject_override?.trim() || null,
        intro_text: draft.intro_text?.trim() || null,
        outro_text: draft.outro_text?.trim() || null,
        sms_template: draft.sms_template?.trim() || null,
        brand_color: draft.brand_color?.trim() || null,
        logo_url: draft.logo_url?.trim() || null,
        support_email: draft.support_email?.trim() || null,
      };
      const { error } = await supabase
        .from("email_template_configs")
        .upsert(payload, { onConflict: "organization_id,template_key,language" });
      if (error) throw error;
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["email-tpl-config", orgId, meta.key] });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const { user } = useAuth();
  const sendTest = async () => {
    if (!user?.email) { toast.error("No email on file for your account"); return; }
    setSendingTest(true);
    try {
      const { error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: meta.key,
          recipientEmail: user.email,
          organizationId: orgId,
          idempotencyKey: `test-${meta.key}-${Date.now()}`,
          templateData: {},
        },
      });
      if (error) throw error;
      toast.success(`Test email sent to ${user.email}`);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send test");
    } finally {
      setSendingTest(false);
    }
  };

  const loadPreview = async () => {
    setLoadingPreview(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("preview-transactional-email", {
        body: { templateName: meta.key, organizationId: orgId },
      });
      if (error) throw error;
      setPreviewHtml((res as any)?.html ?? null);
    } catch (e: any) {
      toast.error(e.message ?? "Preview unavailable");
    } finally {
      setLoadingPreview(false);
    }
  };

  if (isLoading || !draft) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">{meta.title}</CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <select
                aria-label="Language"
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
              <div className="flex items-center gap-2">
                <Label htmlFor={`enabled-${meta.key}`} className="text-sm">Enabled</Label>
                <Switch
                  id={`enabled-${meta.key}`}
                  checked={draft.enabled}
                  onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
                />
              </div>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit mt-2 text-[11px]">{meta.trigger}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Subject line override</Label>
            <Input
              placeholder="Leave blank to use default"
              value={draft.subject_override ?? ""}
              onChange={(e) => setDraft({ ...draft, subject_override: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Intro paragraph</Label>
            <Textarea
              rows={2}
              placeholder="Optional opening text customers will see"
              value={draft.intro_text ?? ""}
              onChange={(e) => setDraft({ ...draft, intro_text: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>Outro paragraph</Label>
            <Textarea
              rows={2}
              placeholder="Optional closing text"
              value={draft.outro_text ?? ""}
              onChange={(e) => setDraft({ ...draft, outro_text: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label>SMS template <span className="text-xs text-muted-foreground">(supports {`{{customer_name}}, {{invoice_number}}, {{amount}}, {{days_overdue}}`})</span></Label>
            <Textarea
              rows={3}
              placeholder="Hi {{customer_name}}, invoice {{invoice_number}} for {{amount}} is {{days_overdue}} days overdue. Please settle. Thank you."
              value={draft.sms_template ?? ""}
              onChange={(e) => setDraft({ ...draft, sms_template: e.target.value })}
            />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Brand color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  className="w-14 h-10 p-1"
                  value={draft.brand_color || meta.defaultBrand}
                  onChange={(e) => setDraft({ ...draft, brand_color: e.target.value })}
                />
                <Input
                  placeholder={meta.defaultBrand}
                  value={draft.brand_color ?? ""}
                  onChange={(e) => setDraft({ ...draft, brand_color: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Support email</Label>
              <Input
                type="email"
                placeholder="support@yourcompany.com"
                value={draft.support_email ?? ""}
                onChange={(e) => setDraft({ ...draft, support_email: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Logo URL</Label>
            <Input
              type="url"
              placeholder="https://…/logo.png"
              value={draft.logo_url ?? ""}
              onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={onSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save changes
            </Button>
            <Button variant="outline" onClick={sendTest} disabled={sendingTest}>
              {sendingTest ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send test to me
            </Button>
            <Button variant="ghost" onClick={loadPreview} disabled={loadingPreview}>
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              Refresh preview
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Live preview</CardTitle>
          <CardDescription>Renders with your current overrides applied.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {previewHtml ? (
            <iframe
              title={`${meta.key} preview`}
              srcDoc={previewHtml}
              className="w-full h-[640px] border-0 bg-white"
            />
          ) : (
            <div className="h-[640px] flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
              Click "Refresh preview" to render this template with the saved settings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmailTemplatesSettings() {
  const { organizationId, hasAnyRole } = useAuth();
  const canEdit = hasAnyRole?.(["admin", "super_admin", "org_admin", "ops_manager", "finance_manager"]) ?? false;
  const [active, setActive] = useState<TemplateKey>("delay-alert");

  if (!organizationId) {
    return (
      <div className="container py-10">
        <p className="text-sm text-muted-foreground">No organization context found.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Helmet>
        <title>Email notifications · Settings</title>
        <meta name="description" content="Configure branded transactional email templates for delay alerts, pickup confirmations, delivery proofs, and payment advice." />
      </Helmet>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Email notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize the branded emails RouteAce sends to your customers. Overrides apply to every send from this organization.
        </p>
      </div>

      {!canEdit && (
        <Card className="bg-muted/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            You can preview these settings, but only admins, owners, ops managers, or finance managers can edit them.
          </CardContent>
        </Card>
      )}

      <Tabs value={active} onValueChange={(v) => setActive(v as TemplateKey)}>
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          {TEMPLATES.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.title}</TabsTrigger>
          ))}
        </TabsList>
        {TEMPLATES.map((t) => (
          <TabsContent key={t.key} value={t.key} className="mt-6">
            <fieldset disabled={!canEdit} className={!canEdit ? "opacity-90 pointer-events-none" : ""}>
              <TemplateEditor meta={t} orgId={organizationId} />
            </fieldset>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
