import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, CheckCircle2, XCircle, Sparkles, TrendingUp, TrendingDown } from "lucide-react";

const PricingDominance = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.functions.invoke("pricing-dominance-engine", { method: "GET" as any });
    setItems((data as any)?.recommendations || []);
  };
  useEffect(() => { load(); }, []);

  const scan = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("pricing-dominance-engine?route=/scan");
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Pricing recommendations generated" });
    load();
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    await supabase.functions.invoke("pricing-dominance-engine?route=/decide", { body: { id, decision } });
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><DollarSign className="text-primary" /> Autonomous Pricing Dominance</h1>
          <p className="text-muted-foreground mt-1">Value-based pricing across customer segments - recommend-only.</p>
        </div>
        <Button onClick={scan} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Analyzing…" : "Analyze Customers"}</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-3 pr-4">
          {items.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No pricing recommendations yet.</CardContent></Card>}
          {items.map((r) => {
            const up = r.price_change_pct > 0;
            return (
              <Card key={r.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">{r.customer_segment} <Badge variant="outline">{r.status}</Badge></CardTitle>
                      <CardDescription className="flex items-center gap-3 text-xs">
                        <span>Dependency: {r.dependency_score}/100</span>
                        <span>Churn risk: {r.churn_risk}/100</span>
                        <span>Savings delivered: ₦{Number(r.cost_savings_delivered).toLocaleString()}</span>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">₦{Number(r.current_price).toLocaleString()} → <span className="font-bold text-primary">₦{Number(r.recommended_price).toLocaleString()}</span></div>
                      <Badge variant={up ? "default" : "secondary"} className="mt-1">
                        {up ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}{r.price_change_pct}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm bg-muted/50 p-2 rounded">{r.reasoning}</div>
                  {Array.isArray(r.bundle_suggestions) && r.bundle_suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-1">Upsells:</span>
                      {r.bundle_suggestions.map((b: any, i: number) => <Badge key={i} variant="outline">{b.module} +₦{Number(b.price).toLocaleString()}</Badge>)}
                    </div>
                  )}
                  {r.status === "pending_review" && (
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={() => decide(r.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "reject")}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PricingDominance;
