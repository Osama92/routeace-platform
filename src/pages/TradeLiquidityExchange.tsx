import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Landmark, TrendingUp, Shield, BarChart3, Plus, DollarSign, Clock } from "lucide-react";

const ASSET_TYPES = [
  { value: "freight_note", label: "Freight-Backed Note" },
  { value: "invoice_receivable", label: "Invoice Receivable" },
  { value: "escrow_contract", label: "Escrow-Locked Contract" },
  { value: "corridor_basket", label: "Corridor Trade Basket" },
  { value: "remittance_pool", label: "Diaspora Remittance Pool" },
];

const INVESTOR_CLASSES = [
  { value: "diaspora_retail", label: "Diaspora Retail" },
  { value: "african_hni", label: "African HNI" },
  { value: "pension_fund", label: "Pension Fund" },
  { value: "sovereign_fund", label: "Sovereign Fund" },
  { value: "bank", label: "Bank" },
  { value: "trade_finance", label: "Trade Finance Institution" },
];

const TradeLiquidityExchange = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    asset_name: "",
    asset_type: "freight_note",
    origin_corridor: "",
    principal_amount: "",
    yield_rate: "",
    duration_days: "30",
    investor_class: "diaspora_retail",
    insurance_backing: false,
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("trade_liquidity_exchange")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setAssets((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const createAsset = async () => {
    if (!user || !form.asset_name || !form.principal_amount) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    const principal = parseFloat(form.principal_amount);
    // 8.5% is a sensible Nigerian logistics finance benchmark default
    // when user leaves field blank.
    const yieldRate = parseFloat(form.yield_rate) || 8.5;

    // Compute real risk score from org performance (last 90 days)
    const { data: orgPerf } = await supabase
      .from("dispatches")
      .select("status, on_time_flag")
      .eq("organization_id", user.id)
      .gte("created_at", new Date(Date.now() - 90 * 86400000).toISOString());

    const totalDisp = orgPerf?.length ?? 0;
    const onTimeDisp = orgPerf?.filter((d: any) => d.on_time_flag === true).length ?? 0;
    const reliabilityPct = totalDisp > 0 ? (onTimeDisp / totalDisp) * 100 : 50;

    // Lower reliability = higher risk score (5–95)
    const computedRiskScore = Math.round(
      Math.max(5, Math.min(95, 100 - reliabilityPct))
    );

    // Liquidity depth based on principal and risk
    const computedLiquidityDepth = parseFloat(
      (principal * (computedRiskScore < 30 ? 0.8 : computedRiskScore < 60 ? 0.55 : 0.35)).toFixed(2)
    );

    const { error } = await supabase.from("trade_liquidity_exchange").insert({
      asset_name: form.asset_name,
      asset_type: form.asset_type,
      origin_corridor: form.origin_corridor,
      principal_amount: principal,
      yield_rate: parseFloat(yieldRate.toFixed(2)),
      duration_days: parseInt(form.duration_days),
      investor_class: form.investor_class,
      insurance_backing: form.insurance_backing,
      insurance_coverage: form.insurance_backing ? principal * 0.8 : 0,
      risk_score: computedRiskScore,
      liquidity_depth: computedLiquidityDepth,
      maturity_date: new Date(Date.now() + parseInt(form.duration_days) * 86400000).toISOString().split("T")[0],
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Asset Listed", description: "Trade instrument added to exchange." });
    setShowCreate(false);
    fetchAssets();
  };

  const totalPrincipal = assets.reduce((s, a) => s + (a.principal_amount || 0), 0);
  const avgYield = assets.length > 0 ? (assets.reduce((s, a) => s + (a.yield_rate || 0), 0) / assets.length).toFixed(1) : "0";
  const insuredCount = assets.filter(a => a.insurance_backing).length;

  return (
    <DashboardLayout title="Trade Liquidity Exchange" subtitle="Freight-backed structured instruments & yield marketplace">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Landmark className="h-7 w-7 text-primary" />
              African Trade Liquidity Exchange
            </h1>
            <p className="text-muted-foreground mt-1">Trade-backed yield instruments for institutional & diaspora capital</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> List Instrument</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>List Trade Instrument</DialogTitle>
                <DialogDescription>Create a structured, risk-scored trade asset</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div><Label>Asset Name</Label><Input value={form.asset_name} onChange={e => setForm(f => ({ ...f, asset_name: e.target.value }))} placeholder="e.g. Lagos-Nairobi Freight Note Q1" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Asset Type</Label>
                    <Select value={form.asset_type} onValueChange={v => setForm(f => ({ ...f, asset_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Corridor</Label><Input value={form.origin_corridor} onChange={e => setForm(f => ({ ...f, origin_corridor: e.target.value }))} placeholder="NG-KE" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Principal (USD)</Label><Input type="number" value={form.principal_amount} onChange={e => setForm(f => ({ ...f, principal_amount: e.target.value }))} /></div>
                  <div><Label>Yield Rate (%)</Label><Input type="number" value={form.yield_rate} onChange={e => setForm(f => ({ ...f, yield_rate: e.target.value }))} placeholder="Auto-calculated" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: e.target.value }))} /></div>
                  <div>
                    <Label>Investor Class</Label>
                    <Select value={form.investor_class} onValueChange={v => setForm(f => ({ ...f, investor_class: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{INVESTOR_CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.insurance_backing} onChange={e => setForm(f => ({ ...f, insurance_backing: e.target.checked }))} className="rounded" />
                  <Label>Insurance-backed (80% coverage)</Label>
                </div>
                <Button onClick={createAsset} className="w-full">List on Exchange</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Principal</p><p className="text-2xl font-bold">${totalPrincipal.toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Avg Yield</p><p className="text-2xl font-bold">{avgYield}%</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><BarChart3 className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Listed Assets</p><p className="text-2xl font-bold">{assets.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Insured</p><p className="text-2xl font-bold">{insuredCount}</p></div></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Exchange Instruments</CardTitle><CardDescription>Active trade-backed yield instruments</CardDescription></CardHeader>
          <CardContent>
            {assets.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No instruments listed yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Corridor</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Yield</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Insured</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.asset_name}</TableCell>
                      <TableCell><Badge variant="outline">{(a.asset_type || "").replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>{a.origin_corridor || "-"}</TableCell>
                      <TableCell className="font-semibold">${(a.principal_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-emerald-600 font-bold">{a.yield_rate}%</TableCell>
                      <TableCell className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_days}d</TableCell>
                      <TableCell><Badge variant="outline">{a.risk_score}</Badge></TableCell>
                      <TableCell>{a.insurance_backing ? <Badge className="bg-emerald-500/10 text-emerald-700">Yes</Badge> : "No"}</TableCell>
                      <TableCell><Badge variant={a.status === "open" ? "default" : "outline"}>{a.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TradeLiquidityExchange;
