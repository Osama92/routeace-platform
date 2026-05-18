import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Crown, CheckCircle2, XCircle, Sparkles } from "lucide-react";

const MonopolyStrategy = () => {
  const [items, setItems] = useState<any[]>([]);
  const [region, setRegion] = useState("Lagos");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.functions.invoke("monopoly-strategy-engine", { body: { action: "list" } });
    setItems((data as any)?.strategies || []);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("monopoly-strategy-engine", { body: { action: "generate", region } });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({ title: "Failed", description: error?.message || (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "Strategy generated", description: `Market mapping for ${region} complete` });
    load();
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    await supabase.functions.invoke("monopoly-strategy-engine", { body: { action: "decide", id, decision } });
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><Crown className="text-primary" /> AI Monopoly Strategy</h1>
          <p className="text-muted-foreground mt-1">Market mapping, lock-in tactics, competitor displacement.</p>
        </div>
        <div className="flex gap-2">
          <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Region" className="w-40" />
          <Button onClick={generate} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Mapping…" : "Generate"}</Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-4 pr-4">
          {items.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No strategies generated yet.</CardContent></Card>}
          {items.map((s) => (
            <Card key={s.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{s.market_region} <Badge>Dominance: {s.dominance_score}/100</Badge> <Badge variant="outline">{s.status}</Badge></CardTitle>
                    <CardDescription>Market value: ₦{Number(s.total_market_value).toLocaleString()} · {Number(s.market_players_count).toLocaleString()} fleet players</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Priority targets</div>
                  {(s.priority_targets || []).map((t: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-primary/40 pl-3 py-1">
                      <span className="font-medium">Tier {t.tier}: {t.segment}</span> - {t.reason} <span className="text-muted-foreground">(₦{Number(t.est_revenue).toLocaleString()})</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Lock-in strategies</div>
                  {(s.lock_in_strategies || []).map((l: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-amber-500/40 pl-3 py-1"><span className="font-medium">{l.tactic}:</span> <span className="text-muted-foreground">{l.description}</span></div>
                  ))}
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Competitor displacement</div>
                  {(s.competitor_displacement || []).map((c: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-destructive/40 pl-3 py-1"><span className="font-medium">{c.competitor}:</span> {c.weakness} → <span className="text-muted-foreground">{c.attack}</span></div>
                  ))}
                </div>
                {s.status === "pending_review" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => decide(s.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" />Activate</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(s.id, "reject")}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MonopolyStrategy;
