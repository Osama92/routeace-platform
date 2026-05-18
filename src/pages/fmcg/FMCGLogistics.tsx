import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Truck, Clock, MapPin, ShieldCheck, AlertTriangle, Fuel } from "lucide-react";

const activeDeliveries = [
  { id: "DEL-001", driver: "Emeka O.", outlet: "ShopRite Ikeja", status: "in_transit", eta: "14:30", delayRisk: 12 },
  { id: "DEL-002", driver: "Adamu M.", outlet: "Spar Lekki", status: "arrived", eta: "13:45", delayRisk: 0 },
  { id: "DEL-003", driver: "Chidi N.", outlet: "Justrite Surulere", status: "in_transit", eta: "15:00", delayRisk: 68 },
  { id: "DEL-004", driver: "Bola A.", outlet: "Market Square Ajah", status: "loading", eta: "16:15", delayRisk: 25 },
  { id: "DEL-005", driver: "Ibrahim K.", outlet: "Game Store VI", status: "in_transit", eta: "14:00", delayRisk: 45 },
];

const FMCGLogistics = () => {
  return (
    <FMCGLayout title="Distribution Logistics" subtitle="Autonomous FMCG delivery routing & digital POD">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Active Deliveries", value: "127", icon: Truck, color: "text-blue-600" },
          { label: "Avg Delivery Time", value: "2.4h", icon: Clock, color: "text-orange-600" },
          { label: "On-Time Rate", value: "91.3%", icon: ShieldCheck, color: "text-green-600" },
          { label: "Fuel Efficiency", value: "8.2 km/L", icon: Fuel, color: "text-teal-600" },
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
          <TabsTrigger value="active">Active Deliveries</TabsTrigger>
          <TabsTrigger value="delay-prediction">Delay Prediction AI</TabsTrigger>
          <TabsTrigger value="pod">Digital POD Log</TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <Card>
            <CardHeader><CardTitle>Live Delivery Tracker</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activeDeliveries.map((d) => (
                  <div key={d.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                    <span className="font-mono text-sm text-muted-foreground w-20">{d.id}</span>
                    <span className="w-28 font-medium">{d.driver}</span>
                    <span className="flex-1">{d.outlet}</span>
                    <Badge variant={d.status === "arrived" ? "default" : d.status === "in_transit" ? "secondary" : "outline"}>
                      {d.status.replace("_", " ")}
                    </Badge>
                    <span className="text-sm w-16">ETA {d.eta}</span>
                    <div className="w-24 flex items-center gap-2">
                      {d.delayRisk > 50 && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      <Progress value={100 - d.delayRisk} className="h-2 flex-1" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delay-prediction">
          <Card>
            <CardHeader><CardTitle>AI Delay Prevention</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { delivery: "DEL-003", risk: 68, reason: "Heavy traffic on Third Mainland Bridge", action: "Reroute via Carter Bridge - saves 22 min" },
                  { delivery: "DEL-005", risk: 45, reason: "Loading delay at warehouse", action: "ETA auto-updated, retailer notified" },
                  { delivery: "DEL-004", risk: 25, reason: "Rain forecast in Ajah corridor", action: "Monitor - auto-reroute if worsens" },
                ].map((p) => (
                  <div key={p.delivery} className="p-4 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-medium">{p.delivery}</span>
                      <Badge variant={p.risk > 50 ? "destructive" : p.risk > 30 ? "secondary" : "outline"}>
                        {p.risk}% risk
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{p.reason}</p>
                    <p className="text-sm text-primary font-medium">→ {p.action}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pod">
          <Card>
            <CardHeader><CardTitle>Digital Proof of Delivery</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: "POD-891", outlet: "ShopRite Ikeja", method: "QR + Geofence", time: "13:42", verified: true },
                  { id: "POD-890", outlet: "Justrite Oshodi", method: "Digital Signature", time: "12:18", verified: true },
                  { id: "POD-889", outlet: "Spar Abuja", method: "Photo + GPS", time: "11:55", verified: true },
                  { id: "POD-888", outlet: "Game VI", method: "QR Scan", time: "11:30", verified: false },
                ].map((pod) => (
                  <div key={pod.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <span className="font-mono text-sm w-20">{pod.id}</span>
                    <span className="flex-1 font-medium">{pod.outlet}</span>
                    <Badge variant="outline">{pod.method}</Badge>
                    <span className="text-sm text-muted-foreground">{pod.time}</span>
                    <ShieldCheck className={`w-4 h-4 ${pod.verified ? "text-green-500" : "text-yellow-500"}`} />
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

export default FMCGLogistics;
