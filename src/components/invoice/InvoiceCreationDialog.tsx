import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Trash2, MapPin, Truck, Fuel, Receipt, FileText,
  Ship, Lock, ChevronRight, CheckCircle2, Package,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { friendlyError } from "@/lib/friendlyError";
import { useCompanySettings } from "@/hooks/useCompanySettings";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DispatchOption {
  id: string;
  dispatch_number: string;
  pickup_address: string;
  delivery_address: string;
  cost: number | null;
  client_revenue: number | null;   // from dispatch_financials (complete entries only)
  finance_status: string | null;   // 'complete' | 'pending' | null
  customer_id: string;
  customer_name: string;
  waybill_number: string | null;
  dropoffs: { id: string; address: string; sequence_order: number; drop_charge: number | null }[];
}

interface LineItem {
  id: string;
  description: string;
  item_type: "service" | "extra_drop" | "fuel_surcharge" | "toll_fee" | "other";
  tonnage: string;
  quantity: number;
  rate: number;
  vat_rate: number;
  vat_amount: number;
  line_total: number;
  dropoff_address?: string;
  dispatch_id?: string;
}

interface InvoiceCreationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editInvoiceId?: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TONNAGE_OPTIONS = [
  "1T", "3T", "5T", "10T", "15T", "20T", "30T", "40T",
  "Container 20ft", "Container 40ft", "Flatbed", "Other",
];

const PAYMENT_TERMS = [
  { label: "Due on Receipt", value: "on_receipt" },
  { label: "Net 7",  value: "net_7",  days: 7  },
  { label: "Net 15", value: "net_15", days: 15 },
  { label: "Net 30", value: "net_30", days: 30 },
  { label: "Net 45", value: "net_45", days: 45 },
  { label: "Net 60", value: "net_60", days: 60 },
  { label: "Custom", value: "custom" },
];

const LINE_VAT_OPTIONS = [
  { label: "No VAT", rate: 0 },
  { label: "5%",    rate: 5 },
  { label: "7.5%",  rate: 7.5 },
  { label: "20%",   rate: 20 },
];

const ITEM_TYPE_CONFIG = {
  service:        { label: "Delivery Service", icon: Truck },
  extra_drop:     { label: "Extra Drop-off",   icon: MapPin },
  fuel_surcharge: { label: "Fuel Surcharge",   icon: Fuel },
  toll_fee:       { label: "Toll Fee",          icon: Receipt },
  other:          { label: "Other",             icon: FileText },
};

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(n);

// ── Component ─────────────────────────────────────────────────────────────────

export const InvoiceCreationDialog = ({
  open,
  onOpenChange,
  onSuccess,
  editInvoiceId,
}: InvoiceCreationDialogProps) => {
  const { toast } = useToast();
  const { user, userRole, organizationId } = useAuth();
  const { logChange } = useAuditLog();
  const { settings: companySettings, forceRefresh } = useCompanySettings();

  const isEditMode = !!editInvoiceId;
  const isOperations = userRole === "operations";
  const isNonAdmin   = userRole === "support" || userRole === "operations";

  // ── Step state: "select_dispatch" | "build_invoice" ──────────────────────
  const [step, setStep] = useState<"select_dispatch" | "build_invoice">("select_dispatch");

  // ── Dispatch selection ────────────────────────────────────────────────────
  const [availableDispatches, setAvailableDispatches] = useState<DispatchOption[]>([]);
  const [loadingDispatches, setLoadingDispatches]     = useState(false);
  const [selectedDispatchIds, setSelectedDispatchIds] = useState<string[]>([]);

  // ── Invoice form ──────────────────────────────────────────────────────────
  const [saving,       setSaving]       = useState(false);
  const [loadingEdit,  setLoadingEdit]  = useState(false);
  const [editInvoiceNumber, setEditInvoiceNumber] = useState("");
  const [vatInclusive, setVatInclusive] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; company_name: string }[]>([]);

  const [formData, setFormData] = useState({
    invoice_number:          "",
    auto_number:             true,
    invoice_date:            new Date().toISOString().split("T")[0],
    payment_terms:           "net_30",
    due_date:                "",
    customer_id:             "",
    waybill_number:          "",
    notes:                   "",
    shipping_charge:         0,
    shipping_vat_applicable: false,
    shipping_vat_rate:       7.5,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([{
    id: crypto.randomUUID(),
    description: "Delivery Service",
    item_type:   "service",
    tonnage:     "",
    quantity:    1,
    rate:        0,
    vat_rate:    0,
    vat_amount:  0,
    line_total:  0,
  }]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  useEffect(() => { if (open) forceRefresh(); }, [open, forceRefresh]);

  useEffect(() => {
    if (!open) {
      setEditInvoiceNumber("");
      return;
    }
    fetchCustomers();
    if (!isEditMode) {
      fetchAvailableDispatches();
      setStep("select_dispatch");
    }
  }, [open]);

  // Auto-calculate due date from payment terms
  useEffect(() => {
    if (formData.payment_terms === "custom" || !formData.invoice_date) return;
    const term = PAYMENT_TERMS.find(t => t.value === formData.payment_terms);
    if (term && "days" in term && term.days) {
      const d = new Date(formData.invoice_date);
      d.setDate(d.getDate() + term.days);
      setFormData(p => ({ ...p, due_date: d.toISOString().split("T")[0] }));
    } else if (formData.payment_terms === "on_receipt") {
      setFormData(p => ({ ...p, due_date: formData.invoice_date }));
    }
  }, [formData.payment_terms, formData.invoice_date]);

  // Load invoice for editing
  useEffect(() => {
    if (!open || !editInvoiceId) return;
    const load = async () => {
      setLoadingEdit(true);
      try {
        const [{ data: inv }, { data: items }] = await Promise.all([
          supabase.from("invoices").select("*").eq("id", editInvoiceId).single(),
          supabase.from("invoice_line_items").select("*").eq("invoice_id", editInvoiceId).order("sequence_order"),
        ]);
        if (!inv) return;
        setVatInclusive(inv.tax_type === "inclusive");
        setEditInvoiceNumber(inv.invoice_number);
        setFormData({
          invoice_number:          inv.invoice_number,
          auto_number:             false,
          invoice_date:            inv.invoice_date ? inv.invoice_date.slice(0, 10) : new Date().toISOString().split("T")[0],
          payment_terms:           inv.payment_terms || "net_30",
          due_date:                inv.due_date ? inv.due_date.slice(0, 10) : "",
          customer_id:             inv.customer_id || "",
          waybill_number:          (inv as any).waybill_number || "",
          notes:                   inv.notes || "",
          shipping_charge:         inv.shipping_charge || 0,
          shipping_vat_applicable: (inv.shipping_vat_rate || 0) > 0,
          shipping_vat_rate:       inv.shipping_vat_rate || 7.5,
        });
        if (items && items.length > 0) {
          setLineItems(items.map((item: any) => ({
            id:              crypto.randomUUID(),
            description:     item.description || "",
            item_type:       (item.item_type as LineItem["item_type"]) || "service",
            tonnage:         item.tonnage || "",
            quantity:        item.quantity || 1,
            rate:            item.rate || item.unit_price || 0,
            vat_rate:        item.vat_rate || 0,
            vat_amount:      item.vat_amount || 0,
            line_total:      item.line_total || 0,
            dropoff_address: item.dropoff_address || undefined,
            dispatch_id:     item.dispatch_id || undefined,
          })));
        }
        setStep("build_invoice");
      } catch (err) {
        console.error("Failed to load invoice for editing", err);
      } finally {
        setLoadingEdit(false);
      }
    };
    load();
  }, [open, editInvoiceId]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("customers")
      .select("id, company_name")
      .order("company_name");
    setCustomers(data || []);
  };

  const fetchAvailableDispatches = async () => {
    if (!organizationId) return;
    setLoadingDispatches(true);
    try {
      // Delivered dispatches that don't yet have a non-cancelled invoice
      const { data: dispatches, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, pickup_address, delivery_address, cost,
          customer_id,
          customers!inner(company_name),
          waybills(waybill_number)
        `)
        .eq("organization_id", organizationId)
        .eq("status", "delivered")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out dispatches already on a live invoice
      const dispatchIds = (dispatches || []).map((d: any) => d.id);
      let invoicedIds = new Set<string>();
      if (dispatchIds.length > 0) {
        const { data: existing } = await supabase
          .from("invoices")
          .select("dispatch_id")
          .in("dispatch_id", dispatchIds)
          .neq("status", "cancelled");
        (existing || []).forEach((r: any) => { if (r.dispatch_id) invoicedIds.add(r.dispatch_id); });
      }

      // Fetch dropoffs + finance data in parallel for all dispatches
      let dropoffMap: Record<string, DispatchOption["dropoffs"]> = {};
      let financeMap: Record<string, { client_revenue: number | null; finance_status: string }> = {};

      if (dispatchIds.length > 0) {
        const [dropoffsRes, financeRes] = await Promise.all([
          supabase
            .from("dispatch_dropoffs")
            .select("id, dispatch_id, address, sequence_order, drop_charge")
            .in("dispatch_id", dispatchIds)
            .order("sequence_order"),
          (supabase.from("dispatch_financials") as any)
            .select("dispatch_id, client_revenue, finance_status")
            .in("dispatch_id", dispatchIds),
        ]);

        (dropoffsRes.data || []).forEach((d: any) => {
          if (!dropoffMap[d.dispatch_id]) dropoffMap[d.dispatch_id] = [];
          dropoffMap[d.dispatch_id].push({
            id:             d.id,
            address:        d.address,
            sequence_order: d.sequence_order,
            drop_charge:    d.drop_charge ?? null,
          });
        });

        // Prefer 'complete' finance entries; fall back to any entry if only pending exists
        (financeRes.data || []).forEach((f: any) => {
          const existing = financeMap[f.dispatch_id];
          if (!existing || f.finance_status === "complete") {
            financeMap[f.dispatch_id] = {
              client_revenue: f.client_revenue != null ? Number(f.client_revenue) : null,
              finance_status: f.finance_status,
            };
          }
        });
      }

      const options: DispatchOption[] = (dispatches || [])
        .filter((d: any) => !invoicedIds.has(d.id))
        .map((d: any) => {
          const fin = financeMap[d.id] ?? null;
          return {
            id:               d.id,
            dispatch_number:  d.dispatch_number,
            pickup_address:   d.pickup_address,
            delivery_address: d.delivery_address,
            cost:             d.cost,
            client_revenue:   fin?.finance_status === "complete" ? fin.client_revenue : null,
            finance_status:   fin?.finance_status ?? null,
            customer_id:      d.customer_id,
            customer_name:    d.customers?.company_name || "Unknown",
            waybill_number:   d.waybills?.[0]?.waybill_number || null,
            dropoffs:         dropoffMap[d.id] || [],
          };
        });

      setAvailableDispatches(options);
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load dispatches", variant: "destructive" });
    } finally {
      setLoadingDispatches(false);
    }
  };

  // ── Dispatch selection handler ────────────────────────────────────────────

  const toggleDispatch = (id: string) => {
    setSelectedDispatchIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const buildInvoiceFromDispatches = () => {
    const selected = availableDispatches.filter(d => selectedDispatchIds.includes(d.id));
    if (selected.length === 0) return;

    // Auto-fill customer from first dispatch (all should be same customer ideally)
    const firstDispatch = selected[0];
    const waybillNumbers = selected
      .map(d => d.waybill_number)
      .filter(Boolean)
      .join(", ");

    // Build line items: one service line per dispatch + extra drops
    const newLineItems: LineItem[] = [];
    selected.forEach(dispatch => {
      // Main delivery line — prefer client_revenue from finance entry, fall back to dispatch.cost
      const lineRate = dispatch.client_revenue ?? dispatch.cost ?? 0;
      newLineItems.push({
        id:          crypto.randomUUID(),
        description: `Delivery: ${dispatch.pickup_address.split(",")[0]} → ${dispatch.delivery_address.split(",")[0]} (${dispatch.dispatch_number})`,
        item_type:   "service",
        tonnage:     "",
        quantity:    1,
        rate:        lineRate,
        vat_rate:    0,
        vat_amount:  0,
        line_total:  lineRate,
        dispatch_id: dispatch.id,
      });

      // One line per extra drop
      dispatch.dropoffs.forEach(drop => {
        newLineItems.push({
          id:              crypto.randomUUID(),
          description:     `Extra Drop (Stop ${drop.sequence_order}): ${drop.address.split(",")[0]}`,
          item_type:       "extra_drop",
          tonnage:         "",
          quantity:        1,
          rate:            drop.drop_charge || 0,
          vat_rate:        0,
          vat_amount:      0,
          line_total:      drop.drop_charge || 0,
          dropoff_address: drop.address,
          dispatch_id:     dispatch.id,
        });
      });
    });

    setLineItems(newLineItems);
    setFormData(p => ({
      ...p,
      customer_id:    firstDispatch.customer_id,
      waybill_number: waybillNumbers,
    }));
    setStep("build_invoice");
  };

  // ── Line item helpers ─────────────────────────────────────────────────────

  const addLineItem = (type: LineItem["item_type"]) => {
    setLineItems(prev => [...prev, {
      id:          crypto.randomUUID(),
      description: ITEM_TYPE_CONFIG[type].label,
      item_type:   type,
      tonnage:     "",
      quantity:    1,
      rate:        0,
      vat_rate:    0,
      vat_amount:  0,
      line_total:  0,
      dropoff_address: type === "extra_drop" ? "" : undefined,
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) setLineItems(prev => prev.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, ...updates };
      const base   = updated.quantity * updated.rate;
      const vat    = base * (updated.vat_rate / 100);
      updated.vat_amount = vat;
      updated.line_total = base + vat;
      return updated;
    }));
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const calculateTotals = useCallback(() => {
    let subtotal: number;
    let totalVat: number;

    if (vatInclusive) {
      totalVat = lineItems.reduce((sum, item) => {
        if (item.vat_rate === 0) return sum;
        const gross = item.quantity * item.rate;
        return sum + (gross - gross / (1 + item.vat_rate / 100));
      }, 0);
      subtotal = lineItems.reduce((s, item) => s + item.quantity * item.rate, 0) - totalVat;
    } else {
      subtotal  = lineItems.reduce((s, item) => s + item.quantity * item.rate, 0);
      totalVat  = lineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    }

    const shippingVat  = formData.shipping_vat_applicable
      ? formData.shipping_charge * (formData.shipping_vat_rate / 100)
      : 0;
    const grandTotal = subtotal + totalVat + formData.shipping_charge + shippingVat;
    return { subtotal, totalVat, shippingVat, grandTotal };
  }, [lineItems, vatInclusive, formData.shipping_charge, formData.shipping_vat_applicable, formData.shipping_vat_rate]);

  // ── Invoice number generation ─────────────────────────────────────────────

  const generateInvoiceNumber = async (): Promise<string> => {
    const year   = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    let seq = 1;
    if (organizationId) {
      const { count } = await supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .like("invoice_number", `${prefix}%`);
      seq = (count ?? 0) + 1;
    }
    return `${prefix}${seq.toString().padStart(4, "0")}`;
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData({
      invoice_number: "", auto_number: true,
      invoice_date: new Date().toISOString().split("T")[0],
      payment_terms: "net_30", due_date: "",
      customer_id: "", waybill_number: "", notes: "",
      shipping_charge: 0, shipping_vat_applicable: false, shipping_vat_rate: 7.5,
    });
    setLineItems([{
      id: crypto.randomUUID(), description: "Delivery Service",
      item_type: "service", tonnage: "", quantity: 1,
      rate: 0, vat_rate: 0, vat_amount: 0, line_total: 0,
    }]);
    setSelectedDispatchIds([]);
    setStep("select_dispatch");
    setVatInclusive(false);
  };

  // ── Save handlers ─────────────────────────────────────────────────────────

  const handleEditSubmit = async () => {
    if (!editInvoiceId) return;
    setSaving(true);
    try {
      // Stale lock check
      const { data: lockCheck } = await supabase
        .from("invoices")
        .select("is_locked, locked_reason, status")
        .eq("id", editInvoiceId)
        .single();

      if (lockCheck?.is_locked) {
        if (lockCheck.status !== "paid") {
          const { error: unlockError } = await supabase
            .from("invoices")
            .update({ is_locked: false, locked_at: null, locked_reason: null, lock_type: null })
            .eq("id", editInvoiceId);
          if (unlockError) {
            toast({ title: "Invoice Locked", description: "Stale lock could not be cleared. Contact your admin.", variant: "destructive" });
            setSaving(false);
            return;
          }
        } else {
          toast({ title: "Invoice Locked", description: lockCheck.locked_reason || "Paid invoices cannot be edited.", variant: "destructive" });
          setSaving(false);
          return;
        }
      }

      const { subtotal, totalVat, shippingVat, grandTotal } = calculateTotals();

      const updateData: Record<string, unknown> = {
        customer_id:        formData.customer_id,
        invoice_date:       formData.invoice_date,
        due_date:           formData.due_date || null,
        payment_terms:      formData.payment_terms,
        notes:              formData.notes || null,
        waybill_number:     formData.waybill_number || null,
        shipping_charge:    formData.shipping_charge,
        shipping_vat_rate:  formData.shipping_vat_applicable ? formData.shipping_vat_rate : 0,
        shipping_vat_amount: shippingVat,
        amount:             subtotal,
        subtotal,
        tax_amount:         totalVat + shippingVat,
        total_amount:       grandTotal,
        balance_due:        grandTotal,
        tax_type:           totalVat > 0 ? (vatInclusive ? "inclusive" : "exclusive") : "none",
        status_updated_at:  new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("invoices")
        .update(updateData as never)
        .eq("id", editInvoiceId);
      if (updateError) throw updateError;

      // Replace line items
      const { error: deleteError } = await supabase
        .from("invoice_line_items")
        .delete()
        .eq("invoice_id", editInvoiceId);
      if (deleteError) throw deleteError;

      const lineItemsToInsert = lineItems.map((item, index) => ({
        invoice_id:      editInvoiceId,
        description:     item.description,
        item_type:       item.item_type,
        tonnage:         item.tonnage || null,
        quantity:        item.quantity,
        unit_price:      item.rate,
        rate:            item.rate,
        amount:          item.quantity * item.rate,
        vat_rate:        item.vat_rate,
        vat_amount:      item.vat_amount,
        line_total:      item.line_total,
        dropoff_address: item.dropoff_address || null,
        dispatch_id:     item.dispatch_id || null,
        sequence_order:  index + 1,
      }));
      const { error: insertLineError } = await supabase
        .from("invoice_line_items")
        .insert(lineItemsToInsert);
      if (insertLineError) throw insertLineError;

      await logChange({
        table_name: "invoices", record_id: editInvoiceId, action: "update",
        new_data: { ...updateData, line_items_count: lineItemsToInsert.length },
      });

      toast({ title: "Invoice Updated", description: `${editInvoiceNumber} saved successfully.` });
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: unknown) {
      const { friendly, technical } = friendlyError(error);
      console.error("[invoice update]", technical);
      toast({ title: "Couldn't update invoice", description: friendly, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast({ title: "Validation Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    if (lineItems.every(item => item.rate === 0)) {
      toast({ title: "Validation Error", description: "Please add at least one line item with a rate", variant: "destructive" });
      return;
    }

    if (isEditMode) { await handleEditSubmit(); return; }

    setSaving(true);
    try {
      const { subtotal, totalVat, shippingVat, grandTotal } = calculateTotals();

      if (!formData.auto_number && !formData.invoice_number.trim()) {
        toast({ title: "Validation Error", description: "Please enter an invoice number", variant: "destructive" });
        setSaving(false);
        return;
      }

      const buildInsert = (invoiceNumber: string): Record<string, unknown> => {
        const insertData: Record<string, unknown> = {
          invoice_number:      invoiceNumber,
          customer_id:         formData.customer_id,
          // Link first selected dispatch (primary FK); multi-dispatch tracked via line items
          dispatch_id:         selectedDispatchIds[0] || null,
          waybill_number:      formData.waybill_number || null,
          amount:              subtotal,
          subtotal,
          tax_amount:          totalVat + shippingVat,
          total_amount:        grandTotal,
          balance_due:         grandTotal,
          amount_paid:         0,
          tax_type:            totalVat > 0 ? (vatInclusive ? "inclusive" : "exclusive") : "none",
          invoice_date:        formData.invoice_date,
          due_date:            formData.due_date || null,
          payment_terms:       formData.payment_terms,
          shipping_charge:     formData.shipping_charge,
          shipping_vat_rate:   formData.shipping_vat_applicable ? formData.shipping_vat_rate : 0,
          shipping_vat_amount: shippingVat,
          notes:               formData.notes || null,
          status:              "draft",
          is_posted:           false,
          created_by:          user?.id,
          currency_code:       "NGN",
          organization_id:     organizationId,
        };
        if (isNonAdmin) {
          insertData.approval_status = "pending_first_approval";
          insertData.submitted_by    = user?.id;
        }
        return insertData;
      };

      // Auto-number with collision retry
      const MAX_ATTEMPTS = 5;
      let invoice: any = null;
      let lastError: any = null;

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const invoiceNumber = formData.auto_number
          ? await generateInvoiceNumber()
          : formData.invoice_number;
        const insertData = buildInsert(invoiceNumber);

        const { data, error } = await supabase
          .from("invoices")
          .insert(insertData as never)
          .select()
          .single();

        if (!error) { invoice = data; lastError = null; break; }

        const isUnique = (error as any)?.code === "23505" ||
          /duplicate key|unique constraint/i.test(error.message || "");
        if (isUnique && formData.auto_number) {
          lastError = error;
          await new Promise(r => setTimeout(r, 50 + Math.floor(Math.random() * 100)));
          continue;
        }
        throw error;
      }

      if (!invoice) throw lastError ?? new Error("Failed to allocate a unique invoice number");

      // Insert line items
      const lineItemsToInsert = lineItems.map((item, index) => ({
        invoice_id:      invoice.id,
        description:     item.description,
        item_type:       item.item_type,
        tonnage:         item.tonnage || null,
        quantity:        item.quantity,
        unit_price:      item.rate,
        rate:            item.rate,
        amount:          item.quantity * item.rate,
        vat_rate:        item.vat_rate,
        vat_amount:      item.vat_amount,
        line_total:      item.line_total,
        dropoff_address: item.dropoff_address || null,
        dispatch_id:     item.dispatch_id || null,
        sequence_order:  index + 1,
      }));
      await supabase.from("invoice_line_items").insert(lineItemsToInsert);

      // Sync dispatch_financials for each linked dispatch (client_revenue)
      for (const dispatchId of selectedDispatchIds) {
        const dispatchLines = lineItems.filter(l => l.dispatch_id === dispatchId);
        const dispatchRevenue = dispatchLines.reduce((s, l) => s + l.line_total, 0);
        if (dispatchRevenue > 0 && organizationId) {
          await (supabase as any)
            .from("dispatch_financials")
            .upsert({
              dispatch_id:     dispatchId,
              organization_id: organizationId,
              client_revenue:  dispatchRevenue,
              invoice_id:      invoice.id,
            }, { onConflict: "dispatch_id" });
        }
      }

      await logChange({
        table_name: "invoices", record_id: invoice.id, action: "insert",
        new_data: { invoice_number: invoice.invoice_number, line_items_count: lineItemsToInsert.length },
      });

      toast({
        title: "Invoice Created",
        description: isNonAdmin ? "Submitted for approval" : `${invoice.invoice_number} saved as draft`,
      });
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: unknown) {
      const { friendly, technical } = friendlyError(error);
      console.error("[invoice create]", technical);
      toast({ title: "Couldn't create invoice", description: friendly, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const { subtotal, totalVat, shippingVat, grandTotal } = calculateTotals();
  const selectedCustomer = customers.find(c => c.id === formData.customer_id);

  // ── Step 1: Dispatch Selection ────────────────────────────────────────────

  const renderDispatchStep = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden", flex: 1, minHeight: 0 }}>
      {loadingDispatches ? (
        <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: 320 }}>
          Loading delivered trips…
        </div>
      ) : availableDispatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2" style={{ height: 320 }}>
          <Package className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No uninvoiced delivered trips found</p>
          <Button variant="link" className="text-xs" onClick={() => setStep("build_invoice")}>
            Create invoice manually instead
          </Button>
        </div>
      ) : (
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, paddingRight: "4px" }}>
          <div className="space-y-2">
            {availableDispatches.map(dispatch => {
              const isSelected = selectedDispatchIds.includes(dispatch.id);
              return (
                <div
                  key={dispatch.id}
                  onClick={() => toggleDispatch(dispatch.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-border/80 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleDispatch(dispatch.id)}
                      className="mt-0.5 pointer-events-none"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{dispatch.dispatch_number}</span>
                        <span className="font-semibold text-sm tabular-nums whitespace-nowrap">
                          {dispatch.client_revenue != null ? (
                            <span className="flex flex-col items-end gap-0.5">
                              <span className="font-semibold">{formatCurrency(dispatch.client_revenue)}</span>
                              <span className="text-[10px] text-emerald-500 font-normal">From Finance</span>
                            </span>
                          ) : dispatch.finance_status === "pending" ? (
                            <span className="flex flex-col items-end gap-0.5">
                              <span>{dispatch.cost ? formatCurrency(dispatch.cost) : <span className="text-muted-foreground text-sm">No cost</span>}</span>
                              <span className="text-[10px] text-amber-500 font-normal">Finance pending</span>
                            </span>
                          ) : dispatch.cost ? (
                            formatCurrency(dispatch.cost)
                          ) : (
                            <span className="text-muted-foreground">No cost</span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {dispatch.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {dispatch.pickup_address.split(",")[0]} → {dispatch.delivery_address.split(",")[0]}
                      </p>
                      {dispatch.dropoffs.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {dispatch.dropoffs.map(d => (
                            <Badge key={d.id} variant="outline" className="text-[10px] px-1.5 py-0">
                              <MapPin className="w-2.5 h-2.5 mr-0.5" />
                              Stop {d.sequence_order}: {d.address.split(",")[0]}
                              {d.drop_charge ? ` · ${formatCurrency(d.drop_charge)}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {dispatch.waybill_number && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Waybill: {dispatch.waybill_number}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );

  // ── Step 2: Invoice Builder ────────────────────────────────────────────────

  const renderInvoiceBuilder = () => (
    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form — 3 cols */}
      <ScrollArea className="h-[62vh] pr-4 lg:col-span-3">
        <div className="space-y-5">

          {/* Invoice Number */}
          <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Invoice Number</Label>
              {!isEditMode && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Auto-generate</span>
                  <Switch
                    checked={formData.auto_number}
                    onCheckedChange={c => setFormData(p => ({ ...p, auto_number: c }))}
                  />
                </div>
              )}
            </div>
            {isEditMode ? (
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm font-medium">{editInvoiceNumber}</span>
                <span className="text-xs text-muted-foreground">(cannot be changed)</span>
              </div>
            ) : !formData.auto_number ? (
              <Input
                value={formData.invoice_number}
                onChange={e => setFormData(p => ({ ...p, invoice_number: e.target.value }))}
                placeholder="e.g. RA-2026-0001"
                className="bg-background/50"
              />
            ) : (
              <p className="text-xs text-muted-foreground">Auto-generated on creation (INV-YYYY-XXXX)</p>
            )}
          </div>

          {/* Customer + Waybill */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer *</Label>
              <Select value={formData.customer_id} onValueChange={v => setFormData(p => ({ ...p, customer_id: v }))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Waybill Number</Label>
              <Input
                value={formData.waybill_number}
                onChange={e => setFormData(p => ({ ...p, waybill_number: e.target.value }))}
                placeholder="Auto-filled or enter manually"
                className="bg-secondary/50"
              />
            </div>
          </div>

          {/* Date / Terms / Due */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Input type="date" value={formData.invoice_date}
                onChange={e => setFormData(p => ({ ...p, invoice_date: e.target.value }))}
                className="bg-secondary/50" />
            </div>
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={formData.payment_terms} onValueChange={v => setFormData(p => ({ ...p, payment_terms: v }))}>
                <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={formData.due_date}
                onChange={e => setFormData(p => ({ ...p, due_date: e.target.value, payment_terms: "custom" }))}
                className="bg-secondary/50" />
            </div>
          </div>

          {/* VAT Treatment */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-xs font-semibold whitespace-nowrap">VAT Treatment</span>
            <div className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 text-xs">
              <button type="button" onClick={() => setVatInclusive(false)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${!vatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Exclusive
              </button>
              <button type="button" onClick={() => setVatInclusive(true)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${vatInclusive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                Inclusive
              </button>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {vatInclusive ? "Rates include VAT — tax extracted from price" : "Rates are pre-tax — VAT added on top"}
            </span>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Line Items</Label>
              <div className="flex gap-1">
                {(["extra_drop", "fuel_surcharge", "toll_fee", "other"] as const).map(type => {
                  const cfg  = ITEM_TYPE_CONFIG[type];
                  const Icon = cfg.icon;
                  return (
                    <Button key={type} type="button" variant="outline" size="sm"
                      onClick={() => addLineItem(type)} className="text-xs">
                      <Icon className="w-3 h-3 mr-1" />{cfg.label.split(" ")[0]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-3">
              <div className="col-span-2">Tonnage</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Qty</div>
              <div className="col-span-2">Rate (₦)</div>
              <div className="col-span-2">VAT</div>
              <div className="col-span-2 text-right">Amount (₦)</div>
            </div>

            {lineItems.map(item => (
              <div key={item.id} className="p-3 bg-secondary/20 rounded-lg space-y-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2 min-w-0">
                    <Select value={item.tonnage} onValueChange={v => updateLineItem(item.id, { tonnage: v })}>
                      <SelectTrigger className="bg-background/50 text-xs h-8"><SelectValue placeholder="Tonnage" /></SelectTrigger>
                      <SelectContent>
                        {TONNAGE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <Input value={item.description}
                      onChange={e => updateLineItem(item.id, { description: e.target.value })}
                      className="bg-background/50 text-xs h-8 w-full" placeholder="Description" />
                  </div>
                  <div className="col-span-1 min-w-0">
                    <Input type="number" value={item.quantity}
                      onChange={e => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })}
                      className="bg-background/50 text-xs h-8 w-full" />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <Input type="number" value={item.rate || ""}
                      onChange={e => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                      className="bg-background/50 text-xs h-8 w-full" placeholder="0" />
                  </div>
                  <div className="col-span-2 min-w-0">
                    <Select value={String(item.vat_rate)} onValueChange={v => updateLineItem(item.id, { vat_rate: parseFloat(v) })}>
                      <SelectTrigger className="bg-background/50 text-xs h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LINE_VAT_OPTIONS.map(o => <SelectItem key={o.rate} value={String(o.rate)}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 text-xs text-right font-semibold tabular-nums pr-1 flex flex-col items-end justify-center gap-0.5">
                    <span>₦{item.line_total.toLocaleString()}</span>
                    {item.vat_amount > 0 && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        +₦{item.vat_amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} VAT
                      </span>
                    )}
                    {lineItems.length > 1 && (
                      <Button type="button" variant="ghost" size="sm"
                        onClick={() => removeLineItem(item.id)}
                        className="h-5 w-5 p-0 text-destructive mt-0.5">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                {item.item_type === "extra_drop" && (
                  <Input value={item.dropoff_address || ""}
                    onChange={e => updateLineItem(item.id, { dropoff_address: e.target.value })}
                    placeholder="Drop-off address"
                    className="bg-background/50 text-xs" />
                )}
              </div>
            ))}
          </div>

          {/* Shipping Charge */}
          <div className="p-4 bg-secondary/20 rounded-lg space-y-3">
            <Label className="font-semibold flex items-center gap-2">
              <Ship className="w-4 h-4" /> Shipping Charge
            </Label>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount</Label>
                <Input type="number"
                  value={formData.shipping_charge || ""}
                  onChange={e => setFormData(p => ({ ...p, shipping_charge: parseFloat(e.target.value) || 0 }))}
                  className="bg-background/50" placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apply VAT</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={formData.shipping_vat_applicable}
                    onCheckedChange={c => setFormData(p => ({ ...p, shipping_vat_applicable: c }))}
                  />
                  <span className="text-xs text-muted-foreground">{formData.shipping_vat_applicable ? "Yes" : "No"}</span>
                </div>
              </div>
              {formData.shipping_vat_applicable && (
                <div className="space-y-1">
                  <Label className="text-xs">VAT Rate %</Label>
                  <Select value={String(formData.shipping_vat_rate)}
                    onValueChange={v => setFormData(p => ({ ...p, shipping_vat_rate: parseFloat(v) }))}>
                    <SelectTrigger className="bg-background/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5%</SelectItem>
                      <SelectItem value="7.5">7.5%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Additional notes…" className="bg-secondary/50" />
          </div>
        </div>
      </ScrollArea>

      {/* Preview — 2 cols */}
      <div className="bg-background rounded-lg border border-border p-4 h-[62vh] overflow-auto lg:col-span-2">
        <div className="space-y-4">
          <div className="flex justify-between items-start border-b border-border pb-3">
            <div>
              {companySettings?.logo_url
                ? <img src={companySettings.logo_url} alt="Logo" className="h-8 object-contain mb-1" />
                : <h3 className="font-heading font-bold text-sm">{companySettings?.company_name || "Your Company"}</h3>}
              {companySettings?.tagline && <p className="text-[10px] text-muted-foreground">{companySettings.tagline}</p>}
            </div>
            <div className="text-right">
              <Badge variant="outline" className="text-[10px] mb-1">{isEditMode ? "EDITING" : "DRAFT"}</Badge>
              <p className="font-mono text-xs font-medium">
                {formData.auto_number ? `INV-${new Date().getFullYear()}-####` : formData.invoice_number || "-"}
              </p>
              {formData.waybill_number && (
                <p className="text-[10px] text-muted-foreground">WB: {formData.waybill_number}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground mb-0.5">BILL TO</p>
              <p className="font-medium">{selectedCustomer?.company_name || "Select Customer"}</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground">Date: {formData.invoice_date}</p>
              <p className="text-muted-foreground">Due: {formData.due_date || "-"}</p>
              <p className="text-muted-foreground">Terms: {PAYMENT_TERMS.find(t => t.value === formData.payment_terms)?.label}</p>
            </div>
          </div>

          <div className="border rounded overflow-hidden">
            <table className="w-full text-[10px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-1.5">Description</th>
                  <th className="text-right p-1.5 whitespace-nowrap">Qty</th>
                  <th className="text-right p-1.5 whitespace-nowrap">Rate</th>
                  <th className="text-right p-1.5 whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(item => (
                  <tr key={item.id} className="border-t border-border/50">
                    <td className="p-1.5 max-w-[120px] break-words">
                      <span className={item.item_type === "extra_drop" ? "text-blue-500" : ""}>{item.description}</span>
                    </td>
                    <td className="p-1.5 text-right whitespace-nowrap">{item.quantity}</td>
                    <td className="p-1.5 text-right whitespace-nowrap tabular-nums">₦{item.rate.toLocaleString()}</td>
                    <td className="p-1.5 text-right font-medium whitespace-nowrap tabular-nums">₦{item.line_total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="border-t border-border pt-2 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₦{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {totalVat > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>₦{totalVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {formData.shipping_charge > 0 && (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₦{formData.shipping_charge.toLocaleString()}</span></div>
                {shippingVat > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping VAT</span><span>₦{shippingVat.toLocaleString()}</span></div>}
              </>
            )}
            <Separator />
            <div className="flex justify-between font-bold text-sm">
              <span>Grand Total</span>
              <span>₦{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {companySettings?.bank_name && (
            <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
              <p className="font-medium text-foreground mb-0.5">Payment Details</p>
              <p>Bank: {companySettings.bank_name}</p>
              <p>Account: {companySettings.bank_account_name}</p>
              <p>Number: {companySettings.bank_account_number}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  const dialogWidth = step === "select_dispatch" && !isEditMode ? "sm:max-w-[560px]" : "sm:max-w-[1100px]";

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className={`${dialogWidth} overflow-hidden flex flex-col`} style={{ maxHeight: "92vh", height: step === "select_dispatch" && !isEditMode ? "560px" : undefined }}>
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {isEditMode
              ? `Edit Invoice — ${editInvoiceNumber}`
              : step === "select_dispatch"
                ? "Select Trips to Invoice"
                : "Create Invoice"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update invoice details, line items, and amounts."
              : step === "select_dispatch"
                ? "Choose completed deliveries — amounts, drops, and waybill numbers will pre-fill automatically."
                : isOperations
                  ? "Invoice will be submitted for admin approval."
                  : "Review and adjust line items, then create the invoice."}
          </DialogDescription>
        </DialogHeader>

        {loadingEdit ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : step === "select_dispatch" && !isEditMode ? (
          renderDispatchStep()
        ) : (
          renderInvoiceBuilder()
        )}

        {/* Footer — dispatch selector step */}
        {step === "select_dispatch" && !isEditMode && !loadingEdit && (
          <div className="flex items-center justify-between gap-2 pt-4 border-t border-border shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setStep("build_invoice")}>
              Skip — build manually
            </Button>
            <Button
              onClick={buildInvoiceFromDispatches}
              disabled={selectedDispatchIds.length === 0}
              className="gap-2"
            >
              Continue with {selectedDispatchIds.length} trip{selectedDispatchIds.length !== 1 ? "s" : ""}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Footer — invoice builder step */}
        {(step === "build_invoice" || isEditMode) && (
          <div className="flex justify-between gap-2 pt-4 border-t border-border shrink-0">
            {!isEditMode && (
              <Button variant="ghost" size="sm" onClick={() => setStep("select_dispatch")}>
                ← Back to trips
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving}>
                {saving
                  ? isEditMode ? "Saving…" : "Creating…"
                  : isEditMode
                    ? "Save Changes"
                    : isOperations
                      ? "Submit for Approval"
                      : "Create Draft Invoice"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
