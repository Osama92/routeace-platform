import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Snapshot = {
  snapshot_at: string;
  queued: number; running: number; failed_24h: number; dead: number; dlq_24h: number;
  retry_storm_jobs: number; oldest_queued_seconds: number; avg_runtime_seconds: number;
  alerts: { dlq_growth_alert: boolean; dead_jobs_alert: boolean; retry_storm_alert: boolean; stuck_queue_alert: boolean };
};

export default function QueueMonitorPanel() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_queue_health_snapshot");
    if (error) toast.error(error.message); else setSnap(data as Snapshot);
    setLoading(false);
  };

  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t); }, []);

  const Stat = ({ label, value, alert }: { label: string; value: number | string; alert?: boolean }) => (
    <Card className={alert ? "border-destructive/50" : ""}>
      <CardContent className="pt-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${alert ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Queue Worker Health</h2>
          <p className="text-sm text-muted-foreground">Live monitoring of async jobs, DLQ growth, retry storms, stuck queues.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Refresh
        </Button>
      </div>

      {snap && (
        <>
          <div className="grid md:grid-cols-4 gap-3">
            <Stat label="Queued" value={snap.queued} />
            <Stat label="Running" value={snap.running} />
            <Stat label="Failed (24h)" value={snap.failed_24h} alert={snap.failed_24h > 0} />
            <Stat label="Dead" value={snap.dead} alert={snap.alerts.dead_jobs_alert} />
            <Stat label="DLQ (24h)" value={snap.dlq_24h} alert={snap.alerts.dlq_growth_alert} />
            <Stat label="Retry storm" value={snap.retry_storm_jobs} alert={snap.alerts.retry_storm_alert} />
            <Stat label="Oldest queued (s)" value={Math.round(snap.oldest_queued_seconds)} alert={snap.alerts.stuck_queue_alert} />
            <Stat label="Avg runtime (s)" value={snap.avg_runtime_seconds.toFixed(1)} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Active alerts</CardTitle>
              <CardDescription>Snapshot at {new Date(snap.snapshot_at).toLocaleTimeString()}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(snap.alerts).filter(([, v]) => v).length === 0 ? (
                <Badge className="bg-emerald-500/15 text-emerald-600">All systems nominal</Badge>
              ) : Object.entries(snap.alerts).filter(([, v]) => v).map(([k]) => (
                <Badge key={k} className="bg-destructive/15 text-destructive">{k.replace(/_/g, " ")}</Badge>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
