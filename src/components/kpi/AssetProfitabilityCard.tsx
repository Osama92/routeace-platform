 import { useQuery } from "@tanstack/react-query";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { supabase } from "@/integrations/supabase/client";
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
 const { data: profitData, isLoading } = useQuery({
   queryKey: ["asset-profitability-kpi"],
   queryFn: async () => {
     const threeMonthsAgo = subMonths(new Date(), 3).toISOString().split("T")[0];
     
     const { data, error } = await supabase
       .from("asset_profitability")
       .select("*")
       .gte("period_start", threeMonthsAgo)
       .order("period_end", { ascending: false });
 
     if (error) throw error;
     return data as AssetProfitability[];
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