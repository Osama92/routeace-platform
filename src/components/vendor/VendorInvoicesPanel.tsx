import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, CheckCircle, XCircle, Sparkles, Loader2, ExternalLink, Send } from "lucide-react";

interface Vendor { id: string; company_name: string; }
interface VendorInvoice {
  id: string;
  organization_id: string;
  partner_id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  amount: number | null;
  currency: string | null;
  pdf_url: string;
  pdf_path: string | null;
  uploaded_by: string | null;
  uploaded_via: string;
  extracted_waybills: string[] | null;
  extracted_dispatches: string[] | null;
  match_score: number;
  match_status: string;
  match_details: any;
  approval_status: string;
  rejection_reason: string | null;
  finance_email_to: string | null;
  finance_email_sent_at: string | null;
  notes: string | null;
  created_at: string;
  partners?: { company_name: string };
}

interface Props {
  /** When set (vendor mode), restrict to this partner only and force vendor uploads */
  vendorPartnerId?: string;
  /** When set (vendor mode), force this organization */
  organizationId?: string;
  /** Hide approval UI (vendor view) */
  readOnly?: boolean;
}

export default function VendorInvoicesPanel({ vendorPartnerId, organizationId, readOnly }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoices, setInvoices] = useState<VendorInvoice[]>([]);
  const [vendorFilter, setVendorFilter] = useState<string>(vendorPartnerId || "all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string>(vendorPartnerId || "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [notes, setNotes] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [reviewing, setReviewing] = useState<VendorInvoice | null>(null);
  const [financeEmail, setFinanceEmail] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(organizationId || null);

  useEffect(() => { load(); }, [vendorFilter, statusFilter]);

  async function load() {
    if (!readOnly) {
      // staff mode - fetch vendors list
      const { data: orgs } = await supabase.from("organization_members").select("organization_id").eq("user_id", user?.id).eq("is_active", true).limit(1);
      const o = orgs?.[0]?.organization_id || null;
      if (o) setOrgId(o);
      const { data: vs } = await supabase.from("partners").select("id, company_name").eq("partner_type", "vendor").order("company_name");
      setVendors(vs || []);
    }

    let q = supabase.from("vendor_invoices").select("*, partners:partner_id(company_name)").order("created_at", { ascending: false });
    if (vendorFilter !== "all") q = q.eq("partner_id", vendorFilter);
    if (statusFilter !== "all") q = q.eq("approval_status", statusFilter);
    const { data, error } = await q;
    if (error) { toast({ title: "Failed to load", description: error.message, variant: "destructive" }); return; }
    setInvoices((data as any) || []);
  }

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    const partnerId = vendorPartnerId || selectedVendor;
    if (!file || !partnerId) { toast({ title: "Missing", description: "Choose a vendor and PDF", variant: "destructive" }); return; }
    if (!file.name.toLowerCase().endsWith(".pdf")) { toast({ title: "PDF only", variant: "destructive" }); return; }

    setUploading(true);
    try {
      // Resolve org for the partner if not known
      let resolvedOrg = orgId;
      if (!resolvedOrg) {
        const { data: p } = await supabase.from("partners").select("organization_id").eq("id", partnerId).maybeSingle();
        resolvedOrg = (p as any)?.organization_id || null;
      }
      if (!resolvedOrg) throw new Error("Cannot resolve organization");

      const path = `${resolvedOrg}/${partnerId}/${Date.now()}-${file.name.replace(/[^a-z0-9.\-_]/gi, "_")}`;
      const { error: upErr } = await supabase.storage.from("vendor-invoices").upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("vendor-invoices").getPublicUrl(path);

      const { data: inserted, error: insErr } = await supabase.from("vendor_invoices").insert({
        organization_id: resolvedOrg,
        partner_id: partnerId,
        invoice_number: invoiceNumber || null,
        invoice_date: invoiceDate || null,
        amount: amount ? parseFloat(amount) : null,
        pdf_url: pub.publicUrl,
        pdf_path: path,
        uploaded_by: user?.id,
        uploaded_via: readOnly ? "vendor" : "admin",
        notes: notes || null,
      }).select().single();
      if (insErr) throw insErr;

      // Trigger AI processing
      supabase.functions.invoke("vendor-invoice-process", { body: { invoice_id: inserted.id } }).catch(console.error);

      toast({ title: "Uploaded", description: "AI is reading & matching the invoice…" });
      setUploadOpen(false);
      setInvoiceNumber(""); setAmount(""); setInvoiceDate(""); setNotes("");
      if (fileRef.current) fileRef.current.value = "";
      setTimeout(load, 1500);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function reprocess(id: string) {
    toast({ title: "Re-reading invoice…" });
    await supabase.functions.invoke("vendor-invoice-process", { body: { invoice_id: id } });
    setTimeout(load, 1500);
  }

  async function decide(decision: "approved" | "rejected") {
    if (!reviewing) return;
    if (decision === "approved" && !financeEmail) { toast({ title: "Finance email required", variant: "destructive" }); return; }
    setActionLoading(true);
    const { error, data } = await supabase.functions.invoke("vendor-invoice-approve", {
      body: { invoice_id: reviewing.id, decision, finance_email: financeEmail, rejection_reason: rejectionReason },
    });
    setActionLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: decision === "approved" ? "Approved & emailed to finance" : "Rejected" });
    setReviewing(null); setFinanceEmail(""); setRejectionReason("");
    load();
  }

  const matchBadge = (s: string, score: number) => {
    const map: Record<string, string> = {
      matched: "bg-success/15 text-success",
      partial: "bg-warning/15 text-warning",
      unmatched: "bg-destructive/15 text-destructive",
      processing: "bg-info/15 text-info",
      pending: "bg-muted text-muted-foreground",
      error: "bg-destructive/15 text-destructive",
    };
    return <Badge className={map[s] || ""}>{s} {score ? `(${score}%)` : ""}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          {!readOnly && (
            <Select value={vendorFilter} onValueChange={setVendorFilter}>
              <SelectTrigger className="w-64"><SelectValue placeholder="All vendors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setUploadOpen(true)}><Upload className="w-4 h-4 mr-2" /> Upload Invoice PDF</Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vendor</TableHead>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>AI Match</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">No invoices yet</TableCell></TableRow>
            )}
            {invoices.map(inv => (
              <TableRow key={inv.id}>
                <TableCell>{inv.partners?.company_name || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{inv.invoice_number || "-"}</TableCell>
                <TableCell>{inv.invoice_date || "-"}</TableCell>
                <TableCell className="text-right">{inv.amount ? `${inv.currency} ${Number(inv.amount).toLocaleString()}` : "-"}</TableCell>
                <TableCell>{matchBadge(inv.match_status, inv.match_score)}</TableCell>
                <TableCell>
                  <Badge variant={inv.approval_status === "approved" ? "default" : inv.approval_status === "rejected" ? "destructive" : "secondary"}>
                    {inv.approval_status}
                  </Badge>
                  {inv.finance_email_sent_at && <div className="text-[10px] text-muted-foreground mt-1">→ {inv.finance_email_to}</div>}
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" asChild><a href={inv.pdf_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a></Button>
                  {!readOnly && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => reprocess(inv.id)} title="Re-run AI"><Sparkles className="w-3.5 h-3.5" /></Button>
                      {inv.approval_status === "pending" && (
                        <Button size="sm" onClick={() => { setReviewing(inv); setFinanceEmail(""); }}>Review</Button>
                      )}
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Upload */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Vendor Invoice (PDF)</DialogTitle>
            <DialogDescription>AI will extract invoice details and match waybill/dispatch numbers automatically.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!vendorPartnerId && (
              <div>
                <Label>Vendor *</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Invoice #</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="(optional)" /></div>
              <div><Label>Amount</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="(optional)" /></div>
            </div>
            <div><Label>Invoice Date</Label><Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} /></div>
            <div><Label>PDF File *</Label><Input type="file" accept="application/pdf" ref={fileRef} /></div>
            <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4 mr-2" /> Upload & Process</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Vendor Invoice</DialogTitle>
            <DialogDescription>Approve to send to finance via email, or reject with a reason.</DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><b>Vendor:</b> {reviewing.partners?.company_name}</div>
                <div><b>Invoice #:</b> {reviewing.invoice_number || "-"}</div>
                <div><b>Amount:</b> {reviewing.currency} {Number(reviewing.amount || 0).toLocaleString()}</div>
                <div><b>Date:</b> {reviewing.invoice_date || "-"}</div>
              </div>
              <div className="border rounded p-3 bg-muted/30">
                <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-primary" /><b>AI Match Result: {reviewing.match_score}% - {reviewing.match_status}</b></div>
                <div className="text-xs space-y-1">
                  <div><b>Waybills found:</b> {(reviewing.extracted_waybills || []).join(", ") || "-"}</div>
                  <div><b>Dispatches found:</b> {(reviewing.extracted_dispatches || []).join(", ") || "-"}</div>
                  {reviewing.match_details?.unmatched_waybills?.length > 0 && (
                    <div className="text-destructive">Unmatched waybills: {reviewing.match_details.unmatched_waybills.join(", ")}</div>
                  )}
                  {reviewing.match_details?.unmatched_dispatches?.length > 0 && (
                    <div className="text-destructive">Unmatched dispatches: {reviewing.match_details.unmatched_dispatches.join(", ")}</div>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" asChild><a href={reviewing.pdf_url} target="_blank" rel="noreferrer"><FileText className="w-3.5 h-3.5 mr-2" /> Open PDF</a></Button>
              <div>
                <Label>Finance Email (to send approval) *</Label>
                <Input type="email" value={financeEmail} onChange={e => setFinanceEmail(e.target.value)} placeholder="finance@yourcompany.com" />
              </div>
              <div>
                <Label>Rejection Reason (if rejecting)</Label>
                <Textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewing(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => decide("rejected")} disabled={actionLoading}>
              <XCircle className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button onClick={() => decide("approved")} disabled={actionLoading || !financeEmail}>
              {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Approve & Email Finance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
