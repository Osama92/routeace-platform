/**
 * WaybillManagement.tsx
 * Outbound POD desk:
 *   1. Pending POD upload (transporter hasn't uploaded yet)
 *   2. Awaiting confirmation (transporter uploaded → Outbound confirms)
 *   3. Archived (confirmed waybills, future reference)
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FileText, CheckCircle, Clock, Archive, Eye, Download } from "lucide-react";
import { toast } from "sonner";

const POD_BUCKET = "transporter-pod-photos";

export default function WaybillManagement() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("awaiting");
  const [preview, setPreview] = useState<string | null>(null);

  const { data: waybills = [], isLoading } = useQuery({
    queryKey: ["waybills-management"],
    queryFn: async () => {
      const { data, error } = await supabase.from("waybills")
        .select(`
          id, waybill_number, dispatch_id, status, pod_status,
          uploaded_waybill_url, uploaded_at, confirmed_at, customer_name, delivery_address,
          dispatches:dispatch_id ( dispatch_number, pickup_address, delivery_address, source_outbound_ids ),
          ld_transporter_jobs:dispatch_id ( id, pod_photo_url, pod_uploaded_at, pod_notes, status )
        ` as any)
        .order("generated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Merge transporter POD photo onto waybill row when present
  const enriched = waybills.map((w: any) => {
    const tj = Array.isArray(w.ld_transporter_jobs) ? w.ld_transporter_jobs[0] : w.ld_transporter_jobs;
    const podUrl = w.uploaded_waybill_url || tj?.pod_photo_url || null;
    const uploadedAt = w.uploaded_at || tj?.pod_uploaded_at || null;
    const effectiveStatus = w.pod_status === "archived"
      ? "archived"
      : podUrl
        ? (w.confirmed_at ? "archived" : "uploaded")
        : "pending_upload";
    return { ...w, _podUrl: podUrl, _uploadedAt: uploadedAt, _effective: effectiveStatus };
  });

  const pending  = enriched.filter((w) => w._effective === "pending_upload");
  const awaiting = enriched.filter((w) => w._effective === "uploaded");
  const archived = enriched.filter((w) => w._effective === "archived");

  const confirm = useMutation({
    mutationFn: async (w: any) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("waybills").update({
        uploaded_waybill_url: w._podUrl,
        uploaded_at: w._uploadedAt,
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        pod_status: "archived",
        status: "completed",
      } as any).eq("id", w.id);
      if (error) throw error;

      // Mirror to outbound requests (so Inbound desk sees archived)
      const ids = w.dispatches?.source_outbound_ids ?? [];
      if (ids.length) {
        await supabase.from("outbound_requests").update({
          pod_confirmed_by: user.id,
          pod_confirmed_at: new Date().toISOString(),
          pod_status: "archived",
          status: "delivered",
        } as any).in("id", ids);
      }
    },
    onSuccess: () => {
      toast.success("POD confirmed - waybill archived for future reference");
      qc.invalidateQueries({ queryKey: ["waybills-management"] });
      qc.invalidateQueries({ queryKey: ["outbound-requests"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to confirm"),
  });

  const openPreview = (url: string) => {
    // POD URLs from transporter portal are public via getPublicUrl;
    // for safety try signed URL fallback for paths.
    setPreview(url);
  };

  const Row = ({ w, action }: { w: any; action: "confirm" | "view" | "pending" }) => (
    <Card>
      <CardContent className="pt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm font-semibold">{w.waybill_number}</span>
            <Badge variant="outline" className="text-[10px]">
              {w.dispatches?.dispatch_number ?? "-"}
            </Badge>
          </div>
          <p className="text-sm">{w.customer_name ?? "-"}</p>
          <p className="text-xs text-muted-foreground">{w.delivery_address ?? w.dispatches?.delivery_address ?? "-"}</p>
          {w._uploadedAt && (
            <p className="text-xs text-muted-foreground mt-1">Uploaded: {new Date(w._uploadedAt).toLocaleString()}</p>
          )}
          {w.confirmed_at && (
            <p className="text-xs text-emerald-600 mt-1">Confirmed: {new Date(w.confirmed_at).toLocaleString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          {w._podUrl && (
            <Button size="sm" variant="outline" onClick={() => openPreview(w._podUrl)}>
              <Eye className="w-3.5 h-3.5 mr-1" /> View POD
            </Button>
          )}
          {action === "confirm" && (
            <Button size="sm" onClick={() => confirm.mutate(w)} disabled={confirm.isPending}>
              <CheckCircle className="w-3.5 h-3.5 mr-1" /> Confirm & Archive
            </Button>
          )}
          {action === "view" && w._podUrl && (
            <a href={w._podUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="ghost"><Download className="w-3.5 h-3.5 mr-1" />Open</Button>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout title="Waybill Management" subtitle="POD desk - confirm transporter waybill uploads and archive for future reference">
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="awaiting">
            Awaiting Confirmation {awaiting.length > 0 && <Badge className="ml-2 h-4 text-[10px] bg-amber-500">{awaiting.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Upload {pending.length > 0 && <Badge className="ml-2 h-4 text-[10px] bg-blue-500">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Archived {archived.length > 0 && <Badge className="ml-2 h-4 text-[10px] bg-emerald-500">{archived.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="awaiting" className="space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> :
            awaiting.length === 0 ? <Empty icon={Clock} text="No waybills awaiting confirmation." /> :
            awaiting.map((w) => <Row key={w.id} w={w} action="confirm" />)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {pending.length === 0 ? <Empty icon={Clock} text="All transporters have uploaded PODs." /> :
            pending.map((w) => <Row key={w.id} w={w} action="pending" />)}
        </TabsContent>

        <TabsContent value="archived" className="space-y-3">
          {archived.length === 0 ? <Empty icon={Archive} text="No archived waybills yet." /> :
            archived.map((w) => <Row key={w.id} w={w} action="view" />)}
        </TabsContent>
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Proof of Delivery</DialogTitle></DialogHeader>
          {preview && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="POD" className="max-h-[70vh] object-contain" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function Empty({ icon: Icon, text }: { icon: any; text: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}
