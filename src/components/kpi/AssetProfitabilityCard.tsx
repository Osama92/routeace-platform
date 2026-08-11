 import { useQuery } from "@tanstack/react-query";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { supabase } from "@/integrations/supabase/client";
 import { useAuth } from "@/contexts/AuthContext";
 import { 
 DollarSign, 
 TrendingUp, 
 TrendingDown, 
 Truck, 
 AlertTriangle,
 ArrowUp,
 ArrowDown,
 BarChart3
 } from "lucide-react";
 import { startOfMonth, subMonths, format } from "date-fns";
 
 interface AssetProfitability {
 id: string;
 asset_type: string;
 asset_id: string;
 period_start: string;
 period_end: string;
 total_revenue: number;
 total_cost: number;
 net_profit: number;
 profit_margin_percent: number;
 }
 
 /**
  * Asset Profitability KPI Card - Section B (New KPIs)
  * Shows average profit margin per asset
  */
 const AssetProfitabilityCard = () => {
 const { organizationId } = useAuth();

 // Derived from live data rather than the asset_profitability table, which
 // is empty and has no writer anywhere. It also carries no organization_id,
 // so it could not have been tenant-scoped even once populated.
 //
 // Revenue and vendor cost come from dispatch_financials, attributed to a
 // vehicle through the dispatch. Running costs come from vehicle-tagged
 // approved expenses.
 //
 // fuel_logs is deliberately NOT added as a cost source: the same 2 vehicles
 // appear in both fuel_logs and expenses(category='fuel'), so summing both
 // would double-count fuel and understate profit. Expenses is the broader,
 // approval-gated record, so it is the single source used here.
 const { data: profitData, isLoading } = useQuery({
   queryKey: ["asset-profitability-kpi", organizationId],
   enabled: !!organizationId,
   queryFn: async () => {
     const since = subMonths(new Date(), 3);
     const sinceISO = since.toISOString();
     const sinceDate = sinceISO.split("T")[0];

     const [vehRes, dispRes, expRes] = await Promise.all([
       supabase
         .from("vehicles")
         .select("id, registration_number")
         .eq("organization_id", organizationId),
       supabase
         .from("dispatches")
         .select("id, vehicle_id")
         .eq("organization_id", organizationId)
         .not("vehicle_id", "is", null)
         .gte("created_at", sinceISO),
       supabase
         .from("expenses")
         .select("vehicle_id, amount")
         .eq("organization_id", organizationId)
         .eq("approval_status", "approved")
         .not("vehicle_id", "is", null)
         .gte("expense_date", sinceDate),
     ]);

     const dispatches = dispRes.data || [];
     const dispatchIds = dispatches.map((d: any) => d.id);

     const { data: financials } = dispatchIds.length
       ? await supabase
           .from("dispatch_financials")
           .select("dispatch_id, client_revenue, vendor_cost, finance_status")
           .eq("organization_id", organizationId)
           .in("dispatch_id", dispatchIds)
       : { data: [] as any[] };

     // One finance entry per dispatch; a 'complete' record wins.
     const finByDispatch = new Map<string, { revenue: number; cost: number }>();
     (financials || []).forEach((f: any) => {
       const prev = finByDispatch.get(f.dispatch_id);
       if (!prev || f.finance_status === "complete") {
         finByDispatch.set(f.dispatch_id, {
           revenue: Number(f.client_revenue) || 0,
           cost: Number(f.vendor_cost) || 0,
         });
       }
     });

     const byVehicle = new Map<string, { revenue: number; cost: number }>();
     dispatches.forEach((d: any) => {
       const fin = finByDispatch.get(d.id);
       if (!fin) return;
       const cur = byVehicle.get(d.vehicle_id) || { revenue: 0, cost: 0 };
       cur.revenue += fin.revenue;
       cur.cost += fin.cost;
       byVehicle.set(d.vehicle_id, cur);
     });

     (expRes.data || []).forEach((e: any) => {
       const cur = byVehicle.get(e.vehicle_id) || { revenue: 0, cost: 0 };
       cur.cost += Number(e.amount) || 0;
       byVehicle.set(e.vehicle_id, cur);
     });

     const regByVehicle = new Map<string, string>();
     (vehRes.data || []).forEach((v: any) => regByVehicle.set(v.id, v.registration_number));

     const periodStart = format(since, "yyyy-MM-dd");
     const periodEnd = format(new Date(), "yyyy-MM-dd");

     // Only vehicles with recorded economics. A vehicle with neither revenue
     // nor cost is unmeasured, not unprofitable, and including it at 0%
     // would drag the fleet average toward a number that means nothing.
     return Array.from(byVehicle.entries())
       .filter(([, v]) => v.revenue > 0 || v.cost > 0)
       .map(([vehicleId, v]) => {
         const netProfit = v.revenue - v.cost;
         return {
           id: vehicleId,
           asset_type: regByVehicle.get(vehicleId) || "Vehicle",
           asset_id: vehicleId,
           period_start: periodStart,
           period_end: periodEnd,
           total_revenue: v.revenue,
           total_cost: v.cost,
           net_profit: netProfit,
           profit_margin_percent: v.revenue > 0 ? (netProfit / v.revenue) * 100 : -100,
         } as AssetProfitability;
       })
       .sort((a, b) => b.profit_margin_percent - a.profit_margin_percent);
   },
 });
 
 // Calculate metrics
 const avgMargin = profitData && profitData.length > 0
   ? profitData.reduce((sum, p) => sum + (p.profit_margin_percent || 0), 0) / profitData.length
   : 0;
 
 const totalRevenue = profitData?.reduce((sum, p) => sum + (p.total_revenue || 0), 0) || 0;
 const totalCost = profitData?.reduce((sum, p) => sum + (p.total_cost || 0), 0) || 0;
 const netProfit = totalRevenue - totalCost;
 
 // Best and worst performing assets
 const assetPerformance = profitData?.reduce((acc, p) => {
   const key = `${p.asset_type}-${p.asset_id}`;
   if (!acc[key]) acc[key] = { type: p.asset_type, id: p.asset_id, totalMargin: 0, count: 0 };
   acc[key].totalMargin += p.profit_margin_percent || 0;
   acc[key].count += 1;
   return acc;
 }, {} as Record<string, { type: string; id: string; totalMargin: number; count: number }>) || {};
 
 const sortedAssets = Object.values(assetPerformance)
   .map(a => ({ ...a, avgMargin: a.totalMargin / a.count }))
   .sort((a, b) => b.avgMargin - a.avgMargin);
 
 const bestAsset = sortedAssets[0];
 const worstAsset = sortedAssets[sortedAssets.length - 1];
 
 // Margin trend (current month vs previous)
 const currentMonth = startOfMonth(new Date()).toISOString().split("T")[0];
 const prevMonth = startOfMonth(subMonths(new Date(), 1)).toISOString().split("T")[0];
 
 const currentMonthData = profitData?.filter(p => p.period_start >= currentMonth) || [];
 const prevMonthData = profitData?.filter(p => 
   p.period_start >= prevMonth && p.period_start < currentMonth
 ) || [];
 
 const currentAvg = currentMonthData.length > 0
   ? currentMonthData.reduce((sum, p) => sum + (p.profit_margin_percent || 0), 0) / currentMonthData.length
   : 0;
 
 const prevAvg = prevMonthData.length > 0
   ? prevMonthData.reduce((sum, p) => sum + (p.profit_margin_percent || 0), 0) / prevMonthData.length
   : currentAvg;
 
 const trend = currentAvg - prevAvg;
 const isImproving = trend > 0;
 
 // Asset type breakdown
 const typeBreakdown = profitData?.reduce((acc, p) => {
   if (!acc[p.asset_type]) acc[p.asset_type] = { count: 0, totalMargin: 0, revenue: 0 };
   acc[p.asset_type].count += 1;
   acc[p.asset_type].totalMargin += p.profit_margin_percent || 0;
   acc[p.asset_type].revenue += p.total_revenue || 0;
   return acc;
 }, {} as Record<string, { count: number; totalMargin: number; revenue: number }>) || {};
 
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
   <Card>
     <CardHeader className="pb-3">
       <div className="flex items-center justify-between">
         <div>
           <CardTitle className="text-base flex items-center gap-2">
             <DollarSign className="w-4 h-4 text-green-500" />
             Avg Profit Margin per Asset
           </CardTitle>
           <CardDescription>Last 90 days performance</CardDescription>
         </div>
         <div className="flex items-center gap-1">
           {isImproving ? (
             <ArrowUp className="w-4 h-4 text-green-500" />
           ) : trend < 0 ? (
             <ArrowDown className="w-4 h-4 text-red-500" />
           ) : null}
           <span className={`text-sm font-medium ${isImproving ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"}`}>
             {trend.toFixed(1)}%
           </span>
         </div>
       </div>
     </CardHeader>
     <CardContent className="space-y-4">
       {/* Main Metric */}
       <div className="text-center p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20">
         <p className="text-4xl font-bold text-green-600">{avgMargin.toFixed(1)}%</p>
         <p className="text-sm text-muted-foreground mt-1">Average Margin</p>
       </div>
 
       {/* Summary */}
       <div className="grid grid-cols-3 gap-2 text-center">
         <div className="p-2 rounded-lg bg-muted/50">
           <p className="text-lg font-semibold">₦{(totalRevenue / 1000000).toFixed(1)}M</p>
           <p className="text-xs text-muted-foreground">Revenue</p>
         </div>
         <div className="p-2 rounded-lg bg-muted/50">
           <p className="text-lg font-semibold">₦{(totalCost / 1000000).toFixed(1)}M</p>
           <p className="text-xs text-muted-foreground">Costs</p>
         </div>
         <div className="p-2 rounded-lg bg-muted/50">
           <p className={`text-lg font-semibold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
             ₦{(netProfit / 1000000).toFixed(1)}M
           </p>
           <p className="text-xs text-muted-foreground">Profit</p>
         </div>
       </div>
 
       {/* Best/Worst Performers */}
       {sortedAssets.length > 0 && (
         <div className="space-y-2">
           <p className="text-sm font-medium flex items-center gap-2">
             <BarChart3 className="w-4 h-4" />
             Asset Performance
           </p>
           
           {bestAsset && (
             <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10 border border-green-500/20">
               <div className="flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-green-500" />
                 <span className="text-sm capitalize">{bestAsset.type}</span>
               </div>
               <Badge className="bg-green-500/15 text-green-600">
                 {bestAsset.avgMargin.toFixed(1)}% margin
               </Badge>
             </div>
           )}
 
           {worstAsset && sortedAssets.length > 1 && (
             <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20">
               <div className="flex items-center gap-2">
                 <TrendingDown className="w-4 h-4 text-red-500" />
                 <span className="text-sm capitalize">{worstAsset.type}</span>
               </div>
               <Badge className="bg-red-500/15 text-red-600">
                 {worstAsset.avgMargin.toFixed(1)}% margin
               </Badge>
             </div>
           )}
         </div>
       )}
 
       {/* Asset Type Breakdown */}
       {Object.keys(typeBreakdown).length > 0 && (
         <div className="space-y-2">
           <p className="text-sm font-medium">By Asset Type</p>
           {Object.entries(typeBreakdown).map(([type, data]) => (
             <div key={type} className="space-y-1">
               <div className="flex items-center justify-between text-xs">
                 <span className="capitalize">{type.replace("_", " ")}</span>
                 <span className="text-muted-foreground">
                   {(data.totalMargin / data.count).toFixed(1)}% avg
                 </span>
               </div>
               <Progress 
                 value={Math.min(100, Math.max(0, data.totalMargin / data.count))} 
                 className="h-1.5" 
               />
             </div>
           ))}
         </div>
       )}
 
       {/* Warning for low margin */}
       {avgMargin < 10 && profitData && profitData.length > 0 && (
         <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
           <div className="flex items-start gap-2">
             <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
             <div className="text-sm">
               <p className="font-medium text-red-600">Low margin detected</p>
               <p className="text-muted-foreground text-xs mt-1">
                 Review maintenance costs or adjust pricing strategy
               </p>
             </div>
           </div>
         </div>
       )}
 
       {(!profitData || profitData.length === 0) && (
         <div className="text-center py-4 text-muted-foreground text-sm">
           No profitability data available
         </div>
       )}
     </CardContent>
   </Card>
 );
 };
 
 export default AssetProfitabilityCard;