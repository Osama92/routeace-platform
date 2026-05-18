import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, LogOut, AlertCircle, RefreshCw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface ProvisioningCheck {
  label: string;
  status: "pending" | "ok" | "fail";
}

import { getRoleDisplay } from "@/lib/deptRoleDisplay";

/**
 * Shown to a logged-in user whose backend provisioning (role + organization)
 * has not yet completed. Polls every 1.5s and reacts to terminal states
 * (suspended/rejected) instead of spinning forever.
 */
const AccountProvisioningScreen = () => {
  const { user, signOut, refreshApprovalStatus, tenantMode } = useAuth();
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const [checks, setChecks] = useState<ProvisioningCheck[]>([
    { label: "Account verified", status: "ok" },
    { label: "Role assigned", status: "pending" },
    { label: "Organization created", status: "pending" },
    { label: "Profile approved", status: "pending" },
  ]);
  const [attempts, setAttempts] = useState(0);
  const [stalled, setStalled] = useState(false);

  const runVerification = async () => {
    if (!user) return;
    const [{ data: roleRow }, { data: memberRow }, { data: profileRow }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle(),
      supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      supabase.from("profiles").select("approval_status, suspension_reason").eq("user_id", user.id).maybeSingle(),
    ]);

    const role = roleRow?.role as string | undefined;
    const status = profileRow?.approval_status as string | undefined;
    const label = role ? getRoleDisplay(role, tenantMode).title : "Role";

    setChecks([
      { label: "Account verified", status: "ok" },
      { label: `Role assigned${role ? ` (${label})` : ""}`, status: role ? "ok" : "pending" },
      { label: "Organization created", status: memberRow?.organization_id ? "ok" : "pending" },
      {
        label: "Profile approved",
        status: status === "approved" ? "ok" : status === "suspended" || status === "rejected" ? "fail" : "pending",
      },
    ]);

    // Terminal states - stop polling, show actionable message
    if (status === "suspended") {
      setTerminalError(
        profileRow?.suspension_reason
          ? `Your account has been suspended. Reason: ${profileRow.suspension_reason}`
          : "Your account has been suspended. Please contact your organization admin."
      );
      return true;
    }
    if (status === "rejected") {
      setTerminalError("Your account access was rejected. Please contact your organization admin.");
      return true;
    }

    if (role && memberRow?.organization_id && status === "approved") {
      await refreshApprovalStatus();
      window.location.replace("/");
      return true;
    }
    return false;
  };

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      const done = await runVerification();
      if (cancelled || done) return;
      interval = setInterval(async () => {
        setAttempts((a) => a + 1);
        const finished = await runVerification();
        if (finished && interval) clearInterval(interval);
      }, 1500);
    })();

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (attempts >= 8) setStalled(true);
  }, [attempts]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-8 max-w-md w-full"
      >
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            {terminalError ? (
              <XCircle className="w-10 h-10 text-destructive" />
            ) : stalled ? (
              <AlertCircle className="w-10 h-10 text-warning" />
            ) : (
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            )}
          </div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-2">
            {terminalError
              ? "Account Not Active"
              : stalled
              ? "Provisioning Taking Longer Than Expected"
              : "Setting Up Your Account"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {terminalError
              ? terminalError
              : stalled
              ? "Your account is taking longer than usual. You can retry or contact support."
              : "We're finalizing your workspace. This usually takes a few seconds."}
          </p>
        </div>

        <div className="bg-secondary/50 rounded-lg p-4 mb-6 space-y-3">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-3 text-sm">
              {c.status === "ok" ? (
                <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
              ) : c.status === "fail" ? (
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin flex-shrink-0" />
              )}
              <span
                className={
                  c.status === "ok"
                    ? "text-foreground"
                    : c.status === "fail"
                    ? "text-destructive"
                    : "text-muted-foreground"
                }
              >
                {c.label}
              </span>
            </div>
          ))}
        </div>

        <div className="bg-muted/30 rounded-lg p-3 mb-6 text-xs text-muted-foreground text-center">
          Signed in as <span className="font-medium text-foreground">{user?.email}</span>
        </div>

        <div className="space-y-2">
          <Button variant="outline" className="w-full gap-2" onClick={runVerification}>
            <RefreshCw className="w-4 h-4" />
            Check Again
          </Button>
          <Button variant="ghost" className="w-full gap-2" onClick={signOut}>
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AccountProvisioningScreen;
