import { useState, useMemo } from "react";
import { useActiveErp } from "@/hooks/useActiveErp";
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
  RefreshCw, Trash2, X, MoreVertical, Pencil, XCircle, Eye,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const TONNAGE_OPTIONS = ["1T", "3T", "5T", "10T", "15T", "20T", "30T", "40T"];

const ACCOUNTS = [
  "Cost of Sales", "Fuel & Oil", "Maintenance", "Rent & Lease",
  "Insurance", "Tolls & Permits", "Driver Pay", "Office Expenses",
  "Utilities", "Other Expenses",
];

const LINE_VAT_OPTIONS = [
  { label: "No VAT", rate: 0 },
  { label: "5%",     rate: 5 },
  { label: "7.5%",   rate: 7.5 },
  { label: "20%",    rate: 20 },
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
  vat_rate: number;
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
  vat_rate: 0,
  customer_id: "",
  amount: 0,
});

// vatInclusive=true  → rate already contains VAT; extract VAT from price
// vatInclusive=false → rate is pre-tax; add VAT on top
const calcLineBase = (line: LineItem, vatInclusive = false) => {
  const gross = line.quantity * line.rate;
  if (vatInclusive && line.vat_rate > 0) return gross / (1 + line.vat_rate / 100);
  return gross;
};
const calcLineTax = (line: LineItem, vatInclusive = false) => {
  const gross = line.quantity * line.rate;
  if (line.vat_rate === 0) return 0;
  if (vatInclusive) return gross - gross / (1 + line.vat_rate / 100);
  return gross * (line.vat_rate / 100);
};
const calcLineAmount = (line: LineItem, vatInclusive = false) =>
  vatInclusive ? line.quantity * line.rate : calcLineBase(line) + calcLineTax(line);

export default function BillsPage() {
  const { toast } = useToast();
  const { user, organizationId, hasAnyRole } = useAuth();
  const canEditBills = hasAnyRole(["super_admin", "admin", "org_admin", "finance_manager"]);
  const qc = useQueryClient();
  const activeErp = useActiveErp();
  const [createOpen, setCreateOpen] = useState(false);
  const [editBill, setEditBill] = useState<any | null>(null);
  const [editLines, setEditLines] = useState<LineItem[]>([emptyLine()]);
  const [editVatInclusive, setEditVatInclusive] = useState(false);
  const [editForm, setEditForm] = useState({
    vendor_name: "", bill_number: "", order_number: "",
    bill_date: "", due_date: "", payment_terms: "due_on_receipt",
    notes: "", discount_percent: 0, adjustment: 0,
  });
  const [loadingEditLines, setLoadingEditLines] = useState(false);
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
  const [vatInclusive, setVatInclusive] = useState(false);
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  // Customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, company_name").order("company_name").limit(200);
      return data || [];
    },
  });

  // Vendors: merge 3PL transport roster (ld_transporters) + vendor_partners
  // ld_transporters covers Logistics Department tenants (3PL roster)
  // vendor_partners covers Logistics Company tenants
  const { data: vendors } = useQuery({
    queryKey: ["vendor-names", organizationId],
    queryFn: async () => {
      const names: string[] = [];
      if (!organizationId) return names;

      const [ldRes, vpRes] = await Promise.all([
        supabase
          .from("ld_transporters")
          .select("company_name")
          .eq("organization_id", organizationId)
          .eq("onboarding_status", "approved")
          .order("company_name")
          .limit(500),
        supabase
          .from("vendor_partners")
          .select("business_name")
          .eq("organization_id", organizationId)
          .order("business_name")
          .limit(500),
      ]);

      (ldRes.data || []).forEach(r => { if (r.company_name) names.push(r.company_name); });
      (vpRes.data || []).forEach(r => { if (r.business_name) names.push(r.business_name); });

      return [...new Set(names)].sort();
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

  // Line item calculations (per-line VAT, respecting inclusive/exclusive mode)
  const lineAmounts = useMemo(() => lines.map(l => calcLineAmount(l, vatInclusive)), [lines, vatInclusive]);
  const taxTotal = useMemo(() => lines.reduce((s, l) => s + calcLineTax(l, vatInclusive), 0), [lines, vatInclusive]);
  const subtotal = useMemo(() => lines.reduce((s, l) => s + calcLineBase(l, vatInclusive), 0), [lines, vatInclusive]);
  const discountAmount = subtotal * (form.discount_percent / 100);
  const grandTotal = lineAmounts.reduce((s, a) => s + a, 0) - discountAmount + form.adjustment;

  const updateLine = (id: string, field: keyof LineItem, value: any) => {
    setLines(prev => prev.map(l => {
      if (l.id !== id) return l;
      return { ...l, [field]: value };
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
        amount: subtotal,
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
        const items = lines.filter(l => l.item_details || l.rate > 0).map((l, idx) => ({
          bill_id: bill.id,
          item_details: l.item_details,
          account: l.account || null,
          tonnage: l.tonnage || null,
          quantity: l.quantity,
          rate: l.rate,
          vat_type: l.vat_rate === 0 ? "no_vat" : `vat_${l.vat_rate}`.replace(".", "_"),
          customer_id: l.customer_id || null,
          amount: lineAmounts[idx] ?? calcLineAmount(l),
        }));
        const { error: itemErr } = await supabase.from("bill_items").insert(items as any);
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setCreateOpen(false);
      setVatInclusive(false);
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

  const updateStatus = useMutation({
    mutationFn: async ({ billId, status }: { billId: string; status: string }) => {
      const { error } = await supabase.from("bills").update({ payment_status: status } as any).eq("id", billId);
      if (error) throw error;
    },
    onSuccess: (_d, { status }) => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: `Bill marked as ${status}` });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteBill = useMutation({
    mutationFn: async (billId: string) => {
      const { error } = await supabase.from("bills").delete().eq("id", billId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Bill deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const editLineAmounts = useMemo(() => editLines.map(l => calcLineAmount(l, editVatInclusive)), [editLines, editVatInclusive]);
  const editTaxTotal = useMemo(() => editLines.reduce((s, l) => s + calcLineTax(l, editVatInclusive), 0), [editLines, editVatInclusive]);
  const editSubtotal = useMemo(() => editLines.reduce((s, l) => s + calcLineBase(l, editVatInclusive), 0), [editLines, editVatInclusive]);
  const editDiscountAmount = editSubtotal * (editForm.discount_percent / 100);
  const editGrandTotal = editLineAmounts.reduce((s, a) => s + a, 0) - editDiscountAmount + editForm.adjustment;

  const updateEditLine = (id: string, field: keyof LineItem, value: any) => {
    setEditLines(prev => prev.map(l => l.id !== id ? l : { ...l, [field]: value }));
  };

  const openEditBill = async (bill: any) => {
    setEditBill(bill);
    setEditVatInclusive(false);
    setEditForm({
      vendor_name: bill.vendor_name || "",
      bill_number: bill.bill_number || "",
      order_number: bill.order_number || "",
      bill_date: bill.bill_date ? bill.bill_date.slice(0, 10) : format(new Date(), "yyyy-MM-dd"),
      due_date: bill.due_date ? bill.due_date.slice(0, 10) : "",
      payment_terms: bill.payment_terms || "due_on_receipt",
      notes: bill.notes || "",
      discount_percent: bill.discount_percent || 0,
      adjustment: bill.adjustment || 0,
    });
    setLoadingEditLines(true);
    try {
      const { data: items } = await supabase
        .from("bill_items")
        .select("*")
        .eq("bill_id", bill.id)
        .order("id");
      if (items && items.length > 0) {
        setEditLines(items.map((it: any) => {
          const qty = it.quantity || 1;
          // vat_rate is stored as numeric elsewhere but bill_items uses vat_type text.
          // Parse it back to a number so the VAT toggle works correctly.
          let vatRate = 0;
          if (it.vat_rate != null && it.vat_rate !== 0) {
            vatRate = Number(it.vat_rate);
          } else if (it.vat_type && it.vat_type !== "no_vat") {
            // e.g. "vat_7_5" → 7.5, "vat_5" → 5, "vat_20" → 20
            const match = it.vat_type.replace("vat_", "").replace("_", ".");
            vatRate = parseFloat(match) || 0;
          }
          // If rate is 0 but amount is stored, back-calculate rate from the line amount.
          // This handles bills created before line-item detail was mandatory.
          let rate = it.rate || 0;
          if (rate === 0 && it.amount && it.amount > 0) {
            // amount = qty * rate * (1 + vat/100), solve for rate
            const divisor = qty * (vatRate > 0 ? (1 + vatRate / 100) : 1);
            rate = it.amount / divisor;
          }
          return {
            id: crypto.randomUUID(),
            item_details: it.item_details || "",
            account: it.account || "",
            tonnage: it.tonnage || "",
            quantity: qty,
            rate,
            vat_rate: vatRate,
            customer_id: it.customer_id || "",
            amount: it.amount || 0,
          };
        }));
      } else {
        // No line items at all — synthesise a single line from the bill's stored totals
        // so the edit dialog shows the correct amount rather than ₦0.
        // Prefer subtotal (pre-tax) so VAT isn't double-counted if adjustment/discount exist.
        const fallbackRate = bill.subtotal || bill.amount || bill.total_amount || 0;
        setEditLines([{ ...emptyLine(), item_details: "Service", rate: fallbackRate, quantity: 1 }]);
      }
    } finally {
      setLoadingEditLines(false);
    }
  };

  const updateBill = useMutation({
    mutationFn: async () => {
      if (!editBill) return;
      const { error } = await supabase.from("bills").update({
        vendor_name: editForm.vendor_name,
        bill_number: editForm.bill_number || null,
        order_number: editForm.order_number || null,
        bill_date: editForm.bill_date,
        due_date: editForm.due_date || null,
        payment_terms: editForm.payment_terms,
        amount: editSubtotal,
        tax_amount: editTaxTotal,
        subtotal: editSubtotal,
        discount_percent: editForm.discount_percent,
        adjustment: editForm.adjustment,
        total_amount: editGrandTotal,
        notes: editForm.notes || null,
      } as any).eq("id", editBill.id);
      if (error) throw error;

      // Replace line items
      await supabase.from("bill_items").delete().eq("bill_id", editBill.id);
      const validLines = editLines.filter(l => l.item_details || l.rate > 0);
      if (validLines.length > 0) {
        const items = validLines.map((l, idx) => ({
          bill_id: editBill.id,
          item_details: l.item_details,
          account: l.account || null,
          tonnage: l.tonnage || null,
          quantity: l.quantity,
          rate: l.rate,
          vat_type: l.vat_rate === 0 ? "no_vat" : `vat_${l.vat_rate}`.replace(".", "_"),
          customer_id: l.customer_id || null,
          amount: editLineAmounts[idx] ?? calcLineAmount(l),
        }));
        const { error: itemErr } = await supabase.from("bill_items").insert(items as any);
        if (itemErr) throw itemErr;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bills"] });
      setEditBill(null);
      toast({ title: "Bill updated", description: "Changes saved successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
          <div className="flex items-center gap-2 text-sm">
            <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
            <Select value={String(filterMonth)} onValueChange={v => setFilterMonth(Number(v))}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(filterYear)} onValueChange={v => setFilterYear(Number(v))}>
              <SelectTrigger className="w-[88px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground">→</span>
            <Select value={String(filterEndMonth)} onValueChange={v => setFilterEndMonth(Number(v))}>
              <SelectTrigger className="w-[120px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{months.map((m, i) => <SelectItem key={i} value={String(i)}>{m}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={String(filterEndYear)} onValueChange={v => setFilterEndYear(Number(v))}>
              <SelectTrigger className="w-[88px] h-9"><SelectValue /></SelectTrigger>
              <SelectContent>{[2024,2025,2026,2027].map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setFilterMonth(now.getMonth()); setFilterYear(now.getFullYear()); setFilterEndMonth(now.getMonth()); setFilterEndYear(now.getFullYear()); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search vendor or bill #..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>

          {activeErp.connected && (
            <Button variant="outline" className="h-9 gap-2">
              <RefreshCw className="w-4 h-4" /> Pull from {activeErp.name}
            </Button>
          )}
          <Button className="h-9 gap-2" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New Bill
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
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Vendor</TableHead>
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Bill #</TableHead>
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Bill Date</TableHead>
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Due Date</TableHead>
                  <TableHead className="text-sm font-semibold text-primary text-right whitespace-nowrap min-w-[130px]">Amount</TableHead>
                  <TableHead className="text-sm font-semibold text-primary text-right whitespace-nowrap min-w-[120px]">Paid</TableHead>
                  <TableHead className="text-sm font-semibold text-primary text-right whitespace-nowrap min-w-[120px]">Balance</TableHead>
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Status</TableHead>
                  {activeErp.connected && <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">{activeErp.name}</TableHead>}
                  <TableHead className="text-sm font-semibold text-primary whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-base">No bills found</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((bill: any) => {
                    const isOverdue = bill.payment_status === "pending" && bill.due_date && isPast(new Date(bill.due_date));
                    const displayStatus = isOverdue ? "overdue" : bill.payment_status;
                    const paidAmt = bill.payment_status === "paid" ? bill.total_amount : 0;
                    const balance = (bill.total_amount || 0) - paidAmt;
                    return (
                      <TableRow key={bill.id}>
                        <TableCell className="text-sm font-medium whitespace-nowrap">{bill.vendor_name}</TableCell>
                        <TableCell className="text-sm font-mono whitespace-nowrap">{bill.bill_number}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{bill.bill_date ? format(new Date(bill.bill_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">{bill.due_date ? format(new Date(bill.due_date), "dd MMM yyyy") : "-"}</TableCell>
                        <TableCell className="text-sm text-right font-mono whitespace-nowrap tabular-nums">₦{(bill.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right font-mono whitespace-nowrap tabular-nums text-emerald-500">₦{paidAmt.toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-right font-mono whitespace-nowrap tabular-nums">{balance > 0 ? `₦${balance.toLocaleString()}` : "-"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 capitalize ${STATUS_COLORS[displayStatus] || ""}`}>{displayStatus}</Badge>
                        </TableCell>
                        {activeErp.connected && <TableCell className="text-sm text-muted-foreground">-</TableCell>}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            {canEditBills && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 gap-1.5 text-xs font-medium"
                                onClick={() => openEditBill(bill)}
                                title="Edit Bill"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Edit
                              </Button>
                            )}
                            {bill.payment_status !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 gap-1.5 text-xs font-medium text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                                onClick={() => markPaid.mutate(bill.id)}
                                title="Mark as Paid"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Pay
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="More options">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => markPaid.mutate(bill.id)}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ billId: bill.id, status: "pending" })}>
                                  <Clock className="w-4 h-4 mr-2 text-amber-500" />Mark as Pending
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus.mutate({ billId: bill.id, status: "cancelled" })}>
                                  <XCircle className="w-4 h-4 mr-2 text-muted-foreground" />Mark as Cancelled
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    if (confirm(`Delete bill ${bill.bill_number}? This cannot be undone.`)) {
                                      deleteBill.mutate(bill.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />Delete Bill
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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

      {/* ─── Edit Bill Dialog ─── */}
      <Dialog open={!!editBill} onOpenChange={(o) => { if (!o) setEditBill(null); }}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-xl">Edit Bill — {editBill?.bill_number}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">

          {/* Vendor */}
          <div>
            <Label className="text-sm font-semibold">Vendor Name *</Label>
            <Select value={editForm.vendor_name} onValueChange={v => setEditForm(f => ({ ...f, vendor_name: v }))}>
              <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue placeholder="Select a Vendor" /></SelectTrigger>
              <SelectContent>
                {(vendors || []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                <SelectItem value="__new">+ Add new vendor</SelectItem>
              </SelectContent>
            </Select>
            {editForm.vendor_name === "__new" && (
              <Input className="mt-2 text-sm h-10" placeholder="Enter vendor name" onChange={e => setEditForm(f => ({ ...f, vendor_name: e.target.value }))} />
            )}
          </div>

          {/* Bill # and Order # */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-semibold">Bill #</Label>
              <Input className="mt-1.5 h-10 text-sm" value={editForm.bill_number} onChange={e => setEditForm(f => ({ ...f, bill_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Order Number</Label>
              <Input className="mt-1.5 h-10 text-sm" value={editForm.order_number} onChange={e => setEditForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
          </div>

          {/* Dates + Payment Terms */}
          <div className="grid grid-cols-3 gap-5">
            <div>
              <Label className="text-sm font-semibold">Bill Date</Label>
              <Input type="date" className="mt-1.5 h-10 text-sm" value={editForm.bill_date} onChange={e => setEditForm(f => ({ ...f, bill_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Due Date</Label>
              <Input type="date" className="mt-1.5 h-10 text-sm" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Payment Terms</Label>
              <Select value={editForm.payment_terms} onValueChange={v => setEditForm(f => ({ ...f, payment_terms: v }))}>
                <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* VAT Mode toggle */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-sm font-semibold text-foreground">VAT Treatment</span>
            <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setEditVatInclusive(false)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${!editVatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Exclusive
              </button>
              <button
                type="button"
                onClick={() => setEditVatInclusive(true)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${editVatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Inclusive
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {editVatInclusive
                ? "Rates entered already include VAT — VAT is extracted from the price"
                : "Rates are pre-tax — VAT is added on top of each line rate"}
            </span>
          </div>

          {/* Item Table */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Item Table</Label>
            {loadingEditLines ? (
              <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : (
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm font-semibold text-primary min-w-[200px]">Item Details</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[150px]">Account</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[110px]">Tonnage</TableHead>
                    <TableHead className="text-sm font-semibold text-primary w-20">Qty</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[140px]">Rate (₦)</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[110px]">VAT</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[160px]">Customer</TableHead>
                    <TableHead className="text-sm font-semibold text-primary text-right min-w-[140px]">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editLines.map((line, idx) => (
                    <TableRow key={line.id}>
                      <TableCell className="p-1.5">
                        <Input className="h-9 text-sm border-0 bg-transparent" value={line.item_details} onChange={e => updateEditLine(line.id, "item_details", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.account} onValueChange={v => updateEditLine(line.id, "account", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.tonnage} onValueChange={v => updateEditLine(line.id, "tonnage", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{TONNAGE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input type="number" className="h-9 text-sm border-0 bg-transparent w-16" value={line.quantity} onChange={e => updateEditLine(line.id, "quantity", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input type="number" className="h-9 text-sm border-0 bg-transparent min-w-[120px]" value={line.rate} onChange={e => updateEditLine(line.id, "rate", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={String(line.vat_rate)} onValueChange={v => updateEditLine(line.id, "vat_rate", Number(v))}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{LINE_VAT_OPTIONS.map(o => <SelectItem key={o.rate} value={String(o.rate)}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.customer_id} onValueChange={v => updateEditLine(line.id, "customer_id", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{(customers || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5 text-right text-sm font-mono tabular-nums">₦{(editLineAmounts[idx] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="p-1.5">
                        {editLines.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditLines(prev => prev.filter(l => l.id !== line.id))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            )}
            <Button variant="ghost" size="sm" className="mt-2 text-sm text-primary" onClick={() => setEditLines(prev => [...prev, emptyLine()])}>
              <Plus className="w-4 h-4 mr-1" /> Add New Row
            </Button>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-[380px] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-mono font-semibold">₦{editSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {editTaxTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    VAT <span className="text-xs opacity-60">({editVatInclusive ? "incl." : "excl."})</span>
                  </span>
                  <span className="font-mono">₦{editTaxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Discount</span>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-20 text-sm text-right" value={editForm.discount_percent} onChange={e => setEditForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} />
                  <span className="text-muted-foreground">%</span>
                  <span className="font-mono w-28 text-right">₦{editDiscountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-8 text-sm">Adjustment</Button>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-24 text-sm text-right" value={editForm.adjustment} onChange={e => setEditForm(f => ({ ...f, adjustment: Number(e.target.value) }))} />
                  <span className="font-mono w-28 text-right">₦{editForm.adjustment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex justify-between pt-3 border-t border-border font-semibold text-base">
                <span>Total</span>
                <span className="font-mono">₦{editGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea className="mt-1.5 text-sm h-20" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          </div>
          </div>
          <DialogFooter className="px-8 py-5 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setEditBill(null)}>Cancel</Button>
            <Button onClick={() => updateBill.mutate()} disabled={updateBill.isPending || !editForm.vendor_name || editForm.vendor_name === "__new"}>
              {updateBill.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Bill Dialog (Full Form) ─── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none flex flex-col overflow-hidden p-0">
          <DialogHeader className="px-8 pt-6 pb-5 border-b shrink-0">
            <DialogTitle className="text-xl">Create New Bill</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-6xl mx-auto space-y-6">

          {/* Vendor */}
          <div>
            <Label className="text-sm font-semibold">Vendor Name *</Label>
            <Select value={form.vendor_name} onValueChange={v => setForm(f => ({ ...f, vendor_name: v }))}>
              <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue placeholder="Select a Vendor" /></SelectTrigger>
              <SelectContent>
                {(vendors || []).map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                <SelectItem value="__new">+ Add new vendor</SelectItem>
              </SelectContent>
            </Select>
            {form.vendor_name === "__new" && (
              <Input className="mt-2 text-sm h-10" placeholder="Enter vendor name" onChange={e => setForm(f => ({ ...f, vendor_name: e.target.value }))} />
            )}
          </div>

          {/* Bill # and Order # */}
          <div className="grid grid-cols-2 gap-5">
            <div>
              <Label className="text-sm font-semibold">Bill # *</Label>
              <Input className="mt-1.5 h-10 text-sm" placeholder="e.g. BILL-2026-001" value={form.bill_number} onChange={e => setForm(f => ({ ...f, bill_number: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Order Number</Label>
              <Input className="mt-1.5 h-10 text-sm" placeholder="Purchase order reference" value={form.order_number} onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))} />
            </div>
          </div>

          {/* Dates + Payment Terms */}
          <div className="grid grid-cols-3 gap-5">
            <div>
              <Label className="text-sm font-semibold">Bill Date *</Label>
              <Input type="date" className="mt-1.5 h-10 text-sm" value={form.bill_date} onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Due Date</Label>
              <Input type="date" className="mt-1.5 h-10 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm font-semibold">Payment Terms</Label>
              <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                <SelectTrigger className="mt-1.5 h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {/* VAT Mode toggle */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/40 border border-border">
            <span className="text-sm font-semibold text-foreground">VAT Treatment</span>
            <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 text-sm">
              <button
                type="button"
                onClick={() => setVatInclusive(false)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${!vatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Exclusive
              </button>
              <button
                type="button"
                onClick={() => setVatInclusive(true)}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${vatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                Inclusive
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              {vatInclusive
                ? "Rates entered already include VAT — VAT is extracted from the price"
                : "Rates are pre-tax — VAT is added on top of each line rate"}
            </span>
          </div>

          {/* Item Table */}
          <div>
            <Label className="text-sm font-semibold mb-3 block">Item Table</Label>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm font-semibold text-primary min-w-[200px] whitespace-nowrap">Item Details</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[150px] whitespace-nowrap">Account</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[110px] whitespace-nowrap">Tonnage</TableHead>
                    <TableHead className="text-sm font-semibold text-primary w-20 whitespace-nowrap">Qty</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[140px] whitespace-nowrap">Rate (₦)</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[110px] whitespace-nowrap">VAT</TableHead>
                    <TableHead className="text-sm font-semibold text-primary min-w-[160px] whitespace-nowrap">Customer</TableHead>
                    <TableHead className="text-sm font-semibold text-primary text-right min-w-[140px] whitespace-nowrap">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line, idx) => (
                    <TableRow key={line.id}>
                      <TableCell className="p-1.5">
                        <Input className="h-9 text-sm border-0 bg-transparent" placeholder="Type or describe item" value={line.item_details} onChange={e => updateLine(line.id, "item_details", e.target.value)} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.account} onValueChange={v => updateLine(line.id, "account", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{ACCOUNTS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.tonnage} onValueChange={v => updateLine(line.id, "tonnage", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{TONNAGE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input type="number" className="h-9 text-sm border-0 bg-transparent w-16" value={line.quantity} onChange={e => updateLine(line.id, "quantity", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Input type="number" className="h-9 text-sm border-0 bg-transparent min-w-[120px]" value={line.rate} onChange={e => updateLine(line.id, "rate", Number(e.target.value))} />
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={String(line.vat_rate)} onValueChange={v => updateLine(line.id, "vat_rate", Number(v))}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue /></SelectTrigger>
                          <SelectContent>{LINE_VAT_OPTIONS.map(o => <SelectItem key={o.rate} value={String(o.rate)}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5">
                        <Select value={line.customer_id} onValueChange={v => updateLine(line.id, "customer_id", v)}>
                          <SelectTrigger className="h-9 text-sm border-0"><SelectValue placeholder="Select..." /></SelectTrigger>
                          <SelectContent>{(customers || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="p-1.5 text-right text-sm font-mono whitespace-nowrap tabular-nums">₦{(lineAmounts[idx] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</TableCell>
                      <TableCell className="p-1.5">
                        {lines.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLines(prev => prev.filter(l => l.id !== line.id))}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-sm text-primary" onClick={() => setLines(prev => [...prev, emptyLine()])}>
              <Plus className="w-4 h-4 mr-1" /> Add New Row
            </Button>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-[380px] space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-mono font-semibold">₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {taxTotal > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground whitespace-nowrap">
                    VAT <span className="text-xs opacity-60">({vatInclusive ? "incl." : "excl."})</span>
                  </span>
                  <span className="font-mono">₦{taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground whitespace-nowrap">Discount</span>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-20 text-sm text-right" value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} />
                  <span className="text-muted-foreground">%</span>
                  <span className="font-mono w-28 text-right">₦{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Button variant="outline" size="sm" className="h-8 text-sm whitespace-nowrap">Adjustment</Button>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-24 text-sm text-right" value={form.adjustment} onChange={e => setForm(f => ({ ...f, adjustment: Number(e.target.value) }))} />
                  <span className="font-mono w-28 text-right">₦{form.adjustment.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <div className="flex justify-between pt-3 border-t border-border font-semibold text-base">
                <span>Total</span>
                <span className="font-mono">₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label className="text-sm font-semibold">Notes</Label>
            <Textarea className="mt-1.5 text-sm h-20" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          </div>
          </div>
          <DialogFooter className="px-8 py-5 border-t shrink-0 bg-background">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createBill.mutate()} disabled={!form.vendor_name || form.vendor_name === "__new"}>
              Create Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
