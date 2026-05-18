import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSalesOS } from "@/hooks/useSalesOS";
import { FileText, Plus, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-amber-100 text-amber-800",
};

const SalesQuotes = () => {
  const navigate = useNavigate();
  const { quotes, accounts, opportunities, createQuote } = useSalesOS();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    account_id: "", opportunity_id: "", subtotal: "", discount_amount: "0",
    tax_amount: "", valid_until: "", notes: "",
  });

  const filtered = quotes.filter(q => !search || q.quote_number.toLowerCase().includes(search.toLowerCase()) || q.account?.account_name?.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    const sub = parseFloat(form.subtotal) || 0;
    const disc = parseFloat(form.discount_amount) || 0;
    const tax = sub * 0.075;
    await createQuote({
      account_id: form.account_id || null,
      opportunity_id: form.opportunity_id || null,
      subtotal: sub,
      discount_amount: disc,
      tax_amount: tax,
      total_amount: sub - disc + tax,
      valid_until: form.valid_until || null,
      notes: form.notes || null,
      status: "draft",
    } as any);
    setOpen(false);
    setForm({ account_id: "", opportunity_id: "", subtotal: "", discount_amount: "0", tax_amount: "", valid_until: "", notes: "" });
  };

  return (
    <DashboardLayout title="Quotations" subtitle="Create, track, and convert sales quotes">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Quote</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Quote</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account</Label>
                    <Select value={form.account_id} onValueChange={v => setForm(p => ({ ...p, account_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Opportunity</Label>
                    <Select value={form.opportunity_id} onValueChange={v => setForm(p => ({ ...p, opportunity_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>{opportunities.map(o => <SelectItem key={o.id} value={o.id}>{o.opportunity_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Subtotal (₦) *</Label><Input type="number" value={form.subtotal} onChange={e => setForm(p => ({ ...p, subtotal: e.target.value }))} /></div>
                  <div><Label>Discount (₦)</Label><Input type="number" value={form.discount_amount} onChange={e => setForm(p => ({ ...p, discount_amount: e.target.value }))} /></div>
                </div>
                <div><Label>Valid Until</Label><Input type="date" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))} /></div>
                <div><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Quote</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search quotes..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          {filtered.length === 0 ? (
            <CardContent className="py-12 text-center">
              <FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No quotes yet</p>
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Create First Quote</Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quote #</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Version</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => (
                  <TableRow key={q.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-sm">{q.quote_number}</TableCell>
                    <TableCell className="text-sm">{q.account?.account_name || "-"}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${statusColors[q.status || "draft"]}`}>{q.status}</Badge></TableCell>
                    <TableCell className="text-right text-sm">₦{((q.subtotal || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right font-bold text-sm">₦{((q.total_amount || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{q.valid_until ? new Date(q.valid_until).toLocaleDateString() : "-"}</TableCell>
                    <TableCell className="text-center text-sm">v{q.version || 1}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SalesQuotes;
