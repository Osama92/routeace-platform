import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Swords, Sparkles, Trophy } from "lucide-react";

const CompetitiveIntel = () => {
  const [items, setItems] = useState<any[]>([]);
  const [winRate, setWinRate] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const [{ data: a }, { data: b }] = await Promise.all([
      supabase.functions.invoke("competitive-intel-engine", { method: "GET" as any }),
      supabase.functions.invoke("competitive-intel-engine?route=/win-rate", { method: "GET" as any }),
    ]);
    setItems((a as any)?.competitors || []);
    setWinRate(b);
  };
  useEffect(() => { load(); }, []);

  const seed = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("competitive-intel-engine?route=/seed");
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Competitor catalog seeded" });
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><Swords className="text-primary" /> Competitive Intelligence</h1>
          <p className="text-muted-foreground mt-1">Track competitors, outmaneuver them, win deals.</p>
        </div>
        <Button onClick={seed} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Loading…" : "Seed Catalog"}</Button>
      </div>

      {winRate && (
        <div className="grid grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Win Rate</div><div className="text-3xl font-bold text-primary flex items-center gap-2"><Trophy className="w-6 h-6" />{winRate.winRate}%</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Total Deals</div><div className="text-3xl font-bold">{winRate.total}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Won</div><div className="text-3xl font-bold text-green-600">{winRate.won}</div></CardContent></Card>
          <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Lost</div><div className="text-3xl font-bold text-destructive">{winRate.lost}</div></CardContent></Card>
        </div>
      )}

      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="grid gap-4 md:grid-cols-2 pr-4">
          {items.length === 0 && <Card className="md:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No competitors tracked. Click "Seed Catalog" to start.</CardContent></Card>}
          {items.map((c) => (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{c.competitor_name} <Badge variant={c.threat_level === "high" ? "destructive" : "secondary"}>{c.threat_level}</Badge></CardTitle>
                    <CardDescription>₦{Number(c.price_per_unit || 0).toLocaleString()} / {c.pricing_model}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase text-green-600 mb-1">Strengths</div>
                  <div className="flex flex-wrap gap-1">{(c.strengths || []).map((s: string, i: number) => <Badge key={i} variant="outline">{s}</Badge>)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-destructive mb-1">Weaknesses</div>
                  <div className="flex flex-wrap gap-1">{(c.weaknesses || []).map((w: string, i: number) => <Badge key={i} variant="secondary">{w}</Badge>)}</div>
                </div>
                {c.win_strategy?.talking_points && (
                  <div>
                    <div className="text-xs font-semibold uppercase text-primary mb-1">Win strategy</div>
                    {c.win_strategy.talking_points.map((t: string, i: number) => (
                      <div key={i} className="text-xs border-l-2 border-primary/40 pl-2 py-0.5 text-muted-foreground">{t}</div>
                    ))}
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

export default CompetitiveIntel;
