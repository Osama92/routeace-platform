import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt, CheckCircle, AlertTriangle, Clock } from "lucide-react";

const reconciliationItems = [
  { order: "ORD-4521", outlet: "ShopRite Ikeja", ordered: 240, delivered: 240, variance: 0, invoiced: true, status: "matched" },
  { order: "ORD-4520", outlet: "Spar Lekki", ordered: 180, delivered: 175, variance: -5, invoiced: true, status: "discrepancy" },
  { order: "ORD-4519", outlet: "Game VI", ordered: 100, delivered: 100, variance: 0, invoiced: false, status: "pending_invoice" },
  { order: "ORD-4518", outlet: "Justrite Oshodi", ordered: 320, delivered: 300, variance: -20, invoiced: false, status: "discrepancy" },
  { order: "ORD-4517", outlet: "Market Square", ordered: 150, delivered: 150, variance: 0, invoiced: true, status: "matched" },
];

const FMCGReconciliation = () => {
  const matched = reconciliationItems.filter(r => r.status === "matched").length;
  const discrepancies = reconciliationItems.filter(r => r.status === "discrepancy").length;

  return (
    <FMCGLayout title="Zero-Touch Reconciliation" subtitle="Automated order-to-delivery-to-invoice matching">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Auto-Matched", value: `${matched}/${reconciliationItems.length}`, icon: CheckCircle, color: "text-green-600" },
          { label: "Discrepancies", value: String(discrepancies), icon: AlertTriangle, color: "text-red-600" },
          { label: "Pending Invoice", value: "2", icon: Clock, color: "text-orange-600" },
          { label: "Reconciliation Rate", value: "96.4%", icon: Receipt, color: "text-blue-600" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className={`w-8 h-8 ${m.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Reconciliation Pipeline</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {reconciliationItems.map((r) => (
              <div key={r.order} className="flex items-center gap-4 py-3 border-b last:border-0">
                <span className="font-mono text-sm w-24">{r.order}</span>
                <span className="flex-1 font-medium">{r.outlet}</span>
                <span className="text-sm w-20">Ord: {r.ordered}</span>
                <span className="text-sm w-20">Del: {r.delivered}</span>
                <span className={`text-sm w-16 font-medium ${r.variance < 0 ? "text-red-600" : "text-green-600"}`}>
                  {r.variance === 0 ? "✓ Match" : `${r.variance} units`}
                </span>
                <Badge variant={r.status === "matched" ? "default" : r.status === "discrepancy" ? "destructive" : "secondary"}>
                  {r.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </FMCGLayout>
  );
};

export default FMCGReconciliation;
