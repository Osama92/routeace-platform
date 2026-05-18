import DemoDataBanner from "@/components/shared/DemoDataBanner";
/**
 * Developer Dashboard - API usage monitoring, cost tracking, and key management.
 */
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Activity, Key, Globe, Zap, AlertTriangle, TrendingUp,
  Copy, Code, BarChart3, Clock, Shield, CheckCircle,
} from "lucide-react";
import { useBillingEngine } from "@/hooks/useBillingEngine";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { useState } from "react";
import { toast } from "sonner";

const ENDPOINT_RATES: Record<string, number> = {
  "/dispatch/create": 0.025,
  "/route/optimize": 0.05,
  "/tracking/:id": 0.01,
  "/fleet/vehicles": 0.02,
  "/pricing/calculate": 0.015,
  "/cost-estimate": 0.02,
  "/pod/verify": 0.02,
  "/analytics/performance": 0.035,
  "/invoice/create": 0.03,
};

// Live data wiring pending: backed by future `developer_api_keys` table.
const API_KEYS: Array<{ prefix: string; name: string; created: string; lastUsed: string; status: string }> = [];

export default function DeveloperDashboard() {
  const { metrics, isLoading } = useBillingEngine();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    toast.success("API key prefix copied");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Real per-endpoint metering pending — show zeroed series until live telemetry arrives.
  const endpointUsage = Object.entries(ENDPOINT_RATES).map(([ep, rate]) => ({
    endpoint: ep.split("/").pop() || ep,
    calls: 0,
    cost: 0,
    rate,
  }));

  const dailyUsage: Array<{ day: string; calls: number; errors: number }> = [];

  const rateLimitPercent = Math.min(100, Math.round((metrics.apiCallsThisMonth / 10000) * 100));

  if (isLoading) {
    return (
      <DashboardLayout title="Developer Dashboard" subtitle="API usage & monitoring">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Developer Dashboard" subtitle="API usage monitoring, cost tracking & key management">
      <div className="space-y-6">
        <DemoDataBanner feature="Developer Dashboard" message="API key list and call/error charts below are sample figures. Real key inventory and usage will replace this view as soon as your first keys are issued and metered." />
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "API Calls (MTD)", value: metrics.apiCallsThisMonth.toLocaleString(), icon: Globe, color: "text-blue-500" },
            { label: "API Cost (MTD)", value: `$${metrics.apiCostMTD.toFixed(2)}`, icon: Zap, color: "text-amber-500" },
            { label: "Avg Latency", value: "142ms", icon: Clock, color: "text-green-500" },
            { label: "Error Rate", value: "0.3%", icon: AlertTriangle, color: "text-red-500" },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                    <span className="text-xs text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold">{kpi.value}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Rate Limit */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Rate Limit Usage (10,000 calls/day)</span>
              <Badge variant={rateLimitPercent > 80 ? "destructive" : "secondary"}>{rateLimitPercent}%</Badge>
            </div>
            <Progress value={rateLimitPercent} className="h-2" />
          </CardContent>
        </Card>

        <Tabs defaultValue="usage" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="usage" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Usage</TabsTrigger>
            <TabsTrigger value="keys" className="gap-1.5"><Key className="w-3.5 h-3.5" /> API Keys</TabsTrigger>
            <TabsTrigger value="costs" className="gap-1.5"><Activity className="w-3.5 h-3.5" /> Cost/Endpoint</TabsTrigger>
          </TabsList>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily API Traffic (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyUsage}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="calls" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="errors" stroke="hsl(0 84% 60%)" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="keys" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">API Keys</CardTitle>
                <Button size="sm" className="gap-1.5"><Key className="w-3.5 h-3.5" /> Generate New Key</Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {API_KEYS.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-sm">
                          No API keys generated yet. Click "Generate New Key" to issue your first key.
                        </TableCell>
                      </TableRow>
                    )}
                    {API_KEYS.map((k) => (
                      <TableRow key={k.prefix}>
                        <TableCell className="font-medium">{k.name}</TableCell>
                        <TableCell className="font-mono text-xs">{k.prefix}...</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{k.created}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{k.lastUsed}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> {k.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => copyKey(k.prefix)}>
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cost per Endpoint Tab */}
          <TabsContent value="costs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cost by Endpoint (This Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={endpointUsage} layout="vertical">
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="endpoint" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Endpoint</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {endpointUsage.map((ep) => (
                      <TableRow key={ep.endpoint}>
                        <TableCell className="font-mono text-xs">{ep.endpoint}</TableCell>
                        <TableCell className="text-right">{ep.calls}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${ENDPOINT_RATES[Object.keys(ENDPOINT_RATES).find(k => k.includes(ep.endpoint)) || ""] || "-"}</TableCell>
                        <TableCell className="text-right font-bold">${ep.cost}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
