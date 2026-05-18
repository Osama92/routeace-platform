import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Package, Loader2, AlertCircle } from "lucide-react";

const PUBLIC_CUSTOMER_PORTAL_ORIGIN = "https://routeaceglyde.app";
const isPrivatePreviewHost = (h: string) =>
  h.includes("id-preview--") || h.endsWith(".lovable.app") || h.endsWith(".lovableproject.com");

export default function CustomerAcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Hard redirect off any private preview / lovable host onto the public
    // RouteAce domain BEFORE we even try to read the token. This guarantees
    // the customer never sees the preview access gate.
    if (typeof window !== "undefined" && token) {
      const host = window.location.hostname;
      if (isPrivatePreviewHost(host)) {
        const target = `${PUBLIC_CUSTOMER_PORTAL_ORIGIN}/customer-accept/${token}`;
        // eslint-disable-next-line no-console
        console.warn("[CustomerAcceptInvite] Private preview host detected - redirecting", { host, target });
        window.location.replace(target);
        return;
      }
    }
    const load = async () => {
      if (!token) { setError("Missing token"); setLoading(false); return; }
      // Always sign out any existing session so the invite link can ONLY be
      // used to enter the customer portal - never inherits an admin session.
      try { await supabase.auth.signOut(); } catch {}
      // eslint-disable-next-line no-console
      console.log("[CustomerAcceptInvite] Validating token", {
        host: window.location.hostname,
        origin: window.location.origin,
        redirectTarget: "/customer-portal",
      });
      const { data, error } = await supabase.rpc("get_customer_invite_by_token", { _token: token });
      if (error) { setError(error.message); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) { setError("This invite link is invalid."); setLoading(false); return; }
      if (row.used_at) { setError("This invite has already been used."); setLoading(false); return; }
      if (new Date(row.expires_at).getTime() < Date.now()) { setError("This invite has expired."); setLoading(false); return; }
      setInvite(row);
      setFullName(row.full_name || "");
      setLoading(false);
    };
    load();
  }, [token]);

  const submit = async () => {
    if (password.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("customer-invite-accept", {
      body: { token, password, full_name: fullName },
    });
    // Extract the real server-side error message (the SDK swallows it into error.context for non-2xx).
    let serverMessage: string | null = null;
    if (error) {
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          serverMessage = body?.error ?? null;
        } else if (ctx && typeof ctx.text === "function") {
          const txt = await ctx.text();
          try { serverMessage = JSON.parse(txt)?.error ?? txt; } catch { serverMessage = txt; }
        }
      } catch { /* ignore */ }
    }
    if (error || data?.error) {
      setSubmitting(false);
      const description = serverMessage ?? data?.error ?? error?.message ?? "Unknown error";
      console.error("[CustomerAcceptInvite] accept failed", { error, data, serverMessage });
      toast({ title: "Could not accept invite", description, variant: "destructive" });
      return;
    }
    // Sign them in with a fresh customer-only session.
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: data.email, password });
    setSubmitting(false);
    if (signInErr) {
      toast({ title: "Account created", description: "Please sign in with your new password." });
      navigate("/auth");
      return;
    }
    toast({ title: "Welcome!", description: "You're now signed in to your customer portal." });
    window.location.replace("/customer-portal");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><AlertCircle className="h-5 w-5" />Invite unavailable</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/")}>Back to home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">Customer Portal Invite</span>
          </div>
          <CardTitle>Set up your access</CardTitle>
          <CardDescription>
            For <span className="font-medium text-foreground">{invite.email}</span> - choose a password to view your shipments, invoices and rate deliveries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Your name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
          </div>
          <div>
            <Label>Confirm password</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
          <Button className="w-full" onClick={submit} disabled={submitting}>
            {submitting ? "Setting up…" : (<><CheckCircle className="h-4 w-4 mr-1" />Accept & enter portal</>)}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
