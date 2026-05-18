/**
 * DeptTransporterManager.tsx
 *
 * 3PL transporter roster management with invite link generation and billing summary.
 * - role="manager"  → Logistics Manager (add manually, generate invite link, view all)
 * - role="approver" → Head of Logistics (approve / reject pending registrations)
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Truck, CheckCircle, Clock, XCircle, Plus, Link2, Copy, DollarSign, RefreshCw, FileText, Eye, Handshake } from "lucide-react";

const DOC_BUCKET = "transporter-onboarding-docs";

/** Extract storage path from a public/signed Supabase URL or return the value as-is if it already looks like a path. */
function extractStoragePath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  const marker = `/${DOC_BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx >= 0) return urlOrPath.substring(idx + marker.length).split("?")[0];
  return urlOrPath;
}

async function openSignedDoc(urlOrPath: string, label: string) {
  try {
    const path = extractStoragePath(urlOrPath);
    const { data, error } = await supabase.storage.from(DOC_BUCKET).createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error(`Could not open ${label}: ${error?.message ?? "no URL"}`);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    toast.error(`Could not open ${label}: ${e?.message ?? "unknown error"}`);
  }
}

function DocLink({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  return (
    <button
      type="button"
      onClick={() => openSignedDoc(url, label)}
      className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 hover:bg-green-500/30 inline-flex items-center gap-1"
      title={`View ${label}`}
    >
      <Eye className="w-2.5 h-2.5" /> {label}
    </button>
  );
}

const VEHICLE_TYPES = [
  "Bike / Motorcycle", "Van / Small Truck (<3T)", "5-Tonne Truck",
  "10-Tonne Truck", "15-Tonne Truck", "20-Tonne Articulated",
  "30-Tonne Articulated", "Refrigerated Truck", "Flatbed",
];

const STATUS_STYLE: Record<string, string> = {
  pending_approval: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  approved:         "bg-green-500/20 text-green-700 border-green-500/30",
  rejected:         "bg-red-500/20 text-red-700 border-red-500/30",
  suspended:        "bg-gray-500/20 text-gray-600",
};

const VEHICLE_COST_PER_MONTH = 2000;
const PUBLIC_ROUTEACE_ORIGIN = "https://routeaceglyde.app";
const TRANSPORTER_LINK_LABELS: Record<"new" | "access" | "vendor", string> = {
  new: "New Transporter Onboarding",
  access: "Existing Transporter Portal Access",
  vendor: "Vendors & Partners (New & Existing)",
};

const buildTransporterJoinLink = (token: string, linkType: "new" | "access" | "vendor" = "access") => {
  const typeParam = `?type=${linkType}`;
  return `${PUBLIC_ROUTEACE_ORIGIN}/transporter/join/${encodeURIComponent(token)}${typeParam}`;
};

const getTransporterLinkLabel = (linkType: "new" | "access" | "vendor") => TRANSPORTER_LINK_LABELS[linkType];

interface Props {
  orgId: string;
  role: "manager" | "approver";
}

export default function DeptTransporterManager({ orgId, role }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [selectedTransporter, setSelectedTransporter] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approvingAll, setApprovingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [inviteLink, setInviteLink] = useState("");
  const [generatedLinkType, setGeneratedLinkType] = useState<"new" | "access" | "vendor">("access");
  const [linkTypeToGenerate, setLinkTypeToGenerate] = useState<"new" | "access" | "vendor">("access");
  const [form, setForm] = useState({
    company_name: "", contact_name: "", phone: "", email: "",
    cac_number: "", coverage_areas: "", notes: "",
    vehicle_types: [] as string[], vehicle_count: "1",
  });

  const { data: transporters = [] } = useQuery({
    queryKey: ["ld-transporters", orgId],
    enabled: !!orgId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await (supabase.from("ld_transporters" as any) as any)
        .select("id, company_name, contact_name, phone, email, cac_number, vehicle_types, vehicle_count, coverage_areas, onboarding_status, notes, created_at, approved_at, rejection_reason, self_registered, cac_document_url, insurance_document_url, mou_document_url, letter_of_intent_url, rates_proposal_url, truck_photos_urls")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: inviteTokens = [] } = useQuery({
    queryKey: ["transporter-invite-tokens", orgId],
    enabled: !!orgId && (role === "manager" || role === "approver"),
    queryFn: async () => {
      const { data } = await (supabase.from("transporter_invite_tokens" as any) as any)
        .select("id, token, link_type, is_active, uses_count, max_uses, expires_at, created_at")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const pending = transporters.filter((t: any) => t.onboarding_status === "pending_approval");
  const approved = transporters.filter((t: any) => t.onboarding_status === "approved");
  const rejected = transporters.filter((t: any) => ["rejected", "suspended"].includes(t.onboarding_status));
  const totalVehicles = approved.reduce((s: number, t: any) => s + (t.vehicle_count ?? 1), 0);
  const monthlyVehicleCharge = totalVehicles * VEHICLE_COST_PER_MONTH;
  const NGN = (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

  const generateInviteLink = useMutation({
    mutationFn: async (requestedLinkType: "new" | "access" | "vendor") => {
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase.from("transporter_invite_tokens" as any) as any)
        .insert({
          organization_id: orgId,
          created_by: user?.id,
          expires_at: expiresAt,
          link_type: requestedLinkType,
        })
        .select("token")
        .single();
      if (error) throw error;
      return { token: data.token as string, linkType: requestedLinkType };
    },
    onSuccess: ({ token, linkType }: { token: string; linkType: "new" | "access" | "vendor" }) => {
      const link = buildTransporterJoinLink(token, linkType);
      console.log("[DeptTransporterManager] invite link generated", {
        currentHost: window.location.hostname,
        currentOrigin: window.location.origin,
        linkOrigin: PUBLIC_ROUTEACE_ORIGIN,
        invitePath: `/transporter/join/${token}`,
        linkType,
      });
      setGeneratedLinkType(linkType);
      setInviteLink(link);
      toast.success(`${getTransporterLinkLabel(linkType)} link generated (valid for 72 hours)`);
      qc.invalidateQueries({ queryKey: ["transporter-invite-tokens", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const regenerateInviteLink = useMutation({
    mutationFn: async ({ oldTokenId, linkType }: { oldTokenId: string; linkType: "new" | "access" | "vendor" }) => {
      // Deactivate old token, then issue a new one (auto-syncs with current tenant_mode)
      const { error: deactErr } = await (supabase.from("transporter_invite_tokens" as any) as any)
        .update({ is_active: false })
        .eq("id", oldTokenId)
        .eq("organization_id", orgId);
      if (deactErr) throw deactErr;
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase.from("transporter_invite_tokens" as any) as any)
        .insert({ organization_id: orgId, created_by: user?.id, expires_at: expiresAt, link_type: linkType })
        .select("token")
        .single();
      if (error) throw error;
      return { token: data.token as string, linkType };
    },
    onSuccess: ({ token, linkType }: { token: string; linkType: "new" | "access" | "vendor" }) => {
      const link = buildTransporterJoinLink(token, linkType);
      console.log("[DeptTransporterManager] LD invite link regenerated", {
        currentHost: window.location.hostname,
        currentOrigin: window.location.origin,
        linkOrigin: PUBLIC_ROUTEACE_ORIGIN,
        invitePath: `/transporter/join/${token}`,
        linkType,
      });
      setGeneratedLinkType(linkType);
      setInviteLink(link);
      toast.success("Fresh invite link generated. Old link deactivated.");
      qc.invalidateQueries({ queryKey: ["transporter-invite-tokens", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const copyLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => toast.success("Link copied to clipboard"));
  };

  const addTransporter = useMutation({
    mutationFn: async () => {
      if (!form.company_name || !form.contact_name || !form.phone)
        throw new Error("Company name, contact name, and phone are required");
      const { error } = await (supabase.from("ld_transporters" as any) as any).insert({
        organization_id: orgId,
        company_name: form.company_name,
        contact_name: form.contact_name,
        phone: form.phone,
        email: form.email || null,
        cac_number: form.cac_number || null,
        vehicle_types: form.vehicle_types,
        vehicle_count: parseInt(form.vehicle_count) || 1,
        coverage_areas: form.coverage_areas || null,
        notes: form.notes || null,
        onboarding_status: "pending_approval",
        self_registered: false,
        added_by: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transporter added - awaiting Head of Logistics approval");
      setAddOpen(false);
      setForm({ company_name: "", contact_name: "", phone: "", email: "", cac_number: "", coverage_areas: "", notes: "", vehicle_types: [], vehicle_count: "1" });
      qc.invalidateQueries({ queryKey: ["ld-transporters", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveSingle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("ld_transporters" as any) as any)
        .update({ onboarding_status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transporter approved ✓");
      qc.invalidateQueries({ queryKey: ["ld-transporters", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectTransporter = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await (supabase.from("ld_transporters" as any) as any)
        .update({ onboarding_status: "rejected", rejection_reason: reason })
        .eq("id", id).eq("organization_id", orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transporter rejected");
      setRejectOpen(false); setRejectionReason(""); setSelectedTransporter(null);
      qc.invalidateQueries({ queryKey: ["ld-transporters", orgId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const approveSelected = async () => {
    if (selectedIds.size === 0) return;
    setApprovingAll(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await (supabase.from("ld_transporters" as any) as any)
        .update({ onboarding_status: "approved", approved_by: user?.id, approved_at: new Date().toISOString() })
        .in("id", ids).eq("organization_id", orgId);
      if (error) throw error;
      toast.success(`${ids.length} transporter${ids.length > 1 ? "s" : ""} approved ✓`);
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["ld-transporters", orgId] });
    } catch (e: any) { toast.error(e.message); }
    finally { setApprovingAll(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            3PL Transporter Roster
            {pending.length > 0 && role === "approver" && (
              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30 text-[10px]" variant="outline">
                {pending.length} awaiting approval
              </Badge>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {role === "approver"
              ? "Approve or reject carriers added by the Logistics Manager"
              : "Add carriers manually or share the invite link for self-registration"}
          </p>
        </div>
        {(role === "manager" || role === "approver") && (
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <Button size="sm" variant="outline"
              onClick={() => { setLinkTypeToGenerate("vendor"); generateInviteLink.mutate("vendor"); }}
              disabled={generateInviteLink.isPending}>
              <Handshake className="w-4 h-4 mr-1" />
              {generateInviteLink.isPending && linkTypeToGenerate === "vendor" ? "Generating…" : "Vendors & Partners Link"}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => { setLinkTypeToGenerate("new"); generateInviteLink.mutate("new"); }}
              disabled={generateInviteLink.isPending}>
              <FileText className="w-4 h-4 mr-1" />
              {generateInviteLink.isPending && linkTypeToGenerate === "new" ? "Generating…" : "New Transporter Link"}
            </Button>
            <Button size="sm" variant="outline"
              onClick={() => { setLinkTypeToGenerate("access"); generateInviteLink.mutate("access"); }}
              disabled={generateInviteLink.isPending}>
              <Link2 className="w-4 h-4 mr-1" />
              {generateInviteLink.isPending && linkTypeToGenerate === "access" ? "Generating…" : "Existing Transporter Link"}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />Add Manually
            </Button>
          </div>
        )}
      </div>

      {inviteLink && (role === "manager" || role === "approver") && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
              <Link2 className="w-3.5 h-3.5" />Share this {getTransporterLinkLabel(generatedLinkType)} link with your 3PL carriers:
            </p>
            <div className="rounded-md border bg-background/70 p-2 text-[11px] space-y-0.5 mb-2">
              <div><span className="text-muted-foreground">Generated from:</span> <span className="font-mono">{typeof window !== "undefined" ? window.location.hostname : ""}</span></div>
              <div><span className="text-muted-foreground">Invite link domain:</span> <span className="font-mono">{PUBLIC_ROUTEACE_ORIGIN}</span></div>
              <div><span className="text-muted-foreground">Link purpose:</span> <span className="font-mono">{getTransporterLinkLabel(generatedLinkType)}</span></div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border rounded px-3 py-2 break-all">
                {inviteLink}
              </code>
              <Button size="sm" variant="outline" onClick={() => copyLink(inviteLink)}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {generatedLinkType === "new"
                ? "Full onboarding link for NEW transporters - carrier fills company info and uploads CAC, insurance, MOU, letter of intent, truck photos and rates. Credentials sent to their email."
                : generatedLinkType === "vendor"
                ? "Vendors & Partners link (new + existing) - share with non-fleet vendors and strategic partners to register and access the portal."
                : "Existing transporter portal access link - carrier fills basic details only. Credentials sent to their email."}
              {" "}Expires in 72 hours. All registrations require approval before going live.
            </p>
          </CardContent>
        </Card>
      )}

      {(role === "manager" || role === "approver") && inviteTokens.length > 0 && !inviteLink && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Invite Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inviteTokens.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-2 rounded border">
                  <div className="min-w-0 flex-1">
                    <Badge variant="outline" className="mb-1 text-[10px]">
                      {getTransporterLinkLabel((t.link_type as "new" | "access" | "vendor") || "access")}
                    </Badge>
                    <code className="text-xs text-muted-foreground break-all">
                      {buildTransporterJoinLink(t.token, (t.link_type as "new" | "access" | "vendor") || "access")}
                    </code>
                    <p className="text-xs text-muted-foreground">
                      {t.uses_count} registration{t.uses_count !== 1 ? "s" : ""} via this link · expires {format(new Date(t.expires_at), "dd MMM HH:mm")}
                    </p>
                  </div>
                  <Button size="sm" variant="outline"
                    onClick={() => copyLink(buildTransporterJoinLink(t.token, (t.link_type as "new" | "access" | "vendor") || "access"))}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" variant="outline"
                    title="Deactivate this link and generate a fresh one"
                    disabled={regenerateInviteLink.isPending}
                    onClick={() => regenerateInviteLink.mutate({
                      oldTokenId: t.id,
                      linkType: (t.link_type as "new" | "access" | "vendor") || "access",
                    })}>
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {approved.length > 0 && (
        <Card className="border-teal-500/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-teal-600" />
              <p className="text-sm font-semibold">Transporter Portal Costs (this month)</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-black text-teal-600">{totalVehicles}</p>
                <p className="text-xs text-muted-foreground">Active vehicles</p>
              </div>
              <div>
                <p className="text-2xl font-black text-orange-500">{NGN(monthlyVehicleCharge)}</p>
                <p className="text-xs text-muted-foreground">Vehicle charges (₦2K/truck)</p>
              </div>
              <div>
                <p className="text-2xl font-black text-muted-foreground">+ ₦50/drop</p>
                <p className="text-xs text-muted-foreground">Per completed delivery</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {role === "approver" && pending.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
              <span className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Awaiting Your Approval ({pending.length})
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-7 text-xs"
                  onClick={() => setSelectedIds(new Set(pending.map((t: any) => t.id)))}>
                  Select All
                </Button>
                {selectedIds.size > 0 && (
                  <Button size="sm" className="h-7 text-xs" onClick={approveSelected} disabled={approvingAll}>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    {approvingAll ? "Approving…" : `Approve Selected (${selectedIds.size})`}
                  </Button>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map((t: any) => (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <input type="checkbox" className="mt-1 h-4 w-4 cursor-pointer"
                  checked={selectedIds.has(t.id)}
                  onChange={(e) => setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(t.id); else next.delete(t.id);
                    return next;
                  })} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{t.company_name}</p>
                    {t.self_registered && (
                      <Badge className="text-[9px] bg-blue-500/20 text-blue-700" variant="outline">
                        Self-registered
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t.contact_name} · {t.phone}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.vehicle_count ?? 1} vehicle{(t.vehicle_count ?? 1) !== 1 ? "s" : ""}
                    {(t.vehicle_types as string[] ?? []).length > 0 ? ` · ${(t.vehicle_types as string[]).join(", ")}` : ""}
                  </p>
                  {t.coverage_areas && <p className="text-xs text-muted-foreground">Coverage: {t.coverage_areas}</p>}
                  {t.cac_number && <p className="text-xs text-muted-foreground">CAC: {t.cac_number}</p>}
                  {/* Document checklist */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <DocLink url={(t as any).cac_document_url} label="CAC" />
                    <DocLink url={(t as any).insurance_document_url} label="Insurance" />
                    <DocLink url={(t as any).mou_document_url} label="MOU" />
                    <DocLink url={(t as any).letter_of_intent_url} label="Letter of Intent" />
                    <DocLink url={(t as any).rates_proposal_url} label="Rates Proposal" />
                    {((t as any).truck_photos_urls ?? []).map((u: string, i: number) => (
                      <DocLink key={i} url={u} label={`Truck ${i + 1}`} />
                    ))}
                    {!(t as any).cac_document_url && !(t as any).insurance_document_url && ((t as any).truck_photos_urls?.length ?? 0) === 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700">No docs uploaded (access link)</span>
                    )}
                  </div>
                  <p className="text-xs text-teal-600 font-medium mt-0.5">
                    Cost if approved: {NGN((t.vehicle_count ?? 1) * VEHICLE_COST_PER_MONTH)}/month + ₦50/drop
                  </p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" className="h-7 text-xs"
                    onClick={() => approveSingle.mutate(t.id)} disabled={approveSingle.isPending}>
                    <CheckCircle className="w-3 h-3 mr-1" />Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-red-400 text-red-600"
                    onClick={() => { setSelectedTransporter(t); setRejectOpen(true); }}>
                    <XCircle className="w-3 h-3 mr-1" />Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Approved Transporters ({approved.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {approved.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No approved transporters yet.
              {role === "manager" ? " Add one above or share the invite link." : " Approve pending transporters above."}
            </p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Vehicles</TableHead>
                <TableHead>Monthly Cost</TableHead>
                <TableHead>Approved</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {approved.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{t.company_name}</p>
                        {t.self_registered && (
                          <Badge className="text-[9px] bg-blue-500/20 text-blue-700" variant="outline">
                            Self-registered
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{t.contact_name}</p>
                      <p className="text-xs text-muted-foreground">{t.phone}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.vehicle_count ?? 1} vehicle{(t.vehicle_count ?? 1) !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-sm text-teal-600 font-semibold">
                      {NGN((t.vehicle_count ?? 1) * VEHICLE_COST_PER_MONTH)}/mo
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {t.approved_at ? format(new Date(t.approved_at), "MMM d, yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {rejected.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />Rejected / Suspended ({rejected.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Company</TableHead><TableHead>Status</TableHead><TableHead>Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rejected.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.company_name}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_STYLE[t.onboarding_status]} text-[10px]`} variant="outline">
                        {t.onboarding_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.rejection_reason || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add 3PL Transporter Manually</DialogTitle>
            <DialogDescription>
              Add a carrier directly. They'll need approval before receiving jobs.
              Alternatively, share the invite link so transporters self-register.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Company Name *</Label>
                <Input placeholder="e.g. ABC Logistics Ltd" value={form.company_name}
                  onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Person *</Label>
                <Input placeholder="Full name" value={form.contact_name}
                  onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input placeholder="08012345678" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Number of Vehicles</Label>
                <Input type="number" min="1" value={form.vehicle_count}
                  onChange={(e) => setForm((f) => ({ ...f, vehicle_count: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="Optional" value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>CAC Number</Label>
                <Input placeholder="Business reg" value={form.cac_number}
                  onChange={(e) => setForm((f) => ({ ...f, cac_number: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Coverage Areas</Label>
              <Input placeholder="e.g. Lagos, Ibadan, Kano" value={form.coverage_areas}
                onChange={(e) => setForm((f) => ({ ...f, coverage_areas: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Vehicle Types</Label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map((vt) => (
                  <button key={vt} type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      vehicle_types: f.vehicle_types.includes(vt)
                        ? f.vehicle_types.filter((x) => x !== vt)
                        : [...f.vehicle_types, vt],
                    }))}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      form.vehicle_types.includes(vt)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:bg-muted/60"
                    }`}>
                    {vt}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea placeholder="Additional notes…" value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
            {parseInt(form.vehicle_count) > 0 && (
              <div className="p-2 rounded bg-teal-500/10 border border-teal-500/20">
                <p className="text-xs text-teal-700">
                  Monthly cost if approved:{" "}
                  <strong>{NGN(parseInt(form.vehicle_count) * VEHICLE_COST_PER_MONTH)}</strong>/month + ₦50 per completed drop
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => addTransporter.mutate()}
              disabled={addTransporter.isPending || !form.company_name || !form.contact_name || !form.phone}>
              {addTransporter.isPending ? "Adding…" : "Add - Send for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transporter</DialogTitle>
            <DialogDescription>
              Reject {selectedTransporter?.company_name}. A reason is required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection reason *</Label>
            <Textarea placeholder="Why is this transporter being rejected?"
              value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectOpen(false); setRejectionReason(""); }}>
              Cancel
            </Button>
            <Button variant="destructive"
              disabled={!rejectionReason.trim() || rejectTransporter.isPending}
              onClick={() => selectedTransporter &&
                rejectTransporter.mutate({ id: selectedTransporter.id, reason: rejectionReason })}>
              {rejectTransporter.isPending ? "Rejecting…" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
