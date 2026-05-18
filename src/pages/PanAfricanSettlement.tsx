import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Globe, ArrowRightLeft, TrendingUp, Shield, Landmark, Zap, Plus } from "lucide-react";

const CURRENCIES = ["NGN", "KES", "ZAR", "GHS", "EGP", "XOF", "USD", "EUR", "GBP"];

const CORRIDORS = [
  { id: "NG-KE", label: "Nigeria → Kenya", from: "NGN", to: "KES" },
  { id: "NG-ZA", label: "Nigeria → South Africa", from: "NGN", to: "ZAR" },
  { id: "NG-GH", label: "Nigeria → Ghana", from: "NGN", to: "GHS" },
  { id: "GB-NG", label: "UK → Nigeria", from: "GBP", to: "NGN" },
  { id: "US-NG", label: "US → Nigeria", from: "USD", to: "NGN" },
  { id: "EU-KE", label: "EU → Kenya", from: "EUR", to: "KES" },
];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700",
    processing: "bg-blue-500/10 text-blue-700",
    settled: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-destructive/10 text-destructive",
    held: "bg-orange-500/10 text-orange-700",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const PanAfricanSettlement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    origin_wallet: "",
    destination_wallet: "",
    origin_currency: "NGN",
    destination_currency: "KES",
    amount: "",
    corridor_id: "",
  });

  const fetchSettlements = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("pan_african_settlement_ledger")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setSettlements((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSettlements(); }, [fetchSettlements]);

  const createSettlement = async () => {
    if (!user || !form.origin_wallet || !form.destination_wallet || !form.amount) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }
    const amount = parseFloat(form.amount);
    // Use country_configs for FX rate lookup
    const { data: originConfig } = await supabase
      .from("country_configs")
      .select("fx_buffer_percent")
      .eq("currency_code", form.origin_currency)
      .limit(1)
      .single();
    const fxBuffer = originConfig?.fx_buffer_percent || 3;
    const fxRate = 1 + (fxBuffer / 100);

    const { error } = await supabase.from("pan_african_settlement_ledger").insert({
      origin_wallet: form.origin_wallet,
      destination_wallet: form.destination_wallet,
      origin_currency: form.origin_currency,
      destination_currency: form.destination_currency,
      amount,
      fx_rate_locked: parseFloat(fxRate.toFixed(4)),
      corridor_id: form.corridor_id || `${form.origin_currency}-${form.destination_currency}`,
      risk_score: 0,
      aml_score: 0,
      sanctions_clear: true,
      created_by: user.id,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Settlement Created", description: "Cross-border settlement queued for processing." });
    setShowCreate(false);
    setForm({ origin_wallet: "", destination_wallet: "", origin_currency: "NGN", destination_currency: "KES", amount: "", corridor_id: "" });
    fetchSettlements();
  };

  const totalVolume = settlements.reduce((s, r) => s + (r.amount || 0), 0);
  const settledCount = settlements.filter(s => s.settlement_status === "settled").length;
  const avgRisk = settlements.length > 0 ? Math.round(settlements.reduce((s, r) => s + (r.risk_score || 0), 0) / settlements.length) : 0;

  return (
    <DashboardLayout title="Pan-African Settlement Network" subtitle="Continent-wide programmable settlement infrastructure">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="h-7 w-7 text-primary" />
              Pan-African Settlement Network
            </h1>
            <p className="text-muted-foreground mt-1">Multi-rail, multi-currency B2B settlement layer</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Settlement</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Settlement</DialogTitle>
                <DialogDescription>Queue a cross-border settlement transaction</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Origin Wallet</Label><Input value={form.origin_wallet} onChange={e => setForm(f => ({ ...f, origin_wallet: e.target.value }))} placeholder="Wallet ID or address" /></div>
                  <div><Label>Destination Wallet</Label><Input value={form.destination_wallet} onChange={e => setForm(f => ({ ...f, destination_wallet: e.target.value }))} placeholder="Wallet ID or address" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Origin Currency</Label>
                    <Select value={form.origin_currency} onValueChange={v => setForm(f => ({ ...f, origin_currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Destination Currency</Label>
                    <Select value={form.destination_currency} onValueChange={v => setForm(f => ({ ...f, destination_currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div>
                  <Label>Corridor</Label>
                  <Select value={form.corridor_id} onValueChange={v => setForm(f => ({ ...f, corridor_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select corridor" /></SelectTrigger>
                    <SelectContent>{CORRIDORS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={createSettlement} className="w-full">Queue Settlement</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ArrowRightLeft className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Settlements</p><p className="text-2xl font-bold">{settlements.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Total Volume</p><p className="text-2xl font-bold">${totalVolume.toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><Zap className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Settled</p><p className="text-2xl font-bold">{settledCount}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Avg Risk Score</p><p className="text-2xl font-bold">{avgRisk}</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="ledger">
          <TabsList>
            <TabsTrigger value="ledger">Settlement Ledger</TabsTrigger>
            <TabsTrigger value="corridors">Corridor Map</TabsTrigger>
          </TabsList>

          <TabsContent value="ledger">
            <Card>
              <CardHeader><CardTitle>Settlement Transactions</CardTitle><CardDescription>Real-time cross-border B2B settlements</CardDescription></CardHeader>
              <CardContent>
                {settlements.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No settlements yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Corridor</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>FX Rate</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>AML</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {settlements.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.origin_currency} → {s.destination_currency}</TableCell>
                          <TableCell>{s.origin_currency} {(s.amount || 0).toLocaleString()}</TableCell>
                          <TableCell>{s.fx_rate_locked?.toFixed(4) || "-"}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(s.settlement_status)}>{s.settlement_status}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{s.risk_score}</Badge></TableCell>
                          <TableCell><Badge variant={s.sanctions_clear ? "default" : "destructive"}>{s.sanctions_clear ? "Clear" : "Flagged"}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="corridors">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" /> Active Trade Corridors</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CORRIDORS.map(c => {
                    const corr = settlements.filter(s => s.corridor_id === c.id);
                    const vol = corr.reduce((sum, r) => sum + (r.amount || 0), 0);
                    return (
                      <Card key={c.id} className="bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm">{c.label}</span>
                            <Badge variant="outline">{c.from}/{c.to}</Badge>
                          </div>
                          <div className="text-2xl font-bold">{vol.toLocaleString()}</div>
                          <p className="text-xs text-muted-foreground">{corr.length} transactions</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default PanAfricanSettlement;
