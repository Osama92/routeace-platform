import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DollarSign, TrendingUp, TrendingDown, BookOpen, Plus, Search, RefreshCw, CreditCard,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(amount);

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    unpaid: "bg-warning/15 text-warning",
    partial: "bg-info/15 text-info",
    paid: "bg-success/15 text-success",
    overdue: "bg-destructive/15 text-destructive",
    cancelled: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[status] || map.unpaid}>{status.toUpperCase()}</Badge>;
};

const AccountsLedger = () => {
  const [arEntries, setArEntries] = useState<any[]>([]);
  const [apEntries, setApEntries] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedAr, setSelectedAr] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [processing, setProcessing] = useState(false);
  const { user, organizationId } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    const [arRes, apRes, ledgerRes] = await Promise.all([
      supabase.from("accounts_receivable")
        .select("*, invoices(invoice_number, customers(company_name))")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase.from("accounts_payable")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase.from("accounting_ledger")
        .select("*")
        .eq("organization_id", organizationId)
        .order("entry_date", { ascending: false }).limit(100),
    ]);
    setArEntries(arRes.data || []);
    setApEntries(apRes.data || []);
    setLedgerEntries(ledgerRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (organizationId) fetchData(); }, [organizationId]);

  const arTotals = {
    total: arEntries.reduce((s, e) => s + e.amount_due, 0),
    paid: arEntries.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount_paid, 0),
    outstanding: arEntries.filter((e) => e.status !== "paid" && e.status !== "cancelled").reduce((s, e) => s + e.balance, 0),
  };

  const apTotals = {
    total: apEntries.reduce((s, e) => s + e.amount_due, 0),
    paid: apEntries.filter((e) => e.status === "paid").reduce((s, e) => s + e.amount_paid, 0),
    outstanding: apEntries.filter((e) => e.status !== "paid" && e.status !== "cancelled").reduce((s, e) => s + e.balance, 0),
  };

  const handleRecordPayment = async () => {
    if (!selectedAr || !paymentAmount) return;
    setProcessing(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0 || amount > selectedAr.balance) {
        toast({ title: "Invalid Amount", description: "Amount must be > 0 and ≤ balance due", variant: "destructive" });
        setProcessing(false);
        return;
      }

      // Insert payment record
      await supabase.from("ar_payments").insert({
        ar_id: selectedAr.id,
        invoice_id: selectedAr.invoice_id,
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentRef || null,
        recorded_by: user?.id,
      });

      const newPaid = selectedAr.amount_paid + amount;
      const newBalance = selectedAr.amount_due - newPaid;
      const newStatus = newBalance <= 0 ? "paid" : "partial";

      // Update AR
      await supabase.from("accounts_receivable").update({
        amount_paid: newPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
      }).eq("id", selectedAr.id);

      // Update invoice
      if (selectedAr.invoice_id) {
        const invStatus = newBalance <= 0 ? "paid" : "partially_paid";
        const updateData: Record<string, unknown> = {
          amount_paid: newPaid,
          balance_due: Math.max(0, newBalance),
          status: invStatus,
          status_updated_at: new Date().toISOString(),
        };
        if (invStatus === "paid") updateData.paid_date = new Date().toISOString();
        await supabase.from("invoices").update(updateData).eq("id", selectedAr.invoice_id);
      }

      // Double-entry: Dr Cash, Cr AR
      const entryDate = new Date().toISOString().split("T")[0];
      await supabase.from("accounting_ledger").insert([
        { entry_date: entryDate, reference_type: "payment", reference_id: selectedAr.invoice_id, account_name: "cash", account_type: "asset", debit: amount, description: `Payment received - ${paymentRef || "cash"}`, posted_by: user?.id },
        { entry_date: entryDate, reference_type: "payment", reference_id: selectedAr.invoice_id, account_name: "accounts_receivable", account_type: "asset", credit: amount, description: `Payment received - ${paymentRef || "cash"}`, posted_by: user?.id },
      ]);

      toast({ title: "Payment Recorded", description: `${formatCurrency(amount)} recorded against ${selectedAr.invoices?.invoice_number || "invoice"}` });
      setPaymentDialog(false);
      setPaymentAmount("");
      setPaymentRef("");
      fetchData();
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to record payment", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout title="Accounts & Ledger" subtitle="AR/AP tracking with double-entry accounting">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Receivable", value: formatCurrency(arTotals.total), icon: TrendingUp, color: "bg-primary/20 text-primary" },
          { label: "AR Collected", value: formatCurrency(arTotals.paid), icon: DollarSign, color: "bg-success/20 text-success" },
          { label: "AR Outstanding", value: formatCurrency(arTotals.outstanding), icon: TrendingDown, color: "bg-warning/20 text-warning" },
          { label: "AP Outstanding", value: formatCurrency(apTotals.outstanding), icon: BookOpen, color: "bg-destructive/20 text-destructive" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="ar" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
            <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
            <TabsTrigger value="ledger">General Ledger</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 bg-secondary/50 w-64" />
            </div>
            <Button variant="outline" onClick={fetchData}><RefreshCw className="w-4 h-4 mr-2" />Refresh</Button>
          </div>
        </div>

        {/* AR Tab */}
        <TabsContent value="ar">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-sm font-heading">Accounts Receivable</CardTitle></CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Invoice</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Posted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arEntries.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No AR entries. Post an invoice to create one.</TableCell></TableRow>
                    ) : arEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-border/50">
                        <TableCell className="font-medium">{entry.invoices?.invoice_number || "-"}</TableCell>
                        <TableCell>{entry.invoices?.customers?.company_name || "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(entry.amount_due)}</TableCell>
                        <TableCell className="text-right text-success">{formatCurrency(entry.amount_paid)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(entry.balance)}</TableCell>
                        <TableCell>{statusBadge(entry.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{format(new Date(entry.posting_date), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-right">
                          {entry.status !== "paid" && entry.status !== "cancelled" && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedAr(entry); setPaymentDialog(true); }}>
                              <CreditCard className="w-3 h-3 mr-1" />Record Payment
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AP Tab */}
        <TabsContent value="ap">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-sm font-heading">Accounts Payable</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Vendor</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No AP entries yet</TableCell></TableRow>
                  ) : apEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border/50">
                      <TableCell className="font-medium">{entry.vendor_name}</TableCell>
                      <TableCell>{entry.reference_number || "-"}</TableCell>
                      <TableCell>{entry.category || "-"}</TableCell>
                      <TableCell className="text-right">{formatCurrency(entry.amount_due)}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(entry.amount_paid)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(entry.balance)}</TableCell>
                      <TableCell>{statusBadge(entry.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{entry.due_date ? format(new Date(entry.due_date), "dd MMM yyyy") : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger Tab */}
        <TabsContent value="ledger">
          <Card className="glass-card border-border/50">
            <CardHeader><CardTitle className="text-sm font-heading">General Ledger (Double-Entry)</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No ledger entries. Post an invoice to generate entries.</TableCell></TableRow>
                  ) : ledgerEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-border/50">
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(entry.entry_date), "dd MMM yyyy")}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{entry.reference_type}</Badge></TableCell>
                      <TableCell className="font-medium text-xs">{entry.account_name.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{entry.description}</TableCell>
                      <TableCell className="text-right text-xs">{entry.debit > 0 ? formatCurrency(entry.debit) : "-"}</TableCell>
                      <TableCell className="text-right text-xs">{entry.credit > 0 ? formatCurrency(entry.credit) : "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record payment for {selectedAr?.invoices?.invoice_number || "invoice"} - Balance: {selectedAr ? formatCurrency(selectedAr.balance) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Payment Amount *</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Transaction reference" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialog(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={processing}>
              {processing ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AccountsLedger;
