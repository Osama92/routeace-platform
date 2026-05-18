import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ZazaMessage } from "@/components/dept/ZazaMessage";
import { buildZazaOrgContext } from "@/lib/zaza/buildOrgContext";
import type { ZazaNavItem } from "@/lib/zaza/ldNavigationCatalog";

type Msg = { role: "user" | "assistant"; content: string };

export interface ZazaChatPageProps {
  /** Tenant scope label sent to the AI. Strictly partitions guidance. */
  scope: "LD" | "LC";
  /** Page title. */
  title: string;
  /** Subtitle below the title. */
  subtitle: string;
  /** Card header text inside the chat. */
  cardTitle: string;
  /** First assistant greeting. */
  greeting: string;
  /** Allowed nav items for the current user, scoped to this workspace. */
  catalogForRole: (role: string | null | undefined) => ZazaNavItem[];
  /** Placeholder inside the input. */
  placeholder?: string;
}

/**
 * Shared Zaza chat shell used by both the LD (Logistics Department) page and
 * the LC (Logistics Company) page. Each caller provides its own navigation
 * catalog and scope so cross-workspace data never leaks: the AI is told to
 * only ever suggest paths from the supplied catalog, and the renderer drops
 * any link not in the allowlist.
 */
export default function ZazaChatPage({
  scope,
  title,
  subtitle,
  cardTitle,
  greeting,
  catalogForRole,
  placeholder = "Ask anything…",
}: ZazaChatPageProps) {
  const navigate = useNavigate();
  const { organizationId, userRole } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const navCatalog = useMemo(() => catalogForRole(userRole), [catalogForRole, userRole]);
  const allowedPaths = useMemo(() => navCatalog.map((n) => n.path), [navCatalog]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const liveContext = organizationId
        ? await buildZazaOrgContext({ organizationId, role: userRole }).catch(() => "Live context unavailable.")
        : "No organization context available.";
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) {
        toast.error("Please sign in again to use Zaza.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("dept-ai-advisor", {
        body: {
          messages: next,
          context: liveContext,
          userRole,
          scope,
          navigationCatalog: navCatalog,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) throw error;
      setMessages([...next, { role: "assistant", content: data?.reply ?? "(no reply)" }]);
    } catch (e: any) {
      toast.error(e.message ?? "Advisor failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout title={title} subtitle={subtitle}>
      <div className="space-y-4 max-w-4xl">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Zaza
          </h1>
        </div>
        <Card className="h-[calc(100vh-220px)] flex flex-col">
          <CardHeader><CardTitle className="text-base">{cardTitle}</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                  m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted"
                }`}>
                  {m.role === "assistant"
                    ? <ZazaMessage text={m.content} allowedPaths={allowedPaths} />
                    : m.content}
                </div>
              </div>
            ))}
            {loading && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Thinking…</div>}
            <div ref={endRef} />
          </CardContent>
          <div className="p-3 border-t flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={placeholder}
              className="min-h-[60px]"
            />
            <Button onClick={send} disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
