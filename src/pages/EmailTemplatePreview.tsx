import { useState, useMemo } from "react";
import DOMPurify from "dompurify";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Eye, History, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const STATUS_OPTIONS = [
  { value: "assigned", label: "Assigned to Driver" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "delayed", label: "Delayed" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  STATUS_OPTIONS.map((s) => [s.value, s.label]),
);

const STATUS_MESSAGES: Record<string, string> = {
  assigned: "Your shipment has been assigned to a driver and will be picked up shortly.",
  picked_up: "Your shipment has been picked up and is now on its way to you.",
  in_transit: "Your shipment is currently in transit and moving toward the delivery address.",
  delayed: "Your shipment has been delayed. Our team is working to deliver it as quickly as possible.",
  delivered: "Your shipment has been successfully delivered. Thank you for your business.",
  cancelled: "Your shipment has been cancelled. Please contact us if you have any questions.",
};

function buildPreviewHtml(opts: {
  orgName: string;
  status: string;
  customerName: string;
  dispatchNum: string;
  pickupAddr: string;
  delivAddr: string;
  location?: string;
  notes?: string;
  trackingUrl: string;
  siteUrl: string;
}) {
  const { orgName, status, customerName, dispatchNum, pickupAddr, delivAddr, location, notes, trackingUrl, siteUrl } = opts;
  const badgeColor = status === "delivered" ? "#16a34a" : status === "delayed" || status === "cancelled" ? "#dc2626" : "#0891b2";
  const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="background:#f4f6f8;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2937;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb;">
      <div style="font-size:18px;font-weight:700;color:#0f172a;">${esc(orgName)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">Powered by RouteAce · routeace.app</div>
    </div>
    <div style="padding:28px;">
      <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">Shipment Update</div>
      <div style="display:inline-block;padding:6px 14px;border-radius:999px;background:${badgeColor};color:#fff;font-size:13px;font-weight:600;">${esc(STATUS_LABEL[status] ?? status)}</div>
      <p style="font-size:15px;line-height:1.55;margin:20px 0 12px;">Dear ${esc(customerName || "Valued Customer")},</p>
      <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#374151;">${esc(STATUS_MESSAGES[status] ?? `Status: ${status}`)}</p>
      ${notes ? `<div style="background:#f9fafb;border-left:3px solid ${badgeColor};padding:12px 14px;border-radius:6px;margin:16px 0;font-size:14px;color:#374151;">${esc(notes)}</div>` : ""}
      <table style="width:100%;border:1px solid #e5e7eb;border-radius:8px;border-collapse:separate;margin:20px 0;">
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">Dispatch No.</strong><div style="color:#0f172a;font-weight:600;margin-top:2px;">${esc(dispatchNum)}</div></td></tr>
        <tr><td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">From</strong><div style="margin-top:2px;">${esc(pickupAddr)}</div></td></tr>
        <tr><td style="padding:12px 16px;${location ? "border-bottom:1px solid #e5e7eb;" : ""}font-size:13px;"><strong style="color:#6b7280;font-weight:500;">To</strong><div style="margin-top:2px;">${esc(delivAddr)}</div></td></tr>
        ${location ? `<tr><td style="padding:12px 16px;font-size:13px;"><strong style="color:#6b7280;font-weight:500;">Current Location</strong><div style="margin-top:2px;">${esc(location)}</div></td></tr>` : ""}
      </table>
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${esc(trackingUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">Track Your Shipment</a>
      </div>
    </div>
    <div style="padding:20px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 8px;">Sent by ${esc(orgName)} via the RouteAce platform.</p>
      <p style="font-size:12px;color:#9ca3af;margin:0;">RouteAce · ${esc(siteUrl)}</p>
    </div>
  </div>
</div>`;
}

export default function EmailTemplatePreview() {
  const { organizationId } = useAuth();
  const wl = useWhiteLabel();

  const [status, setStatus] = useState("in_transit");
  const [customerName, setCustomerName] = useState("Jane Doe");
  const [dispatchNum, setDispatchNum] = useState("DSP-PREVIEW-001");
  const [pickupAddr, setPickupAddr] = useState("Apapa Port, Lagos");
  const [delivAddr, setDelivAddr] = useState("Plot 12, Ikeja, Lagos");
  const [location, setLocation] = useState("Berger checkpoint");
  const [notes, setNotes] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testDispatchId, setTestDispatchId] = useState("");
  const [sending, setSending] = useState(false);

  const orgName = wl.brandName || "Your Logistics Co.";
  const siteUrl = "https://routeace.app";

  const html = useMemo(
    () =>
      buildPreviewHtml({
        orgName,
        status,
        customerName,
        dispatchNum,
        pickupAddr,
        delivAddr,
        location,
        notes,
        trackingUrl: `${siteUrl}/public-tracking?ref=${encodeURIComponent(dispatchNum)}`,
        siteUrl,
      }),
    [orgName, status, customerName, dispatchNum, pickupAddr, delivAddr, location, notes],
  );

  const handleTestSend = async () => {
    if (!testDispatchId) {
      toast.error("Enter a real dispatch ID to send a live test (the recipient is the customer on file).");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-delivery-status", {
        body: { dispatch_id: testDispatchId, status, location: location || null, notes: notes || null },
      });
      if (error) throw error;
      toast.success((data as any)?.email_sent ? "Test email sent" : "No client email on dispatch");
    } catch (e: any) {
      toast.error("Send failed", { description: e?.message });
    } finally {
      setSending(false);
    }
  };

  const { data: logs, refetch } = useQuery({
    queryKey: ["client-notification-log", organizationId],
    queryFn: async () => {
      const q = supabase
        .from("client_notification_log" as any)
        .select("id, dispatch_id, recipient_email, dispatch_status, attempts, success, error_message, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!organizationId,
  });

  return (
    <DashboardLayout title="Email Template Preview" subtitle="Preview the branded delivery-update email and inspect recent send attempts.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" /> Template inputs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Customer name</Label><Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></div>
                <div><Label>Dispatch No.</Label><Input value={dispatchNum} onChange={(e) => setDispatchNum(e.target.value)} /></div>
              </div>
              <div><Label>Pickup</Label><Input value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} /></div>
              <div><Label>Delivery</Label><Input value={delivAddr} onChange={(e) => setDelivAddr(e.target.value)} /></div>
              <div><Label>Current location (optional)</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} /></div>
              <div><Label>Note to client (optional)</Label><Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></div>

              <div className="border-t pt-3 mt-3 space-y-2">
                <Label>Send a real test</Label>
                <Input
                  placeholder="Existing dispatch UUID (sends to that dispatch's customer)"
                  value={testDispatchId}
                  onChange={(e) => setTestDispatchId(e.target.value)}
                />
                <Button onClick={handleTestSend} disabled={sending || !testDispatchId}>
                  {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Send live test
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Live preview · {orgName}</CardTitle></CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden" style={{ maxHeight: 600, overflowY: "auto" }}>
                <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" /> Recent client notification attempts
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => refetch()}>Refresh</Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!logs || logs.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No notification attempts yet.</div>
            ) : (
              <div className="space-y-2">
                {logs.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 border rounded-md p-2 text-sm">
                    <Badge variant={l.success ? "default" : "destructive"}>{l.success ? "sent" : "failed"}</Badge>
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">{l.recipient_email || "-"} · {l.dispatch_status}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(l.created_at).toLocaleString()} · {l.attempts} attempt(s)
                        {l.error_message ? ` · ${l.error_message}` : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
