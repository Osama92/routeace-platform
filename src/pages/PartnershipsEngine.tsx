import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Handshake, CheckCircle2, XCircle, Sparkles } from "lucide-react";

const PartnershipsEngine = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("partnerships-engine", { body: { action: "list" } });
    if (error) { toast({ title: "Failed to load", description: error.message, variant: "destructive" }); return; }
    setItems((data as any)?.opportunities || []);
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("partnerships-engine", { body: { action: "match" } });
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Matches generated" });
    load();
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    const { error } = await supabase.functions.invoke("partnerships-engine", { body: { action: "decide", id, decision } });
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><Handshake className="text-primary" /> Autonomous Partnerships Engine</h1>
          <p className="text-muted-foreground mt-1">FMCG ↔ 3PL matchmaking - connect shippers with verified fleet operators.</p>
        </div>
        <Button onClick={generate} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Matching…" : "Generate Matches"}</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="grid gap-4 pr-4">
          {items.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">No partnership matches yet. Click "Generate Matches" to begin.</CardContent></Card>}
          {items.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{p.partner_name} <Badge>{p.partner_type}</Badge> <Badge variant="outline">{p.status}</Badge></CardTitle>
                    <CardDescription>Match score: {p.match_score}/100 · {p.route_context}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">₦{Number(p.estimated_revenue).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Est. annual revenue</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm bg-muted/50 p-3 rounded">{p.match_reason}</div>
                <div className="text-sm"><span className="font-semibold">Proposal:</span> {p.proposal_text}</div>
                <div className="text-xs text-muted-foreground">Cost savings: ₦{Number(p.cost_savings).toLocaleString()}</div>
                {p.status === "suggested" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => decide(p.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(p.id, "reject")}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
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

export default PartnershipsEngine;
