import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  Globe, Truck, Package, Users, Warehouse, MapPin, ArrowRight,
  Activity, TrendingUp, Zap, ShieldCheck, BarChart3,
} from "lucide-react";

const networkNodes = [
  { type: "Manufacturer", count: 342, icon: Package, color: "bg-blue-500" },
  { type: "Distributor", count: 1_847, icon: Truck, color: "bg-purple-500" },
  { type: "Retailer", count: 128_400, icon: MapPin, color: "bg-emerald-500" },
  { type: "Warehouse", count: 612, icon: Warehouse, color: "bg-amber-500" },
  { type: "Logistics Operator", count: 2_310, icon: Truck, color: "bg-teal-500" },
  { type: "Global Buyer", count: 1_920, icon: Globe, color: "bg-rose-500" },
];

const tradeCorridors = [
  { from: "Nigeria", to: "Europe", volume: "$2.4M/mo", commodities: "Sesame, Cocoa, Cashew", status: "active" },
  { from: "Nigeria", to: "Middle East", volume: "$1.8M/mo", commodities: "Sesame, Shea Butter", status: "active" },
  { from: "Nigeria", to: "Asia", volume: "$980K/mo", commodities: "Cocoa, Palm Oil", status: "growing" },
  { from: "Kenya", to: "Europe", volume: "$1.2M/mo", commodities: "Tea, Coffee, Flowers", status: "active" },
  { from: "Ghana", to: "North America", volume: "$650K/mo", commodities: "Cocoa, Gold", status: "growing" },
  { from: "South Africa", to: "Asia", volume: "$3.1M/mo", commodities: "Minerals, Wine, Fruits", status: "active" },
];

const connectionTypes = [
  { type: "Orders", count: "182,442/day", color: "text-blue-500" },
  { type: "Shipments", count: "4,238/day", color: "text-emerald-500" },
  { type: "Supply Contracts", count: "847 active", color: "text-purple-500" },
  { type: "Export Flows", count: "63 matched", color: "text-amber-500" },
];

const DistributionNetworkGraph = () => {
  const [selectedCorridor, setSelectedCorridor] = useState<number | null>(null);

  return (
    <DashboardLayout title="Distribution Network Graph" subtitle="Live ecosystem visualization of Africa's trade & distribution network">
      <div className="space-y-6">
        {/* Network Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {networkNodes.map((node) => (
            <Card key={node.type} className="bg-card/80 border-border/50 hover:border-primary/30 transition-all cursor-pointer">
              <CardContent className="p-3 text-center">
                <div className={`w-8 h-8 rounded-lg ${node.color}/10 flex items-center justify-center mx-auto mb-2`}>
                  <node.icon className={`w-4 h-4 ${node.color.replace("bg-", "text-")}`} />
                </div>
                <p className="text-lg font-bold">{node.count.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{node.type}s</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Network Map */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" /> Live Distribution Network</CardTitle>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* SVG Network Visualization */}
            <div className="relative bg-muted/20 rounded-xl p-6 min-h-[400px] overflow-hidden">
              <svg viewBox="0 0 800 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                {/* Africa outline simplified */}
                <ellipse cx="300" cy="200" rx="120" ry="150" fill="none" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
                <text x="300" y="205" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="12" fontWeight="600">AFRICA</text>

                {/* Destination regions */}
                <circle cx="550" cy="80" r="30" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" />
                <text x="550" y="84" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">Europe</text>

                <circle cx="620" cy="200" r="30" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" />
                <text x="620" y="204" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">Middle East</text>

                <circle cx="700" cy="300" r="30" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" />
                <text x="700" y="304" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">Asia</text>

                <circle cx="100" cy="100" r="30" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" />
                <text x="100" y="104" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="9">N. America</text>

                {/* Trade flow lines */}
                {[
                  { x1: 350, y1: 160, x2: 520, y2: 80, color: "hsl(var(--primary))" },
                  { x1: 370, y1: 200, x2: 590, y2: 200, color: "hsl(142 76% 36%)" },
                  { x1: 360, y1: 280, x2: 670, y2: 300, color: "hsl(45 93% 47%)" },
                  { x1: 250, y1: 100, x2: 130, y2: 100, color: "hsl(262 83% 58%)" },
                ].map((line, i) => (
                  <g key={i}>
                    <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={line.color} strokeWidth="2" strokeDasharray="6 3" opacity="0.6">
                      <animate attributeName="stroke-dashoffset" from="0" to="-18" dur="1.5s" repeatCount="indefinite" />
                    </line>
                    <circle r="3" fill={line.color}>
                      <animateMotion dur="3s" repeatCount="indefinite" path={`M${line.x1},${line.y1} L${line.x2},${line.y2}`} />
                    </circle>
                  </g>
                ))}

                {/* Nigerian cities */}
                {[
                  { x: 280, y: 170, label: "Lagos" },
                  { x: 310, y: 140, label: "Abuja" },
                  { x: 320, y: 120, label: "Kano" },
                  { x: 340, y: 200, label: "PH" },
                ].map((city) => (
                  <g key={city.label}>
                    <circle cx={city.x} cy={city.y} r="4" fill="hsl(var(--primary))" />
                    <circle cx={city.x} cy={city.y} r="8" fill="none" stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.4">
                      <animate attributeName="r" from="4" to="12" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x={city.x} y={city.y - 10} textAnchor="middle" fill="hsl(var(--foreground))" fontSize="8">{city.label}</text>
                  </g>
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="corridors" className="space-y-4">
          <TabsList>
            <TabsTrigger value="corridors">Trade Corridors</TabsTrigger>
            <TabsTrigger value="connections">Connection Types</TabsTrigger>
          </TabsList>

          <TabsContent value="corridors" className="space-y-3">
            {tradeCorridors.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className={`cursor-pointer transition-all ${selectedCorridor === i ? "border-primary" : "hover:border-primary/30"}`} onClick={() => setSelectedCorridor(i === selectedCorridor ? null : i)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="font-medium">{c.from}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        <Globe className="w-4 h-4 text-blue-500" />
                        <span className="font-medium">{c.to}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{c.commodities}</span>
                      <Badge variant="outline" className="font-bold">{c.volume}</Badge>
                      <Badge className={c.status === "active" ? "bg-emerald-500/15 text-emerald-600" : "bg-blue-500/15 text-blue-600"}>
                        {c.status === "active" ? <Activity className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
                        {c.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="connections">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {connectionTypes.map((ct) => (
                <Card key={ct.type}>
                  <CardContent className="p-4 text-center">
                    <Zap className={`w-6 h-6 mx-auto mb-2 ${ct.color}`} />
                    <p className="text-xl font-bold">{ct.count}</p>
                    <p className="text-xs text-muted-foreground">{ct.type}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DistributionNetworkGraph;
