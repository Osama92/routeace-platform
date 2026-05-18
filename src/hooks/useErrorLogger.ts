import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ErrorLogData {
  errorType: string;
  errorMessage: string;
  errorStack?: string;
  component?: string;
  pageUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Central error logging hook for Section J - Auto Bug Prevention
 * Logs all errors to the database for tracking and analysis
 */
export function useErrorLogger() {
  const { user } = useAuth();

  const logError = useCallback(async (data: ErrorLogData) => {
    try {
      // Use audit_logs table which exists in schema
      await supabase.from("audit_logs").insert({
        action: `error_${data.errorType}`,
        table_name: data.component || "application",
        record_id: "error",
        user_id: user?.id,
        user_email: user?.email,
        old_data: null,
        new_data: {
          error_type: data.errorType,
          error_message: data.errorMessage,
          error_stack: data.errorStack,
          page_url: data.pageUrl || window.location.href,
          user_agent: navigator.userAgent,
          metadata: data.metadata,
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      // Fallback to console if DB logging fails
      console.error("Failed to log error to database:", err);
      console.error("Original error:", data);
    }
  }, [user]);

  const logApiError = useCallback(async (
    endpoint: string,
    error: any,
    requestData?: any
  ) => {
    await logError({
      errorType: "api_error",
      errorMessage: error?.message || String(error),
      errorStack: error?.stack,
      component: endpoint,
      metadata: {
        endpoint,
        requestData,
        response: error?.response
      }
    });
  }, [logError]);

  const logValidationError = useCallback(async (
    component: string,
    validationErrors: Record<string, string>
  ) => {
    await logError({
      errorType: "validation_error",
      errorMessage: "Form validation failed",
      component,
      metadata: { validationErrors }
    });
  }, [logError]);

  const logStateError = useCallback(async (
    component: string,
    message: string,
    stateSnapshot?: any
  ) => {
    await logError({
      errorType: "state_error",
      errorMessage: message,
      component,
      metadata: { stateSnapshot }
    });
  }, [logError]);

  return {
    logError,
    logApiError,
    logValidationError,
    logStateError
  };
}

export default useErrorLogger;
