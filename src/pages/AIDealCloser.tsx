import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Briefcase, CheckCircle2, XCircle, Sparkles, TrendingUp } from "lucide-react";

interface Deal {
  id: string; company_name: string; industry: string; fleet_size: number;
  estimated_monthly_loss: number; deal_probability: string; recommended_pitch: string;
  objection_responses: any[]; recommended_structure: any; estimated_value: number;
  ai_confidence: number; status: string;
}

const AIDealCloser = () => {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("ai-deal-closer", { body: {}, method: "GET" as any });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    setDeals((data as any)?.deals || []);
  };

  useEffect(() => { load(); }, []);

  const scan = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke("ai-deal-closer?route=/scan");
    setLoading(false);
    if (error) { toast({ title: "Scan failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Prospects detected", description: "AI generated personalized pitches" });
    load();
  };

  const decide = async (id: string, decision: "approve" | "reject") => {
    await supabase.functions.invoke(`ai-deal-closer?route=/decide`, { body: { id, decision } });
    toast({ title: decision === "approve" ? "Deal approved" : "Deal rejected" });
    load();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold flex items-center gap-3"><Briefcase className="text-primary" /> AI Deal Closer</h1>
          <p className="text-muted-foreground mt-1">Autonomous enterprise sales - recommend-only, you approve every action.</p>
        </div>
        <Button onClick={scan} disabled={loading}><Sparkles className="w-4 h-4 mr-2" /> {loading ? "Scanning…" : "Scan Prospects"}</Button>
      </div>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-4 pr-4">
          {deals.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No deals detected yet. Click "Scan Prospects" to identify high-value targets.</CardContent></Card>
          )}
          {deals.map((d) => (
            <Card key={d.id} className="border-l-4" style={{ borderLeftColor: d.deal_probability === "high" ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">{d.company_name} <Badge>{d.deal_probability}</Badge> <Badge variant="outline">{d.status}</Badge></CardTitle>
                    <CardDescription>{d.industry} · ~{d.fleet_size} trucks · est. ₦{Number(d.estimated_monthly_loss).toLocaleString()} monthly loss</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary flex items-center gap-1"><TrendingUp className="w-5 h-5" />₦{Number(d.estimated_value).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">12-mo deal value</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-muted/50 p-3 rounded text-sm">{d.recommended_pitch}</div>
                {d.objection_responses?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-muted-foreground uppercase">Objection handling</div>
                    {d.objection_responses.slice(0, 3).map((o: any, i: number) => (
                      <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                        <span className="font-medium">{o.objection}:</span> <span className="text-muted-foreground">{o.response}</span>
                      </div>
                    ))}
                  </div>
                )}
                {d.recommended_structure && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">Recommended pilot:</span> {d.recommended_structure.pilot_trucks} trucks · ₦{Number(d.recommended_structure.price_per_truck || 0).toLocaleString()}/truck/mo · {d.recommended_structure.term_days} days
                  </div>
                )}
                {d.status === "pending_review" && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => decide(d.id, "approve")}><CheckCircle2 className="w-4 h-4 mr-1" />Approve & Engage</Button>
                    <Button size="sm" variant="outline" onClick={() => decide(d.id, "reject")}><XCircle className="w-4 h-4 mr-1" />Reject</Button>
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

export default AIDealCloser;
