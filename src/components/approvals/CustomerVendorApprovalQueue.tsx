import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Building2, Package, Clock, Download, AlertTriangle } from "lucide-react";

interface Props {
  level: "coo" | "sa";
  organizationId: string;
}

type TableName = "customers" | "partners";
type Action = "approve" | "reject";

interface Target {
  id: string;
  table: TableName;
  name: string;
  email?: string | null;
  contactName?: string | null;
}

export default function CustomerVendorApprovalQueue({ level, organizationId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const pendingStatus = level === "coo" ? "pending_coo" : "pending_sa";

  const [activeTab, setActiveTab] = useState<TableName>("customers");
  const [selected, setSelected] = useState<Record<TableName, Set<string>>>({
    customers: new Set(),
    partners: new Set(),
  });

  const [actionOpen, setActionOpen] = useState(false);
  const [action, setAction] = useState<Action>("approve");
  const [reason, setReason] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);

  // Failures from the most recent bulk run - used to render a CSV-export banner.
  interface FailureRow {
    table: TableName;
    name: string;
    contactName?: string | null;
    email?: string | null;
    action: Action;
    error: string;
    at: string; // ISO
  }
  const [lastFailures, setLastFailures] = useState<FailureRow[]>([]);

  const { data: orgName } = useQuery({
    queryKey: ["org-name", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .maybeSingle();
      return (data as any)?.name as string | undefined;
    },
  });

  const { data: pendingCustomers = [] } = useQuery({
    queryKey: ["approval-customers", organizationId, pendingStatus],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, company_name, contact_name, email, phone, city, state, created_at, approval_status")
        .eq("organization_id", organizationId)
        .eq("approval_status", pendingStatus)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const { data: pendingPartners = [] } = useQuery({
    queryKey: ["approval-partners", organizationId, pendingStatus],
    enabled: !!organizationId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, company_name, partner_type, contact_name, contact_email, contact_phone, city, created_at, approval_status")
        .eq("organization_id", organizationId)
        .eq("approval_status", pendingStatus)
        .order("created_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const totalPending = pendingCustomers.length + pendingPartners.length;

  const customerTargets = useMemo<Target[]>(
    () => pendingCustomers.map((c: any) => ({
      id: c.id, table: "customers", name: c.company_name,
      email: c.email, contactName: c.contact_name,
    })),
    [pendingCustomers],
  );
  const partnerTargets = useMemo<Target[]>(
    () => pendingPartners.map((p: any) => ({
      id: p.id, table: "partners", name: p.company_name,
      email: p.contact_email, contactName: p.contact_name,
    })),
    [pendingPartners],
  );

  const toggleSelect = (table: TableName, id: string) => {
    setSelected(prev => {
      const next = new Set(prev[table]);
      next.has(id) ? next.delete(id) : next.add(id);
      return { ...prev, [table]: next };
    });
  };
  const toggleSelectAll = (table: TableName, ids: string[]) => {
    setSelected(prev => {
      const all = ids.every(id => prev[table].has(id));
      return { ...prev, [table]: all ? new Set() : new Set(ids) };
    });
  };
  const clearSelection = () => setSelected({ customers: new Set(), partners: new Set() });

  const openAction = (a: Action, list: Target[]) => {
    if (list.length === 0) return;
    setAction(a);
    setTargets(list);
    setReason("");
    setActionOpen(true);
  };

  const sendDecisionEmail = async (
    t: Target,
    emailDecision: "approved" | "rejected" | "pending_final",
  ) => {
    if (!t.email) return;
    try {
      // Stable key: same logical decision => same key, retries are de-duplicated.
      const idempotencyKey = `approval-${emailDecision}-l${level === "coo" ? 1 : 2}-${t.table}-${t.id}`;
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "approval-decision",
          recipientEmail: t.email,
          idempotencyKey,
          templateData: {
            name: t.contactName || undefined,
            entityType: t.table === "customers" ? "Customer" : "Vendor",
            companyName: t.name,
            decision: emailDecision,
            reason: reason.trim(),
            organizationName: orgName,
          },
        },
      });
    } catch (err) {
      console.error("[approval-email]", err);
    }
  };

  const processMutation = useMutation({
    mutationFn: async () => {
      const trimmed = reason.trim();
      if (!trimmed) throw new Error("Please provide a reason.");

      const isFinalApproval = action === "approve" && level === "sa";
      const isCooForward = action === "approve" && level === "coo";
      const nextStatus =
        action === "reject"
          ? "rejected"
          : level === "coo"
            ? "pending_sa"
            : "active";

      const emailDecision: "approved" | "rejected" | "pending_final" =
        action === "reject"
          ? "rejected"
          : isCooForward
            ? "pending_final"
            : "approved";

      const results = await Promise.all(
        targets.map(async (t) => {
          const { error } = await supabase
            .from(t.table)
            .update({ approval_status: nextStatus })
            .eq("id", t.id)
            .eq("organization_id", organizationId);
          if (error) return { ok: false, t, error: error.message };

          const { error: logError } = await supabase.from("approvals").insert({
            entity_type: t.table,
            entity_id: t.id,
            approval_level: level === "coo" ? 1 : 2,
            status: action === "approve" ? "approved" : "rejected",
            approved_by: action === "approve" ? user!.id : null,
            rejected_by: action === "reject" ? user!.id : null,
            reason: trimmed,
            organization_id: organizationId,
          });
          if (logError) return { ok: false, t, error: logError.message };

          // Notify submitter on every status transition (rejection, COO forward, final approval).
          if (action === "reject" || isFinalApproval || isCooForward) {
            await sendDecisionEmail(t, emailDecision);
          }
          return { ok: true, t };
        }),
      );

      const failed = results.filter(r => !r.ok) as { ok: false; t: Target; error: string }[];
      return { total: targets.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      const verb = action === "approve" ? "approved" : "rejected";
      if (failed.length > 0) {
        const at = new Date().toISOString();
        setLastFailures(
          failed.map(f => ({
            table: f.t.table,
            name: f.t.name,
            contactName: f.t.contactName,
            email: f.t.email,
            action,
            error: f.error,
            at,
          })),
        );
        const detail = failed
          .slice(0, 3)
          .map(f => `${f.t.name}: ${f.error}`)
          .join("\n");
        const more = failed.length > 3 ? `\n…and ${failed.length - 3} more` : "";
        toast.warning(
          `${total - failed.length}/${total} ${verb}. ${failed.length} failed.`,
          { description: detail + more, duration: 10_000 },
        );
      } else {
        setLastFailures([]);
        toast.success(
          total === 1 ? `Record ${verb}.` : `${total} records ${verb}.`,
        );
      }
      setActionOpen(false);
      setReason("");
      setTargets([]);
      clearSelection();
      qc.invalidateQueries({ queryKey: ["approval-customers", organizationId] });
      qc.invalidateQueries({ queryKey: ["approval-partners", organizationId] });
      qc.invalidateQueries({ queryKey: ["approval-history", "customers", organizationId] });
      qc.invalidateQueries({ queryKey: ["approval-history", "partners", organizationId] });
      qc.invalidateQueries({ queryKey: ["customers", organizationId] });
      qc.invalidateQueries({ queryKey: ["partners", organizationId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const downloadFailuresCsv = () => {
    if (lastFailures.length === 0) return;
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      "timestamp", "action", "record_type", "company_name",
      "contact_name", "contact_email", "error_message",
    ];
    const rows = lastFailures.map(f => [
      f.at,
      f.action,
      f.table === "customers" ? "Customer" : "Vendor",
      f.name,
      f.contactName ?? "",
      f.email ?? "",
      f.error,
    ]);
    const csv = [headers, ...rows].map(r => r.map(escape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    a.href = url;
    a.download = `approval-failures-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const renderCard = (item: any, table: TableName) => {
    const isCustomer = table === "customers";
    const isSelected = selected[table].has(item.id);
    const target: Target = {
      id: item.id, table, name: item.company_name,
      email: isCustomer ? item.email : item.contact_email,
      contactName: item.contact_name,
    };
    return (
      <Card key={item.id} className="border border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelect(table, item.id)}
                className="mt-1"
              />
              <div className="p-2 rounded-lg bg-amber-500/10 shrink-0">
                {isCustomer
                  ? <Building2 className="w-4 h-4 text-amber-600" />
                  : <Package className="w-4 h-4 text-amber-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-semibold text-sm">{item.company_name}</p>
                  {!isCustomer && (
                    <Badge variant="outline" className="text-[9px] capitalize">
                      {item.partner_type}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {item.contact_name}
                  {(item.city || item.state) && ` · ${[item.city, item.state].filter(Boolean).join(", ")}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isCustomer ? item.email : item.contact_email}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    Submitted {new Date(item.created_at).toLocaleDateString("en-NG")}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <Button
                size="sm"
                className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                onClick={() => openAction("approve", [target])}
              >
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                {level === "coo" ? "Approve → SA" : "Final Approve"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-red-400/50 text-red-600 hover:bg-red-500/10"
                onClick={() => openAction("reject", [target])}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const currentList = activeTab === "customers" ? customerTargets : partnerTargets;
  const currentIds = currentList.map(t => t.id);
  const selectedInTab = currentList.filter(t => selected[activeTab].has(t.id));
  const selectedCount = selectedInTab.length;
  const allSelected = currentIds.length > 0 && currentIds.every(id => selected[activeTab].has(id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
            {level === "coo" ? "Level 1 - COO Review" : "Level 2 - Final Sign-off"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {level === "coo"
              ? "Review and approve before sending to Super Admin."
              : "Final approval. Approved records become immediately active."}
          </p>
        </div>
        {totalPending > 0 && (
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
            {totalPending} pending
          </Badge>
        )}
      </div>

      {lastFailures.length > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-md border border-red-500/30 bg-red-500/5">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700">
              {lastFailures.length} record{lastFailures.length === 1 ? "" : "s"} failed in the last bulk action
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Download a CSV with the affected names and the exact error returned for each, so you can retry or escalate.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={downloadFailuresCsv}>
              <Download className="w-3.5 h-3.5 mr-1" />
              Download CSV
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setLastFailures([])}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {totalPending === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-50" />
            <p className="font-medium text-sm">All clear</p>
            <p className="text-xs mt-1">No pending approvals at this level.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TableName)}>
          <TabsList>
            <TabsTrigger value="customers">
              Customers
              {pendingCustomers.length > 0 && (
                <Badge className="ml-1.5 bg-amber-500/20 text-amber-700 text-[9px]">
                  {pendingCustomers.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vendors">
              Vendors
              {pendingPartners.length > 0 && (
                <Badge className="ml-1.5 bg-amber-500/20 text-amber-700 text-[9px]">
                  {pendingPartners.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Bulk action bar */}
          {currentIds.length > 0 && (
            <div className="flex items-center justify-between gap-2 mt-3 px-2 py-2 rounded-md border bg-muted/30">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleSelectAll(activeTab, currentIds)}
                />
                <span className="text-xs text-muted-foreground">
                  {selectedCount > 0
                    ? `${selectedCount} selected`
                    : `Select all ${currentIds.length}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                  disabled={selectedCount === 0}
                  onClick={() => openAction("approve", selectedInTab)}
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-1" />
                  Bulk Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-400/50 text-red-600 hover:bg-red-500/10"
                  disabled={selectedCount === 0}
                  onClick={() => openAction("reject", selectedInTab)}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Bulk Reject
                </Button>
              </div>
            </div>
          )}

          <TabsContent value="customers" className="mt-3 space-y-3">
            {pendingCustomers.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-6">No pending customers.</p>
              : pendingCustomers.map(c => renderCard(c, "customers"))
            }
          </TabsContent>

          <TabsContent value="vendors" className="mt-3 space-y-3">
            {pendingPartners.length === 0
              ? <p className="text-sm text-muted-foreground text-center py-6">No pending vendors.</p>
              : pendingPartners.map(p => renderCard(p, "partners"))
            }
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "approve" ? "Approve" : "Reject"}{" "}
              {targets.length === 1 ? targets[0].name : `${targets.length} records`}
            </DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? (level === "coo"
                    ? "Record(s) will move to Super Admin for final sign-off."
                    : "Record(s) will become immediately active. Submitters will be notified by email.")
                : "Record(s) will be marked as rejected. Submitters will be notified by email with the reason below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {action === "approve" ? "Approval note *" : "Rejection reason *"}
            </p>
            <Textarea
              placeholder={action === "approve"
                ? "e.g. Documents verified, credit check passed..."
                : "e.g. Duplicate record, incomplete details, not approved by management..."}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            {targets.length > 1 && (
              <p className="text-[11px] text-muted-foreground">
                The same reason will be applied to all {targets.length} selected records.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>Cancel</Button>
            <Button
              variant={action === "reject" ? "destructive" : "default"}
              className={action === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : undefined}
              disabled={!reason.trim() || processMutation.isPending}
              onClick={() => processMutation.mutate()}
            >
              {processMutation.isPending
                ? "Processing…"
                : action === "approve"
                  ? `Confirm Approval${targets.length > 1 ? ` (${targets.length})` : ""}`
                  : `Confirm Rejection${targets.length > 1 ? ` (${targets.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
