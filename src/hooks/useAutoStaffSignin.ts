import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * P11 - Auto-record a daily `staff_signins` row for every authenticated user
 * the first time they load any dashboard each day.
 *
 * Captures geolocation when the browser permits it (lat/lng).
 * Falls back to recording without coordinates if the user denies the prompt
 * or the device cannot resolve a fix - sign-in itself is never blocked.
 */
export function useAutoStaffSignin() {
  const { user, organizationId } = useAuth();
  const ranForUser = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    const key = `${user.id}:${todayStr}`;
    if (ranForUser.current === key) return;
    ranForUser.current = key;

    const sessionFlag = `staff_signin_recorded:${key}`;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(sessionFlag)) return;

    const getCoords = (): Promise<{ lat: number | null; lng: number | null; accuracy: number | null }> =>
      new Promise((resolve) => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
          resolve({ lat: null, lng: null, accuracy: null });
          return;
        }
        const timeoutId = setTimeout(() => resolve({ lat: null, lng: null, accuracy: null }), 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            });
          },
          () => {
            clearTimeout(timeoutId);
            resolve({ lat: null, lng: null, accuracy: null });
          },
          { enableHighAccuracy: true, timeout: 7000, maximumAge: 60_000 }
        );
      });

    (async () => {
      try {
        const { data: existing } = await supabase
          .from("staff_signins")
          .select("id, signin_lat")
          .eq("user_id", user.id)
          .eq("signin_date", todayStr)
          .maybeSingle();

        // Already recorded today - try to back-fill location if missing
        if (existing) {
          if (existing.signin_lat == null) {
            const coords = await getCoords();
            if (coords.lat != null && coords.lng != null) {
              await supabase
                .from("staff_signins")
                .update({ signin_lat: coords.lat, signin_lng: coords.lng })
                .eq("id", existing.id);
            }
          }
          if (typeof sessionStorage !== "undefined") sessionStorage.setItem(sessionFlag, "1");
          return;
        }

        const coords = await getCoords();

        const cutoff = new Date();
        cutoff.setHours(9, 15, 0, 0);
        const status = new Date() > cutoff ? "late" : "on_time";

        const { error } = await supabase.from("staff_signins").insert({
          user_id: user.id,
          organization_id: organizationId ?? null,
          signin_date: todayStr,
          signin_at: new Date().toISOString(),
          signin_lat: coords.lat,
          signin_lng: coords.lng,
          status,
          device_info: {
            user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
            location_accuracy_m: coords.accuracy,
            location_granted: coords.lat != null,
          },
          notes:
            coords.lat != null
              ? "Auto-recorded on dashboard load"
              : "Auto-recorded on dashboard load (location not granted)",
        });

        if (!error && typeof sessionStorage !== "undefined") {
          sessionStorage.setItem(sessionFlag, "1");
        } else if (error) {
          console.warn("Auto staff sign-in skipped:", error.message);
        }
      } catch (err) {
        console.warn("Auto staff sign-in error:", err);
      }
    })();
  }, [user, organizationId]);
}
