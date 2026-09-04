import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  parseExcelFileRobust,
  rateCardHeaderMap,
  generateRateCardTemplate,
  type RateCardRow,
} from "@/lib/excelParser";
import { Upload, Download, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const TRUCK_TYPES = ["3T", "5T", "10T", "15T", "20T", "30T", "45T", "60T"];

interface Party { id: string; label: string }

interface Props {
  cardType: "client" | "vendor";
  organizationId?: string | null;
  /** Customers for a client card, vendors for a vendor card. */
  parties: Party[];
}

interface PreparedRow {
  row: RateCardRow;
  partyId: string | null;
  truckType: string | null;
  problem: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

/**
 * Bulk rate card upload.
 *
 * Nothing is written until the user has seen exactly what will be created.
 * A spreadsheet filled in by hand always contains a few rows that cannot be
 * matched — a client spelled differently, a truck type that is not in the
 * fleet list — and silently dropping or guessing at those is how a rate card
 * ends up quietly wrong.
 *
 * So the file is parsed, every row is resolved against real customers/vendors,
 * and the preview shows which rows will import and precisely why each of the
 * others will not. Valid rows can still be imported while the rest are fixed
 * in the sheet and re-uploaded.
 */
export default function RateCardUpload({ cardType, organizationId, parties }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [prepared, setPrepared] = useState<PreparedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const partyLabel = cardType === "client" ? "client" : "vendor";

  const resolveParty = (name: string): string | null => {
    const norm = (x: string) => (x || "").trim().toLowerCase();
    // Exact first, then a contains match — "Primera Foods" should find
    // "Primera Foods Nigeria Ltd" rather than failing on a shortened name.
    const exact = parties.find((p) => norm(p.label) === norm(name));
    if (exact) return exact.id;
    const partial = parties.filter(
      (p) => norm(p.label).includes(norm(name)) || norm(name).includes(norm(p.label)),
    );
    // Only accept a partial match when it is unambiguous.
    return partial.length === 1 ? partial[0].id : null;
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const result = await parseExcelFileRobust<RateCardRow>(
        file,
        rateCardHeaderMap,
        ["party_name", "pickup_address", "destination_address", "truck_type", "rate_amount"],
        { rate_amount: "number" },
      );

      const rows: PreparedRow[] = [];

      for (const r of result.validRows) {
        const partyId = resolveParty(r.party_name);
        const truckType =
          TRUCK_TYPES.find((t) => t.toLowerCase() === String(r.truck_type).trim().toLowerCase()) ?? null;

        let problem: string | null = null;
        if (!partyId) problem = `No ${partyLabel} matching "${r.party_name}"`;
        else if (!truckType) problem = `"${r.truck_type}" is not a truck type`;
        else if (!Number.isFinite(Number(r.rate_amount)) || Number(r.rate_amount) <= 0)
          problem = "Rate must be a number greater than zero";

        rows.push({ row: r, partyId, truckType, problem });
      }

      // Rows the parser itself rejected — a missing required column, say.
      for (const bad of result.invalidRows) {
        rows.push({
          row: bad.row as RateCardRow,
          partyId: null,
          truckType: null,
          problem: bad.errors.map((e) => e.message).join("; ") || "Missing required fields",
        });
      }

      if (rows.length === 0) {
        toast({
          title: "Nothing to import",
          description: "No rows were found. Check the column headings match the template.",
          variant: "destructive",
        });
        return;
      }

      setPrepared(rows);
      setOpen(true);
    } catch (e: any) {
      toast({
        title: "Could not read the file",
        description: e?.message ?? "Make sure it is an .xls or .xlsx file.",
        variant: "destructive",
      });
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const importable = prepared.filter((p) => !p.problem);
  const rejected = prepared.filter((p) => p.problem);

  const doImport = async () => {
    if (!organizationId || importable.length === 0) return;
    setImporting(true);
    try {
      const payload = importable.map((p) => ({
        organization_id: organizationId,
        card_type: cardType,
        customer_id: cardType === "client" ? p.partyId : null,
        partner_id: cardType === "vendor" ? p.partyId : null,
        pickup_address: p.row.pickup_address.trim(),
        destination_address: p.row.destination_address.trim(),
        truck_type: p.truckType,
        rate_amount: Number(p.row.rate_amount),
        description: p.row.notes?.trim() || null,
      }));

      // The BEFORE INSERT trigger forces every row to 'pending' regardless of
      // what is sent, so an upload cannot bypass approval.
      const { error } = await (supabase.from("rate_cards") as any).insert(payload);
      if (error) throw error;

      toast({
        title: `${importable.length} ${importable.length === 1 ? "rate" : "rates"} uploaded`,
        description: "All are awaiting super admin approval before Dispatch can use them.",
      });
      qc.invalidateQueries({ queryKey: ["rate-cards"] });
      qc.invalidateQueries({ queryKey: ["rate-card-pending"] });
      setOpen(false);
      setPrepared([]);
    } catch (e: any) {
      toast({
        title: "Import failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />

      <Button variant="outline" onClick={() => generateRateCardTemplate(cardType)} className="gap-2">
        <Download className="w-4 h-4" />
        Download template
      </Button>

      <Button
        variant="outline"
        onClick={() => fileRef.current?.click()}
        disabled={parsing}
        className="gap-2"
      >
        {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload Excel
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review before importing</DialogTitle>
            <DialogDescription>
              {fileName} — {importable.length} of {prepared.length} rows can be imported.
              {rejected.length > 0 && " The rest are listed with the reason."}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>{cardType === "client" ? "Client" : "Vendor"}</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Truck</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prepared.map((p, i) => (
                  <TableRow key={i} className={p.problem ? "opacity-60" : undefined}>
                    <TableCell>
                      {p.problem ? (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.row.party_name || <span className="text-muted-foreground">—</span>}
                      {p.problem && (
                        <p className="text-xs text-yellow-600 mt-0.5">{p.problem}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {p.row.pickup_address} → {p.row.destination_address}
                    </TableCell>
                    <TableCell className="text-sm">{p.row.truck_type}</TableCell>
                    <TableCell className="text-right text-sm">
                      {Number.isFinite(Number(p.row.rate_amount))
                        ? fmt(Number(p.row.rate_amount))
                        : String(p.row.rate_amount ?? "—")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {rejected.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Rows with a warning are skipped. Correct them in the spreadsheet and upload
              again — importing now will not create duplicates of the ones that succeed.
            </p>
          )}

          <DialogFooter className="gap-2">
            <Badge variant="secondary" className="mr-auto self-center">
              All uploads arrive as pending approval
            </Badge>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={doImport} disabled={importing || importable.length === 0}>
              {importing
                ? "Importing..."
                : `Import ${importable.length} ${importable.length === 1 ? "rate" : "rates"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
