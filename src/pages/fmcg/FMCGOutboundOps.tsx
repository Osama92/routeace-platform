import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Truck, Package, Clock, CheckCircle2, AlertTriangle,
  ClipboardList, ArrowRight, Weight, Users,
} from "lucide-react";

const outboundStats = [
  { label: "Orders to Dispatch", value: "24", icon: ClipboardList, color: "text-primary" },
  { label: "Trucks Loading", value: "4", icon: Truck, color: "text-orange-600" },
  { label: "Departed Today", value: "8", icon: ArrowRight, color: "text-emerald-600" },
  { label: "Pending Staging", value: "12", icon: Package, color: "text-blue-600" },
];

const loadingBays = [
  {
    bay: "Bay 1", truck: "LAG-234-KJ", driver: "Emeka O.", route: "Ikeja-Ogba Loop",
    orders: 12, loaded: 9, weight: "2.4T / 3T", status: "loading", eta: "11:30 AM",
  },
  {
    bay: "Bay 2", truck: "LAG-891-AB", driver: "Adamu M.", route: "Surulere-Yaba",
    orders: 8, loaded: 8, weight: "1.8T / 3T", status: "ready", eta: "11:00 AM",
  },
  {
    bay: "Bay 3", truck: "LAG-123-EF", driver: "Bayo T.", route: "Ikorodu Express",
    orders: 10, loaded: 2, weight: "0.6T / 5T", status: "loading", eta: "12:15 PM",
  },
  {
    bay: "Bay 4", truck: "-", driver: "-", route: "Ajah Corridor",
    orders: 8, loaded: 0, weight: "0 / 3T", status: "awaiting_truck", eta: "-",
  },
];

const departures = [
  { time: "07:15 AM", truck: "LAG-456-GH", driver: "Kunle B.", route: "Apapa-Surulere", drops: 10, status: "departed" },
  { time: "07:45 AM", truck: "LAG-012-KL", driver: "Tunde A.", route: "Festac-Amuwo", drops: 8, status: "departed" },
  { time: "08:00 AM", truck: "LAG-345-MN", driver: "Yusuf I.", route: "Mushin-Oshodi", drops: 12, status: "departed" },
  { time: "08:30 AM", truck: "LAG-678-OP", driver: "Felix N.", route: "Lekki Phase 1-2", drops: 6, status: "departed" },
];

const FMCGOutboundOps = () => (
  <FMCGLayout title="Outbound Operations" subtitle="Order dispatch, truck loading coordination & route departure monitoring">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {outboundStats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-6 flex items-center gap-4">
            <s.icon className={`w-8 h-8 ${s.color}`} />
            <div>
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Loading Bays */}
    <Card className="mb-6">
      <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Loading Bays - Live Status</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loadingBays.map((bay) => (
            <div key={bay.bay} className={`p-4 rounded-lg border space-y-3 ${bay.status === "ready" ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/10" : ""}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{bay.bay}</p>
                  <p className="text-xs text-muted-foreground">{bay.route}</p>
                </div>
                <Badge variant={bay.status === "ready" ? "default" : bay.status === "loading" ? "secondary" : "outline"}>
                  {bay.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1"><Truck className="w-3 h-3 text-muted-foreground" /> {bay.truck}</div>
                <div className="flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" /> {bay.driver}</div>
                <div className="flex items-center gap-1"><Weight className="w-3 h-3 text-muted-foreground" /> {bay.weight}</div>
                <div className="flex items-center gap-1"><Clock className="w-3 h-3 text-muted-foreground" /> ETA: {bay.eta}</div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Orders loaded: {bay.loaded}/{bay.orders}</p>
                <Progress value={(bay.loaded / bay.orders) * 100} className="h-2" />
              </div>
              {bay.status === "ready" && (
                <Button size="sm" className="w-full"><ArrowRight className="w-4 h-4 mr-1" /> Confirm Departure</Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Today's Departures */}
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Today's Departures</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {departures.map((d) => (
            <div key={d.time + d.truck} className="flex items-center gap-4 py-2 border-b last:border-0 text-sm">
              <span className="w-20 text-muted-foreground">{d.time}</span>
              <span className="font-mono w-24">{d.truck}</span>
              <span className="w-28">{d.driver}</span>
              <span className="flex-1 font-medium">{d.route}</span>
              <span className="w-16">{d.drops} drops</span>
              <Badge variant="default">{d.status}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </FMCGLayout>
);

export default FMCGOutboundOps;
