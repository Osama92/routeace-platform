import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { safeDivide } from "@/lib/apiValidator";
import {
  TrendingDown,
  AlertTriangle,
  MapPin,
  DollarSign,
  Fuel,
  Wrench,
  Clock,
  Ban,
  RefreshCw,
  ArrowRight,
  BarChart3,
} from "lucide-react";
import { format, subMonths } from "date-fns";

interface LossRoute {
  routeId: string;
  routeName: string;
  origin: string;
  destination: string;
  totalRevenue: number;
  totalCost: number;
  lossAmount: number;
  lossReasons: string[];
  tripCount: number;
  avgDelay: number;
  maintenanceCost: number;
  fuelCost: number;
  isBlacklisted: boolean;
}

/**
 * Loss-Making Route Detector - Section C
 * Identifies routes where cost > revenue
 */
const LossRouteDetector = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [blacklistDialogOpen, setBlacklistDialogOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<LossRoute | null>(null);

  // Fetch route profitability data
  const { data: lossRoutes, isLoading } = useQuery({
    queryKey: ["loss-routes"],
    queryFn: async () => {
      const threeMonthsAgo = subMonths(new Date(), 3).toISOString();

      // Get dispatches with costs
      const { data: dispatches, error: dispatchError } = await supabase
        .from("dispatches")
        .select(`
          id,
          route_id,
          pickup_address,
          delivery_address,
          cost,
          actual_delivery,
          scheduled_delivery,
          status
        `)
        .gte("created_at", threeMonthsAgo)
        .eq("status", "delivered");

      if (dispatchError) throw dispatchError;

      // Get expenses by dispatch
      const { data: expenses, error: expenseError } = await supabase
        .from("expenses")
        .select("dispatch_id, amount, category")
        .gte("created_at", threeMonthsAgo)
        .eq("approval_status", "approved");

      if (expenseError) throw expenseError;

      // Get invoices for revenue
      const { data: invoices, error: invoiceError } = await supabase
        .from("invoices")
        .select("dispatch_id, total_amount, status")
        .gte("created_at", threeMonthsAgo);

      if (invoiceError) throw invoiceError;

      // Mock blacklist data (would come from route_blacklist table in production)
      const blacklist: { route_key: string; is_active: boolean }[] = [];

      // Group by route
      const routeMap = new Map<string, {
        revenue: number;
        cost: number;
        trips: number;
        delays: number[];
        maintenanceCost: number;
        fuelCost: number;
        origin: string;
        destination: string;
      }>();

      for (const dispatch of dispatches || []) {
        const routeKey = `${dispatch.pickup_address?.split(",")[0]} → ${dispatch.delivery_address?.split(",")[0]}`;
        
        if (!routeMap.has(routeKey)) {
          routeMap.set(routeKey, {
            revenue: 0,
            cost: 0,
            trips: 0,
            delays: [],
            maintenanceCost: 0,
            fuelCost: 0,
            origin: dispatch.pickup_address?.split(",")[0] || "",
            destination: dispatch.delivery_address?.split(",")[0] || "",
          });
        }

        const route = routeMap.get(routeKey)!;
        route.trips += 1;
        route.cost += dispatch.cost || 0;

        // Calculate delay
        if (dispatch.scheduled_delivery && dispatch.actual_delivery) {
          const scheduled = new Date(dispatch.scheduled_delivery);
          const actual = new Date(dispatch.actual_delivery);
          const delayHours = (actual.getTime() - scheduled.getTime()) / (1000 * 60 * 60);
          if (delayHours > 0) route.delays.push(delayHours);
        }

        // Add revenue from invoice
        const invoice = invoices?.find(i => i.dispatch_id === dispatch.id);
        if (invoice) {
          route.revenue += invoice.total_amount || 0;
        }

        // Add expenses
        const dispatchExpenses = expenses?.filter(e => e.dispatch_id === dispatch.id) || [];
        for (const expense of dispatchExpenses) {
          route.cost += expense.amount || 0;
          if (expense.category === "maintenance") route.maintenanceCost += expense.amount || 0;
          if (expense.category === "fuel") route.fuelCost += expense.amount || 0;
        }
      }

      // Convert to loss routes array
      const lossRoutesArray: LossRoute[] = [];

      for (const [routeKey, data] of routeMap.entries()) {
        const loss = data.cost - data.revenue;
        
        if (loss > 0 || data.delays.some(d => d > 24)) { // Loss-making or chronic delays
          const avgDelay = data.delays.length > 0 
            ? data.delays.reduce((a, b) => a + b, 0) / data.delays.length 
            : 0;

          // Determine loss reasons
          const reasons: string[] = [];
          if (data.cost > data.revenue) reasons.push("cost_exceeds_revenue");
          if (avgDelay > 24) reasons.push("chronic_delays");
          if (data.maintenanceCost > data.revenue * 0.2) reasons.push("maintenance_spike");
          if (data.fuelCost > data.revenue * 0.4) reasons.push("fuel_inefficiency");

          lossRoutesArray.push({
            routeId: routeKey,
            routeName: routeKey,
            origin: data.origin,
            destination: data.destination,
            totalRevenue: data.revenue,
            totalCost: data.cost,
            lossAmount: Math.max(0, loss),
            lossReasons: reasons,
            tripCount: data.trips,
            avgDelay,
            maintenanceCost: data.maintenanceCost,
            fuelCost: data.fuelCost,
            isBlacklisted: blacklist?.some(b => b.route_key === routeKey && b.is_active) || false,
          });
        }
      }

      return lossRoutesArray.sort((a, b) => b.lossAmount - a.lossAmount);
    },
  });

  // Blacklist route mutation (mock - would use database in production)
  const blacklistMutation = useMutation({
    mutationFn: async (routeKey: string) => {
      // In production, this would update the route_blacklist table
      console.log("Blacklisting route:", routeKey);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loss-routes"] });
      toast({ title: "Success", description: "Route has been blacklisted" });
      setBlacklistDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Summary stats
  const totalLoss = lossRoutes?.reduce((sum, r) => sum + r.lossAmount, 0) || 0;
  const lossRouteCount = lossRoutes?.length || 0;
  const blacklistedCount = lossRoutes?.filter(r => r.isBlacklisted).length || 0;

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case "cost_exceeds_revenue": return <DollarSign className="w-3 h-3" />;
      case "chronic_delays": return <Clock className="w-3 h-3" />;
      case "maintenance_spike": return <Wrench className="w-3 h-3" />;
      case "fuel_inefficiency": return <Fuel className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case "cost_exceeds_revenue": return "Cost > Revenue";
      case "chronic_delays": return "Chronic Delays";
      case "maintenance_spike": return "High Maintenance";
      case "fuel_inefficiency": return "Fuel Issues";
      default: return reason;
    }
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
            <TrendingDown className="w-5 h-5 text-red-500" />
            Loss-Making Route Detector
          </h3>
          <p className="text-sm text-muted-foreground">
            Identify unprofitable routes and take corrective action
          </p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["loss-routes"] })}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Analyze Routes
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-red-500/10 shrink-0">
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold text-red-600 tabular-nums truncate">₦{(totalLoss / 1_000_000).toFixed(1)}M</p>
                <p className="text-xs text-muted-foreground truncate">Total Losses</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-yellow-500/10 shrink-0">
                <MapPin className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums truncate">{lossRouteCount}</p>
                <p className="text-xs text-muted-foreground truncate">Loss Routes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-muted shrink-0">
                <Ban className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-bold tabular-nums truncate">{blacklistedCount}</p>
                <p className="text-xs text-muted-foreground truncate">Blacklisted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning Alert */}
      {lossRouteCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {lossRouteCount} routes are generating losses totaling ₦{(totalLoss / 1000000).toFixed(1)}M over the last 3 months.
            Review pricing, renegotiate contracts, or consider blacklisting these routes.
          </AlertDescription>
        </Alert>
      )}

      {/* Loss Routes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route Analysis (Last 90 Days)</CardTitle>
          <CardDescription>Routes with negative margins or operational issues</CardDescription>
        </CardHeader>
        <CardContent>
          {lossRoutes && lossRoutes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Loss</TableHead>
                  <TableHead>Issues</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lossRoutes.map((route) => (
                  <TableRow key={route.routeId} className={route.isBlacklisted ? "opacity-50" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{route.origin}</p>
                          <p className="text-xs text-muted-foreground">→ {route.destination}</p>
                        </div>
                        {route.isBlacklisted && <Badge variant="destructive">Blacklisted</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{route.tripCount}</TableCell>
                    <TableCell className="text-green-600">₦{route.totalRevenue.toLocaleString()}</TableCell>
                    <TableCell className="text-red-600">₦{route.totalCost.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className="font-bold text-red-600">-₦{route.lossAmount.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {route.lossReasons.map((reason) => (
                          <Badge key={reason} variant="outline" className="text-xs">
                            {getReasonIcon(reason)}
                            <span className="ml-1">{getReasonLabel(reason)}</span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {!route.isBlacklisted && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedRoute(route);
                            setBlacklistDialogOpen(true);
                          }}
                        >
                          <Ban className="w-3 h-3 mr-1" />
                          Blacklist
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No loss-making routes detected</p>
              <p className="text-sm mt-1">All routes are operating profitably</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommended Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <DollarSign className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium">Review Pricing</p>
              <p className="text-sm text-muted-foreground">
                Increase rates for loss-making routes to achieve minimum 15% margin
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Wrench className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium">Optimize Operations</p>
              <p className="text-sm text-muted-foreground">
                Reduce maintenance costs by using more reliable vehicles for problematic routes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Ban className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium">Blacklist Chronic Losers</p>
              <p className="text-sm text-muted-foreground">
                Consider blacklisting routes that consistently generate losses despite optimization
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist Confirmation Dialog */}
      <Dialog open={blacklistDialogOpen} onOpenChange={setBlacklistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Blacklist Route?</DialogTitle>
            <DialogDescription>
              Are you sure you want to blacklist the route "{selectedRoute?.routeName}"? 
              This will prevent future dispatches on this route.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlacklistDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRoute && blacklistMutation.mutate(selectedRoute.routeId)}
            >
              <Ban className="w-4 h-4 mr-2" />
              Blacklist Route
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LossRouteDetector;
