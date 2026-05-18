import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type Readiness = {
  generated_at: string;
  async_dead_jobs: number;
  kpi_events_stale: number;
  storage_path_violations: number;
  recent_workflow_failures: number;
  deployment_blocked: boolean;
};

export const EnterpriseReadinessPanel = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Readiness | null>(null);

  const run = async () => {
    setLoading(true);
    const { data: res, error } = await supabase.rpc("run_predeploy_readiness_check" as any);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setData(res as Readiness);
  };

  const Stat = ({ label, value, ok }: { label: string; value: number; ok: boolean }) => (
    <div className="flex items-center justify-between rounded-md border p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge variant={ok ? "secondary" : "destructive"}>{value}</Badge>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          {data?.deployment_blocked ? (
            <ShieldAlert className="h-5 w-5 text-destructive" />
          ) : (
            <ShieldCheck className="h-5 w-5 text-primary" />
          )}
          Enterprise Readiness
        </CardTitle>
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run check"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {!data && (
          <p className="text-sm text-muted-foreground">
            Validates async queue health, KPI event bus drain, storage tenant-prefix integrity, and recent workflow failures across all tenants.
          </p>
        )}
        {data && (
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Dead async jobs" value={data.async_dead_jobs} ok={data.async_dead_jobs === 0} />
            <Stat label="Stale KPI events" value={data.kpi_events_stale} ok={data.kpi_events_stale === 0} />
            <Stat label="Storage path violations" value={data.storage_path_violations} ok={data.storage_path_violations === 0} />
            <Stat label="Recent workflow failures" value={data.recent_workflow_failures} ok={data.recent_workflow_failures === 0} />
          </div>
        )}
        {data?.deployment_blocked && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
            Deployment blocked - resolve the failing checks above before promoting to production.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnterpriseReadinessPanel;
