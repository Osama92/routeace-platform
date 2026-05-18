import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Navigation, Truck, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ActiveDriver {
  id: string;
  name: string;
  vehicle: string;
  location: string;
  status: "active" | "idle" | "offline";
  lastUpdate: string;
}

const statusColors = {
  active: "bg-success",
  idle: "bg-warning",
  offline: "bg-muted-foreground",
};

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const h = Math.floor(diffMin / 60);
  return `${h}h ago`;
}

const ActiveDrivers = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase
          .from("drivers")
          .select("id, full_name, status, last_active_at, current_location")
          .order("last_active_at", { ascending: false, nullsFirst: false })
          .limit(6);
        if (!mounted) return;
        setDrivers(
          (data || []).map((r: any) => {
            const raw = String(r.status || "").toLowerCase();
            const status: ActiveDriver["status"] =
              raw === "active" || raw === "on_trip" ? "active" : raw === "offline" ? "offline" : "idle";
            return {
              id: r.id,
              name: r.full_name || "Driver",
              vehicle: "—",
              location: r.current_location || (status === "idle" ? "Awaiting dispatch" : "—"),
              status,
              lastUpdate: timeAgo(r.last_active_at),
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
      transition={{ duration: 0.4, delay: 0.25 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground">Active Drivers</h3>
          <p className="text-sm text-muted-foreground mt-1">Real-time driver status</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-warning" />
            <span className="text-xs text-muted-foreground">Idle</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : drivers.length === 0 ? (
        <div className="py-10 text-center">
          <UserPlus className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium text-foreground">No drivers yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add drivers to see live status here.</p>
          <Button size="sm" className="mt-4" onClick={() => navigate("/drivers")}>
            Add driver
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {drivers.map((driver, index) => (
            <motion.div
              key={driver.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
              className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-primary" />
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusColors[driver.status]}`}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{driver.name}</p>
                  <span className="text-xs text-muted-foreground">{driver.vehicle}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">{driver.location}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">{driver.lastUpdate}</span>
                {driver.status === "active" && (
                  <div className="flex items-center gap-1 mt-1 text-primary">
                    <Navigation className="w-3 h-3" />
                    <span className="text-xs">Live</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default ActiveDrivers;
