import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Brain, TrendingUp, Clock, Radar, GitBranch, Users, Truck } from "lucide-react";
import AutoPurchaseOrders from "@/components/fmcg/procurement/AutoPurchaseOrders";
import SupplierIntelligence from "@/components/fmcg/procurement/SupplierIntelligence";
import DemandForecast from "@/components/fmcg/procurement/DemandForecast";
import DemandSensingTab from "@/components/fmcg/procurement/DemandSensingTab";
import SupplyOptimizationTab from "@/components/fmcg/procurement/SupplyOptimizationTab";
import ExecutiveDecisionTab from "@/components/fmcg/procurement/ExecutiveDecisionTab";
import StrategicLogisticsTab from "@/components/fmcg/procurement/StrategicLogisticsTab";
import { DemoPreviewGate } from "@/components/demo/DemoPreviewGate";

const FMCGProcurementInner = () => {
  return (
    <FMCGLayout title="Procurement & S&OP AI" subtitle="Intelligent auto-replenishment, supplier scoring, demand sensing & sales-operations planning">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Auto-POs Generated", value: "12", icon: ShoppingCart, color: "text-blue-600" },
          { label: "AI Confidence Avg", value: "84.4%", icon: Brain, color: "text-purple-600" },
          { label: "Cost Savings (MTD)", value: "₦1.2M", icon: TrendingUp, color: "text-green-600" },
          { label: "Avg Lead Time", value: "3.6 days", icon: Clock, color: "text-orange-600" },
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

      <Tabs defaultValue="auto-po">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="auto-po" className="gap-1"><ShoppingCart className="w-3.5 h-3.5" /> Auto POs</TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-1"><Brain className="w-3.5 h-3.5" /> Suppliers</TabsTrigger>
          <TabsTrigger value="demand" className="gap-1"><TrendingUp className="w-3.5 h-3.5" /> Forecast</TabsTrigger>
          <TabsTrigger value="demand-sensing" className="gap-1"><Radar className="w-3.5 h-3.5" /> Demand Sensing</TabsTrigger>
          <TabsTrigger value="supply-optimization" className="gap-1"><GitBranch className="w-3.5 h-3.5" /> Supply AI</TabsTrigger>
          <TabsTrigger value="executive" className="gap-1"><Users className="w-3.5 h-3.5" /> Executive S&OP</TabsTrigger>
          <TabsTrigger value="strategic-logistics" className="gap-1"><Truck className="w-3.5 h-3.5" /> Strategic Logistics</TabsTrigger>
        </TabsList>

        <TabsContent value="auto-po"><AutoPurchaseOrders /></TabsContent>
        <TabsContent value="suppliers"><SupplierIntelligence /></TabsContent>
        <TabsContent value="demand"><DemandForecast /></TabsContent>
        <TabsContent value="demand-sensing"><DemandSensingTab /></TabsContent>
        <TabsContent value="supply-optimization"><SupplyOptimizationTab /></TabsContent>
        <TabsContent value="executive"><ExecutiveDecisionTab /></TabsContent>
        <TabsContent value="strategic-logistics"><StrategicLogisticsTab /></TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

const FMCGProcurement = () => (
  <DemoPreviewGate
    title="FMCG Procurement & S&OP"
    description="Auto-replenishment, supplier scoring, demand sensing and S&OP planning will populate from your real procurement records once procurement data is connected."
  >
    <FMCGProcurementInner />
  </DemoPreviewGate>
);

export default FMCGProcurement;
