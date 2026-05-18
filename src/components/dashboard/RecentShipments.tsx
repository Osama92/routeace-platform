import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Truck, MoreVertical, PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Shipment {
  id: string;
  display_id: string;
  origin: string;
  destination: string;
  driver: string;
  status: "delivered" | "transit" | "pending" | "delayed";
  eta: string;
  distance: string;
}

const STATUS_LABEL: Record<Shipment["status"], string> = {
  delivered: "Delivered",
  transit: "In Transit",
  pending: "Pending",
  delayed: "Delayed",
};

function mapStatus(s?: string | null): Shipment["status"] {
  if (!s) return "pending";
  if (s === "delivered") return "delivered";
  if (s === "delayed" || s === "sla_breach") return "delayed";
  if (["in_transit", "picked_up", "out_for_delivery", "dispatched"].includes(s)) return "transit";
  return "pending";
}

const RecentShipments = () => {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("dispatches")
          .select("id, dispatch_number, origin_address, destination_address, status, scheduled_delivery, actual_delivery, distance_km, driver_id, drivers:driver_id(full_name)")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!mounted) return;
        setShipments(
          (data || []).map((r: any) => {
            const status = mapStatus(r.status);
            const eta =
              status === "delivered"
                ? "Completed"
                : status === "pending"
                  ? "Awaiting dispatch"
                  : r.scheduled_delivery
                    ? new Date(r.scheduled_delivery).toLocaleString()
                    : "—";
            return {
              id: r.id,
              display_id: r.dispatch_number || r.id.slice(0, 8).toUpperCase(),
              origin: r.origin_address || "—",
              destination: r.destination_address || "—",
              driver: r.drivers?.full_name || "Unassigned",
              status,
              eta,
              distance: r.distance_km ? `${Number(r.distance_km).toFixed(0)} km` : "—",
            };
          }),
        );
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="glass-card overflow-hidden"
    >
      <div className="p-6 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-lg text-foreground">Recent Shipments</h3>
            <p className="text-sm text-muted-foreground mt-1">Your latest dispatch activity</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate("/dispatch")}>
            View All
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : shipments.length === 0 ? (
        <div className="p-10 text-center">
          <PackageOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No shipments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first dispatch to see it here.
          </p>
          <Button size="sm" className="mt-4" onClick={() => navigate("/dispatch")}>
            Create dispatch
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary/30">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Shipment</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Route</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Driver</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ETA</th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Distance</th>
                <th className="text-right py-4 px-6"></th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((shipment, index) => (
                <motion.tr
                  key={shipment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                  className="data-table-row"
                >
                  <td className="py-4 px-6">
                    <span className="font-medium text-foreground">{shipment.display_id}</span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <div className="text-sm">
                        <p className="text-foreground">{shipment.origin}</p>
                        <p className="text-muted-foreground">→ {shipment.destination}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{shipment.driver}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`status-badge status-${shipment.status}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {STATUS_LABEL[shipment.status]}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {shipment.eta}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-sm text-foreground">{shipment.distance}</span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/dispatch?focus=${shipment.id}`)}>
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

export default RecentShipments;
