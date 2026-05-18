import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle, XCircle, AlertTriangle, Link2, FileText,
  ArrowRight, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

export default function FinanceReconciliation() {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const orgEq = (q: any) => organizationId ? q.eq("organization_id", organizationId) : q;

  // Fetch invoices and payments for matching
  const { data: invoices, isLoading: loadingInv } = useQuery({
    queryKey: ["recon-invoices", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await orgEq(supabase
        .from("invoices")
        .select("id, invoice_number, total_amount, status, customer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(200));
      return data || [];
    },
  });

  const { data: payments, isLoading: loadingPay } = useQuery({
    queryKey: ["recon-payments", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await orgEq(supabase
        .from("ar_payments")
        .select("id, amount, payment_date, invoice_id, payment_reference")
        .order("payment_date", { ascending: false })
        .limit(200));
      return data || [];
    },
  });

  const { data: bills, isLoading: loadingBills } = useQuery({
    queryKey: ["recon-bills", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await orgEq(supabase
        .from("bills")
        .select("id, bill_number, vendor_name, total_amount, payment_status, created_at")
        .order("created_at", { ascending: false })
        .limit(200));
      return (data || []) as any[];
    },
  });

  const { data: expenses, isLoading: loadingExp } = useQuery({
    queryKey: ["recon-expenses", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await orgEq(supabase
        .from("expenses")
        .select("id, description, amount, category, expense_date")
        .order("expense_date", { ascending: false })
        .limit(200));
      return data || [];
    },
  });

  const { data: reconRecords } = useQuery({
    queryKey: ["recon-records", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await orgEq(supabase
        .from("finance_reconciliation")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500));
      return (data || []) as any[];
    },
  });

  const matchMutation = useMutation({
    mutationFn: async (params: { entityType: string; entityId: string; matchedType: string; matchedId: string; amount: number; matchedAmount: number }) => {
      const { error } = await supabase.from("finance_reconciliation").insert({
        entity_type: params.entityType,
        entity_id: params.entityId,
        matched_entity_type: params.matchedType,
        matched_entity_id: params.matchedId,
        match_status: "matched",
        match_confidence: 100,
        matched_by: user?.id,
        amount: params.amount,
        matched_amount: params.matchedAmount,
        discrepancy: Math.abs(params.amount - params.matchedAmount),
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recon-records"] });
      toast({ title: "Match recorded" });
    },
  });

  // Find auto-suggested matches for invoices
  const matchedInvoiceIds = new Set((reconRecords || []).filter(r => r.entity_type === "invoice").map(r => r.entity_id));
  const matchedPaymentIds = new Set((reconRecords || []).filter(r => r.matched_entity_type === "payment").map(r => r.matched_entity_id));
  const matchedBillIds = new Set((reconRecords || []).filter(r => r.entity_type === "bill").map(r => r.entity_id));

  const unmatchedInvoices = (invoices || []).filter(inv => !matchedInvoiceIds.has(inv.id));
  const unmatchedPayments = (payments || []).filter(p => !matchedPaymentIds.has(p.id) && !p.invoice_id);
  const unmatchedBills = (bills || []).filter(b => !matchedBillIds.has(b.id) && b.payment_status !== "paid");

  // Auto-suggest: match invoices to payments by amount
  const suggestions = unmatchedInvoices.map(inv => {
    const match = unmatchedPayments.find(p => Math.abs(p.amount - inv.total_amount) < 1);
    return { invoice: inv, payment: match || null, confidence: match ? 95 : 0 };
  }).filter(s => s.payment);

  const totalRecords = (invoices?.length || 0) + (bills?.length || 0);
  const matchedCount = reconRecords?.length || 0;
  const unmatchedCount = unmatchedInvoices.length + unmatchedBills.length;
  const discrepancyCount = (reconRecords || []).filter(r => r.discrepancy > 0).length;

  const isLoading = loadingInv || loadingPay || loadingBills || loadingExp;

  return (
    <DashboardLayout title="Reconciliation" subtitle="Match invoices, payments, bills, and expenses">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Total Records</p>
          <p className="text-2xl font-bold text-foreground mt-1">{totalRecords}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Matched</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">{matchedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Unmatched</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{unmatchedCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Discrepancies</p>
          <p className="text-2xl font-bold text-destructive mt-1">{discrepancyCount}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="invoice-payment" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoice-payment">Invoice ↔ Payment</TabsTrigger>
          <TabsTrigger value="bill-expense">Bill ↔ Expense</TabsTrigger>
          <TabsTrigger value="history">Reconciliation History</TabsTrigger>
        </TabsList>

        {/* Invoice ↔ Payment */}
        <TabsContent value="invoice-payment">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : suggestions.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium">All invoices reconciled</p>
              <p className="text-xs mt-1">No unmatched invoices with suggested payments found.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {suggestions.map(s => (
                <Card key={s.invoice.id} className="hover:border-primary/20 transition-colors">
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Invoice</p>
                      <p className="text-sm font-semibold">{s.invoice.invoice_number}</p>
                      <p className="text-xs font-mono text-primary">₦{(s.invoice.total_amount || 0).toLocaleString()}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Suggested Payment</p>
                      <p className="text-sm font-semibold">{s.payment?.payment_reference || "-"}</p>
                      <p className="text-xs font-mono text-emerald-500">₦{(s.payment?.amount || 0).toLocaleString()}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600">{s.confidence}% match</Badge>
                    <Button size="sm" className="h-7 text-xs" onClick={() => matchMutation.mutate({
                      entityType: "invoice",
                      entityId: s.invoice.id,
                      matchedType: "payment",
                      matchedId: s.payment!.id,
                      amount: s.invoice.total_amount,
                      matchedAmount: s.payment!.amount,
                    })}>
                      <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {unmatchedInvoices.filter(inv => !suggestions.find(s => s.invoice.id === inv.id)).length > 0 && (
            <Card className="mt-4">
              <CardHeader><CardTitle className="text-sm">Unmatched Invoices (No Suggested Payment)</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {unmatchedInvoices.filter(inv => !suggestions.find(s => s.invoice.id === inv.id)).slice(0, 20).map(inv => (
                      <TableRow key={inv.id}>
                        <TableCell className="text-xs font-mono">{inv.invoice_number}</TableCell>
                        <TableCell className="text-xs text-right font-mono">₦{(inv.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{inv.status}</Badge></TableCell>
                        <TableCell className="text-xs">{format(new Date(inv.created_at), "MMM dd, yyyy")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Bill ↔ Expense */}
        <TabsContent value="bill-expense">
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : unmatchedBills.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-3 text-emerald-500" />
              <p className="font-medium">All bills reconciled</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {unmatchedBills.slice(0, 20).map((bill: any) => {
                const expMatch = (expenses || []).find((e: any) =>
                  e.description?.toLowerCase().includes(bill.vendor_name?.toLowerCase()) &&
                  Math.abs(e.amount - bill.total_amount) < 1
                );
                return (
                  <Card key={bill.id} className="hover:border-primary/20 transition-colors">
                    <CardContent className="py-4 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Bill</p>
                        <p className="text-sm font-semibold">{bill.bill_number} - {bill.vendor_name}</p>
                        <p className="text-xs font-mono text-primary">₦{(bill.total_amount || 0).toLocaleString()}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground">Matched Expense</p>
                        {expMatch ? (
                          <>
                            <p className="text-sm font-semibold">{expMatch.description?.slice(0, 30)}</p>
                            <p className="text-xs font-mono text-emerald-500">₦{expMatch.amount.toLocaleString()}</p>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No match found</p>
                        )}
                      </div>
                      {expMatch ? (
                        <Button size="sm" className="h-7 text-xs" onClick={() => matchMutation.mutate({
                          entityType: "bill",
                          entityId: bill.id,
                          matchedType: "expense",
                          matchedId: expMatch.id,
                          amount: bill.total_amount,
                          matchedAmount: expMatch.amount,
                        })}>
                          <Link2 className="w-3 h-3 mr-1" /> Link
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600">Manual match needed</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Matched With</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs text-right">Matched Amt</TableHead>
                  <TableHead className="text-xs text-right">Discrepancy</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {(reconRecords || []).length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">No reconciliation records yet</TableCell></TableRow>
                  ) : (reconRecords || []).map((r: any) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs capitalize">{r.entity_type}</TableCell>
                      <TableCell className="text-xs capitalize">{r.matched_entity_type || "-"}</TableCell>
                      <TableCell className="text-xs text-right font-mono">₦{(r.amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-mono">₦{(r.matched_amount || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-xs text-right font-mono">{r.discrepancy > 0 ? `₦${r.discrepancy.toLocaleString()}` : "-"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${r.match_status === "matched" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>{r.match_status}</Badge></TableCell>
                      <TableCell className="text-xs">{format(new Date(r.created_at), "MMM dd, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
