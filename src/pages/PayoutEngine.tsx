import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Banknote, Calendar, Users, CheckCircle, Clock, AlertTriangle,
  Loader2, Plus, FileText, TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalPolicy } from "@/hooks/useApprovalPolicy";
import { format } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const PayoutEngine = () => {
  const { user } = useAuth();
  const { canApprove: canApprovePayout } = useApprovalPolicy("payout");
  const { toast } = useToast();
  const [cycles, setCycles] = useState<any[]>([]);
  const [remittances, setRemittances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [disputeReason, setDisputeReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [cycleRes, remitRes] = await Promise.all([
      supabase.from("payout_cycles").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("tax_remittances").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setCycles(cycleRes.data || []);
    setRemittances(remitRes.data || []);
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessing(true);
    await supabase.from("payout_cycles").update({
      status: "approved", approved_by: user?.id, approved_at: new Date().toISOString()
    }).eq("id", id);
    toast({ title: "Payout Cycle Approved" });
    setProcessing(false);
    fetchData();
  };

  const handleDispute = async () => {
    if (!selectedCycle || !disputeReason) return;
    await supabase.from("payout_cycles").update({
      status: "disputed", dispute_reason: disputeReason
    }).eq("id", selectedCycle.id);
    toast({ title: "Dispute Filed" });
    setDisputeOpen(false);
    setDisputeReason("");
    fetchData();
  };

  const totals = {
    totalGross: cycles.reduce((a, c) => a + (c.total_gross || 0), 0),
    totalNet: cycles.reduce((a, c) => a + (c.total_net || 0), 0),
    totalTax: cycles.reduce((a, c) => a + (c.total_tax || 0), 0),
    cycleCount: cycles.length,
  };

  const statusColor: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    pending_approval: "bg-warning/10 text-warning",
    approved: "bg-success/10 text-success",
    processing: "bg-primary/10 text-primary",
    completed: "bg-success/10 text-success",
    disputed: "bg-destructive/10 text-destructive",
  };

  return (
    <DashboardLayout title="Payout Engine" subtitle="Automated payout cycles, tax remittances & dispute resolution">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Gross", value: formatCurrency(totals.totalGross), icon: Banknote, color: "text-primary bg-primary/10" },
          { label: "Total Net Payouts", value: formatCurrency(totals.totalNet), icon: TrendingUp, color: "text-success bg-success/10" },
          { label: "Total Tax Withheld", value: formatCurrency(totals.totalTax), icon: FileText, color: "text-warning bg-warning/10" },
          { label: "Payout Cycles", value: totals.cycleCount, icon: Calendar, color: "text-muted-foreground bg-muted" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-6">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Payout Cycles */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Payout Cycles
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payout cycles yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Drivers</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Tax</TableHead>
                  <TableHead>Bonuses</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell className="text-sm">{cycle.period_start} → {cycle.period_end}</TableCell>
                    <TableCell><Badge variant="outline">{cycle.cycle_type}</Badge></TableCell>
                    <TableCell>{cycle.driver_count}</TableCell>
                    <TableCell>{formatCurrency(cycle.total_gross)}</TableCell>
                    <TableCell className="text-destructive">{formatCurrency(cycle.total_tax)}</TableCell>
                    <TableCell className="text-success">{formatCurrency(cycle.total_bonuses)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(cycle.total_net)}</TableCell>
                    <TableCell><Badge className={statusColor[cycle.status] || ""}>{cycle.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {cycle.status === "pending_approval" && canApprovePayout && (
                          <Button size="sm" variant="ghost" onClick={() => handleApprove(cycle.id)}>
                            <CheckCircle className="w-4 h-4 text-success" />
                          </Button>
                        )}
                        {cycle.status !== "disputed" && cycle.status !== "completed" && (
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedCycle(cycle); setDisputeOpen(true); }}>
                            <AlertTriangle className="w-4 h-4 text-warning" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Tax Remittances */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" /> Tax Remittances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {remittances.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No remittances recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {remittances.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="uppercase font-medium text-sm">{r.remittance_type}</TableCell>
                    <TableCell>{formatCurrency(r.amount)}</TableCell>
                    <TableCell className="text-sm">{r.period_start} → {r.period_end}</TableCell>
                    <TableCell className="text-sm">{r.due_date}</TableCell>
                    <TableCell className="text-sm">{r.reference_number || "-"}</TableCell>
                    <TableCell>
                      <Badge className={r.status === "remitted" ? "bg-success/10 text-success" : r.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}>
                        {r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dispute Dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>File Payout Dispute</DialogTitle>
            <DialogDescription>Provide reason for disputing this payout cycle</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Reason for Dispute</Label>
            <Textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} placeholder="Describe the issue..." className="mt-2" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDispute} disabled={!disputeReason}>
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default PayoutEngine;
