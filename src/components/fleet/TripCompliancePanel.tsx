import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Lock, Unlock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

interface ComplianceRow {
  vehicle_id: string;
  registration_number: string;
  truck_type: string | null;
  gate_allowed: boolean;
  gate_reason: string;
  gate_message: string;
  open_dispatch_number: string | null;
  pre_trips_30d: number;
  post_trips_30d: number;
  dispatches_30d: number;
  missing_post_trips: number;
  overrides_30d: number;
  last_inspection: string | null;
}

/**
 * Trip check compliance for owned trucks.
 *
 * The headline number is MISSING POST-TRIPS, not checks completed. A count of
 * completed checks flatters a fleet that barely moves; what a maintenance
 * culture needs to surface is the trips that ran without being closed out.
 *
 * Vendor trucks are absent by design — the vendor maintains them, so counting
 * them here would report a compliance failure against work this organisation
 * has no standing to inspect.
 */
export default function TripCompliancePanel() {
  const { organizationId, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [releaseTarget, setReleaseTarget] = useState<ComplianceRow | null>(null);
  const [reason, setReason] = useState("");

  const isSuperAdmin = hasAnyRole(["super_admin"]);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["trip-compliance", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_trip_compliance", {
        p_organization_id: organizationId,
      });
      if (error) throw error;
      return (data ?? []) as ComplianceRow[];
    },
  });

  const release = useMutation({
    mutationFn: async () => {
      if (!releaseTarget) return;
      const { error } = await (supabase.rpc as any)("release_vehicle_trip_block", {
        p_vehicle_id: releaseTarget.vehicle_id,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Vehicle released",
        description: "The override is recorded against your name and appears in this report.",
      });
      setReleaseTarget(null);
      setReason("");
      qc.invalidateQueries({ queryKey: ["trip-compliance"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not release", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });

  if (isLoading) {
    return <Card><CardContent className="p-6"><Skeleton className="h-40 w-full" /></CardContent></Card>;
  }

  const blocked = rows.filter((r) => !r.gate_allowed);
  const totalMissing = rows.reduce((s, r) => s + Number(r.missing_post_trips || 0), 0);
  const totalOverrides = rows.reduce((s, r) => s + Number(r.overrides_30d || 0), 0);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                Trip Check Compliance
              </CardTitle>
              <CardDescription>
                Owned trucks only — vendor trucks are maintained by their vendor.
              </CardDescription>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className={`text-lg font-semibold ${totalMissing > 0 ? "text-yellow-600" : ""}`}>
                  {totalMissing}
                </p>
                <p className="text-xs text-muted-foreground">missing post-trips</p>
              </div>
              <div>
                <p className={`text-lg font-semibold ${blocked.length > 0 ? "text-destructive" : ""}`}>
                  {blocked.length}
                </p>
                <p className="text-xs text-muted-foreground">locked</p>
              </div>
              {totalOverrides > 0 && (
                <div>
                  <p className="text-lg font-semibold">{totalOverrides}</p>
                  <p className="text-xs text-muted-foreground">overrides (30d)</p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No owned vehicles in this fleet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Trips 30d</TableHead>
                    <TableHead className="text-center">Pre / Post</TableHead>
                    <TableHead className="text-center">Missing</TableHead>
                    <TableHead>Last check</TableHead>
                    {isSuperAdmin && <TableHead className="text-right">Action</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.vehicle_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.registration_number}</span>
                          {r.truck_type && (
                            <Badge variant="secondary" className="text-[10px]">{r.truck_type}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.gate_allowed ? (
                          <Badge variant="outline" className="text-green-600 border-green-500/40 gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Clear
                          </Badge>
                        ) : (
                          <div>
                            <Badge variant="outline" className="text-destructive border-destructive/40 gap-1">
                              <Lock className="w-3 h-3" />
                              Locked
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                              {r.gate_message}
                            </p>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{r.dispatches_30d}</TableCell>
                      <TableCell className="text-center text-sm">
                        {r.pre_trips_30d} / {r.post_trips_30d}
                      </TableCell>
                      <TableCell className="text-center">
                        {Number(r.missing_post_trips) > 0 ? (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-500/40">
                            {r.missing_post_trips}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.last_inspection
                          ? format(new Date(r.last_inspection), "d MMM yyyy")
                          : "Never"}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          {!r.gate_allowed && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => setReleaseTarget(r)}
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              Release
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {totalMissing > 0 && (
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              A missing post-trip means a completed trip was never closed out, so
              that journey's wear is not attributable to any check.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!releaseTarget} onOpenChange={(o) => !o && setReleaseTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release {releaseTarget?.registration_number}?</DialogTitle>
            <DialogDescription>
              {releaseTarget?.gate_message}
              <br /><br />
              Releasing lets this truck be dispatched without the outstanding check.
              Your name and reason are recorded and shown in this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being released? e.g. post-trip done on paper, driver unavailable to log it"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReleaseTarget(null)}>Cancel</Button>
            <Button
              onClick={() => release.mutate()}
              disabled={release.isPending || !reason.trim()}
            >
              {release.isPending ? "Releasing..." : "Release vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
