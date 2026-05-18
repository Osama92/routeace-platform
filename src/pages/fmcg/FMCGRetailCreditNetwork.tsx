import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, TrendingUp, ShieldCheck, Users, AlertTriangle, Star, Wallet, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import FMCGLayout from "@/components/fmcg/FMCGLayout";

interface CreditScore {
  id: string;
  retailer_name: string;
  territory: string;
  credit_score: number;
  credit_tier: string;
  purchase_velocity_score: number;
  payment_history_score: number;
  store_stability_score: number;
  territory_demand_score: number;
  credit_limit: number;
  outstanding_balance: number;
  available_credit: number;
  last_assessed_at: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: typeof Star }> = {
  tier_1: { label: "Tier 1 - High Trust", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: Star },
  tier_2: { label: "Tier 2 - Medium Risk", color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: ShieldCheck },
  tier_3: { label: "Tier 3 - Limited", color: "bg-red-500/15 text-red-400 border-red-500/30", icon: AlertTriangle },
};

// MOCK_SCORES removed — page is fully live via supabase.from("retail_credit_scores").

const formatCurrency = (v: number) => `₦${(v / 1000).toFixed(0)}K`;

const FMCGRetailCreditNetwork = () => {
  const [scores, setScores] = useState<CreditScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      const { data } = await supabase.from("retail_credit_scores").select("*").order("credit_score", { ascending: false });
      setScores((data as CreditScore[]) || []);
      setLoading(false);
    };
    fetchScores();
  }, []);

  const tier1 = scores.filter(s => s.credit_tier === "tier_1").length;
  const tier2 = scores.filter(s => s.credit_tier === "tier_2").length;
  const tier3 = scores.filter(s => s.credit_tier === "tier_3").length;
  const totalExposure = scores.reduce((s, c) => s + c.outstanding_balance, 0);
  const totalLimit = scores.reduce((s, c) => s + c.credit_limit, 0);

  if (!loading && scores.length === 0) {
    return (
      <FMCGLayout>
        <div className="p-6">
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3 mb-2">
            <Wallet className="w-7 h-7 text-primary" />
            Retail Credit Network
          </h1>
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-6">
              <CreditCard className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No credit data yet</h3>
            <p className="text-sm text-muted-foreground">Retailer credit scores will appear here once your distribution network generates enough payment and ordering history for AI-powered scoring.</p>
          </div>
        </div>
      </FMCGLayout>
    );
  }

  return (
    <FMCGLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-3">
              <Wallet className="w-7 h-7 text-emerald-400" />
              Retail Credit Network
            </h1>
            <p className="text-muted-foreground mt-1">AI-powered credit scoring using distribution data - embedded finance for African retail</p>
          </div>
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1">
            ENGINE 4 - Financial Network Effect
          </Badge>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total Retailers", value: scores.length, sub: "Scored", icon: Users, color: "text-primary" },
            { label: "Tier 1 (High Trust)", value: tier1, sub: `${((tier1/scores.length)*100).toFixed(0)}%`, icon: Star, color: "text-emerald-400" },
            { label: "Tier 2 (Medium)", value: tier2, sub: `${((tier2/scores.length)*100).toFixed(0)}%`, icon: ShieldCheck, color: "text-amber-400" },
            { label: "Tier 3 (Limited)", value: tier3, sub: `${((tier3/scores.length)*100).toFixed(0)}%`, icon: AlertTriangle, color: "text-red-400" },
            { label: "Credit Exposure", value: formatCurrency(totalExposure), sub: `of ${formatCurrency(totalLimit)}`, icon: CreditCard, color: "text-blue-400" },
          ].map(kpi => (
            <Card key={kpi.label} className="bg-card border-border">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                  </div>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="scores">
          <TabsList>
            <TabsTrigger value="scores">Credit Scores</TabsTrigger>
            <TabsTrigger value="products">Credit Products</TabsTrigger>
            <TabsTrigger value="flywheel">Network Effect</TabsTrigger>
          </TabsList>

          <TabsContent value="scores">
            <div className="space-y-3">
              {scores.map(score => {
                const tier = TIER_CONFIG[score.credit_tier] || TIER_CONFIG.tier_3;
                return (
                  <motion.div key={score.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="font-bold text-primary">{score.credit_score}</span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{score.retailer_name}</p>
                          <p className="text-xs text-muted-foreground">{score.territory}</p>
                        </div>
                      </div>
                      <Badge className={tier.color}>{tier.label}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      {[
                        { label: "Purchase Velocity", value: score.purchase_velocity_score },
                        { label: "Payment History", value: score.payment_history_score },
                        { label: "Store Stability", value: score.store_stability_score },
                        { label: "Territory Demand", value: score.territory_demand_score },
                      ].map(f => (
                        <div key={f.label}>
                          <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                          <Progress value={f.value} className="h-2" />
                          <p className="text-xs text-foreground mt-0.5">{f.value}/100</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-6 mt-3 pt-3 border-t border-border text-sm">
                      <div><span className="text-muted-foreground">Limit:</span> <span className="font-medium text-foreground">{formatCurrency(score.credit_limit)}</span></div>
                      <div><span className="text-muted-foreground">Outstanding:</span> <span className="font-medium text-amber-400">{formatCurrency(score.outstanding_balance)}</span></div>
                      <div><span className="text-muted-foreground">Available:</span> <span className="font-medium text-emerald-400">{formatCurrency(score.available_credit)}</span></div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="products">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { title: "Inventory Credit", desc: "Short-term credit for stock purchases. Auto-assessed based on purchase velocity and payment history.", limit: "Up to ₦2M", tenure: "7-30 days", tier: "Tier 1 & 2" },
                { title: "Trade Credit", desc: "Working capital for seasonal demand spikes. Uses territory demand signals and historical patterns.", limit: "Up to ₦5M", tenure: "30-90 days", tier: "Tier 1 only" },
                { title: "Promotion Financing", desc: "Credit to participate in manufacturer promotions. Lower risk, backed by promotion rebates.", limit: "Up to ₦500K", tenure: "14-45 days", tier: "All tiers" },
              ].map(p => (
                <Card key={p.title} className="bg-card border-border">
                  <CardHeader><CardTitle className="text-lg">{p.title}</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">{p.desc}</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Max Limit</span><span className="font-medium text-foreground">{p.limit}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Tenure</span><span className="font-medium text-foreground">{p.tenure}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Eligibility</span><Badge variant="outline">{p.tier}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="flywheel">
            <Card className="bg-card border-border">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-6">
                  <h3 className="text-xl font-heading font-bold text-foreground">Retail Credit Network Flywheel</h3>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                    {[
                      { step: "1", title: "Retailers Join", desc: "Onboard to RouteAce distribution" },
                      { step: "2", title: "Data Accumulates", desc: "Purchase, payment, delivery data" },
                      { step: "3", title: "AI Scores Credit", desc: "Real-time credit tier assignment" },
                      { step: "4", title: "Lenders Connect", desc: "Banks and fintechs provide capital" },
                      { step: "5", title: "More Retailers Join", desc: "Credit access drives adoption" },
                    ].map((s, i) => (
                      <div key={s.step} className="flex flex-col items-center text-center p-4 rounded-lg bg-secondary/30">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mb-2">
                          <span className="font-bold text-primary">{s.step}</span>
                        </div>
                        <p className="font-medium text-foreground text-sm">{s.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                        {i < 4 && <ArrowUpRight className="w-4 h-4 text-primary mt-2" />}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground max-w-lg text-center">
                    Each new retailer strengthens the credit model, attracting more lenders, which attracts more retailers - creating a self-reinforcing financial network effect.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FMCGLayout>
  );
};

export default FMCGRetailCreditNetwork;
