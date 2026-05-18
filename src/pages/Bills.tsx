import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus, Search, FileText, Clock, CheckCircle, AlertTriangle,
  RefreshCw, Trash2, X,
} from "lucide-react";
import { format, isPast, startOfMonth, endOfMonth } from "date-fns";

const CATEGORIES = [
  "fuel", "maintenance", "rent", "insurance", "tolls", "salaries",
  "utilities", "logistics", "parts", "office", "other",
];

const PAYMENT_TERMS = [
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "net_7", label: "Net 7" },
  { value: "net_15", label: "Net 15" },
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "net_90", label: "Net 90" },
];

const VAT_OPTIONS = [
  { value: "no_vat", label: "No VAT" },
  { value: "vat_7_5", label: "VAT 7.5%" },
  { value: "vat_5", label: "VAT 5%" },
];

const TONNAGE_OPTIONS = ["1T", "3T", "5T", "10T", "15T", "20T", "30T", "40T"];

const ACCOUNTS = [
  "Cost of Sales", "Fuel & Oil", "Maintenance", "Rent & Lease",
  "Insurance", "Tolls & Permits", "Driver Pay", "Office Expenses",
  "Utilities", "Other Expenses",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

interface LineItem {
  id: string;
  item_details: string;
  account: string;
  tonnage: string;
  quantity: number;
  rate: number;
  vat_type: string;
  customer_id: string;
  amount: number;
}

const emptyLine = (): LineItem => ({
  id: crypto.randomUUID(),
  item_details: "",
  account: "",
  tonnage: "",
  quantity: 1,
  rate: 0,
  vat_type: "no_vat",
  customer_id: "",
  amount: 0,
});

const calcLineAmount = (line: LineItem) => {
  const base = line.quantity * line.rate;
  const vatRate = line.vat_type === "vat_7_5" ? 0.075 : line.vat_type === "vat_5" ? 0.05 : 0;
  return base + base * vatRate;
};

export default function BillsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  // Date range filter
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState(now.getMonth());
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterEndMonth, setFilterEndMonth] = useState(now.getMonth());
  const [filterEndYear, setFilterEndYear] = useState(now.getFullYear());

  // New bill form
  const [form, setForm] = useState({
    vendor_name: "",
    bill_number: "",
    order_number: "",
    bill_date: format(now, "yyyy-MM-dd"),
    due_date: format(now, "yyyy-MM-dd"),
    payment_terms: "due_on_receipt",
    notes: "",
    discount_percent: 0,
    adjustment: 0,
  });
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, company_name").order("company_name").limit(200);
      return data || [];
    },
  });

  // Vendors (unique from bills + accounts_payable)
  const { data: vendors } = useQuery({
    queryKey: ["vendor-names"],
    queryFn: async () => {
      const { data } = await supabase.from("accounts_payable").select("vendor_name").limit(500);
      const unique = [...new Set((data || []).map(v => v.vendor_name))].sort();
      return unique;
    },
  });

  // Bills query
  const rangeStart = startOfMonth(new Date(filterYear, filterMonth)).toISOString();
  const rangeEnd = endOfMonth(new Date(filterEndYear, filterEndMonth)).toISOString();

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bills", filterStatus, rangeStart, rangeEnd],
    queryFn: async () => {
      let q = supabase
        .from("bills")
        .select("*")
        .gte("bill_date", rangeStart.slice(0, 10))
        .lte("bill_date", rangeEnd.slice(0, 10))
        .order("created_at", { ascending: false });
      if (filterStatus !== "all") q = q.eq("payment_status", filterStatus);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Line item calculations
  const subtotal = useMemo(() => lines.reduce((s, l) => s + calcLineAmount(l), 0), [lines]);
  const discountAmount = subtotal * (form.discount_percent / 100);
  const grandTotal = subtotal - discountAmount + form.adjustment;
  const taxTotal = useMemo(() => {
    return lines.reduce((s, l) => {
      const base = l.quantity * l.rate;
      const vatRate = l.vat_type === "vat_7_5" ? 0.075 : l.vat_type === "vat_5" ? 0.05 : 0;
      return s + base * vatRate;
    }, 0);
  }, [lines]);

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      updated.amount = calcLineAmount(updated);
      return updated;
    }));
  };

  const createBill = useMutation({
    mutationFn: async () => {
      const { data: bill, error } = await supabase.from("bills").insert({
        vendor_name: form.vendor_name,
        bill_number: form.bill_number || undefined,
        order_number: form.order_number || null,
        bill_date: form.bill_date,
        due_date: form.due_date || null,
        payment_terms: form.payment_terms,
        amount: subtotal - taxTotal,
        tax_amount: taxTotal,
        subtotal,
        discount_percent: form.discount_percent,
        adjustment: form.adjustment,
        total_amount: grandTotal,
        category: "other",
        notes: form.notes || null,
        created_by: user?.id,
      } as any).select("id").single();
      if (error) throw error;

      // Insert line items
      if (bill && lines.some(l => l.item_details || l.rate > 0)) {
        const items = lines.filter(l => l.item_details || l.rate > 0).map(l => ({
          bill_id: bill.id,
          item_details: l.item_details,
          account: l.account || null,
          tonnage: l.tonnage || null,
          quantity: l.quantity,
          rate: l.rate,
          vat_type: l.vat_type,
          customer_id: l.customer_id || null,
          amount: calcLineAmount(l),
        }));
        const { error: itemErr } = await supabase.from("bill_items").insert(items as any);
        if (itemErr) console.error("Line items error:", itemErr);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setCreateOpen(false);
      setForm({ vendor_name: "", bill_number: "", order_number: "", bill_date: format(new Date(), "yyyy-MM-dd"), due_date: format(new Date(), "yyyy-MM-dd"), payment_terms: "due_on_receipt", notes: "", discount_percent: 0, adjustment: 0 });
      setLines([emptyLine()]);
      toast({ title: "Bill created", description: "Bill has been recorded successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const markPaid = useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.from("bills").update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        paid_by: user?.id,
      } as any).eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Bill marked as paid" });
    },
  });

  const filtered = (bills || []).filter((b: any) =>
    b.vendor_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.bill_number?.toLowerCase().includes(search.toLowerCase())
  );

  const outstanding = filtered.filter((b: any) => b.payment_status === "pending" || (b.payment_status !== "paid" && b.payment_status !== "cancelled"))
    .reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const paidPeriod = filtered.filter((b: any) => b.payment_status === "paid")
    .reduce((s: number, b: any) => s + (b.total_amount || 0), 0);
  const overdueCount = filtered.filter((b: any) => b.payment_status === "pending" && b.due_date && isPast(new Date(b.due_date))).length;

  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];

  return (
    <DashboardLayout title="Bills" subtitle="Manage vendor bills and supplier invoices">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">₦{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Paid (Period)</p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">₦{paidPeriod.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Overdue</p>
          <p className="text-2xl font-bold text-foreground mt-1">{overdueCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-5 pb-4">
          <p className="text-xs text-muted-foreground">Total Bills</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filtered.length}</p>
        </CardContent></Card>
      </div>

      {/* Toolbar */}
      <Card className="mb-4">
        <CardContent className="py-3 flex items-center gap-3 flex-wrap">
          {/* Date range */}
          <div className="flex items-center gap-1 text-xs">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground">→</span>
            <Select value={String(filterEndMonth)} onValueChange={v => setFilterEndMonth(Number(v))}>
              <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)} className="text-xs">{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(filterEndYear)} onValueChange={v => setFilterEndYear(Number(v))}>
              <SelectTrigger className="w-[80px] h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setFilterMonth(now.getMonth()); setFilterYear(now.getFullYear()); setFilterEndMonth(now.getMonth()); setFilterEndYear(now.getFullYear()); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
            <Input placeholder="Search vendor or bill #..." className="pl-8 h-8 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="pending" className="text-xs">Pending</SelectItem>
              <SelectItem value="paid" className="text-xs">Paid</SelectItem>
              <SelectItem value="overdue" className="text-xs">Overdue</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <RefreshCw className="w-3 h-3" /> Pull from Zoho
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="w-3 h-3" /> New Bill
          </Button>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs text-primary">Vendor</TableHead>
                  <TableHead className="text-xs text-primary">Bill #</TableHead>
                  <TableHead className="text-xs text-primary">Bill Date</TableHead>
                  <TableHead className="text-xs text-primary">Due Date</TableHead>
                  <TableHead className="text-xs text-primary text-right">Amount</TableHead>
                  <TableHead className="text-xs text-primary text-right">Paid</TableHead>
                  <TableHead className="text-xs text-primary text-right">Balance</TableHead>
                  <TableHead className="text-xs text-primary">Status</TableHead>
                  <TableHead className="text-xs text-primary">Zoho</TableHead>
                  <TableHead className="text-xs text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-sm">No bills found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((bill: any) => {
                    const isOverdue = bill.payment_status === "pending" && bill.due_date && isPast(new Date(bill.due_date));
                    const displayStatus = isOverdue ? "overdue" : bill.payment_status;
                    const paidAmt = bill.payment_status === "paid" ? bill.total_amount : 0;
                    const balance = (bill.total_amount || 0) - paidAmt;
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="text-xs font-medium">{bill.vendor_name}</TableCell>
                        <TableCell className="text-xs font-mono">{bill.bill_number}</TableCell>
                        <TableCell className="text-xs">{bill.bill_date ? format(new Date(bill.bill_date), "MM/dd/yyyy") : "-"}</TableCell>
                        <TableCell className="text-xs">{bill.due_date ? format(new Date(bill.due_date), "MM/dd/yyyy") : "-"}</TableCell>
                        <TableCell className="text-xs text-right font-mono">₦{(bill.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-500">₦{paidAmt.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{balance > 0 ? `₦${balance.toLocaleString()}` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[displayStatus] || ""}`}>{displayStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">-</TableCell>
                        <TableCell>
                          {bill.payment_status === "pending" && (
                            <Button size="sm" variant="outline" className="h-6 text-[10px]" onClick={() => markPaid.mutate(bill.id)}>
                              Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ─── Create Bill Dialog (Full Form) ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Bill</DialogTitle></DialogHeader>

          {/* Vendor */}
          <div>
            <Label className="text-xs font-semibold">Vendor Name *</Label>
            <Select value={form.vendor_name} onValueChange={v => setForm(f => ({ ...f, vendor_name: v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select a Vendor" /></SelectTrigger>
              <SelectContent>
                {(vendors || []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                <SelectItem value="__new">+ Add new vendor</SelectItem>
              </SelectContent>
            </Select>
            {form.vendor_name === "__new" && (
              <Input className="mt-2 text-xs" placeholder="Enter vendor name" onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            )}
          </div>

          {/* Bill # and Order # */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold">Bill # *</Label>
              <Input className="mt-1 text-xs" placeholder="e.g. BILL-2026-001" value={form.bill_number} onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Order Number</Label>
              <Input className="mt-1 text-xs" placeholder="Purchase order reference" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
          </div>

          {/* Dates + Payment Terms */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-semibold">Bill Date *</Label>
              <Input type="date" className="mt-1 text-xs" value={form.bill_date} onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Due Date</Label>
              <Input type="date" className="mt-1 text-xs" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs font-semibold">Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                <SelectTrigger className="mt-1 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* Item Table */}
          <div>
            <Label className="text-xs font-semibold mb-2 block">Item Table</Label>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs text-primary min-w-[160px]">Item Details</TableHead>
                    <TableHead className="text-xs text-primary min-w-[120px]">Account</TableHead>
                    <TableHead className="text-xs text-primary min-w-[90px]">Tonnage</TableHead>
                    <TableHead className="text-xs text-primary w-16">Qty</TableHead>
                    <TableHead className="text-xs text-primary w-24">Rate (₦)</TableHead>
                    <TableHead className="text-xs text-primary min-w-[90px]">VAT</TableHead>
                    <TableHead className="text-xs text-primary min-w-[120px]">Customer</TableHead>
                    <TableHead className="text-xs text-primary text-right w-24">Amount</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map(line => (
                    <TableRow key={line.id}>
                      <TableCell className="p-1">
                        <Input className="h-8 text-xs border-0 bg-transparent" placeholder="Type or describe item" value={line.item_details} onChange={e => updateLine(line.id, "item_details", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select value={line.account} onValueChange={v => updateLine(line.id, "account", v)}>
                          <SelectTrigger className="h-8 text-xs border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{ACCOUNTS.map(a => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Select value={line.tonnage} onValueChange={v => updateLine(line.id, "tonnage", v)}>
                          <SelectTrigger className="h-8 text-xs border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{TONNAGE_OPTIONS.map(t => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" className="h-8 text-xs border-0 bg-transparent w-14" value={line.quantity} onChange={e => updateLine(line.id, "quantity", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Input type="number" className="h-8 text-xs border-0 bg-transparent w-20" value={line.rate} onChange={e => updateLine(line.id, "rate", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1">
                        <Select value={line.vat_type} onValueChange={v => updateLine(line.id, "vat_type", v)}>
                          <SelectTrigger className="h-8 text-xs border-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{VAT_OPTIONS.map(v => <SelectItem key={v.value} value={v.value} className="text-xs">{v.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1">
                        <Select value={line.customer_id} onValueChange={v => updateLine(line.id, "customer_id", v)}>
                          <SelectTrigger className="h-8 text-xs border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{(customers || []).map((c: any) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.company_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1 text-right text-xs font-mono">₦{calcLineAmount(line).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="p-1">
                        {lines.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-primary" onClick={() => setLines(prev => [...prev, emptyLine()])}>
              <Plus className="w-3 h-3 mr-1" /> Add New Row
            </Button>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-[320px] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-mono font-semibold">₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discount</span>
                <div className="flex items-center gap-1">
                  <Input type="number" className="h-7 w-16 text-xs text-right" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} />
                  <span className="text-muted-foreground">%</span>
                  <span className="font-mono w-24 text-right">₦{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs">Adjustment</Button>
                <div className="flex items-center gap-1">
                  <Input type="number" className="h-7 w-20 text-xs text-right" value={form.adjustment} onChange={e => setForm(f => ({ ...f, adjustment: Number(e.target.value) }))} />
                  <span className="font-mono w-24 text-right">₦{form.adjustment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex justify-between pt-2 border-t border-border font-semibold">
                <span>Total</span>
                <span className="font-mono text-base">₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold">Notes</Label>
            <Textarea className="mt-1 text-xs h-16" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={() => createBill.mutate()} disabled={!form.vendor_name || form.vendor_name === "__new"}>
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
