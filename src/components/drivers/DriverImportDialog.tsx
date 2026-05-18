import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

type RawRow = Record<string, unknown>;

type ParsedDriver = {
  full_name: string;
  phone: string;
  email: string | null;
  license_number: string | null;
  license_expiry: string | null;
  driver_type: "owned" | "third_party";
  salary_type: "monthly" | "per_trip" | "bi_monthly";
  base_salary: number;
  tax_id: string | null;
  partner_name: string | null;
};

type FieldError = { field: string; reason: string };

type RowOutcome = {
  index: number;
  row: ParsedDriver;
  status: "new" | "duplicate" | "update" | "invalid";
  reason?: string;
  match_id?: string;
  errors?: FieldError[];
};

const TEMPLATE_HEADERS = [
  "full_name",
  "phone",
  "email",
  "license_number",
  "license_expiry",
  "driver_type",
  "salary_type",
  "base_salary",
  "tax_id",
  "partner_name",
];

const TEMPLATE_SAMPLE: Record<string, string | number> = {
  full_name: "Jane Doe",
  phone: "+2348012345678",
  email: "jane@example.com",
  license_number: "LOS-2025-12345",
  license_expiry: "2027-12-31",
  driver_type: "owned",
  salary_type: "monthly",
  base_salary: 250000,
  tax_id: "TIN-001",
  partner_name: "",
};

const norm = (v: unknown) =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

const normalisePhone = (v: string) => v.replace(/[^0-9+]/g, "");

const parseDate = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const parseDriverType = (v: unknown): "owned" | "third_party" => {
  const s = norm(v).toLowerCase();
  if (["3pl", "third_party", "third-party", "vendor", "partner", "outsourced"].includes(s)) {
    return "third_party";
  }
  return "owned";
};

const parseSalaryType = (v: unknown): "monthly" | "per_trip" | "bi_monthly" => {
  const s = norm(v).toLowerCase().replace(/\s+/g, "_");
  if (s === "per_trip" || s === "bi_monthly") return s;
  return "monthly";
};

interface Props {
  onImported?: () => void;
}

const DriverImportDialog = ({ onImported }: Props) => {
  const { organizationId } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [outcomes, setOutcomes] = useState<RowOutcome[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => setOutcomes([]);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([TEMPLATE_SAMPLE], { header: TEMPLATE_HEADERS });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "drivers");
    XLSX.writeFile(wb, "routeace-drivers-template.xlsx");
  };

  const parseFile = async (file: File) => {
    setParsing(true);
    setOutcomes([]);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

      // Pre-fetch existing org drivers for dedupe
      const orgFilter = organizationId ?? "00000000-0000-0000-0000-000000000000";
      const { data: existing } = await (supabase as any)
        .from("drivers")
        .select("id,full_name,phone,email,license_number,driver_type,base_salary,license_expiry")
        .eq("organization_id", orgFilter)
        .limit(5000);
      const existingArr: any[] = existing || [];
      // Best-effort fetch of sensitive tax_id (may be empty for non-finance users)
      let tinByDriver: Record<string, string | null> = {};
      if (existingArr.length) {
        const { data: sens } = await (supabase as any)
          .from("driver_sensitive_details")
          .select("driver_id, tax_id")
          .in("driver_id", existingArr.map((d) => d.id));
        (sens || []).forEach((s: any) => { tinByDriver[s.driver_id] = s.tax_id; });
        existingArr.forEach((d) => { d.tax_id = tinByDriver[d.id] ?? null; });
      }

      const findMatch = (parsed: ParsedDriver) => {
        return existingArr.find((d) => {
          if (parsed.license_number && d.license_number && norm(d.license_number).toLowerCase() === parsed.license_number.toLowerCase()) return true;
          if (parsed.phone && d.phone && normalisePhone(d.phone) === normalisePhone(parsed.phone)) return true;
          if (parsed.email && d.email && norm(d.email).toLowerCase() === parsed.email.toLowerCase()) return true;
          return false;
        });
      };

      const validateRow = (parsed: ParsedDriver, raw: RawRow): FieldError[] => {
        const errs: FieldError[] = [];
        if (!parsed.full_name) errs.push({ field: "full_name", reason: "required" });
        if (!parsed.phone) errs.push({ field: "phone", reason: "required" });
        else if (parsed.phone.replace(/[^0-9]/g, "").length < 7)
          errs.push({ field: "phone", reason: "must contain at least 7 digits" });
        if (parsed.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed.email))
          errs.push({ field: "email", reason: "invalid email format" });
        if (raw.license_expiry && parsed.license_expiry == null)
          errs.push({ field: "license_expiry", reason: "use YYYY-MM-DD" });
        if (raw.base_salary !== "" && raw.base_salary != null && isNaN(Number(raw.base_salary)))
          errs.push({ field: "base_salary", reason: "must be a number" });
        if (parsed.driver_type === "third_party" && !parsed.partner_name)
          errs.push({ field: "partner_name", reason: "required for 3PL drivers" });
        return errs;
      };

      const computed: RowOutcome[] = rows.map((raw, i) => {
        const parsed: ParsedDriver = {
          full_name: norm(raw.full_name),
          phone: normalisePhone(norm(raw.phone)),
          email: norm(raw.email) || null,
          license_number: norm(raw.license_number) || null,
          license_expiry: parseDate(raw.license_expiry),
          driver_type: parseDriverType(raw.driver_type),
          salary_type: parseSalaryType(raw.salary_type),
          base_salary: Number(raw.base_salary) || 0,
          tax_id: norm(raw.tax_id) || null,
          partner_name: norm(raw.partner_name) || null,
        };

        const errs = validateRow(parsed, raw);
        if (errs.length) {
          return {
            index: i,
            row: parsed,
            status: "invalid",
            reason: errs.map((e) => `${e.field}: ${e.reason}`).join("; "),
            errors: errs,
          };
        }

        const match = findMatch(parsed);
        if (!match) return { index: i, row: parsed, status: "new" };

        const fieldsToCheck: Array<keyof ParsedDriver> = [
          "email", "license_number", "license_expiry", "driver_type",
          "base_salary", "tax_id",
        ];
        const diffs: string[] = [];
        for (const f of fieldsToCheck) {
          const incoming = (parsed as any)[f];
          const current = (match as any)[f];
          if (incoming != null && incoming !== "" && String(incoming) !== String(current ?? "")) {
            diffs.push(f);
          }
        }
        if (diffs.length === 0) {
          return { index: i, row: parsed, status: "duplicate", reason: "exact match - skipped", match_id: match.id };
        }
        return { index: i, row: parsed, status: "update", reason: `new info: ${diffs.join(", ")}`, match_id: match.id };
      });

      setOutcomes(computed);
    } catch (err: any) {
      toast({ title: "Parse failed", description: err.message || "Could not read Excel file", variant: "destructive" });
    } finally {
      setParsing(false);
    }
  };

  const commit = async () => {
    if (!outcomes.length) return;
    setImporting(true);
    try {
      const newRowsWithTax = outcomes.filter((o) => o.status === "new").map((o) => ({
        insert: {
          organization_id: organizationId ?? null,
          full_name: o.row.full_name,
          phone: o.row.phone,
          email: o.row.email,
          license_number: o.row.license_number,
          license_expiry: o.row.license_expiry,
          driver_type: o.row.driver_type,
          salary_type: o.row.salary_type,
          base_salary: o.row.base_salary,
        },
        tax_id: o.row.tax_id,
      }));
      const updates = outcomes.filter((o) => o.status === "update");

      let inserted = 0;
      let updated = 0;
      if (newRowsWithTax.length) {
        const { data: insRows, error } = await (supabase as any)
          .from("drivers")
          .insert(newRowsWithTax.map((r) => r.insert))
          .select("id");
        if (error) throw error;
        inserted = insRows?.length ?? 0;
        const sensRows = (insRows || [])
          .map((r: any, i: number) => ({
            driver_id: r.id,
            organization_id: organizationId ?? null,
            tax_id: newRowsWithTax[i].tax_id || null,
          }))
          .filter((s) => s.tax_id);
        if (sensRows.length) {
          await (supabase as any).from("driver_sensitive_details").upsert(sensRows, { onConflict: "driver_id" });
        }
      }
      for (const u of updates) {
        const patch: any = {};
        if (u.row.email) patch.email = u.row.email;
        if (u.row.license_number) patch.license_number = u.row.license_number;
        if (u.row.license_expiry) patch.license_expiry = u.row.license_expiry;
        if (u.row.driver_type) patch.driver_type = u.row.driver_type;
        if (u.row.base_salary) patch.base_salary = u.row.base_salary;
        const { error } = await (supabase as any)
          .from("drivers").update(patch).eq("id", u.match_id);
        if (!error) {
          if (u.row.tax_id) {
            await (supabase as any).from("driver_sensitive_details").upsert({
              driver_id: u.match_id,
              organization_id: organizationId ?? null,
              tax_id: u.row.tax_id,
            }, { onConflict: "driver_id" });
          }
          updated += 1;
        }
      }

      toast({
        title: "Import complete",
        description: `${inserted} new driver(s) added · ${updated} updated · ${outcomes.filter((o) => o.status === "duplicate").length} duplicate(s) skipped`,
      });
      setOpen(false);
      reset();
      onImported?.();
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const counts = outcomes.reduce(
    (acc, o) => ({ ...acc, [o.status]: (acc[o.status] || 0) + 1 }),
    { new: 0, update: 0, duplicate: 0, invalid: 0 } as Record<string, number>
  );

  const downloadErrorReport = () => {
    const invalid = outcomes.filter((o) => o.status === "invalid");
    if (!invalid.length) return;
    const header = ["row_number", "full_name", "phone", "email", "driver_type", "field", "reason"];
    const lines = [header.join(",")];
    invalid.forEach((o) => {
      (o.errors || [{ field: "", reason: o.reason || "invalid" }]).forEach((e) => {
        const cells = [
          String(o.index + 1),
          o.row.full_name,
          o.row.phone,
          o.row.email || "",
          o.row.driver_type,
          e.field,
          e.reason,
        ].map((v) => {
          const s = String(v).replace(/"/g, '""');
          return /[",\n]/.test(s) ? `"${s}"` : s;
        });
        lines.push(cells.join(","));
      });
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `driver-import-errors-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" /> Import from Excel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[820px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" /> Bulk Import Drivers
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file with driver records. The system scans for duplicates by
            license number, phone, or email, and only imports new or changed information.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Required columns</AlertTitle>
          <AlertDescription className="text-xs">
            <code>full_name</code>, <code>phone</code> are required. Optional: <code>email</code>,
            <code>license_number</code>, <code>license_expiry</code> (YYYY-MM-DD),
            <code>driver_type</code> (<em>owned</em> or <em>third_party</em>),
            <code>salary_type</code>, <code>base_salary</code>, <code>tax_id</code>, <code>partner_name</code>.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2 flex-wrap">
          <Button variant="secondary" size="sm" onClick={downloadTemplate}>
            <Download className="w-3 h-3 mr-1" /> Download template
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) parseFile(f);
              e.target.value = "";
            }}
          />
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
            {parsing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Upload className="w-3 h-3 mr-1" />}
            Choose file
          </Button>
        </div>

        {/* Template preview - what the .xlsx looks like */}
        <div className="border rounded-md p-3 bg-muted/20">
          <p className="text-xs font-semibold mb-2">Template preview (sample row)</p>
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {TEMPLATE_HEADERS.map((h) => (
                    <TableHead key={h} className="text-[10px] whitespace-nowrap">
                      {h}{(h === "full_name" || h === "phone") && <span className="text-destructive ml-0.5">*</span>}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  {TEMPLATE_HEADERS.map((h) => (
                    <TableCell key={h} className="text-[10px] whitespace-nowrap">{String(TEMPLATE_SAMPLE[h] ?? "")}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            * required. <code>driver_type</code> = <em>owned</em> (internal) or <em>third_party</em> (3PL).
            <code>partner_name</code> is required when <code>driver_type</code> is <em>third_party</em>.
            Dates use <code>YYYY-MM-DD</code>.
          </p>
        </div>

        {outcomes.length > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-success/30 text-success">{counts.new} new</Badge>
              <Badge variant="outline" className="border-info/30 text-info">{counts.update} update</Badge>
              <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">{counts.duplicate} duplicate</Badge>
              {counts.invalid > 0 && (
                <>
                  <Badge variant="outline" className="border-destructive/30 text-destructive">{counts.invalid} invalid</Badge>
                  <Button size="sm" variant="ghost" className="h-6 text-[11px]" onClick={downloadErrorReport}>
                    <Download className="w-3 h-3 mr-1" /> Download error report
                  </Button>
                </>
              )}
            </div>

            <div className="border rounded-md max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Field errors / Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outcomes.slice(0, 200).map((o) => (
                    <TableRow key={o.index}>
                      <TableCell className="text-xs text-muted-foreground">{o.index + 1}</TableCell>
                      <TableCell className="text-sm">{o.row.full_name || "-"}</TableCell>
                      <TableCell className="text-xs">{o.row.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {o.row.driver_type === "third_party" ? "3PL" : "Internal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            o.status === "new" ? "border-success/40 text-success" :
                            o.status === "update" ? "border-info/40 text-info" :
                            o.status === "invalid" ? "border-destructive/40 text-destructive" :
                            "border-muted-foreground/30 text-muted-foreground"
                          }
                        >
                          {o.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">
                        {o.errors && o.errors.length ? (
                          <div className="flex flex-wrap gap-1">
                            {o.errors.map((e, idx) => (
                              <Badge key={idx} variant="outline" className="border-destructive/40 text-destructive text-[10px]">
                                {e.field}: {e.reason}
                              </Badge>
                            ))}
                          </div>
                        ) : (o.reason || "")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Cancel</Button>
          <Button
            onClick={commit}
            disabled={importing || outcomes.length === 0 || (counts.new === 0 && counts.update === 0)}
          >
            {importing ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
            Import {counts.new + counts.update} record(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DriverImportDialog;
