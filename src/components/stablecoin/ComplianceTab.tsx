import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle } from "lucide-react";
import { type StablecoinTransaction, getRiskBadge, getAmlBadge } from "./TransactionLogTab";

interface ComplianceTabProps {
  transactions: StablecoinTransaction[];
}

const complianceChecks = [
  { check: "Sanctions Screening (OFAC/EU/UN)", result: "pass", count: 3 },
  { check: "Mixer Exposure Detection", result: "flag", count: 1 },
  { check: "Jurisdiction Risk Assessment", result: "pass", count: 4 },
  { check: "Round-Number Anomaly", result: "pass", count: 0 },
  { check: "Rapid Repeat Detection", result: "pass", count: 0 },
  { check: "Blacklisted Wallet Check", result: "flag", count: 1 },
];

const ComplianceTab = ({ transactions }: ComplianceTabProps) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Sender Transparency Report</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {transactions.map(tx => (
          <div key={tx.id} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm">{tx.hash}</span>
              {getAmlBadge(tx.amlFlag)}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Wallet Age:</span> <span className="font-medium">{tx.walletAge} days</span></div>
              <div><span className="text-muted-foreground">Exchange:</span> <span className="font-medium">{tx.exchangeSource}</span></div>
              <div><span className="text-muted-foreground">Jurisdiction:</span> <span className="font-medium">{tx.country}</span></div>
              <div><span className="text-muted-foreground">Risk Score:</span> {getRiskBadge(tx.riskScore)}</div>
            </div>
            <Progress value={tx.riskScore} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Compliance Checks</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {complianceChecks.map((c, i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
            <span className="text-sm font-medium">{c.check}</span>
            <div className="flex items-center gap-2">
              {c.count > 0 && <Badge variant="secondary">{c.count} flagged</Badge>}
              {c.result === "pass" ? (
                <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

export default ComplianceTab;
