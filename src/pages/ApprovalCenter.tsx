import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  MapPin, Truck, Package, Eye, CheckCheck,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";
import { motion } from "framer-motion";

interface DispatchApproval {
  id: string;
  dispatch_number: string;
  pickup_address: string;
  delivery_address: string;
  status: string;
  priority: string;
  approval_status: string | null;
  cargo_description: string | null;
  cargo_weight_kg: number | null;
  distance_km: number | null;
  scheduled_pickup: string | null;
  submitted_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  cost: number | null;
  drivers?: { full_name: string } | null;
  vehicles?: { registration_number: string; vehicle_type: string } | null;
  customers?: { company_name: string } | null;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-destructive/15 text-destructive" },
  high:   { label: "High",   className: "bg-warning/15 text-warning" },
  normal: { label: "Normal", className: "bg-info/15 text-info" },
  low:    { label: "Low",    className: "bg-muted text-muted-foreground" },
};

const ApprovalCenter = () => {
  const { toast } = useToast();
  const { user, hasAnyRole } = useAuth();
  const { logChange } = useAuditLog();

  const canApprove = hasAnyRole(["super_admin", "org_admin", "admin", "ops_manager"]);

  const [dispatches, setDispatches] = useState<DispatchApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [selectedDispatch, setSelectedDispatch] = useState<DispatchApproval | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const fetchDispatches = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("dispatches")
        .select(`
          id, dispatch_number, pickup_address, delivery_address,
          status, priority, approval_status, cargo_description,
          cargo_weight_kg, distance_km, scheduled_pickup, created_at,
          submitted_by, approved_by, approved_at, rejection_reason, cost,
          drivers(full_name),
          vehicles(registration_number, vehicle_type),
          customers(company_name)
        `)
        .not("approval_status", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDispatches(data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load dispatches", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDispatches();

    const channel = supabase
      .channel("dispatch-approval-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatches" }, fetchDispatches)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchDispatches]);

  const pending  = dispatches.filter(d => d.approval_status === "pending");
  const approved = dispatches.filter(d => d.approval_status === "approved");
  const rejected = dispatches.filter(d => d.approval_status === "rejected");

  const filteredDispatches = dispatches.filter((d) => {
    const matchesSearch =
      d.dispatch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.pickup_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.delivery_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.customers?.company_name ?? "").toLowerCase().includes(searchQuery.toLowerCase());

    switch (statusFilter) {
      case "pending":  return matchesSearch && d.approval_status === "pending";
      case "approved": return matchesSearch && d.approval_status === "approved";
      case "rejected": return matchesSearch && d.approval_status === "rejected";
      default:         return matchesSearch;
    }
  });

  const handleApprove = async (dispatch: DispatchApproval) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("dispatches")
        .update({
          approval_status: "approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", dispatch.id);
      if (error) throw error;

      await logChange({
        table_name: "dispatches",
        record_id: dispatch.id,
        action: "update",
        old_data: { approval_status: "pending" },
        new_data: { approval_status: "approved", approved_by: user?.id },
      });

      toast({ title: "Dispatch Approved", description: `${dispatch.dispatch_number} has been approved.` });
      setIsDetailOpen(false);
      fetchDispatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to approve", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDispatch || !rejectionReason.trim()) {
      toast({ title: "Validation Error", description: "Please provide a rejection reason", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("dispatches")
        .update({ approval_status: "rejected", rejection_reason: rejectionReason })
        .eq("id", selectedDispatch.id);
      if (error) throw error;

      await logChange({
        table_name: "dispatches",
        record_id: selectedDispatch.id,
        action: "update",
        old_data: { approval_status: "pending" },
        new_data: { approval_status: "rejected", rejection_reason: rejectionReason },
      });

      toast({ title: "Dispatch Rejected", description: `${selectedDispatch.dispatch_number} has been rejected.` });
      setIsRejectOpen(false);
      setIsDetailOpen(false);
      setRejectionReason("");
      fetchDispatches();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reject", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <DashboardLayout
      title="Dispatch Approval Center"
      subtitle="Review and approve dispatches submitted by operations team"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Pending Approval", value: pending.length, icon: Clock, color: "bg-warning/10 text-warning" },
          { label: "Approved", value: approved.length, icon: CheckCircle, color: "bg-success/10 text-success" },
          { label: "Rejected", value: rejected.length, icon: XCircle, color: "bg-destructive/10 text-destructive" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex items-center gap-4"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-heading font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by dispatch number, route, or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-secondary/50 border-border/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44 bg-secondary/50 border-border/50">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending Approval</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={fetchDispatches}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredDispatches.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No dispatches to review</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Dispatches appear here after being submitted for approval from the Dispatch page
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dispatch #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Vehicle / Driver</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDispatches.map((dispatch) => {
                const priority = priorityConfig[dispatch.priority] || priorityConfig.normal;
                const isApproved = dispatch.approval_status === "approved";
                const isRejected = dispatch.approval_status === "rejected";

                return (
                  <TableRow key={dispatch.id}>
                    <TableCell className="font-medium">{dispatch.dispatch_number}</TableCell>
                    <TableCell>{dispatch.customers?.company_name || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground max-w-[200px]">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="truncate">
                          {dispatch.pickup_address.split(",")[0]} → {dispatch.delivery_address.split(",")[0]}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={priority.className}>{priority.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {dispatch.vehicles?.registration_number && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Truck className="w-3 h-3" />
                            {dispatch.vehicles.registration_number}
                          </div>
                        )}
                        {dispatch.drivers?.full_name && (
                          <div className="text-xs text-muted-foreground/70">{dispatch.drivers.full_name}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(dispatch.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>
                      {isApproved && (
                        <Badge className="bg-success/15 text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />Approved
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge className="bg-destructive/15 text-destructive">
                          <XCircle className="w-3 h-3 mr-1" />Rejected
                        </Badge>
                      )}
                      {!isApproved && !isRejected && (
                        <Badge className="bg-warning/15 text-warning">
                          <Clock className="w-3 h-3 mr-1" />Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedDispatch(dispatch); setIsDetailOpen(true); }}
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
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[580px]">
          <DialogHeader>
            <DialogTitle className="font-heading">
              Dispatch Review — {selectedDispatch?.dispatch_number}
            </DialogTitle>
            <DialogDescription>
              Review dispatch details before approving or rejecting
            </DialogDescription>
          </DialogHeader>

          {selectedDispatch && (
            <div className="space-y-5 py-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedDispatch.customers?.company_name || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <Badge className={priorityConfig[selectedDispatch.priority]?.className}>
                    {priorityConfig[selectedDispatch.priority]?.label || selectedDispatch.priority}
                  </Badge>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-xs text-muted-foreground">Route</p>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{selectedDispatch.pickup_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{selectedDispatch.delivery_address}</span>
                  </div>
                </div>
                {selectedDispatch.cargo_description && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Cargo</p>
                    <p className="text-sm">{selectedDispatch.cargo_description}</p>
                  </div>
                )}
                {selectedDispatch.cargo_weight_kg && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Weight</p>
                    <p className="text-sm">{selectedDispatch.cargo_weight_kg.toLocaleString()} kg</p>
                  </div>
                )}
                {selectedDispatch.distance_km && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Distance</p>
                    <p className="text-sm">{selectedDispatch.distance_km} km</p>
                  </div>
                )}
                {selectedDispatch.scheduled_pickup && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Scheduled Pickup</p>
                    <p className="text-sm">{format(new Date(selectedDispatch.scheduled_pickup), "dd MMM yyyy HH:mm")}</p>
                  </div>
                )}
                {selectedDispatch.vehicles && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm">{selectedDispatch.vehicles.registration_number} · {selectedDispatch.vehicles.vehicle_type}</p>
                  </div>
                )}
                {selectedDispatch.drivers && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Driver</p>
                    <p className="text-sm">{selectedDispatch.drivers.full_name}</p>
                  </div>
                )}
              </div>

              {selectedDispatch.approval_status === "rejected" && selectedDispatch.rejection_reason && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-xs text-destructive mb-1">Rejection Reason</p>
                  <p className="text-sm">{selectedDispatch.rejection_reason}</p>
                </div>
              )}

              {selectedDispatch.approved_at && (
                <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                  <p className="text-xs text-success mb-1">Approved</p>
                  <p className="text-sm">{format(new Date(selectedDispatch.approved_at), "dd MMM yyyy HH:mm")}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedDispatch?.approval_status === "pending" && canApprove && (
              <>
                <Button variant="destructive" onClick={() => setIsRejectOpen(true)} disabled={processing}>
                  <XCircle className="w-4 h-4 mr-2" />Reject
                </Button>
                <Button
                  className="bg-success hover:bg-success/90"
                  onClick={() => handleApprove(selectedDispatch!)}
                  disabled={processing}
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  {processing ? "Processing..." : "Approve Dispatch"}
                </Button>
              </>
            )}
            {(selectedDispatch?.approval_status === "approved" || selectedDispatch?.approval_status === "rejected") && (
              <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
            )}
            {selectedDispatch?.approval_status === "pending" && !canApprove && (
              <>
                <p className="text-sm text-muted-foreground self-center flex-1">You don't have permission to approve dispatches</p>
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>Close</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Dispatch</DialogTitle>
            <DialogDescription>Provide a reason for rejecting this dispatch</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Enter rejection reason..."
            rows={4}
            className="bg-secondary/50"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={processing || !rejectionReason.trim()}>
              {processing ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ApprovalCenter;
