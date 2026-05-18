import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface ApprovalRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  approval_level: number;
  status: string;
  requested_by: string | null;
  approved_by: string | null;
  rejected_by: string | null;
  super_admin_override: boolean;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface EditRequest {
  id: string;
  entity_type: string;
  entity_id: string;
  original_data: Record<string, any>;
  modified_data: Record<string, any>;
  changed_fields: string[];
  requested_by: string | null;
  status: string;
  approved_by: string | null;
  reason: string | null;
  created_at: string;
}

export function useApprovalEngine() {
  const { user, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const submitForApproval = useCallback(
    async (entityType: string, entityId: string) => {
      if (!user) return;
      const { error } = await supabase.from("approvals").insert({
        entity_type: entityType,
        entity_id: entityId,
        status: "pending",
        requested_by: user.id,
      });
      if (error) throw error;
    },
    [user]
  );

  const bulkApprove = useCallback(
    async (entityType: string, entityIds: string[], action: "approve" | "reject", reason?: string) => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("bulk-approve", {
          body: { entity_type: entityType, entity_ids: entityIds, action, reason },
        });

        if (error) throw error;

        toast({
          title: action === "approve" ? "Bulk Approval Complete" : "Bulk Rejection Complete",
          description: `${data.approved || data.rejected || 0} of ${data.total} items processed. ${data.failed} failed.`,
        });

        return data;
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  const requestPostApprovalEdit = useCallback(
    async (
      entityType: string,
      entityId: string,
      originalData: Record<string, any>,
      modifiedData: Record<string, any>,
      reason: string
    ) => {
      if (!user) return;

      const changedFields = Object.keys(modifiedData).filter(
        (k) => JSON.stringify(originalData[k]) !== JSON.stringify(modifiedData[k])
      );

      const { error } = await supabase.from("edit_requests").insert({
        entity_type: entityType,
        entity_id: entityId,
        original_data: originalData,
        modified_data: modifiedData,
        changed_fields: changedFields,
        requested_by: user.id,
        reason,
      });

      if (error) throw error;

      toast({
        title: "Edit Request Submitted",
        description: "A Super Admin must approve this change before it takes effect.",
      });
    },
    [user, toast]
  );

  const approveEditRequest = useCallback(
    async (editRequestId: string) => {
      if (!isSuperAdmin) {
        toast({ title: "Access Denied", description: "Only Super Admin can approve edits", variant: "destructive" });
        return;
      }

      setLoading(true);
      try {
        const { data: editReq, error: fetchErr } = await supabase
          .from("edit_requests")
          .select("*")
          .eq("id", editRequestId)
          .single();

        if (fetchErr || !editReq) throw new Error("Edit request not found");

        // Apply the modified data to the entity
        const tableName = editReq.entity_type === "invoice" ? "invoices" : editReq.entity_type === "expense" ? "expenses" : editReq.entity_type;
        
        const modifiedData = typeof editReq.modified_data === 'string' 
          ? JSON.parse(editReq.modified_data) 
          : editReq.modified_data;

        const { error: updateErr } = await supabase
          .from(tableName as any)
          .update(modifiedData)
          .eq("id", editReq.entity_id);

        if (updateErr) throw updateErr;

        // Mark edit request as approved
        await supabase
          .from("edit_requests")
          .update({ status: "approved", approved_by: user?.id, updated_at: new Date().toISOString() })
          .eq("id", editRequestId);

        // Audit log
        await supabase.from("audit_logs").insert({
          table_name: editReq.entity_type,
          record_id: editReq.entity_id,
          action: "post_approval_edit_approved",
          old_data: editReq.original_data,
          new_data: editReq.modified_data,
          user_id: user?.id,
          user_email: user?.email,
        });

        toast({ title: "Edit Approved", description: "Changes have been applied successfully." });
      } catch (err: any) {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    },
    [isSuperAdmin, user, toast]
  );

  const rejectEditRequest = useCallback(
    async (editRequestId: string, reason: string) => {
      if (!isSuperAdmin) return;

      await supabase
        .from("edit_requests")
        .update({ status: "rejected", approved_by: user?.id, reason, updated_at: new Date().toISOString() })
        .eq("id", editRequestId);

      toast({ title: "Edit Rejected", description: "The edit request has been rejected." });
    },
    [isSuperAdmin, user, toast]
  );

  const fetchPendingApprovals = useCallback(async (entityType?: string) => {
    let query = supabase
      .from("approvals")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (entityType) query = query.eq("entity_type", entityType);

    const { data, error } = await query;
    if (error) throw error;
    return data as ApprovalRecord[];
  }, []);

  const fetchPendingEditRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("edit_requests")
      .select("*")
      .eq("status", "pending_super_admin")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as EditRequest[];
  }, []);

  return {
    loading,
    submitForApproval,
    bulkApprove,
    requestPostApprovalEdit,
    approveEditRequest,
    rejectEditRequest,
    fetchPendingApprovals,
    fetchPendingEditRequests,
  };
}

export default useApprovalEngine;
