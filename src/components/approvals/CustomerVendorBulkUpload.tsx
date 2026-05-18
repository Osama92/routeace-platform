import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";

type EntityType = "customers" | "partners";

interface Props {
  entityType: EntityType;
  organizationId: string;
  onComplete?: () => void;
}

type ParsedRow = Record<string, any> & { __error?: string };

// Header maps: lowercase header -> field key
const customerHeaderMap: Record<string, string> = {
  "company name": "company_name",
  "company": "company_name",
  "name": "company_name",
  "contact name": "contact_name",
  "contact": "contact_name",
  "email": "email",
  "phone": "phone",
  "address": "address",
  "city": "city",
  "state": "state",
  "country": "country",
};

const partnerHeaderMap: Record<string, string> = {
  "company name": "company_name",
  "company": "company_name",
  "name": "company_name",
  "partner type": "partner_type",
  "type": "partner_type",
  "contact name": "contact_name",
  "contact": "contact_name",
  "contact email": "contact_email",
  "email": "contact_email",
  "contact phone": "contact_phone",
  "phone": "contact_phone",
  "address": "address",
  "city": "city",
  "state": "state",
  "country": "country",
};

const VALID_PARTNER_TYPES = ["transporter", "vendor", "supplier", "broker", "agent"];

export default function CustomerVendorBulkUpload({ entityType, organizationId, onComplete }: Props) {
  const { user, userRole } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const isCustomers = entityType === "customers";
  const headerMap = isCustomers ? customerHeaderMap : partnerHeaderMap;
  const label = isCustomers ? "Customers" : "Vendors";

  // Mirrors the same routing logic used on Customers / Partners pages.
  const computeApprovalStatus = (): "active" | "pending_sa" | "pending_coo" => {
    if (userRole === "super_admin" || userRole === "admin") return "active";
    if (userRole === "org_admin") return "pending_sa";
    return "pending_coo";
  };

  const downloadTemplate = () => {
    const headers = isCustomers
      ? ["Company Name", "Contact Name", "Email", "Phone", "Address", "City", "State", "Country"]
      : ["Company Name", "Partner Type", "Contact Name", "Contact Email", "Contact Phone", "Address", "City", "State", "Country"];
    const sample = isCustomers
      ? ["Acme Foods Ltd", "Jane Doe", "jane@acme.com", "+2348012345678", "12 Allen Avenue", "Lagos", "Lagos", "Nigeria"]
      : ["FastMove Logistics", "transporter", "John Smith", "ops@fastmove.com", "+2348098765432", "5 Bode Thomas", "Lagos", "Lagos", "Nigeria"];
    const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label);
    XLSX.writeFile(wb, `${entityType}_template.xlsx`);
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });

      const parsed: ParsedRow[] = raw.map((r) => {
        const out: ParsedRow = {};
        for (const [excelHeader, key] of Object.entries(headerMap)) {
          const match = Object.keys(r).find(
            k => k.toLowerCase().trim() === excelHeader.toLowerCase().trim(),
          );
          if (match !== undefined) {
            const v = r[match];
            if (v !== "" && v !== null && v !== undefined && out[key] === undefined) {
              out[key] = String(v).trim();
            }
          }
        }
        // Validate
        const errs: string[] = [];
        if (!out.company_name) errs.push("Missing company name");
        if (!isCustomers && out.partner_type) {
          const t = String(out.partner_type).toLowerCase();
          if (!VALID_PARTNER_TYPES.includes(t)) {
            errs.push(`Invalid partner type "${out.partner_type}"`);
          } else {
            out.partner_type = t;
          }
        }
        if (!isCustomers && !out.partner_type) {
          out.partner_type = "vendor"; // default
        }
        const emailField = isCustomers ? "email" : "contact_email";
        if (out[emailField] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[emailField])) {
          errs.push(`Invalid email "${out[emailField]}"`);
        }
        if (errs.length) out.__error = errs.join("; ");
        return out;
      }).filter(r => Object.keys(r).length > 0);

      if (parsed.length === 0) {
        toast.error("No rows detected. Make sure your file has the correct headers.");
        return;
      }
      setRows(parsed);
      setOpen(true);
    } catch (err: any) {
      console.error(err);
      toast.error("Could not read the file. Make sure it's a valid Excel/CSV.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const validRows = rows.filter(r => !r.__error);
  const invalidRows = rows.filter(r => r.__error);

  const submit = async () => {
    if (!user || validRows.length === 0) return;
    setSubmitting(true);
    const approval_status = computeApprovalStatus();

    const payload = validRows.map(r => {
      const base: any = {
        organization_id: organizationId,
        approval_status,
        ...(isCustomers
          ? {
              company_name: r.company_name,
              contact_name: r.contact_name ?? null,
              email: r.email ?? null,
              phone: r.phone ?? null,
              address: r.address ?? null,
              city: r.city ?? null,
              state: r.state ?? null,
              country: r.country ?? "Nigeria",
            }
          : {
              company_name: r.company_name,
              partner_type: r.partner_type,
              contact_name: r.contact_name ?? null,
              contact_email: r.contact_email ?? null,
              contact_phone: r.contact_phone ?? null,
              address: r.address ?? null,
              city: r.city ?? null,
              state: r.state ?? null,
              country: r.country ?? "Nigeria",
            }),
      };
      return base;
    });

    const { data, error } = await supabase
      .from(entityType)
      .insert(payload)
      .select("id");

    setSubmitting(false);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    const inserted = data?.length ?? 0;
    const verb =
      approval_status === "active"
        ? "added (active)"
        : approval_status === "pending_sa"
          ? "submitted for Super Admin approval"
          : "submitted for COO approval";

    toast.success(`${inserted} ${label.toLowerCase()} ${verb}.`);
    if (invalidRows.length) {
      toast.warning(`${invalidRows.length} row(s) skipped due to validation errors.`);
    }
    setOpen(false);
    setRows([]);
    setFileName("");
    onComplete?.();
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1.5" />
          Template
        </Button>
        <Button size="sm" onClick={() => inputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" />
          Bulk Upload {label}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Review {label} Upload
            </DialogTitle>
            <DialogDescription>
              {fileName} - <strong>{validRows.length}</strong> valid,{" "}
              <strong>{invalidRows.length}</strong> with errors.
              {(() => {
                const s = computeApprovalStatus();
                if (s === "active") return " Records will be added immediately.";
                if (s === "pending_sa") return " Records will be queued for Super Admin approval.";
                return " Records will be queued for COO approval, then Super Admin sign-off.";
              })()}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Company</TableHead>
                  {!isCustomers && <TableHead>Type</TableHead>}
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className={r.__error ? "bg-red-500/5" : ""}>
                    <TableCell className="text-xs text-muted-foreground">{i + 2}</TableCell>
                    <TableCell className="text-sm">{r.company_name || "-"}</TableCell>
                    {!isCustomers && (
                      <TableCell className="text-xs capitalize">{r.partner_type || "-"}</TableCell>
                    )}
                    <TableCell className="text-xs">{r.contact_name || "-"}</TableCell>
                    <TableCell className="text-xs">
                      {(isCustomers ? r.email : r.contact_email) || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.__error ? (
                        <Badge variant="outline" className="border-red-400/50 text-red-600 text-[10px]" title={r.__error}>
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Error
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-green-500/50 text-green-700 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          OK
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {invalidRows.length > 0 && (
            <div className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-auto">
              {invalidRows.slice(0, 5).map((r, i) => (
                <p key={i}>Row {rows.indexOf(r) + 2}: {r.__error}</p>
              ))}
              {invalidRows.length > 5 && <p>…and {invalidRows.length - 5} more.</p>}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={submitting || validRows.length === 0}
            >
              {submitting
                ? "Uploading…"
                : `Submit ${validRows.length} valid row${validRows.length === 1 ? "" : "s"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
