import { useState } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  ShoppingCart, Package, Truck, CreditCard, TrendingUp, Store,
  AlertTriangle, CheckCircle2, Clock, Search, Bell,
  Wallet, BarChart3, Gift, ArrowUpRight, ArrowDownRight, Percent,
} from "lucide-react";
import FMCGAIInsightPanel from "@/components/fmcg/FMCGAIInsightPanel";
import { useDistributorApp } from "@/hooks/useDistributorApp";

const FMCGDistributorApp = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");
  const {
    orders, stockLevels, fleet, credits, promotions, loading,
    acceptOrder, rejectOrder, kpis, pendingOrders, lowStockItems,
  } = useDistributorApp();

  const homeKPIs = [
    { label: "Today's Orders", value: String(kpis.todayOrderCount), icon: ShoppingCart, color: "text-primary" },
    { label: "Inventory Value", value: `₦${(kpis.totalInventoryValue / 1e6).toFixed(1)}M`, icon: Package, color: "text-emerald-600" },
    { label: "Active Deliveries", value: String(kpis.activeVehicleCount), icon: Truck, color: "text-blue-600" },
    { label: "Credit Outstanding", value: `₦${(kpis.totalCreditOutstanding / 1e6).toFixed(1)}M`, icon: CreditCard, color: "text-orange-600" },
    { label: "Revenue MTD", value: `₦${(kpis.totalRevenueMTD / 1e6).toFixed(1)}M`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Outlets Served", value: String(kpis.outletsServed), icon: Store, color: "text-primary" },
  ];

  return (
    <FMCGLayout title="Distributor Super-App" subtitle="Unified order, inventory, fleet, finance & promotion command center">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="home">Home</TabsTrigger>
          <TabsTrigger value="orders">Order Hub {kpis.pendingOrderCount > 0 && <Badge variant="destructive" className="ml-1 text-xs">{kpis.pendingOrderCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="inventory">Inventory {kpis.lowStockCount > 0 && <Badge variant="destructive" className="ml-1 text-xs">{kpis.lowStockCount}</Badge>}</TabsTrigger>
          <TabsTrigger value="fleet">Fleet & Delivery</TabsTrigger>
          <TabsTrigger value="finance">Finance & Credit</TabsTrigger>
          <TabsTrigger value="promotions">Promotions</TabsTrigger>
        </TabsList>

        {/* HOME */}
        <TabsContent value="home">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {homeKPIs.map((k) => (
              <Card key={k.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                if (k.label.includes("Order")) setActiveTab("orders");
                else if (k.label.includes("Inventory")) setActiveTab("inventory");
                else if (k.label.includes("Deliver")) setActiveTab("fleet");
                else if (k.label.includes("Credit")) setActiveTab("finance");
              }}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold mt-1">{k.value}</p></div>
                    <k.icon className={`w-8 h-8 ${k.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <FMCGAIInsightPanel role="distributor" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="w-5 h-5 text-orange-600" /> Urgent Alerts</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {kpis.lowStockCount > 0 && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    <div className="flex-1"><p className="text-sm font-medium">{kpis.lowStockCount} SKUs below reorder point</p></div>
                    <Button size="sm" variant="destructive" onClick={() => setActiveTab("inventory")}>View</Button>
                  </div>
                )}
                {kpis.pendingOrderCount > 0 && (
                  <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 flex items-center gap-3">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <div className="flex-1"><p className="text-sm font-medium">{kpis.pendingOrderCount} orders awaiting action</p></div>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab("orders")}>Review</Button>
                  </div>
                )}
                {kpis.lowStockCount === 0 && kpis.pendingOrderCount === 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="text-sm font-medium">All clear - no urgent alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Revenue Snapshot</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">MTD Revenue</span><span className="font-medium">₦{(kpis.totalRevenueMTD / 1e6).toFixed(1)}M</span></div>
                  <Progress value={Math.min(100, (kpis.totalRevenueMTD / 40000000) * 100)} className="h-2" />
                  <p className="text-xs text-muted-foreground">{orders.length} total orders this month</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ORDER HUB */}
        <TabsContent value="orders">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> Incoming Orders Queue</CardTitle>
              <Badge variant="outline">{pendingOrders.length} Pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" /><Input placeholder="Search orders..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              {orders.filter(o => !searchTerm || o.order_number?.includes(searchTerm) || o.fmcg_outlets?.outlet_name?.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 15).map((o) => (
                <div key={o.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <span className="font-mono text-sm text-muted-foreground w-28">{o.order_number || o.id.slice(0, 8)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{o.fmcg_outlets?.outlet_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground">{o.order_date || "-"}</p>
                  </div>
                  <span className="font-bold text-sm">₦{(o.total_amount || 0).toLocaleString()}</span>
                  <Badge variant={o.status === "confirmed" ? "default" : o.status === "rejected" ? "destructive" : "secondary"}>{o.status || "pending"}</Badge>
                  {(o.status === "draft" || o.status === "pending" || !o.status) && (
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => rejectOrder(o.id)}>Reject</Button>
                      <Button size="sm" onClick={() => acceptOrder(o.id)}>Accept</Button>
                    </div>
                  )}
                </div>
              ))}
              {orders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INVENTORY */}
        <TabsContent value="inventory">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" /> Reorder Alerts ({lowStockItems.length})</CardTitle></CardHeader>
              <CardContent>
                {lowStockItems.length > 0 ? lowStockItems.map(item => (
                  <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.fmcg_skus?.sku_name || "Unknown SKU"}</p>
                      <p className="text-xs text-muted-foreground">Stock: {item.current_qty} / Reorder: {item.reorder_point}</p>
                    </div>
                    <Badge variant="destructive">Low</Badge>
                  </div>
                )) : <p className="text-center text-muted-foreground py-4">No reorder alerts</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> All Stock Levels</CardTitle></CardHeader>
              <CardContent>
                {stockLevels.slice(0, 10).map(item => (
                  <div key={item.id} className="flex items-center gap-4 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.fmcg_skus?.sku_name || "-"}</p>
                      <p className="text-xs text-muted-foreground">{item.fmcg_skus?.sku_code}</p>
                    </div>
                    <p className="text-sm font-bold">{item.current_qty || 0}</p>
                    <Badge variant={(item.current_qty || 0) <= (item.reorder_point || 0) ? "destructive" : "default"}>
                      {(item.current_qty || 0) <= (item.reorder_point || 0) ? "Low" : "OK"}
                    </Badge>
                  </div>
                ))}
                {stockLevels.length === 0 && <p className="text-center text-muted-foreground py-4">No inventory data</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* FLEET */}
        <TabsContent value="fleet">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Fleet Tracking</CardTitle></CardHeader>
            <CardContent>
              {fleet.length > 0 ? fleet.map(v => (
                <div key={v.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className={`w-3 h-3 rounded-full ${v.current_status === "en_route" ? "bg-blue-500 animate-pulse" : v.current_status === "completed" ? "bg-emerald-500" : v.current_status === "loading" ? "bg-orange-500" : v.current_status === "maintenance" ? "bg-destructive" : "bg-muted-foreground"}`} />
                  <div className="w-28">
                    <p className="font-mono text-sm font-medium">{v.vehicle_plate}</p>
                    <p className="text-xs text-muted-foreground">{v.vehicle_type || "-"}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{v.driver_name || "Unassigned"}</p>
                    <p className="text-xs text-muted-foreground">{v.assigned_route || "No route"}</p>
                  </div>
                  <div className="w-24">
                    <div className="flex justify-between text-xs mb-1"><span>Fuel</span><span>{v.fuel_level_pct || 0}%</span></div>
                    <Progress value={v.fuel_level_pct || 0} className="h-1.5" />
                  </div>
                  <Badge variant={v.current_status === "en_route" ? "secondary" : v.current_status === "completed" ? "default" : "outline"}>{v.current_status || "idle"}</Badge>
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No fleet data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCE */}
        <TabsContent value="finance">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Credit Outstanding", value: `₦${(kpis.totalCreditOutstanding / 1e6).toFixed(1)}M`, icon: Wallet },
              { label: "Accounts", value: String(credits.length), icon: CreditCard },
              { label: "High Risk", value: String(credits.filter(c => c.risk_band === "high").length), icon: AlertTriangle },
              { label: "Avg Score", value: credits.length > 0 ? String(Math.round(credits.reduce((s, c) => s + (c.order_frequency_score || 0), 0) / credits.length)) : "-", icon: Percent },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="pt-6 flex items-center gap-3">
                  <k.icon className="w-7 h-7 text-primary" />
                  <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-xl font-bold">{k.value}</p></div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Retailer Credit Book</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Outlet</th><th className="pb-2 pr-4">Limit</th><th className="pb-2 pr-4">Balance</th><th className="pb-2 pr-4">Score</th><th className="pb-2">Risk</th>
                  </tr></thead>
                  <tbody>
                    {credits.map(c => (
                      <tr key={c.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 font-medium">{c.fmcg_outlets?.outlet_name || "-"}</td>
                        <td className="py-2.5 pr-4">₦{(c.credit_limit || 0).toLocaleString()}</td>
                        <td className="py-2.5 pr-4">₦{(c.current_balance || 0).toLocaleString()}</td>
                        <td className="py-2.5 pr-4"><Badge variant={(c.order_frequency_score || 0) > 70 ? "default" : "secondary"}>{c.order_frequency_score || "-"}</Badge></td>
                        <td className="py-2.5"><Badge variant={c.risk_band === "low" ? "outline" : c.risk_band === "high" ? "destructive" : "secondary"}>{c.risk_band || "-"}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {credits.length === 0 && <p className="text-center text-muted-foreground py-4">No credit data</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROMOTIONS */}
        <TabsContent value="promotions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2"><Gift className="w-5 h-5" /> Campaign Performance</CardTitle>
              <Badge variant="secondary">{promotions.length} campaigns</Badge>
            </CardHeader>
            <CardContent>
              {promotions.length > 0 ? promotions.map(p => (
                <div key={p.id} className="flex items-center gap-4 py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{p.promotion_name || "Untitled"}</p>
                    <p className="text-xs text-muted-foreground">{p.promotion_type || "-"} · {p.start_date} → {p.end_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-emerald-600">{p.actual_roi ? `+${p.actual_roi}%` : "-"}</p>
                    <p className="text-xs text-muted-foreground">ROI</p>
                  </div>
                  <Badge variant={p.status === "active" ? "default" : p.status === "completed" ? "secondary" : "outline"}>{p.status || "draft"}</Badge>
                </div>
              )) : <p className="text-center text-muted-foreground py-8">No promotions configured</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGDistributorApp;
