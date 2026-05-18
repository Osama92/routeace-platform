import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, subMonths, startOfDay, endOfDay, eachDayOfInterval, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";

type ChartPeriod = "week" | "month" | "6months";

function useDeliveryTrend(period: ChartPeriod) {
  return useQuery({
    queryKey: ["delivery-chart", period],
    queryFn: async () => {
      const now = new Date();
      let rangeStart: Date;
      let intervals: Date[];
      let labelFmt: string;

      if (period === "week") {
        rangeStart = subDays(now, 6);
        intervals = eachDayOfInterval({ start: rangeStart, end: now });
        labelFmt = "EEE";
      } else if (period === "month") {
        rangeStart = subDays(now, 29);
        intervals = eachDayOfInterval({ start: rangeStart, end: now });
        labelFmt = "MMM d";
      } else {
        rangeStart = subMonths(now, 5);
        intervals = eachMonthOfInterval({ start: startOfMonth(rangeStart), end: now });
        labelFmt = "MMM";
      }

      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, status, created_at")
        .gte("created_at", rangeStart.toISOString());

      return intervals.map((d, idx) => {
        const iStart = period === "6months" ? startOfMonth(d) : startOfDay(d);
        const iEnd = period === "6months"
          ? (idx < intervals.length - 1 ? startOfMonth(intervals[idx + 1]) : endOfMonth(d))
          : endOfDay(d);

        const count = (dispatches || []).filter(disp => {
          const c = new Date(disp.created_at);
          return c >= iStart && c <= iEnd;
        }).length;

        const delivered = (dispatches || []).filter(disp => {
          const c = new Date(disp.created_at);
          return c >= iStart && c <= iEnd && disp.status === "delivered";
        }).length;

        return { name: format(d, labelFmt), deliveries: count, delivered };
      });
    },
  });
}

const DeliveryChart = () => {
  const [period, setPeriod] = useState<ChartPeriod>("week");
  const { data, isLoading } = useDeliveryTrend(period);

  const periodLabels: Record<ChartPeriod, string> = {
    week: "This Week",
    month: "This Month",
    "6months": "Last 6 Months",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass-card p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-heading font-semibold text-lg text-foreground">
            Delivery Performance
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Deliveries - {periodLabels[period]}
          </p>
        </div>
        <div className="flex bg-muted/50 rounded-lg p-0.5">
          {(["week", "month", "6months"] as ChartPeriod[]).map(p => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              className="text-xs h-7 capitalize"
              onClick={() => setPeriod(p)}
            >
              {p === "6months" ? "6M" : p}
            </Button>
          ))}
        </div>
      </div>

      <div className="h-80">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data || []}>
              <defs>
                <linearGradient id="colorDeliveries" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
              <Area type="monotone" dataKey="deliveries" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorDeliveries)" name="Dispatches" />
              <Area type="monotone" dataKey="delivered" stroke="hsl(142, 76%, 36%)" strokeWidth={2} fillOpacity={0.1} fill="hsl(142, 76%, 36%)" name="Delivered" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-center gap-8 mt-6">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Total Dispatches</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
          <span className="text-sm text-muted-foreground">Delivered</span>
        </div>
      </div>
    </motion.div>
  );
};

export default DeliveryChart;
