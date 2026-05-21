import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Mail, Copy, Send, Link2 } from "lucide-react";

interface Props {
  customerId: string;
  customerEmail: string;
  customerName: string;
  trigger?: React.ReactNode;
}

const ALLOWED = ["super_admin", "org_admin", "admin", "ops_manager", "support"];
const PUBLIC_CUSTOMER_PORTAL_ORIGIN = "https://routeace.app";

const isLovableOrLocalHost = (hostname: string) =>
  hostname.includes("id-preview--") ||
  hostname.endsWith(".lovable.app") ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "localhost";

const getCustomerPortalOrigin = () => {
  // Customer invite links must always be public/customer-safe. Never generate
  // links from Lovable preview, editor, local, or staging domains.
  return PUBLIC_CUSTOMER_PORTAL_ORIGIN;
};

export default function CustomerInviteDialog({ customerId, customerEmail, customerName, trigger }: Props) {
  const { user, organizationId, hasAnyRole, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(customerEmail);
  const [fullName, setFullName] = useState(customerName);
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  if (!isSuperAdmin && !hasAnyRole(ALLOWED as any)) return null;

  const generate = async (mode: "new" | "regenerate" = "new") => {
    if (!user || !organizationId) {
      toast({ title: "Error", description: "Missing org context", variant: "destructive" });
      return;
    }
    if (!email.trim()) {
      toast({ title: "Email required", variant: "destructive" });
      return;
    }
    setBusy(true);
    // Invalidate any outstanding unused tokens for this customer when regenerating
    // so old preview-domain links cannot be used.
    if (mode === "regenerate") {
      const { error: expErr } = await supabase
        .from("customer_invite_tokens")
        .update({ expires_at: new Date(Date.now() - 1000).toISOString() })
        .eq("customer_id", customerId)
        .is("used_at", null);
      if (expErr) {
        // eslint-disable-next-line no-console
        console.warn("[CustomerInviteDialog] Failed to invalidate old tokens", expErr);
      }
    }
    const { data, error } = await supabase
      .from("customer_invite_tokens")
      .insert({
        organization_id: organizationId,
        customer_id: customerId,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
        created_by: user.id,
      })
      .select("token")
      .single();
    setBusy(false);
    if (error || !data) {
      toast({ title: "Failed to create invite", description: error?.message, variant: "destructive" });
      return;
    }
    const origin = getCustomerPortalOrigin();
    const url = `${origin}/customer-accept/${data.token}`;
    // eslint-disable-next-line no-console
    console.log("[CustomerInviteDialog] Invite link generated", {
      currentHost: window.location.hostname,
      currentOrigin: window.location.origin,
      linkOrigin: origin,
      redirectTarget: `${origin}/customer-portal`,
      mode,
    });
    setLink(url);
    toast({
      title: mode === "regenerate" ? "Invite link regenerated" : "Invite link generated",
      description: mode === "regenerate"
        ? "Old links have been revoked. Share the new link below."
        : "Copy and send to your customer.",
    });
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    toast({ title: "Copied to clipboard" });
  };

  const sendEmail = async () => {
    if (!link) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "customer-portal-invite",
        recipientEmail: email,
        idempotencyKey: `customer-invite-${customerId}-${link.split("/").pop()}`,
        templateData: {
          name: fullName || null,
          inviteUrl: link,
          inviterName: (user as any)?.user_metadata?.full_name || null,
        },
      },
    });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Could not send invite email",
        description: (error as any)?.message || (data as any)?.error || "Please copy the link and share it directly.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Invite emailed", description: `Sent to ${email}` });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setLink(null); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Link2 className="h-3 w-3 mr-1" />Invite to Portal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Customer to Portal</DialogTitle>
          <DialogDescription>
            Generates a one-time link scoped to your organization. The customer can sign in to track shipments, view invoices and rate deliveries.
          </DialogDescription>
        </DialogHeader>
        {(() => {
          const detectedOrigin = typeof window !== "undefined" ? getCustomerPortalOrigin() : PUBLIC_CUSTOMER_PORTAL_ORIGIN;
          const currentHost = typeof window !== "undefined" ? window.location.hostname : "";
          const isPreview = isLovableOrLocalHost(currentHost);
          return (
            <div className="rounded-md border bg-muted/30 p-2 text-[11px] space-y-0.5">
              <div><span className="text-muted-foreground">Current host:</span> <span className="font-mono">{currentHost}</span>{isPreview && <span className="ml-1 text-amber-600">(preview)</span>}</div>
              <div><span className="text-muted-foreground">Link will use origin:</span> <span className="font-mono">{detectedOrigin}</span></div>
              <div><span className="text-muted-foreground">Redirect target after sign-in:</span> <span className="font-mono">{detectedOrigin}/customer-portal</span></div>
            </div>
          );
        })()}
        {!link ? (
          <div className="space-y-3">
            <div>
              <Label>Customer Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
            <div>
              <Label>Customer Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
              <Button variant="outline" onClick={() => generate("regenerate")} disabled={busy}>
                Regenerate (revoke old links)
              </Button>
              <Button onClick={() => generate("new")} disabled={busy}>
                {busy ? "Generating…" : "Generate Invite Link"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-2 text-xs break-all font-mono">{link}</div>
            <p className="text-xs text-muted-foreground">Single-use link. Expires in 14 days.</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={copy} className="flex-1"><Copy className="h-3 w-3 mr-1" />Copy</Button>
              <Button onClick={sendEmail} disabled={busy} className="flex-1"><Mail className="h-3 w-3 mr-1" />{busy ? "Sending…" : "Email Invite"}</Button>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={() => generate("regenerate")} disabled={busy}>
              Regenerate link (revokes this one)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
