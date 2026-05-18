import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { format, startOfMonth, subMonths, endOfMonth, startOfYear, subYears, endOfYear } from "date-fns";
import { TrendingUp, Clock } from "lucide-react";

type TrendPeriod = "monthly" | "yearly";

function useKPITrends(period: TrendPeriod) {
  return useQuery({
    queryKey: ["kpi-trends", period],
    queryFn: async () => {
      const now = new Date();
      const count = period === "monthly" ? 6 : 3;
      const data = [];

      for (let i = count - 1; i >= 0; i--) {
        const pStart = period === "monthly" ? startOfMonth(subMonths(now, i)) : startOfYear(subYears(now, i));
        const pEnd = period === "monthly" ? endOfMonth(subMonths(now, i)) : endOfYear(subYears(now, i));
        const label = period === "monthly" ? format(pStart, "MMM yyyy") : format(pStart, "yyyy");

        const [deliveriesRes, invoicesRes] = await Promise.all([
          supabase.from("dispatches")
            .select("id, status, scheduled_delivery, actual_delivery")
            .eq("status", "delivered")
            .gte("created_at", pStart.toISOString())
            .lte("created_at", pEnd.toISOString()),
          supabase.from("invoices")
            .select("total_amount")
            .gte("created_at", pStart.toISOString())
            .lte("created_at", pEnd.toISOString())
            .not("status", "eq", "cancelled"),
        ]);

        const total = deliveriesRes.data?.length || 0;
        const onTime = (deliveriesRes.data || []).filter(d =>
          d.scheduled_delivery && d.actual_delivery &&
          new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)
        ).length;
        const otdRate = total > 0 ? Math.round((onTime / total) * 100) : 0;
        const revenue = (invoicesRes.data || []).reduce((s, inv) => s + Number(inv.total_amount || 0), 0);

        data.push({ period: label, otdRate, revenue, deliveries: total });
      }

      // Calculate period-over-period growth
      return data.map((m, idx) => ({
        ...m,
        revenueGrowth: idx > 0 && data[idx - 1].revenue > 0
          ? Math.round(((m.revenue - data[idx - 1].revenue) / data[idx - 1].revenue) * 100)
          : 0,
        deliveryGrowth: idx > 0 && data[idx - 1].deliveries > 0
          ? Math.round(((m.deliveries - data[idx - 1].deliveries) / data[idx - 1].deliveries) * 100)
          : 0,
      }));
    },
  });
}

const fmt = (val: number) => {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(0)}K`;
  return `₦${val.toLocaleString()}`;
};

const KPITrendCharts = () => {
  const [period, setPeriod] = useState<TrendPeriod>("monthly");
  const { data, isLoading } = useKPITrends(period);

  const periodLabel = period === "monthly" ? "MoM" : "YoY";

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">Trend View:</span>
        <div className="flex bg-muted/50 rounded-lg p-0.5">
          <Button
            size="sm"
            variant={period === "monthly" ? "default" : "ghost"}
            className="text-xs h-7"
            onClick={() => setPeriod("monthly")}
          >
            Monthly
          </Button>
          <Button
            size="sm"
            variant={period === "yearly" ? "default" : "ghost"}
            className="text-xs h-7"
            onClick={() => setPeriod("yearly")}
          >
            Yearly
          </Button>
        </div>
      </div>

      {isLoading || !data?.length ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[0, 1].map(i => (
            <Card key={i}>
              <CardContent className="flex items-center justify-center h-[250px]">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* OTD Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> On-Time Delivery Trend ({periodLabel})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `${v}%`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="otdRate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} name="OTD %" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Revenue Trend */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Revenue Trend ({periodLabel})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => fmt(v)} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default KPITrendCharts;
