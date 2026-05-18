import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Globe2, CheckCircle2, XCircle, Sparkles } from "lucide-react";

const GlobalExpansion = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.functions.invoke("global-expansion-engine", { method: "GET" as any });
    setItems((data as any)?.targets || []);
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("global-expansion-engine?route=/scan");
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Markets scored", description: "Top expansion targets identified" });
    load();
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    await supabase.functions.invoke("global-expansion-engine?route=/decide", { body: { id, decision } });
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><Globe2 className="text-primary" /> Global Expansion AI</h1>
          <p className="text-muted-foreground mt-1">Country entry strategy - feasibility, scoring, roadmap.</p>
        </div>
        <Button onClick={scan} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Analyzing…" : "Scan Markets"}</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="grid gap-4 pr-4 md:grid-cols-2">
          {items.length === 0 && <Card className="md:col-span-2"><CardContent className="p-8 text-center text-muted-foreground">No markets scored yet.</CardContent></Card>}
          {items.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{t.market_name} <Badge>{t.composite_score}/100</Badge></CardTitle>
                    <CardDescription>{t.city}, {t.country} · {t.recommended_segment}</CardDescription>
                  </div>
                  <Badge variant="outline">{t.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="bg-muted/50 p-2 rounded text-center"><div className="font-bold">{t.demand_score}</div><div className="text-muted-foreground">Demand</div></div>
                  <div className="bg-muted/50 p-2 rounded text-center"><div className="font-bold">{t.inefficiency_score}</div><div className="text-muted-foreground">Inefficiency</div></div>
                  <div className="bg-muted/50 p-2 rounded text-center"><div className="font-bold">{t.ease_of_entry}</div><div className="text-muted-foreground">Ease</div></div>
                  <div className="bg-muted/50 p-2 rounded text-center"><div className="font-bold">{t.revenue_potential}</div><div className="text-muted-foreground">Revenue</div></div>
                </div>
                {t.entry_strategy && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Entry model:</span> {t.entry_strategy.model} · {t.entry_strategy.timeline_months}-month launch · {t.entry_strategy.initial_fleet_targets} initial targets
                  </div>
                )}
                {Array.isArray(t.roadmap) && (
                  <div className="space-y-1">
                    {t.roadmap.slice(0, 4).map((r: any, i: number) => (
                      <div key={i} className="text-xs border-l-2 border-primary/30 pl-2">
                        <span className="font-medium">{r.week || r.month}:</span> {r.action}
                      </div>
                    ))}
                  </div>
                )}
                {t.status === "evaluating" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(t.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(t.id, "reject")}><XCircle className="w-4 h-4 mr-1" />Defer</Button>
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

export default GlobalExpansion;
