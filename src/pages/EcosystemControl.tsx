import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Network, Sparkles, Check, X, Store } from "lucide-react";

export default function EcosystemControl() {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await supabase.functions.invoke("ecosystem-control-engine", { body: {}, method: "GET" as any });
    // GET via invoke isn't supported uniformly - call via fetch
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecosystem-control-engine?route=/graph`;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.access_token}` } });
    const j = await res.json();
    setNodes(j.nodes || []);
    setConnections(j.connections || []);
  };

  useEffect(() => { load(); }, []);

  const seed = async () => {
    setLoading(true);
    await callRoute("/seed-catalog", "POST");
    toast({ title: "Catalog seeded" });
    await load();
    setLoading(false);
  };

  const suggest = async () => {
    setLoading(true);
    await callRoute("/suggest-connections", "POST");
    toast({ title: "AI generated new partner suggestions" });
    await load();
    setLoading(false);
  };

  const decide = async (id: string, decision: "accept" | "reject") => {
    await callRoute("/decide", "POST", { connection_id: id, decision });
    await load();
  };

  const callRoute = async (route: string, method = "GET", body?: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ecosystem-control-engine?route=${route}`;
    return fetch(url, { method, headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Network className="h-7 w-7 text-primary" /> Ecosystem Control Layer</h1>
          <p className="text-muted-foreground">Connect with vendors, insurers, partners and FMCG shippers across Routeace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={seed} disabled={loading}>Seed Catalog</Button>
          <Button onClick={suggest} disabled={loading}><Sparkles className="h-4 w-4 mr-2" /> AI Suggest</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card><CardHeader><CardTitle className="text-sm">Ecosystem Nodes</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{nodes.length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Suggested</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{connections.filter(c => c.status === "suggested").length}</CardContent></Card>
        <Card><CardHeader><CardTitle className="text-sm">Accepted</CardTitle></CardHeader><CardContent className="text-3xl font-bold">{connections.filter(c => c.status === "accepted").length}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>AI-Suggested Connections</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {connections.length === 0 && <p className="text-muted-foreground text-sm">No suggestions yet. Click <strong>AI Suggest</strong>.</p>}
          {connections.map((c) => {
            const node = nodes.find((n) => n.id === c.node_id);
            return (
              <div key={c.id} className="border rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <strong>{node?.name || "Partner"}</strong>
                    <Badge variant="outline">{c.connection_type}</Badge>
                    <Badge>{c.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{c.ai_reasoning}</p>
                  <p className="text-xs mt-1">Match: <strong>{Math.round(c.match_score)}/100</strong> · Est. value: ₦{Number(c.estimated_value || 0).toLocaleString()}</p>
                </div>
                {c.status === "suggested" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(c.id, "accept")}><Check className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => decide(c.id, "reject")}><X className="h-4 w-4" /></Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Store className="h-5 w-5" /> Vendor Marketplace</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {nodes.filter(n => n.node_type === "vendor").map((n) => (
              <div key={n.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <strong>{n.name}</strong>
                  <Badge variant="secondary">⭐ {n.trust_score}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{n.region} · {n.category}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(n.capabilities || []).map((c: string) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
