import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from "date-fns";
import { Star, CheckCircle2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  in_progress: "bg-primary/20 text-primary",
  escalated: "bg-destructive/20 text-destructive",
  resolved: "bg-green-500/20 text-green-700 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};
const PUBLIC_ROUTEACE_ORIGIN = "https://routeace.app";

const isLovableOrLocalHost = (hostname: string) =>
  hostname.includes("id-preview--") ||
  hostname.endsWith(".lovable.app") ||
  hostname.endsWith(".lovableproject.com") ||
  hostname === "localhost";

export default function PublicSupportTrack() {
  const { token } = useParams();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [csatComment, setCsatComment] = useState("");
  const [submittingCsat, setSubmittingCsat] = useState(false);

  async function load() {
    if (!token) return;
    const [{ data: s }, { data: m }] = await Promise.all([
      supabase.rpc("get_public_ticket_status", { p_token: token }),
      supabase.rpc("get_public_ticket_messages", { p_token: token }),
    ]);
    setStatus(Array.isArray(s) ? s[0] : s);
    setMessages(m || []);
    setLoading(false);
  }

  useEffect(() => {
    if (token && isLovableOrLocalHost(window.location.hostname)) {
      const redirectUrl = `${PUBLIC_ROUTEACE_ORIGIN}/support/track/${token}`;
      console.log("[PublicSupportTrack] Redirecting public tracker off preview domain", {
        currentHost: window.location.hostname,
        currentOrigin: window.location.origin,
        redirectUrl,
      });
      window.location.replace(redirectUrl);
      return;
    }
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [token]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    const { error } = await supabase.rpc("add_public_ticket_message", { p_token: token, p_message: reply });
    setSending(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setReply(""); load();
  }

  async function submitCsat() {
    if (rating < 1) { toast({ title: "Please pick a rating", variant: "destructive" }); return; }
    setSubmittingCsat(true);
    let ip: string | null = null;
    try {
      const r = await fetch("https://api.ipify.org?format=json");
      if (r.ok) ip = (await r.json()).ip ?? null;
    } catch { /* best-effort */ }
    const { error } = await supabase.rpc("submit_support_csat", {
      p_token: token, p_rating: rating, p_comment: csatComment || null,
      p_ip: ip, p_user_agent: navigator.userAgent.slice(0, 500),
    });
    setSubmittingCsat(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Thank you for your feedback!" });
    load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!status) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="max-w-md w-full"><CardHeader><CardTitle>Ticket not found</CardTitle>
        <CardDescription>Your tracking link is invalid or has expired.</CardDescription></CardHeader></Card>
    </div>
  );

  return (
    <div className="min-h-screen p-6 bg-background">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="font-mono text-base">{status.ref}</CardTitle>
              <CardDescription>{status.organization_name}</CardDescription>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[status.status]}`}>{status.status.replace("_", " ")}</span>
          </div>
          <p className="text-sm font-medium mt-3">{status.subject}</p>
          <p className="text-xs text-muted-foreground">Opened {format(new Date(status.created_at), "dd MMM yyyy HH:mm")}{status.resolved_at ? ` · Resolved ${format(new Date(status.resolved_at), "dd MMM HH:mm")}` : ""}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-[420px] overflow-y-auto border rounded p-3">
            {messages.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>}
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.sender === "customer" ? "items-end" : "items-start"}`}>
                <div className={`max-w-sm px-3 py-2 rounded-lg text-sm ${m.sender === "customer" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  {m.message}
                </div>
                <span className="text-[10px] text-muted-foreground">{m.sender === "customer" ? "You" : "Support"} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
          {!["resolved", "closed"].includes(status.status) && (
            <div className="space-y-2">
              <Textarea rows={3} maxLength={5000} placeholder="Add an update or reply…" value={reply} onChange={e => setReply(e.target.value)} />
              <Button onClick={send} disabled={!reply.trim() || sending} className="w-full">{sending ? "Sending…" : "Send Reply"}</Button>
            </div>
          )}

          {["resolved", "closed"].includes(status.status) && (
            status.csat != null ? (
              <div className="border rounded-lg p-4 bg-muted/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto" />
                <p className="text-sm font-medium">You rated this {status.csat_pct ?? Math.round((status.csat/5)*100)}%</p>
                <div className="flex justify-center gap-0.5">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-5 h-5 ${n <= status.csat ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Thank you for your feedback. This rating is final.</p>
              </div>
            ) : status.csat_link_expires_at && new Date(status.csat_link_expires_at) < new Date() ? (
              <div className="border rounded-lg p-4 bg-muted/30 text-center space-y-1">
                <p className="text-sm font-medium">Rating window closed</p>
                <p className="text-xs text-muted-foreground">The CSAT link for this ticket has expired.</p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="text-center">
                  <p className="text-sm font-medium">How was the support you received?</p>
                  <p className="text-xs text-muted-foreground">One-time rating · cannot be changed{status.csat_link_expires_at ? ` · expires ${format(new Date(status.csat_link_expires_at), "dd MMM yyyy")}` : ""}.</p>
                </div>
                <div className="flex justify-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" onClick={() => setRating(n)} className="p-1">
                      <Star className={`w-9 h-9 transition-colors ${n <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-center text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{Math.round((rating/5)*100)}%</span>
                  </p>
                )}
                <Textarea rows={2} maxLength={2000} placeholder="Optional comment…" value={csatComment} onChange={e => setCsatComment(e.target.value)} />
                <Button onClick={submitCsat} disabled={submittingCsat || rating < 1} className="w-full">
                  {submittingCsat ? "Submitting…" : "Submit Rating"}
                </Button>
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
