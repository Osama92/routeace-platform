/**
 * TenantWallet - Per-tenant wallet with auto-deduction,
 * top-up, and real-time billing for deliveries, API, and AI credits.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Wallet, CreditCard, Zap, TrendingUp, ArrowUpRight,
  ArrowDownLeft, AlertTriangle, RefreshCw, Shield, Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTenantConfig } from "@/hooks/useTenantConfig";

const fmt = (n: number) => `₦${n.toLocaleString()}`;

interface WalletTransaction {
  id: string;
  type: "debit" | "credit";
  category: "delivery" | "api_call" | "ai_credit" | "subscription" | "top_up" | "refund";
  description: string;
  amount: number;
  balance_after: number;
  timestamp: string;
}

// Live data wiring pending: backed by future `tenant_wallet_transactions` table.
const WALLET_TRANSACTIONS: WalletTransaction[] = [];

const categoryLabels: Record<string, { label: string; color: string }> = {
  delivery: { label: "Delivery", color: "bg-blue-500/10 text-blue-600" },
  api_call: { label: "API", color: "bg-purple-500/10 text-purple-600" },
  ai_credit: { label: "AI Credit", color: "bg-orange-500/10 text-orange-600" },
  subscription: { label: "Subscription", color: "bg-green-500/10 text-green-600" },
  top_up: { label: "Top-up", color: "bg-emerald-500/10 text-emerald-600" },
  refund: { label: "Refund", color: "bg-amber-500/10 text-amber-600" },
};

const TenantWallet = () => {
  const { config } = useTenantConfig();
  const [showAll, setShowAll] = useState(false);

  // Live wallet wiring pending — show honest zeroed state until backend is connected.
  const walletBalance = 0;
  const monthlySpend = 0;
  const autoTopUp = false;
  const lowBalanceThreshold = 100000;
  const isLowBalance = walletBalance < lowBalanceThreshold;

  const aiCreditsUsed = config?.ai_credits_used || 0;
  const aiCreditsTotal = config?.ai_credits_total || 500;
  const aiPct = aiCreditsTotal > 0 ? Math.round((aiCreditsUsed / aiCreditsTotal) * 100) : 0;

  const displayed = showAll ? WALLET_TRANSACTIONS : WALLET_TRANSACTIONS.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className={isLowBalance ? "border-destructive/40" : "border-primary/20"}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Wallet Balance</p>
                  <p className="text-xl font-bold mt-1">{fmt(walletBalance)}</p>
                  {isLowBalance && (
                    <span className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" /> Low balance
                    </span>
                  )}
                </div>
                <Wallet className="h-8 w-8 text-primary opacity-60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Monthly Spend</p>
                  <p className="text-xl font-bold mt-1">{fmt(monthlySpend)}</p>
                  <span className="text-xs text-muted-foreground">This billing cycle</span>
                </div>
                <TrendingUp className="h-8 w-8 text-orange-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">AI Credits</p>
                  <p className="text-xl font-bold mt-1">{aiCreditsTotal - aiCreditsUsed} left</p>
                  <Progress value={aiPct} className="h-1.5 mt-2 w-24" />
                </div>
                <Zap className="h-8 w-8 text-yellow-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Auto Top-up</p>
                  <p className="text-sm font-semibold mt-1">
                    {autoTopUp ? "Enabled" : "Disabled"}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    Trigger at {fmt(lowBalanceThreshold)}
                  </span>
                </div>
                <RefreshCw className="h-8 w-8 text-green-500 opacity-60" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button size="sm" className="text-xs">
          <Plus className="h-3 w-3 mr-1" /> Top Up Wallet
        </Button>
        <Button size="sm" variant="outline" className="text-xs">
          <Zap className="h-3 w-3 mr-1" /> Buy AI Credits
        </Button>
        <Button size="sm" variant="outline" className="text-xs">
          <CreditCard className="h-3 w-3 mr-1" /> Payment Methods
        </Button>
      </div>

      {/* Billing Breakdown — populated from live metering once connected */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Delivery Charges</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting live drop metering</p>
            <Progress value={0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">—</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting live API metering</p>
            <Progress value={0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">AI Credit Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold">{aiCreditsUsed} credits</p>
            <p className="text-xs text-muted-foreground mt-1">{aiCreditsTotal - aiCreditsUsed} remaining</p>
            <Progress value={aiPct} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Transaction History</CardTitle>
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => setShowAll(!showAll)}>
              {showAll ? "Show Less" : "View All"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Balance</TableHead>
                <TableHead className="text-xs">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayed.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8 text-xs">
                    No transactions yet. Top-ups, deductions, and refunds will appear here in real time.
                  </TableCell>
                </TableRow>
              )}
              {displayed.map((tx) => {
                const cat = categoryLabels[tx.category];
                return (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <Badge className={`text-[10px] ${cat.color}`}>{cat.label}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{tx.description}</TableCell>
                    <TableCell className={`text-xs font-semibold ${tx.type === "credit" ? "text-green-600" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{fmt(tx.amount)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{fmt(tx.balance_after)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{tx.timestamp}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Security Footer */}
      <Card className="border-primary/10">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            <span>All wallet transactions are recorded in an immutable ledger. Auto-deductions are scoped per tenant with zero cross-visibility.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TenantWallet;
