import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserPresence {
  user_id: string;
  status: "online" | "away" | "offline";
  last_active_at: string;
  current_page?: string;
}

interface PresenceState {
  [key: string]: UserPresence[];
}

export const useUserPresence = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [presenceChannel, setPresenceChannel] = useState<any>(null);

  // Update presence in database
  const updatePresence = useCallback(
    async (status: "online" | "away" | "offline", currentPage?: string) => {
      if (!user) return;

      const { error } = await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          status,
          last_active_at: new Date().toISOString(),
          current_page: currentPage || window.location.pathname,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (error) {
        console.error("Error updating presence:", error);
      }
    },
    [user]
  );

  // Set up real-time presence tracking
  useEffect(() => {
    if (!user) return;

    // Initial presence update
    updatePresence("online", window.location.pathname);

    // Subscribe to presence channel
    const channel = supabase.channel("user-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<UserPresence>();
        const users: UserPresence[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: UserPresence) => {
            users.push(presence);
          });
        });
        setOnlineUsers(users);
      })
      .on("presence", { event: "join" }, ({ newPresences }) => {
        console.log("User joined:", newPresences);
      })
      .on("presence", { event: "leave" }, ({ leftPresences }) => {
        console.log("User left:", leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            status: "online",
            last_active_at: new Date().toISOString(),
            current_page: window.location.pathname,
          });
        }
      });

    setPresenceChannel(channel);

    // Also subscribe to database changes for persistence
    const dbChannel = supabase
      .channel("user_presence_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          // Refresh online users when DB changes
          fetchOnlineUsers();
        }
      )
      .subscribe();

    // Track visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        updatePresence("away");
      } else {
        updatePresence("online");
      }
    };

    // Track page navigation
    const handleNavigation = () => {
      updatePresence("online", window.location.pathname);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("popstate", handleNavigation);

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      updatePresence("online", window.location.pathname);
    }, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      clearInterval(heartbeat);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("popstate", handleNavigation);
      updatePresence("offline");
      supabase.removeChannel(channel);
      supabase.removeChannel(dbChannel);
    };
  }, [user, updatePresence]);

  const fetchOnlineUsers = async () => {
    const { data, error } = await supabase
      .from("user_presence")
      .select("*")
      .in("status", ["online", "away"])
      .gte(
        "last_active_at",
        new Date(Date.now() - 5 * 60 * 1000).toISOString()
      ); // Active in last 5 minutes

    if (!error && data) {
      setOnlineUsers(data as UserPresence[]);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOnlineUsers();
  }, []);

  return {
    onlineUsers,
    updatePresence,
    isUserOnline: (userId: string) =>
      onlineUsers.some((u) => u.user_id === userId && u.status === "online"),
    isUserAway: (userId: string) =>
      onlineUsers.some((u) => u.user_id === userId && u.status === "away"),
    getOnlineCount: () =>
      onlineUsers.filter((u) => u.status === "online").length,
  };
};
