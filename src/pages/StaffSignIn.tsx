import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, MapPin, LogIn, LogOut, Camera, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import DashboardLayout from "@/components/layout/DashboardLayout";

interface Signin {
  id: string;
  signin_date: string;
  signin_at: string | null;
  signout_at: string | null;
  status: string;
  signin_lat: number | null;
  signin_lng: number | null;
  notes: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  on_time: "bg-emerald-500/10 text-emerald-700 border-emerald-300",
  late: "bg-amber-500/10 text-amber-700 border-amber-300",
  remote: "bg-sky-500/10 text-sky-700 border-sky-300",
  absent: "bg-red-500/10 text-red-700 border-red-300",
  half_day: "bg-purple-500/10 text-purple-700 border-purple-300",
};

export default function StaffSignIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [today, setToday] = useState<Signin | null>(null);
  const [history, setHistory] = useState<Signin[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const todayStr = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    if (!user) return;
    void load();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude }),
        (err) => {
          console.warn("Geolocation denied:", err.message);
          setGeoError(true);
        }
      );
    } else {
      setGeoError(true);
    }
  }, [user]);

  async function load() {
    setLoading(true);
    const [{ data }, { data: mem }] = await Promise.all([
      supabase
        .from("staff_signins")
        .select("*")
        .eq("user_id", user!.id)
        .order("signin_date", { ascending: false })
        .limit(30),
      supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user!.id)
        .maybeSingle(),
    ]);
    if (mem?.organization_id) setOrgId(mem.organization_id);
    const list = (data ?? []) as Signin[];
    setToday(list.find((r) => r.signin_date === todayStr) ?? null);
    setHistory(list.filter((r) => r.signin_date !== todayStr));
    setLoading(false);
  }

  function lateStatus(): "on_time" | "late" {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 15, 0, 0); // 09:15 cutoff
    return now > cutoff ? "late" : "on_time";
  }

  async function signIn() {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("staff_signins").insert({
      user_id: user.id,
      organization_id: orgId,
      signin_date: todayStr,
      signin_at: new Date().toISOString(),
      signin_lat: coords?.lat ?? null,
      signin_lng: coords?.lng ?? null,
      status: lateStatus(),
      notes: notes || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Sign-in failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed in", description: `Status: ${lateStatus()}` });
    setNotes("");
    void load();
  }

  async function signOut() {
    if (!today) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("staff_signins")
      .update({
        signout_at: new Date().toISOString(),
        signout_lat: coords?.lat ?? null,
        signout_lng: coords?.lng ?? null,
      })
      .eq("id", today.id);
    setSubmitting(false);
    if (error) {
      toast({ title: "Sign-out failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Signed out", description: "Have a great evening" });
    void load();
  }

  return (
    <DashboardLayout title="Daily Sign-In" subtitle="Check in for the day. Location is captured for compliance.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">

        <Card>
          <CardHeader>
            <CardTitle>Today - {format(new Date(), "EEEE, MMM d, yyyy")}</CardTitle>
            <CardDescription>
              {geoError ? (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <AlertCircle className="h-3.5 w-3.5" /> Location unavailable - sign-in will proceed without GPS.
                </span>
              ) : coords ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <MapPin className="h-3.5 w-3.5" /> Location ready ({coords.lat.toFixed(3)}, {coords.lng.toFixed(3)})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" /> Allow location access for compliance tracking…
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : today ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={STATUS_COLORS[today.status]} variant="outline">
                    {today.status.replace("_", " ")}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Signed in at {today.signin_at ? format(new Date(today.signin_at), "HH:mm") : "-"}
                  </span>
                  {today.signout_at && (
                    <span className="text-sm text-muted-foreground">
                      • Signed out at {format(new Date(today.signout_at), "HH:mm")}
                    </span>
                  )}
                </div>
                {!today.signout_at && (
                  <Button onClick={signOut} disabled={submitting} variant="secondary">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                    Sign out for the day
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <Textarea
                  placeholder="Optional note (e.g., remote today, client visit)…"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
                <Button onClick={signIn} disabled={submitting} size="lg">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                  Sign in now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No history yet.</p>
            ) : (
              <div className="divide-y">
                {history.map((h) => (
                  <div key={h.id} className="py-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{format(new Date(h.signin_date), "MMM d")}</span>
                      <Badge className={STATUS_COLORS[h.status]} variant="outline">
                        {h.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {h.signin_at ? format(new Date(h.signin_at), "HH:mm") : "-"}
                      {h.signout_at && ` → ${format(new Date(h.signout_at), "HH:mm")}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
