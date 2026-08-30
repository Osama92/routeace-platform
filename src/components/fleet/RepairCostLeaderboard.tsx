import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface LeaderboardRow {
  vehicle_id: string;
  registration_number: string;
  truck_type: string | null;
  total_spend: number;
  repair_count: number;
  breakdown_count: number;
  total_downtime_days: number;
  last_repair: string | null;
  cost_per_km: number | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency", currency: "NGN", maximumFractionDigits: 0,
  }).format(n);

/**
 * "Leaking pots" — which owned trucks are draining money on repairs.
 *
 * Owned vehicles only: a vendor maintains their own truck at their own cost,
 * so including them would mix someone else's spend into this fleet's figures.
 *
 * Ranked by total spend, with cost-per-km alongside. Spend on its own
 * rewards a truck for sitting idle — a lorry that never moves cannot break
 * down. Cost per km is what actually says whether a truck is expensive for
 * the work it does, so both are shown and neither is presented alone.
 */
const RepairCostLeaderboard = ({ organizationId }: { organizationId?: string | null }) => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["repair-leaderboard", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_fleet_repair_leaderboard", {
        p_organization_id: organizationId,
      });
      if (error) throw error;
      return (data ?? []) as LeaderboardRow[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent>
      </Card>
    );
  }

  const withRepairs = rows.filter((r) => r.repair_count > 0);
  const totalSpend = rows.reduce((s, r) => s + Number(r.total_spend || 0), 0);
  const totalBreakdowns = rows.reduce((s, r) => s + Number(r.breakdown_count || 0), 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" />
              Repair Cost by Vehicle
            </CardTitle>
            <CardDescription>
              Owned trucks only — vendor trucks are maintained by their vendor.
            </CardDescription>
          </div>
          {totalSpend > 0 && (
            <div className="text-right">
              <p className="text-lg font-semibold">{fmt(totalSpend)}</p>
              <p className="text-xs text-muted-foreground">
                across {withRepairs.length} {withRepairs.length === 1 ? "truck" : "trucks"}
                {totalBreakdowns > 0 && ` · ${totalBreakdowns} breakdown${totalBreakdowns === 1 ? "" : "s"}`}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No owned vehicles in this fleet yet.
          </p>
        ) : withRepairs.length === 0 ? (
          <div className="py-6 text-center space-y-1">
            <p className="text-sm text-muted-foreground">No repairs logged yet.</p>
            <p className="text-xs text-muted-foreground">
              Open a vehicle and use the Repairs tab to record work and its cost.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Total spend</TableHead>
                  <TableHead className="text-right">Cost / km</TableHead>
                  <TableHead className="text-center">Repairs</TableHead>
                  <TableHead className="text-center">Days off road</TableHead>
                  <TableHead>Last repair</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withRepairs.map((r, i) => {
                  // Flagged when it is both the worst spender and has actually
                  // broken down — high spend alone can just mean good upkeep.
                  const isWorst = i === 0 && r.breakdown_count > 0 && withRepairs.length > 1;
                  return (
                    <TableRow key={r.vehicle_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.registration_number}</span>
                          {r.truck_type && (
                            <Badge variant="secondary" className="text-[10px]">{r.truck_type}</Badge>
                          )}
                          {isWorst && (
                            <Badge variant="outline" className="text-red-600 border-red-500/40 text-[10px]">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Highest cost
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(Number(r.total_spend))}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.cost_per_km !== null && Number(r.cost_per_km) > 0 ? (
                          fmt(Number(r.cost_per_km))
                        ) : (
                          // No distance recorded, so cost per km would be a
                          // division by zero dressed up as a real figure.
                          <span className="text-muted-foreground" title="No distance recorded for this vehicle">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.repair_count}
                        {r.breakdown_count > 0 && (
                          <span className="text-xs text-red-600"> ({r.breakdown_count} bd)</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {Number(r.total_downtime_days) || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.last_repair ? format(new Date(r.last_repair), "d MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepairCostLeaderboard;
