import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";

const suppliers = [
  { name: "De United Foods", rating: 4.8, onTime: 96, qualityScore: 98, fillRate: 94, avgLeadDays: 3.2, totalOrders: 142, defectRate: 0.4, trend: "up" },
  { name: "Dangote Industries", rating: 4.6, onTime: 92, qualityScore: 97, fillRate: 91, avgLeadDays: 2.8, totalOrders: 98, defectRate: 0.8, trend: "stable" },
  { name: "Nestle Nigeria", rating: 4.9, onTime: 98, qualityScore: 99, fillRate: 97, avgLeadDays: 3.0, totalOrders: 186, defectRate: 0.2, trend: "up" },
  { name: "FrieslandCampina", rating: 4.3, onTime: 84, qualityScore: 95, fillRate: 88, avgLeadDays: 5.1, totalOrders: 76, defectRate: 1.2, trend: "down" },
  { name: "Flour Mills Nig.", rating: 4.5, onTime: 89, qualityScore: 96, fillRate: 90, avgLeadDays: 4.0, totalOrders: 112, defectRate: 0.6, trend: "stable" },
];

const SupplierIntelligence = () => (
  <Card>
    <CardHeader><CardTitle className="flex items-center gap-2"><Star className="w-5 h-5" /> Supplier Scorecard</CardTitle></CardHeader>
    <CardContent>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-3 font-medium">Supplier</th>
              <th className="pb-3 font-medium">Rating</th>
              <th className="pb-3 font-medium">On-Time %</th>
              <th className="pb-3 font-medium">Quality</th>
              <th className="pb-3 font-medium">Fill Rate</th>
              <th className="pb-3 font-medium">Avg Lead</th>
              <th className="pb-3 font-medium">Defect %</th>
              <th className="pb-3 font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.name} className="border-b last:border-0">
                <td className="py-3 font-medium">{s.name}</td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="font-bold">{s.rating}</span>
                  </div>
                </td>
                <td className="py-3"><span className={s.onTime > 93 ? "text-green-600 font-bold" : s.onTime > 85 ? "text-foreground" : "text-red-600"}>{s.onTime}%</span></td>
                <td className="py-3">{s.qualityScore}%</td>
                <td className="py-3">{s.fillRate}%</td>
                <td className="py-3">{s.avgLeadDays}d</td>
                <td className="py-3"><span className={s.defectRate > 1 ? "text-red-600" : "text-green-600"}>{s.defectRate}%</span></td>
                <td className="py-3">
                  <Badge variant={s.trend === "up" ? "default" : s.trend === "down" ? "destructive" : "secondary"}>
                    {s.trend === "up" ? "↑" : s.trend === "down" ? "↓" : "→"} {s.trend}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
);

export default SupplierIntelligence;
