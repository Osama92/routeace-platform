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
import { Download, CloudUpload, Loader2, FileText, Printer, Lock, Coins, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import InvoiceStablecoinPayment from "@/components/stablecoin/InvoiceStablecoinPayment";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveErp } from "@/hooks/useActiveErp";

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
  customers?: { company_name: string; address?: string };
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

const fmtCur = (n: number) =>
  new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const statusColors: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  posted: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  draft: "bg-muted text-muted-foreground",
  partially_paid: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const paymentTermLabel: Record<string, string> = {
  on_receipt: "Due on Receipt",
  net_7: "Net 7",
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
};

export const InvoicePreviewDialog = ({ invoice, open, onClose, onStatusUpdate }: InvoicePreviewDialogProps) => {
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [showStablecoinPayment, setShowStablecoinPayment] = useState(false);
  const { toast } = useToast();
  const { settings: cs, forceRefresh } = useCompanySettings();
  const { user, hasAnyRole } = useAuth();
  const { erps: activeErps, primaryErp } = useActiveErp();

  useEffect(() => { if (open) forceRefresh(); }, [open, forceRefresh]);

  useEffect(() => {
    if (invoice?.id) {
      supabase.from("invoice_line_items").select("*").eq("invoice_id", invoice.id).order("sequence_order").then(({ data }) => {
        setLineItems(data || []);
      });
    }
  }, [invoice?.id]);

  if (!invoice) return null;

  const companyName = cs?.company_name || "My Company";
  const companyAddress = cs?.address || "";
  const companyPhone = cs?.phone || "";
  const companyEmail = cs?.email || "";
  const bankName = cs?.bank_name || "";
  const bankAccountName = cs?.bank_account_name || "";
  const bankAccountNumber = cs?.bank_account_number || "";

  const subtotal = invoice.subtotal ?? invoice.amount;
  const taxAmount = invoice.tax_amount ?? 0;
  const shippingCharge = invoice.shipping_charge ?? 0;
  const shippingVatAmount = invoice.shipping_vat_amount ?? 0;
  const grandTotal = invoice.total_amount;
  const balanceDue = invoice.balance_due ?? grandTotal;
  const amountPaid = invoice.amount_paid ?? 0;
  const displayTerms = paymentTermLabel[invoice.payment_terms || ""] || invoice.payment_terms || "Due on Receipt";
  const invoiceDateFmt = invoice.invoice_date
    ? format(new Date(invoice.invoice_date), "d MMMM yyyy")
    : format(new Date(invoice.created_at), "d MMMM yyyy");
  const dueDateFmt = invoice.due_date ? format(new Date(invoice.due_date), "d MMMM yyyy") : invoiceDateFmt;

  const displayItems: LineItem[] = lineItems.length > 0
    ? lineItems
    : [{ id: "1", description: "Logistics / Delivery Service", tonnage: "-", quantity: 1, unit_price: invoice.amount, rate: invoice.amount, vat_rate: 0, vat_amount: 0, line_total: invoice.amount, amount: invoice.amount }];

  // ─── PDF generation matching Glyde invoice style ─────────────────────────
  const generatePDF = async (): Promise<jsPDF> => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const marginL = 15;
    const marginR = W - 15;
    let y = 15;

    // ── Logo (top-left) ──────────────────────────────────────────────────────
    if (cs?.logo_url) {
      try {
        const resp = await fetch(cs.logo_url);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
        const ext = cs.logo_url.split(".").pop()?.toUpperCase() as "PNG" | "JPEG" | "JPG" || "PNG";
        doc.addImage(dataUrl, ext === "JPG" ? "JPEG" : ext, marginL, y, 30, 30);
      } catch { /* skip if logo fails */ }
    }

    // ── Company details (below logo) ─────────────────────────────────────────
    let companyY = y + 35;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    doc.text(companyName, marginL, companyY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    if (companyAddress) {
      const addrLines = doc.splitTextToSize(companyAddress, 80);
      addrLines.forEach((line: string) => { companyY += 4.5; doc.text(line, marginL, companyY); });
    }
    if (companyPhone) { companyY += 4.5; doc.text(companyPhone, marginL, companyY); }
    if (companyEmail) { companyY += 4.5; doc.text(companyEmail, marginL, companyY); }

    // ── "Invoice" title (top-right) ──────────────────────────────────────────
    doc.setFont("helvetica", "normal");
    doc.setFontSize(36);
    doc.setTextColor(60, 60, 60);
    doc.text("Invoice", marginR, y + 12, { align: "right" });

    // Invoice # and Balance Due (right column)
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`# ${invoice.invoice_number}`, marginR, y + 22, { align: "right" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Balance Due", marginR, y + 32, { align: "right" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(`NGN${fmtCur(balanceDue)}`, marginR, y + 41, { align: "right" });

    // ── Divider ──────────────────────────────────────────────────────────────
    y = Math.max(companyY, y + 48) + 6;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginL, y, marginR, y);
    y += 8;

    // ── Bill To (left) + Invoice meta (right) ────────────────────────────────
    const metaLeft = 120;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    doc.text(invoice.customers?.company_name || "N/A", marginL, y + 6);

    // Right column: date / terms / due
    const metaRows: [string, string][] = [
      ["Invoice Date :", invoiceDateFmt],
      ["Terms :", displayTerms],
      ["Due Date :", dueDateFmt],
    ];
    metaRows.forEach(([label, val], i) => {
      const ry = y + i * 6;
      doc.setTextColor(120, 120, 120);
      doc.text(label, metaLeft, ry);
      doc.setTextColor(40, 40, 40);
      doc.text(val, marginR, ry, { align: "right" });
    });
    y += 18;

    // ── Delivery details (if linked to dispatch) ─────────────────────────────
    if (invoice.dispatches) {
      y += 4;
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text(`From: ${invoice.dispatches.pickup_address}`, marginL, y);
      doc.text(`To: ${invoice.dispatches.delivery_address}`, marginL, y + 5);
      y += 12;
    }

    // ── Line items table ─────────────────────────────────────────────────────
    const tableBody = displayItems.map((item, idx) => {
      const desc = item.tonnage && item.tonnage !== "-"
        ? `${item.tonnage}\n${item.description}`
        : item.description;
      return [
        String(idx + 1),
        desc,
        String(item.quantity),
        `${fmtCur(item.rate ?? item.unit_price)}`,
        `${fmtCur(item.line_total ?? item.amount)}`,
      ];
    });

    autoTable(doc, {
      startY: y,
      head: [["#", "Description", "Qty", "Rate", "Amount"]],
      body: tableBody,
      theme: "plain",
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [80, 80, 80],
        fontSize: 9,
        fontStyle: "normal",
        lineWidth: { bottom: 0.3 },
        lineColor: [210, 210, 210],
      },
      bodyStyles: { fontSize: 9, textColor: [50, 50, 50] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 15, halign: "center" },
        3: { cellWidth: 35, halign: "right" },
        4: { cellWidth: 35, halign: "right" },
      },
      alternateRowStyles: { fillColor: [252, 252, 252] },
      margin: { left: marginL, right: 15 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;

    // ── Totals (right-aligned block) ─────────────────────────────────────────
    const totColL = 130;
    const totColR = marginR;
    const totLineH = 6;

    const totRows: [string, string][] = [
      ["Sub Total", `${fmtCur(subtotal)}`],
    ];
    if (taxAmount > 0) {
      const vatPct = subtotal > 0 ? ((taxAmount / subtotal) * 100).toFixed(1) : "7.5";
      totRows.push([`VAT (${vatPct}%)`, `${fmtCur(taxAmount)}`]);
    }
    if (shippingCharge > 0) totRows.push(["Shipping", `${fmtCur(shippingCharge)}`]);
    if (shippingVatAmount > 0) totRows.push([`Shipping VAT (${invoice.shipping_vat_rate}%)`, `${fmtCur(shippingVatAmount)}`]);

    doc.setFontSize(9);
    totRows.forEach(([label, val]) => {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(label, totColL, y);
      doc.setTextColor(40, 40, 40);
      doc.text(val, totColR, y, { align: "right" });
      y += totLineH;
    });

    // Total line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(totColL, y, totColR, y);
    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("Total", totColL, y);
    doc.text(`NGN${fmtCur(grandTotal)}`, totColR, y, { align: "right" });
    y += totLineH;

    // Balance Due
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Balance Due", totColL, y);
    doc.text(`NGN${fmtCur(balanceDue)}`, totColR, y, { align: "right" });
    y += 12;

    // ── Bank / Payment details ───────────────────────────────────────────────
    if (bankAccountNumber) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`Account Number: ${bankAccountNumber}`, marginL, y);
      y += 5;
      if (bankAccountName) { doc.text(`Account Name: ${bankAccountName}`, marginL, y); y += 5; }
      if (bankName) { doc.text(`Bank Name: ${bankName}`, marginL, y); y += 5; }
    }

    // ── Notes ────────────────────────────────────────────────────────────────
    if (invoice.notes) {
      y += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      const noteLines = doc.splitTextToSize(`Notes: ${invoice.notes}`, W - 30);
      noteLines.forEach((line: string) => { doc.text(line, marginL, y); y += 4.5; });
    }

    // ── Signature ────────────────────────────────────────────────────────────
    if (cs?.signature_url) {
      try {
        const resp = await fetch(cs.signature_url);
        const blob = await resp.blob();
        const dataUrl = await new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.onerror = rej;
          fr.readAsDataURL(blob);
        });
        const sigY = Math.max(y + 8, 240);
        doc.addImage(dataUrl, "PNG", marginL, sigY, 35, 18);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`For ${companyName}`, marginL, sigY + 22);
      } catch { /* skip if signature fails */ }
    }

    // ── Footer line ──────────────────────────────────────────────────────────
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(marginL, 285, marginR, 285);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(160, 160, 160);
    doc.text(`${invoice.invoice_number} · Generated by RouteAce`, 105, 289, { align: "center" });

    return doc;
  };

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

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const doc = await generatePDF();
      doc.save(`${invoice.invoice_number}.pdf`);
      toast({ title: "Downloaded", description: `Invoice ${invoice.invoice_number} downloaded` });
    } catch { toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" }); }
    finally { setDownloading(false); }
  };

  const handlePrint = async () => {
    try {
      const doc = await generatePDF();
      doc.autoPrint();
      window.open(doc.output("bloburl"), "_blank");
    } catch { toast({ title: "Error", description: "Failed to prepare print", variant: "destructive" }); }
  };

  const handleSyncToErp = async (erp?: typeof primaryErp) => {
    const target = erp ?? primaryErp;
    if (!target) {
      toast({ title: "No ERP Connected", description: "Go to Settings → ERP Integrations to connect an accounting system.", variant: "destructive" });
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke(target.syncFn, {
        body: { action: "sync_invoice", invoiceId: invoice.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: `Synced to ${target.name}`, description: `Invoice ${invoice.invoice_number} pushed successfully` });
        onStatusUpdate?.();
      } else throw new Error(data?.error ?? "Sync failed");
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || `Failed to sync to ${target.name}`, variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const isPosted = invoice.is_posted;
  const canPost = !isPosted && invoice.status === "draft" && hasAnyRole(["admin", "finance_manager"]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Invoice Preview
            {isPosted && <Lock className="w-3.5 h-3.5 text-amber-500" />}
          </DialogTitle>
          <DialogDescription className="text-xs">Review before downloading, posting, or syncing to ERP</DialogDescription>
        </DialogHeader>

        {/* ── Invoice document preview ── */}
        <div className="px-6 py-5">
          <div className="border rounded-xl overflow-hidden bg-white text-gray-800 shadow-sm" style={{ fontFamily: "sans-serif" }}>
            {/* Top section */}
            <div className="p-8 pb-0">
              <div className="flex justify-between items-start">
                {/* Left: logo + company */}
                <div className="space-y-3">
                  {cs?.logo_url ? (
                    <img src={cs.logo_url} alt="Logo" className="h-16 object-contain" />
                  ) : (
                    <div className="text-lg font-bold text-gray-800">{companyName}</div>
                  )}
                  <div className="text-xs text-gray-500 leading-5 mt-2">
                    <div className="font-semibold text-gray-700">{companyName}</div>
                    {companyAddress && <div>{companyAddress}</div>}
                    {companyPhone && <div>{companyPhone}</div>}
                    {companyEmail && <div>{companyEmail}</div>}
                  </div>
                </div>

                {/* Right: Invoice title + balance */}
                <div className="text-right">
                  <div className="text-4xl font-light text-gray-500 mb-2">Invoice</div>
                  <div className="text-sm font-semibold text-gray-600"># {invoice.invoice_number}</div>
                  <div className="mt-3 text-xs text-gray-500">Balance Due</div>
                  <div className="text-xl font-bold text-gray-800">NGN{fmtCur(balanceDue)}</div>
                </div>
              </div>

              <div className="border-t border-gray-200 mt-6 mb-0" />

              {/* Bill To + invoice meta */}
              <div className="flex justify-between items-start py-5">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Bill To</div>
                  <div className="font-semibold text-sm text-gray-700">{invoice.customers?.company_name || "N/A"}</div>
                  {invoice.customers?.address && (
                    <div className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{invoice.customers.address}</div>
                  )}
                </div>
                <div className="text-xs text-right space-y-1">
                  <div className="flex gap-8 justify-end">
                    <span className="text-gray-400">Invoice Date :</span>
                    <span className="text-gray-700 font-medium">{invoiceDateFmt}</span>
                  </div>
                  <div className="flex gap-8 justify-end">
                    <span className="text-gray-400">Terms :</span>
                    <span className="text-gray-700 font-medium">{displayTerms}</span>
                  </div>
                  <div className="flex gap-8 justify-end">
                    <span className="text-gray-400">Due Date :</span>
                    <span className="text-gray-700 font-medium">{dueDateFmt}</span>
                  </div>
                  {invoice.paid_date && (
                    <div className="flex gap-8 justify-end">
                      <span className="text-gray-400">Paid :</span>
                      <span className="text-emerald-600 font-medium">{format(new Date(invoice.paid_date), "d MMMM yyyy")}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery details */}
              {invoice.dispatches && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                  <div><span className="text-gray-400">From: </span>{invoice.dispatches.pickup_address}</div>
                  <div><span className="text-gray-400">To: </span>{invoice.dispatches.delivery_address}</div>
                </div>
              )}
            </div>

            {/* Line items table */}
            <div className="px-8">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-500">
                    <th className="text-center p-2 font-medium w-8">#</th>
                    <th className="text-left p-2 font-medium">Description</th>
                    <th className="text-center p-2 font-medium w-12">Qty</th>
                    <th className="text-right p-2 font-medium w-28">Rate</th>
                    <th className="text-right p-2 font-medium w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item, idx) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="text-center p-2 text-gray-400">{idx + 1}</td>
                      <td className="p-2 text-gray-700">
                        {item.tonnage && item.tonnage !== "-" && (
                          <span className="font-semibold block">{item.tonnage}</span>
                        )}
                        <span>{item.description}</span>
                      </td>
                      <td className="text-center p-2 text-gray-600 tabular-nums">{item.quantity}.00</td>
                      <td className="text-right p-2 tabular-nums text-gray-600">
                        {fmtCur(item.rate ?? item.unit_price)}
                      </td>
                      <td className="text-right p-2 tabular-nums font-medium text-gray-700">
                        {fmtCur(item.line_total ?? item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals + bank + signature */}
            <div className="px-8 py-6 flex gap-8">
              {/* Bank details (left) */}
              <div className="flex-1 text-xs text-gray-500 space-y-0.5">
                {bankAccountNumber && (
                  <>
                    <div>Account Number: {bankAccountNumber}</div>
                    {bankAccountName && <div>Account Name: {bankAccountName.toUpperCase()}</div>}
                    {bankName && <div>Bank Name: {bankName}</div>}
                  </>
                )}
                {invoice.notes && (
                  <div className="mt-3 text-gray-400 italic">{invoice.notes}</div>
                )}
              </div>

              {/* Totals (right) */}
              <div className="w-56 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-500">
                  <span>Sub Total</span>
                  <span className="tabular-nums">{fmtCur(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>VAT ({subtotal > 0 ? ((taxAmount / subtotal) * 100).toFixed(1) : "7.5"}%)</span>
                    <span className="tabular-nums">{fmtCur(taxAmount)}</span>
                  </div>
                )}
                {shippingCharge > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping</span>
                    <span className="tabular-nums">{fmtCur(shippingCharge)}</span>
                  </div>
                )}
                {shippingVatAmount > 0 && (
                  <div className="flex justify-between text-gray-500">
                    <span>Shipping VAT ({invoice.shipping_vat_rate}%)</span>
                    <span className="tabular-nums">{fmtCur(shippingVatAmount)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1.5 flex justify-between font-bold text-sm text-gray-800">
                  <span>Total</span>
                  <span className="tabular-nums">NGN{fmtCur(grandTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-gray-700">
                  <span>Balance Due</span>
                  <span className="tabular-nums">NGN{fmtCur(balanceDue)}</span>
                </div>
                {amountPaid > 0 && (
                  <div className="flex justify-between text-emerald-600 text-[11px]">
                    <span>Amount Paid</span>
                    <span className="tabular-nums">{fmtCur(amountPaid)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Signature */}
            {cs?.signature_url && (
              <div className="px-8 pb-8">
                <img src={cs.signature_url} alt="Authorized signature" className="h-14 object-contain" />
                <div className="text-xs text-gray-500 mt-1">For {companyName}</div>
              </div>
            )}

            {/* Footer rule */}
            <div className="border-t border-gray-200 mx-8 mb-5" />
            <div className="text-center text-[10px] text-gray-400 pb-5">
              {invoice.invoice_number} · Generated by RouteAce
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Badge variant="outline" className={`text-xs capitalize ${statusColors[invoice.status] || ""}`}>
              {isPosted ? "POSTED" : (invoice.status || "draft").toUpperCase()}
            </Badge>
            {invoice.zoho_synced_at && (
              <span className="text-xs text-muted-foreground">✓ Synced {format(new Date(invoice.zoho_synced_at), "d MMM yyyy")}</span>
            )}
          </div>
          {canPost && (
            <Button onClick={handlePostInvoice} disabled={posting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {posting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
              Post Invoice
            </Button>
          )}
          <Button variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-2" />Print</Button>
          <Button variant="outline" onClick={handleDownload} disabled={downloading}>
            {downloading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Download PDF
          </Button>
          {activeErps.length === 0 ? (
            <Button variant="outline" onClick={() => window.location.href = "/erp-integrations"} disabled={syncing}>
              <CloudUpload className="w-4 h-4 mr-2" />Connect ERP
            </Button>
          ) : activeErps.length === 1 ? (
            <Button onClick={() => handleSyncToErp(activeErps[0])} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              Sync to {activeErps[0].name}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={syncing}>
                  {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
                  Sync to ERP <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {activeErps.map(erp => (
                  <DropdownMenuItem key={erp.id} onClick={() => handleSyncToErp(erp)}>
                    <span className="mr-2">{erp.logo}</span>{erp.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
