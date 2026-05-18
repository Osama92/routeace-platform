import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet, Plus, ArrowUpRight, ArrowDownLeft, Lock, Shield,
  AlertTriangle, RefreshCw, Building2, DollarSign
} from "lucide-react";

interface WalletRecord {
  id: string;
  wallet_type: string;
  wallet_name: string;
  balance: number;
  currency: string;
  status: string;
  kyc_verified: boolean;
  aml_flagged: boolean;
  owner_type: string;
}

interface WalletTxn {
  id: string;
  wallet_id: string;
  transaction_type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  status: string;
  fraud_risk_score: number;
  created_at: string;
}

const walletTypeLabels: Record<string, string> = {
  operating: "Operating Account",
  escrow: "Escrow Account",
  tax_vat: "VAT Reserve",
  tax_wht: "WHT Reserve",
  insurance: "Insurance Premium",
  driver: "Driver Wallet",
  vendor: "Vendor Wallet",
};

const formatCurrency = (amount: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency, minimumFractionDigits: 0 }).format(amount);

const EmbeddedBanking = () => {
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [transactions, setTransactions] = useState<WalletTxn[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [txnOpen, setTxnOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletRecord | null>(null);
  const [txnForm, setTxnForm] = useState({ type: "credit", amount: "", description: "" });
  const [walletForm, setWalletForm] = useState({ wallet_type: "operating", wallet_name: "" });
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchWallets = useCallback(async () => {
    const { data } = await supabase.from("wallets").select("*").order("created_at");
    setWallets((data as WalletRecord[]) || []);
    setLoading(false);
  }, []);

  const fetchTransactions = useCallback(async () => {
    const { data } = await supabase.from("wallet_transactions").select("*").order("created_at", { ascending: false }).limit(100);
    setTransactions((data as WalletTxn[]) || []);
  }, []);

  useEffect(() => { fetchWallets(); fetchTransactions(); }, [fetchWallets, fetchTransactions]);

  const createWallet = async () => {
    if (!walletForm.wallet_name.trim()) return;
    const { error } = await supabase.from("wallets").insert({
      wallet_type: walletForm.wallet_type,
      wallet_name: walletForm.wallet_name,
      currency: "NGN",
      owner_type: "company",
    } as never);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Wallet Created" });
    setCreateOpen(false);
    setWalletForm({ wallet_type: "operating", wallet_name: "" });
    fetchWallets();
  };

  const processTransaction = async () => {
    if (!selectedWallet || !txnForm.amount) return;
    const amount = parseFloat(txnForm.amount);
    if (isNaN(amount) || amount <= 0) return;

    const isDebit = txnForm.type === "debit";
    if (isDebit && amount > selectedWallet.balance) {
      toast({ title: "Insufficient Balance", variant: "destructive" }); return;
    }

    const balanceBefore = selectedWallet.balance;
    const balanceAfter = isDebit ? balanceBefore - amount : balanceBefore + amount;
    const fraudScore = amount > 5000000 ? 65 : amount > 1000000 ? 35 : 10;
    const needsApproval = amount > 5000000;

    const { error: txnError } = await supabase.from("wallet_transactions").insert({
      wallet_id: selectedWallet.id,
      transaction_type: txnForm.type,
      amount,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      description: txnForm.description,
      status: needsApproval ? "pending" : "completed",
      requires_approval: needsApproval,
      fraud_risk_score: fraudScore,
      created_by: user?.id,
    } as never);
    if (txnError) { toast({ title: "Error", description: txnError.message, variant: "destructive" }); return; }

    if (!needsApproval) {
      await supabase.from("wallets").update({ balance: balanceAfter, updated_at: new Date().toISOString() } as never).eq("id", selectedWallet.id);
    }

    // GL sync - double entry
    if (!needsApproval) {
      await supabase.from("accounting_ledger").insert([
        {
          entry_date: new Date().toISOString().split("T")[0],
          reference_type: "wallet_transaction",
          reference_id: selectedWallet.id,
          account_name: selectedWallet.wallet_type === "operating" ? "cash" : selectedWallet.wallet_type,
          account_type: "asset",
          debit: isDebit ? 0 : amount,
          credit: isDebit ? amount : 0,
          description: `Wallet ${txnForm.type}: ${txnForm.description}`,
          currency_code: "NGN",
        },
        {
          entry_date: new Date().toISOString().split("T")[0],
          reference_type: "wallet_transaction",
          reference_id: selectedWallet.id,
          account_name: isDebit ? "accounts_payable" : "accounts_receivable",
          account_type: isDebit ? "liability" : "asset",
          debit: isDebit ? amount : 0,
          credit: isDebit ? 0 : amount,
          description: `Wallet ${txnForm.type} contra: ${txnForm.description}`,
          currency_code: "NGN",
        },
      ] as never);
    }

    toast({ title: needsApproval ? "Pending Approval" : "Transaction Processed", description: needsApproval ? "Amount exceeds ₦5M - requires Super Admin approval" : `${formatCurrency(amount)} ${txnForm.type}ed` });
    setTxnOpen(false);
    setTxnForm({ type: "credit", amount: "", description: "" });
    fetchWallets();
    fetchTransactions();
  };

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const amlFlagged = wallets.filter(w => w.aml_flagged).length;

  return (
    <DashboardLayout title="Embedded Banking" subtitle="Multi-wallet infrastructure with escrow, tax separation, and compliance">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Wallet className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Total Balance</span></div>
          <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Building2 className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Active Wallets</span></div>
          <p className="text-2xl font-bold">{wallets.filter(w => w.status === "active").length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><Shield className="w-4 h-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">KYC Verified</span></div>
          <p className="text-2xl font-bold">{wallets.filter(w => w.kyc_verified).length}/{wallets.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="text-xs text-muted-foreground">AML Flagged</span></div>
          <p className="text-2xl font-bold">{amlFlagged}</p>
        </CardContent></Card>
      </div>

      <div className="flex justify-end gap-2 mb-4">
        <Button variant="outline" onClick={() => { fetchWallets(); fetchTransactions(); }}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />Create Wallet</Button>
      </div>

      <Tabs defaultValue="wallets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="wallets">Wallets</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="wallets">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {wallets.map((w) => (
              <Card key={w.id} className="relative">
                {w.status === "frozen" && <div className="absolute top-2 right-2"><Lock className="w-4 h-4 text-destructive" /></div>}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{w.wallet_name}</CardTitle>
                  <CardDescription>{walletTypeLabels[w.wallet_type] || w.wallet_type}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold mb-3">{formatCurrency(w.balance, w.currency)}</p>
                  <div className="flex gap-2 mb-3">
                    <Badge variant={w.status === "active" ? "default" : "destructive"}>{w.status}</Badge>
                    {w.kyc_verified && <Badge variant="outline"><Shield className="w-3 h-3 mr-1" />KYC</Badge>}
                    {w.aml_flagged && <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />AML</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { setSelectedWallet(w); setTxnForm({ ...txnForm, type: "credit" }); setTxnOpen(true); }}>
                      <ArrowDownLeft className="w-3 h-3 mr-1" />Credit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setSelectedWallet(w); setTxnForm({ ...txnForm, type: "debit" }); setTxnOpen(true); }}>
                      <ArrowUpRight className="w-3 h-3 mr-1" />Debit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {wallets.length === 0 && !loading && (
              <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />No wallets created yet.
              </CardContent></Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Before</TableHead>
                    <TableHead>After</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant={t.transaction_type === "credit" ? "default" : "secondary"}>{t.transaction_type}</Badge></TableCell>
                      <TableCell className="font-semibold">{formatCurrency(t.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatCurrency(t.balance_before)}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(t.balance_after)}</TableCell>
                      <TableCell><Badge variant={t.status === "completed" ? "default" : t.status === "pending" ? "secondary" : "destructive"}>{t.status}</Badge></TableCell>
                      <TableCell><span className={t.fraud_risk_score > 50 ? "text-destructive font-semibold" : "text-muted-foreground"}>{t.fraud_risk_score}</span></TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{t.description}</TableCell>
                    </TableRow>
                  ))}
                  {transactions.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No transactions</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>KYC Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {wallets.map((w) => (
                  <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <span className="text-sm">{w.wallet_name}</span>
                    <Badge variant={w.kyc_verified ? "default" : "destructive"}>{w.kyc_verified ? "Verified" : "Pending"}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Transaction Limits</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Single Transaction Approval Threshold</p>
                  <p className="text-lg font-bold">₦5,000,000</p>
                  <p className="text-xs text-muted-foreground">Transactions above this require Super Admin approval</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Multi-Sig Threshold</p>
                  <p className="text-lg font-bold">₦20,000,000</p>
                  <p className="text-xs text-muted-foreground">Requires Owner + Super Admin dual authorization</p>
                </div>
                <div className="p-3 rounded-lg bg-secondary/30">
                  <p className="text-sm font-medium">Fraud Risk Alert Level</p>
                  <p className="text-lg font-bold">Score &gt; 50</p>
                  <p className="text-xs text-muted-foreground">Transactions auto-flagged for review</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Wallet Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Wallet</DialogTitle><DialogDescription>Add a new wallet to the banking infrastructure</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Wallet Type</Label>
              <Select value={walletForm.wallet_type} onValueChange={(v) => setWalletForm(p => ({ ...p, wallet_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(walletTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Wallet Name</Label>
              <Input value={walletForm.wallet_name} onChange={(e) => setWalletForm(p => ({ ...p, wallet_name: e.target.value }))} placeholder="e.g. Main Operating Account" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={createWallet}>Create Wallet</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog open={txnOpen} onOpenChange={setTxnOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{txnForm.type === "credit" ? "Credit" : "Debit"} Wallet</DialogTitle>
            <DialogDescription>{selectedWallet?.wallet_name} - Balance: {formatCurrency(selectedWallet?.balance || 0)}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input type="number" value={txnForm.amount} onChange={(e) => setTxnForm(p => ({ ...p, amount: e.target.value }))} placeholder="Enter amount" />
              {parseFloat(txnForm.amount) > 5000000 && (
                <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Amount exceeds ₦5M - will require approval</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={txnForm.description} onChange={(e) => setTxnForm(p => ({ ...p, description: e.target.value }))} placeholder="Transaction description" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setTxnOpen(false)}>Cancel</Button>
            <Button onClick={processTransaction}>{txnForm.type === "credit" ? "Credit" : "Debit"} {txnForm.amount && formatCurrency(parseFloat(txnForm.amount))}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmbeddedBanking;
