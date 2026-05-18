import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Activity, RefreshCw, Search, AlertTriangle, ShieldAlert, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

type AuditEvent = {
  id: string;
  occurred_at: string;
  event_class: string;
  severity: "info" | "warn" | "critical";
  actor_email: string | null;
  actor_role: string | null;
  organization_id: string | null;
  tenant_mode: string | null;
  resource: string | null;
  message: string;
  payload: any;
  source: string;
};

type FeatureFlag = {
  id: string;
  flag_key: string;
  organization_id: string | null;
  enabled: boolean;
  rollout_pct: number;
  description: string | null;
  updated_at: string;
};

const sevTone = (s: string) =>
  s === "critical"
    ? "bg-destructive/15 text-destructive"
    : s === "warn"
    ? "bg-amber-500/15 text-amber-600"
    : "bg-emerald-500/15 text-emerald-600";

export default function PlatformObservabilityPanel() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [classFilter, setClassFilter] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ev, error: e1 }, { data: ff, error: e2 }] = await Promise.all([
      (supabase as any)
        .from("platform_audit_log")
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(200),
      (supabase as any)
        .from("platform_feature_flags")
        .select("*")
        .order("flag_key", { ascending: true }),
    ]);
    if (e1) toast.error(e1.message);
    if (e2) toast.error(e2.message);
    setEvents((ev as AuditEvent[]) || []);
    setFlags((ff as FeatureFlag[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = events.filter((e) => {
    if (classFilter && e.event_class !== classFilter) return false;
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      e.event_class.toLowerCase().includes(q) ||
      e.message.toLowerCase().includes(q) ||
      (e.actor_email || "").toLowerCase().includes(q) ||
      (e.resource || "").toLowerCase().includes(q)
    );
  });

  const counts = {
    critical: events.filter((e) => e.severity === "critical").length,
    warn: events.filter((e) => e.severity === "warn").length,
    info: events.filter((e) => e.severity === "info").length,
  };

  const classes = Array.from(new Set(events.map((e) => e.event_class))).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            Platform Observability
          </h2>
          <p className="text-sm text-muted-foreground">
            Append-only platform event log + controlled rollout flags. Visible to Core team and Super Admin only.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <ShieldAlert className="w-5 h-5 mx-auto mb-2 text-destructive" />
            <p className="text-xl font-bold">{counts.critical}</p>
            <p className="text-xs text-muted-foreground">Critical events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-amber-500" />
            <p className="text-xl font-bold">{counts.warn}</p>
            <p className="text-xs text-muted-foreground">Warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-2 text-emerald-500" />
            <p className="text-xl font-bold">{counts.info}</p>
            <p className="text-xs text-muted-foreground">Info events</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Flag className="w-5 h-5 mx-auto mb-2 text-primary" />
            <p className="text-xl font-bold">{flags.length}</p>
            <p className="text-xs text-muted-foreground">Feature flags</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Stream</CardTitle>
          <CardDescription>Last 200 platform events. Append-only.</CardDescription>
          <div className="flex flex-wrap gap-2 mt-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search class, actor, resource…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              size="sm"
              variant={classFilter === null ? "default" : "outline"}
              onClick={() => setClassFilter(null)}
            >
              All
            </Button>
            {classes.slice(0, 6).map((c) => (
              <Button
                key={c}
                size="sm"
                variant={classFilter === c ? "default" : "outline"}
                onClick={() => setClassFilter(c)}
                className="text-xs"
              >
                {c}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No events yet. Engines will start writing here as platform activity occurs.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>
                      <Badge className={sevTone(e.severity)}>{e.severity}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{e.event_class}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.actor_email || "system"}
                      {e.actor_role && (
                        <div className="text-[10px] text-muted-foreground/70">{e.actor_role}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {e.resource || "-"}
                      {e.tenant_mode && (
                        <Badge variant="outline" className="ml-1 text-[10px]">
                          {e.tenant_mode}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs max-w-[320px] truncate" title={e.message}>
                      {e.message}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      {format(new Date(e.occurred_at), "MMM dd HH:mm:ss")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Flag className="w-4 h-4" /> Feature Flags
          </CardTitle>
          <CardDescription>Controlled-rollout switches. All changes are auto-audited above.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {flags.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No flags defined. Insert into <code className="text-xs">platform_feature_flags</code> to roll a feature gradually.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Flag</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead className="text-right">Rollout %</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flags.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.flag_key}</TableCell>
                    <TableCell className="text-xs">
                      {f.organization_id ? (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {f.organization_id.slice(0, 8)}…
                        </Badge>
                      ) : (
                        <Badge>global</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={f.enabled ? "bg-emerald-500/15 text-emerald-600" : "bg-muted"}>
                        {f.enabled ? "on" : "off"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs">{f.rollout_pct}%</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {f.description || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground text-right whitespace-nowrap">
                      {format(new Date(f.updated_at), "MMM dd HH:mm")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
