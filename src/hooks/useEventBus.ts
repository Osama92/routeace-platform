import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useEventBusMetrics() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["event-bus-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_events" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["api-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_contracts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["event-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_subscriptions" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: processingLogs = [] } = useQuery({
    queryKey: ["event-processing-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_processing_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const totalEvents = events.length;
  const pendingEvents = events.filter((e: any) => e.status === "pending").length;
  const deliveredEvents = events.filter((e: any) => e.status === "delivered").length;
  const failedEvents = events.filter((e: any) => e.status === "failed").length;

  const eventsBySource: Record<string, number> = {};
  const eventsByType: Record<string, number> = {};
  events.forEach((e: any) => {
    eventsBySource[e.source_os] = (eventsBySource[e.source_os] || 0) + 1;
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
  });

  return {
    events,
    contracts,
    subscriptions,
    processingLogs,
    isLoading,
    metrics: {
      totalEvents,
      pendingEvents,
      deliveredEvents,
      failedEvents,
      eventsBySource,
      eventsByType,
    },
  };
}

export function useRealtimeEvents(targetOS?: string) {
  const [liveEvents, setLiveEvents] = useState<any[]>([]);

  useEffect(() => {
    const filter = targetOS ? `target_os=eq.${targetOS}` : undefined;
    const channel = supabase
      .channel("live-events")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "platform_events", ...(filter ? { filter } : {}) },
        (payload) => {
          setLiveEvents((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [targetOS]);

  return liveEvents;
}
