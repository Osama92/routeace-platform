import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone, MessageSquare, Instagram, Mail, Headphones, Tag, Clock, CheckCircle,
  AlertTriangle, TrendingUp, Users, Star, Plus, Search, Bot, FileText,
  Shield, Zap, BarChart3, ChevronUp, ChevronDown, Circle, Send, RefreshCw,
  Link2, Copy, Truck, MapPin,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useTenantMode } from "@/hooks/useTenantMode";
import { SLABreachPanel, TicketAuditTimeline, TicketAttachments, ExportToolbar } from "@/components/support/SupportExtras";

type TicketChannel = "phone" | "whatsapp" | "email" | "instagram" | "live_chat";
type TicketStatus = "open" | "in_progress" | "escalated" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";

interface Ticket {
  id: string;
  ref: string;
  channel: TicketChannel;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  tag: string;
  customer_name: string;
  order_id?: string | null;
  assignee?: string | null;
  sla_deadline: string;
  csat?: number | null;
  created_at: string;
  updated_at: string;
  organization_id: string;
  submitted_via: string;
  complainant_email?: string | null;
  complainant_phone?: string | null;
  public_token: string;
  resolved_at?: string | null;
  first_response_at?: string | null;
}

interface TicketMessage {
  id: string;
  ticket_id: string;
  sender: "customer" | "agent" | "bot";
  message: string;
  is_internal: boolean;
  created_at: string;
}

interface SupportKpis {
  csat_pct: number | null;
  csat_count: number | null;
  csat_response_rate_pct: number | null;
  nps_score: number | null;
  fcr_pct: number | null;
  avg_handle_seconds: number | null;
  sla_compliance_pct: number | null;
  agents_online: number | null;
  escalation_rate_pct: number | null;
  open_count: number | null;
  escalated_count: number | null;
  resolved_today: number | null;
  volume_by_channel: Record<string, number> | null;
  csat_segments: { promoters: number; passives: number; detractors: number } | null;
  weekly_trends: Array<{ week: string; resolved: number; escalated: number }> | null;
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-4 h-4 text-green-500" />,
  phone: <Phone className="w-4 h-4 text-blue-500" />,
  email: <Mail className="w-4 h-4 text-yellow-500" />,
  instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  live_chat: <Headphones className="w-4 h-4 text-purple-500" />,
};
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: "bg-green-500",
  email: "bg-yellow-500",
  phone: "bg-blue-500",
  instagram: "bg-pink-500",
  live_chat: "bg-purple-500",
};
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  critical: "bg-destructive/20 text-destructive",
};
const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  in_progress: "bg-primary/20 text-primary",
  escalated: "bg-destructive/20 text-destructive",
  resolved: "bg-green-500/20 text-green-700 dark:text-green-400",
  closed: "bg-muted text-muted-foreground",
};
const PUBLIC_ROUTEACE_ORIGIN = "https://routeaceglyde.app";
const SUPPORT_LINK_PURPOSE = "Support intake only - receipts, complaints, enquiries";

const buildPublicSupportSubmitUrl = (slug: string) => `${PUBLIC_ROUTEACE_ORIGIN}/support/submit/${slug}`;
const buildPublicSupportTrackUrl = (token: string) => `${PUBLIC_ROUTEACE_ORIGIN}/support/track/${token}`;
const TAG_LABELS: Record<string, string> = {
  delay: "Delay", payment_issue: "Payment Issue", complaint: "Complaint",
  fraud_alert: "Fraud Alert", dispute: "Dispute", technical: "Technical", general: "General",
};

function formatSeconds(s: number | null | undefined): string {
  if (!s || s <= 0) return "-";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m ${sec}s`;
}

export default function SupportCenter() {
  const { user, organizationId } = useAuth();
  const { toast } = useToast();
  const { isDepartment } = useTenantMode();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState("tickets");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [ticketOpen, setTicketOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [filterDriver, setFilterDriver] = useState("all");
  const [filterTransporter, setFilterTransporter] = useState("all");
  const [filterRoute, setFilterRoute] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [newTicket, setNewTicket] = useState({
    channel: "email" as TicketChannel, subject: "", customer_name: "",
    tag: "general", priority: "medium" as TicketPriority, message: "",
    order_id: "", complainant_email: "", complainant_phone: "",
  });

  // Update Status dialog state (Dispatches tab)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: "", location: "", notes: "" });
  const [sendingStatus, setSendingStatus] = useState(false);

  const handleStatusUpdate = async () => {
    if (!selectedDispatch || !statusUpdate.status) return;
    setSendingStatus(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-delivery-status", {
        body: {
          dispatch_id: selectedDispatch.id,
          status: statusUpdate.status,
          location: statusUpdate.location || null,
          notes: statusUpdate.notes || null,
        },
      });
      if (error) throw error;
      toast({
        title: "Status updated",
        description: data?.email_sent
          ? "Client notified by email."
          : "Status updated successfully.",
      });
      setStatusDialogOpen(false);
      setSelectedDispatch(null);
      setStatusUpdate({ status: "", location: "", notes: "" });
      refetchDispatches();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    } finally {
      setSendingStatus(false);
    }
  };

  // Org slug for public form
  const { data: org } = useQuery({
    queryKey: ["org_slug", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase.from("organizations")
        .select("id,name,slug").eq("id", organizationId!).maybeSingle();
      return data;
    },
  });

  // Tickets - already RLS-scoped by organization
  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ["support_tickets", organizationId],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Ticket[];
    },
  });

  // Active dispatches for support visibility (org-scoped)
  const { data: activeDispatches = [], refetch: refetchDispatches } = useQuery({
    queryKey: ["support_dispatches", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, status, priority,
          pickup_address, delivery_address,
          approval_status, created_at,
          customers ( id, company_name, contact_name, email ),
          vehicles ( registration_number ),
          drivers ( full_name )
        `)
        .eq("organization_id", organizationId!)
        .eq("approval_status", "approved")
        .not("status", "in", '("delivered","cancelled","closed")')
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Live KPIs from DB (with date range)
  const { data: kpis } = useQuery({
    queryKey: ["support_kpis", organizationId, dateFrom, dateTo],
    enabled: !!organizationId,
    refetchInterval: 60_000,
    queryFn: async (): Promise<SupportKpis> => {
      const { data, error } = await supabase.rpc("support_center_kpis", {
        p_org_id: organizationId!,
        p_from: new Date(dateFrom + "T00:00:00").toISOString(),
        p_to: new Date(dateTo + "T23:59:59").toISOString(),
      });
      if (error) throw error;
      return (data || {}) as unknown as SupportKpis;
    },
  });

  // Live agents
  const { data: agents = [] } = useQuery({
    queryKey: ["support_agents", organizationId],
    enabled: !!organizationId && activeTab === "live",
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("support_center_agents", { p_org_id: organizationId! });
      if (error) throw error;
      return (data || []) as Array<{
        user_id: string; full_name: string; role: string;
        tickets_today: number; avg_handle_seconds: number | null; csat_avg: number | null;
      }>;
    },
  });

  // Messages for selected ticket
  const { data: messages = [] } = useQuery({
    queryKey: ["ticket_messages", selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket) return [] as TicketMessage[];
      const { data, error } = await supabase.from("support_ticket_messages")
        .select("*").eq("ticket_id", selectedTicket.id).order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as TicketMessage[];
    },
    enabled: !!selectedTicket,
    refetchInterval: 10_000,
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("No organization");
      const { data: ticket, error } = await supabase
        .from("support_tickets")
        .insert({
          organization_id: organizationId,
          channel: newTicket.channel,
          subject: newTicket.subject,
          customer_name: newTicket.customer_name,
          complainant_email: newTicket.complainant_email || null,
          complainant_phone: newTicket.complainant_phone || null,
          tag: newTicket.tag,
          priority: newTicket.priority,
          order_id: newTicket.order_id || null,
          created_by: user?.id,
          submitted_via: "agent",
          status: "open",
          sla_deadline: new Date(Date.now() + 4 * 3_600_000).toISOString(),
        })
        .select().single();
      if (error) throw error;
      if (newTicket.message && ticket) {
        await supabase.from("support_ticket_messages").insert({
          ticket_id: ticket.id, sender: "agent", message: newTicket.message, sent_by: user?.id,
        });
      }
      return ticket;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_tickets", organizationId] });
      setCreateOpen(false);
      setNewTicket({ channel: "email", subject: "", customer_name: "", tag: "general", priority: "medium", message: "", order_id: "", complainant_email: "", complainant_phone: "" });
      toast({ title: "Ticket created" });
    },
    onError: (e: any) => toast({ title: "Failed to create ticket", description: e.message, variant: "destructive" }),
  });

  const sendReply = useMutation({
    mutationFn: async () => {
      if (!selectedTicket || !replyText.trim()) return;
      await supabase.from("support_ticket_messages").insert({
        ticket_id: selectedTicket.id, sender: "agent", message: replyText, is_internal: isInternal, sent_by: user?.id,
      });
      if (!isInternal) {
        await supabase.from("support_tickets").update({ status: "in_progress" }).eq("id", selectedTicket.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ticket_messages", selectedTicket?.id] });
      qc.invalidateQueries({ queryKey: ["support_tickets", organizationId] });
      setReplyText("");
    },
    onError: () => toast({ title: "Failed to send reply", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TicketStatus }) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
      if (error) throw error;
      return status;
    },
    onSuccess: (status) => {
      qc.invalidateQueries({ queryKey: ["support_tickets", organizationId] });
      qc.invalidateQueries({ queryKey: ["support_kpis", organizationId] });
      setSelectedTicket(t => t ? { ...t, status } : t);
      toast({ title: "Status updated" });
    },
  });

  const filtered = useMemo(() => tickets.filter(t => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterChannel !== "all" && t.channel !== filterChannel) return false;
    if (searchTerm && !t.subject.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !t.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (dateFrom && new Date(t.created_at) < new Date(dateFrom + "T00:00:00")) return false;
    if (dateTo && new Date(t.created_at) > new Date(dateTo + "T23:59:59")) return false;
    return true;
  }), [tickets, filterStatus, filterChannel, searchTerm, dateFrom, dateTo]);

  const isBreached = (t: Ticket) => !t.resolved_at && new Date(t.sla_deadline) < new Date();

  const publicFormUrl = org?.slug ? buildPublicSupportSubmitUrl(org.slug) : "";

  const KPI_STATS = [
    { label: "CSAT %", value: kpis?.csat_pct != null ? `${kpis.csat_pct}%` : "-", icon: Star, sub: kpis?.csat_count ? `${kpis.csat_count} ratings · ${kpis?.csat_response_rate_pct ?? 0}% resp.` : "no ratings yet" },
    { label: "NPS Score", value: kpis?.nps_score != null ? `${kpis.nps_score}` : "-", icon: TrendingUp, sub: kpis?.csat_segments ? `+${kpis.csat_segments.promoters} / -${kpis.csat_segments.detractors}` : "promoters − detractors" },
    { label: "First Contact Res.", value: kpis?.fcr_pct != null ? `${kpis.fcr_pct}%` : "-", icon: Zap, sub: "in range" },
    { label: "Avg Handle Time", value: formatSeconds(kpis?.avg_handle_seconds), icon: Clock, sub: "open → resolved" },
    { label: "SLA Compliance", value: kpis?.sla_compliance_pct != null ? `${kpis.sla_compliance_pct}%` : "-", icon: Shield, sub: "vs deadline" },
    { label: "Escalation Rate", value: kpis?.escalation_rate_pct != null ? `${kpis.escalation_rate_pct}%` : "-", icon: AlertTriangle, sub: "in range" },
  ];

  // Driver / transporter / route facets from current ticket set (joined via export RPC for accuracy in export)
  const channelEntries = Object.entries(kpis?.volume_by_channel || {}).sort((a, b) => b[1] - a[1]);
  const channelMax = Math.max(1, ...channelEntries.map(([, v]) => v));
  const trends = kpis?.weekly_trends || [];
  const trendMax = Math.max(1, ...trends.map(t => Math.max(t.resolved, t.escalated)));

  // Per-tenant export (CSAT / SLA / NPS) for selected date range
  async function runExport(format: "csv" | "pdf") {
    if (!organizationId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.rpc("support_export_data", {
        p_org_id: organizationId,
        p_from: new Date(dateFrom + "T00:00:00").toISOString(),
        p_to: new Date(dateTo + "T23:59:59").toISOString(),
      });
      if (error) throw error;
      const rows = (data || []) as any[];
      // Apply UI segment filters
      const filteredRows = rows.filter(r =>
        (filterDriver === "all" || (r.driver_name || "-") === filterDriver) &&
        (filterTransporter === "all" || (r.transporter_name || "-") === filterTransporter) &&
        (filterRoute === "all" || (r.route_id || "-") === filterRoute)
      );
      if (filteredRows.length === 0) {
        toast({ title: "No data in range", variant: "destructive" });
        return;
      }
      if (format === "csv") {
        const headers = Object.keys(filteredRows[0]);
        const csv = [headers.join(",")].concat(
          filteredRows.map(r => headers.map(h => {
            const v = r[h] ?? "";
            const s = String(v).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          }).join(","))
        ).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `support-csat-sla-nps-${dateFrom}_to_${dateTo}.csv`;
        a.click();
      } else {
        const { default: jsPDF } = await import("jspdf");
        const { default: autoTable } = await import("jspdf-autotable");
        const doc = new jsPDF({ orientation: "landscape" });
        doc.setFontSize(14);
        doc.text(`Support CSAT / SLA / NPS - ${org?.name ?? ""}`, 14, 14);
        doc.setFontSize(9);
        doc.text(`Period: ${dateFrom} → ${dateTo}  ·  Tickets: ${filteredRows.length}  ·  CSAT avg: ${kpis?.csat_pct ?? "-"}%  ·  NPS: ${kpis?.nps_score ?? "-"}  ·  SLA: ${kpis?.sla_compliance_pct ?? "-"}%`, 14, 20);
        autoTable(doc, {
          startY: 26,
          head: [["Ref","Created","Resolved","Status","Priority","Channel","SLA met","Mins","CSAT %","NPS","Driver","Transporter","Route"]],
          body: filteredRows.map(r => [
            r.ref, (r.created_at ?? "").slice(0,16), (r.resolved_at ?? "").slice(0,16),
            r.status, r.priority, r.channel, r.sla_met ? "✓" : "✗",
            r.resolution_minutes ?? "-", r.csat_pct ?? "-", r.nps_band ?? "-",
            r.driver_name ?? "-", r.transporter_name ?? "-", r.route_id ?? "-",
          ]),
          styles: { fontSize: 7 },
          headStyles: { fillColor: [30, 41, 59] },
        });
        doc.save(`support-csat-sla-nps-${dateFrom}_to_${dateTo}.pdf`);
      }
      toast({ title: `Exported ${filteredRows.length} tickets` });
    } catch (e: any) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  }

  // CSAT audit (live, RLS-scoped)
  const { data: csatAudit = [] } = useQuery({
    queryKey: ["csat_audit", organizationId, dateFrom, dateTo],
    enabled: !!organizationId && activeTab === "audit",
    queryFn: async () => {
      const { data, error } = await supabase.from("support_csat_audit")
        .select("id, ticket_id, csat_rating, csat_pct, comment, submitter_ip, user_agent, submitted_at")
        .eq("organization_id", organizationId!)
        .gte("submitted_at", new Date(dateFrom + "T00:00:00").toISOString())
        .lte("submitted_at", new Date(dateTo + "T23:59:59").toISOString())
        .order("submitted_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data || [];
    },
  });

  const subtitle = isDepartment
    ? "Internal stakeholder support - strictly isolated to this department"
    : "Omnichannel customer support engine - strictly isolated to this organization";

  return (
    <DashboardLayout title="Support & Contact Center" subtitle={subtitle}>
      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {KPI_STATS.map(k => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-1">
                <k.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date range + Segmentation filters + Export */}
      <Card className="mb-4">
        <CardContent className="p-3 flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">From</Label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">To</Label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Driver</Label>
            <Input placeholder="all" value={filterDriver === "all" ? "" : filterDriver}
              onChange={e => setFilterDriver(e.target.value || "all")} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Transporter</Label>
            <Input placeholder="all" value={filterTransporter === "all" ? "" : filterTransporter}
              onChange={e => setFilterTransporter(e.target.value || "all")} className="h-8 text-xs w-36" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">Route ID</Label>
            <Input placeholder="all" value={filterRoute === "all" ? "" : filterRoute}
              onChange={e => setFilterRoute(e.target.value || "all")} className="h-8 text-xs w-40" />
          </div>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" disabled={exporting} onClick={() => runExport("csv")} className="h-8">
              CSAT/SLA/NPS · CSV
            </Button>
            <Button size="sm" variant="outline" disabled={exporting} onClick={() => runExport("pdf")} className="h-8">
              PDF Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Summary Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <Circle className="w-2 h-2 fill-blue-500 text-blue-500" /> {kpis?.open_count ?? 0} Open
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-destructive border-destructive/40">
          <AlertTriangle className="w-3 h-3" /> {kpis?.escalated_count ?? 0} Escalated
        </Badge>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-green-600 border-green-500/40">
          <CheckCircle className="w-3 h-3" /> {kpis?.resolved_today ?? 0} Resolved Today
        </Badge>
        <Button size="sm" variant="outline" onClick={() => setShareOpen(true)} className="ml-auto gap-1.5">
          <Link2 className="w-3 h-3" /> Public Intake Link
        </Button>
        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-3 h-3" /> Refresh
        </Button>
      </div>

      {organizationId && <SLABreachPanel orgId={organizationId} />}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1 mb-4">
          <TabsTrigger value="tickets">Ticket Queue</TabsTrigger>
          <TabsTrigger value="dispatches"><Truck className="w-4 h-4 mr-1.5" />Dispatches</TabsTrigger>
          <TabsTrigger value="live">Live Monitor</TabsTrigger>
          <TabsTrigger value="ai-bot">AI Bot</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        {/* TICKET QUEUE */}
        <TabsContent value="tickets">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div>
                  <CardTitle>Support Tickets</CardTitle>
                  <CardDescription>All channels unified · SLA-prioritised · Live database · Tenant-isolated</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <ExportToolbar tickets={filtered} />
                  <Button size="sm" onClick={() => setCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> New Ticket
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <div className="relative flex-1 min-w-40">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search tickets…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterChannel} onValueChange={setFilterChannel}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Channel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Channels</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="live_chat">Live Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-16 text-center text-muted-foreground">
                  <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin opacity-50" />
                  <p>Loading tickets…</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium">No tickets yet</p>
                  <p className="text-sm mt-1">Share your public intake link or create a ticket manually</p>
                  <div className="mt-4 flex gap-2 justify-center">
                    <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                      <Link2 className="w-4 h-4 mr-1" /> Get Intake Link
                    </Button>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-1" /> Create Ticket
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref</TableHead>
                      <TableHead>Channel</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Complainant</TableHead>
                      <TableHead>Tag</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>SLA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(t => (
                      <TableRow key={t.id} className="cursor-pointer hover:bg-muted/50"
                        onClick={() => { setSelectedTicket(t); setTicketOpen(true); }}>
                        <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                        <TableCell>{CHANNEL_ICONS[t.channel]}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{t.submitted_via}</Badge></TableCell>
                        <TableCell className="max-w-48 truncate text-sm">{t.subject}</TableCell>
                        <TableCell className="text-sm">{t.customer_name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs"><Tag className="w-3 h-3 mr-1" />{TAG_LABELS[t.tag] || t.tag}</Badge></TableCell>
                        <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></TableCell>
                        <TableCell><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{t.status.replace("_", " ")}</span></TableCell>
                        <TableCell>
                          <span className={`text-xs flex items-center gap-1 ${isBreached(t) ? "text-destructive" : "text-muted-foreground"}`}>
                            <Clock className="w-3 h-3" />
                            {t.resolved_at ? "✓" : isBreached(t) ? "BREACHED" : format(new Date(t.sla_deadline), "HH:mm")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DISPATCHES - active approved deliveries, org-scoped */}
        <TabsContent value="dispatches">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="w-5 h-5" /> Active Dispatches</CardTitle>
              <CardDescription>
                Approved deliveries in progress · Send live status updates to clients · Tenant-isolated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeDispatches.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Truck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No active dispatches.</p>
                  <p className="text-xs mt-1">Approved dispatches not yet delivered/cancelled will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeDispatches.map((d: any) => {
                    const canUpdate = d.status !== "delivered" && d.status !== "cancelled";
                    return (
                      <div
                        key={d.id}
                        className="border border-border rounded-lg p-4 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="font-bold text-foreground">{d.dispatch_number}</span>
                              <Badge className={STATUS_COLORS[d.status] || "bg-muted text-muted-foreground"}>
                                {d.status?.replace(/_/g, " ")}
                              </Badge>
                              {d.priority && (
                                <Badge className={PRIORITY_COLORS[d.priority] || "bg-muted text-muted-foreground"}>
                                  {d.priority}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-start gap-2 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                              <span className="truncate">
                                <span className="text-foreground">{d.pickup_address || "-"}</span>
                                {" → "}
                                <span className="text-foreground">{d.delivery_address || "-"}</span>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-muted-foreground">
                              <div>
                                <span>Customer: </span>
                                <span className="text-foreground">
                                  {d.customers?.company_name || d.customers?.contact_name || "-"}
                                </span>
                              </div>
                              <div>
                                <span>Vehicle: </span>
                                <span className="text-foreground">
                                  {d.vehicles?.registration_number || "-"}
                                </span>
                              </div>
                              <div>
                                <span>Driver: </span>
                                <span className="text-foreground">
                                  {d.drivers?.full_name || "-"}
                                </span>
                              </div>
                            </div>
                          </div>
                          {canUpdate && (
                            <Button
                              size="sm"
                              className="bg-teal-600 hover:bg-teal-700 text-white shrink-0"
                              onClick={() => {
                                setSelectedDispatch(d);
                                setStatusUpdate({ status: "", location: "", notes: "" });
                                setStatusDialogOpen(true);
                              }}
                            >
                              <RefreshCw className="w-4 h-4 mr-1.5" /> Update Status
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LIVE MONITOR - real agents from DB */}
        <TabsContent value="live">
          {agents.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-muted-foreground">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No support agents yet in this organization.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {agents.map(a => (
                <Card key={a.user_id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold">
                        {(a.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{a.full_name || "Unnamed"}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">{a.role}</div>
                      </div>
                      <Badge variant={a.tickets_today > 0 ? "default" : "outline"} className="text-xs">
                        {a.tickets_today > 0 ? "Active" : "Idle"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between"><span>Tickets today</span><span className="font-medium text-foreground">{a.tickets_today}</span></div>
                      <div className="flex justify-between"><span>AHT (30d)</span><span className="font-medium text-foreground">{formatSeconds(a.avg_handle_seconds)}</span></div>
                      <div className="flex justify-between"><span>CSAT</span><span className="font-medium text-foreground">{a.csat_avg != null ? `${Math.round((a.csat_avg/5)*100)}%` : "-"}</span></div>
                    </div>
                    <Progress value={Math.min(100, a.tickets_today * 10)} className="mt-3 h-1" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* AI BOT */}
        <TabsContent value="ai-bot">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Tier-1 AI Chatbot</CardTitle>
              <CardDescription>Handles routine queries automatically before escalating to a live agent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { q: "Where is my delivery?", ans: "Looks up dispatch by order ID → returns real-time GPS status & ETA", auto: true },
                { q: "I want to raise a complaint", ans: "Captures complaint details, tags ticket → auto-escalates to Tier 2 agent", auto: true },
                { q: "How do I get an invoice?", ans: "Sends invoice PDF link from portal & explains download steps", auto: true },
                { q: "Can I reschedule my delivery?", ans: "Checks if dispatch is still in draft → creates rescheduling ticket if allowed", auto: true },
                { q: "Dispute a charge", ans: "Captures dispute details → creates dispute ticket with finance tag", auto: false },
              ].map(item => (
                <div key={item.q} className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                  <Bot className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">"{item.q}"</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.ans}</p>
                  </div>
                  <Badge variant={item.auto ? "default" : "outline"} className="text-xs">{item.auto ? "Fully Auto" : "Escalates"}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANALYTICS - real data */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Ticket Volume by Channel (30d)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {channelEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No ticket data yet</p>
                ) : channelEntries.map(([ch, count]) => (
                  <div key={ch} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{ch.replace("_", " ")}</span><span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${CHANNEL_COLORS[ch] || "bg-primary"} rounded-full`} style={{ width: `${(count / channelMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Resolution Trends (last weeks)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {trends.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">No trend data yet</p>
                ) : trends.map(w => (
                  <div key={w.week} className="flex items-center gap-3 text-sm">
                    <span className="w-24 text-muted-foreground text-xs">{format(new Date(w.week), "dd MMM")}</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div className="h-2 bg-green-500/70 rounded" style={{ width: `${(w.resolved / trendMax) * 100}%` }} />
                      <span className="text-xs text-green-600">{w.resolved}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2 bg-destructive/60 rounded" style={{ width: `${Math.max(4, (w.escalated / trendMax) * 80)}px` }} />
                      <span className="text-xs text-destructive">{w.escalated}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AUDIT */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shield className="w-4 h-4" /> Immutable Audit Trail</CardTitle>
              <CardDescription>Every interaction logged · Linked to Order ID · Tenant-scoped</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Timestamp</TableHead><TableHead>Action</TableHead>
                  <TableHead>Ticket Ref</TableHead><TableHead>Order ID</TableHead><TableHead>Source</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {tickets.slice(0, 25).map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">{format(new Date(t.created_at), "dd MMM HH:mm")}</TableCell>
                      <TableCell className="text-xs">Ticket Created</TableCell>
                      <TableCell className="font-mono text-xs">{t.ref}</TableCell>
                      <TableCell className="text-xs">{t.order_id || "-"}</TableCell>
                      <TableCell className="text-xs">{t.submitted_via}</TableCell>
                    </TableRow>
                  ))}
                  {tickets.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No audit entries yet</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" /> CSAT Audit Records</CardTitle>
              <CardDescription>Every customer rating with IP, user agent, and timestamp · Tenant-scoped · Append-only</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Submitted</TableHead><TableHead>Rating</TableHead><TableHead>%</TableHead>
                  <TableHead>Ticket</TableHead><TableHead>Comment</TableHead>
                  <TableHead>IP</TableHead><TableHead>User Agent</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {csatAudit.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No CSAT submissions in this range</TableCell></TableRow>
                  ) : csatAudit.map((a: any) => {
                    const t = tickets.find(tk => tk.id === a.ticket_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground">{format(new Date(a.submitted_at), "dd MMM HH:mm:ss")}</TableCell>
                        <TableCell className="text-xs">{a.csat_rating}/5</TableCell>
                        <TableCell className="text-xs font-medium">{a.csat_pct}%</TableCell>
                        <TableCell className="text-xs font-mono">{t?.ref || a.ticket_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs max-w-48 truncate">{a.comment || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{a.submitter_ip || "-"}</TableCell>
                        <TableCell className="text-xs max-w-48 truncate text-muted-foreground">{a.user_agent || "-"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* TICKET DETAIL */}
      <Dialog open={ticketOpen} onOpenChange={setTicketOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTicket && CHANNEL_ICONS[selectedTicket.channel]}
              {selectedTicket?.ref} - {selectedTicket?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedTicket && (
            <div className="flex flex-col gap-4 overflow-hidden flex-1">
              <div className="flex flex-wrap gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[selectedTicket.status]}`}>{selectedTicket.status.replace("_", " ")}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[selectedTicket.priority]}`}>{selectedTicket.priority}</span>
                <Badge variant="outline" className="text-xs">{selectedTicket.customer_name}</Badge>
                {selectedTicket.complainant_email && <Badge variant="outline" className="text-xs">{selectedTicket.complainant_email}</Badge>}
                {selectedTicket.order_id && <Badge variant="outline" className="text-xs font-mono">{selectedTicket.order_id}</Badge>}
                <Badge variant="outline" className="text-xs">{selectedTicket.submitted_via}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                {(["open", "in_progress", "escalated", "resolved", "closed"] as TicketStatus[]).map(s => (
                  <Button key={s} size="sm" variant={selectedTicket.status === s ? "default" : "outline"}
                    onClick={() => updateStatus.mutate({ id: selectedTicket.id, status: s })}>
                    {s.replace("_", " ")}
                  </Button>
                ))}
              </div>

              <ScrollArea className="flex-1 border rounded-lg p-3 min-h-40 max-h-72">
                <div className="space-y-3">
                  {messages.length === 0 && <p className="text-center text-muted-foreground text-sm py-6">No messages yet.</p>}
                  {messages.map(m => (
                    <div key={m.id} className={`flex flex-col gap-1 ${m.sender === "agent" ? "items-end" : "items-start"}`}>
                      <div className={`max-w-sm px-3 py-2 rounded-lg text-sm ${m.sender === "agent" ? "bg-primary text-primary-foreground" : m.sender === "bot" ? "bg-muted border" : "bg-secondary"} ${m.is_internal ? "border-2 border-dashed border-yellow-500/50" : ""}`}>
                        {m.is_internal && <span className="text-xs text-yellow-500 block mb-0.5">🔒 Internal Note</span>}
                        {m.message}
                      </div>
                      <span className="text-xs text-muted-foreground">{m.sender} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="space-y-2">
                <Textarea placeholder="Type a reply…" value={replyText} onChange={e => setReplyText(e.target.value)} className="resize-none" rows={3} />
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} className="w-4 h-4" />
                    Internal note (not visible to complainant)
                  </label>
                  <Button size="sm" onClick={() => sendReply.mutate()} disabled={!replyText.trim() || sendReply.isPending}>
                    <Send className="w-3 h-3 mr-1" /> {sendReply.isPending ? "Sending…" : "Send"}
                  </Button>
                </div>
                {selectedTicket.public_token && (
                  <p className="text-[10px] text-muted-foreground">
                    Complainant tracking link:&nbsp;
                    <code className="text-[10px]">{buildPublicSupportTrackUrl(selectedTicket.public_token)}</code>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t">
                <div>
                  <Label className="text-xs mb-1.5 block">Timeline</Label>
                  <TicketAuditTimeline ticketId={selectedTicket.id} />
                </div>
                <div>
                  <TicketAttachments ticketId={selectedTicket.id} orgId={selectedTicket.organization_id} />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CREATE TICKET */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Support Ticket</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Complainant Name</Label>
                <Input value={newTicket.customer_name} onChange={e => setNewTicket(p => ({ ...p, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Order / Dispatch ID (optional)</Label>
                <Input value={newTicket.order_id} onChange={e => setNewTicket(p => ({ ...p, order_id: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={newTicket.complainant_email} onChange={e => setNewTicket(p => ({ ...p, complainant_email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={newTicket.complainant_phone} onChange={e => setNewTicket(p => ({ ...p, complainant_phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={newTicket.subject} onChange={e => setNewTicket(p => ({ ...p, subject: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={newTicket.channel} onValueChange={v => setNewTicket(p => ({ ...p, channel: v as TicketChannel }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem><SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="live_chat">Live Chat</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTicket.priority} onValueChange={v => setNewTicket(p => ({ ...p, priority: v as TicketPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tag</Label>
                <Select value={newTicket.tag} onValueChange={v => setNewTicket(p => ({ ...p, tag: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TAG_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Initial Message</Label>
              <Textarea rows={3} value={newTicket.message} onChange={e => setNewTicket(p => ({ ...p, message: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => createTicket.mutate()} disabled={!newTicket.subject || !newTicket.customer_name || createTicket.isPending}>
              {createTicket.isPending ? "Creating…" : "Create Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PUBLIC INTAKE LINK */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Public Support Intake Link</DialogTitle>
            <CardDescription>Share this only for receipts, complaints and enquiries. It is separate from 3PL onboarding and portal access links.</CardDescription>
          </DialogHeader>
          {publicFormUrl ? (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/30 p-2 text-[11px] space-y-0.5">
                <div><span className="text-muted-foreground">Generated from:</span> <span className="font-mono">{typeof window !== "undefined" ? window.location.hostname : ""}</span></div>
                <div><span className="text-muted-foreground">Public intake domain:</span> <span className="font-mono">{PUBLIC_ROUTEACE_ORIGIN}</span></div>
                <div><span className="text-muted-foreground">Link purpose:</span> <span className="font-mono">{SUPPORT_LINK_PURPOSE}</span></div>
                <div><span className="text-muted-foreground">Route:</span> <span className="font-mono">/support/submit/{org?.slug}</span></div>
              </div>
              <div className="flex gap-2">
                <Input readOnly value={publicFormUrl} />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicFormUrl); toast({ title: "Link copied" }); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Each submission lands here automatically and the complainant gets a private tracking link.</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Your organization needs a slug to enable public intake.</p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Update status for {selectedDispatch?.dispatch_number}. Customer will be notified via email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Dispatch Status</Label>
              <Select
                value={statusUpdate.status}
                onValueChange={(v) => setStatusUpdate((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned to Driver</SelectItem>
                  <SelectItem value="picked_up">Order Picked Up</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                Current Location
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Input
                value={statusUpdate.location}
                onChange={(e) => setStatusUpdate((p) => ({ ...p, location: e.target.value }))}
                placeholder="e.g., Lagos-Ibadan Expressway"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>
                Notes
                <span className="text-muted-foreground ml-1">(optional)</span>
              </Label>
              <Textarea
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Any additional notes..."
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={sendingStatus || !statusUpdate.status}>
              {sendingStatus ? "Updating..." : "Update Dispatch Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
