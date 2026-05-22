import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ZazaMessage } from "@/components/dept/ZazaMessage";
import { buildZazaOrgContext } from "@/lib/zaza/buildOrgContext";
import type { ZazaNavItem } from "@/lib/zaza/ldNavigationCatalog";

type Msg = { role: "user" | "assistant"; content: string };

export interface ZazaChatPageProps {
  scope: "LD" | "LC";
  title: string;
  subtitle: string;
  cardTitle: string;
  greeting: string;
  catalogForRole: (role: string | null | undefined) => ZazaNavItem[];
  placeholder?: string;
}

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
  const { organizationId, userRole, user } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: greeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [conversationId] = useState(() => crypto.randomUUID());
  const endRef = useRef<HTMLDivElement>(null);
  const navCatalog = useMemo(() => catalogForRole(userRole), [catalogForRole, userRole]);
  const allowedPaths = useMemo(() => navCatalog.map((n) => n.path), [navCatalog]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Load recent conversation history on mount
  useEffect(() => {
    if (!user?.id) { setHistoryLoading(false); return; }
    const loadHistory = async () => {
      try {
        const query = supabase
          .from("zaza_conversations" as any)
          .select("role, content, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40);

        const { data, error } = organizationId
          ? await (query as any).eq("organization_id", organizationId)
          : await query;

        if (error || !data?.length) return;

        const history: Msg[] = (data as any[])
          .reverse()
          .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));

        setMessages([{ role: "assistant", content: greeting }, ...history]);
      } catch {
        // History load failure is silent — chat still works
      } finally {
        setHistoryLoading(false);
      }
    };
    loadHistory();
  }, [user?.id, organizationId, greeting]);

  const clearHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      await (supabase as any)
        .from("zaza_conversations")
        .delete()
        .eq("user_id", user.id);
      setMessages([{ role: "assistant", content: greeting }]);
      toast.success("Conversation history cleared");
    } catch {
      toast.error("Failed to clear history");
    }
  }, [user?.id, greeting]);

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
          messages: next.filter((m) => m.role === "user" || m.role === "assistant"),
          context: liveContext,
          userRole,
          scope,
          navigationCatalog: navCatalog,
          organizationId,
          conversationId,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error) {
        if (error.message?.includes("402") || data?.error?.includes("credits")) {
          toast.error("You've run out of AI credits. Upgrade your plan to continue.");
        } else {
          throw error;
        }
        return;
      }
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> Zaza
            </h1>
          </div>
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-1" /> Clear history
          </Button>
        </div>
        <Card className="h-[calc(100vh-220px)] flex flex-col">
          <CardHeader><CardTitle className="text-base">{cardTitle}</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {historyLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm pt-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading conversation history…
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                    m.role === "user" ? "bg-primary text-primary-foreground whitespace-pre-wrap" : "bg-muted"
                  }`}>
                    {m.role === "assistant"
                      ? <ZazaMessage text={m.content} allowedPaths={allowedPaths} />
                      : m.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Thinking…
              </div>
            )}
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
