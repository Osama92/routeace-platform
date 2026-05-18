import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Download, Paperclip, FileText, Upload, Activity } from "lucide-react";

// ---------- SLA Breach Panel ----------
export function SLABreachPanel({ orgId }: { orgId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["sla_breaches", orgId],
    enabled: !!orgId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("support_breached_tickets", { p_org_id: orgId });
      if (error) throw error;
      return data as Array<{ id: string; ref: string; subject: string; status: string; sla_deadline: string; minutes_overdue: number }>;
    },
  });
  if (data.length === 0) return null;
  return (
    <Card className="border-destructive/40 bg-destructive/5 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-4 h-4" /> {data.length} ticket{data.length>1?"s":""} breached SLA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {data.slice(0, 5).map(t => (
          <div key={t.id} className="flex items-center gap-3 text-xs">
            <span className="font-mono">{t.ref}</span>
            <span className="flex-1 truncate">{t.subject}</span>
            <Badge variant="destructive" className="text-[10px]">{t.minutes_overdue}m overdue</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---------- Audit Timeline (per ticket) ----------
export function TicketAuditTimeline({ ticketId }: { ticketId: string }) {
  const { data = [] } = useQuery({
    queryKey: ["ticket_audit", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("support_ticket_audit_list", { p_ticket_id: ticketId });
      if (error) throw error;
      return data as Array<{ event_type: string; actor_label: string | null; from_value: string | null; to_value: string | null; meta: any; created_at: string }>;
    },
  });
  return (
    <ScrollArea className="h-64 border rounded p-3">
      {data.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No timeline events yet</p>
      ) : (
        <ul className="space-y-3">
          {data.map((e, i) => (
            <li key={i} className="flex gap-3 text-xs">
              <Activity className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium capitalize">{e.event_type.replace("_"," ")}
                  {e.from_value && e.to_value && <span className="text-muted-foreground"> · {e.from_value} → {e.to_value}</span>}
                  {!e.from_value && e.to_value && <span className="text-muted-foreground"> · {e.to_value}</span>}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  {e.actor_label || "system"} · {format(new Date(e.created_at), "dd MMM HH:mm:ss")} ({formatDistanceToNow(new Date(e.created_at), { addSuffix: true })})
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ScrollArea>
  );
}

// ---------- Attachment uploader (agent-side) ----------
export function TicketAttachments({ ticketId, orgId }: { ticketId: string; orgId: string }) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const { data = [], refetch } = useQuery({
    queryKey: ["ticket_attachments", ticketId],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_attachments")
        .select("*").eq("ticket_id", ticketId).order("created_at", { ascending: false });
      return data || [];
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast({ title: "Max 20MB", variant: "destructive" }); return; }
    setUploading(true);
    const path = `${orgId}/${ticketId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
    const { error: upErr } = await supabase.storage.from("support-attachments").upload(path, file);
    if (upErr) { setUploading(false); toast({ title: "Upload failed", description: upErr.message, variant: "destructive" }); return; }
    const { error } = await supabase.from("support_ticket_attachments").insert({
      ticket_id: ticketId, organization_id: orgId, storage_path: path,
      file_name: file.name, mime_type: file.type, size_bytes: file.size, uploaded_via: "agent",
    });
    setUploading(false);
    if (error) { toast({ title: "Save failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Attached" }); refetch(); e.target.value = "";
  }

  async function download(path: string, name: string) {
    const { data, error } = await supabase.storage.from("support-attachments").createSignedUrl(path, 60);
    if (error || !data) { toast({ title: "Download failed", variant: "destructive" }); return; }
    const a = document.createElement("a"); a.href = data.signedUrl; a.download = name; a.click();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs flex-1 flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachments ({data.length})</Label>
        <Button size="sm" variant="outline" disabled={uploading} asChild>
          <label className="cursor-pointer text-xs">
            <Upload className="w-3 h-3 mr-1" /> {uploading ? "Uploading…" : "Add file"}
            <input type="file" hidden onChange={handleUpload} accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.csv" />
          </label>
        </Button>
      </div>
      {data.length > 0 && (
        <div className="space-y-1">
          {data.map((a: any) => (
            <button key={a.id} onClick={() => download(a.storage_path, a.file_name)}
              className="flex w-full items-center gap-2 text-xs px-2 py-1.5 border rounded hover:bg-muted text-left">
              <FileText className="w-3 h-3 text-muted-foreground" />
              <span className="flex-1 truncate">{a.file_name}</span>
              <span className="text-muted-foreground">{a.size_bytes ? `${Math.round(a.size_bytes/1024)}KB` : ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Export filters & CSV ----------
export function ExportToolbar({ tickets }: { tickets: any[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  function exportCsv() {
    const rows = tickets.filter(t => {
      if (from && new Date(t.created_at) < new Date(from)) return false;
      if (to && new Date(t.created_at) > new Date(to + "T23:59:59")) return false;
      return true;
    });
    const headers = ["ref","created_at","resolved_at","status","priority","channel","tag","customer_name","complainant_email","order_id","sla_deadline","csat","submitted_via"];
    const csv = [headers.join(",")].concat(
      rows.map(r => headers.map(h => {
        const v = (r as any)[h] ?? "";
        const s = String(v).replace(/"/g,'""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      }).join(","))
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `support-tickets-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-2 items-end">
      <div className="space-y-1">
        <Label className="text-[10px]">From</Label>
        <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-8 text-xs w-36" />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px]">To</Label>
        <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-8 text-xs w-36" />
      </div>
      <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1 h-8">
        <Download className="w-3 h-3" /> Export CSV
      </Button>
    </div>
  );
}
