import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useSalesOS } from "@/hooks/useSalesOS";
import ExportDropdown from "@/components/analytics/ExportDropdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Target, Plus, ArrowLeft, DollarSign, AlertTriangle, Calendar, Building2, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stages = [
  { key: "lead", label: "Lead", color: "border-blue-400 bg-blue-50" },
  { key: "qualified", label: "Qualified", color: "border-indigo-400 bg-indigo-50" },
  { key: "discovery", label: "Discovery", color: "border-violet-400 bg-violet-50" },
  { key: "proposal", label: "Proposal", color: "border-purple-400 bg-purple-50" },
  { key: "negotiation", label: "Negotiation", color: "border-pink-400 bg-pink-50" },
  { key: "approval", label: "Approval", color: "border-rose-400 bg-rose-50" },
  { key: "won", label: "Won", color: "border-emerald-400 bg-emerald-50" },
];

const SalesPipeline = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { opportunities, accounts, createOpportunity, updateOpportunityStage, pipelineData, totalPipeline, weightedPipeline, wonRevenue } = useSalesOS();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    opportunity_name: "", account_id: "", stage: "lead", amount: "", expected_close_date: "",
    competitor: "", notes: "",
  });

  const handleCreate = async () => {
    if (!form.opportunity_name) return;
    const stageProb: Record<string, number> = { lead: 10, qualified: 25, discovery: 40, proposal: 60, negotiation: 75, approval: 90, won: 100, lost: 0 };
    await createOpportunity({
      ...form,
      amount: form.amount ? parseFloat(form.amount) : 0,
      probability: stageProb[form.stage] || 10,
      account_id: form.account_id || null,
    } as any);
    setOpen(false);
    setForm({ opportunity_name: "", account_id: "", stage: "lead", amount: "", expected_close_date: "", competitor: "", notes: "" });
  };

  const handleConvertToDispatch = async (opp: any) => {
    try {
      const { error } = await supabase.from("dispatches").insert([{
        dispatch_number: `DSP-${Date.now()}`,
        customer_id: opp.account_id || null,
        pickup_address: "Warehouse (from Sales Order)",
        delivery_address: opp.account?.account_name || "Customer Location",
        cargo_description: `Sales Order: ${opp.opportunity_name}`,
        cost: opp.amount || 0,
        status: "pending",
        created_by: user?.id,
        submitted_by: user?.id,
      }]);
      if (error) throw error;
      toast({ title: "Dispatch Created", description: `Order "${opp.opportunity_name}" converted to dispatch` });
      queryClient.invalidateQueries({ queryKey: ["ops-dispatches"] });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const riskDeals = opportunities.filter(o =>
    o.stage !== "won" && o.stage !== "lost" &&
    o.expected_close_date && new Date(o.expected_close_date) < new Date()
  );

  const exportData = opportunities.map(o => ({
    opportunity: o.opportunity_name,
    account: o.account?.account_name || "-",
    stage: o.stage,
    amount: o.amount || 0,
    probability: o.probability || 0,
    close_date: o.expected_close_date || "-",
  }));

  return (
    <DashboardLayout title="Deal Pipeline" subtitle="Track opportunities from lead to close">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>
          <div className="flex items-center gap-2">
            <ExportDropdown options={{
              title: "Pipeline Report",
              columns: [
                { key: "opportunity", label: "Opportunity" },
                { key: "account", label: "Account" },
                { key: "stage", label: "Stage" },
                { key: "amount", label: "Amount (₦)", format: (v) => `₦${Number(v).toLocaleString()}` },
                { key: "probability", label: "Probability %" },
                { key: "close_date", label: "Expected Close" },
              ],
              data: exportData,
              filename: "pipeline-report",
            }} />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Opportunity</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Opportunity</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div><Label>Opportunity Name *</Label><Input value={form.opportunity_name} onChange={e => setForm(p => ({ ...p, opportunity_name: e.target.value }))} placeholder="Acme Q3 Order" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account</Label>
                    <Select value={form.account_id} onValueChange={v => setForm(p => ({ ...p, account_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Stage</Label>
                    <Select value={form.stage} onValueChange={v => setForm(p => ({ ...p, stage: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{stages.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Amount (₦)</Label><Input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} /></div>
                  <div><Label>Expected Close</Label><Input type="date" value={form.expected_close_date} onChange={e => setForm(p => ({ ...p, expected_close_date: e.target.value }))} /></div>
                </div>
                <div><Label>Competitor</Label><Input value={form.competitor} onChange={e => setForm(p => ({ ...p, competitor: e.target.value }))} /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create</Button>
                </div>
              </div>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Pipeline summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4"><DollarSign className="w-5 h-5 text-primary mb-1" /><p className="text-xl font-bold">₦{(totalPipeline / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Total Pipeline</p></CardContent></Card>
          <Card><CardContent className="p-4"><Target className="w-5 h-5 text-amber-600 mb-1" /><p className="text-xl font-bold">₦{(weightedPipeline / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Weighted Forecast</p></CardContent></Card>
          <Card><CardContent className="p-4"><DollarSign className="w-5 h-5 text-emerald-600 mb-1" /><p className="text-xl font-bold">₦{(wonRevenue / 1e6).toFixed(1)}M</p><p className="text-xs text-muted-foreground">Won Revenue</p></CardContent></Card>
        </div>

        {/* Risk alerts */}
        {riskDeals.length > 0 && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800">{riskDeals.length} deal(s) past expected close date - review and update stages</p>
            </CardContent>
          </Card>
        )}

        {/* Kanban-style pipeline */}
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map(s => {
            const stageOpps = opportunities.filter(o => o.stage === s.key);
            const stageValue = stageOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
            return (
              <div key={s.key} className="min-w-[220px] flex-1">
                <div className={`p-2 rounded-t-lg border-t-4 ${s.color} mb-2`}>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold">{s.label}</p>
                    <Badge variant="secondary" className="text-[10px]">{stageOpps.length}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">₦{(stageValue / 1000).toFixed(0)}K</p>
                </div>
                <div className="space-y-2">
                  {stageOpps.length === 0 ? (
                    <div className="p-3 border border-dashed rounded-lg text-center text-xs text-muted-foreground">No deals</div>
                  ) : stageOpps.map(o => (
                    <Card key={o.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-3">
                        <p className="font-medium text-sm mb-1 truncate">{o.opportunity_name}</p>
                        {o.account && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Building2 className="w-3 h-3" />{o.account.account_name}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-sm font-bold text-primary">₦{((o.amount || 0) / 1000).toFixed(0)}K</p>
                          {o.expected_close_date && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(o.expected_close_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</p>}
                        </div>
                         {o.competitor && <Badge variant="outline" className="text-[9px] mt-1">vs {o.competitor}</Badge>}
                         {s.key === "won" && (
                           <Button size="sm" variant="outline" className="w-full mt-2 text-[10px] h-7" onClick={() => handleConvertToDispatch(o)}>
                             <Truck className="w-3 h-3 mr-1" /> Convert to Dispatch
                           </Button>
                         )}
                       </CardContent>
                     </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SalesPipeline;
