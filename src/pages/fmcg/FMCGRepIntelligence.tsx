import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { UserCheck, MapPin, Target, Clock } from "lucide-react";

const reps = [
  { name: "Adewale Johnson", territory: "Lagos Mainland", visits: 18, target: 22, orders: 14, value: "₦1.2M", compliance: 92, collections: "₦890K" },
  { name: "Chioma Okafor", territory: "Lagos Island", visits: 20, target: 22, orders: 16, value: "₦1.8M", compliance: 95, collections: "₦1.1M" },
  { name: "Ibrahim Musa", territory: "Abuja Central", visits: 15, target: 20, orders: 11, value: "₦980K", compliance: 78, collections: "₦620K" },
  { name: "Grace Eze", territory: "Port Harcourt", visits: 12, target: 18, orders: 9, value: "₦720K", compliance: 68, collections: "₦480K" },
  { name: "Yusuf Bello", territory: "Kano Metro", visits: 16, target: 20, orders: 13, value: "₦1.1M", compliance: 82, collections: "₦750K" },
  { name: "Funmi Adeyemi", territory: "Ibadan", visits: 19, target: 20, orders: 15, value: "₦1.4M", compliance: 96, collections: "₦1.0M" },
];

const teamKPIs = [
  { label: "Total Reps Active", value: "89", icon: UserCheck },
  { label: "Avg Visit Compliance", value: "84%", icon: MapPin },
  { label: "Avg Conversion Rate", value: "72%", icon: Target },
  { label: "Avg Time per Visit", value: "18 min", icon: Clock },
];

const FMCGRepIntelligence = () => (
  <FMCGLayout title="Sales Rep Intelligence" subtitle="Individual rep performance, visit compliance & incentive tracking">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {teamKPIs.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <kpi.icon className="w-8 h-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <Card>
      <CardHeader><CardTitle>Rep Performance Board</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-4">
          {reps.map((rep, i) => (
            <div key={rep.name} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                  <div>
                    <p className="font-semibold">{rep.name}</p>
                    <p className="text-sm text-muted-foreground">{rep.territory}</p>
                  </div>
                </div>
                <Badge variant={rep.compliance >= 90 ? "default" : rep.compliance >= 75 ? "secondary" : "destructive"}>
                  {rep.compliance}% compliance
                </Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                <div><span className="text-muted-foreground">Visits</span><p className="font-semibold">{rep.visits}/{rep.target}</p></div>
                <div><span className="text-muted-foreground">Orders</span><p className="font-semibold">{rep.orders}</p></div>
                <div><span className="text-muted-foreground">Order Value</span><p className="font-semibold">{rep.value}</p></div>
                <div><span className="text-muted-foreground">Collections</span><p className="font-semibold">{rep.collections}</p></div>
                <div><span className="text-muted-foreground">Conversion</span><p className="font-semibold">{Math.round((rep.orders / rep.visits) * 100)}%</p></div>
              </div>
              <Progress value={(rep.visits / rep.target) * 100} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </FMCGLayout>
);

export default FMCGRepIntelligence;
