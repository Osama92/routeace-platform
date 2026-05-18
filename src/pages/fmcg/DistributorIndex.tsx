import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, TrendingUp, AlertTriangle, Award } from "lucide-react";

const distributors = [
  { name: "Lagos Prime Dist.", region: "Lagos", fill: 96, payment: 5, coverage: 94, promo: 88, delivery: 97, leakage: 1.2, index: 94, rank: 1 },
  { name: "Abuja Star Logistics", region: "FCT", fill: 91, payment: 8, coverage: 89, promo: 82, delivery: 93, leakage: 3.4, index: 87, rank: 2 },
  { name: "Delta Direct Supply", region: "Delta", fill: 84, payment: 12, coverage: 76, promo: 71, delivery: 85, leakage: 6.8, index: 72, rank: 3 },
  { name: "Kano Metro Dist.", region: "Kano", fill: 78, payment: 18, coverage: 68, promo: 65, delivery: 79, leakage: 9.2, index: 63, rank: 4 },
  { name: "PH River Logistics", region: "Rivers", fill: 72, payment: 22, coverage: 62, promo: 58, delivery: 71, leakage: 12.1, index: 54, rank: 5 },
];

const DistributorIndex = () => {
  return (
    <FMCGLayout title="Distributor Intelligence Index" subtitle="Performance scoring, risk detection & growth analysis">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Distributors", value: "34", icon: Users },
          { label: "Avg Performance", value: "74.2", icon: TrendingUp },
          { label: "High Risk", value: "5", icon: AlertTriangle },
          { label: "Top Performer", value: "Lagos Prime", icon: Award },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Distributor Performance Scoreboard</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3">#</th>
                  <th className="pb-3">Distributor</th>
                  <th className="pb-3">Region</th>
                  <th className="pb-3">Fill Rate</th>
                  <th className="pb-3">Payment (days)</th>
                  <th className="pb-3">Coverage</th>
                  <th className="pb-3">Promo Exec</th>
                  <th className="pb-3">Delivery</th>
                  <th className="pb-3">Leakage</th>
                  <th className="pb-3">Index</th>
                </tr>
              </thead>
              <tbody>
                {distributors.map((d) => (
                  <tr key={d.name} className="border-b last:border-0">
                    <td className="py-3 font-bold">{d.rank}</td>
                    <td className="py-3 font-medium">{d.name}</td>
                    <td className="py-3">{d.region}</td>
                    <td className="py-3">{d.fill}%</td>
                    <td className="py-3">{d.payment}d</td>
                    <td className="py-3">{d.coverage}%</td>
                    <td className="py-3">{d.promo}%</td>
                    <td className="py-3">{d.delivery}%</td>
                    <td className="py-3">
                      <span className={d.leakage > 8 ? "text-red-600 font-bold" : d.leakage > 4 ? "text-orange-600" : "text-green-600"}>{d.leakage}%</span>
                    </td>
                    <td className="py-3">
                      <Badge variant={d.index > 80 ? "default" : d.index > 60 ? "secondary" : "destructive"}>{d.index}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </FMCGLayout>
  );
};

export default DistributorIndex;
