import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MapPin, Ship, Clock, CheckCircle, AlertTriangle, Package } from "lucide-react";

const shipments = [
  { id: "PD-0341", product: "Cashew Nuts", origin: "Lagos Port", dest: "Hamburg Port", vessel: "MSC Vittoria", eta: "2026-03-22", status: "in_transit", progress: 65, steps: [
    { label: "Origin Warehouse", done: true }, { label: "Customs Cleared", done: true }, { label: "Port Loading", done: true },
    { label: "In Transit", done: true }, { label: "Dest. Port", done: false }, { label: "Delivered", done: false },
  ]},
  { id: "PD-0342", product: "Sesame Seeds", origin: "Apapa Terminal", dest: "Shanghai Port", vessel: "CMA CGM Marco Polo", eta: "2026-04-05", status: "customs", progress: 35, steps: [
    { label: "Origin Warehouse", done: true }, { label: "Customs Clearing", done: false }, { label: "Port Loading", done: false },
    { label: "In Transit", done: false }, { label: "Dest. Port", done: false }, { label: "Delivered", done: false },
  ]},
  { id: "PD-0343", product: "Shea Butter", origin: "Tin Can Island", dest: "Valencia Port", vessel: "Pending", eta: "TBD", status: "loading", progress: 15, steps: [
    { label: "Origin Warehouse", done: true }, { label: "Customs Cleared", done: false }, { label: "Port Loading", done: false },
    { label: "In Transit", done: false }, { label: "Dest. Port", done: false }, { label: "Delivered", done: false },
  ]},
];

const PortoDashTracking = () => (
  <PortoDashLayout title="Shipment Tracking" subtitle="Real-time visibility across all export shipments">
    {/* Summary */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {[
        { label: "In Transit", value: "3", icon: Ship, color: "text-primary" },
        { label: "At Port", value: "2", icon: MapPin, color: "text-info" },
        { label: "Customs", value: "1", icon: AlertTriangle, color: "text-[hsl(var(--warning))]" },
        { label: "Delivered (MTD)", value: "8", icon: CheckCircle, color: "text-[hsl(var(--success))]" },
      ].map(m => (
        <Card key={m.label}>
          <CardContent className="pt-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Shipment Details */}
    <div className="space-y-6">
      {shipments.map(s => (
        <Card key={s.id} className="hover:border-primary/10 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-sm">{s.product} - {s.id}</CardTitle>
                  <p className="text-xs text-muted-foreground">{s.origin} → {s.dest}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Vessel: {s.vessel}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                  <Clock className="w-3 h-3" /> ETA: {s.eta}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={s.progress} className="h-2 mb-4" />
            <div className="flex justify-between">
              {s.steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {step.done ? <CheckCircle className="w-3.5 h-3.5" /> : <span className="text-[10px]">{i + 1}</span>}
                  </div>
                  <span className={`text-[10px] ${step.done ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  </PortoDashLayout>
);

export default PortoDashTracking;
