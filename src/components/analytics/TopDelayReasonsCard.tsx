import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

const CATEGORY_COLORS: Record<string, string> = {
  traffic: "hsl(var(--warning))",
  weather: "hsl(var(--info))",
  vehicle_breakdown: "hsl(var(--destructive))",
  customer_unavailable: "hsl(var(--accent))",
  loading_delay: "hsl(var(--primary))",
  documentation: "hsl(var(--secondary))",
  other: "hsl(var(--muted-foreground))",
};

const CATEGORY_LABELS: Record<string, string> = {
  traffic: "Traffic",
  weather: "Weather",
  vehicle_breakdown: "Vehicle Breakdown",
  customer_unavailable: "Customer Unavailable",
  loading_delay: "Loading Delay",
  documentation: "Documentation Issue",
  route_change: "Route Change",
  security: "Security Checkpoint",
  other: "Other",
};

interface TopDelayReasonsCardProps {
  startDate?: Date;
  endDate?: Date;
}

const TopDelayReasonsCard = ({ startDate, endDate }: TopDelayReasonsCardProps) => {
  const { data: delayReasons } = useQuery({
    queryKey: ["delay-reasons", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      let query = supabase
        .from("dispatch_delay_reasons")
        .select("category, reason");

      if (startDate) query = query.gte("created_at", startDate.toISOString());
      if (endDate) query = query.lte("created_at", endDate.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by category
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.category] = (counts[r.category] || 0) + 1;
      });

      return Object.entries(counts)
        .map(([category, count]) => ({
          category,
          label: CATEGORY_LABELS[category] || category,
          count,
          color: CATEGORY_COLORS[category] || CATEGORY_COLORS.other,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 7);
    },
  });

  const total = delayReasons?.reduce((s, r) => s + r.count, 0) || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-4 h-4 text-warning" />
          Top Delivery Delay Reasons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!delayReasons || delayReasons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No delay reasons logged yet. Ops/Support can add reasons per dispatch.
          </p>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={delayReasons} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`${value} delays`, "Count"]}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {delayReasons.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-2">
              {delayReasons.slice(0, 3).map((r) => (
                <Badge key={r.category} variant="outline" className="text-xs">
                  {r.label}: {Math.round((r.count / total) * 100)}%
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TopDelayReasonsCard;
