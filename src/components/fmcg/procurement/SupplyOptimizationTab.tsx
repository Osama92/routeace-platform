import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Boxes, GitBranch, Factory, Bot, AlertTriangle, CheckCircle, Shield } from "lucide-react";

const scenarios = [
  {
    name: "Ramadan Demand Surge",
    description: "Simulate 35% demand spike across staples",
    serviceLevel: 94, marginImpact: "-2.1%", workingCapital: "+₦12.4M",
    recommendation: "Pre-position 40% buffer stock in Lagos + Kano warehouses",
    status: "recommended",
  },
  {
    name: "Supplier Disruption - FrieslandCampina",
    description: "14-day supply halt on dairy products",
    serviceLevel: 78, marginImpact: "-4.8%", workingCapital: "+₦8.2M",
    recommendation: "Activate secondary supplier (Chi Ltd) + redistribute from Abuja DC",
    status: "contingency",
  },
  {
    name: "Naira Devaluation (+15%)",
    description: "Impact of FX movement on imported raw materials",
    serviceLevel: 91, marginImpact: "-6.2%", workingCapital: "+₦22.1M",
    recommendation: "Shift to local substitutes for 3 SKUs, hedge remaining exposure",
    status: "monitoring",
  },
];

const inventoryOptimization = [
  { sku: "Indomie Chicken 70g", currentSafety: 1200, optimalSafety: 1580, variability: "High", leadTime: "3.2d", savingsIfOptimized: "₦420K", action: "Increase" },
  { sku: "Peak Milk 400g", currentSafety: 900, optimalSafety: 720, variability: "Medium", leadTime: "5.1d", savingsIfOptimized: "₦280K", action: "Reduce" },
  { sku: "Dangote Sugar 500g", currentSafety: 1500, optimalSafety: 1850, variability: "High", leadTime: "2.8d", savingsIfOptimized: "₦610K", action: "Increase" },
  { sku: "Milo 500g", currentSafety: 600, optimalSafety: 540, variability: "Low", leadTime: "3.0d", savingsIfOptimized: "₦150K", action: "Reduce" },
  { sku: "Golden Penny Flour 2kg", currentSafety: 800, optimalSafety: 950, variability: "Medium", leadTime: "4.0d", savingsIfOptimized: "₦340K", action: "Increase" },
];

const constraints = [
  { facility: "Lagos DC", type: "Production Capacity", utilization: 87, limit: "12,000 units/day", bottleneck: false },
  { facility: "Kano Warehouse", type: "Storage Capacity", utilization: 94, limit: "8,500 pallets", bottleneck: true },
  { facility: "Abuja DC", type: "Labor Availability", utilization: 72, limit: "45 pickers/shift", bottleneck: false },
  { facility: "PH Transit Hub", type: "Dock Capacity", utilization: 91, limit: "18 trucks/day", bottleneck: true },
];

const agentActions = [
  { agent: "Inventory Balancer", action: "Rerouted 200 cases Dangote Sugar from Abuja → Lagos DC", trigger: "Lagos stockout risk >85%", time: "12 min ago", status: "executed" },
  { agent: "Shipment Monitor", action: "Flagged delayed inbound from FrieslandCampina - ETA +2 days", trigger: "GPS deviation detected", time: "38 min ago", status: "alert" },
  { agent: "Safety Stock AI", action: "Auto-increased Peak Milk buffer by 15% for South-East region", trigger: "Demand variability spike", time: "1 hr ago", status: "executed" },
  { agent: "Supplier Failover", action: "Activated Chi Ltd as backup for dairy segment", trigger: "Supplier lead time >7 days", time: "2 hr ago", status: "pending_approval" },
];

const SupplyOptimizationTab = () => (
  <div className="space-y-6">
    {/* Multi-Scenario Planning */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" /> What-If Scenario Simulator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {scenarios.map((s) => (
            <div key={s.name} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold">{s.name}</h4>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <Badge variant={s.status === "recommended" ? "default" : s.status === "contingency" ? "destructive" : "secondary"}>
                  {s.status}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Service Level</p>
                  <p className={`text-lg font-bold ${s.serviceLevel > 90 ? "text-green-600" : s.serviceLevel > 80 ? "text-orange-600" : "text-destructive"}`}>{s.serviceLevel}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Margin Impact</p>
                  <p className="text-lg font-bold text-destructive">{s.marginImpact}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Working Capital</p>
                  <p className="text-lg font-bold text-orange-600">{s.workingCapital}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-2 rounded bg-primary/5 border border-primary/10">
                <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-primary font-medium">{s.recommendation}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Predictive Inventory Optimization */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Boxes className="w-5 h-5 text-primary" /> Predictive Safety Stock Optimizer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-3 font-medium">SKU</th>
                <th className="pb-3 font-medium">Current Stock</th>
                <th className="pb-3 font-medium">AI Optimal</th>
                <th className="pb-3 font-medium">Variability</th>
                <th className="pb-3 font-medium">Lead Time</th>
                <th className="pb-3 font-medium">Savings</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventoryOptimization.map((item) => (
                <tr key={item.sku} className="border-b last:border-0">
                  <td className="py-3 font-medium">{item.sku}</td>
                  <td className="py-3">{item.currentSafety.toLocaleString()}</td>
                  <td className="py-3 font-bold text-primary">{item.optimalSafety.toLocaleString()}</td>
                  <td className="py-3">
                    <Badge variant={item.variability === "High" ? "destructive" : item.variability === "Medium" ? "secondary" : "outline"}>
                      {item.variability}
                    </Badge>
                  </td>
                  <td className="py-3">{item.leadTime}</td>
                  <td className="py-3 font-bold text-green-600">{item.savingsIfOptimized}</td>
                  <td className="py-3">
                    <Badge variant={item.action === "Increase" ? "default" : "secondary"}>
                      {item.action === "Increase" ? "↑" : "↓"} {item.action}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    {/* Constraint-Aware Planning */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Factory className="w-5 h-5 text-primary" /> Constraint-Aware Capacity Planner</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {constraints.map((c) => (
            <div key={c.facility + c.type} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-sm">{c.facility}</h4>
                  <p className="text-xs text-muted-foreground">{c.type}</p>
                </div>
                {c.bottleneck && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Bottleneck
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Utilization</span>
                  <span className={`font-bold ${c.utilization > 90 ? "text-destructive" : c.utilization > 80 ? "text-orange-600" : "text-green-600"}`}>{c.utilization}%</span>
                </div>
                <Progress value={c.utilization} className="h-2" />
                <p className="text-xs text-muted-foreground">Limit: {c.limit}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Agentic Supply Monitoring */}
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Autonomous Supply Agents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agentActions.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${a.status === "executed" ? "bg-green-100 text-green-700" : a.status === "alert" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">{a.agent}</span>
                  <Badge variant={a.status === "executed" ? "default" : a.status === "alert" ? "destructive" : "secondary"} className="text-xs">
                    {a.status === "executed" ? <><CheckCircle className="w-3 h-3 mr-1" />Executed</> : a.status === "alert" ? "Alert" : "Pending"}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">{a.time}</span>
                </div>
                <p className="text-sm">{a.action}</p>
                <p className="text-xs text-muted-foreground mt-1">Trigger: {a.trigger}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
);

export default SupplyOptimizationTab;
