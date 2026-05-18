import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrendingUp, AlertCircle, Loader2, Sparkles } from "lucide-react";

const TYPE_BADGE: Record<string, string> = {
  upsell: "bg-green-500/10 text-green-700 border-green-500/20",
  churn_risk: "bg-red-500/10 text-red-700 border-red-500/20",
  new_account_growth: "bg-blue-500/10 text-blue-700 border-blue-500/20",
};

export default function RevenueExpansionEngine() {
  const [running, setRunning] = useState(false);

  const { data: signals = [], refetch } = useQuery({
    queryKey: ["revenue-expansion-signals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revenue_expansion_signals")
        .select("*, customer:customers(name)")
        .eq("status", "open")
        .order("opportunity_value", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const runEngine = async () => {
    setRunning(true);
    try {
      const { error } = await supabase.functions.invoke("revenue-expansion-engine", { body: {} });
      if (error) throw error;
      toast.success("Expansion signals refreshed");
      await refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRunning(false);
    }
  };

  const totalOpportunity = signals.reduce((a: number, s: any) => a + Number(s.opportunity_value || 0), 0);

  return (
    <DashboardLayout title="Revenue Expansion Engine">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><TrendingUp className="w-7 h-7 text-green-600" /> Revenue Expansion</h1>
            <p className="text-muted-foreground">AI-detected upsell, churn, and growth opportunities per account</p>
          </div>
          <Button onClick={runEngine} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Scan Accounts
          </Button>
        </div>

        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Open Opportunity</p>
            <p className="text-4xl font-bold">₦{totalOpportunity.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">{signals.length} signals across accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Active Signals</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Customer</TableHead><TableHead>Type</TableHead>
                <TableHead>Opportunity</TableHead><TableHead>Confidence</TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {signals.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.customer?.name || "Unknown"}</TableCell>
                    <TableCell><Badge variant="outline" className={TYPE_BADGE[s.signal_type]}>{s.signal_type.replace(/_/g, " ")}</Badge></TableCell>
                    <TableCell className="font-bold">₦{Number(s.opportunity_value).toLocaleString()}</TableCell>
                    <TableCell>{Math.round(Number(s.confidence) * 100)}%</TableCell>
                    <TableCell className="text-sm">{s.recommended_action}</TableCell>
                  </TableRow>
                ))}
                {signals.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No signals yet. Run the scan to detect opportunities.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
