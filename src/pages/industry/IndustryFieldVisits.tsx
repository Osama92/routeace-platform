import { useParams } from "react-router-dom";
import IndustryLayout from "@/components/industry/IndustryLayout";
import { getIndustryConfig } from "@/lib/industryConfig";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, MapPin, Camera, Clock, CheckCircle2, XCircle, Package, CreditCard } from "lucide-react";

const IndustryFieldVisits = () => {
  const { industryCode } = useParams<{ industryCode: string }>();
  const config = getIndustryConfig(industryCode || "other");

  const recentVisits = [
    { rep: "Adebayo O.", outlet: "Mainland Grocers", time: "09:24 AM", duration: "18 min", gpsVerified: true, photosTaken: 3, orderPlaced: true, orderValue: "₦145K", paymentCollected: true },
    { rep: "Chioma N.", outlet: "Central Pharmacy", time: "10:15 AM", duration: "12 min", gpsVerified: true, photosTaken: 2, orderPlaced: true, orderValue: "₦89K", paymentCollected: false },
    { rep: "Ibrahim M.", outlet: "Quick Mart", time: "11:02 AM", duration: "8 min", gpsVerified: false, photosTaken: 0, orderPlaced: false, orderValue: "-", paymentCollected: false },
    { rep: "Funke A.", outlet: "Premium Outlet", time: "10:45 AM", duration: "22 min", gpsVerified: true, photosTaken: 4, orderPlaced: true, orderValue: "₦210K", paymentCollected: true },
  ];

  return (
    <IndustryLayout industryCode={industryCode || "other"}>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `linear-gradient(135deg, hsl(${config.colorPrimary}), hsl(${config.colorSecondary}))` }}>
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-bold">Field Visit System</h1>
            <p className="text-sm text-muted-foreground">{config.terminology.agent} visit tracking & compliance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-5 text-center">
            <ClipboardList className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <p className="text-2xl font-bold">47</p>
            <p className="text-xs text-muted-foreground">Visits Today</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-2xl font-bold">89%</p>
            <p className="text-xs text-muted-foreground">GPS Compliance</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <Camera className="w-5 h-5 mx-auto mb-1 text-violet-500" />
            <p className="text-2xl font-bold">132</p>
            <p className="text-xs text-muted-foreground">Store Photos</p>
          </CardContent></Card>
          <Card><CardContent className="pt-5 text-center">
            <CreditCard className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">₦1.8M</p>
            <p className="text-xs text-muted-foreground">Collections Today</p>
          </CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Recent Visits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {recentVisits.map((v) => (
              <div key={`${v.rep}-${v.time}`} className="p-4 rounded-xl border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-sm">{v.rep}</p>
                    <p className="text-xs text-muted-foreground">{v.outlet} · {v.time}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.gpsVerified ? (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30"><MapPin className="w-3 h-3 mr-1" /> GPS ✓</Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs"><XCircle className="w-3 h-3 mr-1" /> No GPS</Badge>
                    )}
                    <Badge variant="outline" className="text-xs"><Clock className="w-3 h-3 mr-1" /> {v.duration}</Badge>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <Camera className="w-3 h-3 text-muted-foreground" />
                    <span>{v.photosTaken} photos</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3 text-muted-foreground" />
                    <span>{v.orderPlaced ? `${config.terminology.order}: ${v.orderValue}` : `No ${config.terminology.order.toLowerCase()}`}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-muted-foreground" />
                    <span>{v.paymentCollected ? "Payment collected" : "No payment"}</span>
                  </div>
                  <div>
                    <Progress value={v.gpsVerified && v.photosTaken > 0 && v.orderPlaced ? 100 : v.gpsVerified ? 60 : 20} className="h-1.5" />
                    <span className="text-muted-foreground">Compliance</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </IndustryLayout>
  );
};

export default IndustryFieldVisits;
