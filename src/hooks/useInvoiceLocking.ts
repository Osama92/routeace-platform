import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";

interface InvoiceLockResult {
  success: boolean;
  error?: string;
}

export const useInvoiceLocking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logChange } = useAuditLog();

  // Lock an invoice (prevents modification)
  const lockInvoice = useCallback(
    async (
      invoiceId: string,
      reason: string,
      lockType: "payment" | "sync" | "manual" = "manual"
    ): Promise<InvoiceLockResult> => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        // Get current state for audit
        const { data: currentInvoice, error: fetchError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (fetchError) throw fetchError;

        if (currentInvoice?.is_locked) {
          return { success: false, error: "Invoice is already locked" };
        }

        const { error } = await supabase
          .from("invoices")
          .update({
            is_locked: true,
            locked_at: new Date().toISOString(),
            locked_reason: reason,
            locked_by: user.id,
            lock_type: lockType,
          })
          .eq("id", invoiceId);

        if (error) throw error;

        await logChange({
          table_name: "invoices",
          record_id: invoiceId,
          action: "update",
          old_data: { is_locked: false },
          new_data: { is_locked: true, locked_reason: reason, lock_type: lockType },
        });

        toast({
          title: "Invoice Locked",
          description: "This invoice can no longer be modified",
        });

        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to lock invoice";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [user, toast, logChange]
  );

  // Unlock an invoice (admin only, requires justification)
  const unlockInvoice = useCallback(
    async (invoiceId: string, justification: string): Promise<InvoiceLockResult> => {
      if (!user) return { success: false, error: "Not authenticated" };

      try {
        // Get current state for audit
        const { data: currentInvoice, error: fetchError } = await supabase
          .from("invoices")
          .select("*")
          .eq("id", invoiceId)
          .single();

        if (fetchError) throw fetchError;

        if (!currentInvoice?.is_locked) {
          return { success: false, error: "Invoice is not locked" };
        }

        // Payment-locked invoices cannot be unlocked
        if (currentInvoice.lock_type === "payment") {
          return {
            success: false,
            error: "Paid invoices cannot be unlocked. Financial records are immutable.",
          };
        }

        const { error } = await supabase
          .from("invoices")
          .update({
            is_locked: false,
            locked_at: null,
            locked_reason: null,
            locked_by: null,
            lock_type: null,
          })
          .eq("id", invoiceId);

        if (error) throw error;

        // Log both in audit_logs and financial_audit_log for compliance
        await logChange({
          table_name: "invoices",
          record_id: invoiceId,
          action: "update",
          old_data: {
            is_locked: true,
            locked_reason: currentInvoice.locked_reason,
          },
          new_data: {
            is_locked: false,
            unlock_justification: justification,
          },
        });

        await supabase.from("financial_audit_log").insert({
          entity_type: "invoice",
          entity_id: invoiceId,
          action: "unlock",
          old_values: {
            is_locked: true,
            locked_reason: currentInvoice.locked_reason,
            lock_type: currentInvoice.lock_type,
          },
          new_values: {
            is_locked: false,
            unlock_justification: justification,
          },
          changed_by: user.id,
        });

        toast({
          title: "Invoice Unlocked",
          description: "This invoice can now be modified",
        });

        return { success: true };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to unlock invoice";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return { success: false, error: errorMessage };
      }
    },
    [user, toast, logChange]
  );

  // Check if invoice can be edited
  const canEditInvoice = useCallback(
    async (
      invoiceId: string
    ): Promise<{ canEdit: boolean; reason?: string }> => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("is_locked, locked_reason, lock_type, status")
          .eq("id", invoiceId)
          .single();

        if (error) throw error;

        if (data?.is_locked) {
          return {
            canEdit: false,
            reason: data.locked_reason || "Invoice is locked",
          };
        }

        if (data?.status === "paid") {
          return {
            canEdit: false,
            reason: "Paid invoices cannot be edited",
          };
        }

        return { canEdit: true };
      } catch (error) {
        console.error("Error checking edit permission:", error);
        return { canEdit: false, reason: "Unable to verify permissions" };
      }
    },
    []
  );

  return {
    lockInvoice,
    unlockInvoice,
    canEditInvoice,
  };
};

export default useInvoiceLocking;
