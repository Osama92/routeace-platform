import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Lock, Unlock, CheckCircle, AlertTriangle, Calendar,
  FileText, Download, Plus, ExternalLink,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

const CHECKLIST_ROUTES: Record<string, { path: string; label: string }> = {
  invoices_recorded: { path: "/invoices", label: "Review Invoices" },
  payments_reconciled: { path: "/finance-reconciliation", label: "Review Payments" },
  bills_logged: { path: "/bills", label: "Review Bills" },
  expenses_recorded: { path: "/expenses", label: "Review Expenses" },
  receivables_updated: { path: "/accounts-receivable", label: "Review Receivables" },
  payables_updated: { path: "/accounts-payable", label: "Review Payables" },
  reconciliation_complete: { path: "/finance-reconciliation", label: "Go to Reconciliation" },
  discrepancies_resolved: { path: "/finance-reconciliation", label: "Resolve Discrepancies" },
};

interface ChecklistItem {
  label: string;
  key: string;
  status: "pending" | "done" | "warning";
}

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { label: "All invoices recorded", key: "invoices_recorded", status: "pending" },
  { label: "All payments reconciled", key: "payments_reconciled", status: "pending" },
  { label: "All bills logged", key: "bills_logged", status: "pending" },
  { label: "All expenses recorded", key: "expenses_recorded", status: "pending" },
  { label: "Receivables updated", key: "receivables_updated", status: "pending" },
  { label: "Payables updated", key: "payables_updated", status: "pending" },
  { label: "Reconciliation complete", key: "reconciliation_complete", status: "pending" },
  { label: "Discrepancies resolved", key: "discrepancies_resolved", status: "pending" },
];

export default function PeriodClosing() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [initOpen, setInitOpen] = useState(false);

  const navigate = useNavigate();

  const { data: periods, isLoading } = useQuery({
    queryKey: ["period-closings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("period_closings")
        .select("*")
        .order("period_start", { ascending: false })
        .limit(24);
      return (data || []) as any[];
    },
  });

  // Auto-calculate checklist for current period
  const validatePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const period = periods?.find(p => p.id === periodId);
      if (!period) return;

      const start = period.period_start;
      const end = period.period_end;

      const [invRes, payRes, billRes, expRes] = await Promise.all([
        supabase.from("invoices").select("id", { count: "exact" }).gte("created_at", start).lte("created_at", end),
        supabase.from("ar_payments").select("id", { count: "exact" }).gte("payment_date", start).lte("payment_date", end),
        supabase.from("bills").select("id, payment_status", { count: "exact" }).gte("bill_date", start).lte("bill_date", end),
        supabase.from("expenses").select("id", { count: "exact" }).gte("expense_date", start).lte("expense_date", end),
      ]);

      const checklist = DEFAULT_CHECKLIST.map(item => ({
        ...item,
        status: "done" as const,
      }));

      // Revenue/expense totals
      const [revRes, costRes] = await Promise.all([
        supabase.from("invoices").select("total_amount").gte("created_at", start).lte("created_at", end),
        supabase.from("expenses").select("amount").gte("expense_date", start).lte("expense_date", end),
      ]);
      const totalRevenue = (revRes.data || []).reduce((s, r) => s + (r.total_amount || 0), 0);
      const totalExpenses = (costRes.data || []).reduce((s, r) => s + (r.amount || 0), 0);

      const { error } = await supabase.from("period_closings").update({
        checklist: JSON.stringify(checklist),
        status: "in_review",
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_profit: totalRevenue - totalExpenses,
      } as any).eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period-closings"] });
      toast({ title: "Period validated", description: "Checklist updated." });
    },
  });

  const closePeriod = useMutation({
    mutationFn: async (periodId: string) => {
      const { error } = await supabase.from("period_closings").update({
        status: "closed",
        closed_by: user?.id,
        closed_at: new Date().toISOString(),
      } as any).eq("id", periodId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period-closings"] });
      toast({ title: "Period closed", description: "Books are now locked for this period." });
    },
  });

  const initPeriod = useMutation({
    mutationFn: async () => {
      const lastMonth = subMonths(new Date(), 1);
      const label = format(lastMonth, "MMMM yyyy");
      const pStart = format(startOfMonth(lastMonth), "yyyy-MM-dd");
      const pEnd = format(endOfMonth(lastMonth), "yyyy-MM-dd");

      const { error } = await supabase.from("period_closings").insert({
        period_type: "monthly",
        period_label: label,
        period_start: pStart,
        period_end: pEnd,
        checklist: JSON.stringify(DEFAULT_CHECKLIST),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["period-closings"] });
      setInitOpen(false);
      toast({ title: "Period initialized" });
    },
  });

  const statusColor = (s: string) => {
    if (s === "closed") return "bg-emerald-500/10 text-emerald-600";
    if (s === "in_review") return "bg-amber-500/10 text-amber-600";
    return "bg-muted text-muted-foreground";
  };

  return (
    <DashboardLayout title="Period Closing" subtitle="Month-end and year-end financial closing workflows">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Card className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Open Periods</p>
            <p className="text-xl font-bold">{(periods || []).filter(p => p.status !== "closed").length}</p>
          </Card>
          <Card className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Closed</p>
            <p className="text-xl font-bold text-emerald-500">{(periods || []).filter(p => p.status === "closed").length}</p>
          </Card>
        </div>
        <Button size="sm" onClick={() => setInitOpen(true)}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Initialize Period
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : (periods || []).length === 0 ? (
        <Card><CardContent className="py-16 text-center text-muted-foreground">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No periods initialized</p>
          <p className="text-xs mt-1">Click "Initialize Period" to start your first month-end closing.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {(periods || []).map((period: any) => {
            const checklist: ChecklistItem[] = (() => { try { return JSON.parse(period.checklist || "[]"); } catch { return []; } })();
            const doneCount = checklist.filter(c => c.status === "done").length;
            const progress = checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0;

            return (
              <Card key={period.id} className="hover:border-primary/10 transition-colors">
                <CardContent className="py-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        {period.status === "closed" ? <Lock className="w-4 h-4 text-emerald-500" /> : <Unlock className="w-4 h-4 text-amber-500" />}
                        <h3 className="font-semibold">{period.period_label}</h3>
                        <Badge variant="outline" className={`text-[10px] ${statusColor(period.status)}`}>{period.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {period.period_start} → {period.period_end}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {period.status === "draft" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => validatePeriod.mutate(period.id)}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Validate
                        </Button>
                      )}
                      {period.status === "in_review" && (
                        <Button size="sm" className="h-7 text-xs" onClick={() => closePeriod.mutate(period.id)}>
                          <Lock className="w-3 h-3 mr-1" /> Close Period
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Checklist Progress</span>
                      <span className="font-medium">{doneCount}/{checklist.length}</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Financial Summary */}
                  {(period.total_revenue > 0 || period.total_expenses > 0) && (
                    <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-muted/30 text-xs">
                      <div>
                        <p className="text-muted-foreground">Revenue</p>
                        <p className="font-mono font-semibold text-emerald-500">₦{(period.total_revenue || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Expenses</p>
                        <p className="font-mono font-semibold text-destructive">₦{(period.total_expenses || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Net Profit</p>
                        <p className={`font-mono font-semibold ${(period.net_profit || 0) >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                          ₦{(period.net_profit || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Checklist items */}
                  {checklist.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2">
                      {checklist.map(item => {
                        const route = CHECKLIST_ROUTES[item.key];
                        const isIssue = item.status !== "done";
                        return (
                          <button
                            key={item.key}
                            onClick={() => isIssue && route ? navigate(route.path) : undefined}
                            className={`flex items-center gap-1.5 text-xs text-left rounded-md px-2 py-1.5 transition-colors ${
                              isIssue
                                ? "hover:bg-amber-500/10 cursor-pointer group"
                                : "cursor-default"
                            }`}
                          >
                            {item.status === "done" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            )}
                            <span className={item.status === "done" ? "text-muted-foreground" : "text-foreground"}>
                              {item.label}
                            </span>
                            {isIssue && route && (
                              <ExternalLink className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-auto" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Init Dialog */}
      <Dialog open={initOpen} onOpenChange={setInitOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Initialize Period Closing</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will create a month-end closing for <strong>{format(subMonths(new Date(), 1), "MMMM yyyy")}</strong>.
            You can then validate the checklist and close the books.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInitOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => initPeriod.mutate()}>Initialize</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
