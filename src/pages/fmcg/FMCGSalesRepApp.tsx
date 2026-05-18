import { useState } from "react";
import FMCGLayout from "@/components/fmcg/FMCGLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap } from "lucide-react";
import { useFieldSales } from "@/hooks/useFieldSales";
import { useFMCGRole } from "@/hooks/useFMCGRole";
import DailyRouteTab from "@/components/fmcg/field-sales/DailyRouteTab";
import RetailerProfileTab from "@/components/fmcg/field-sales/RetailerProfileTab";
import OrderCaptureTab from "@/components/fmcg/field-sales/OrderCaptureTab";
import MerchandisingAuditTab from "@/components/fmcg/field-sales/MerchandisingAuditTab";
import ReturnsTab from "@/components/fmcg/field-sales/ReturnsTab";

const FMCGSalesRepApp = () => {
  const [activeTab, setActiveTab] = useState("route");
  const [selectedOutletId, setSelectedOutletId] = useState<string>("");
  const [selectedOutletName, setSelectedOutletName] = useState<string>("");
  const { fmcgRole } = useFMCGRole();

  const {
    visits, orders, skus, outlets, returns, audits, loading,
    checkIn, checkOut, createOrder, submitAudit, logReturn, updateReturnStatus,
  } = useFieldSales();

  const canApprove = fmcgRole && ["strategic_leadership", "regional_sales_manager", "area_sales_manager", "sales_supervisor"].includes(fmcgRole);

  const todayVisits = visits.filter(v => v.check_in_at && new Date(v.check_in_at).toDateString() === new Date().toDateString());
  const completedVisits = todayVisits.filter(v => v.check_out_at).length;
  const todayOrders = orders.filter(o => o.created_at && new Date(o.created_at).toDateString() === new Date().toDateString());
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total_amount || 0), 0);

  const handleTakeOrder = (outletId: string) => {
    setSelectedOutletId(outletId);
    setActiveTab("order");
  };

  const handleShelfAudit = (outletName: string) => {
    setSelectedOutletName(outletName);
    setActiveTab("audit");
  };

  return (
    <FMCGLayout title="Field Sales Interface" subtitle="Journey-driven daily execution for sales reps, ASMs & merchandisers">
      {/* Gamification Strip */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-emerald-500/10 to-blue-500/10 border">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <div><p className="text-sm font-bold">{completedVisits} visits</p><p className="text-xs text-muted-foreground">today</p></div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-orange-500" />
          <div><p className="text-sm font-bold">{todayOrders.length} orders</p><p className="text-xs text-muted-foreground">₦{(todayRevenue / 1000).toFixed(0)}K revenue</p></div>
        </div>
        <div className="h-8 w-px bg-border" />
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span>{completedVisits}/{outlets.length > 6 ? 6 : outlets.length} visits</span>
            <span>₦{(todayRevenue / 1000).toFixed(0)}K today</span>
          </div>
          <Progress value={outlets.length ? (completedVisits / Math.min(outlets.length, 6)) * 100 : 0} className="h-2" />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="route">Daily Route</TabsTrigger>
          <TabsTrigger value="retailer">Retailer Profile</TabsTrigger>
          <TabsTrigger value="order">Order Capture</TabsTrigger>
          <TabsTrigger value="audit">Merchandising Audit</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
        </TabsList>

        <TabsContent value="route">
          <DailyRouteTab
            visits={visits}
            outlets={outlets}
            onCheckIn={checkIn}
            onCheckOut={checkOut}
            onTakeOrder={handleTakeOrder}
            onShelfAudit={handleShelfAudit}
          />
        </TabsContent>

        <TabsContent value="retailer">
          <RetailerProfileTab outlets={outlets} selectedOutletId={selectedOutletId} />
        </TabsContent>

        <TabsContent value="order">
          <OrderCaptureTab
            skus={skus}
            outlets={outlets}
            selectedOutletId={selectedOutletId}
            onSubmitOrder={createOrder}
          />
        </TabsContent>

        <TabsContent value="audit">
          <MerchandisingAuditTab
            audits={audits}
            outlets={outlets}
            selectedOutletName={selectedOutletName}
            onSubmitAudit={submitAudit}
          />
        </TabsContent>

        <TabsContent value="returns">
          <ReturnsTab
            returns={returns}
            outlets={outlets}
            canApprove={!!canApprove}
            onLogReturn={logReturn}
            onUpdateStatus={updateReturnStatus}
          />
        </TabsContent>
      </Tabs>
    </FMCGLayout>
  );
};

export default FMCGSalesRepApp;
