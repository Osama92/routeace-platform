import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Building2, CreditCard, TrendingUp, Shield, BarChart3, Plus } from "lucide-react";

const creditTier = (score: number) => {
  if (score >= 800) return { label: "Prime", color: "text-emerald-600" };
  if (score >= 600) return { label: "Standard", color: "text-blue-600" };
  if (score >= 400) return { label: "Sub-Prime", color: "text-amber-600" };
  return { label: "High Risk", color: "text-destructive" };
};

const SMECreditMarketplace = () => {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    country: "NG",
    trade_volume: "",
    cross_border_frequency: "",
  });

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("sme_credit_profiles")
      .select("*")
      .order("credit_score", { ascending: false })
      .limit(100);
    setProfiles((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfiles(); }, [fetchProfiles]);

  const createProfile = async () => {
    if (!user || !form.business_name) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    const tv = parseFloat(form.trade_volume) || 0;
    const cbf = parseInt(form.cross_border_frequency) || 0;

    // Real, data-driven AI credit scoring — no Math.random
    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    const [{ data: orgDispatches }, { data: orgInvoices }] = await Promise.all([
      organizationId
        ? supabase
            .from("dispatches")
            .select("status, on_time_flag, created_at")
            .eq("organization_id", organizationId)
            .gte("created_at", since)
        : Promise.resolve({ data: [] as any[] }),
      organizationId
        ? supabase
            .from("invoices")
            .select("status, total_amount, paid_at, due_date, created_at")
            .eq("organization_id", organizationId)
            .gte("created_at", since)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const totalDispatches = orgDispatches?.length || 0;
    const onTimeDispatches = (orgDispatches || []).filter((d: any) => d.on_time_flag === true).length;
    const deliveryReliability = totalDispatches > 0
      ? Math.min(99, (onTimeDispatches / totalDispatches) * 100)
      : 70; // sensible default for new orgs with no history

    const paidOnTime = (orgInvoices || []).filter((i: any) =>
      i.status === "paid" && i.paid_at && i.due_date &&
      new Date(i.paid_at) <= new Date(i.due_date)
    ).length;
    const settledInvoices = (orgInvoices || []).filter((i: any) =>
      i.status === "paid" || i.status === "overdue"
    ).length;
    const paymentConsistency = settledInvoices > 0
      ? Math.min(99, (paidOnTime / settledInvoices) * 100)
      : 60;

    const totalRevenue = (orgInvoices || []).reduce(
      (s: number, i: any) => s + (i.total_amount || 0), 0,
    );
    const cashflowIndex = Math.min(99, Math.max(30, (totalRevenue / 500_000) * 50));

    const creditScore = Math.round((deliveryReliability * 3 + paymentConsistency * 4 + cashflowIndex * 3) / 10 * 10);
    const freightHistoryScore = parseFloat(deliveryReliability.toFixed(1));
    const defaultProbability = parseFloat(
      Math.max(0.01, (100 - paymentConsistency) / 1000).toFixed(3),
    );

    const { error } = await supabase.from("sme_credit_profiles").insert({
      business_name: form.business_name,
      country: form.country,
      trade_volume: tv,
      cross_border_frequency: cbf,
      delivery_reliability: parseFloat(deliveryReliability.toFixed(1)),
      payment_consistency: parseFloat(paymentConsistency.toFixed(1)),
      cashflow_stability_index: parseFloat(cashflowIndex.toFixed(1)),
      credit_score: creditScore,
      eligible_limit: creditScore >= 600 ? tv * 0.3 : tv * 0.1,
      freight_history_score: freightHistoryScore,
      default_probability: defaultProbability,
      created_by: user.id,
      last_assessed_at: new Date().toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Credit Profile Created", description: `AI credit score: ${creditScore}/1000` });
    setShowCreate(false);
    setForm({ business_name: "", country: "NG", trade_volume: "", cross_border_frequency: "" });
    fetchProfiles();
  };

  const avgScore = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + (p.credit_score || 0), 0) / profiles.length) : 0;
  const primeCount = profiles.filter(p => p.credit_score >= 800).length;
  const totalEligible = profiles.reduce((s, p) => s + (p.eligible_limit || 0), 0);

  return (
    <DashboardLayout title="SME Credit Marketplace" subtitle="Cross-border SME credit scoring & structured capital">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CreditCard className="h-7 w-7 text-primary" />
              SME Credit Marketplace
            </h1>
            <p className="text-muted-foreground mt-1">AI-driven trade credit for African corridor SMEs</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Assess SME</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>SME Credit Assessment</DialogTitle>
                <DialogDescription>Run AI credit scoring on a trade-active SME</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div><Label>Business Name</Label><Input value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} /></div>
                <div><Label>Country</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
                <div><Label>Trade Volume (USD)</Label><Input type="number" value={form.trade_volume} onChange={e => setForm(f => ({ ...f, trade_volume: e.target.value }))} /></div>
                <div><Label>Cross-Border Frequency (monthly)</Label><Input type="number" value={form.cross_border_frequency} onChange={e => setForm(f => ({ ...f, cross_border_frequency: e.target.value }))} /></div>
                <Button onClick={createProfile} className="w-full">Run Credit Assessment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total SMEs</p><p className="text-2xl font-bold">{profiles.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Avg Credit Score</p><p className="text-2xl font-bold">{avgScore}/1000</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Shield className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Prime Rated</p><p className="text-2xl font-bold">{primeCount}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><BarChart3 className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Total Eligible Limit</p><p className="text-2xl font-bold">${totalEligible.toLocaleString()}</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>SME Credit Profiles</CardTitle><CardDescription>AI-scored credit profiles for trade-active businesses</CardDescription></CardHeader>
          <CardContent>
            {profiles.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No SME profiles yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Credit Score</TableHead>
                    <TableHead>Delivery %</TableHead>
                    <TableHead>Payment %</TableHead>
                    <TableHead>Cashflow Index</TableHead>
                    <TableHead>Eligible Limit</TableHead>
                    <TableHead>Default Prob</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const tier = creditTier(p.credit_score);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.business_name}</TableCell>
                        <TableCell>{p.country}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${tier.color}`}>{p.credit_score}</span>
                            <Badge variant="outline" className="text-xs">{tier.label}</Badge>
                          </div>
                          <Progress value={p.credit_score / 10} className="h-1 mt-1" />
                        </TableCell>
                        <TableCell>{p.delivery_reliability}%</TableCell>
                        <TableCell>{p.payment_consistency}%</TableCell>
                        <TableCell>{p.cashflow_stability_index}</TableCell>
                        <TableCell className="font-semibold">${(p.eligible_limit || 0).toLocaleString()}</TableCell>
                        <TableCell>{((p.default_probability || 0) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SMECreditMarketplace;
