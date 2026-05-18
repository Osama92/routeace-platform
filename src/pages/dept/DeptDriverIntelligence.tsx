import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import useIntelligenceAccessLog from "@/hooks/useIntelligenceAccessLog";
import { AlertTriangle, Award, ClipboardCheck, Shield, Truck, Users } from "lucide-react";

type DriverRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  status: string | null;
  license_expiry?: string | null;
  source?: string | null;
};

type TransporterRow = {
  id: string;
  name: string | null;
  status: string | null;
  on_time_rate?: number | null;
  sla_score?: number | null;
  active_drivers?: number | null;
};

type ExceptionRow = {
  id: string;
  exception_type: string;
  severity: string;
  status: string;
  description: string | null;
  driver_id?: string | null;
  transporter_id?: string | null;
};

const fmtPct = (n: number) =>
  `${new Intl.NumberFormat("en-NG", { maximumFractionDigits: 1 }).format(Number.isFinite(n) ? n : 0)}%`;

const statusLabel = (v: string | null | undefined) => (v || "unknown").replace(/_/g, " ");

export default function DeptDriverIntelligence() {
  const { organizationId } = useAuth();
  const monthStart = useMemo(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
    []
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["dept-driver-intelligence", organizationId, monthStart],
    enabled: !!organizationId,
    queryFn: async () => {
      if (!organizationId) throw new Error("Missing organization scope");

      const sb = supabase as any;
      const [driversRes, transportersRes, exceptionsRes] = await Promise.all([
        sb
          .from("drivers")
          .select("id,full_name,phone,status,license_expiry")
          .eq("organization_id", organizationId)
          .limit(500),
        sb
          .from("transporters")
          .select("id,name,status,on_time_rate,sla_score,active_drivers")
          .eq("organization_id", organizationId)
          .limit(200),
        sb
          .from("delivery_exceptions")
          .select("id,exception_type,severity,status,description,transporter_id")
          .eq("organization_id", organizationId)
          .gte("created_at", monthStart)
          .limit(500),
      ]);

      const drivers = (driversRes.data || []) as DriverRow[];
      const transporters = (transportersRes.error ? [] : (transportersRes.data || [])) as TransporterRow[];
      const exceptions = (exceptionsRes.data || []) as ExceptionRow[];

      if (driversRes.error) throw driversRes.error;
      if (exceptionsRes.error) throw exceptionsRes.error;

      return { drivers, transporters, exceptions };
    },
  });

  const metrics = useMemo(() => {
    const drivers = data?.drivers || [];
    const transporters = data?.transporters || [];
    const exceptions = data?.exceptions || [];

    const activeDrivers = drivers.filter((d) => (d.status || "").toLowerCase() === "active").length;
    const expiring = drivers.filter((d) => {
      if (!d.license_expiry) return false;
      const days = (new Date(d.license_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      return days <= 30;
    }).length;
    const openExceptions = exceptions.filter((e) => e.status !== "resolved").length;
    const transporterCount = transporters.length;
    const avgTransporterSla =
      transporters.length
        ? transporters.reduce((s, t) => s + Number(t.sla_score || t.on_time_rate || 0), 0) / transporters.length
        : 0;

    return {
      driverCount: drivers.length,
      activeDrivers,
      expiring,
      openExceptions,
      transporterCount,
      avgTransporterSla,
    };
  }, [data]);

  // Audit-trail: record LD driver intelligence access + ownership scope rendered
  const ownershipScope =
    metrics.driverCount > 0 && metrics.transporterCount > 0
      ? "mixed"
      : metrics.driverCount > 0
      ? "internal"
      : metrics.transporterCount > 0
      ? "third_party"
      : "none";
  useIntelligenceAccessLog({
    view_scope: "LD",
    module: "driver_intelligence",
    ownership_scope: ownershipScope as any,
    internal_count: metrics.driverCount,
    third_party_count: metrics.transporterCount,
    record_count: metrics.driverCount + metrics.transporterCount,
  });

  const directives = [
    metrics.expiring > 0
      ? `${metrics.expiring} driver licence(s) expire within 30 days. Block dispatch until renewed.`
      : "All active driver licences are within compliance window.",
    metrics.openExceptions > 0
      ? `${metrics.openExceptions} open delivery exception(s) require attribution to a driver or transporter.`
      : "No open delivery exceptions pending attribution.",
    metrics.transporterCount > 0 && metrics.avgTransporterSla < 90
      ? `Average 3PL SLA score is ${fmtPct(metrics.avgTransporterSla)}. Trigger transporter review.`
      : metrics.transporterCount > 0
      ? `3PL SLA posture healthy at ${fmtPct(metrics.avgTransporterSla)}.`
      : "No 3PL transporters registered for this department.",
  ];

  return (
    <DashboardLayout
      title="Driver & 3PL Compliance"
      subtitle="Department-scoped driver compliance, transporter SLA, and exception attribution"
    >
      {!organizationId && (
        <Alert className="mb-4 border-warning/40 bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle>No department scope</AlertTitle>
          <AlertDescription>Ask an admin to attach your account to an organization.</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="mb-4 border-destructive/40 bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Driver intelligence unavailable</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unable to load department driver intelligence."}
          </AlertDescription>
        </Alert>
      )}

      <Alert className="mb-4 border-primary/30 bg-primary/5">
        <Shield className="h-4 w-4 text-primary" />
        <AlertTitle>Driver Intelligence - Scope Legend (Logistics Department)</AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
            <div className="rounded border border-border/40 p-2">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Badge variant="outline" className="text-[10px]">Internal</Badge>
                <span>Owned by your organization</span>
              </div>
              <p className="text-muted-foreground">
                Metrics shown: licence compliance, status, driver roster. Insurance scoring, accident liability, and behavior-based blocking are NOT shown - these are governed at the asset-owner level.
              </p>
            </div>
            <div className="rounded border border-border/40 p-2">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <Badge variant="outline" className="text-[10px]">3PL</Badge>
                <span>External transporter drivers</span>
              </div>
              <p className="text-muted-foreground">
                Metrics shown: SLA score, on-time rate, exception attribution, active driver count. Identity-level driver data is owned by the transporter.
              </p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { label: "Drivers", value: metrics.driverCount, icon: Users },
          { label: "Active", value: metrics.activeDrivers, icon: Shield },
          { label: "Licences expiring", value: metrics.expiring, icon: ClipboardCheck },
          { label: "3PL transporters", value: metrics.transporterCount, icon: Truck },
          { label: "Open exceptions", value: metrics.openExceptions, icon: AlertTriangle },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 text-center">
              <kpi.icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold text-foreground">{isLoading ? "-" : kpi.value}</p>
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" /> Department Directives
              </CardTitle>
              <CardDescription>Cost-center actions based on your organization-scoped records only</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {directives.map((d) => (
                <div key={d} className="p-4 rounded-lg border border-border/50 bg-muted/20 flex gap-3">
                  <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm font-medium text-foreground">{d}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Roster & Compliance</CardTitle>
              <CardDescription>Internal drivers and 3PL transporter SLA - no insurance-risk scoring</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="internal">
                <TabsList>
                  <TabsTrigger value="internal">Internal Drivers</TabsTrigger>
                  <TabsTrigger value="transporters">3PL Transporters</TabsTrigger>
                </TabsList>
                <TabsContent value="internal" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Driver</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Licence Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.drivers || []).slice(0, 15).map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>{d.full_name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{statusLabel(d.status)}</Badge>
                          </TableCell>
                          <TableCell>{d.license_expiry ? new Date(d.license_expiry).toLocaleDateString() : "-"}</TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && (data?.drivers || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                            No internal drivers found for this department.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="transporters" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transporter</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Active Drivers</TableHead>
                        <TableHead className="text-right">SLA Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.transporters || []).slice(0, 15).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>{t.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{statusLabel(t.status)}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{t.active_drivers ?? "-"}</TableCell>
                          <TableCell className="text-right">
                            {fmtPct(Number(t.sla_score || t.on_time_rate || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!isLoading && (data?.transporters || []).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No 3PL transporters registered for this department.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className={metrics.openExceptions ? "border-warning/40" : undefined}>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-warning" /> Recent Exceptions
              </CardTitle>
              <CardDescription>Attribution feeds transporter scorecards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {(data?.exceptions || []).slice(0, 6).map((e) => (
                <div key={e.id} className="rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize">{statusLabel(e.exception_type)}</p>
                    <Badge variant={["high", "critical"].includes(e.severity) ? "destructive" : "secondary"}>
                      {e.severity}
                    </Badge>
                  </div>
                  {e.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{e.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {e.transporter_id ? "3PL transporter" : e.driver_id ? "Internal driver" : "Unassigned"}
                  </p>
                </div>
              ))}
              {!isLoading && (data?.exceptions || []).length === 0 && (
                <p className="text-sm text-muted-foreground">No exceptions recorded this month.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
