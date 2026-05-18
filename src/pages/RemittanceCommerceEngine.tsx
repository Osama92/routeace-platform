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
import { Wallet, Send, ShoppingCart, Package, Truck, Zap, Plus, ArrowRight } from "lucide-react";

const PURPOSE_CODES = [
  { code: "freight_booking", label: "Freight Booking", icon: Truck },
  { code: "sme_inventory", label: "SME Inventory Purchase", icon: ShoppingCart },
  { code: "structured_delivery", label: "Structured Delivery Payment", icon: Package },
  { code: "customs_duty", label: "Customs Duty Funding", icon: Zap },
  { code: "trade_deposit", label: "Trade Deposit", icon: Wallet },
  { code: "utility_settlement", label: "Utility Bill Settlement", icon: Send },
];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-700",
    funded: "bg-blue-500/10 text-blue-700",
    in_escrow: "bg-purple-500/10 text-purple-700",
    disbursed: "bg-emerald-500/10 text-emerald-700",
    completed: "bg-emerald-500/10 text-emerald-700",
    failed: "bg-destructive/10 text-destructive",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const RemittanceCommerceEngine = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [remittances, setRemittances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    sender_country: "GB",
    receiver_country: "NG",
    purpose_code: "",
    amount: "",
    currency: "GBP",
    destination_currency: "NGN",
    escrow_flag: false,
    logistics_partner: "",
  });

  const fetchRemittances = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("remittance_wallets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setRemittances((data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchRemittances(); }, [fetchRemittances]);

  const createRemittance = async () => {
    if (!user || !form.purpose_code || !form.amount) {
      toast({ title: "Missing fields", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("remittance_wallets").insert({
      sender_user_id: user.id,
      sender_country: form.sender_country,
      receiver_country: form.receiver_country,
      purpose_code: form.purpose_code,
      amount: parseFloat(form.amount),
      currency: form.currency,
      destination_currency: form.destination_currency,
      escrow_flag: form.escrow_flag,
      logistics_partner: form.logistics_partner || null,
      risk_score: 0, // Computed downstream by AML signals; do not seed with random
      commerce_trigger_type: form.purpose_code,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Remittance Created", description: "Purpose-based remittance flow initiated." });
    setShowCreate(false);
    fetchRemittances();
  };

  const totalVolume = remittances.reduce((s, r) => s + (r.amount || 0), 0);
  const escrowCount = remittances.filter(r => r.escrow_flag).length;
  const completedCount = remittances.filter(r => r.status === "completed" || r.status === "disbursed").length;

  return (
    <DashboardLayout title="Remittance Commerce Engine" subtitle="Convert remittance into programmable commerce flows">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-7 w-7 text-primary" />
              Diaspora Remittance Commerce
            </h1>
            <p className="text-muted-foreground mt-1">Purpose-based remittance → commerce conversion engine</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Remittance</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Purpose-Based Remittance</DialogTitle>
                <DialogDescription>Link remittance to a structured commerce flow</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div>
                  <Label>Purpose</Label>
                  <Select value={form.purpose_code} onValueChange={v => setForm(f => ({ ...f, purpose_code: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>
                      {PURPOSE_CODES.map(p => <SelectItem key={p.code} value={p.code}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Amount</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["GBP", "USD", "EUR", "CAD", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From</Label>
                    <Select value={form.sender_country} onValueChange={v => setForm(f => ({ ...f, sender_country: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[{ c: "GB", l: "🇬🇧 UK" }, { c: "US", l: "🇺🇸 US" }, { c: "CA", l: "🇨🇦 Canada" }, { c: "AE", l: "🇦🇪 UAE" }, { c: "DE", l: "🇩🇪 Germany" }].map(x => <SelectItem key={x.c} value={x.c}>{x.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>To</Label>
                    <Select value={form.receiver_country} onValueChange={v => setForm(f => ({ ...f, receiver_country: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[{ c: "NG", l: "🇳🇬 Nigeria" }, { c: "KE", l: "🇰🇪 Kenya" }, { c: "GH", l: "🇬🇭 Ghana" }, { c: "ZA", l: "🇿🇦 South Africa" }].map(x => <SelectItem key={x.c} value={x.c}>{x.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={form.escrow_flag} onChange={e => setForm(f => ({ ...f, escrow_flag: e.target.checked }))} className="rounded" />
                  <Label>Lock funds in escrow until milestone completion</Label>
                </div>
                <Button onClick={createRemittance} className="w-full">Initiate Remittance Flow</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Purpose Categories */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {PURPOSE_CODES.map(p => {
            const count = remittances.filter(r => r.purpose_code === p.code).length;
            return (
              <Card key={p.code} className="bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="pt-4 text-center">
                  <p.icon className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-xs font-medium">{p.label}</p>
                  <p className="text-lg font-bold mt-1">{count}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Send className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Remittances</p><p className="text-2xl font-bold">{remittances.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Wallet className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Volume</p><p className="text-2xl font-bold">${totalVolume.toLocaleString()}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-purple-500/10"><Zap className="h-5 w-5 text-purple-600" /></div><div><p className="text-sm text-muted-foreground">In Escrow</p><p className="text-2xl font-bold">{escrowCount}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><ArrowRight className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{completedCount}</p></div></CardContent></Card>
        </div>

        {/* Remittance Table */}
        <Card>
          <CardHeader><CardTitle>Remittance Flows</CardTitle><CardDescription>Purpose-linked remittance transactions with commerce triggers</CardDescription></CardHeader>
          <CardContent>
            {remittances.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No remittance flows yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Escrow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remittances.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.remittance_id}</TableCell>
                      <TableCell>{r.sender_country} → {r.receiver_country}</TableCell>
                      <TableCell><Badge variant="outline">{(r.purpose_code || "").replace(/_/g, " ")}</Badge></TableCell>
                      <TableCell>{r.currency} {(r.amount || 0).toLocaleString()}</TableCell>
                      <TableCell>{r.escrow_flag ? <Badge>Escrow</Badge> : "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                      <TableCell><Badge variant="outline">{r.risk_score}</Badge></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</TableCell>
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

export default RemittanceCommerceEngine;
