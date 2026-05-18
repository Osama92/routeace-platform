import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SecurityEvent {
  id: string;
  event_type: string;
  severity: string | null;
  ip_address: string | null;
  details: any;
  user_agent: string | null;
  user_id: string | null;
  created_at: string | null;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  table_name: string;
  record_id: string;
  user_email: string | null;
  old_data: any;
  new_data: any;
  created_at: string | null;
}

export function useSecurityEvents() {
  const [threats, setThreats] = useState<SecurityEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    threatsBlocked24h: 0,
    anomalies: 0,
    totalAccounts: 0,
    totalAuditEntries: 0,
  });

  const fetchThreats = useCallback(async () => {
    const { data } = await supabase
      .from("security_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setThreats(data);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setAuditLogs(data);
  }, []);

  const fetchStats = useCallback(async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [blocked, accounts, audits, anomalies] = await Promise.all([
      supabase
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", twentyFourHoursAgo),
      supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true }),
      supabase
        .from("audit_logs")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("security_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", twentyFourHoursAgo)
        .in("severity", ["high", "critical"]),
    ]);

    setStats({
      threatsBlocked24h: blocked.count || 0,
      anomalies: anomalies.count || 0,
      totalAccounts: accounts.count || 0,
      totalAuditEntries: audits.count || 0,
    });
  }, []);

  const logSecurityEvent = useCallback(async (event: {
    event_type: string;
    severity?: string;
    ip_address?: string;
    details?: Record<string, any>;
    user_agent?: string;
    user_id?: string;
  }) => {
    await supabase.from("security_events").insert(event);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchThreats(), fetchAuditLogs(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, [fetchThreats, fetchAuditLogs, fetchStats]);

  return { threats, auditLogs, stats, loading, logSecurityEvent, refresh: () => Promise.all([fetchThreats(), fetchAuditLogs(), fetchStats()]) };
}
