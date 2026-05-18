import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Database, Layers, Cpu, BarChart3, ArrowDown, ArrowUp, RefreshCw, Zap, Cloud, HardDrive, Activity, FileSpreadsheet } from "lucide-react";

const ingestionPipelines = [
  { source: "ERP Sync (SAP)", records: "2.4M", status: "active", lastSync: "2 min ago", health: 99.2, throughput: "12K/min" },
  { source: "Mobile SFA App", records: "856K", status: "active", lastSync: "Real-time", health: 98.7, throughput: "3.2K/min" },
  { source: "Distributor Systems", records: "1.1M", status: "active", lastSync: "15 min ago", health: 96.4, throughput: "8K/min" },
  { source: "Driver Delivery App", records: "432K", status: "active", lastSync: "Real-time", health: 97.8, throughput: "1.8K/min" },
  { source: "Payment Gateways", records: "678K", status: "active", lastSync: "5 min ago", health: 99.5, throughput: "5.4K/min" },
  { source: "Excel/CSV Uploads", records: "124K", status: "idle", lastSync: "3 hrs ago", health: 100, throughput: "-" },
  { source: "IoT Fleet Devices", records: "1.9M", status: "active", lastSync: "Real-time", health: 94.1, throughput: "22K/min" },
];

const dataLayers = [
  { name: "Raw Data Layer", description: "Order records, invoice records, route GPS logs, visit timestamps, retailer transactions", size: "4.2 TB", objects: "8.4M", freshness: "< 5 min" },
  { name: "Processing Layer", description: "SKU normalization, outlet geocoding, distributor mapping, route clustering", size: "1.8 TB", objects: "3.1M", freshness: "< 15 min" },
  { name: "Analytics Layer", description: "Demand forecasting, route profitability, retailer scoring, distributor benchmarking", size: "620 GB", objects: "1.2M", freshness: "< 1 hr" },
];

const warehouseOutputs = [
  { name: "Sales Analytics", queries: "14.2K/day", latency: "120ms", status: "healthy" },
  { name: "Distribution Coverage Maps", queries: "8.6K/day", latency: "340ms", status: "healthy" },
  { name: "SKU Velocity Reports", queries: "6.1K/day", latency: "95ms", status: "healthy" },
  { name: "Market Penetration Analysis", queries: "3.4K/day", latency: "450ms", status: "degraded" },
  { name: "Demand Forecasting Models", queries: "1.2K/day", latency: "2.1s", status: "healthy" },
];

const aiModels = [
  { name: "Demand Prediction Engine", accuracy: 94.2, lastTrained: "6 hrs ago", features: 148, predictions: "24K/day" },
  { name: "Territory Optimization", accuracy: 91.7, lastTrained: "12 hrs ago", features: 86, predictions: "2.1K/day" },
  { name: "Route Profitability Scorer", accuracy: 88.9, lastTrained: "4 hrs ago", features: 62, predictions: "8.4K/day" },
  { name: "Retailer Value Index", accuracy: 92.4, lastTrained: "8 hrs ago", features: 54, predictions: "15K/day" },
  { name: "Credit Risk Predictor", accuracy: 90.1, lastTrained: "2 hrs ago", features: 78, predictions: "6.8K/day" },
];

const FMCGDataLake = () => {
  return (
    <FMCGLayout title="FMCG Data Lake Architecture" subtitle="Centralized intelligence backbone - ingest, process, analyze all distribution signals">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Total Data Volume", value: "6.6 TB", icon: Database, color: "text-blue-600" },
          { label: "Active Pipelines", value: "6/7", icon: Activity, color: "text-green-600" },
          { label: "Records Processed", value: "7.5M", icon: Cpu, color: "text-purple-600" },
          { label: "AI Model Accuracy", value: "91.5%", icon: Zap, color: "text-orange-600" },
        ].map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-6 flex items-center gap-4">
              <m.icon className={`w-8 h-8 ${m.color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{m.label}</p>
                <p className="text-2xl font-bold">{m.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="pipelines">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="pipelines" className="gap-1"><ArrowDown className="w-3.5 h-3.5" /> Ingestion Pipelines</TabsTrigger>
          <TabsTrigger value="layers" className="gap-1"><Layers className="w-3.5 h-3.5" /> Data Layers</TabsTrigger>
          <TabsTrigger value="warehouse" className="gap-1"><HardDrive className="w-3.5 h-3.5" /> Warehouse Outputs</TabsTrigger>
          <TabsTrigger value="ai-models" className="gap-1"><Cpu className="w-3.5 h-3.5" /> AI Models</TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><RefreshCw className="w-5 h-5" /> Data Ingestion Pipelines</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ingestionPipelines.map((p) => (
                  <div key={p.source} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Cloud className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{p.source}</h3>
                          <p className="text-xs text-muted-foreground">Last sync: {p.lastSync}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                        <span className="text-sm font-mono">{p.throughput}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Total Records</p>
                        <p className="font-medium">{p.records}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pipeline Health</p>
                        <div className="flex items-center gap-2">
                          <Progress value={p.health} className="h-2 flex-1" />
                          <span className="text-xs font-medium">{p.health}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Throughput</p>
                        <p className="font-medium">{p.throughput}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="layers">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5" /> Data Lake Architecture Layers</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-6">
                {dataLayers.map((layer, idx) => (
                  <div key={layer.name} className="relative">
                    <div className="p-6 border-2 rounded-xl border-dashed">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${idx === 0 ? "bg-blue-100 text-blue-600" : idx === 1 ? "bg-purple-100 text-purple-600" : "bg-green-100 text-green-600"}`}>
                            <span className="font-bold text-lg">{idx + 1}</span>
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{layer.name}</h3>
                            <p className="text-sm text-muted-foreground">{layer.description}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-sm">{layer.freshness} latency</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Storage Size</p>
                          <p className="text-xl font-bold">{layer.size}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Total Objects</p>
                          <p className="text-xl font-bold">{layer.objects}</p>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Data Freshness</p>
                          <p className="text-xl font-bold">{layer.freshness}</p>
                        </div>
                      </div>
                    </div>
                    {idx < dataLayers.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="warehouse">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Data Warehouse Outputs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {warehouseOutputs.map((o) => (
                  <div key={o.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">{o.name}</h3>
                        <p className="text-xs text-muted-foreground">{o.queries} queries</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Avg Latency</p>
                        <p className="font-mono text-sm">{o.latency}</p>
                      </div>
                      <Badge variant={o.status === "healthy" ? "default" : "destructive"}>{o.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-models">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Cpu className="w-5 h-5" /> AI Intelligence Models</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aiModels.map((m) => (
                  <div key={m.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">{m.name}</h3>
                      <Badge variant="outline">Trained: {m.lastTrained}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Accuracy</p>
                        <div className="flex items-center gap-2">
                          <Progress value={m.accuracy} className="h-2 flex-1" />
                          <span className="text-sm font-bold text-green-600">{m.accuracy}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Features</p>
                        <p className="font-medium">{m.features}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Predictions/Day</p>
                        <p className="font-medium">{m.predictions}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge variant="default">Production</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGDataLake;
