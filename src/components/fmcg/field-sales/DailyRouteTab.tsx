import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MapPin, Navigation, Clock, CheckCircle2, Calendar, ShoppingCart, Camera } from "lucide-react";
import type { FieldVisit, Outlet } from "@/hooks/useFieldSales";

interface Props {
  visits: FieldVisit[];
  outlets: Outlet[];
  onCheckIn: (outletId: string) => Promise<any>;
  onCheckOut: (visitId: string, notes?: string) => Promise<void>;
  onTakeOrder: (outletId: string) => void;
  onShelfAudit: (outletName: string) => void;
}

const DailyRouteTab = ({ visits, outlets, onCheckIn, onCheckOut, onTakeOrder, onShelfAudit }: Props) => {
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutVisitId, setCheckoutVisitId] = useState<string | null>(null);

  const todayVisits = visits.filter(v => {
    const visitDate = v.check_in_at ? new Date(v.check_in_at).toDateString() : "";
    return visitDate === new Date().toDateString();
  });

  const completedCount = todayVisits.filter(v => v.check_out_at).length;
  const activeVisit = todayVisits.find(v => v.check_in_at && !v.check_out_at);

  const handleCheckIn = async (outletId: string) => {
    setCheckingIn(outletId);
    await onCheckIn(outletId);
    setCheckingIn(null);
  };

  const handleCheckOut = async () => {
    if (!checkoutVisitId) return;
    await onCheckOut(checkoutVisitId, checkoutNotes);
    setCheckoutVisitId(null);
    setCheckoutNotes("");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2"><Navigation className="w-5 h-5" /> Today's Route Plan</CardTitle>
        <Badge>{completedCount}/{todayVisits.length || outlets.length} Completed</Badge>
      </CardHeader>
      <CardContent>
        {/* Active visit banner */}
        {activeVisit && (
          <div className="mb-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-2">
              📍 Currently visiting: {activeVisit.outlet?.outlet_name || "Unknown outlet"}
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => onTakeOrder(activeVisit.outlet_id || "")}>
                <ShoppingCart className="w-4 h-4 mr-1" /> Take Order
              </Button>
              <Button size="sm" variant="outline" onClick={() => onShelfAudit(activeVisit.outlet?.outlet_name || "")}>
                <Camera className="w-4 h-4 mr-1" /> Shelf Audit
              </Button>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" onClick={() => setCheckoutVisitId(activeVisit.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Complete Visit
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Complete Visit</DialogTitle></DialogHeader>
                  <Input placeholder="Visit notes (optional)..." value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} />
                  <Button onClick={handleCheckOut}>Complete & Check Out</Button>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Outlet list for check-in */}
        <div className="space-y-0">
          {outlets.slice(0, 10).map((outlet, idx) => {
            const visit = todayVisits.find(v => v.outlet_id === outlet.id);
            const isCompleted = visit?.check_out_at;
            const isActive = visit?.check_in_at && !visit?.check_out_at;

            return (
              <div key={outlet.id} className="flex gap-4 py-4 border-b last:border-0">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${isCompleted ? "bg-emerald-500 text-white" : isActive ? "bg-blue-500 text-white animate-pulse" : "bg-muted text-muted-foreground"}`}>
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  {idx < Math.min(outlets.length, 10) - 1 && <div className={`w-0.5 flex-1 mt-1 ${isCompleted ? "bg-emerald-300" : "bg-border"}`} />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{outlet.outlet_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{outlet.address || "No address"}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-xs">{outlet.outlet_type || "General"}</Badge>
                      {outlet.last_visit_at && <p className="text-xs text-muted-foreground mt-1"><Clock className="w-3 h-3 inline mr-1" />Last: {new Date(outlet.last_visit_at).toLocaleDateString()}</p>}
                    </div>
                  </div>
                  {!isCompleted && !isActive && !activeVisit && (
                    <Button size="sm" className="mt-2" onClick={() => handleCheckIn(outlet.id)} disabled={checkingIn === outlet.id}>
                      {checkingIn === outlet.id ? "Checking in..." : "Check In"}
                    </Button>
                  )}
                  {isCompleted && <p className="text-sm font-medium text-emerald-600 mt-1">✓ Visit completed</p>}
                </div>
              </div>
            );
          })}
          {outlets.length === 0 && <p className="text-center text-muted-foreground py-8">No outlets assigned. Add outlets to start your route.</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyRouteTab;
