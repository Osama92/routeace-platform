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
  DollarSign, TrendingUp, TrendingDown, BookOpen, Search, RefreshCw, CreditCard, FileText, Receipt,
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
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [processing, setProcessing] = useState(false);
  const { organizationId } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!organizationId) { setLoading(false); return; }
    setLoading(true);
    const [invRes, billsRes] = await Promise.all([
      supabase.from("invoices")
        .select("*, customers(company_name)")
        .eq("organization_id", organizationId)
        .neq("status", "draft")
        .order("created_at", { ascending: false }),
      supabase.from("bills")
        .select("*")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
    ]);
    setInvoices(invRes.data || []);
    setBills(billsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { if (organizationId) fetchData(); }, [organizationId]);

  // AR = Invoices — money owed TO us by customers
  const arTotals = {
    total: invoices.reduce((s, i) => s + (i.total_amount || 0), 0),
    collected: invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total_amount || 0), 0),
    outstanding: invoices.filter(i => !["paid", "cancelled"].includes(i.status)).reduce((s, i) => s + (i.total_amount || 0), 0),
  };

  // AP = Bills — money we owe TO vendors
  const apTotals = {
    total: bills.reduce((s, b) => s + (b.total_amount || b.amount || 0), 0),
    paid: bills.filter(b => b.payment_status === "paid").reduce((s, b) => s + (b.total_amount || b.amount || 0), 0),
    outstanding: bills.filter(b => b.payment_status !== "paid").reduce((s, b) => s + (b.total_amount || b.amount || 0), 0),
  };

  // General Ledger — control account summaries derived from subledgers
  // AR Control Account: Debit when invoice raised (revenue earned), Credit when payment collected
  const arControlDebit = arTotals.total;          // total invoiced (increases AR balance)
  const arControlCredit = arTotals.collected;     // total collected (decreases AR balance)
  const arControlBalance = arControlDebit - arControlCredit; // what customers still owe

  // AP Control Account: Credit when bill received (liability incurred), Debit when payment made
  const apControlCredit = apTotals.total;         // total billed (increases AP liability)
  const apControlDebit = apTotals.paid;           // total paid (decreases AP liability)
  const apControlBalance = apControlCredit - apControlDebit; // what we still owe vendors

  const glAccounts = [
    {
      account: "Accounts Receivable",
      type: "Asset (Control Account)",
      description: "Subledger: Customer Invoices",
      openingBalance: 0,
      totalDebits: arControlDebit,
      totalCredits: arControlCredit,
      endingBalance: arControlBalance,
      debitLabel: "Invoices Raised",
      creditLabel: "Payments Collected",
      normal: "debit",
    },
    {
      account: "Accounts Payable",
      type: "Liability (Control Account)",
      description: "Subledger: Vendor Bills",
      openingBalance: 0,
      totalDebits: apControlDebit,
      totalCredits: apControlCredit,
      endingBalance: apControlBalance,
      debitLabel: "Payments Made",
      creditLabel: "Bills Received",
      normal: "credit",
    },
  ];

  const arFiltered = invoices.filter(i =>
    !searchQuery ||
    i.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.customers?.company_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const apFiltered = bills.filter(b =>
    !searchQuery ||
    b.bill_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecordPayment = async () => {
    if (!selectedInvoice || !paymentAmount) return;
    setProcessing(true);
    try {
      const amount = parseFloat(paymentAmount);
      if (amount <= 0) {
        toast({ title: "Invalid Amount", description: "Amount must be greater than 0", variant: "destructive" });
        setProcessing(false);
        return;
      }
      const updateData: Record<string, unknown> = {
        status: "paid",
        paid_date: new Date().toISOString(),
        status_updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("invoices").update(updateData).eq("id", selectedInvoice.id);
      if (error) throw error;

      toast({ title: "Payment Recorded", description: `${formatCurrency(amount)} recorded for ${selectedInvoice.invoice_number}` });
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

  const invoiceStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      paid: "bg-success/15 text-success",
      pending: "bg-warning/15 text-warning",
      overdue: "bg-destructive/15 text-destructive",
      partially_paid: "bg-info/15 text-info",
      cancelled: "bg-muted text-muted-foreground",
    };
    return <Badge className={map[status] || map.pending}>{status.replace(/_/g, " ").toUpperCase()}</Badge>;
  };

  return (
    <DashboardLayout title="Accounts & Ledger" subtitle="AR/AP tracking with double-entry accounting">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Receivable", value: formatCurrency(arTotals.total), icon: TrendingUp, color: "bg-primary/20 text-primary" },
          { label: "AR Collected", value: formatCurrency(arTotals.collected), icon: DollarSign, color: "bg-success/20 text-success" },
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
            <TabsTrigger value="ar">
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              Accounts Receivable
            </TabsTrigger>
            <TabsTrigger value="ap">
              <Receipt className="w-3.5 h-3.5 mr-1.5" />
              Accounts Payable
            </TabsTrigger>
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

        {/* AR Tab — Invoices (money owed TO us) */}
        <TabsContent value="ar">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Accounts Receivable — Invoices
                <span className="text-xs font-normal text-muted-foreground ml-1">Money owed to you by customers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap">Invoice Date</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {arFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
                    ) : arFiltered.map((inv) => (
                      <TableRow key={inv.id} className="border-border/50">
                        <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                        <TableCell>{inv.customers?.company_name || "-"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums font-semibold">{formatCurrency(inv.total_amount || 0)}</TableCell>
                        <TableCell>{invoiceStatusLabel(inv.status)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{format(new Date(inv.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-right">
                          {!["paid", "cancelled"].includes(inv.status) && (
                            <Button size="sm" variant="outline" onClick={() => { setSelectedInvoice(inv); setPaymentDialog(true); }}>
                              <CreditCard className="w-3 h-3 mr-1" />Mark Paid
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

        {/* AP Tab — Bills (money we owe) */}
        <TabsContent value="ap">
          <Card className="glass-card border-border/50">
            <CardHeader>
              <CardTitle className="text-sm font-heading flex items-center gap-2">
                <Receipt className="w-4 h-4 text-warning" />
                Accounts Payable — Bills
                <span className="text-xs font-normal text-muted-foreground ml-1">Money you owe to vendors/suppliers</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead>Bill #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Total Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="whitespace-nowrap">Bill Date</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apFiltered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No bills found</TableCell></TableRow>
                    ) : apFiltered.map((bill) => (
                      <TableRow key={bill.id} className="border-border/50">
                        <TableCell className="font-medium">{bill.bill_number || "-"}</TableCell>
                        <TableCell>{bill.vendor_name || "-"}</TableCell>
                        <TableCell className="text-right whitespace-nowrap tabular-nums font-semibold">{formatCurrency(bill.total_amount || bill.amount || 0)}</TableCell>
                        <TableCell>{statusBadge(bill.payment_status || "unpaid")}</TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{bill.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{bill.due_date ? format(new Date(bill.due_date), "dd MMM yyyy") : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Ledger Tab */}
        <TabsContent value="ledger">
          <div className="space-y-6">
            <p className="text-xs text-muted-foreground">
              Control account summaries derived from subledgers. Debits and credits are calculated from live invoice and bill data.
            </p>

            {glAccounts.map((acct) => (
              <Card key={acct.account} className="glass-card border-border/50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base font-heading">{acct.account}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{acct.type} — {acct.description}</p>
                    </div>
                    <Badge variant="outline" className={acct.normal === "debit" ? "text-primary border-primary/40" : "text-warning border-warning/40"}>
                      {acct.normal === "debit" ? "Normal Debit Balance" : "Normal Credit Balance"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* T-Account style summary table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="w-[40%]">Line Item</TableHead>
                        <TableHead className="text-right w-[20%]">Debit (Dr)</TableHead>
                        <TableHead className="text-right w-[20%]">Credit (Cr)</TableHead>
                        <TableHead className="text-right w-[20%]">Running Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Opening balance row */}
                      <TableRow className="border-border/50 text-muted-foreground text-sm">
                        <TableCell className="italic">Opening Balance</TableCell>
                        <TableCell className="text-right tabular-nums">—</TableCell>
                        <TableCell className="text-right tabular-nums">—</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{formatCurrency(0)}</TableCell>
                      </TableRow>

                      {/* Debit activity */}
                      <TableRow className="border-border/50 text-sm">
                        <TableCell className="text-muted-foreground">{acct.debitLabel}</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground font-semibold">{formatCurrency(acct.totalDebits)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {acct.normal === "debit"
                            ? formatCurrency(acct.totalDebits)
                            : formatCurrency(acct.totalCredits - acct.totalDebits)}
                        </TableCell>
                      </TableRow>

                      {/* Credit activity */}
                      <TableRow className="border-border/50 text-sm">
                        <TableCell className="text-muted-foreground">{acct.creditLabel}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">—</TableCell>
                        <TableCell className="text-right tabular-nums text-foreground font-semibold">{formatCurrency(acct.totalCredits)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {acct.normal === "debit"
                            ? formatCurrency(acct.totalDebits - acct.totalCredits)
                            : formatCurrency(acct.totalCredits - acct.totalDebits)}
                        </TableCell>
                      </TableRow>

                      {/* Totals row */}
                      <TableRow className="border-t-2 border-border bg-secondary/20 font-semibold text-sm">
                        <TableCell>Totals</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(acct.totalDebits)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(acct.totalCredits)}</TableCell>
                        <TableCell className="text-right tabular-nums" />
                      </TableRow>

                      {/* Ending balance row */}
                      <TableRow className="border-border/50 bg-primary/5">
                        <TableCell className="font-bold text-sm">Ending Balance</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                          {acct.normal === "debit" ? formatCurrency(acct.endingBalance) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground text-xs">
                          {acct.normal === "credit" ? formatCurrency(acct.endingBalance) : "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <span className={`text-base font-bold ${acct.endingBalance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                            {formatCurrency(acct.endingBalance)}
                          </span>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>

                  {/* Plain-language interpretation */}
                  <div className="mt-4 p-3 rounded-lg bg-secondary/30 text-xs text-muted-foreground">
                    {acct.account === "Accounts Receivable" ? (
                      <>
                        <span className="font-semibold text-foreground">Interpretation: </span>
                        You have raised {formatCurrency(acct.totalDebits)} in invoices.
                        Customers have paid {formatCurrency(acct.totalCredits)}.
                        The ending balance of <span className="font-semibold text-primary">{formatCurrency(acct.endingBalance)}</span> is
                        the total still owed to you by customers.
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-foreground">Interpretation: </span>
                        You have received bills totalling {formatCurrency(acct.totalCredits)} from vendors.
                        You have paid {formatCurrency(acct.totalDebits)} of that.
                        The ending balance of <span className="font-semibold text-warning">{formatCurrency(acct.endingBalance)}</span> is
                        the total you still owe to vendors.
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Record Payment Received</DialogTitle>
            <DialogDescription>
              Mark {selectedInvoice?.invoice_number} as paid — {selectedInvoice ? formatCurrency(selectedInvoice.total_amount) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Amount Received *</Label>
              <Input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={selectedInvoice ? String(selectedInvoice.total_amount) : "0.00"} />
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
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Transaction reference (optional)" />
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
