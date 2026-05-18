import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSalesOS } from "@/hooks/useSalesOS";
import { TrendingUp, ArrowLeft, Target, DollarSign, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesForecast = () => {
  const navigate = useNavigate();
  const { opportunities, pipelineData, totalPipeline, weightedPipeline, wonRevenue } = useSalesOS();

  const committed = opportunities.filter(o => o.stage === "negotiation" || o.stage === "approval").reduce((s, o) => s + (o.amount || 0), 0);
  const bestCase = opportunities.filter(o => o.stage !== "lost").reduce((s, o) => s + (o.amount || 0) * ((o.probability || 0) / 100), 0);

  return (
    <DashboardLayout title="Sales Forecast" subtitle="Revenue prediction and pipeline intelligence">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="p-4"><Target className="w-5 h-5 text-blue-600 mb-2" /><p className="text-2xl font-bold">₦{(totalPipeline / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Total Pipeline</p></CardContent></Card>
          <Card><CardContent className="p-4"><TrendingUp className="w-5 h-5 text-amber-600 mb-2" /><p className="text-2xl font-bold">₦{(weightedPipeline / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Weighted Forecast</p></CardContent></Card>
          <Card><CardContent className="p-4"><BarChart3 className="w-5 h-5 text-violet-600 mb-2" /><p className="text-2xl font-bold">₦{(committed / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Committed</p></CardContent></Card>
          <Card><CardContent className="p-4"><DollarSign className="w-5 h-5 text-emerald-600 mb-2" /><p className="text-2xl font-bold">₦{(wonRevenue / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Closed Won</p></CardContent></Card>
        </div>

        {/* Stage breakdown */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Pipeline by Stage</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {pipelineData.filter(p => p.stage !== "lost").map(p => {
              const pct = totalPipeline > 0 ? (p.value / totalPipeline) * 100 : 0;
              return (
                <div key={p.stage} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium">{p.label}</div>
                  <div className="flex-1">
                    <Progress value={pct} className="h-3" />
                  </div>
                  <div className="w-16 text-right text-sm font-bold">{p.count}</div>
                  <div className="w-24 text-right text-sm text-muted-foreground">₦{(p.value / 1000).toFixed(0)}K</div>
                  <Badge variant="outline" className="text-[10px] w-12 justify-center">{p.probability}%</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Forecast categories */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Forecast Categories</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-xs font-medium text-emerald-700 mb-1">Committed</p>
                <p className="text-xl font-bold text-emerald-800">₦{(committed / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-emerald-600 mt-1">Negotiation + Approval stages</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-1">Best Case</p>
                <p className="text-xl font-bold text-blue-800">₦{(bestCase / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-blue-600 mt-1">Weighted probability across pipeline</p>
              </div>
              <div className="p-4 rounded-lg bg-violet-50 border border-violet-200">
                <p className="text-xs font-medium text-violet-700 mb-1">Upside</p>
                <p className="text-xl font-bold text-violet-800">₦{(totalPipeline / 1e6).toFixed(1)}M</p>
                <p className="text-xs text-violet-600 mt-1">All open pipeline unweighted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {opportunities.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No forecast data yet</p>
              <p className="text-xs text-muted-foreground">Create opportunities in your pipeline to generate forecasts</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SalesForecast;
