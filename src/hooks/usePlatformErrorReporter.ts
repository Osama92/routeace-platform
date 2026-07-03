import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Strips the origin from a URL so we don't store full URLs with tokens
const sanitiseUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
};

const report = async (
  message: string,
  opts: {
    stack?: string;
    component?: string;
    severity?: "error" | "warning" | "critical";
    error_type?: "client" | "edge_function" | "api";
    extra?: Record<string, unknown>;
  } = {}
) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get org from session metadata if available
    const orgId: string | null =
      (user?.user_metadata?.organization_id as string) ?? null;

    await supabase.from("platform_errors").insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      organization_id: orgId,
      error_type: opts.error_type ?? "client",
      severity: opts.severity ?? "error",
      message,
      stack: opts.stack ?? null,
      component: opts.component ?? null,
      page_url: sanitiseUrl(window.location.href),
      route: window.location.pathname,
      extra: opts.extra ?? null,
    });
  } catch {
    // Never throw from inside the reporter — this would cause infinite loops
  }
};

// Attach once at app root — catches unhandled JS errors and promise rejections
export const usePlatformErrorReporter = () => {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      report(event.message || "Unhandled error", {
        stack: event.error?.stack,
        component: event.filename,
        severity: "error",
        error_type: "client",
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
          ? reason
          : JSON.stringify(reason);
      report(message, {
        stack: reason instanceof Error ? reason.stack : undefined,
        severity: "error",
        error_type: "client",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
};

// Named export so individual components / catch boundaries can report manually
export const reportPlatformError = report;
