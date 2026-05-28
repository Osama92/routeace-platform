import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "operations" | "support" | "dispatcher" | "driver" | "super_admin" | "org_admin" | "ops_manager" | "finance_manager" | "customer" | "internal_team" | "core_founder" | "core_builder" | "core_product" | "core_engineer";
type ApprovalStatus = "pending" | "approved" | "suspended" | "rejected";
export type TenantMode = "LOGISTICS_COMPANY" | "LOGISTICS_DEPARTMENT";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  loading: boolean;
  currentSessionId: string | null;
  isApproved: boolean;
  approvalStatus: ApprovalStatus | null;
  suspensionReason: string | null;
  isSuperAdmin: boolean;
  organizationId: string | null;
  tenantMode: TenantMode;
  industryCode: string | null;
  subscriptionStatus: string | null;
  subscriptionExpiresAt: string | null;
  trialExpired: boolean;
  trialDaysRemaining: number | null;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: AppRole) => boolean;
  hasAnyRole: (roles: AppRole[]) => boolean;
  refreshApprovalStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus | null>(null);
  const [suspensionReason, setSuspensionReason] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [tenantMode, setTenantMode] = useState<TenantMode>("LOGISTICS_COMPANY");
  const [industryCode, setIndustryCode] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const lastTrialStateRef = useRef<string | null>(null);

  const isApproved = approvalStatus === "approved";
  const isSuperAdmin = userRole === "super_admin";
  const trialExpired =
    subscriptionStatus === "trial" &&
    !!subscriptionExpiresAt &&
    new Date(subscriptionExpiresAt).getTime() < Date.now();

  const trialDaysRemaining: number | null = (() => {
    if (subscriptionStatus !== "trial" || !subscriptionExpiresAt) return null;
    const msLeft = new Date(subscriptionExpiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(msLeft / 86_400_000));
  })();

  // Detailed trial telemetry - fires whenever trial status, expiry, or org changes.
  useEffect(() => {
    if (!user) return;
    const expiresMs = subscriptionExpiresAt ? new Date(subscriptionExpiresAt).getTime() : null;
    const daysLeft = expiresMs ? Math.round((expiresMs - Date.now()) / 86_400_000) : null;
    const snapshot = JSON.stringify({
      org: organizationId,
      status: subscriptionStatus,
      expiresAt: subscriptionExpiresAt,
      trialExpired,
    });
    if (snapshot === lastTrialStateRef.current) return;
    lastTrialStateRef.current = snapshot;

    const payload = {
      userId: user.id,
      email: user.email,
      organizationId,
      tenantMode,
      subscriptionStatus,
      subscriptionExpiresAt,
      daysLeft,
      trialExpired,
      timestamp: new Date().toISOString(),
    };

    if (trialExpired) {
      console.error("[Auth/Trial] TRIAL EXPIRED - user locked out", payload);
    } else if (subscriptionStatus === "trial" && daysLeft !== null && daysLeft <= 7) {
      console.warn(`[Auth/Trial] Trial ending in ${daysLeft} day(s)`, payload);
    } else {
      console.info("[Auth/Trial] Subscription state", payload);
    }

    // Best-effort persisted audit (table may not exist in dev; ignore failures)
    if (trialExpired || (subscriptionStatus === "trial" && daysLeft !== null && daysLeft <= 7)) {
      void (supabase as any)
        .from("audit_logs")
        .insert({
          user_id: user.id,
          action: trialExpired ? "trial_expired_lockout" : "trial_expiry_warning",
          resource_type: "subscription",
          resource_id: organizationId,
          metadata: payload,
        })
        .then((r: any) => {
          if (r?.error) console.warn("[Auth/Trial] audit_logs insert failed:", r.error.message);
        });
    }
  }, [user, organizationId, subscriptionStatus, subscriptionExpiresAt, trialExpired, tenantMode]);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (!error && data?.role) {
        return data.role as AppRole;
      }

      // Fallback: organization_members.role (TEXT) for roles outside the app_role ENUM
      // (e.g. 'transporter', 'super_admin', 'org_admin', 'ops_manager', 'finance_manager', 'customer')
      const { data: omData } = await supabase
        .from("organization_members")
        .select("role")
        .eq("user_id", userId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (omData?.role) {
        return omData.role as AppRole;
      }

      console.log("No role found for user in user_roles or organization_members");
      return null;
    } catch (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
  };

  const fetchApprovalStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("approval_status, suspension_reason")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.log("No profile found for user");
        return { status: null, reason: null };
      }
      return {
        status: data?.approval_status as ApprovalStatus,
        reason: data?.suspension_reason,
      };
    } catch (error) {
      console.error("Error fetching approval status:", error);
      return { status: null, reason: null };
    }
  };

  const refreshApprovalStatus = async () => {
    if (user) {
      const { status, reason } = await fetchApprovalStatus(user.id);
      setApprovalStatus(status);
      setSuspensionReason(reason);
      if (organizationId) {
        const sub = await fetchSubscription(organizationId);
        setSubscriptionStatus(sub.status);
        setSubscriptionExpiresAt(sub.expiresAt);
      }
    }
  };

  const fetchOrganizationId = async (userId: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();
      return data?.organization_id ?? null;
    } catch {
      return null;
    }
  };

  const fetchTenantMode = async (orgId: string | null): Promise<TenantMode> => {
    if (!orgId) return "LOGISTICS_COMPANY";
    try {
      const { data } = await supabase
        .from("tenant_config")
        .select("tenant_mode")
        .eq("organization_id", orgId)
        .limit(1)
        .maybeSingle();
      const mode = data?.tenant_mode;
      return mode === "LOGISTICS_DEPARTMENT" ? "LOGISTICS_DEPARTMENT" : "LOGISTICS_COMPANY";
    } catch {
      return "LOGISTICS_COMPANY";
    }
  };

  const fetchIndustryCode = async (orgId: string | null): Promise<string | null> => {
    if (!orgId) return null;
    try {
      const { data } = await supabase
        .from("industry_tenants")
        .select("industry_code")
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return (data?.industry_code as string | null) ?? null;
    } catch {
      return null;
    }
  };

  const fetchSubscription = async (orgId: string | null): Promise<{ status: string | null; expiresAt: string | null }> => {
    if (!orgId) return { status: null, expiresAt: null };
    try {
      const { data } = await supabase
        .from("organizations")
        .select("subscription_status, subscription_expires_at")
        .eq("id", orgId)
        .maybeSingle();
      return {
        status: (data as any)?.subscription_status ?? null,
        expiresAt: (data as any)?.subscription_expires_at ?? null,
      };
    } catch {
      return { status: null, expiresAt: null };
    }
  };

  // Create a new session record when user logs in
  const createSessionRecord = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_sessions")
        .insert({
          user_id: userId,
          login_at: new Date().toISOString(),
          ip_address: null,
          user_agent: navigator.userAgent,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error creating session record:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error creating session record:", error);
      return null;
    }
  };

  // Update session record when user logs out
  const updateSessionRecord = async (sessionId: string) => {
    if (!sessionId) return;

    try {
      const { data: sessionData } = await supabase
        .from("user_sessions")
        .select("login_at")
        .eq("id", sessionId)
        .single();

      let sessionDuration = null;
      if (sessionData?.login_at) {
        const loginTime = new Date(sessionData.login_at);
        const logoutTime = new Date();
        sessionDuration = Math.round((logoutTime.getTime() - loginTime.getTime()) / 60000);
      }

      await supabase
        .from("user_sessions")
        .update({
          logout_at: new Date().toISOString(),
          session_duration_minutes: sessionDuration,
        })
        .eq("id", sessionId);
    } catch (error) {
      console.error("Error updating session record:", error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Helper to load user data (role + approval) with guaranteed finally-setLoading
    const loadUserData = async (userId: string) => {
      try {
        const [role, approval, orgId] = await Promise.all([
          fetchUserRole(userId),
          fetchApprovalStatus(userId),
          fetchOrganizationId(userId),
        ]);
        if (!isMounted) return;
        setUserRole(role);
        setApprovalStatus(approval.status);
        setSuspensionReason(approval.reason);
        setOrganizationId(orgId);
        const [mode, ic, sub] = await Promise.all([
          fetchTenantMode(orgId),
          fetchIndustryCode(orgId),
          fetchSubscription(orgId),
        ]);
        if (!isMounted) return;
        setTenantMode(mode);
        setIndustryCode(ic);
        setSubscriptionStatus(sub.status);
        setSubscriptionExpiresAt(sub.expiresAt);
      } catch (err) {
        console.error("Error loading user data:", err);
      }
    };

    // Listener for ONGOING auth changes - does NOT control global loading
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);

        if (event === "SIGNED_IN" && session?.user) {
          // Use setTimeout to avoid Supabase deadlock inside onAuthStateChange
          setTimeout(async () => {
            if (!isMounted) return;
            try {
              const newSessionId = await createSessionRecord(session.user.id);
              if (newSessionId && isMounted) {
                sessionIdRef.current = newSessionId;
                setCurrentSessionId(newSessionId);
              }
              await loadUserData(session.user.id);
            } finally {
              if (isMounted) setLoading(false);
            }
          }, 0);
        } else if (event === "SIGNED_OUT") {
          if (sessionIdRef.current) {
            updateSessionRecord(sessionIdRef.current);
            sessionIdRef.current = null;
            setCurrentSessionId(null);
          }
          setUserRole(null);
          setApprovalStatus(null);
          setSuspensionReason(null);
          setOrganizationId(null); setTenantMode("LOGISTICS_COMPANY"); setIndustryCode(null);
          setSubscriptionStatus(null); setSubscriptionExpiresAt(null);
          setLoading(false);
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          // Refresh silently - don't touch loading state
          setTimeout(() => loadUserData(session.user.id), 0);
        } else if (event !== "SIGNED_IN") {
          // Any other event with no user → stop loading
          if (!session?.user) setLoading(false);
        }
      }
    );

    // INITIAL session load - controls global loading, must set loading=false in finally
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const newSessionId = await createSessionRecord(session.user.id);
          if (newSessionId && isMounted) {
            sessionIdRef.current = newSessionId;
            setCurrentSessionId(newSessionId);
          }
          await loadUserData(session.user.id);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    // Clean up session on page unload
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({
          session_id: sessionIdRef.current,
          logout_at: new Date().toISOString(),
        });
        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_sessions?id=eq.${sessionIdRef.current}`,
          payload
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    // Update session record before signing out
    if (sessionIdRef.current) {
      await updateSessionRecord(sessionIdRef.current);
      sessionIdRef.current = null;
      setCurrentSessionId(null);
    }
    
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setApprovalStatus(null);
    setSuspensionReason(null);
    setOrganizationId(null); setTenantMode("LOGISTICS_COMPANY"); setIndustryCode(null);
    setSubscriptionStatus(null); setSubscriptionExpiresAt(null);
  };

  const hasRole = (role: AppRole) => userRole === role;
  
  const hasAnyRole = (roles: AppRole[]) => userRole !== null && roles.includes(userRole);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        userRole,
        loading,
        currentSessionId,
        isApproved,
        approvalStatus,
        suspensionReason,
        isSuperAdmin,
        organizationId,
        tenantMode,
        industryCode,
        subscriptionStatus,
        subscriptionExpiresAt,
        trialExpired,
        trialDaysRemaining,
        signUp,
        signIn,
        signOut,
        hasRole,
        hasAnyRole,
        refreshApprovalStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
