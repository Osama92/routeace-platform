import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, Target, Upload, FileDown } from "lucide-react";
import * as XLSX from "xlsx";

interface Vendor { id: string; company_name: string; }

interface YearlyTarget {
  vendor_id: string;
  target_year: number;
  otd_target_percent: number;
  trucks_deployed_target: number;
  cost_per_kg_target: number;
  cost_per_delivery_target: number;
}

interface ActualMetrics {
  otd_actual: number;
  trucks_deployed_actual: number;
  cost_per_kg_actual: number;
  cost_per_delivery_actual: number;
  total_trips: number;
}

const NGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

export default function VendorYearlyTargets() {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [vendorId, setVendorId] = useState<string>("");
  const [target, setTarget] = useState<YearlyTarget>({
    vendor_id: "", target_year: year,
    otd_target_percent: 0, trucks_deployed_target: 0,
    cost_per_kg_target: 0, cost_per_delivery_target: 0,
  });
  const [allTargets, setAllTargets] = useState<(YearlyTarget & { id?: string; company_name?: string })[]>([]);
  const [actualsByVendor, setActualsByVendor] = useState<Record<string, ActualMetrics>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, company_name")
        .eq("partner_type", "vendor")
        .order("company_name");
      setVendors(data ?? []);
    })();
  }, []);

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [year, organizationId]);

  useEffect(() => {
    if (!vendorId) return;
    const existing = allTargets.find((t) => t.vendor_id === vendorId);
    setTarget({
      vendor_id: vendorId, target_year: year,
      otd_target_percent: existing?.otd_target_percent ?? 0,
      trucks_deployed_target: existing?.trucks_deployed_target ?? 0,
      cost_per_kg_target: existing?.cost_per_kg_target ?? 0,
      cost_per_delivery_target: existing?.cost_per_delivery_target ?? 0,
    });
  }, [vendorId, allTargets, year]);

  const fetchData = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const { data: targets } = await (supabase.from("vendor_yearly_targets" as any) as any)
        .select("id, vendor_id, target_year, otd_target_percent, trucks_deployed_target, cost_per_kg_target, cost_per_delivery_target, partners!inner(company_name)")
        .eq("organization_id", organizationId)
        .eq("target_year", year);

      const list = (targets ?? []).map((t: any) => ({
        ...t, company_name: t.partners?.company_name,
      }));
      setAllTargets(list);

      // Compute actuals from dispatches for the year
      const start = new Date(year, 0, 1).toISOString();
      const end = new Date(year + 1, 0, 1).toISOString();

      const { data: disp } = await supabase
        .from("dispatches")
        .select("id, status, scheduled_delivery, actual_delivery, cost, vehicle_id, drivers!inner(partner_id)")
        .eq("organization_id", organizationId)
        .gte("created_at", start).lt("created_at", end);

      const map: Record<string, ActualMetrics> = {};
      (disp ?? []).forEach((d: any) => {
        const pid = d.drivers?.partner_id;
        if (!pid) return;
        if (!map[pid]) map[pid] = { otd_actual: 0, trucks_deployed_actual: 0, cost_per_kg_actual: 0, cost_per_delivery_actual: 0, total_trips: 0 };
        const m = map[pid];
        if (d.status === "delivered") {
          m.total_trips++;
          if (d.scheduled_delivery && d.actual_delivery &&
              new Date(d.actual_delivery) <= new Date(d.scheduled_delivery)) m.otd_actual++;
        }
      });
      // Convert otd to %, sum trucks etc.
      Object.entries(map).forEach(([pid, m]) => {
        const otd = m.total_trips ? Math.round((m.otd_actual / m.total_trips) * 100) : 0;
        const totalCost = (disp ?? []).filter((d: any) => d.drivers?.partner_id === pid)
          .reduce((s: number, d: any) => s + Number(d.cost ?? 0), 0);
        const truckSet = new Set((disp ?? []).filter((d: any) => d.drivers?.partner_id === pid).map((d: any) => d.vehicle_id).filter(Boolean));
        map[pid] = {
          otd_actual: otd,
          trucks_deployed_actual: truckSet.size,
          cost_per_kg_actual: 0, // requires weight data - placeholder 0
          cost_per_delivery_actual: m.total_trips ? Math.round(totalCost / m.total_trips) : 0,
          total_trips: m.total_trips,
        };
      });
      setActualsByVendor(map);
    } finally { setLoading(false); }
  };

  const save = async () => {
    if (!vendorId || !organizationId) {
      toast({ title: "Pick a vendor", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await (supabase.from("vendor_yearly_targets" as any) as any)
        .upsert({
          organization_id: organizationId,
          vendor_id: vendorId,
          target_year: year,
          otd_target_percent: target.otd_target_percent,
          trucks_deployed_target: target.trucks_deployed_target,
          cost_per_kg_target: target.cost_per_kg_target,
          cost_per_delivery_target: target.cost_per_delivery_target,
        }, { onConflict: "vendor_id,target_year" });
      if (error) throw error;
      toast({ title: "Yearly targets saved" });
      fetchData();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["vendor_company_name", "target_year", "otd_target_percent", "trucks_deployed_target", "cost_per_kg_target", "cost_per_delivery_target"],
      ["Example Logistics Ltd", year, 95, 120, 50, 25000],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 22 }, { wch: 20 }, { wch: 24 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendor Targets");
    XLSX.writeFile(wb, `vendor_yearly_targets_template_${year}.xlsx`);
  };

  const handleFile = async (file: File) => {
    if (!organizationId) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast({ title: "Excel files only", description: "Upload .xlsx or .xls", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
      if (!rows.length) throw new Error("Sheet is empty");

      const nameMap = new Map(vendors.map((v) => [v.company_name.trim().toLowerCase(), v.id]));
      const records: any[] = [];
      const errors: string[] = [];

      rows.forEach((r, i) => {
        const cname = String(r.vendor_company_name ?? r.vendor ?? "").trim().toLowerCase();
        if (!cname) { errors.push(`Row ${i + 2}: missing vendor_company_name`); return; }
        const vid = nameMap.get(cname);
        if (!vid) { errors.push(`Row ${i + 2}: vendor "${r.vendor_company_name}" not found (must be an approved vendor)`); return; }
        const yr = Number(r.target_year);
        if (!yr || yr < 2000) { errors.push(`Row ${i + 2}: invalid target_year`); return; }
        records.push({
          organization_id: organizationId,
          vendor_id: vid,
          target_year: yr,
          otd_target_percent: Number(r.otd_target_percent) || 0,
          trucks_deployed_target: Number(r.trucks_deployed_target) || 0,
          cost_per_kg_target: Number(r.cost_per_kg_target) || 0,
          cost_per_delivery_target: Number(r.cost_per_delivery_target) || 0,
        });
      });

      if (!records.length) {
        toast({ title: "No valid rows", description: errors.slice(0, 3).join("\n") || "Check format", variant: "destructive" });
        return;
      }

      const { error } = await (supabase.from("vendor_yearly_targets" as any) as any)
        .upsert(records, { onConflict: "vendor_id,target_year" });
      if (error) throw error;

      toast({
        title: `Imported ${records.length} target${records.length > 1 ? "s" : ""}`,
        description: errors.length ? `${errors.length} row(s) skipped. First: ${errors[0]}` : "Progress will scope automatically against live dispatches.",
      });
      fetchData();
    } catch (e: any) {
      toast({ title: "Import failed", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const years = [year - 1, year, year + 1];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" /> Set Annual Vendor Targets
            </CardTitle>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <FileDown className="w-4 h-4 mr-2" /> Template
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Bulk Upload (Excel)
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bulk import accepts <strong>.xlsx</strong> only. Columns: <code>vendor_company_name, target_year, otd_target_percent, trucks_deployed_target, cost_per_kg_target, cost_per_delivery_target</code>. Vendor names must match approved vendors exactly.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.length === 0
                    ? <div className="px-2 py-3 text-sm text-muted-foreground">No vendors yet - approve a transporter first.</div>
                    : vendors.map((v) => <SelectItem key={v.id} value={v.id}>{v.company_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>OTD Target (%)</Label>
              <Input type="number" min={0} max={100} value={target.otd_target_percent}
                onChange={(e) => setTarget((t) => ({ ...t, otd_target_percent: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Trucks Deployed Target (annual count)</Label>
              <Input type="number" min={0} value={target.trucks_deployed_target}
                onChange={(e) => setTarget((t) => ({ ...t, trucks_deployed_target: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Cost per KG Target (₦)</Label>
              <Input type="number" min={0} step="0.01" value={target.cost_per_kg_target}
                onChange={(e) => setTarget((t) => ({ ...t, cost_per_kg_target: Number(e.target.value) }))} />
            </div>
            <div className="space-y-2">
              <Label>Cost per Delivery Target (₦)</Label>
              <Input type="number" min={0} step="0.01" value={target.cost_per_delivery_target}
                onChange={(e) => setTarget((t) => ({ ...t, cost_per_delivery_target: Number(e.target.value) }))} />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving || !vendorId}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Yearly Target
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Yearly Performance - {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : allTargets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No annual targets set for {year}.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-center">OTD (Target / Actual)</TableHead>
                  <TableHead className="text-center">Trucks (Target / Actual)</TableHead>
                  <TableHead className="text-right">Cost/KG (Target / Actual)</TableHead>
                  <TableHead className="text-right">Cost/Delivery (Target / Actual)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTargets.map((t) => {
                  const a = actualsByVendor[t.vendor_id];
                  const otdActual = a?.otd_actual ?? 0;
                  const trucksActual = a?.trucks_deployed_actual ?? 0;
                  const cpd = a?.cost_per_delivery_actual ?? 0;
                  const otdPct = t.otd_target_percent ? Math.round((otdActual / t.otd_target_percent) * 100) : 0;
                  return (
                    <TableRow key={t.vendor_id}>
                      <TableCell className="font-medium">{t.company_name}</TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <p className="text-xs">{otdActual}% / {t.otd_target_percent}%</p>
                          <Progress value={Math.min(100, otdPct)} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center text-sm">{trucksActual} / {t.trucks_deployed_target}</TableCell>
                      <TableCell className="text-right text-sm">{NGN(t.cost_per_kg_target)} <span className="text-muted-foreground">/ -</span></TableCell>
                      <TableCell className="text-right text-sm">{NGN(t.cost_per_delivery_target)} <span className="text-muted-foreground">/ {NGN(cpd)}</span></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
