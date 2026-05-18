import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, CloudUpload, Loader2, FileText, Printer, Lock, Unlock, Coins } from "lucide-react";
import { format } from "date-fns";
import InvoiceStablecoinPayment from "@/components/stablecoin/InvoiceStablecoinPayment";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  dispatch_id: string | null;
  amount: number;
  subtotal?: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  is_posted?: boolean;
  invoice_date?: string;
  due_date: string | null;
  paid_date: string | null;
  payment_terms?: string;
  shipping_charge?: number;
  shipping_vat_rate?: number;
  shipping_vat_amount?: number;
  balance_due?: number;
  amount_paid?: number;
  notes: string | null;
  created_at: string;
  zoho_invoice_id?: string | null;
  zoho_synced_at?: string | null;
  customers?: { company_name: string };
  dispatches?: { pickup_address: string; delivery_address: string; distance_km: number | null } | null;
}

interface LineItem {
  id: string;
  description: string;
  tonnage?: string;
  quantity: number;
  unit_price: number;
  rate?: number;
  vat_rate?: number;
  vat_amount?: number;
  line_total?: number;
  amount: number;
}

interface InvoicePreviewDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 2 }).format(amount);

const statusColors: Record<string, string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  posted: "bg-primary/15 text-primary",
  overdue: "bg-destructive/15 text-destructive",
  draft: "bg-muted text-muted-foreground",
  partially_paid: "bg-info/15 text-info",
  cancelled: "bg-destructive/15 text-destructive",
};

export const InvoicePreviewDialog = ({ invoice, open, onClose, onStatusUpdate }: InvoicePreviewDialogProps) => {
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showStablecoinPayment, setShowStablecoinPayment] = useState(false);
  const { toast } = useToast();
  const { settings: companySettings, forceRefresh } = useCompanySettings();
  const { user, hasAnyRole } = useAuth();

  useEffect(() => { if (open) forceRefresh(); }, [open, forceRefresh]);

  // Fetch line items when invoice changes
  useEffect(() => {
    if (invoice?.id) {
      supabase.from("invoice_line_items").select("*").eq("invoice_id", invoice.id).order("sequence_order").then(({ data }) => {
        setLineItems(data || []);
      });
    }
  }, [invoice?.id]);

  const companyName = companySettings?.company_name || "My Company";
  const tagline = companySettings?.tagline || "Professional Services";
  const companyEmail = companySettings?.email || "info@company.com";
  const companyPhone = companySettings?.phone || "+234 XXX XXX XXXX";
  const bankName = companySettings?.bank_name || "Bank Name";
  const bankAccountName = companySettings?.bank_account_name || "Account Name";
  const bankAccountNumber = companySettings?.bank_account_number || "0000000000";

  if (!invoice) return null;

  const handlePostInvoice = async () => {
    setPosting(true);
    try {
      const { error } = await supabase.from("invoices").update({
        is_posted: true,
        posted_by: user?.id,
        posted_at: new Date().toISOString(),
        status: "pending",
      }).eq("id", invoice.id);

      if (error) throw error;
      toast({ title: "Invoice Posted", description: "AR entry and ledger entries have been created automatically" });
      onStatusUpdate?.();
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to post invoice", variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(26, 54, 93);
    doc.rect(0, 0, 210, 45, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(companyName, 15, 20);
    doc.setFontSize(28);
    doc.text("INVOICE", 195, 20, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(tagline, 15, 30);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 195, 30, { align: "right" });
    doc.text(`Date: ${invoice.invoice_date ? format(new Date(invoice.invoice_date), "PPP") : format(new Date(invoice.created_at), "PPP")}`, 195, 37, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Bill To:", 15, 58);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(invoice.customers?.company_name || "N/A", 15, 66);

    const detailsX = 130;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Invoice Details", detailsX, 58);
    doc.setFont("helvetica", "normal");
    doc.text(`Due Date: ${invoice.due_date ? format(new Date(invoice.due_date), "PPP") : "On Receipt"}`, detailsX, 66);
    doc.text(`Status: ${(invoice.status || "draft").toUpperCase()}`, detailsX, 73);
    doc.text(`Terms: ${invoice.payment_terms || "Net 30"}`, detailsX, 80);

    let tableStartY = 95;
    if (invoice.dispatches) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Delivery Details", 15, 90);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`From: ${invoice.dispatches.pickup_address}`, 15, 98);
      doc.text(`To: ${invoice.dispatches.delivery_address}`, 15, 105);
      tableStartY = 120;
    }

    // Line items with tonnage and VAT
    const tableBody = lineItems.length > 0
      ? lineItems.map((item) => [
          item.tonnage || "-",
          item.description,
          String(item.quantity),
          formatCurrency(item.rate || item.unit_price),
          item.vat_rate ? `${item.vat_rate}%` : "-",
          formatCurrency(item.vat_amount || 0),
          formatCurrency(item.line_total || item.amount),
        ])
      : [["-", "Logistics / Delivery Service", "1", formatCurrency(invoice.amount), "-", "-", formatCurrency(invoice.amount)]];

    autoTable(doc, {
      startY: tableStartY,
      head: [["Tonnage", "Description", "Qty", "Rate", "VAT %", "VAT Amt", "Line Total"]],
      body: tableBody,
      theme: "striped",
      headStyles: { fillColor: [38, 103, 73], fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 15, right: 15 },
    });

    const totalsY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFillColor(245, 245, 245);
    doc.rect(120, totalsY, 75, 55, "F");
    doc.setFontSize(10);
    const sub = invoice.subtotal || invoice.amount;
    doc.text("Subtotal:", 125, totalsY + 10);
    doc.text(formatCurrency(sub), 190, totalsY + 10, { align: "right" });
    doc.text("VAT:", 125, totalsY + 18);
    doc.text(formatCurrency(invoice.tax_amount || 0), 190, totalsY + 18, { align: "right" });
    if ((invoice.shipping_charge || 0) > 0) {
      doc.text("Shipping:", 125, totalsY + 26);
      doc.text(formatCurrency(invoice.shipping_charge || 0), 190, totalsY + 26, { align: "right" });
      if ((invoice.shipping_vat_amount || 0) > 0) {
        doc.text("Shipping VAT:", 125, totalsY + 34);
        doc.text(formatCurrency(invoice.shipping_vat_amount || 0), 190, totalsY + 34, { align: "right" });
      }
    }
    doc.line(125, totalsY + 38, 190, totalsY + 38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Grand Total:", 125, totalsY + 46);
    doc.text(formatCurrency(invoice.total_amount), 190, totalsY + 46, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Balance Due:", 125, totalsY + 54);
    doc.text(formatCurrency(invoice.balance_due ?? invoice.total_amount), 190, totalsY + 54, { align: "right" });

    const paymentY = totalsY + 70;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Payment Information", 15, paymentY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Bank: ${bankName}`, 15, paymentY + 8);
    doc.text(`Account Name: ${bankAccountName}`, 15, paymentY + 15);
    doc.text(`Account Number: ${bankAccountNumber}`, 15, paymentY + 22);

    if (invoice.notes) {
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 15, paymentY + 35);
      doc.setFont("helvetica", "normal");
      doc.text(invoice.notes, 15, paymentY + 42);
    }

    doc.setFontSize(9);
    doc.setTextColor(128, 128, 128);
    doc.text("Thank you for your business!", 105, 270, { align: "center" });
    doc.text(`For inquiries, contact: ${companyEmail} | ${companyPhone}`, 105, 276, { align: "center" });

    return doc;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = generatePDF();
      doc.save(`${invoice.invoice_number}.pdf`);
      toast({ title: "Downloaded", description: `Invoice ${invoice.invoice_number} downloaded` });
    } catch { toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" }); }
    finally { setDownloading(false); }
  };

  const handlePrint = () => {
    const doc = generatePDF();
    doc.autoPrint();
    window.open(doc.output("bloburl"), "_blank");
  };

  const handleSyncToZoho = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("zoho-sync", { body: { action: "sync_invoice", invoiceId: invoice.id } });
      if (error) throw error;
      if (data.success) { toast({ title: "Synced to Zoho", description: `Invoice ${invoice.invoice_number} synced` }); onStatusUpdate?.(); }
      else throw new Error(data.error);
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to sync", variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const isPosted = invoice.is_posted;
  const canPost = !isPosted && invoice.status === "draft" && hasAnyRole(["admin", "finance_manager"]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Preview
            {isPosted && <Lock className="w-4 h-4 text-warning" />}
          </DialogTitle>
          <DialogDescription>Review invoice before downloading, posting, or syncing</DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg p-6 bg-background">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-primary">{companyName}</h2>
              <p className="text-sm text-muted-foreground">{tagline}</p>
            </div>
            <div className="text-right">
              <h3 className="text-xl font-bold">INVOICE</h3>
              <p className="text-sm text-muted-foreground">{invoice.invoice_number}</p>
              <Badge className={statusColors[invoice.status] || statusColors.draft}>
                {isPosted ? "POSTED" : (invoice.status || "draft").toUpperCase()}
              </Badge>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Bill To & Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Bill To</p>
              <p className="font-semibold">{invoice.customers?.company_name || "N/A"}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-muted-foreground">
                Date: {invoice.invoice_date ? format(new Date(invoice.invoice_date), "PPP") : format(new Date(invoice.created_at), "PPP")}
              </p>
              <p className="text-sm text-muted-foreground">
                Due: {invoice.due_date ? format(new Date(invoice.due_date), "PPP") : "On Receipt"}
              </p>
              <p className="text-sm text-muted-foreground">Terms: {invoice.payment_terms || "Net 30"}</p>
              {invoice.paid_date && <p className="text-sm text-success">Paid: {format(new Date(invoice.paid_date), "PPP")}</p>}
            </div>
          </div>

          {/* Delivery Details */}
          {invoice.dispatches && (
            <div className="bg-secondary/30 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium mb-2">Delivery Details</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">From:</p><p>{invoice.dispatches.pickup_address}</p></div>
                <div><p className="text-muted-foreground">To:</p><p>{invoice.dispatches.delivery_address}</p></div>
              </div>
            </div>
          )}

          {/* Line Items Table with Tonnage & VAT */}
          <div className="border rounded-lg overflow-hidden mb-6">
            <div className="bg-primary text-primary-foreground grid grid-cols-7 gap-2 p-3 text-xs font-medium">
              <div>Tonnage</div>
              <div className="col-span-2">Description</div>
              <div className="text-right">Qty</div>
              <div className="text-right">Rate</div>
              <div className="text-right">VAT</div>
              <div className="text-right">Total</div>
            </div>
            {(lineItems.length > 0 ? lineItems : [{ id: "1", description: "Logistics / Delivery", tonnage: "-", quantity: 1, unit_price: invoice.amount, rate: invoice.amount, vat_rate: 0, vat_amount: 0, line_total: invoice.amount, amount: invoice.amount }]).map((item) => (
              <div key={item.id} className="grid grid-cols-7 gap-2 p-3 text-sm border-b last:border-0">
                <div className="text-xs">{item.tonnage || "-"}</div>
                <div className="col-span-2 text-xs">{item.description}</div>
                <div className="text-right text-xs">{item.quantity}</div>
                <div className="text-right text-xs">{formatCurrency(item.rate || item.unit_price)}</div>
                <div className="text-right text-xs">{item.vat_rate ? `${item.vat_rate}%` : "-"}</div>
                <div className="text-right text-xs font-medium">{formatCurrency(item.line_total || item.amount)}</div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatCurrency(invoice.subtotal || invoice.amount)}</span>
              </div>
              {(invoice.tax_amount || 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>VAT:</span>
                  <span>{formatCurrency(invoice.tax_amount)}</span>
                </div>
              )}
              {(invoice.shipping_charge || 0) > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span>Shipping:</span>
                    <span>{formatCurrency(invoice.shipping_charge || 0)}</span>
                  </div>
                  {(invoice.shipping_vat_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Shipping VAT ({invoice.shipping_vat_rate}%):</span>
                      <span>{formatCurrency(invoice.shipping_vat_amount || 0)}</span>
                    </div>
                  )}
                </>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Grand Total:</span>
                <span>{formatCurrency(invoice.total_amount)}</span>
              </div>
              {(invoice.amount_paid || 0) > 0 && (
                <div className="flex justify-between text-sm text-success">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(invoice.amount_paid || 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base">
                <span>Balance Due:</span>
                <span>{formatCurrency(invoice.balance_due ?? invoice.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Notes:</p>
              <p className="text-sm text-muted-foreground">{invoice.notes}</p>
            </div>
          )}

          {invoice.zoho_synced_at && (
            <div className="mt-4 text-sm text-muted-foreground">✓ Synced to Zoho on {format(new Date(invoice.zoho_synced_at), "PPP")}</div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {canPost && (
            <Button onClick={handlePostInvoice} disabled={posting} className="bg-success text-success-foreground hover:bg-success/90">
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Post Invoice
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
          <Button onClick={handleSyncToZoho} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
            Sync to Zoho
          </Button>
          {invoice.status !== "paid" && (
            <Button variant="outline" onClick={() => setShowStablecoinPayment(true)}>
              <Coins className="w-4 h-4 mr-2" />Pay with Crypto
            </Button>
          )}
        </DialogFooter>

        <InvoiceStablecoinPayment
          open={showStablecoinPayment}
          onClose={() => setShowStablecoinPayment(false)}
          invoiceNumber={invoice.invoice_number}
          totalAmount={invoice.total_amount}
        />
      </DialogContent>
    </Dialog>
  );
};
