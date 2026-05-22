import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Headphones, Copy } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  customer_name: z.string().trim().min(2, "Name required").max(120),
  email: z.string().trim().email("Valid email required").max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(200),
  message: z.string().trim().min(10).max(5000),
  channel: z.enum(["phone", "whatsapp", "email", "instagram", "live_chat"]),
  tag: z.string(),
  order_id: z.string().trim().max(80).optional().or(z.literal("")),
});
const PUBLIC_ROUTEACE_ORIGIN = "https://routeace.app";

const isLovableOrLocalHost = (hostname: string) =>
  hostname.includes("id-preview--") ||
  hostname.endsWith(".lovable.app") ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "localhost";

const buildPublicSupportTrackUrl = (token: string) => `${PUBLIC_ROUTEACE_ORIGIN}/support/track/${token}`;

export default function PublicSupportSubmit() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [org, setOrg] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ ref: string; token: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    customer_name: "", email: "", phone: "", subject: "", message: "",
    channel: "live_chat" as const, tag: "complaint", order_id: "",
  });

  useEffect(() => {
    (async () => {
      if (!slug) return;
      if (isLovableOrLocalHost(window.location.hostname)) {
        const redirectUrl = `${PUBLIC_ROUTEACE_ORIGIN}/support/submit/${slug}`;
        console.log("[PublicSupportSubmit] Redirecting public intake off preview domain", {
          currentHost: window.location.hostname,
          currentOrigin: window.location.origin,
          redirectUrl,
        });
        window.location.replace(redirectUrl);
        return;
      }
      const { data } = await supabase.rpc("get_public_org_by_slug", { p_slug: slug });
      const row = Array.isArray(data) ? data[0] : data;
      setOrg(row ? { id: row.id, name: row.name } : null);
      setLoading(false);
    })();
  }, [slug]);

  async function submit() {
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({ title: "Please fix errors", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // Upload attachments first to public-intake/<org_id>/...
    const attachments: any[] = [];
    for (const file of files) {
      if (file.size > 20 * 1024 * 1024) continue;
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `public-intake/${org!.id}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${safe}`;
      const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, file);
      if (!upErr) {
        attachments.push({ storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size });
      }
    }

    const { data, error } = await supabase.rpc("submit_public_support_ticket", {
      p_org_slug: slug!,
      p_subject: form.subject,
      p_message: form.message,
      p_complainant_name: form.customer_name,
      p_complainant_email: form.email,
      p_complainant_phone: form.phone || null,
      p_channel: form.channel,
      p_tag: form.tag,
      p_order_id: form.order_id || null,
      p_attachments: attachments,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Could not submit", description: error.message, variant: "destructive" });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (row) setSubmitted({ ref: row.ticket_ref, token: row.public_token });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!org) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full"><CardHeader><CardTitle>Organization not found</CardTitle>
        <CardDescription>The link you followed is invalid or expired.</CardDescription></CardHeader></Card>
    </div>
  );

  if (submitted) {
    const url = buildPublicSupportTrackUrl(submitted.token);
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-2" />
            <CardTitle>Ticket received</CardTitle>
            <CardDescription>Reference <span className="font-mono">{submitted.ref}</span> - {org.name} support team will respond shortly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label>Save your private tracking link</Label>
            <div className="flex gap-2">
              <Input readOnly value={url} />
              <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(url); toast({ title: "Copied" }); }}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <Button asChild className="w-full"><Link to={`/support/track/${submitted.token}`}>Open Tracker</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <Card className="max-w-xl w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1"><Headphones className="w-5 h-5 text-primary" /><span className="text-sm text-muted-foreground">{org.name} · Support</span></div>
          <CardTitle>Submit a support request</CardTitle>
          <CardDescription>Fill in the details below. You'll receive a private tracking link to follow your ticket until resolved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Your name *</Label><Input maxLength={120} value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" maxLength={200} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Phone</Label><Input maxLength={40} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="space-y-1.5"><Label>Order / Dispatch ID</Label><Input maxLength={80} value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} /></div>
          </div>
          <div className="space-y-1.5"><Label>Subject *</Label><Input maxLength={200} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Preferred channel</Label>
              <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="live_chat">Live Chat</SelectItem><SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Issue type</Label>
              <Select value={form.tag} onValueChange={v => setForm(f => ({ ...f, tag: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="complaint">Complaint</SelectItem><SelectItem value="delay">Delay</SelectItem>
                  <SelectItem value="payment_issue">Payment Issue</SelectItem><SelectItem value="dispute">Dispute</SelectItem>
                  <SelectItem value="fraud_alert">Fraud Alert</SelectItem><SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Describe the issue *</Label>
            <Textarea rows={5} maxLength={5000} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            <p className="text-[10px] text-muted-foreground text-right">{form.message.length}/5000</p>
          </div>
          <div className="space-y-1.5">
            <Label>Attachments (optional, max 20MB each)</Label>
            <Input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv"
              onChange={e => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
            {files.length > 0 && (
              <ul className="text-[10px] text-muted-foreground space-y-0.5">
                {files.map((f, i) => <li key={i}>📎 {f.name} ({Math.round(f.size/1024)}KB)</li>)}
              </ul>
            )}
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit Ticket"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
