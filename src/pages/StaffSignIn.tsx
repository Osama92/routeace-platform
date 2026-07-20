import { useEffect, useState, useCallback, useRef } from "react";
import { format, differenceInMinutes } from "date-fns";
import { Loader2, MapPin, LogIn, LogOut, AlertCircle, Clock, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { reverseGeocode } from "@/lib/geocodeCache";

interface Signin {
  id: string;
  signin_date: string;
  signin_at: string | null;
  signout_at: string | null;
  status: string;
  signin_lat: number | null;
  signin_lng: number | null;
  signout_lat: number | null;
  signout_lng: number | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  on_time: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  late:    "bg-amber-500/10 text-amber-700 border-amber-300",
  remote:  "bg-sky-500/10 text-sky-700 border-sky-300",
  absent:  "bg-red-500/10 text-red-700 border-red-300",
  half_day:"bg-purple-500/10 text-purple-700 border-purple-300",
};

// Format "4h 35m" from two timestamps; returns null if either is missing
function hoursWorked(signin: string | null, signout: string | null): string | null {
  if (!signin || !signout) return null;
  const mins = differenceInMinutes(new Date(signout), new Date(signin));
  if (mins <= 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Fallback: format coords as "4.845, 6.968" when geocoding is unavailable
function fmtCoords(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// Promisified geolocation — always gets a fresh fix
function getPosition(): Promise<GeolocationCoordinates> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported by this browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 },
    );
  });
}

export default function StaffSignIn() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [today,      setToday]      = useState<Signin | null>(null);
  const [history,    setHistory]    = useState<Signin[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes,      setNotes]      = useState("");

  // Location state
  const [coords,    setCoords]    = useState<GeolocationCoordinates | null>(null);
  const [geoState,  setGeoState]  = useState<"pending" | "ready" | "denied" | "unsupported">("pending");
  const [orgId,     setOrgId]     = useState<string | null>(null);

  // Address strings for each coord pair — keyed by "lat,lng" → human address
  const [addressMap, setAddressMap] = useState<Map<string, string>>(new Map());
  const geocodingRef = useRef<Set<string>>(new Set());

  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Request location on mount — required for compliance
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("unsupported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => { setCoords(p.coords); setGeoState("ready"); },
      () => setGeoState("denied"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, []);

  // Geocode all unique coord pairs in the loaded records — updates addressMap
  const geocodeAll = useCallback(async (records: Signin[]) => {
    const pairs: Array<{ lat: number; lng: number }> = [];
    for (const r of records) {
      if (r.signin_lat != null && r.signin_lng != null) pairs.push({ lat: r.signin_lat, lng: r.signin_lng });
      if (r.signout_lat != null && r.signout_lng != null) pairs.push({ lat: r.signout_lat, lng: r.signout_lng });
    }
    // Only geocode new pairs not already in flight
    const toFetch = pairs.filter((p) => {
      const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
      return !geocodingRef.current.has(k);
    });
    toFetch.forEach((p) => geocodingRef.current.add(`${p.lat.toFixed(4)},${p.lng.toFixed(4)}`));

    await Promise.all(
      toFetch.map(async ({ lat, lng }) => {
        const addr = await reverseGeocode(lat, lng);
        setAddressMap((prev) => {
          const next = new Map(prev);
          next.set(`${lat.toFixed(4)},${lng.toFixed(4)}`, addr);
          return next;
        });
      }),
    );
  }, []);

  function addrFor(lat: number | null, lng: number | null): string | null {
    if (lat == null || lng == null) return null;
    return addressMap.get(`${lat.toFixed(4)},${lng.toFixed(4)}`) ?? fmtCoords(lat, lng);
  }

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data }, { data: mem }] = await Promise.all([
      supabase
        .from("staff_signins")
        .select("*")
        .eq("user_id", user.id)
        .order("signin_date", { ascending: false })
        .limit(31),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    if (mem?.organization_id) setOrgId(mem.organization_id);
    const list = (data ?? []) as Signin[];
    setToday(list.find((r) => r.signin_date === todayStr) ?? null);
    setHistory(list.filter((r) => r.signin_date !== todayStr));
    setLoading(false);
    void geocodeAll(list);
  }, [user, todayStr, geocodeAll]);

  useEffect(() => { void load(); }, [load]);

  function lateStatus(): "on_time" | "late" {
    const now    = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 15, 0, 0);
    return now > cutoff ? "late" : "on_time";
  }

  async function signIn() {
    if (!user) return;
    setSubmitting(true);
    try {
      // Always get a fresh fix at the moment of sign-in
      let fix: GeolocationCoordinates | null = coords;
      try { fix = await getPosition(); setCoords(fix); setGeoState("ready"); }
      catch { /* use cached or null */ }

      const { error } = await supabase.from("staff_signins").insert({
        user_id:         user.id,
        organization_id: orgId,
        signin_date:     todayStr,
        signin_at:       new Date().toISOString(),
        signin_lat:      fix?.latitude  ?? null,
        signin_lng:      fix?.longitude ?? null,
        status:          lateStatus(),
        notes:           notes || null,
      });

      if (error) throw error;
      toast({ title: "Signed in", description: `Recorded at ${format(new Date(), "HH:mm")}` });
      setNotes("");
      if (fix) void geocodeAll([{ signin_lat: fix.latitude, signin_lng: fix.longitude, signout_lat: null, signout_lng: null } as any]);
      void load();
    } catch (err: any) {
      toast({ title: "Sign-in failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  async function signOut() {
    if (!today) return;
    setSubmitting(true);
    try {
      // Fresh GPS fix at the actual moment of sign-out
      let fix: GeolocationCoordinates | null = coords;
      try { fix = await getPosition(); setCoords(fix); setGeoState("ready"); }
      catch { /* use cached or null */ }

      const { error } = await supabase
        .from("staff_signins")
        .update({
          signout_at:  new Date().toISOString(),
          signout_lat: fix?.latitude  ?? null,
          signout_lng: fix?.longitude ?? null,
        })
        .eq("id", today.id);

      if (error) throw error;
      toast({ title: "Signed out", description: "Have a great evening 👋" });
      void load();
    } catch (err: any) {
      toast({ title: "Sign-out failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Derived: live hours worked for the today card (updates every render)
  const [, rerender] = useState(0);
  useEffect(() => {
    if (!today?.signin_at || today?.signout_at) return;
    // Tick every minute so "hours worked so far" stays current
    const id = setInterval(() => rerender(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, [today]);

  const workedToday = today
    ? hoursWorked(today.signin_at, today.signout_at ?? new Date().toISOString())
    : null;

  // ── Geo status banner
  const GeoBanner = () => {
    if (geoState === "ready" && coords) {
      const addr = addrFor(coords.latitude, coords.longitude);
      return (
        <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm">
          <MapPin className="h-3.5 w-3.5" />
          Location ready · {addr ?? `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
        </span>
      );
    }
    if (geoState === "pending") {
      return (
        <span className="inline-flex items-center gap-1.5 text-amber-600 text-sm">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Detecting location…
        </span>
      );
    }
    if (geoState === "denied") {
      return (
        <span className="inline-flex items-center gap-1.5 text-destructive text-sm">
          <AlertCircle className="h-3.5 w-3.5" />
          Location access denied — enable it in your browser settings for compliance tracking.
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground text-sm">
        <AlertCircle className="h-3.5 w-3.5" />
        Location not supported on this device.
      </span>
    );
  };

  return (
    <DashboardLayout
      title="Daily Sign-In"
      subtitle="Check in for the day. Location is captured automatically for compliance."
    >
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl">

        {/* ── Today card ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Today — {format(new Date(), "EEEE, MMM d, yyyy")}</CardTitle>
            <CardDescription><GeoBanner /></CardDescription>
          </CardHeader>

          <CardContent>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : today ? (
              <div className="space-y-4">

                {/* Status + status-aware summary row */}
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={STATUS_COLORS[today.status] ?? ""} variant="outline">
                    {today.status.replace("_", " ")}
                  </Badge>
                  {today.signout_at ? (
                    <span className="text-sm text-muted-foreground">Day complete</span>
                  ) : (
                    <span className="text-sm text-emerald-600 font-medium">Currently signed in</span>
                  )}
                </div>

                {/* Sign-in / sign-out time grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <LogIn className="w-3 h-3" /> Sign-in time
                    </p>
                    <p className="text-xl font-bold tabular-nums">
                      {today.signin_at ? format(new Date(today.signin_at), "HH:mm") : "—"}
                    </p>
                    {addrFor(today.signin_lat, today.signin_lng) && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {addrFor(today.signin_lat, today.signin_lng)}
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <LogOut className="w-3 h-3" /> Sign-out time
                    </p>
                    <p className="text-xl font-bold tabular-nums">
                      {today.signout_at ? format(new Date(today.signout_at), "HH:mm") : "—"}
                    </p>
                    {addrFor(today.signout_lat, today.signout_lng) && (
                      <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" />
                        {addrFor(today.signout_lat, today.signout_lng)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Hours worked */}
                {workedToday && (
                  <div className="rounded-lg border bg-primary/5 px-4 py-3 flex items-center gap-3">
                    <Timer className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {today.signout_at ? "Hours worked" : "Hours so far"}
                      </p>
                      <p className="text-lg font-bold tabular-nums text-primary">{workedToday}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {today.notes && (
                  <p className="text-xs text-muted-foreground border-l-2 border-muted pl-3 italic">
                    {today.notes}
                  </p>
                )}

                {/* Sign-out button */}
                {!today.signout_at && (
                  <Button
                    onClick={signOut}
                    disabled={submitting}
                    variant="secondary"
                    className="w-full sm:w-auto"
                  >
                    {submitting
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Getting location…</>
                      : <><LogOut className="h-4 w-4 mr-2" />Sign out for the day</>
                    }
                  </Button>
                )}
              </div>
            ) : (
              /* Not yet signed in */
              <div className="space-y-4">
                {geoState === "denied" && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-300 px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Location access is required for attendance compliance. Please allow location in
                      your browser settings, then refresh the page.
                    </span>
                  </div>
                )}
                <Textarea
                  placeholder="Optional note (e.g. remote today, client visit)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <Button
                  onClick={signIn}
                  disabled={submitting}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {submitting
                    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Getting location…</>
                    : <><LogIn className="h-4 w-4 mr-2" />Sign in now</>
                  }
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── 30-day history ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <div className="divide-y">
                {history.map((h) => {
                  const worked = hoursWorked(h.signin_at, h.signout_at);
                  const inAddr  = addrFor(h.signin_lat, h.signin_lng);
                  const outAddr = addrFor(h.signout_lat, h.signout_lng);

                  return (
                    <div key={h.id} className="py-3 space-y-1.5">
                      {/* Top row: date + badge + hours */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm w-12 shrink-0">
                            {format(new Date(h.signin_date), "MMM d")}
                          </span>
                          <Badge className={STATUS_COLORS[h.status] ?? ""} variant="outline">
                            {h.status.replace("_", " ")}
                          </Badge>
                        </div>
                        {worked && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                            <Timer className="w-3 h-3" /> {worked}
                          </span>
                        )}
                      </div>

                      {/* Times row */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pl-14">
                        <span className="flex items-center gap-1">
                          <LogIn className="w-3 h-3 text-emerald-500" />
                          {h.signin_at ? format(new Date(h.signin_at), "HH:mm") : "—"}
                        </span>
                        <span className="flex items-center gap-1">
                          <LogOut className="w-3 h-3 text-rose-400" />
                          {h.signout_at ? format(new Date(h.signout_at), "HH:mm") : "—"}
                        </span>
                      </div>

                      {/* Location row — only if we have coords */}
                      {(inAddr || outAddr) && (
                        <div className="flex flex-col gap-0.5 text-[10px] text-muted-foreground/70 pl-14">
                          {inAddr && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                              In: {inAddr}
                            </span>
                          )}
                          {outAddr && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                              Out: {outAddr}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Notes */}
                      {h.notes && (
                        <p className="text-[10px] text-muted-foreground/70 pl-14 italic">{h.notes}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
