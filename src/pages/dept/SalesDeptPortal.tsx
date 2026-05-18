import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Activity, Clock, Package, TrendingUp, MapPin, ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { format as formatDate } from "date-fns";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";

type RangeKey = "7" | "30" | "90";

interface Dispatch {
  id: string;
  dispatch_number: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  status: string | null;
  sla_status: string | null;
  scheduled_pickup: string | null;
  scheduled_delivery: string | null;
  actual_pickup: string | null;
  actual_delivery: string | null;
  estimated_arrival: string | null;
  created_at: string;
  notes: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  draft: "bg-muted text-muted-foreground",
  dispatched: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_transit: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  delivered: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  delayed: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

function statusLabel(s: string | null) {
  if (!s) return "Unknown";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const SalesDeptPortal = () => {
  const { organizationId } = useAuth();
  const [range, setRange] = useState<RangeKey>("30");
  const navigate = useNavigate();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Dispatch | null>(null);

  useEffect(() => {
    if (!organizationId) return;
    const since = new Date();
    since.setDate(since.getDate() - parseInt(range, 10));
    setLoading(true);
    supabase
      .from("dispatches")
      .select(
        "id, dispatch_number, pickup_address, delivery_address, status, sla_status, scheduled_pickup, scheduled_delivery, actual_pickup, actual_delivery, estimated_arrival, created_at, notes"
      )
      .eq("organization_id", organizationId)
      .gte("created_at", since.toISOString())
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => {
        setDispatches((data as any as Dispatch[]) || []);
        setLoading(false);
      });
  }, [organizationId, range]);

  const kpis = useMemo(() => {
    const total = dispatches.length;
    const delivered = dispatches.filter((d) => d.status === "delivered").length;
    const onTime = dispatches.filter(
      (d) =>
        d.status === "delivered" &&
        d.actual_delivery &&
        d.scheduled_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
    ).length;
    const otd = delivered > 0 ? Math.round((onTime / delivered) * 100) : 0;
    const active = dispatches.filter((d) =>
      ["dispatched", "in_transit"].includes(d.status || "")
    ).length;
    const pending = dispatches.filter((d) =>
      ["pending", "draft"].includes(d.status || "")
    ).length;
    const cycles = dispatches
      .filter((d) => d.actual_delivery && d.created_at)
      .map(
        (d) =>
          (new Date(d.actual_delivery!).getTime() - new Date(d.created_at).getTime()) /
          3600000
      );
    const avgCycle = cycles.length
      ? Math.round((cycles.reduce((a, b) => a + b, 0) / cycles.length) * 10) / 10
      : 0;
    return { otd, active, pending, avgCycle };
  }, [dispatches]);

  const slaSeries = useMemo(() => {
    const buckets = new Map<string, { delivered: number; onTime: number }>();
    dispatches.forEach((d) => {
      if (d.status !== "delivered" || !d.actual_delivery) return;
      const key = new Date(d.actual_delivery).toISOString().slice(0, 10);
      const b = buckets.get(key) || { delivered: 0, onTime: 0 };
      b.delivered += 1;
      if (
        d.scheduled_delivery &&
        new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
      ) {
        b.onTime += 1;
      }
      buckets.set(key, b);
    });
    return Array.from(buckets.entries())
      .sort()
      .map(([date, b]) => ({
        date: date.slice(5),
        actual: Math.round((b.onTime / Math.max(b.delivered, 1)) * 100),
        target: 95,
      }));
  }, [dispatches]);

  const delayReasons = useMemo(() => {
    const KEYWORDS = [
      { label: "Traffic", match: /traffic/i },
      { label: "Recipient Absent", match: /absent|not available/i },
      { label: "Mechanical", match: /mechanical|breakdown|engine/i },
      { label: "Weather", match: /weather|rain|flood/i },
      { label: "Incorrect Address", match: /address/i },
    ];
    const counts = KEYWORDS.map((k) => ({ name: k.label, value: 0 }));
    let other = 0;
    dispatches.forEach((d) => {
      if (!d.notes) return;
      const matched = KEYWORDS.findIndex((k) => k.match.test(d.notes!));
      if (matched >= 0) counts[matched].value += 1;
      else other += 1;
    });
    return [...counts, { name: "Other", value: other }].filter((c) => c.value > 0);
  }, [dispatches]);

  return (
    <DashboardLayout title="Sales & Distribution Tracker" subtitle="Read-only logistics visibility for Sales / Internal Stakeholders">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!dispatches || dispatches.length === 0) { toast.info("No data to export"); return; }
              const headers = ["Dispatch #","Status","Origin","Destination","Scheduled Delivery","Actual Delivery","SLA Status","OTD"];
              const rows = dispatches.map((d) => [
                d.dispatch_number ?? "",
                d.status ?? "",
                d.pickup_address ?? "",
                d.delivery_address ?? "",
                d.scheduled_delivery ? formatDate(new Date(d.scheduled_delivery), "yyyy-MM-dd HH:mm") : "",
                d.actual_delivery ? formatDate(new Date(d.actual_delivery), "yyyy-MM-dd HH:mm") : "",
                d.sla_status ?? "",
                d.sla_status === "met" ? "Yes" : "No",
              ]);
              const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `deliveries-${formatDate(new Date(), "yyyy-MM-dd")}.csv`;
              a.click(); URL.revokeObjectURL(url);
              toast.success("Exported to CSV");
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1" />Export CSV
          </Button>
          <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6" id="sla">
        <KpiCard icon={TrendingUp} label="On-Time Delivery" value={`${kpis.otd}%`} />
        <KpiCard icon={Activity} label="Active Deliveries" value={kpis.active} />
        <KpiCard icon={Package} label="Pending Dispatch" value={kpis.pending} />
        <KpiCard icon={Clock} label="Avg. Cycle Time" value={`${kpis.avgCycle}h`} />
      </div>

      {/* Order timeline table */}
      <Card className="mb-6" id="orders">
        <CardHeader>
          <CardTitle className="text-lg">Sales Order Status - End to End</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : dispatches.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No orders in this period yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Ref</TableHead>
                  <TableHead>Origin</TableHead>
                  <TableHead>Destination</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.slice(0, 50).map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() => setSelected(d)}
                  >
                    <TableCell className="font-mono text-xs">
                      {d.dispatch_number || d.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">
                      {d.pickup_address || "-"}
                    </TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">
                      {d.delivery_address || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.estimated_arrival
                        ? new Date(d.estimated_arrival).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.actual_delivery
                        ? new Date(d.actual_delivery).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`${STATUS_BADGE[d.status || "pending"] || STATUS_BADGE.pending} border text-[10px]`}
                      >
                        {statusLabel(d.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {d.sla_status || "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SLA Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            {slaSeries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">
                Not enough completed deliveries yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={slaSeries}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={11} />
                  <YAxis domain={[0, 100]} fontSize={11} />
                  <Tooltip />
                  <Line type="monotone" dataKey="target" stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delay Reason Breakdown</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            {delayReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-16">
                No delay reasons captured.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={delayReasons}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Map placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Live Delivery Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 rounded-lg border border-dashed border-border/60 flex items-center justify-center text-sm text-muted-foreground">
            Live map coming soon.
          </div>
        </CardContent>
      </Card>

      {/* Detail side panel */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.dispatch_number || selected.id.slice(0, 8)}
                </SheetTitle>
                <SheetDescription>
                  Created {new Date(selected.created_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-4 mt-6 text-sm">
                <Field label="Origin" value={selected.pickup_address} />
                <Field label="Destination" value={selected.delivery_address} />
                <Field
                  label="Scheduled Pickup"
                  value={selected.scheduled_pickup ? new Date(selected.scheduled_pickup).toLocaleString() : "-"}
                />
                <Field
                  label="Scheduled Delivery"
                  value={selected.scheduled_delivery ? new Date(selected.scheduled_delivery).toLocaleString() : "-"}
                />
                <Field
                  label="Actual Delivery"
                  value={selected.actual_delivery ? new Date(selected.actual_delivery).toLocaleString() : "-"}
                />
                <Field label="Status" value={statusLabel(selected.status)} />
                <Field label="SLA Status" value={selected.sla_status || "-"} />
                <div className="pt-2 border-t border-border/40">
                  <h4 className="font-medium mb-2">Status Timeline</h4>
                  <ol className="space-y-1 text-xs text-muted-foreground">
                    <li>• Created - {new Date(selected.created_at).toLocaleString()}</li>
                    {selected.actual_pickup && (
                      <li>• Dispatched - {new Date(selected.actual_pickup).toLocaleString()}</li>
                    )}
                    {selected.actual_delivery && (
                      <li>• Delivered - {new Date(selected.actual_delivery).toLocaleString()}</li>
                    )}
                  </ol>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
};

const KpiCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const Field = ({ label, value }: { label: string; value: string | null }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-sm">{value || "-"}</div>
  </div>
);

export default SalesDeptPortal;
