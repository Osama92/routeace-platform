import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, BarChart3, AlertTriangle, Cog } from "lucide-react";
import StrategicVisionBoard from "@/components/strategy/StrategicVisionBoard";
import type { VisionBoardData } from "@/components/strategy/StrategicVisionBoard";
import SIPOCDiagram, { generateLogisticsSIPOC } from "@/components/strategy/SIPOCDiagram";
import GoalDeviationAlerts, { evaluateGoalDeviations } from "@/components/strategy/GoalDeviationAlerts";

const defaultVisionBoard: VisionBoardData = {
  companyName: "My Company",
  industry: "Logistics & Haulage",
  mission: "To deliver goods safely, on-time, and cost-efficiently across every route we serve.",
  vision: "To be the most trusted technology-driven logistics company in our region.",
  financialGoal: "Achieve ₦500M annual revenue with 15% net margin within 12 months.",
  ninetyDayGoal: "Onboard 5 enterprise clients, deploy 20 trucks, and achieve 95% SLA compliance.",
  twelveMonthTarget: "₦500,000,000 annual revenue",
  whereWePlay: [
    "B2B haulage for FMCG and manufacturing",
    "Last-mile delivery for e-commerce",
    "Cross-border freight (ECOWAS)",
  ],
  howWeWin: [
    "Route intelligence & margin-aware pricing",
    "Real-time tracking & SLA guarantees",
    "Driver productivity optimization",
    "Automated invoicing & payment collection",
  ],
  enablers: ["RouteAce Platform", "GPS Fleet Tracking", "AI Route Optimization", "Zoho Integration", "Driver App"],
  whatWeWontDo: [
    "Chase unprofitable routes",
    "Operate without SLA contracts",
    "Delay driver payments beyond 7 days",
  ],
  fleetExpansionTarget: "50 trucks by Q4",
  marketExpansionTarget: "3 new states",
  kpiTargets: [
    { label: "On-Time Delivery", value: "95%" },
    { label: "SLA Breach Rate", value: "<3%" },
    { label: "Fleet Utilization", value: ">80%" },
    { label: "Profit Margin", value: "15%" },
    { label: "Revenue/Drop", value: "₦45K" },
    { label: "Cash Runway", value: "6 months" },
    { label: "Driver Rating", value: "4.5/5" },
    { label: "Invoice DSO", value: "<30 days" },
  ],
};

const StrategyDashboard = () => {
  const [visionBoard] = useState<VisionBoardData>(defaultVisionBoard);
  const sipocData = generateLogisticsSIPOC();

  // Sample deviation metrics
  const deviations = evaluateGoalDeviations({
    revenueTarget: 500000000,
    revenueCurrent: 380000000,
    slaBreachRate: 7.2,
    profitMargin: 11,
    profitMarginTarget: 15,
    fleetIdleRate: 22,
    cashRunwayMonths: 4.5,
  });

  return (
    <DashboardLayout
      title="Strategic Intelligence"
      subtitle="Vision board, SIPOC process map, and goal deviation alerts"
    >
      <Tabs defaultValue="vision" className="space-y-6">
        <TabsList>
          <TabsTrigger value="vision" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Vision Board
          </TabsTrigger>
          <TabsTrigger value="sipoc" className="flex items-center gap-2">
            <Cog className="w-4 h-4" />
            SIPOC
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Goal Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vision">
          <StrategicVisionBoard data={visionBoard} />
        </TabsContent>

        <TabsContent value="sipoc">
          <SIPOCDiagram data={sipocData} industry="Logistics & Haulage" />
        </TabsContent>

        <TabsContent value="alerts">
          <GoalDeviationAlerts deviations={deviations} />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default StrategyDashboard;
