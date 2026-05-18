import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, Upload, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PodUploadProps {
  organizationId: string;
  dispatchId: string;
  onUploaded?: (publicPath: string) => void;
}

/**
 * Driver-facing POD upload widget.
 * Stores files at: {organization_id}/{dispatch_id}/{timestamp}-{filename}
 * Updates `dispatches.pod_photo_url`, `pod_confirmed`, `pod_confirmed_by`, `pod_confirmed_at`.
 */
export function PodUpload({ organizationId, dispatchId, onUploaded }: PodUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [recipient, setRecipient] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!file) return toast.error("Select a POD photo");
    setBusy(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error("Not authenticated");

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${organizationId}/${dispatchId}/${Date.now()}-${safeName}`;

      const { error: upErr } = await supabase.storage.from("pod-photos").upload(path, file, {
        cacheControl: "3600", upsert: false,
      });
      if (upErr) throw upErr;

      const { error: updErr } = await supabase
        .from("dispatches")
        .update({
          pod_photo_url: path,
          pod_confirmed: true,
          pod_confirmed_by: userId,
          pod_confirmed_at: new Date().toISOString(),
          pod_recipient: recipient || null,
          pod_notes: notes || null,
          status: "delivered",
        })
        .eq("id", dispatchId);
      if (updErr) throw updErr;

      toast.success("POD uploaded - invoice will auto-generate if a rate card is linked");
      setDone(true);
      onUploaded?.(path);
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center gap-2 text-green-600">
          <CheckCircle2 className="h-5 w-5" /> POD uploaded successfully.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Camera className="h-5 w-5" />Upload Proof of Delivery</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>POD Photo</Label>
          <Input type="file" accept="image/*" capture="environment" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label>Recipient Name</Label>
          <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="Who signed for it?" />
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Condition, time, etc." />
        </div>
        <Button onClick={submit} disabled={busy || !file} className="w-full">
          <Upload className="h-4 w-4 mr-2" />{busy ? "Uploading…" : "Confirm Delivery"}
        </Button>
      </CardContent>
    </Card>
  );
}
