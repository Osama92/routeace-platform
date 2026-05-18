import { useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Plus, FileText, TrendingDown, Upload, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const COLUMN_ALIASES: Record<string, string> = {
  vendor: "vendor_name", carrier: "vendor_name",
  from: "route_from", origin: "route_from",
  to: "route_to", destination: "route_to",
  vehicle: "vehicle_type", truck_type: "vehicle_type",
  rate: "rate_ngn", price: "rate_ngn", amount: "rate_ngn",
  sla: "sla_days", days: "sla_days",
  start: "valid_from", end: "valid_until", expiry: "valid_until",
  terms: "special_terms", notes: "special_terms",
};
const normaliseHeader = (h: string): string => {
  const lower = h.toLowerCase().trim().replace(/\s+/g, "_");
  return COLUMN_ALIASES[lower] ?? lower;
};

interface RateCard {
  id: string;
  vendor_name: string;
  route_from: string;
  route_to: string;
  vehicle_type: string;
  rate_ngn: number;
  sla_days: number;
  status: string;
  valid_from: string;
  valid_until: string | null;
}

export default function VendorRateCards() {
  const { organizationId } = useAuth();
  const [cards, setCards] = useState<RateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<any>(null);

  const [form, setForm] = useState({
    vendor_name: "", route_from: "", route_to: "", vehicle_type: "Truck",
    rate_ngn: "", sla_days: "1",
  });
  const [compareForm, setCompareForm] = useState({ route_from: "", route_to: "", vehicle_type: "Truck" });
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const orgId = organizationId;

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("vendor_rate_cards")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setCards((data ?? []) as RateCard[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  const create = async () => {
    if (!orgId) return;
    const { error } = await supabase.from("vendor_rate_cards").insert({
      organization_id: orgId,
      vendor_name: form.vendor_name,
      route_from: form.route_from,
      route_to: form.route_to,
      vehicle_type: form.vehicle_type,
      rate_ngn: Number(form.rate_ngn),
      sla_days: Number(form.sla_days),
      status: "active",
    });
    if (error) return toast.error(error.message);
    toast.success("Rate card added");
    setOpen(false);
    setForm({ vendor_name: "", route_from: "", route_to: "", vehicle_type: "Truck", rate_ngn: "", sla_days: "1" });
    load();
  };

  const runCompare = async () => {
    if (!orgId) return;
    setComparing(true);
    setComparison(null);
    const { data, error } = await supabase.functions.invoke("vendor-rate-compare", {
      body: { ...compareForm, organization_id: orgId },
    });
    setComparing(false);
    if (error) return toast.error(error.message);
    setComparison(data);
  };

  const parseRateFile = (file: File): Promise<any[]> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
        if (raw.length === 0) return reject(new Error("File is empty"));
        const rows = raw.map((row) => {
          const out: Record<string, any> = {};
          for (const [k, v] of Object.entries(row)) out[normaliseHeader(k)] = v;
          return out;
        });
        const missing = ["vendor_name", "route_from", "route_to", "rate_ngn"].filter((c) => !(c in rows[0]));
        if (missing.length) return reject(new Error(`Missing columns: ${missing.join(", ")}`));
        resolve(rows);
      } catch (err: any) { reject(new Error(`Parse failed: ${err.message}`)); }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });

  const handleFileSelect = async (file: File) => {
    setBulkFile(file);
    setBulkPreview([]);
    try {
      const rows = await parseRateFile(file);
      setBulkPreview(rows);
      toast.success(`Parsed ${rows.length} rate entries`);
    } catch (e: any) { toast.error(e.message); setBulkFile(null); }
  };

  const handleBulkSave = async () => {
    if (!orgId || bulkPreview.length === 0) return;
    setBulkUploading(true);
    try {
      const rows = bulkPreview.map((r) => ({
        organization_id: orgId,
        vendor_name: String(r.vendor_name ?? "").trim(),
        route_from: String(r.route_from ?? "").trim(),
        route_to: String(r.route_to ?? "").trim(),
        vehicle_type: String(r.vehicle_type ?? "Truck").trim(),
        rate_ngn: parseFloat(String(r.rate_ngn).replace(/[₦,]/g, "")) || 0,
        sla_days: parseInt(String(r.sla_days ?? "1")) || 1,
        valid_from: r.valid_from || new Date().toISOString().split("T")[0],
        valid_until: r.valid_until || null,
        status: "active",
      }));
      const { error } = await supabase.from("vendor_rate_cards").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} rate cards saved`);
      setBulkOpen(false); setBulkFile(null); setBulkPreview([]);
      load();
    } catch (e: any) { toast.error(e.message); } finally { setBulkUploading(false); }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      vendor_name: "Acme Logistics", route_from: "Lagos", route_to: "Abuja",
      vehicle_type: "Truck", rate_ngn: 250000, sla_days: 2,
      valid_from: "2026-01-01", valid_until: "2026-12-31", special_terms: "Net 30",
    }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RateCards");
    XLSX.writeFile(wb, "vendor_rate_card_template.xlsx");
  };

  return (
    <DashboardLayout title="Vendor Rate Cards">
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Vendor Rate Cards</h1>
            <p className="text-muted-foreground">Manage contracted carrier rates and run AI cost comparisons.</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Sparkles className="mr-2 h-4 w-4" />AI Compare</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>AI Cost Comparison</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>From</Label><Input value={compareForm.route_from} onChange={(e) => setCompareForm({ ...compareForm, route_from: e.target.value })} /></div>
                  <div><Label>To</Label><Input value={compareForm.route_to} onChange={(e) => setCompareForm({ ...compareForm, route_to: e.target.value })} /></div>
                  <div><Label>Vehicle Type</Label><Input value={compareForm.vehicle_type} onChange={(e) => setCompareForm({ ...compareForm, vehicle_type: e.target.value })} /></div>
                  <Button onClick={runCompare} disabled={comparing} className="w-full">
                    {comparing ? "Analyzing..." : "Run Comparison"}
                  </Button>
                  {comparison && (
                    <Card>
                      <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-green-500" />Recommendation</CardTitle></CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {comparison.cheapest && (
                          <div><strong>{comparison.cheapest.vendor_name}</strong> - ₦{comparison.cheapest.rate_ngn?.toLocaleString()} ({comparison.cheapest.sla_days}d SLA)</div>
                        )}
                        <div className="text-muted-foreground">{comparison.ai_recommendation || comparison.message}</div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2"><Download className="h-4 w-4" />Template</Button>
            <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" />Bulk Upload</Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Bulk Upload Vendor Rate Cards</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Accepted:</strong> .xlsx, .xls, .csv. <strong>Required:</strong> vendor_name, route_from, route_to, rate_ngn.
                      <strong> Optional:</strong> vehicle_type, sla_days, valid_from, valid_until, special_terms. Aliases like "vendor", "from", "to", "rate" are auto-mapped.
                    </AlertDescription>
                  </Alert>
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
                  >
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Drop file here or click to browse</p>
                    <p className="text-sm text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                    {bulkFile && <p className="text-sm text-primary mt-2 font-medium">{bulkFile.name} - {bulkPreview.length} rows</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                  {bulkPreview.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Preview - first 10 rows:</p>
                      <div className="rounded-lg border overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow>{["vendor_name","route_from","route_to","vehicle_type","rate_ngn","sla_days"].map((h) => (<TableHead key={h} className="text-xs whitespace-nowrap">{h}</TableHead>))}</TableRow></TableHeader>
                          <TableBody>
                            {bulkPreview.slice(0, 10).map((row, i) => (
                              <TableRow key={i}>{["vendor_name","route_from","route_to","vehicle_type","rate_ngn","sla_days"].map((col) => (<TableCell key={col} className="text-xs">{String(row[col] ?? "-")}</TableCell>))}</TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {bulkPreview.length > 10 && <p className="text-xs text-muted-foreground mt-1">… and {bulkPreview.length - 10} more rows</p>}
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setBulkOpen(false); setBulkFile(null); setBulkPreview([]); }}>Cancel</Button>
                    <Button onClick={handleBulkSave} disabled={bulkPreview.length === 0 || bulkUploading}>
                      {bulkUploading ? "Saving…" : `Save ${bulkPreview.length} Rate Cards`}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Rate Card</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>New Vendor Rate Card</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Vendor Name</Label><Input value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>From</Label><Input value={form.route_from} onChange={(e) => setForm({ ...form, route_from: e.target.value })} /></div>
                    <div><Label>To</Label><Input value={form.route_to} onChange={(e) => setForm({ ...form, route_to: e.target.value })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Vehicle</Label><Input value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} /></div>
                    <div><Label>SLA (days)</Label><Input type="number" value={form.sla_days} onChange={(e) => setForm({ ...form, sla_days: e.target.value })} /></div>
                  </div>
                  <div><Label>Rate (₦)</Label><Input type="number" value={form.rate_ngn} onChange={(e) => setForm({ ...form, rate_ngn: e.target.value })} /></div>
                </div>
                <DialogFooter><Button onClick={create}>Save</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList><TabsTrigger value="all">All</TabsTrigger><TabsTrigger value="active">Active</TabsTrigger></TabsList>
          <TabsContent value="all">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-4 w-4" />Rate Cards ({cards.length})</CardTitle><CardDescription>Department-managed contracted rates</CardDescription></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Route</TableHead><TableHead>Vehicle</TableHead><TableHead>Rate</TableHead><TableHead>SLA</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Loading…</TableCell></TableRow>
                    ) : cards.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No rate cards yet</TableCell></TableRow>
                    ) : cards.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.vendor_name}</TableCell>
                        <TableCell>{c.route_from} → {c.route_to}</TableCell>
                        <TableCell>{c.vehicle_type}</TableCell>
                        <TableCell>₦{Number(c.rate_ngn).toLocaleString()}</TableCell>
                        <TableCell>{c.sla_days}d</TableCell>
                        <TableCell><Badge variant={c.status === "active" ? "default" : "secondary"}>{c.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="active">
            <Card><CardContent className="pt-6 text-sm text-muted-foreground">{cards.filter(c => c.status === "active").length} active rate cards.</CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
