import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle, XCircle, Clock, Search, RefreshCw, AlertTriangle,
  Shield, FileText, CreditCard, Package, Wallet, CheckCheck, Eye,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useApprovalEngine, type ApprovalRecord, type EditRequest } from "@/hooks/useApprovalEngine";
import { format } from "date-fns";
import { motion } from "framer-motion";

const entityTypeConfig: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  invoice: { label: "Invoice", icon: FileText, color: "text-blue-500" },
  expense: { label: "Expense", icon: CreditCard, color: "text-green-500" },
  payment: { label: "Payment", icon: Wallet, color: "text-purple-500" },
  dispatch: { label: "Dispatch", icon: Package, color: "text-orange-500" },
  journal_entry: { label: "Journal Entry", icon: FileText, color: "text-cyan-500" },
  wallet_transfer: { label: "Wallet Transfer", icon: Wallet, color: "text-red-500" },
  vendor_onboarding: { label: "Vendor", icon: Package, color: "text-amber-500" },
  credit_note: { label: "Credit Note", icon: FileText, color: "text-pink-500" },
  rate_approval: { label: "Rate", icon: CreditCard, color: "text-indigo-500" },
  tax_filing: { label: "Tax Filing", icon: Shield, color: "text-teal-500" },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const ApprovalCenter = () => {
  const { toast } = useToast();
  const { isSuperAdmin } = useAuth();
  const {
    loading, bulkApprove, approveEditRequest, rejectEditRequest,
    fetchPendingApprovals, fetchPendingEditRequests,
  } = useApprovalEngine();

  const [activeTab, setActiveTab] = useState("pending");
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([]);
  const [allApprovals, setAllApprovals] = useState<ApprovalRecord[]>([]);
  const [editRequests, setEditRequests] = useState<EditRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [editDetailDialog, setEditDetailDialog] = useState<EditRequest | null>(null);
  const [editRejectReason, setEditRejectReason] = useState("");
  const [fetchLoading, setFetchLoading] = useState(true);

  const loadData = useCallback(async () => {
    setFetchLoading(true);
    try {
      const [pending, edits, all] = await Promise.all([
        fetchPendingApprovals(),
        fetchPendingEditRequests(),
        supabase
          .from("approvals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200)
          .then(r => r.data || []),
      ]);
      setApprovals(pending);
      setEditRequests(edits);
      setAllApprovals(all as ApprovalRecord[]);
    } catch {
      toast({ title: "Error", description: "Failed to load approvals", variant: "destructive" });
    } finally {
      setFetchLoading(false);
    }
  }, [fetchPendingApprovals, fetchPendingEditRequests, toast]);

  useEffect(() => {
    loadData();

    // Realtime subscription
    const channel = supabase
      .channel("approval-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "approvals" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "edit_requests" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const filteredApprovals = approvals.filter((a) => {
    if (entityFilter !== "all" && a.entity_type !== entityFilter) return false;
    if (searchQuery && !a.entity_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApprovals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApprovals.map((a) => a.entity_id)));
    }
  };

  const selectedEntityType = (): string | null => {
    const types = new Set(
      filteredApprovals.filter((a) => selectedIds.has(a.entity_id)).map((a) => a.entity_type)
    );
    return types.size === 1 ? [...types][0] : null;
  };

  const handleBulkApprove = async () => {
    const type = selectedEntityType();
    if (!type) {
      toast({ title: "Error", description: "Cannot bulk approve mixed entity types", variant: "destructive" });
      return;
    }
    await bulkApprove(type, [...selectedIds], "approve");
    setSelectedIds(new Set());
    loadData();
  };

  const handleBulkReject = async () => {
    const type = selectedEntityType();
    if (!type) {
      toast({ title: "Error", description: "Cannot bulk reject mixed entity types", variant: "destructive" });
      return;
    }
    await bulkApprove(type, [...selectedIds], "reject", rejectReason);
    setSelectedIds(new Set());
    setRejectDialogOpen(false);
    setRejectReason("");
    loadData();
  };

  const handleApproveEdit = async (editReq: EditRequest) => {
    await approveEditRequest(editReq.id);
    setEditDetailDialog(null);
    loadData();
  };

  const handleRejectEdit = async (editReq: EditRequest) => {
    await rejectEditRequest(editReq.id, editRejectReason);
    setEditDetailDialog(null);
    setEditRejectReason("");
    loadData();
  };

  const selectedTotal = filteredApprovals
    .filter((a) => selectedIds.has(a.entity_id))
    .length;

  const pendingCount = approvals.length;
  const editCount = editRequests.length;
  const approvedToday = allApprovals.filter(
    (a) => a.status === "approved" && new Date(a.updated_at).toDateString() === new Date().toDateString()
  ).length;
  const rejectedToday = allApprovals.filter(
    (a) => a.status === "rejected" && new Date(a.updated_at).toDateString() === new Date().toDateString()
  ).length;

  return (
    <DashboardLayout title="Approval Center" subtitle="Centralized approval engine for all enterprise workflows">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Pending Approvals", value: pendingCount, icon: Clock, color: "bg-warning/10 text-warning" },
          { label: "Edit Requests", value: editCount, icon: AlertTriangle, color: "bg-orange-500/10 text-orange-500" },
          { label: "Approved Today", value: approvedToday, icon: CheckCircle, color: "bg-success/10 text-success" },
          { label: "Rejected Today", value: rejectedToday, icon: XCircle, color: "bg-destructive/10 text-destructive" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="edit_requests">
            Edit Requests ({editCount})
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* PENDING APPROVALS TAB */}
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Pending Approvals</CardTitle>
                  <CardDescription>Select items to approve or reject in bulk</CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-48"
                    />
                  </div>
                  <Select value={entityFilter} onValueChange={setEntityFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(entityTypeConfig).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={loadData}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Bulk action bar */}
              {selectedIds.size > 0 && (
                <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-5 h-5 text-primary" />
                    <span className="font-medium">{selectedTotal} items selected</span>
                    {selectedEntityType() && (
                      <Badge variant="outline">{entityTypeConfig[selectedEntityType()!]?.label}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleBulkApprove} disabled={loading || !selectedEntityType()}>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve All
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialogOpen(true)}
                      disabled={loading || !selectedEntityType()}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject All
                    </Button>
                  </div>
                </div>
              )}

              {!selectedEntityType() && selectedIds.size > 0 && (
                <div className="mt-2 p-2 rounded bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Cannot bulk approve mixed entity types. Filter by type first.
                </div>
              )}
            </CardHeader>
            <CardContent>
              {fetchLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filteredApprovals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No pending approvals</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedIds.size === filteredApprovals.length && filteredApprovals.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApprovals.map((approval) => {
                      const cfg = entityTypeConfig[approval.entity_type] || { label: approval.entity_type, icon: FileText, color: "text-muted-foreground" };
                      const Icon = cfg.icon;
                      return (
                        <TableRow key={approval.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(approval.entity_id)}
                              onCheckedChange={() => toggleSelect(approval.entity_id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${cfg.color}`} />
                              <span>{cfg.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{approval.entity_id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <Badge variant="outline">Level {approval.approval_level}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {format(new Date(approval.created_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await bulkApprove(approval.entity_type, [approval.entity_id], "approve");
                                  loadData();
                                }}
                                disabled={loading}
                              >
                                <CheckCircle className="w-4 h-4 text-success" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await bulkApprove(approval.entity_type, [approval.entity_id], "reject", "Rejected individually");
                                  loadData();
                                }}
                                disabled={loading}
                              >
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* EDIT REQUESTS TAB */}
        <TabsContent value="edit_requests">
          <Card>
            <CardHeader>
              <CardTitle>Post-Approval Edit Requests</CardTitle>
              <CardDescription>
                {isSuperAdmin
                  ? "Review and approve post-approval modifications"
                  : "Only Super Admin can approve post-approval edits"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {editRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No pending edit requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Entity ID</TableHead>
                      <TableHead>Changed Fields</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {editRequests.map((er) => {
                      const cfg = entityTypeConfig[er.entity_type] || { label: er.entity_type, icon: FileText, color: "text-muted-foreground" };
                      return (
                        <TableRow key={er.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                              {cfg.label}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{er.entity_id.slice(0, 8)}...</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(er.changed_fields || []).map((f) => (
                                <Badge key={f} variant="secondary" className="text-xs">{f}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{er.reason}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(er.created_at), "dd MMM HH:mm")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditDetailDialog(er)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
              <CardDescription>Complete audit trail of all approval actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Override</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allApprovals.map((a) => {
                    const cfg = entityTypeConfig[a.entity_type] || { label: a.entity_type, icon: FileText, color: "text-muted-foreground" };
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <cfg.icon className={`w-4 h-4 ${cfg.color}`} />
                            {cfg.label}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{a.entity_id.slice(0, 8)}...</TableCell>
                        <TableCell>
                          <Badge
                            variant={a.status === "approved" ? "default" : a.status === "rejected" ? "destructive" : "secondary"}
                          >
                            {a.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {a.super_admin_override && (
                            <Badge variant="outline" className="text-xs">
                              <Shield className="w-3 h-3 mr-1" />
                              Override
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(a.created_at), "dd MMM yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {allApprovals.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No approval history yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bulk Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject</DialogTitle>
            <DialogDescription>Provide a reason for rejecting {selectedIds.size} items</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkReject} disabled={loading || !rejectReason.trim()}>
              Reject {selectedIds.size} Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Request Detail Dialog */}
      <Dialog open={!!editDetailDialog} onOpenChange={() => setEditDetailDialog(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Request Review</DialogTitle>
            <DialogDescription>
              Compare original vs modified data. Only Super Admin can approve.
            </DialogDescription>
          </DialogHeader>
          {editDetailDialog && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="font-medium text-sm">Post-Approval Edit - Requires Super Admin</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Approving will reverse original journal entries and repost corrected entries.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Original Data</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(editDetailDialog.original_data, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Modified Data</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(editDetailDialog.modified_data, null, 2)}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">Changed Fields</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {(editDetailDialog.changed_fields || []).map((f) => (
                    <Badge key={f} variant="secondary">{f}</Badge>
                  ))}
                </div>
              </div>

              {editDetailDialog.reason && (
                <div>
                  <p className="text-xs text-muted-foreground">Reason</p>
                  <p className="text-sm mt-1">{editDetailDialog.reason}</p>
                </div>
              )}

              {isSuperAdmin && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Rejection reason (required to reject)..."
                    value={editRejectReason}
                    onChange={(e) => setEditRejectReason(e.target.value)}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailDialog(null)}>Close</Button>
            {isSuperAdmin && editDetailDialog && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleRejectEdit(editDetailDialog)}
                  disabled={loading || !editRejectReason.trim()}
                >
                  Reject Edit
                </Button>
                <Button onClick={() => handleApproveEdit(editDetailDialog)} disabled={loading}>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve & Apply
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ApprovalCenter;
