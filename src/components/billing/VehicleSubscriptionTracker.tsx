/**
 * VehicleSubscriptionTracker
 * Per-vehicle subscription billing with mid-month proration.
 * Each active vehicle is billed ₦5,000/month; vehicles registered
 * mid-month are prorated by remaining days. Calls the
 * get_vehicle_subscription_charges RPC for a live breakdown.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Truck, Calendar, Info, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface VehicleCharge {
  vehicle_id: string;
  registration_number: string;
  vehicle_type: string;
  registered_on: string;
  month_start: string;
  month_end: string;
  days_in_month: number;
  days_active: number;
  is_prorated: boolean;
  monthly_rate: number;
  prorated_charge: number;
  next_renewal: string;
}

const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(n);

const VehicleSubscriptionTracker = () => {
  const { organizationId } = useAuth();
  const [charges, setCharges] = useState<VehicleCharge[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCharges = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.rpc("get_vehicle_subscription_charges", {
      p_org_id: organizationId,
    });
    if (!error && data) setCharges(data as VehicleCharge[]);
    setLoading(false);
  };

  useEffect(() => { if (organizationId) fetchCharges(); }, [organizationId]);

  const monthlyTotal = charges.reduce((s, c) => s + Number(c.prorated_charge || 0), 0);
  const fullMonthTotal = charges.reduce((s, c) => s + Number(c.monthly_rate || 0), 0);
  const proratedCount = charges.filter((c) => c.is_prorated).length;
  const monthLabel = charges[0] ? format(new Date(charges[0].month_start), "MMMM yyyy") : format(new Date(), "MMMM yyyy");
  const nextRenewal = charges[0] ? format(new Date(charges[0].next_renewal), "dd MMM yyyy") : "-";

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Vehicles", value: String(charges.length), icon: Truck },
          { label: "This Month (prorated)", value: formatNaira(monthlyTotal), icon: Calendar },
          { label: "Next Full Month", value: formatNaira(fullMonthTotal), icon: RefreshCw },
          { label: "Next Renewal", value: nextRenewal, icon: Calendar },
        ].map((item, i) => (
          <motion.div key={item.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
                <p className="text-xl font-bold tabular-nums">{item.value}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Proration explainer */}
      {proratedCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <span>
            <span className="font-semibold text-foreground">{proratedCount} vehicle{proratedCount > 1 ? "s" : ""}</span> registered mid-month
            {" "}{proratedCount > 1 ? "are" : "is"} prorated by the days active in {monthLabel}. From next cycle {proratedCount > 1 ? "they" : "it"} bill{proratedCount > 1 ? "" : "s"} the full ₦5,000/month.
          </span>
        </div>
      )}

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" />
              Vehicle Subscription — {monthLabel}
            </CardTitle>
            <button onClick={fetchCharges} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30">
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Days Active</TableHead>
                    <TableHead className="text-right whitespace-nowrap">Monthly Rate</TableHead>
                    <TableHead className="text-right whitespace-nowrap">This Month</TableHead>
                    <TableHead className="whitespace-nowrap">Next Renewal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {charges.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No billable vehicles registered
                      </TableCell>
                    </TableRow>
                  ) : charges.map((c) => (
                    <TableRow key={c.vehicle_id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium font-mono text-sm">{c.registration_number}</span>
                          <span className="text-xs text-muted-foreground capitalize">{c.vehicle_type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.registered_on), "dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                        {c.days_active} / {c.days_in_month}
                        {c.is_prorated && <Badge variant="outline" className="ml-2 text-[10px] text-primary border-primary/40">Prorated</Badge>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground whitespace-nowrap">
                        {formatNaira(Number(c.monthly_rate))}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold whitespace-nowrap">
                        {formatNaira(Number(c.prorated_charge))}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(c.next_renewal), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}

                  {charges.length > 0 && (
                    <TableRow className="border-t-2 border-border bg-secondary/30 font-bold">
                      <TableCell colSpan={4}>This month total ({monthLabel})</TableCell>
                      <TableCell className="text-right tabular-nums text-primary text-base whitespace-nowrap">
                        {formatNaira(monthlyTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleSubscriptionTracker;
