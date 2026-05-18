 import { useQuery } from "@tanstack/react-query";
 import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { supabase } from "@/integrations/supabase/client";
 import { Clock, TrendingDown, TrendingUp, MapPin, AlertTriangle, ArrowDown, ArrowUp } from "lucide-react";
 import { format, differenceInHours, startOfWeek, startOfMonth } from "date-fns";
 
 interface WaitTrackingData {
 id: string;
 dispatch_id: string | null;
 vehicle_id: string | null;
 customer_id: string | null;
 site_name: string | null;
 arrival_timestamp: string;
 loading_timestamp: string | null;
 exit_timestamp: string | null;
 wait_status: string;
 wait_reason: string | null;
 wait_hours: number | null;
 }
 
 /**
  * Average Wait Days KPI Card - Section A (New KPIs)
  * Shows average wait time for trucks on-site but not loaded
  */
 const WaitDaysKPICard = () => {
 const { data: waitData, isLoading } = useQuery({
   queryKey: ["truck-wait-kpi"],
   queryFn: async () => {
     const { data, error } = await supabase
       .from("truck_wait_tracking")
       .select("*")
       .order("arrival_timestamp", { ascending: false })
       .limit(100);
 
     if (error) throw error;
     return data as WaitTrackingData[];
   },
 });
 
 // Calculate metrics
 const calculateWaitHours = (record: WaitTrackingData) => {
   const arrival = new Date(record.arrival_timestamp);
   const end = record.loading_timestamp 
     ? new Date(record.loading_timestamp)
     : record.exit_timestamp
       ? new Date(record.exit_timestamp)
       : new Date();
   return differenceInHours(end, arrival);
 };
 
 const now = new Date();
 const weekStart = startOfWeek(now);
 const monthStart = startOfMonth(now);
 
 const dailyRecords = waitData?.filter(r => 
   new Date(r.arrival_timestamp).toDateString() === now.toDateString()
 ) || [];
 
 const weeklyRecords = waitData?.filter(r => 
   new Date(r.arrival_timestamp) >= weekStart
 ) || [];
 
 const monthlyRecords = waitData?.filter(r => 
   new Date(r.arrival_timestamp) >= monthStart
 ) || [];
 
 const avgDaily = dailyRecords.length > 0
   ? dailyRecords.reduce((sum, r) => sum + calculateWaitHours(r), 0) / dailyRecords.length
   : 0;
 
 const avgWeekly = weeklyRecords.length > 0
   ? weeklyRecords.reduce((sum, r) => sum + calculateWaitHours(r), 0) / weeklyRecords.length
   : 0;
 
 const avgMonthly = monthlyRecords.length > 0
   ? monthlyRecords.reduce((sum, r) => sum + calculateWaitHours(r), 0) / monthlyRecords.length
   : 0;
 
 // Get top delay sites
 const siteDelays = waitData?.reduce((acc, r) => {
   const site = r.site_name || "Unknown";
   if (!acc[site]) acc[site] = { total: 0, count: 0 };
   acc[site].total += calculateWaitHours(r);
   acc[site].count += 1;
   return acc;
 }, {} as Record<string, { total: number; count: number }>) || {};
 
 const topDelaySites = Object.entries(siteDelays)
   .map(([site, data]) => ({ site, avgHours: data.total / data.count }))
   .sort((a, b) => b.avgHours - a.avgHours)
   .slice(0, 3);
 
 // Get wait reasons breakdown
 const reasonBreakdown = waitData?.reduce((acc, r) => {
   const reason = r.wait_reason || "other";
   acc[reason] = (acc[reason] || 0) + 1;
   return acc;
 }, {} as Record<string, number>) || {};
 
 // Trend indicator (compare to previous period)
 const prevPeriodRecords = waitData?.filter(r => {
   const date = new Date(r.arrival_timestamp);
   return date < monthStart && date >= new Date(monthStart.getTime() - 30 * 24 * 60 * 60 * 1000);
 }) || [];
 
 const prevAvg = prevPeriodRecords.length > 0
   ? prevPeriodRecords.reduce((sum, r) => sum + calculateWaitHours(r), 0) / prevPeriodRecords.length
   : avgMonthly;
 
 const trend = avgMonthly - prevAvg;
 const trendPercent = prevAvg > 0 ? ((trend / prevAvg) * 100).toFixed(1) : "0";
 const isImproving = trend < 0;
 
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
             <Clock className="w-4 h-4 text-yellow-500" />
             Avg Wait Days (Unloaded Trucks)
           </CardTitle>
           <CardDescription>On-site wait time before loading</CardDescription>
         </div>
         <div className="flex items-center gap-1">
           {isImproving ? (
             <ArrowDown className="w-4 h-4 text-green-500" />
           ) : trend > 0 ? (
             <ArrowUp className="w-4 h-4 text-red-500" />
           ) : null}
           <span className={`text-sm font-medium ${isImproving ? "text-green-600" : trend > 0 ? "text-red-600" : "text-muted-foreground"}`}>
             {Math.abs(Number(trendPercent))}%
           </span>
         </div>
       </div>
     </CardHeader>
     <CardContent className="space-y-4">
       {/* Main Metrics */}
       <div className="grid grid-cols-3 gap-3">
         <div className="p-3 rounded-lg bg-muted/50 text-center">
           <p className="text-2xl font-bold">{(avgDaily / 24).toFixed(1)}</p>
           <p className="text-xs text-muted-foreground">Daily Avg (days)</p>
         </div>
         <div className="p-3 rounded-lg bg-muted/50 text-center">
           <p className="text-2xl font-bold">{(avgWeekly / 24).toFixed(1)}</p>
           <p className="text-xs text-muted-foreground">Weekly Avg</p>
         </div>
         <div className="p-3 rounded-lg bg-muted/50 text-center">
           <p className="text-2xl font-bold">{(avgMonthly / 24).toFixed(1)}</p>
           <p className="text-xs text-muted-foreground">Monthly Avg</p>
         </div>
       </div>
 
       {/* Top 3 Delay Sites */}
       {topDelaySites.length > 0 && (
         <div className="space-y-2">
           <p className="text-sm font-medium flex items-center gap-2">
             <MapPin className="w-4 h-4" />
             Top Delay Sites
           </p>
           {topDelaySites.map((site, idx) => (
             <div key={site.site} className="flex items-center justify-between text-sm">
               <div className="flex items-center gap-2">
                 <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                   {idx + 1}
                 </span>
                 <span className="truncate max-w-32">{site.site}</span>
               </div>
               <Badge variant={site.avgHours > 48 ? "destructive" : "secondary"}>
                 {(site.avgHours / 24).toFixed(1)} days
               </Badge>
             </div>
           ))}
         </div>
       )}
 
       {/* Wait Reason Breakdown */}
       {Object.keys(reasonBreakdown).length > 0 && (
         <div className="space-y-2">
           <p className="text-sm font-medium">Wait Reasons</p>
           <div className="grid grid-cols-2 gap-2">
             {Object.entries(reasonBreakdown).slice(0, 4).map(([reason, count]) => (
               <div key={reason} className="flex items-center justify-between text-xs p-2 rounded bg-muted/30">
                 <span className="capitalize">{reason.replace("_", " ")}</span>
                 <Badge variant="outline">{count}</Badge>
               </div>
             ))}
           </div>
         </div>
       )}
 
       {/* Suggested Actions */}
       {avgMonthly > 48 && (
         <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
           <div className="flex items-start gap-2">
             <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
             <div className="text-sm">
               <p className="font-medium text-yellow-600">Long wait times detected</p>
               <p className="text-muted-foreground text-xs mt-1">
                 Review supply availability or customer order scheduling
               </p>
             </div>
           </div>
         </div>
       )}
 
       {waitData?.length === 0 && (
         <div className="text-center py-4 text-muted-foreground text-sm">
           No wait tracking data available
         </div>
       )}
     </CardContent>
   </Card>
 );
 };
 
 export default WaitDaysKPICard;