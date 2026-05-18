/**
 * TransporterPortal.tsx
 *
 * 3PL Transporter portal for LOGISTICS_DEPARTMENT mode.
 * Shown when a user with role 'transporter' logs in to an LD org.
 */

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Truck, MapPin, CheckCircle, Clock, Upload, AlertTriangle,
  Package, XCircle, Activity, RefreshCw,
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  assigned:         { label: "Awaiting Acceptance", class: "bg-blue-500/20 text-blue-700 border-blue-500/30", icon: Clock },
  accepted:         { label: "Accepted",            class: "bg-teal-500/20 text-teal-700 border-teal-500/30", icon: CheckCircle },
  pickup_confirmed: { label: "Picked Up",           class: "bg-purple-500/20 text-purple-700 border-purple-500/30", icon: Truck },
  in_transit:       { label: "In Transit",          class: "bg-orange-500/20 text-orange-700 border-orange-500/30", icon: Truck },
  delivered:        { label: "Delivered",           class: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle },
  pod_uploaded:     { label: "POD Uploaded ✓",      class: "bg-green-500/20 text-green-700 border-green-500/30", icon: CheckCircle },
  disputed:         { label: "Disputed",            class: "bg-red-500/20 text-red-700 border-red-500/30", icon: AlertTriangle },
  cancelled:        { label: "Cancelled",           class: "bg-gray-500/20 text-gray-700", icon: XCircle },
};

export default function TransporterPortal() {
  const { user, organizationId: orgId } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState("active");
  const [podOpen, setPodOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationText, setLocationText] = useState("");
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [podNotes, setPodNotes] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  // Unified Update Status dialog
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [dialogJob, setDialogJob] = useState<any>(null);
  const [jobUpdate, setJobUpdate] = useState({ status: "", location: "", notes: "" });
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: transporterRecord } = useQuery({
    queryKey: ["my-transporter-record", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase.from("ld_transporters" as any) as any)
        .select("id, company_name, contact_name, onboarding_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["transporter-jobs", transporterRecord?.id],
    enabled: !!transporterRecord?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase.from("ld_transporter_jobs" as any) as any)
        .select(`
          id, status, assigned_at, accepted_at, pickup_confirmed_at,
          delivered_at, pod_photo_url, pod_notes, pod_uploaded_at,
          agreed_rate, dispute_reason, current_location, location_updated_at,
          dispatches:dispatch_id (
            id, dispatch_number, pickup_address, delivery_address,
            cargo_description, cargo_weight_kg, scheduled_pickup,
            scheduled_delivery, notes
          )
        `)
        .eq("transporter_id", transporterRecord!.id)
        .order("assigned_at", { ascending: false });
      return data ?? [];
    },
  });

  const activeJobs    = jobs.filter((j: any) => ["assigned","accepted","pickup_confirmed","in_transit"].includes(j.status));
  const completedJobs = jobs.filter((j: any) => ["delivered","pod_uploaded"].includes(j.status));
  const needsPOD      = jobs.filter((j: any) => j.status === "delivered" && !j.pod_photo_url);

  const notifyOrg = async (jobId: string, status: string, notes?: string) => {
    try {
      await supabase.functions.invoke("notify-org-transporter-update", {
        body: { job_id: jobId, status, notes },
      });
    } catch (e) {
      console.warn("[transporter] notify-org failed (non-fatal)", e);
    }
  };

  const updateJobStatus = useMutation({
    mutationFn: async ({ jobId, status, extra = {} }: { jobId: string; status: string; extra?: any }) => {
      // 1. Update the job record
      const { error } = await (supabase.from("ld_transporter_jobs" as any) as any)
        .update({ status, ...extra, updated_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("transporter_id", transporterRecord!.id);
      if (error) throw error;

      // 2. Notify the logistics org (existing - unchanged)
      notifyOrg(jobId, status);

      // 3. Notify end client via update-delivery-status
      const CLIENT_STATUS_MAP: Record<string, string> = {
        accepted: "assigned",
        pickup_confirmed: "picked_up",
        in_transit: "in_transit",
        pod_uploaded: "delivered",
      };
      const dispatchStatus = CLIENT_STATUS_MAP[status];
      if (dispatchStatus) {
        (supabase.from("ld_transporter_jobs" as any) as any)
          .select("dispatch_id")
          .eq("id", jobId)
          .single()
          .then(({ data: jobRow }: any) => {
            if (!jobRow?.dispatch_id) return;
            supabase.functions
              .invoke("update-delivery-status", {
                body: {
                  dispatch_id: jobRow.dispatch_id,
                  status: dispatchStatus,
                  notes:
                    "This update was sent by your assigned transport provider via the RouteAce portal.",
                },
              })
              .catch((e: any) =>
                console.warn("[transporter] client notify failed (non-fatal):", e)
              );
          })
          .catch((e: any) => console.warn("[transporter] job lookup failed:", e));
      }
    },
    onSuccess: (_, { status }) => {
      toast.success(
        status === "accepted"         ? "Job accepted ✓ - logistics team notified" :
        status === "pickup_confirmed" ? "Pickup confirmed ✓ - logistics team notified" :
        status === "in_transit"       ? "Marked in transit ✓ - In-Transit Monitor updated" :
        "Updated"
      );
      qc.invalidateQueries({ queryKey: ["transporter-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const submitJobUpdate = async () => {
    if (!dialogJob || !jobUpdate.status) return;
    setSubmittingUpdate(true);
    try {
      const extra: any = {};
      if (jobUpdate.status === "accepted") extra.accepted_at = new Date().toISOString();
      if (jobUpdate.status === "pickup_confirmed") extra.pickup_confirmed_at = new Date().toISOString();
      if (jobUpdate.location) extra.current_location = jobUpdate.location.trim();

      await updateJobStatus.mutateAsync({
        jobId: dialogJob.id,
        status: jobUpdate.status,
        extra,
      });

      // Notify the LD org (notes carry agent message)
      notifyOrg(dialogJob.id, jobUpdate.status, jobUpdate.notes || undefined);

      // Mirror the client-facing email with location/notes context
      const CLIENT_STATUS_MAP: Record<string, string> = {
        accepted: "assigned",
        pickup_confirmed: "picked_up",
        in_transit: "in_transit",
        pod_uploaded: "delivered",
      };
      const clientStatus = CLIENT_STATUS_MAP[jobUpdate.status];
      if (clientStatus && dialogJob.dispatch_id) {
        supabase.functions
          .invoke("update-delivery-status", {
            body: {
              dispatch_id: dialogJob.dispatch_id,
              status: clientStatus,
              location: jobUpdate.location || null,
              notes: jobUpdate.notes
                ? jobUpdate.notes
                : "Update from your assigned transporter.",
            },
          })
          .catch((e) => console.warn("[transporter] client notify failed:", e));
      }

      toast.success("Status updated ✓");
      setUpdateDialogOpen(false);
      setDialogJob(null);
      setJobUpdate({ status: "", location: "", notes: "" });
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const uploadPOD = async (file: File) => {
    if (!selectedJob || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${orgId}/${selectedJob.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("transporter-pod-photos")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;

      // Generate a long-lived signed URL (7 days) for the private bucket
      const { data: signedData, error: signErr } = await supabase.storage
        .from("transporter-pod-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 7);
      if (signErr) throw signErr;

      const now = new Date().toISOString();
      const { error: dbErr } = await (supabase.from("ld_transporter_jobs" as any) as any)
        .update({
          status: "pod_uploaded",
          pod_photo_url: signedData!.signedUrl,
          pod_notes: podNotes || null,
          pod_uploaded_at: now,
          delivered_at: now,
          updated_at: now,
        })
        .eq("id", selectedJob.id)
        .eq("transporter_id", transporterRecord!.id);
      if (dbErr) throw dbErr;
      notifyOrg(selectedJob.id, "pod_uploaded", podNotes);

      toast.success("POD uploaded. Delivery confirmed - synced to the logistics team ✓");
      setPodOpen(false);
      setPodNotes("");
      setSelectedJob(null);
      qc.invalidateQueries({ queryKey: ["transporter-jobs"] });
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const raiseDispute = useMutation({
    mutationFn: async () => {
      if (!selectedJob || !disputeReason.trim()) throw new Error("Reason required");
      const { error } = await (supabase.from("ld_transporter_jobs" as any) as any)
        .update({ status: "disputed", dispute_reason: disputeReason, updated_at: new Date().toISOString() })
        .eq("id", selectedJob.id)
        .eq("transporter_id", transporterRecord!.id);
      if (error) throw error;
      notifyOrg(selectedJob.id, "disputed", disputeReason);
    },
    onSuccess: () => {
      toast.success("Dispute raised - the logistics team has been notified");
      setDisputeOpen(false);
      setDisputeReason("");
      setSelectedJob(null);
      qc.invalidateQueries({ queryKey: ["transporter-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateLocation = useMutation({
    mutationFn: async () => {
      if (!selectedJob || !locationText.trim()) throw new Error("Location is required");
      const { error } = await (supabase.from("ld_transporter_jobs" as any) as any)
        .update({
          current_location: locationText.trim(),
          location_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedJob.id)
        .eq("transporter_id", transporterRecord!.id);
      if (error) throw error;
      notifyOrg(selectedJob.id, "location_update", locationText.trim());
    },
    onSuccess: () => {
      toast.success("Location shared - logistics team can see your position ✓");
      setLocationOpen(false);
      setLocationText("");
      setSelectedJob(null);
      qc.invalidateQueries({ queryKey: ["transporter-jobs"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (transporterRecord?.onboarding_status === "pending_approval") {
    return (
      <DashboardLayout title="3PL Transporter Portal" subtitle="">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-sm">
            <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Awaiting Approval</h3>
            <p className="text-muted-foreground">
              Your account is pending approval from the Head of Logistics.
              You'll receive an email once approved and can start accepting jobs.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const transporterDisplayName =
    transporterRecord?.company_name ||
    transporterRecord?.contact_name ||
    (user?.user_metadata as any)?.full_name ||
    user?.email ||
    "Transporter";

  return (
    <DashboardLayout
      title={`Welcome, ${transporterDisplayName}`}
      subtitle="Your assigned jobs • POD upload • Delivery confirmation"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card><CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-1"><Package className="w-4 h-4 text-blue-500" /><p className="text-xs text-muted-foreground">Active Jobs</p></div>
            <p className="text-2xl font-black text-blue-500">{activeJobs.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4 text-amber-500" /><p className="text-xs text-muted-foreground">POD Needed</p></div>
            <p className="text-2xl font-black text-amber-500">{needsPOD.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-1"><CheckCircle className="w-4 h-4 text-green-600" /><p className="text-xs text-muted-foreground">Completed</p></div>
            <p className="text-2xl font-black text-green-600">{completedJobs.length}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 mb-1"><Activity className="w-4 h-4 text-primary" /><p className="text-xs text-muted-foreground">Total Jobs</p></div>
            <p className="text-2xl font-black text-primary">{jobs.length}</p>
          </CardContent></Card>
        </div>

        {needsPOD.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {needsPOD.length} delivered job{needsPOD.length > 1 ? "s" : ""} need{needsPOD.length === 1 ? "s" : ""} POD upload.
              The logistics team cannot close the delivery until you upload proof.
            </p>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="active">
              Active Jobs {activeJobs.length > 0 && <Badge className="ml-1 h-4 text-[10px] bg-blue-500">{activeJobs.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="pod">
              Upload POD {needsPOD.length > 0 && <Badge className="ml-1 h-4 text-[10px] bg-amber-500">{needsPOD.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="history">Job History</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {activeJobs.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <Truck className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No active jobs right now. New assignments will appear here.</p>
              </div>
            )}
            {activeJobs.map((job: any) => {
              const dispatch = job.dispatches;
              const sc = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.assigned;
              const SIcon = sc.icon;
              return (
                <Card key={job.id} className={`border-l-4 ${
                  job.status === "assigned" ? "border-l-blue-500" :
                  job.status === "accepted" ? "border-l-teal-500" :
                  "border-l-orange-500"
                }`}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold">{dispatch?.dispatch_number ?? job.id.slice(0,8)}</p>
                          <Badge className={`${sc.class} text-[10px] flex items-center gap-1`} variant="outline">
                            <SIcon className="w-3 h-3" />{sc.label}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                            <p><span className="text-muted-foreground">From:</span> {dispatch?.pickup_address}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-teal-500 mt-0.5 shrink-0" />
                            <p><span className="text-muted-foreground">To:</span> {dispatch?.delivery_address}</p>
                          </div>
                          {dispatch?.cargo_description && (
                            <p className="text-xs text-muted-foreground"><span className="font-medium">Cargo:</span> {dispatch.cargo_description} {dispatch.cargo_weight_kg ? `· ${dispatch.cargo_weight_kg}kg` : ""}</p>
                          )}
                          {dispatch?.scheduled_delivery && (
                            <p className="text-xs text-amber-600 font-medium">
                              ⏱ ETA: {format(new Date(dispatch.scheduled_delivery), "MMM d, HH:mm")}
                            </p>
                          )}
                          {job.agreed_rate && (
                            <p className="text-xs text-teal-600 font-medium">
                              Agreed rate: ₦{Number(job.agreed_rate).toLocaleString()}
                            </p>
                          )}
                          {dispatch?.notes && <p className="text-xs text-muted-foreground italic">{dispatch.notes}</p>}
                          {job.current_location && (
                            <p className="text-xs text-teal-600 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Last location: {job.current_location}
                              {job.location_updated_at && (
                                <span className="text-muted-foreground text-[10px] ml-1">
                                  · {format(new Date(job.location_updated_at), "MMM d HH:mm")}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0 min-w-[150px]">
                        {/* Unified Update Status - replaces individual advance buttons */}
                        {(job.status === "assigned" ||
                          job.status === "accepted" ||
                          job.status === "pickup_confirmed" ||
                          job.status === "in_transit") && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              setDialogJob(job);
                              const nextStatus: Record<string, string> = {
                                assigned: "accepted",
                                accepted: "pickup_confirmed",
                                pickup_confirmed: "in_transit",
                                in_transit: "pod_uploaded",
                              };
                              setJobUpdate({
                                status: nextStatus[job.status] ?? "",
                                location: "",
                                notes: "",
                              });
                              setUpdateDialogOpen(true);
                            }}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Update Status
                          </Button>
                        )}
                        {job.status === "assigned" && (
                          <Button size="sm" variant="outline" className="border-red-400 text-red-600" onClick={() => { setSelectedJob(job); setDisputeOpen(true); }}>
                            <XCircle className="w-3.5 h-3.5 mr-1" />Cannot Do
                          </Button>
                        )}
                        {job.status === "in_transit" && (
                          <>
                            <Button size="sm" variant="outline"
                              onClick={() => { setSelectedJob(job); setLocationOpen(true); setLocationText(job.current_location ?? ""); }}>
                              <MapPin className="w-3.5 h-3.5 mr-1" />Update Location
                            </Button>
                            <Button size="sm" onClick={() => { setSelectedJob(job); setPodOpen(true); }}>
                              <Upload className="w-3.5 h-3.5 mr-1" />Upload POD
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-400 text-red-600 text-xs" onClick={() => { setSelectedJob(job); setDisputeOpen(true); }}>
                              <AlertTriangle className="w-3.5 h-3.5 mr-1" />Raise Dispute
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="pod" className="mt-4 space-y-3">
            {needsPOD.length === 0 && (
              <div className="text-center py-10 text-green-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                <p className="font-semibold">All deliveries have POD uploaded ✓</p>
              </div>
            )}
            {needsPOD.map((job: any) => {
              const dispatch = job.dispatches;
              return (
                <Card key={job.id} className="border-l-4 border-l-amber-500">
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div>
                        <p className="font-bold">{dispatch?.dispatch_number}</p>
                        <p className="text-sm text-muted-foreground">{dispatch?.pickup_address} → {dispatch?.delivery_address}</p>
                        <p className="text-xs text-amber-600 mt-1">Delivered - POD required to close this job</p>
                      </div>
                      <Button size="sm" onClick={() => { setSelectedJob(job); setPodOpen(true); }}>
                        <Upload className="w-3.5 h-3.5 mr-1" />Upload POD Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {completedJobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">No completed jobs yet.</div>
            )}
            {completedJobs.map((job: any) => {
              const dispatch = job.dispatches;
              const sc = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.delivered;
              return (
                <Card key={job.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-sm">{dispatch?.dispatch_number}</p>
                        <p className="text-xs text-muted-foreground">{dispatch?.pickup_address} → {dispatch?.delivery_address}</p>
                        {job.delivered_at && <p className="text-xs text-muted-foreground mt-1">Delivered: {format(new Date(job.delivered_at), "MMM d, yyyy HH:mm")}</p>}
                        {job.pod_photo_url && <p className="text-xs text-green-600 mt-0.5">✓ POD uploaded</p>}
                        {job.agreed_rate && <p className="text-xs text-teal-600 mt-0.5">Rate: ₦{Number(job.agreed_rate).toLocaleString()}</p>}
                      </div>
                      <Badge className={`${sc.class} text-[10px]`} variant="outline">{sc.label}</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={podOpen} onOpenChange={setPodOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Proof of Delivery</DialogTitle>
            <DialogDescription>
              Take a clear photo of the signed delivery note or recipient confirmation.
              Once uploaded, the logistics team is automatically notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Tap to upload POD photo</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG - max 10MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadPOD(file);
              }}
            />
            <div className="space-y-1.5">
              <Label>Delivery Notes (optional)</Label>
              <Textarea
                placeholder="Any issues at delivery? Recipient name? Special notes..."
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPodOpen(false)} disabled={uploading}>Cancel</Button>
            <Button disabled={uploading} onClick={() => fileInputRef.current?.click()}>{uploading ? "Uploading…" : "Choose File"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raise a Dispute</DialogTitle>
            <DialogDescription>
              Flag an issue with this delivery. The logistics team will be notified
              immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason for dispute *</Label>
            <Textarea
              placeholder="Describe the issue - recipient absent, wrong address, damaged goods, etc."
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={raiseDispute.isPending || !disputeReason.trim()}
              onClick={() => raiseDispute.mutate()}
            >
              {raiseDispute.isPending ? "Submitting…" : "Submit Dispute"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Your Location</DialogTitle>
            <DialogDescription>
              The logistics team will see this instantly in the In-Transit Monitor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Where are you now? *</Label>
            <Input
              placeholder="e.g. Sagamu Interchange, Ogun State"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setLocationOpen(false); setLocationText(""); }}>Cancel</Button>
            <Button
              disabled={updateLocation.isPending || !locationText.trim()}
              onClick={() => updateLocation.mutate()}>
              {updateLocation.isPending ? "Sending…" : "Send Location Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Update Job Status</DialogTitle>
            <DialogDescription>
              {dialogJob?.dispatches?.dispatch_number ?? dialogJob?.dispatch_number ?? "This update"}
              {" - your client will be notified by email."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Job Status</Label>
              <Select
                value={jobUpdate.status}
                onValueChange={(v) => setJobUpdate((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Assigned to Driver</SelectItem>
                  <SelectItem value="pickup_confirmed">Order Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="pod_uploaded">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Current Location
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                value={jobUpdate.location}
                onChange={(e) => setJobUpdate((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Asaba, Delta State"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Notes
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Textarea
                value={jobUpdate.notes}
                onChange={(e) => setJobUpdate((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any details for the client..."
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitJobUpdate} disabled={submittingUpdate || !jobUpdate.status}>
              {submittingUpdate ? "Updating..." : "Update Dispatch Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
