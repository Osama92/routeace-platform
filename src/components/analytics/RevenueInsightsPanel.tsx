import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Users, TrendingUp, AlertTriangle, CheckCircle, Calendar, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface RevenueMetrics {
  repeatClientPercentage: number;
  averageContractLengthDays: number;
  top5RevenueShare: number;
  totalClients: number;
  repeatClients: number;
  newClients: number;
  concentrationRisk: "low" | "medium" | "high";
}

interface ClientRevenue {
  id: string;
  name: string;
  revenue: number;
  percentage: number;
  dispatchCount: number;
  isRepeat: boolean;
}

const COLORS = [
  "hsl(142, 76%, 36%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 60%, 50%)",
  "hsl(340, 82%, 52%)",
  "hsl(210, 40%, 50%)",
];

const RevenueInsightsPanel = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [clientRevenues, setClientRevenues] = useState<ClientRevenue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenueInsights();
  }, []);

  const fetchRevenueInsights = async () => {
    try {
      // Fetch all paid invoices with customer data
      const { data: invoices } = await supabase
        .from("invoices")
        .select(`
          id,
          customer_id,
          total_amount,
          created_at,
          customers (id, company_name, created_at)
        `)
        .eq("status", "paid");

      // Fetch dispatches for contract length calculation
      const { data: dispatches } = await supabase
        .from("dispatches")
        .select("id, customer_id, created_at")
        .eq("status", "delivered");

      if (!invoices) {
        setMetrics(null);
        setLoading(false);
        return;
      }

      // Calculate revenue per client
      const clientRevenueMap = new Map<string, { 
        name: string; 
        revenue: number; 
        dispatchCount: number;
        firstInvoice: Date;
        lastInvoice: Date;
        customerCreatedAt: Date;
      }>();

      invoices.forEach((inv) => {
        if (!inv.customer_id || !inv.customers) return;
        const customer = inv.customers as any;
        
        const existing = clientRevenueMap.get(inv.customer_id) || {
          name: customer.company_name,
          revenue: 0,
          dispatchCount: 0,
          firstInvoice: new Date(inv.created_at),
          lastInvoice: new Date(inv.created_at),
          customerCreatedAt: new Date(customer.created_at),
        };

        existing.revenue += Number(inv.total_amount || 0);
        existing.dispatchCount += 1;
        
        const invoiceDate = new Date(inv.created_at);
        if (invoiceDate < existing.firstInvoice) existing.firstInvoice = invoiceDate;
        if (invoiceDate > existing.lastInvoice) existing.lastInvoice = invoiceDate;

        clientRevenueMap.set(inv.customer_id, existing);
      });

      // Calculate total revenue
      const totalRevenue = Array.from(clientRevenueMap.values()).reduce((sum, c) => sum + c.revenue, 0);
      const totalClients = clientRevenueMap.size;

      // Sort by revenue descending
      const sortedClients = Array.from(clientRevenueMap.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          revenue: data.revenue,
          percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
          dispatchCount: data.dispatchCount,
          isRepeat: data.dispatchCount > 1,
          contractLength: Math.ceil((data.lastInvoice.getTime() - data.customerCreatedAt.getTime()) / (1000 * 60 * 60 * 24)),
        }))
        .sort((a, b) => b.revenue - a.revenue);

      // Calculate metrics
      const repeatClients = sortedClients.filter(c => c.isRepeat).length;
      const repeatClientPercentage = totalClients > 0 ? (repeatClients / totalClients) * 100 : 0;

      // Average contract length (days from first to last transaction)
      const contractLengths = sortedClients.map(c => c.contractLength).filter(l => l > 0);
      const averageContractLengthDays = contractLengths.length > 0
        ? contractLengths.reduce((sum, l) => sum + l, 0) / contractLengths.length
        : 0;

      // Top 5 concentration
      const top5Revenue = sortedClients.slice(0, 5).reduce((sum, c) => sum + c.revenue, 0);
      const top5RevenueShare = totalRevenue > 0 ? (top5Revenue / totalRevenue) * 100 : 0;

      // Determine concentration risk
      let concentrationRisk: "low" | "medium" | "high" = "low";
      if (top5RevenueShare > 80) concentrationRisk = "high";
      else if (top5RevenueShare > 50) concentrationRisk = "medium";

      setMetrics({
        repeatClientPercentage,
        averageContractLengthDays,
        top5RevenueShare,
        totalClients,
        repeatClients,
        newClients: totalClients - repeatClients,
        concentrationRisk,
      });

      setClientRevenues(sortedClients.slice(0, 10));
    } catch (error) {
      console.error("Error fetching revenue insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `₦${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `₦${(amount / 1000).toFixed(0)}K`;
    return `₦${amount.toFixed(0)}`;
  };

  if (loading) {
    return (
      <Card className="glass-card border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card className="glass-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg font-heading">Revenue Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No revenue data available</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = clientRevenues.slice(0, 5).map((c, i) => ({
    name: c.name,
    value: c.percentage,
    revenue: c.revenue,
  }));

  const othersPercentage = 100 - pieData.reduce((sum, p) => sum + p.value, 0);
  if (othersPercentage > 0 && clientRevenues.length > 5) {
    pieData.push({ name: "Others", value: othersPercentage, revenue: 0 });
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.repeatClientPercentage.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Repeat Clients</p>
            </div>
          </div>
          <Progress value={metrics.repeatClientPercentage} className="h-1.5 mt-3" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{Math.round(metrics.averageContractLengthDays)}</p>
              <p className="text-xs text-muted-foreground">Avg. Contract (Days)</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              metrics.top5RevenueShare <= 50 ? 'bg-success/20' : 
              metrics.top5RevenueShare <= 80 ? 'bg-warning/20' : 'bg-destructive/20'
            }`}>
              <Target className={`w-5 h-5 ${
                metrics.top5RevenueShare <= 50 ? 'text-success' : 
                metrics.top5RevenueShare <= 80 ? 'text-warning' : 'text-destructive'
              }`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.top5RevenueShare.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Top 5 Revenue Share</p>
            </div>
          </div>
          <div className="mt-2">
            <Badge variant={
              metrics.top5RevenueShare <= 50 ? "default" : 
              metrics.top5RevenueShare <= 80 ? "secondary" : "destructive"
            } className="text-xs">
              {metrics.top5RevenueShare <= 50 ? (
                <><CheckCircle className="w-3 h-3 mr-1" /> Healthy</>
              ) : metrics.top5RevenueShare <= 80 ? (
                <><AlertTriangle className="w-3 h-3 mr-1" /> Moderate Risk</>
              ) : (
                <><AlertTriangle className="w-3 h-3 mr-1" /> High Concentration</>
              )}
            </Badge>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{metrics.totalClients}</p>
              <p className="text-xs text-muted-foreground">Total Clients</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2 text-xs">
            <span className="text-success">{metrics.repeatClients} repeat</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{metrics.newClients} new</span>
          </div>
        </motion.div>
      </div>

      {/* Revenue Concentration Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-heading">Revenue Concentration Analysis</CardTitle>
            <CardDescription>Top 5 clients share of total revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(1)}%`, "Share"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {pieData.slice(0, 6).map((item, i) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{item.name}</span>
                  <span className="text-muted-foreground ml-auto">{item.value.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardHeader>
            <CardTitle className="text-sm font-heading">Top Clients by Revenue</CardTitle>
            <CardDescription>Revenue distribution across key accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={clientRevenues.slice(0, 6)} 
                  layout="vertical"
                  margin={{ left: 10, right: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                    tickFormatter={(value) => value.length > 12 ? value.slice(0, 12) + "..." : value}
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueInsightsPanel;
