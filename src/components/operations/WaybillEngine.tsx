import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, Download, Printer, CheckCircle, Eye, Package } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface WaybillData {
  id: string;
  dispatch: {
    id: string;
    dispatch_number: string;
    pickup_address: string;
    delivery_address: string;
    cargo_description: string | null;
    status: string;
    customers: { company_name: string; contact_name: string; phone: string } | null;
    drivers: { full_name: string; phone: string } | null;
    vehicles: { plate_number?: string; registration_number?: string; truck_type: string } | null;
    total_drops: number | null;
    dispatch_date: string | null;
  };
}

const WaybillEngine = () => {
  const { toast } = useToast();
  const { user, organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [previewWaybill, setPreviewWaybill] = useState<WaybillData | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("default");
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      const { data } = await supabase
        .from("waybill_templates" as any)
        .select("id, name, format, file_path, is_default")
        .eq("organization_id", organizationId)
        .order("is_default", { ascending: false });
      const list = (data ?? []) as any[];
      setTemplates(list);
      const def = list.find((t) => t.is_default);
      if (def) setSelectedTemplateId(def.id);
    })();
  }, [organizationId]);

  // Fetch dispatches ready for waybill generation
  const { data: dispatches, isLoading } = useQuery({
    queryKey: ["waybill-dispatches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, pickup_address, delivery_address,
          cargo_description, status, total_drops, dispatch_date,
          customers (company_name, contact_name, phone),
          drivers (full_name, phone),
          vehicles (registration_number, truck_type)
        `)
        .in("status", ["assigned", "approved", "in_transit", "picked_up", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const generateWaybillPDF = async (dispatch: any) => {
    const waybillId = `WB-${format(new Date(), "yyyyMMdd")}-${dispatch.dispatch_number?.split("-").pop() || "0000"}`;

    // If a custom template is selected, hand the client their template file.
    const tpl = templates.find((t) => t.id === selectedTemplateId);
    if (tpl) {
      const { data, error } = await supabase.storage
        .from("waybill-templates")
        .createSignedUrl(tpl.file_path, 60);
      if (error || !data?.signedUrl) {
        toast({ title: "Template fetch failed", description: error?.message ?? "Falling back to default", variant: "destructive" });
      } else {
        window.open(data.signedUrl, "_blank");
        toast({ title: "Custom Template Opened", description: `${tpl.name} (${tpl.format.toUpperCase()}) - fill consignor/consignee details from dispatch ${dispatch.dispatch_number}` });
        return;
      }
    }

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("WAYBILL", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Waybill #: ${waybillId}`, 14, 35);
    doc.text(`Dispatch #: ${dispatch.dispatch_number}`, 14, 42);
    doc.text(`Date: ${format(new Date(), "dd MMM yyyy HH:mm")}`, 140, 35);

    // Consignor / Consignee
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CONSIGNOR (Pickup)", 14, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dispatch.customers?.company_name || "N/A", 14, 62);
    doc.text(dispatch.customers?.contact_name || "", 14, 68);
    doc.text(dispatch.customers?.phone || "", 14, 74);
    doc.text(dispatch.pickup_address || "N/A", 14, 80, { maxWidth: 80 });

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("CONSIGNEE (Delivery)", 110, 55);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dispatch.delivery_address || "N/A", 110, 62, { maxWidth: 80 });

    // Vehicle & Driver
    doc.setDrawColor(200);
    doc.line(14, 95, 196, 95);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("VEHICLE & DRIVER", 14, 103);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Driver: ${dispatch.drivers?.full_name || "Unassigned"}`, 14, 110);
    doc.text(`Phone: ${dispatch.drivers?.phone || "N/A"}`, 14, 116);
    doc.text(`Vehicle: ${dispatch.vehicles?.registration_number || "N/A"}`, 110, 110);
    doc.text(`Type: ${dispatch.vehicles?.truck_type || "N/A"}`, 110, 116);

    // Cargo
    doc.line(14, 123, 196, 123);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("GOODS DESCRIPTION", 14, 131);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dispatch.cargo_description || "General cargo", 14, 138, { maxWidth: 180 });

    if (dispatch.total_drops) {
      doc.text(`Total Drops: ${dispatch.total_drops}`, 14, 148);
    }

    // Signature boxes
    doc.line(14, 200, 196, 200);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("SENDER SIGNATURE", 14, 210);
    doc.rect(14, 215, 80, 30);
    doc.text("RECEIVER SIGNATURE", 110, 210);
    doc.rect(110, 215, 80, 30);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Date: _______________", 14, 255);
    doc.text("Date: _______________", 110, 255);

    // Footer
    doc.setFontSize(7);
    doc.text("Generated by RouteAce Logistics OS", 105, 280, { align: "center" });

    doc.save(`Waybill-${waybillId}.pdf`);
    toast({ title: "Waybill Generated", description: `${waybillId} downloaded successfully` });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "assigned": return "bg-blue-500/15 text-blue-600";
      case "approved": return "bg-emerald-500/15 text-emerald-600";
      case "in_transit": return "bg-amber-500/15 text-amber-600";
      case "delivered": return "bg-green-500/15 text-green-600";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Waybill Engine
              </CardTitle>
              <CardDescription>Generate, preview, and manage waybills for approved dispatches</CardDescription>
            </div>
            <div className="flex items-center gap-2 min-w-[260px]">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Template:</span>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Built-in PDF (default)</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} · {t.format.toUpperCase()}{t.is_default ? " ★" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : dispatches && dispatches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispatch #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.dispatch_number}</TableCell>
                    <TableCell>{d.customers?.company_name || "-"}</TableCell>
                    <TableCell className="text-sm max-w-40 truncate">
                      {d.pickup_address?.split(",")[0]} → {d.delivery_address?.split(",")[0]}
                    </TableCell>
                    <TableCell>{d.drivers?.full_name || <span className="text-muted-foreground">Unassigned</span>}</TableCell>
                    <TableCell>{d.vehicles?.registration_number || "-"}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(d.status)}>{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setPreviewWaybill({ id: d.id, dispatch: d })}>
                          <Eye className="w-3 h-3 mr-1" /> Preview
                        </Button>
                        <Button size="sm" onClick={() => generateWaybillPDF(d)}>
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No dispatches ready for waybill generation</p>
              <p className="text-sm mt-1">Dispatches must be assigned or approved to generate waybills</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewWaybill} onOpenChange={() => setPreviewWaybill(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Waybill Preview</DialogTitle>
          </DialogHeader>
          {previewWaybill && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">DISPATCH #</p>
                  <p className="font-mono">{previewWaybill.dispatch.dispatch_number}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">DATE</p>
                  <p>{format(new Date(), "dd MMM yyyy")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">CONSIGNOR</p>
                  <p className="font-medium">{previewWaybill.dispatch.customers?.company_name || "N/A"}</p>
                  <p className="text-muted-foreground">{previewWaybill.dispatch.pickup_address}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">CONSIGNEE</p>
                  <p className="text-muted-foreground">{previewWaybill.dispatch.delivery_address}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">DRIVER</p>
                  <p>{previewWaybill.dispatch.drivers?.full_name || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">VEHICLE</p>
                  <p>{previewWaybill.dispatch.vehicles?.registration_number || "N/A"}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">GOODS</p>
                <p>{previewWaybill.dispatch.cargo_description || "General cargo"}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewWaybill(null)}>Close</Button>
            <Button onClick={() => { generateWaybillPDF(previewWaybill!.dispatch); setPreviewWaybill(null); }}>
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WaybillEngine;
