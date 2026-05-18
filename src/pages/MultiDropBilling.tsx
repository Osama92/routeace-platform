import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Wallet, CreditCard, TrendingUp, AlertTriangle, Lock, Plus, RefreshCw,
  ArrowUpRight, ArrowDownRight, Package, Loader2, History
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const MultiDropBilling = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState(100);
  const [processing, setProcessing] = useState(false);

  const PRICE_PER_DROP = 50;

  useEffect(() => {
    fetchWalletData();
  }, []);

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [walletRes, txRes] = await Promise.all([
        supabase.from("drop_wallets").select("*").limit(1).single(),
        supabase.from("drop_transactions").select("*").order("created_at", { ascending: false }).limit(50),
      ]);
      setWallet(walletRes.data);
      setTransactions(txRes.data || []);
    } catch (error) {
      console.error("Failed to fetch wallet:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    if (rechargeAmount < 10) {
      toast({ title: "Minimum 10 drops", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const newBalance = (wallet?.balance_drops || 0) + rechargeAmount;
      
      if (wallet) {
        await supabase.from("drop_wallets").update({
          balance_drops: newBalance,
          total_purchased: (wallet.total_purchased || 0) + rechargeAmount,
          is_locked: false,
          locked_at: null,
          last_recharge_at: new Date().toISOString(),
        }).eq("id", wallet.id);

        await supabase.from("drop_transactions").insert({
          wallet_id: wallet.id,
          transaction_type: "recharge",
          amount: rechargeAmount,
          balance_after: newBalance,
          description: `Recharged ${rechargeAmount} drops (${formatCurrency(rechargeAmount * PRICE_PER_DROP)})`,
          created_by: user?.id,
        });
      }

      toast({ title: "Wallet Recharged", description: `Added ${rechargeAmount} drops to your wallet` });
      setRechargeOpen(false);
      fetchWalletData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const usagePercent = wallet ? Math.min(100, ((wallet.total_used || 0) / Math.max(1, wallet.total_purchased || 1)) * 100) : 0;
  const balancePercent = wallet ? Math.min(100, ((wallet.balance_drops || 0) / Math.max(1, wallet.total_purchased || 1)) * 100) : 0;
  const isLowBalance = balancePercent <= 20;

  return (
    <DashboardLayout title="Multi-Drop Billing" subtitle="Per-drop billing, wallet management & usage tracking">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Drop Balance",
            value: wallet?.balance_drops?.toLocaleString() || "0",
            sub: wallet?.is_locked ? "LOCKED" : "Active",
            icon: Wallet,
            color: wallet?.is_locked ? "text-destructive" : "text-primary",
            bg: wallet?.is_locked ? "bg-destructive/10" : "bg-primary/10",
          },
          {
            label: "Total Purchased",
            value: wallet?.total_purchased?.toLocaleString() || "0",
            sub: formatCurrency((wallet?.total_purchased || 0) * PRICE_PER_DROP),
            icon: CreditCard,
            color: "text-success",
            bg: "bg-success/10",
          },
          {
            label: "Total Used",
            value: wallet?.total_used?.toLocaleString() || "0",
            sub: `${usagePercent.toFixed(0)}% consumed`,
            icon: Package,
            color: "text-warning",
            bg: "bg-warning/10",
          },
          {
            label: "Rate",
            value: formatCurrency(PRICE_PER_DROP),
            sub: "Per drop",
            icon: TrendingUp,
            color: "text-muted-foreground",
            bg: "bg-muted",
          },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  {stat.label === "Drop Balance" && wallet?.is_locked && (
                    <Badge variant="destructive"><Lock className="w-3 h-3 mr-1" />Locked</Badge>
                  )}
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Balance Bar & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Drop Balance Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Remaining: {wallet?.balance_drops?.toLocaleString() || 0} drops</span>
                <span>{balancePercent.toFixed(0)}%</span>
              </div>
              <Progress value={balancePercent} className={isLowBalance ? "[&>div]:bg-destructive" : ""} />
            </div>
            {isLowBalance && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertTriangle className="w-4 h-4" />
                <span>Low balance! Recharge to avoid service interruption.</span>
              </div>
            )}
            {wallet?.is_locked && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <Lock className="w-4 h-4" />
                <span>Wallet is locked. Recharge to resume drop billing.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full" onClick={() => setRechargeOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Recharge Drops
            </Button>
            <Button variant="outline" className="w-full" onClick={fetchWalletData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Balance
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="w-4 h-4" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No transactions yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge variant={tx.transaction_type === "recharge" ? "default" : "secondary"}>
                        {tx.transaction_type === "recharge" ? (
                          <ArrowUpRight className="w-3 h-3 mr-1" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 mr-1" />
                        )}
                        {tx.transaction_type}
                      </Badge>
                    </TableCell>
                    <TableCell className={tx.transaction_type === "recharge" ? "text-success" : "text-destructive"}>
                      {tx.transaction_type === "recharge" ? "+" : "-"}{tx.amount}
                    </TableCell>
                    <TableCell>{tx.balance_after}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recharge Dialog */}
      <Dialog open={rechargeOpen} onOpenChange={setRechargeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recharge Drop Wallet</DialogTitle>
            <DialogDescription>Add drops to your wallet at {formatCurrency(PRICE_PER_DROP)} per drop</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Number of Drops</Label>
              <Input type="number" min={10} value={rechargeAmount} onChange={(e) => setRechargeAmount(parseInt(e.target.value) || 0)} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 500, 1000].map((amt) => (
                <Button key={amt} variant="outline" size="sm" onClick={() => setRechargeAmount(amt)}>
                  {amt}
                </Button>
              ))}
            </div>
            <div className="p-4 rounded-lg bg-muted/50 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Drops</span><span>{rechargeAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Rate</span><span>{formatCurrency(PRICE_PER_DROP)}/drop</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2 mt-2">
                <span>Total</span><span>{formatCurrency(rechargeAmount * PRICE_PER_DROP)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeOpen(false)}>Cancel</Button>
            <Button onClick={handleRecharge} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
              Confirm Recharge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default MultiDropBilling;
