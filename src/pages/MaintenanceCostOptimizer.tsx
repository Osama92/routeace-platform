import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Wrench, TrendingDown, DollarSign, Loader2 } from "lucide-react";

export default function MaintenanceCostOptimizer() {
  const [running, setRunning] = useState(false);

  const { data: rows = [], refetch } = useQuery({
    queryKey: ["maintenance-cost-analysis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_cost_analysis")
        .select("*")
        .order("roi_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const runOptimizer = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("maintenance-cost-optimizer", { body: {} });
      if (error) throw error;
      toast.success("Maintenance cost analysis updated");
      await refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const totalSavings = rows.reduce((a: number, r: any) => a + Number(r.projected_savings || 0), 0);
  const totalReactive = rows.reduce((a: number, r: any) => a + Number(r.reactive_spend || 0), 0);

  return (
    <DashboardLayout title="Maintenance Cost Optimizer">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><Wrench className="w-7 h-7" /> Maintenance Cost Optimizer</h1>
            <p className="text-muted-foreground">AI-ranked preventive vs reactive ROI analysis</p>
          </div>
          <Button onClick={runOptimizer} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Run AI Analysis
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reactive Spend (90d)</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-destructive">₦{totalReactive.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Projected Savings</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-green-600">₦{totalSavings.toLocaleString()}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Vehicles Analyzed</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{rows.length}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle>ROI Recommendations</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Vehicle</TableHead><TableHead>Reactive ₦</TableHead><TableHead>Preventive ₦</TableHead>
                <TableHead>Downtime</TableHead><TableHead>Projected Save</TableHead><TableHead>ROI</TableHead><TableHead>Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.vehicle_id?.slice(0, 8)}</TableCell>
                    <TableCell className="text-destructive">₦{Number(r.reactive_spend).toLocaleString()}</TableCell>
                    <TableCell>₦{Number(r.preventive_spend).toLocaleString()}</TableCell>
                    <TableCell>{r.downtime_hours}h</TableCell>
                    <TableCell className="text-green-600 font-semibold">₦{Number(r.projected_savings).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={r.roi_score > 3 ? "default" : "secondary"}>{r.roi_score}x</Badge></TableCell>
                    <TableCell className="text-sm">{r.recommended_action}</TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Click "Run AI Analysis" to begin</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
