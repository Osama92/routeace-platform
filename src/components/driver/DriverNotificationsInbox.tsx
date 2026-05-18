import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell,
  Check,
  X,
  Inbox,
  Truck,
  Clock,
  Settings,
  Eye,
  MapPin,
  Package,
  CheckSquare,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface DriverNotification {
  id: string;
  organization_id: string;
  driver_id: string;
  dispatch_id: string | null;
  vehicle_category: string;
  title: string;
  body: string | null;
  status: "pending" | "sent" | "read" | "accepted" | "rejected" | "expired";
  expires_at: string | null;
  created_at: string;
}

type AlertType = "pickup" | "transit" | "delay" | "other";

interface Prefs {
  pickup: boolean;
  transit: boolean;
  delay: boolean;
  other: boolean;
}

const DEFAULT_PREFS: Prefs = { pickup: true, transit: true, delay: true, other: true };

const CATEGORY_LABEL: Record<string, string> = {
  bike: "Bike",
  van: "Van",
  truck_15t: "Truck 15T",
  truck_20t: "Truck 20T",
  trailer: "Trailer",
};

function inferType(n: DriverNotification): AlertType {
  const t = `${n.title} ${n.body ?? ""}`.toLowerCase();
  if (/\bdelay|late|behind|eta\b/.test(t)) return "delay";
  if (/\bpick.?up|collect|new job|assigned\b/.test(t)) return "pickup";
  if (/\btransit|on the way|en.?route|in motion|moving\b/.test(t)) return "transit";
  return "other";
}

function statusBadge(n: DriverNotification) {
  const expired = n.expires_at && new Date(n.expires_at) < new Date();
  if (expired || n.status === "expired") return <Badge variant="outline">Expired</Badge>;
  if (n.status === "accepted") return <Badge className="bg-emerald-500/15 text-emerald-700">Accepted</Badge>;
  if (n.status === "rejected") return <Badge variant="destructive">Declined</Badge>;
  if (n.status === "read") return <Badge variant="secondary">Read</Badge>;
  return <Badge>New</Badge>;
}

function typeBadge(t: AlertType) {
  const map: Record<AlertType, string> = {
    pickup: "bg-blue-500/15 text-blue-700",
    transit: "bg-amber-500/15 text-amber-700",
    delay: "bg-rose-500/15 text-rose-700",
    other: "bg-muted text-muted-foreground",
  };
  return <Badge className={map[t]} variant="outline">{t}</Badge>;
}

interface Props {
  driverId: string | null | undefined;
}

export default function DriverNotificationsInbox({ driverId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── Preferences (per-driver, localStorage) ─────────────────────────
  const prefsKey = driverId ? `driver-notif-prefs:${driverId}` : null;
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [prefsOpen, setPrefsOpen] = useState(false);

  useEffect(() => {
    if (!prefsKey) return;
    try {
      const raw = localStorage.getItem(prefsKey);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch { /* ignore */ }
  }, [prefsKey]);

  const updatePref = (k: keyof Prefs, v: boolean) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    if (prefsKey) {
      try { localStorage.setItem(prefsKey, JSON.stringify(next)); } catch { /* ignore */ }
    }
  };

  // ── Smart polling: pause when tab hidden ────────────────────────────
  const [tabVisible, setTabVisible] = useState(
    typeof document !== "undefined" ? !document.hidden : true,
  );
  useEffect(() => {
    const onChange = () => {
      const visible = !document.hidden;
      setTabVisible(visible);
      if (visible && driverId) {
        queryClient.invalidateQueries({ queryKey: ["driver-job-notifications", driverId] });
      }
    };
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, [driverId, queryClient]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["driver-job-notifications", driverId],
    enabled: !!driverId,
    refetchInterval: tabVisible ? 30_000 : false,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("driver_job_notifications" as any)
        .select("*")
        .eq("driver_id", driverId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as DriverNotification[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: DriverNotification["status"] }) => {
      const { error } = await supabase
        .from("driver_job_notifications" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["driver-job-notifications", driverId] });
      const map: Record<string, string> = {
        accepted: "Job accepted",
        rejected: "Job declined",
        read: "Marked as read",
      };
      toast({ title: map[vars.status] ?? "Updated" });
    },
    onError: (e: any) => {
      toast({ title: "Could not update", description: e?.message ?? "", variant: "destructive" });
    },
  });

  // ── Bulk actions ────────────────────────────────────────────────────
  const bulkMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: DriverNotification["status"] }) => {
      const { error } = await supabase
        .from("driver_job_notifications" as any)
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["driver-job-notifications", driverId] });
      setSelected(new Set());
      toast({
        title: `${vars.ids.length} ${vars.status === "accepted" ? "accepted" : vars.status === "rejected" ? "declined" : "updated"}`,
      });
    },
    onError: (e: any) => {
      toast({ title: "Bulk update failed", description: e?.message ?? "", variant: "destructive" });
    },
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggleSelect = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Detail drawer ───────────────────────────────────────────────────
  const [detailNotif, setDetailNotif] = useState<DriverNotification | null>(null);
  const { data: detailDispatch } = useQuery({
    queryKey: ["dispatch-detail", detailNotif?.dispatch_id],
    enabled: !!detailNotif?.dispatch_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dispatches")
        .select("dispatch_number, pickup_address, delivery_address, scheduled_pickup, scheduled_delivery, status, notes, cargo_description")
        .eq("id", detailNotif!.dispatch_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const openDetail = (n: DriverNotification) => {
    setDetailNotif(n);
    // Auto mark as read when opened
    if (n.status === "pending" || n.status === "sent") {
      updateStatusMutation.mutate({ id: n.id, status: "read" });
    }
  };

  // ── Filtering / partition ───────────────────────────────────────────
  const filtered = useMemo(
    () => notifications.filter((n) => prefs[inferType(n)]),
    [notifications, prefs],
  );

  const { active, history, unreadCount } = useMemo(() => {
    const now = Date.now();
    const isOpen = (n: DriverNotification) => {
      if (n.status === "accepted" || n.status === "rejected" || n.status === "expired") return false;
      if (n.expires_at && new Date(n.expires_at).getTime() < now) return false;
      return true;
    };
    const a = filtered.filter(isOpen);
    const h = filtered.filter((n) => !isOpen(n));
    const u = filtered.filter(
      (n) =>
        (n.status === "pending" || n.status === "sent") &&
        (!n.expires_at || new Date(n.expires_at).getTime() > now),
    ).length;
    return { active: a, history: h, unreadCount: u };
  }, [filtered]);

  const allSelected = active.length > 0 && active.every((n) => selected.has(n.id));
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(active.map((n) => n.id)));
  };

  if (!driverId) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Driver profile not found - notifications unavailable.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Bell className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Job Notifications</CardTitle>
            {unreadCount > 0 && <Badge className="ml-1">{unreadCount} new</Badge>}
            {!tabVisible && (
              <Badge variant="outline" className="text-[10px]">Sync paused</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => setPrefsOpen(true)}
            aria-label="Notification preferences"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <CardDescription className="text-xs">
            Pickup, transit and delay alerts for your vehicle category. Click a notification to view details.
          </CardDescription>

          {/* Bulk action bar */}
          {active.length > 0 && (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} />
                <span>
                  {selected.size > 0 ? `${selected.size} selected` : "Select all"}
                </span>
              </label>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-7"
                  disabled={selected.size === 0 || bulkMutation.isPending}
                  onClick={() =>
                    bulkMutation.mutate({ ids: Array.from(selected), status: "accepted" })
                  }
                >
                  <Check className="w-3.5 h-3.5 mr-1" /> Accept all
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7"
                  disabled={selected.size === 0 || bulkMutation.isPending}
                  onClick={() =>
                    bulkMutation.mutate({ ids: Array.from(selected), status: "rejected" })
                  }
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Decline all
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : active.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-center gap-2">
              <Inbox className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No active notifications. New jobs matched to your vehicle category will appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {active.map((n) => {
                const t = inferType(n);
                const isUnread = n.status === "pending" || n.status === "sent";
                return (
                  <li
                    key={n.id}
                    className="border rounded-lg p-3 hover:bg-muted/30 transition"
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selected.has(n.id)}
                        onCheckedChange={() => toggleSelect(n.id)}
                        className="mt-1"
                        aria-label="Select notification"
                      />
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => openDetail(n)}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs font-medium text-muted-foreground">
                            {CATEGORY_LABEL[n.vehicle_category] ?? n.vehicle_category}
                          </span>
                          {typeBadge(t)}
                          {statusBadge(n)}
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold mt-1 truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        {n.expires_at && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Expires {formatDistanceToNow(new Date(n.expires_at), { addSuffix: true })}
                          </p>
                        )}
                      </button>
                      <div className="flex flex-col gap-1.5 shrink-0 w-24">
                        <Button
                          size="sm"
                          className="h-8 w-full font-semibold"
                          disabled={updateStatusMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({ id: n.id, status: "accepted" });
                          }}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-full font-semibold"
                          disabled={updateStatusMutation.isPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateStatusMutation.mutate({ id: n.id, status: "rejected" });
                          }}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Decline
                        </Button>
                        {isUnread && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px]"
                            disabled={updateStatusMutation.isPending}
                            onClick={(e) => {
                              e.stopPropagation();
                              updateStatusMutation.mutate({ id: n.id, status: "read" });
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" /> Mark read
                          </Button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">History</CardTitle>
            <CardDescription className="text-xs">Past notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {history.slice(0, 25).map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-3 py-2 border-b last:border-0 cursor-pointer hover:bg-muted/30 -mx-2 px-2 rounded"
                  onClick={() => openDetail(n)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {statusBadge(n)}
                      {typeBadge(inferType(n))}
                      <span className="text-xs text-muted-foreground">
                        {CATEGORY_LABEL[n.vehicle_category] ?? n.vehicle_category}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm truncate">{n.title}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Preferences sheet */}
      <Sheet open={prefsOpen} onOpenChange={setPrefsOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Notification preferences</SheetTitle>
            <SheetDescription>
              Choose which alert types you want to see in your inbox. Hidden alerts stay in the database - they just won't show here.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {([
              ["pickup", "Pickup alerts", "New job assignments and pickup-ready notices"],
              ["transit", "Transit alerts", "On-the-way and en-route updates"],
              ["delay", "Delay alerts", "Late, ETA changes, and behind-schedule warnings"],
              ["other", "Other", "Anything else (general system messages)"],
            ] as const).map(([key, label, desc]) => (
              <div key={key} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                <div>
                  <Label htmlFor={`pref-${key}`} className="text-sm font-medium">{label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
                <Switch
                  id={`pref-${key}`}
                  checked={prefs[key]}
                  onCheckedChange={(v) => updatePref(key, v)}
                />
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Detail drawer */}
      <Sheet open={!!detailNotif} onOpenChange={(o) => !o && setDetailNotif(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {detailNotif && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 text-base">
                  <Bell className="w-4 h-4" /> {detailNotif.title}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 flex-wrap">
                  {typeBadge(inferType(detailNotif))}
                  {statusBadge(detailNotif)}
                  <span className="text-[11px]">
                    {format(new Date(detailNotif.created_at), "PPp")}
                  </span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-5 space-y-4 text-sm">
                {detailNotif.body && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Message</p>
                    <p>{detailNotif.body}</p>
                  </div>
                )}

                {detailNotif.dispatch_id ? (
                  detailDispatch ? (
                    <div className="rounded-lg border p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Dispatch</span>
                        <span className="text-xs font-mono">
                          {detailDispatch.dispatch_number ?? detailNotif.dispatch_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-emerald-600 shrink-0" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">Pickup</p>
                          <p>{detailDispatch.pickup_address ?? "-"}</p>
                          {detailDispatch.scheduled_pickup && (
                            <p className="text-muted-foreground mt-0.5">
                              {format(new Date(detailDispatch.scheduled_pickup), "PPp")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 mt-0.5 text-rose-600 shrink-0" />
                        <div className="text-xs">
                          <p className="text-muted-foreground">Delivery</p>
                          <p>{detailDispatch.delivery_address ?? "-"}</p>
                          {detailDispatch.scheduled_delivery && (
                            <p className="text-muted-foreground mt-0.5">
                              {format(new Date(detailDispatch.scheduled_delivery), "PPp")}
                            </p>
                          )}
                        </div>
                      </div>
                      {detailDispatch.cargo_description && (
                        <div className="flex items-start gap-2">
                          <Package className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <div className="text-xs">
                            <p className="text-muted-foreground">Load</p>
                            <p>{detailDispatch.cargo_description}</p>
                          </div>
                        </div>
                      )}
                      {detailDispatch.notes && (
                        <div className="text-xs">
                          <p className="text-muted-foreground">Notes</p>
                          <p className="whitespace-pre-wrap">{detailDispatch.notes}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-xs text-muted-foreground">Status:</span>
                        <Badge variant="outline" className="capitalize">
                          {detailDispatch.status ?? "-"}
                        </Badge>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading dispatch details…</p>
                  )
                ) : (
                  <p className="text-xs text-muted-foreground">No linked dispatch.</p>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {(detailNotif.status === "pending" || detailNotif.status === "sent" || detailNotif.status === "read") && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: detailNotif.id, status: "accepted" });
                          setDetailNotif(null);
                        }}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          updateStatusMutation.mutate({ id: detailNotif.id, status: "rejected" });
                          setDetailNotif(null);
                        }}
                      >
                        <X className="w-3.5 h-3.5 mr-1" /> Decline
                      </Button>
                      {(detailNotif.status === "pending" || detailNotif.status === "sent") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            updateStatusMutation.mutate({ id: detailNotif.id, status: "read" });
                          }}
                        >
                          <CheckSquare className="w-3.5 h-3.5 mr-1" /> Mark read
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
