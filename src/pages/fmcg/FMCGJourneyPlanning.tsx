import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Compass, MapPin, Clock, TrendingUp, Package, CreditCard } from "lucide-react";

const journeyPlans = [
  {
    rep: "Adewale Johnson",
    cluster: "Lagos Mainland Cluster",
    outlets: 12,
    estRevenue: "₦1.8M",
    travelTime: "4.2 hrs",
    saturation: 78,
    restockItems: 34,
    priority: [
      { name: "ShopRite Ikeja", reason: "High restock probability (92%)", value: "₦420K" },
      { name: "Mama Nkechi Store", reason: "Credit renewal due", value: "₦85K" },
      { name: "Market Square Surulere", reason: "New outlet - onboarding visit", value: "₦150K" },
    ],
  },
  {
    rep: "Chioma Okafor",
    cluster: "Ogun Peri-Urban Corridor",
    outlets: 8,
    estRevenue: "₦920K",
    travelTime: "5.1 hrs",
    saturation: 54,
    restockItems: 22,
    priority: [
      { name: "Abeokuta Central Market", reason: "SKU gap detected - 4 missing categories", value: "₦280K" },
      { name: "Ijebu Ode Supermarket", reason: "High-value seasonal demand", value: "₦340K" },
    ],
  },
  {
    rep: "Ibrahim Musa",
    cluster: "South-East Regional Route",
    outlets: 10,
    estRevenue: "₦1.1M",
    travelTime: "6.3 hrs",
    saturation: 62,
    restockItems: 28,
    priority: [
      { name: "Enugu Main Dist.", reason: "Distributor performance review", value: "₦520K" },
      { name: "Nsukka Pharmacy Chain", reason: "Competitor pricing alert", value: "₦180K" },
    ],
  },
];

const FMCGJourneyPlanning = () => (
  <FMCGLayout title="AI-Guided Regional Journey Planning" subtitle="Dynamic, data-backed journey maps - no static beat sheets">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: "Active Journeys", value: "89", icon: Compass, color: "text-primary" },
        { label: "Outlets Scheduled", value: "847", icon: MapPin, color: "text-emerald-600" },
        { label: "Avg Travel Efficiency", value: "82%", icon: Clock, color: "text-blue-600" },
        { label: "Revenue Opportunity", value: "₦18.4M", icon: TrendingUp, color: "text-green-600" },
      ].map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
            <div>
              <p className="text-sm text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    <div className="space-y-6">
      {journeyPlans.map((plan) => (
        <Card key={plan.rep}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{plan.rep}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">{plan.cluster}</p>
              </div>
              <Badge variant="secondary">{plan.outlets} outlets</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-green-600" /><div><span className="text-muted-foreground">Est. Revenue</span><p className="font-semibold">{plan.estRevenue}</p></div></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-600" /><div><span className="text-muted-foreground">Travel Time</span><p className="font-semibold">{plan.travelTime}</p></div></div>
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-orange-600" /><div><span className="text-muted-foreground">Saturation</span><p className="font-semibold">{plan.saturation}%</p></div></div>
              <div className="flex items-center gap-2"><Package className="w-4 h-4 text-purple-600" /><div><span className="text-muted-foreground">Restock Items</span><p className="font-semibold">{plan.restockItems}</p></div></div>
            </div>
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Priority Outlets</p>
              <div className="space-y-2">
                {plan.priority.map((p) => (
                  <div key={p.name} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.reason}</p>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </FMCGLayout>
);

export default FMCGJourneyPlanning;
