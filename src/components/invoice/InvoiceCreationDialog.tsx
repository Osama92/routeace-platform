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
import { Plus, Trash2, MapPin, Truck, Fuel, Receipt, FileText, Ship, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  company_name: string;
}

interface Dispatch {
  id: string;
  dispatch_number: string;
  pickup_address: string;
  delivery_address: string;
  distance_km: number | null;
  cost: number | null;
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
}

const TONNAGE_OPTIONS = ["1T", "3T", "5T", "10T", "15T", "20T", "30T", "40T", "Container 20ft", "Container 40ft", "Flatbed", "Other"];
const VAT_RATES = [{ label: "No VAT", value: 0 }, { label: "7.5% (Nigeria)", value: 7.5 }, { label: "5% (UAE/Canada)", value: 5 }, { label: "20% (UK)", value: 20 }, { label: "Custom", value: -1 }];
const PAYMENT_TERMS = [
  { label: "Due on Receipt", value: "on_receipt" },
  { label: "Net 7", value: "net_7", days: 7 },
  { label: "Net 15", value: "net_15", days: 15 },
  { label: "Net 30", value: "net_30", days: 30 },
  { label: "Net 45", value: "net_45", days: 45 },
  { label: "Net 60", value: "net_60", days: 60 },
  { label: "Custom", value: "custom" },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
};

const itemTypeConfig = {
  service: { label: "Delivery Service", icon: Truck },
  extra_drop: { label: "Extra Drop-off", icon: MapPin },
  fuel_surcharge: { label: "Fuel Surcharge", icon: Fuel },
  toll_fee: { label: "Toll Fee", icon: Receipt },
  other: { label: "Other", icon: FileText },
};

export const InvoiceCreationDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: InvoiceCreationDialogProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user, userRole, organizationId } = useAuth();
  const { logChange } = useAuditLog();
  const { settings: companySettings, forceRefresh } = useCompanySettings();

  useEffect(() => {
    if (open) forceRefresh();
  }, [open, forceRefresh]);

  const isOperations = userRole === "operations";
  const isNonAdmin = userRole === "support" || userRole === "operations";

  const [formData, setFormData] = useState({
    invoice_number: "",
    auto_number: true,
    invoice_date: new Date().toISOString().split("T")[0],
    payment_terms: "net_30",
    due_date: "",
    customer_id: "",
    dispatch_id: "",
    notes: "",
    shipping_charge: 0,
    shipping_vat_applicable: false,
    shipping_vat_rate: 7.5,
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      description: "Delivery Service",
      item_type: "service",
      tonnage: "",
      quantity: 1,
      rate: 0,
      vat_rate: 0,
      vat_amount: 0,
      line_total: 0,
    },
  ]);

  // Auto-calculate due date from payment terms
  useEffect(() => {
    if (formData.payment_terms !== "custom" && formData.invoice_date) {
      const term = PAYMENT_TERMS.find((t) => t.value === formData.payment_terms);
      if (term && "days" in term && term.days) {
        const invoiceDate = new Date(formData.invoice_date);
        invoiceDate.setDate(invoiceDate.getDate() + term.days);
        setFormData((prev) => ({ ...prev, due_date: invoiceDate.toISOString().split("T")[0] }));
      } else if (formData.payment_terms === "on_receipt") {
        setFormData((prev) => ({ ...prev, due_date: formData.invoice_date }));
      }
    }
  }, [formData.payment_terms, formData.invoice_date]);

  useEffect(() => {
    if (open) {
      fetchCustomers();
      fetchDispatches();
    }
  }, [open]);

  const fetchCustomers = async () => {
    const { data } = await supabase.from("customers").select("id, company_name").order("company_name");
    setCustomers(data || []);
  };

  const fetchDispatches = async () => {
    const { data } = await supabase
      .from("dispatches")
      .select("id, dispatch_number, pickup_address, delivery_address, distance_km, cost")
      .eq("status", "delivered")
      .order("created_at", { ascending: false });
    setDispatches(data || []);
  };

  const handleDispatchSelect = (dispatchId: string) => {
    const dispatch = dispatches.find((d) => d.id === dispatchId);
    if (dispatch && dispatch.cost) {
      setFormData((prev) => ({ ...prev, dispatch_id: dispatchId }));
      setLineItems((prev) =>
        prev.map((item, index) =>
          index === 0
            ? {
                ...item,
                rate: dispatch.cost || 0,
                dispatch_id: dispatchId,
                description: `Delivery: ${dispatch.pickup_address.split(",")[0]} → ${dispatch.delivery_address.split(",")[0]}`,
                vat_amount: 0,
                line_total: dispatch.cost || 0,
              }
            : item
        )
      );
    } else {
      setFormData((prev) => ({ ...prev, dispatch_id: dispatchId }));
    }
  };

  const addLineItem = (type: LineItem["item_type"]) => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: itemTypeConfig[type].label,
        item_type: type,
        tonnage: "",
        quantity: 1,
        rate: 0,
        vat_rate: 0,
        vat_amount: 0,
        line_total: 0,
        dropoff_address: type === "extra_drop" ? "" : undefined,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) setLineItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, ...updates };
          const base = updated.quantity * updated.rate;
          updated.vat_amount = base * (updated.vat_rate / 100);
          updated.line_total = base + updated.vat_amount;
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = useCallback(() => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
    const totalVat = lineItems.reduce((sum, item) => sum + item.vat_amount, 0);
    const shippingVat = formData.shipping_vat_applicable
      ? formData.shipping_charge * (formData.shipping_vat_rate / 100)
      : 0;
    const grandTotal = subtotal + totalVat + formData.shipping_charge + shippingVat;
    return { subtotal, totalVat, shippingVat, grandTotal };
  }, [lineItems, formData.shipping_charge, formData.shipping_vat_applicable, formData.shipping_vat_rate]);

  const generateInvoiceNumber = async (): Promise<string> => {
    const year = new Date().getFullYear();
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

  const handleSubmit = async () => {
    if (!formData.customer_id) {
      toast({ title: "Validation Error", description: "Please select a customer", variant: "destructive" });
      return;
    }
    if (lineItems.every((item) => item.rate === 0)) {
      toast({ title: "Validation Error", description: "Please add at least one line item with a rate", variant: "destructive" });
      return;
    }

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
          invoice_number: invoiceNumber,
          customer_id: formData.customer_id,
          dispatch_id: formData.dispatch_id || null,
          amount: subtotal,
          subtotal: subtotal,
          tax_amount: totalVat + shippingVat,
          total_amount: grandTotal,
          balance_due: grandTotal,
          amount_paid: 0,
          tax_type: totalVat > 0 ? "exclusive" : "none",
          invoice_date: formData.invoice_date,
          due_date: formData.due_date || null,
          payment_terms: formData.payment_terms,
          shipping_charge: formData.shipping_charge,
          shipping_vat_rate: formData.shipping_vat_applicable ? formData.shipping_vat_rate : 0,
          shipping_vat_amount: shippingVat,
          notes: formData.notes || null,
          status: "draft",
          is_posted: false,
          created_by: user?.id,
          currency_code: "NGN",
          organization_id: organizationId,
        };

        if (isNonAdmin) {
          insertData.approval_status = "pending_first_approval";
          insertData.submitted_by = user?.id;
        }
        return insertData;
      };

      // Insert with automatic retry on per-organization unique-number collision
      // (Postgres error code 23505). Only retries when auto-numbering is on —
      // manual numbers surface the duplicate error so the user can correct it.
      const MAX_INVOICE_ATTEMPTS = 5;
      let invoice: any = null;
      let lastInvoiceError: any = null;
      let insertDataUsed: Record<string, unknown> = {};

      for (let attempt = 0; attempt < MAX_INVOICE_ATTEMPTS; attempt++) {
        const invoiceNumber = formData.auto_number
          ? await generateInvoiceNumber()
          : formData.invoice_number;
        const insertData = buildInsert(invoiceNumber);
        insertDataUsed = insertData;

        const { data, error } = await supabase
          .from("invoices")
          .insert(insertData as never)
          .select()
          .single();

        if (!error) {
          invoice = data;
          lastInvoiceError = null;
          break;
        }

        const isUniqueViolation =
          (error as any)?.code === "23505" ||
          /duplicate key|unique constraint/i.test(error.message || "");

        if (isUniqueViolation && formData.auto_number) {
          // Collision under concurrent inserts — regenerate and retry.
          lastInvoiceError = error;
          await new Promise((r) => setTimeout(r, 50 + Math.floor(Math.random() * 100)));
          continue;
        }
        throw error;
      }

      if (!invoice) {
        throw lastInvoiceError ?? new Error("Failed to allocate a unique invoice number after retries");
      }

      const insertData = insertDataUsed;

      if (invoice) {
        const lineItemsToInsert = lineItems.map((item, index) => ({
          invoice_id: invoice.id,
          description: item.description,
          item_type: item.item_type,
          tonnage: item.tonnage || null,
          quantity: item.quantity,
          unit_price: item.rate,
          rate: item.rate,
          amount: item.quantity * item.rate,
          vat_rate: item.vat_rate,
          vat_amount: item.vat_amount,
          line_total: item.line_total,
          dropoff_address: item.dropoff_address || null,
          dispatch_id: item.dispatch_id || null,
          sequence_order: index + 1,
        }));

        await supabase.from("invoice_line_items").insert(lineItemsToInsert);

        await logChange({
          table_name: "invoices",
          record_id: invoice.id,
          action: "insert",
          new_data: { ...insertData, line_items_count: lineItemsToInsert.length },
        });
      }

      toast({
        title: "Success",
        description: isNonAdmin ? "Invoice submitted for approval" : "Invoice created as draft",
      });

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create invoice";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: "",
      auto_number: true,
      invoice_date: new Date().toISOString().split("T")[0],
      payment_terms: "net_30",
      due_date: "",
      customer_id: "",
      dispatch_id: "",
      notes: "",
      shipping_charge: 0,
      shipping_vat_applicable: false,
      shipping_vat_rate: 7.5,
    });
    setLineItems([{
      id: crypto.randomUUID(),
      description: "Delivery Service",
      item_type: "service",
      tonnage: "",
      quantity: 1,
      rate: 0,
      vat_rate: 0,
      vat_amount: 0,
      line_total: 0,
    }]);
  };

  const { subtotal, totalVat, shippingVat, grandTotal } = calculateTotals();
  const selectedCustomer = customers.find((c) => c.id === formData.customer_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1100px] max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Create New Invoice
          </DialogTitle>
          <DialogDescription>
            {isOperations ? "Invoice will be submitted for admin approval." : "Generate an ERP-grade invoice with itemized charges."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form Side - 3 cols */}
          <ScrollArea className="h-[65vh] pr-4 lg:col-span-3">
            <div className="space-y-5">
              {/* Invoice Number Control */}
              <div className="p-4 bg-secondary/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Invoice Number</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Auto-generate</span>
                    <Switch
                      checked={formData.auto_number}
                      onCheckedChange={(checked) => setFormData((p) => ({ ...p, auto_number: checked }))}
                    />
                  </div>
                </div>
                {!formData.auto_number && (
                  <Input
                    value={formData.invoice_number}
                    onChange={(e) => setFormData((p) => ({ ...p, invoice_number: e.target.value }))}
                    placeholder="e.g. RA-2026-0001"
                    className="bg-background/50"
                  />
                )}
                {formData.auto_number && (
                  <p className="text-xs text-muted-foreground">Number will be auto-generated on creation (RA-YYYY-XXXX)</p>
                )}
              </div>

              {/* Customer & Dispatch */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData((p) => ({ ...p, customer_id: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Link to Delivery</Label>
                  <Select value={formData.dispatch_id} onValueChange={handleDispatchSelect}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      {dispatches.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.dispatch_number} - {d.pickup_address.split(",")[0]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Invoice Date, Terms, Due Date */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Invoice Date</Label>
                  <Input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData((p) => ({ ...p, invoice_date: e.target.value }))}
                    className="bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={formData.payment_terms} onValueChange={(v) => setFormData((p) => ({ ...p, payment_terms: v }))}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData((p) => ({ ...p, due_date: e.target.value, payment_terms: "custom" }))}
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">Line Items</Label>
                  <div className="flex gap-1">
                    {(["extra_drop", "fuel_surcharge", "toll_fee", "other"] as const).map((type) => {
                      const cfg = itemTypeConfig[type];
                      const Icon = cfg.icon;
                      return (
                        <Button key={type} type="button" variant="outline" size="sm" onClick={() => addLineItem(type)} className="text-xs">
                          <Icon className="w-3 h-3 mr-1" />{cfg.label.split(" ")[0]}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium px-3">
                  <div className="col-span-2">Tonnage</div>
                  <div className="col-span-3">Description</div>
                  <div className="col-span-1">Qty</div>
                  <div className="col-span-2">Rate</div>
                  <div className="col-span-1">VAT %</div>
                  <div className="col-span-1">VAT</div>
                  <div className="col-span-1">Total</div>
                  <div className="col-span-1"></div>
                </div>

                {lineItems.map((item) => (
                  <div key={item.id} className="p-3 bg-secondary/20 rounded-lg space-y-2">
                    <div className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-2">
                        <Select value={item.tonnage} onValueChange={(v) => updateLineItem(item.id, { tonnage: v })}>
                          <SelectTrigger className="bg-background/50 text-xs h-8"><SelectValue placeholder="Tonnage" /></SelectTrigger>
                          <SelectContent>
                            {TONNAGE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        <Input value={item.description} onChange={(e) => updateLineItem(item.id, { description: e.target.value })} className="bg-background/50 text-xs h-8" placeholder="Description" />
                      </div>
                      <div className="col-span-1">
                        <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(item.id, { quantity: parseInt(e.target.value) || 1 })} className="bg-background/50 text-xs h-8" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" value={item.rate || ""} onChange={(e) => updateLineItem(item.id, { rate: parseFloat(e.target.value) || 0 })} className="bg-background/50 text-xs h-8" placeholder="Rate" />
                      </div>
                      <div className="col-span-1">
                        <Select value={String(item.vat_rate)} onValueChange={(v) => updateLineItem(item.id, { vat_rate: parseFloat(v) })}>
                          <SelectTrigger className="bg-background/50 text-xs h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0%</SelectItem>
                            <SelectItem value="5">5%</SelectItem>
                            <SelectItem value="7.5">7.5%</SelectItem>
                            <SelectItem value="20">20%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 text-xs text-right font-medium text-muted-foreground">
                        {item.vat_amount > 0 ? `₦${item.vat_amount.toLocaleString()}` : "-"}
                      </div>
                      <div className="col-span-1 text-xs text-right font-semibold">
                        ₦{item.line_total.toLocaleString()}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {lineItems.length > 1 && (
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(item.id)} className="h-6 w-6 p-0 text-destructive">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {item.item_type === "extra_drop" && (
                      <Input value={item.dropoff_address || ""} onChange={(e) => updateLineItem(item.id, { dropoff_address: e.target.value })} placeholder="Drop-off address" className="bg-background/50 text-xs" />
                    )}
                  </div>
                ))}
              </div>

              {/* Shipping Charge */}
              <div className="p-4 bg-secondary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold flex items-center gap-2">
                    <Ship className="w-4 h-4" /> Shipping Charge
                  </Label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount</Label>
                    <Input
                      type="number"
                      value={formData.shipping_charge || ""}
                      onChange={(e) => setFormData((p) => ({ ...p, shipping_charge: parseFloat(e.target.value) || 0 }))}
                      className="bg-background/50"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Apply VAT</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Switch
                        checked={formData.shipping_vat_applicable}
                        onCheckedChange={(c) => setFormData((p) => ({ ...p, shipping_vat_applicable: c }))}
                      />
                      <span className="text-xs text-muted-foreground">{formData.shipping_vat_applicable ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  {formData.shipping_vat_applicable && (
                    <div className="space-y-1">
                      <Label className="text-xs">VAT Rate %</Label>
                      <Select value={String(formData.shipping_vat_rate)} onValueChange={(v) => setFormData((p) => ({ ...p, shipping_vat_rate: parseFloat(v) }))}>
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
                <Input value={formData.notes} onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." className="bg-secondary/50" />
              </div>
            </div>
          </ScrollArea>

          {/* Preview Side - 2 cols */}
          <div className="bg-background rounded-lg border border-border p-4 h-[65vh] overflow-auto lg:col-span-2">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start border-b border-border pb-3">
                <div>
                  {companySettings?.logo_url ? (
                    <img src={companySettings.logo_url} alt="Logo" className="h-8 object-contain mb-1" />
                  ) : (
                    <h3 className="font-heading font-bold text-sm">{companySettings?.company_name || "Your Company"}</h3>
                  )}
                  {companySettings?.tagline && <p className="text-[10px] text-muted-foreground">{companySettings.tagline}</p>}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[10px] mb-1">DRAFT</Badge>
                  <p className="font-mono text-xs font-medium">
                    {formData.auto_number ? `INV-${new Date().getFullYear()}-####` : formData.invoice_number || "-"}
                  </p>
                </div>
              </div>

              {/* Bill To & Details */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground mb-0.5">BILL TO</p>
                  <p className="font-medium">{selectedCustomer?.company_name || "Select Customer"}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Date: {formData.invoice_date}</p>
                  <p className="text-muted-foreground">Due: {formData.due_date || "-"}</p>
                  <p className="text-muted-foreground">Terms: {PAYMENT_TERMS.find((t) => t.value === formData.payment_terms)?.label}</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border rounded overflow-hidden">
                <table className="w-full text-[10px]">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-1.5">Tonnage</th>
                      <th className="text-left p-1.5">Description</th>
                      <th className="text-right p-1.5">Qty</th>
                      <th className="text-right p-1.5">Rate</th>
                      <th className="text-right p-1.5">VAT</th>
                      <th className="text-right p-1.5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-t border-border/50">
                        <td className="p-1.5">{item.tonnage || "-"}</td>
                        <td className="p-1.5">{item.description}</td>
                        <td className="p-1.5 text-right">{item.quantity}</td>
                        <td className="p-1.5 text-right">₦{item.rate.toLocaleString()}</td>
                        <td className="p-1.5 text-right">{item.vat_rate > 0 ? `${item.vat_rate}%` : "-"}</td>
                        <td className="p-1.5 text-right font-medium">₦{item.line_total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="border-t border-border pt-2 space-y-1 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₦{subtotal.toLocaleString()}</span></div>
                {totalVat > 0 && <div className="flex justify-between"><span className="text-muted-foreground">VAT</span><span>₦{totalVat.toLocaleString()}</span></div>}
                {formData.shipping_charge > 0 && (
                  <>
                    <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>₦{formData.shipping_charge.toLocaleString()}</span></div>
                    {shippingVat > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Shipping VAT ({formData.shipping_vat_rate}%)</span><span>₦{shippingVat.toLocaleString()}</span></div>}
                  </>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-sm">
                  <span>Grand Total</span>
                  <span>₦{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Balance Due</span>
                  <span>₦{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Bank Details */}
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

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : isOperations ? "Submit for Approval" : "Create Draft Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
