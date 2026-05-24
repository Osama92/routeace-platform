/**
 * AI Coach - conversational onboarding companion.
 * Coexists with OnboardingTeleprompter (which handles phased slides).
 * This component focuses on free-form intent → route navigation + smart nudges.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, Send, ArrowRight, Lightbulb, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Intent {
  keywords: string[];
  label: string;
  href: string;
  hint: string;
}

const INTENTS: Intent[] = [
  { keywords: ["dispatch", "create dispatch", "new shipment", "ship", "waybill"], label: "Create a dispatch", href: "/dispatch", hint: "Click 'New Dispatch', pick a vehicle, assign a driver, then confirm." },
  { keywords: ["track", "tracking", "live truck", "where is"], label: "Track trucks", href: "/tracking", hint: "Live map with all active vehicles and SLA risk overlays." },
  { keywords: ["invoice", "bill customer", "billing"], label: "Create an invoice", href: "/invoices", hint: "Use 'New Invoice' or auto-generate from a closed dispatch." },
  { keywords: ["payment", "paid", "ar", "receivable"], label: "View payments & AR", href: "/cfo/ar", hint: "Receivables, aging buckets, and dunning automation." },
  { keywords: ["expense", "spend"], label: "Log an expense", href: "/expenses", hint: "Capture receipts; finance approves before it hits the ledger." },
  { keywords: ["driver", "add driver"], label: "Manage drivers", href: "/drivers", hint: "Onboarding requires license + NIN photos." },
  { keywords: ["vehicle", "truck", "fleet", "add vehicle"], label: "Manage fleet", href: "/fleet", hint: "Register vehicles, run inspections, view health scores." },
  { keywords: ["route", "plan route", "optimi"], label: "Plan routes", href: "/advanced-route-planner", hint: "Multi-drop optimization with confidence scores." },
  { keywords: ["maintenance", "service", "repair"], label: "Maintenance Intelligence", href: "/maintenance-intelligence", hint: "Predicted failures, repair vs replace recommendations." },
  { keywords: ["profit", "margin", "p&l"], label: "Profitability Engine", href: "/profitability-engine", hint: "Per-truck, per-route margin and leak detection." },
  { keywords: ["report", "kpi", "analytic"], label: "Analytics & KPIs", href: "/kpi-dashboard", hint: "90+ executive metrics across finance, fleet, and ops." },
  { keywords: ["user", "team", "invite", "role"], label: "Manage team", href: "/users", hint: "Invite teammates and assign roles." },
  { keywords: ["integration", "connect", "quickbooks", "xero", "stripe", "hubspot", "zoho"], label: "Connect an app", href: "/integration-hub", hint: "3-step self-serve connection - accounting, CRM, payments." },
  { keywords: ["audit", "integrity", "health check"], label: "System Integrity Auditor", href: "/system-integrity", hint: "Pre-deploy checks across routes, data, and AI engines." },
];

interface ChatMsg {
  role: "user" | "coach";
  text: string;
  action?: { label: string; href: string };
}

const PHASE_TIPS: { day: number; tip: string; href?: string; label?: string }[] = [
  { day: 1,  tip: "Day 1: Add your first vehicle to unlock dispatch creation.",         href: "/fleet",         label: "Open Fleet" },
  { day: 3,  tip: "Day 3: Add drivers and assign their license documents.",              href: "/drivers",       label: "Add drivers" },
  { day: 7,  tip: "Day 7: Create your first dispatch to start tracking deliveries.",     href: "/dispatch",      label: "New dispatch" },
  { day: 14, tip: "Day 14: Generate your first invoice from a closed dispatch.",         href: "/invoices",      label: "Open Invoices" },
  { day: 21, tip: "Day 21: Review your KPI dashboard and unlock optimization modules.",  href: "/kpi-dashboard", label: "View KPIs" },
];

const STORAGE_KEY = "routeace.aicoach.state.v1";

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}
function saveState(s: Record<string, unknown>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

function findIntent(query: string): Intent | null {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  // score by keyword matches
  let best: { intent: Intent; score: number } | null = null;
  for (const intent of INTENTS) {
    const score = intent.keywords.reduce((acc, kw) => acc + (q.includes(kw) ? kw.length : 0), 0);
    if (score > 0 && (!best || score > best.score)) best = { intent, score };
  }
  return best?.intent ?? null;
}

const HIDE_ON_PATHS = ["/auth", "/user-auth", "/landing", "/track/", "/customer-portal", "/onboarding"];

export default function AICoach() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "coach", text: "Hi 👋 I'm your RouteAce coach. Ask me anything like 'how do I create a dispatch?' or 'where do I see payments?'" },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [tip, setTip] = useState<typeof PHASE_TIPS[number] | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const hidden = useMemo(() => {
    if (!user) return true;
    return HIDE_ON_PATHS.some(p => location.pathname.startsWith(p));
  }, [user, location.pathname]);

  // Compute phase tip based on first-seen date
  useEffect(() => {
    if (!user) return;
    const state = loadState();
    if (!state.firstSeen) {
      state.firstSeen = new Date().toISOString();
      saveState(state);
    }
    const days = Math.floor((Date.now() - new Date(state.firstSeen).getTime()) / 86_400_000);
    const dismissed: number[] = state.dismissedTips || [];
    const next = PHASE_TIPS
      .filter(t => t.day <= days + 1 && !dismissed.includes(t.day))
      .pop();
    setTip(next || null);
  }, [user, location.pathname]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const dismissTip = () => {
    if (!tip) return;
    const state = loadState();
    state.dismissedTips = [...(state.dismissedTips || []), tip.day];
    saveState(state);
    setTip(null);
  };

  const send = async (text?: string) => {
    const value = (text ?? input).trim();
    if (!value || thinking) return;
    setInput("");
    const userMsg: ChatMsg = { role: "user", text: value };
    const intent = findIntent(value);
    if (intent) {
      setMessages(m => [...m, userMsg, { role: "coach", text: intent.hint, action: { label: `Take me to ${intent.label}`, href: intent.href } }]);
      return;
    }
    // Gemini fallback for open-ended questions
    setMessages(m => [...m, userMsg]);
    setThinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("coach-ai", {
        body: { question: value },
      });
      const aiText = data?.answer ?? (error ? "Sorry, I couldn't reach the AI right now." : "I don't have an answer for that yet.");
      setMessages(m => [...m, { role: "coach", text: aiText }]);
    } catch {
      setMessages(m => [...m, { role: "coach", text: "Sorry, I couldn't reach the AI right now. Try a keyword like 'dispatch', 'invoice', or 'route'." }]);
    } finally {
      setThinking(false);
    }
  };

  const navigateTo = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  if (hidden) return null;

  return (
    <>
      {/* Floating toggle (bottom-right; teleprompter sits bottom-left so they don't collide) */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center"
        aria-label="Open AI Coach"
      >
        {open ? <X className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
      </motion.button>

      {/* Smart nudge */}
      <AnimatePresence>
        {!open && tip && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 right-6 z-40 max-w-xs bg-card border border-border shadow-lg rounded-xl p-3"
          >
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs">{tip.tip}</p>
                <div className="flex gap-2 mt-2">
                  {tip.href && tip.label && (
                    <Button size="sm" className="h-6 text-[10px]" onClick={() => navigateTo(tip.href!)}>
                      {tip.label}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={dismissTip}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[480px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b flex items-center gap-2 bg-muted/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">RouteAce Coach</p>
                <p className="text-[10px] text-muted-foreground">Ask, learn, navigate.</p>
              </div>
              <Badge variant="outline" className="text-[10px]">Beta</Badge>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p>{m.text}</p>
                    {m.action && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2 h-7 text-xs"
                        onClick={() => navigateTo(m.action!.href)}
                      >
                        {m.action.label} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {thinking && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-3 py-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}

              {messages.length <= 1 && (
                <div className="pt-2">
                  <p className="text-[10px] text-muted-foreground mb-1.5">Try:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["Create a dispatch", "Track trucks", "Connect QuickBooks", "View KPIs"].map(s => (
                      <Button key={s} size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => send(s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-2 border-t flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !thinking && send()}
                placeholder="Ask the coach…"
                className="h-9 text-sm"
                disabled={thinking}
              />
              <Button size="sm" className="h-9" onClick={() => send()} disabled={thinking}>
                {thinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
