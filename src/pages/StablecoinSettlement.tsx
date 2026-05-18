import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/hooks/usePermissions";
import { Shield, CheckCircle, AlertTriangle, Coins } from "lucide-react";
import TransactionLogTab, { type StablecoinTransaction } from "@/components/stablecoin/TransactionLogTab";
import ComplianceTab from "@/components/stablecoin/ComplianceTab";
import BusinessWalletsTab from "@/components/stablecoin/BusinessWalletsTab";
import FiatConversionTab from "@/components/stablecoin/FiatConversionTab";
import TreasuryExposureTab from "@/components/stablecoin/TreasuryExposureTab";

// Live data wiring pending: backed by future `stablecoin_transactions` table.
const transactions: StablecoinTransaction[] = [];

const StablecoinSettlement = () => {
  const { isSuperAdmin, isFinanceManager } = usePermissions();

  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0);
  const settledCount = transactions.filter((t) => t.status === "settled").length;
  const flaggedCount = transactions.filter((t) => t.amlFlag === "flagged").length;
  const avgRisk = transactions.length
    ? Math.round(transactions.reduce((s, t) => s + t.riskScore, 0) / transactions.length)
    : 0;

  return (
    <DashboardLayout title="Stablecoin Settlement Engine" subtitle="Compliant digital settlement with full transparency & AML enforcement">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Coins className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Volume</p><p className="text-2xl font-bold">{transactions.length ? `$${totalVolume.toLocaleString()}` : "—"}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-500" /></div><div><p className="text-sm text-muted-foreground">Settled</p><p className="text-2xl font-bold">{transactions.length ? `${settledCount}/${transactions.length}` : "—"}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Flagged</p><p className="text-2xl font-bold">{flaggedCount}</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-500" /></div><div><p className="text-sm text-muted-foreground">Avg Risk Score</p><p className="text-2xl font-bold">{transactions.length ? `${avgRisk}/100` : "—"}</p></div></div></CardContent></Card>
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transaction Log</TabsTrigger>
          {(isSuperAdmin || isFinanceManager) && <TabsTrigger value="compliance">AML & Compliance</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="wallets">Business Wallets</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="conversion">Fiat Conversion</TabsTrigger>}
          <TabsTrigger value="treasury">Treasury Exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions"><TransactionLogTab transactions={transactions} /></TabsContent>
        <TabsContent value="compliance"><ComplianceTab transactions={transactions} /></TabsContent>
        <TabsContent value="wallets"><BusinessWalletsTab /></TabsContent>
        <TabsContent value="conversion"><FiatConversionTab /></TabsContent>
        <TabsContent value="treasury"><TreasuryExposureTab /></TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default StablecoinSettlement;
