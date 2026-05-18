import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, Shield, Globe, FileCheck } from "lucide-react";
import { DataZeroState } from "@/components/shared/DataZeroState";

type CBDCTx = {
  id: string;
  country: string;
  code: string;
  amount: number;
  compliance: string;
  status: string;
};

// Live data wiring pending: backed by future `cbdc_transactions` table.
const transactions: CBDCTx[] = [];

const CBDCIntegration = () => {
  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0);
  const settledCount = transactions.filter((t) => t.status === "completed").length;
  const complianceRate = transactions.length
    ? Math.round((transactions.filter((t) => t.compliance === "compliant").length / transactions.length) * 100)
    : 0;

  return (
    <DashboardLayout title="CBDC Integration Layer" subtitle="Sovereign digital currency settlement infrastructure">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Landmark className="h-5 w-5 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Total Volume</p><p className="text-2xl font-bold">{transactions.length ? `₦${(totalVolume / 1e6).toFixed(1)}M` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><FileCheck className="h-5 w-5 text-emerald-500" /></div>
            <div><p className="text-sm text-muted-foreground">Settled</p><p className="text-2xl font-bold">{transactions.length ? `${settledCount}/${transactions.length}` : "—"}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><Globe className="h-5 w-5 text-blue-500" /></div>
            <div><p className="text-sm text-muted-foreground">Active CBDCs</p><p className="text-2xl font-bold">{new Set(transactions.map((t) => t.code)).size}</p></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-500" /></div>
            <div><p className="text-sm text-muted-foreground">Compliance Rate</p><p className="text-2xl font-bold">{transactions.length ? `${complianceRate}%` : "—"}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>CBDC Transaction Log</CardTitle></CardHeader>
        <CardContent>
          <DataZeroState
            icon={Landmark}
            title="No CBDC transactions yet"
            description="Programmable settlements across eNaira, eCedi, eRand and other CBDCs will appear here once the corresponding rails are connected."
          />
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default CBDCIntegration;
