import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Route, Fuel, Clock, TrendingUp, MapPin, Truck, AlertTriangle, CheckCircle, Navigation } from "lucide-react";

const activeRoutes = [
  { id: "RT-101", name: "Lagos Island Express", driver: "Emeka O.", vehicle: "VAN-014", stops: 18, completed: 12, distance: "42km", fuel: "5.2L", eta: "16:30", efficiency: 91, status: "active" },
  { id: "RT-102", name: "Mainland Industrial", driver: "Adamu M.", vehicle: "VAN-008", stops: 22, completed: 22, distance: "58km", fuel: "7.1L", eta: "15:45", efficiency: 87, status: "completed" },
  { id: "RT-103", name: "Lekki-Ajah Corridor", driver: "Chidi N.", vehicle: "VAN-021", stops: 15, completed: 6, distance: "35km", fuel: "4.8L", eta: "17:15", efficiency: 78, status: "active" },
  { id: "RT-104", name: "Ikeja-Ogba Loop", driver: "Bola A.", vehicle: "VAN-003", stops: 20, completed: 0, distance: "31km", fuel: "3.9L", eta: "-", efficiency: 0, status: "pending" },
  { id: "RT-105", name: "Surulere-Yaba Ring", driver: "Ibrahim K.", vehicle: "VAN-017", stops: 16, completed: 14, distance: "28km", fuel: "3.4L", eta: "15:00", efficiency: 94, status: "active" },
];

const corridorAnalysis = [
  { corridor: "Lagos → Ibadan", avgTrips: 12, avgCost: "₦45K", margin: 22.4, fuelVar: -3.2, bottleneck: "Berger interchange", risk: "low" },
  { corridor: "Lagos → Abeokuta", avgTrips: 8, avgCost: "₦38K", margin: 18.6, fuelVar: +5.1, bottleneck: "Sango toll", risk: "medium" },
  { corridor: "Ikeja → Apapa", avgTrips: 24, avgCost: "₦18K", margin: 12.1, fuelVar: +12.4, bottleneck: "Apapa gridlock", risk: "high" },
  { corridor: "Lekki → Victoria Island", avgTrips: 18, avgCost: "₦12K", margin: 28.9, fuelVar: -1.8, bottleneck: "None", risk: "low" },
  { corridor: "Mainland → Ikorodu", avgTrips: 10, avgCost: "₦32K", margin: 15.3, fuelVar: +7.6, bottleneck: "Ketu flyover", risk: "medium" },
];

const fleetAllocation = [
  { vehicle: "VAN-003", type: "Refrigerated Van", capacity: "2.5T", utilization: 88, routes: 6, condition: "Good", nextService: "Mar 15" },
  { vehicle: "VAN-008", type: "Box Truck", capacity: "5T", utilization: 94, routes: 8, condition: "Excellent", nextService: "Apr 02" },
  { vehicle: "VAN-014", type: "Mini Van", capacity: "1.5T", utilization: 72, routes: 4, condition: "Fair", nextService: "Mar 10" },
  { vehicle: "VAN-017", type: "Box Truck", capacity: "5T", utilization: 91, routes: 7, condition: "Good", nextService: "Mar 28" },
  { vehicle: "VAN-021", type: "Refrigerated Van", capacity: "2.5T", utilization: 65, routes: 3, condition: "Good", nextService: "Apr 10" },
];

const FMCGRoutePlans = () => {
  return (
    <FMCGLayout title="Route Plans" subtitle="AI-optimized distribution corridors, fleet assignment & route profitability">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Routes", value: "18", icon: Route, color: "text-blue-600" },
          { label: "Avg Stops/Route", value: "17.4", icon: MapPin, color: "text-emerald-600" },
          { label: "Route Efficiency", value: "88.2%", icon: TrendingUp, color: "text-green-600" },
          { label: "Fuel Savings (MTD)", value: "₦142K", icon: Fuel, color: "text-teal-600" },
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

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Routes</TabsTrigger>
          <TabsTrigger value="corridor">Corridor Analysis</TabsTrigger>
          <TabsTrigger value="fleet">Fleet Allocation</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Navigation className="w-5 h-5" /> Today's Route Assignments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeRoutes.map((r) => (
                  <div key={r.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-muted-foreground">{r.id}</span>
                        <h3 className="font-semibold">{r.name}</h3>
                      </div>
                      <Badge variant={r.status === "completed" ? "default" : r.status === "active" ? "secondary" : "outline"}>
                        {r.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Driver</p>
                        <p className="font-medium">{r.driver}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle</p>
                        <p className="font-medium">{r.vehicle}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Stops</p>
                        <p className="font-medium">{r.completed}/{r.stops}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Distance</p>
                        <p className="font-medium">{r.distance}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Fuel Used</p>
                        <p className="font-medium">{r.fuel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ETA</p>
                        <p className="font-medium">{r.eta}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Efficiency</p>
                        <div className="flex items-center gap-2">
                          <Progress value={r.efficiency} className="h-2 flex-1" />
                          <span className="text-xs font-bold">{r.efficiency}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corridor">
          <Card>
            <CardHeader><CardTitle>Distribution Corridor Profitability</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Corridor</th>
                      <th className="pb-3 font-medium">Avg Trips/Wk</th>
                      <th className="pb-3 font-medium">Avg Cost</th>
                      <th className="pb-3 font-medium">Margin</th>
                      <th className="pb-3 font-medium">Fuel Variance</th>
                      <th className="pb-3 font-medium">Bottleneck</th>
                      <th className="pb-3 font-medium">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {corridorAnalysis.map((c) => (
                      <tr key={c.corridor} className="border-b last:border-0">
                        <td className="py-3 font-medium">{c.corridor}</td>
                        <td className="py-3">{c.avgTrips}</td>
                        <td className="py-3">{c.avgCost}</td>
                        <td className="py-3">
                          <span className={c.margin > 20 ? "text-green-600 font-bold" : c.margin > 15 ? "text-foreground" : "text-orange-600"}>{c.margin}%</span>
                        </td>
                        <td className="py-3">
                          <span className={c.fuelVar > 5 ? "text-red-600 font-bold" : c.fuelVar > 0 ? "text-orange-600" : "text-green-600"}>
                            {c.fuelVar > 0 ? "+" : ""}{c.fuelVar}%
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-1">
                            {c.bottleneck !== "None" && <AlertTriangle className="w-3 h-3 text-orange-500" />}
                            <span className="text-xs">{c.bottleneck}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <Badge variant={c.risk === "low" ? "default" : c.risk === "medium" ? "secondary" : "destructive"}>{c.risk}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fleet">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Fleet Assignment & Utilization</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fleetAllocation.map((f) => (
                  <div key={f.vehicle} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{f.vehicle}</h3>
                        <p className="text-sm text-muted-foreground">{f.type} - {f.capacity}</p>
                      </div>
                      <Badge variant={f.condition === "Excellent" ? "default" : f.condition === "Good" ? "secondary" : "outline"}>
                        {f.condition}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Utilization</p>
                        <div className="flex items-center gap-2">
                          <Progress value={f.utilization} className="h-2 flex-1" />
                          <span className={`font-bold text-xs ${f.utilization > 85 ? "text-green-600" : f.utilization > 70 ? "text-orange-600" : "text-red-600"}`}>{f.utilization}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Routes This Week</p>
                        <p className="font-medium">{f.routes}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Next Service</p>
                        <p className="font-medium">{f.nextService}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" />
                          <span className="text-xs">Operational</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGRoutePlans;
