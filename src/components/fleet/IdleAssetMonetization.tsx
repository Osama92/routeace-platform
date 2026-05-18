import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeDivide } from "@/lib/apiValidator";
import {
  Clock,
  Truck,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RefreshCw,
  MapPin,
  Percent,
} from "lucide-react";
import { format, differenceInHours, subDays } from "date-fns";

interface IdleAsset {
  id: string;
  registration_number: string;
  plate_number: string;
  truck_type: string;
  status: string;
  last_dispatch_at: string | null;
  idle_hours: number;
  potential_revenue: number;
  suggestion: "rental" | "discount" | "reassign";
}

/**
 * Idle Asset Monetization - Section B
 * Detects idle assets and suggests revenue recovery actions
 */
const IdleAssetMonetization = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [idleThresholdHours, setIdleThresholdHours] = useState(48);

  // Fetch vehicles with last dispatch info
  const { data: idleAssets, isLoading } = useQuery({
    queryKey: ["idle-assets", idleThresholdHours],
    queryFn: async () => {
      // Get all active vehicles
      const { data: vehicles, error: vehicleError } = await supabase
        .from("vehicles")
        .select("id, registration_number, truck_type, status")
        .eq("status", "active");

      if (vehicleError) throw vehicleError;

      // Get last dispatch for each vehicle
      const { data: dispatches, error: dispatchError } = await supabase
        .from("dispatches")
        .select("vehicle_id, created_at, status")
        .not("vehicle_id", "is", null)
        .order("created_at", { ascending: false });

      if (dispatchError) throw dispatchError;

      // Calculate idle hours for each vehicle
      const now = new Date();
      const idleVehicles: IdleAsset[] = [];

      for (const vehicle of vehicles || []) {
        const lastDispatch = dispatches?.find(d => d.vehicle_id === vehicle.id);
        const lastDispatchAt = lastDispatch?.created_at || null;
        
        const idleHours = lastDispatchAt 
          ? differenceInHours(now, new Date(lastDispatchAt))
          : 999; // Very idle if never dispatched

        if (idleHours >= idleThresholdHours) {
          // Calculate potential daily revenue based on truck type
          const dailyRateByType: Record<string, number> = {
            "40ft": 150000,
            "20ft": 100000,
            "flatbed": 120000,
            "tanker": 180000,
            "default": 100000,
          };
          const dailyRate = dailyRateByType[vehicle.truck_type || "default"] || dailyRateByType.default;
          const idleDays = Math.ceil(idleHours / 24);
          const potentialRevenue = dailyRate * idleDays;

          // Determine suggestion based on idle duration
          let suggestion: "rental" | "discount" | "reassign";
          if (idleHours > 168) { // Over 1 week
            suggestion = "rental";
          } else if (idleHours > 96) { // Over 4 days
            suggestion = "discount";
          } else {
            suggestion = "reassign";
          }

          idleVehicles.push({
            id: vehicle.id,
            registration_number: vehicle.registration_number || "",
            plate_number: vehicle.registration_number || "",
            truck_type: vehicle.truck_type || "N/A",
            status: vehicle.status || "active",
            last_dispatch_at: lastDispatchAt,
            idle_hours: idleHours,
            potential_revenue: potentialRevenue,
            suggestion,
          });
        }
      }

      return idleVehicles.sort((a, b) => b.idle_hours - a.idle_hours);
    },
  });

  // Calculate summary stats
  const totalIdleAssets = idleAssets?.length || 0;
  const totalPotentialRevenue = idleAssets?.reduce((sum, a) => sum + a.potential_revenue, 0) || 0;
  const avgIdleHours = idleAssets && idleAssets.length > 0
    ? idleAssets.reduce((sum, a) => sum + a.idle_hours, 0) / idleAssets.length
    : 0;

  const getSuggestionBadge = (suggestion: string) => {
    switch (suggestion) {
      case "rental":
        return <Badge className="bg-blue-500/15 text-blue-600">Suggest Rental</Badge>;
      case "discount":
        return <Badge className="bg-yellow-500/15 text-yellow-600">Offer Discount</Badge>;
      case "reassign":
        return <Badge className="bg-green-500/15 text-green-600">Route Reassign</Badge>;
      default:
        return <Badge variant="secondary">{suggestion}</Badge>;
    }
  };

  const getIdleBadge = (hours: number) => {
    if (hours > 168) return <Badge variant="destructive">{Math.ceil(hours / 24)} days idle</Badge>;
    if (hours > 96) return <Badge className="bg-yellow-500/15 text-yellow-600">{Math.ceil(hours / 24)} days idle</Badge>;
    return <Badge variant="secondary">{hours}h idle</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-heading font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            Idle Asset Monetization
          </h3>
          <p className="text-sm text-muted-foreground">
            Detect underutilized assets and maximize revenue
          </p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["idle-assets"] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className={totalIdleAssets > 0 ? "border-yellow-500/30 bg-yellow-500/5" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                <Truck className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums truncate">{totalIdleAssets}</p>
                <p className="text-xs text-muted-foreground truncate">Idle Assets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <DollarSign className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums truncate">₦{(totalPotentialRevenue / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground truncate">Revenue Lost</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Clock className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums truncate">{avgIdleHours.toFixed(0)}h</p>
                <p className="text-xs text-muted-foreground truncate">Avg Idle Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recovery Suggestions Alert */}
      {totalIdleAssets > 0 && (
        <Alert className="border-yellow-500/30 bg-yellow-500/5">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <AlertTitle>Revenue Recovery Opportunities</AlertTitle>
          <AlertDescription>
            You have {totalIdleAssets} idle assets with potential revenue of ₦{(totalPotentialRevenue / 1000000).toFixed(1)}M. 
            Consider rental agreements, discounted pricing, or route reassignment to recover this value.
          </AlertDescription>
        </Alert>
      )}

      {/* Idle Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Idle Asset Details</CardTitle>
          <CardDescription>
            Assets with no dispatch in the last {idleThresholdHours} hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {idleAssets && idleAssets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Idle Duration</TableHead>
                  <TableHead>Last Dispatch</TableHead>
                  <TableHead>Lost Revenue</TableHead>
                  <TableHead>Suggestion</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {idleAssets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{asset.plate_number || asset.registration_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="capitalize">{asset.truck_type}</TableCell>
                    <TableCell>{getIdleBadge(asset.idle_hours)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {asset.last_dispatch_at 
                        ? format(new Date(asset.last_dispatch_at), "MMM d, yyyy")
                        : "Never dispatched"}
                    </TableCell>
                    <TableCell className="font-medium text-red-600">
                      ₦{asset.potential_revenue.toLocaleString()}
                    </TableCell>
                    <TableCell>{getSuggestionBadge(asset.suggestion)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="w-4 h-4 mr-1" />
                        Take Action
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No idle assets detected</p>
              <p className="text-sm mt-1">All vehicles are being actively utilized</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Suggestions */}
      {idleAssets && idleAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium">Rental Opportunities</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {idleAssets.filter(a => a.suggestion === "rental").length} assets suitable for short-term rental
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Percent className="w-4 h-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">Discount Pricing</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {idleAssets.filter(a => a.suggestion === "discount").length} assets to offer at reduced rates
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium">Route Reassignment</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {idleAssets.filter(a => a.suggestion === "reassign").length} assets ready for new routes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default IdleAssetMonetization;
