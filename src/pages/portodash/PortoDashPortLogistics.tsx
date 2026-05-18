import PortoDashLayout from "@/components/portodash/PortoDashLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Ship, Package, Clock, CheckCircle, AlertTriangle, Anchor } from "lucide-react";

const terminals = [
  { name: "Apapa Container Terminal", operator: "APM Terminals", status: "operational", vessels: 4, congestion: "moderate", waitTime: "2-3 days" },
  { name: "Tin Can Island Port", operator: "TICT", status: "operational", vessels: 3, congestion: "low", waitTime: "1-2 days" },
  { name: "Onne Port Complex", operator: "Intels", status: "operational", vessels: 2, congestion: "low", waitTime: "1 day" },
  { name: "Lekki Deep Sea Port", operator: "Lekki Port LFTZ", status: "operational", vessels: 5, congestion: "high", waitTime: "3-5 days" },
];

const portActivities = [
  { activity: "Container loading - PD-0341 (Cashew Nuts)", terminal: "Apapa", time: "2026-03-08 06:30", status: "completed" },
  { activity: "Customs inspection - PD-0342 (Sesame)", terminal: "Apapa", time: "2026-03-08 10:00", status: "in_progress" },
  { activity: "Fumigation scheduled - PD-0343 (Shea Butter)", terminal: "Tin Can", time: "2026-03-09 08:00", status: "scheduled" },
  { activity: "Vessel berthing - MSC Vittoria", terminal: "Apapa", time: "2026-03-08 14:00", status: "scheduled" },
];

const PortoDashPortLogistics = () => (
  <PortoDashLayout title="Port Logistics" subtitle="Terminal operations, vessel tracking, and port congestion monitoring">
    {/* Terminal Overview */}
    <div className="grid md:grid-cols-2 gap-4 mb-8">
      {terminals.map(t => (
        <Card key={t.name} className="hover:border-primary/10 transition-colors">
          <CardContent className="pt-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                  <Anchor className="w-5 h-5 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.operator}</p>
                </div>
              </div>
              <Badge variant="default" className="text-[10px] capitalize">{t.status}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-lg font-bold">{t.vessels}</p>
                <p className="text-[10px] text-muted-foreground">Vessels</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className={`text-sm font-bold capitalize ${
                  t.congestion === "high" ? "text-destructive" : t.congestion === "moderate" ? "text-[hsl(var(--warning))]" : "text-[hsl(var(--success))]"
                }`}>{t.congestion}</p>
                <p className="text-[10px] text-muted-foreground">Congestion</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50 text-center">
                <p className="text-sm font-bold">{t.waitTime}</p>
                <p className="text-[10px] text-muted-foreground">Wait Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Port Activity Log */}
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Port Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {portActivities.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
            <div className="flex items-center gap-3">
              {a.status === "completed" ? <CheckCircle className="w-4 h-4 text-[hsl(var(--success))]" /> :
               a.status === "in_progress" ? <Clock className="w-4 h-4 text-[hsl(var(--warning))] animate-pulse" /> :
               <Clock className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm">{a.activity}</p>
                <p className="text-xs text-muted-foreground">{a.terminal} · {a.time}</p>
              </div>
            </div>
            <Badge variant={a.status === "completed" ? "default" : a.status === "in_progress" ? "secondary" : "outline"} className="capitalize text-xs">
              {a.status.replace("_", " ")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  </PortoDashLayout>
);

export default PortoDashPortLogistics;
