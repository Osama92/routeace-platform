import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { AddressAutocomplete } from "@/components/shared/AddressAutocomplete";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Edit, Trash2, ArrowRight, Building2, Truck, Clock, CheckCircle2, XCircle, AlertTriangle,
} from "lucide-react";

const TRUCK_TYPES = ["3T", "5T", "10T", "15T", "20T", "30T", "45T", "60T"];

interface RateCard {
  id: string;
  card_type: "client" | "vendor";
  customer_id: string | null;
  partner_id: string | null;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  truck_type: string;
  rate_amount: number;
  is_net: boolean;
  description: string | null;
  status: "pending" | "approved" | "rejected" | "superseded";
  version: number;
  review_note: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const STATUS_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  approved: { label: "Approved", className: "bg-green-500/10 text-green-600 border-green-500/30", icon: CheckCircle2 },
  pending:  { label: "Awaiting approval", className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30", icon: Clock },
  rejected: { label: "Rejected", className: "bg-red-500/10 text-red-600 border-red-500/30", icon: XCircle },
};

const emptyForm = {
  party_id: "",
  pickup_address: "",
  pickup_lat: null as number | null,
  pickup_lng: null as number | null,
  destination_address: "",
  destination_lat: null as number | null,
  destination_lng: null as number | null,
  truck_type: "",
  rate_amount: "",
  is_net: true,
  description: "",
};

/**
 * Rate Cards — the two sides of a haulage business's money.
 *
 *   Clients          what this organisation CHARGES the company it delivers
 *                    for. Revenue. Priced per customer, because each client
 *                    negotiates its own price on the same lane.
 *   3rd Party Vendors what it PAYS a vendor whose truck runs under it. Cost.
 *
 * Rates are grouped by customer/vendor rather than listed flat, because a
 * single client typically has many lanes and the question being answered is
 * "what do we charge this client?", not "what is every rate we hold?".
 *
 * Finance enters; a super admin approves. Editing an APPROVED rate never
 * mutates it — propose_rate_card_change() creates a new pending version and
 * the live rate keeps pricing dispatches until the replacement is approved,
 * so a past dispatch's price stays recoverable.
 */
export default function RateCards() {
  const { organizationId, hasAnyRole } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab, setTab] = useState<"client" | "vendor">("client");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [form, setForm] = useState(emptyForm);

  const canEdit = hasAnyRole(["finance_manager", "org_admin", "admin", "super_admin"]);

  const { data: rates = [], isLoading } = useQuery({
    queryKey: ["rate-cards", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("rate_cards") as any)
        .select("*")
        .eq("organization_id", organizationId!)
        .neq("status", "superseded")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RateCard[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["rate-card-customers", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("customers")
        .select("id, company_name")
        .eq("organization_id", organizationId!)
        .order("company_name");
      return (data ?? []) as { id: string; company_name: string }[];
    },
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["rate-card-partners", organizationId],
    enabled: !!organizationId,
    queryFn: async () => {
      const { data } = await supabase
        .from("partners")
        .select("id, company_name")
        .eq("organization_id", organizationId!)
        .order("company_name");
      return (data ?? []) as { id: string; company_name: string }[];
    },
  });

  const partyName = (r: RateCard) =>
    r.card_type === "client"
      ? customers.find((c) => c.id === r.customer_id)?.company_name ?? "Unknown customer"
      : partners.find((p) => p.id === r.partner_id)?.company_name ?? "Unknown vendor";

  const parties = tab === "client"
    ? customers.map((c) => ({ id: c.id, label: c.company_name }))
    : partners.map((p) => ({ id: p.id, label: p.company_name }));

  // Group by party — one client usually has many lanes, and the question is
  // "what do we charge this client", not "list every rate we hold".
  const visible = rates.filter((r) => r.card_type === tab);
  const grouped = parties
    .map((p) => ({
      ...p,
      lanes: visible.filter((r) => (tab === "client" ? r.customer_id : r.partner_id) === p.id),
    }))
    .filter((g) => g.lanes.length > 0);

  const save = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.rate_amount);
      if (!form.party_id) throw new Error(tab === "client" ? "Select a customer" : "Select a vendor");
      if (!form.pickup_address || !form.destination_address) throw new Error("Enter both pickup and destination");
      if (!form.truck_type) throw new Error("Select a truck type");
      if (!Number.isFinite(amount) || amount < 0) throw new Error("Enter a valid rate amount");

      // An approved rate is versioned, never overwritten — otherwise past
      // dispatches would silently reprice.
      if (editing && editing.status === "approved") {
        const { error } = await (supabase.rpc as any)("propose_rate_card_change", {
          p_rate_id: editing.id,
          p_new_amount: amount,
          p_note: form.description || null,
        });
        if (error) throw error;
        return "versioned" as const;
      }

      if (editing) {
        const { error } = await (supabase.from("rate_cards") as any)
          .update({
            pickup_address: form.pickup_address,
            pickup_lat: form.pickup_lat,
            pickup_lng: form.pickup_lng,
            destination_address: form.destination_address,
            destination_lat: form.destination_lat,
            destination_lng: form.destination_lng,
            truck_type: form.truck_type,
            rate_amount: amount,
            is_net: form.is_net,
            description: form.description || null,
          })
          .eq("id", editing.id);
        if (error) throw error;
        return "updated" as const;
      }

      const { error } = await (supabase.from("rate_cards") as any).insert({
        organization_id: organizationId,
        card_type: tab,
        customer_id: tab === "client" ? form.party_id : null,
        partner_id: tab === "vendor" ? form.party_id : null,
        pickup_address: form.pickup_address,
        pickup_lat: form.pickup_lat,
        pickup_lng: form.pickup_lng,
        destination_address: form.destination_address,
        destination_lat: form.destination_lat,
        destination_lng: form.destination_lng,
        truck_type: form.truck_type,
        rate_amount: amount,
        is_net: form.is_net,
        description: form.description || null,
      });
      if (error) throw error;
      return "created" as const;
    },
    onSuccess: (kind) => {
      toast({
        title:
          kind === "versioned" ? "Change submitted for approval"
          : kind === "updated" ? "Rate updated"
          : "Rate submitted for approval",
        description:
          kind === "versioned"
            ? "The current rate stays live until a super admin approves the change."
            : kind === "updated"
              ? "Still awaiting approval before dispatch can use it."
              : "A super admin must approve it before dispatch can use it.",
      });
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ["rate-cards"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not save", description: e?.message ?? "Unknown error", variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (r: RateCard) => {
      const { error } = await (supabase.from("rate_cards") as any).delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Rate removed" });
      qc.invalidateQueries({ queryKey: ["rate-cards"] });
    },
    onError: (e: any) =>
      toast({ title: "Could not remove", description: e?.message ?? "Approved rates cannot be deleted.", variant: "destructive" }),
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (r: RateCard) => {
    setEditing(r);
    setForm({
      party_id: (r.card_type === "client" ? r.customer_id : r.partner_id) ?? "",
      pickup_address: r.pickup_address,
      pickup_lat: r.pickup_lat,
      pickup_lng: r.pickup_lng,
      destination_address: r.destination_address,
      destination_lat: r.destination_lat,
      destination_lng: r.destination_lng,
      truck_type: r.truck_type,
      rate_amount: String(r.rate_amount),
      is_net: r.is_net,
      description: r.description ?? "",
    });
    setDialogOpen(true);
  };

  const pendingCount = visible.filter((r) => r.status === "pending").length;

  return (
    <DashboardLayout
      title="Rate Cards"
      subtitle="What you charge clients, and what you pay vendors, per route"
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as "client" | "vendor")}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <TabsList>
            <TabsTrigger value="client" className="gap-2">
              <Building2 className="w-4 h-4" />
              Clients
            </TabsTrigger>
            <TabsTrigger value="vendor" className="gap-2">
              <Truck className="w-4 h-4" />
              3rd Party Vendors
            </TabsTrigger>
          </TabsList>
          {canEdit && (
            <Button onClick={openNew} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Rate
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {tab === "client"
            ? "What you charge each client for a route. This is your revenue on the trip."
            : "What you pay a vendor whose truck runs the route under you. This is your cost."}
          {pendingCount > 0 && (
            <span className="ml-2 text-yellow-600">
              · {pendingCount} awaiting super admin approval
            </span>
          )}
        </p>

        <TabsContent value={tab} className="mt-0">
          {isLoading ? (
            <Card><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ) : grouped.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="text-muted-foreground">
                  No {tab === "client" ? "client" : "vendor"} rates yet.
                </p>
                {parties.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Add {tab === "client" ? "a customer" : "a vendor"} first, then set their rates here.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Accordion type="multiple" defaultValue={grouped.map((g) => g.id)} className="space-y-3">
              {grouped.map((g) => (
                <AccordionItem key={g.id} value={g.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <span className="font-medium">{g.label}</span>
                      <Badge variant="secondary">
                        {g.lanes.length} {g.lanes.length === 1 ? "route" : "routes"}
                      </Badge>
                      {g.lanes.some((l) => l.status === "pending") && (
                        <Badge variant="outline" className="text-yellow-600 border-yellow-500/40">
                          {g.lanes.filter((l) => l.status === "pending").length} pending
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Route</TableHead>
                          <TableHead>Truck</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                          <TableHead>Status</TableHead>
                          {canEdit && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {g.lanes.map((r) => {
                          const badge = STATUS_BADGE[r.status] ?? STATUS_BADGE.pending;
                          const Icon = badge.icon;
                          return (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="flex items-center gap-2 text-sm">
                                  <span>{r.pickup_address}</span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span>{r.destination_address}</span>
                                </div>
                              </TableCell>
                              <TableCell>{r.truck_type}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {fmt(Number(r.rate_amount))}
                                {r.version > 1 && (
                                  <Badge variant="secondary" className="ml-2 text-[10px]">v{r.version}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={badge.className}>
                                  <Icon className="w-3 h-3 mr-1" />
                                  {badge.label}
                                </Badge>
                              </TableCell>
                              {canEdit && (
                                <TableCell className="text-right">
                                  <div className="flex gap-1 justify-end">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                    {r.status !== "approved" && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => remove.mutate(r)}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Rate" : tab === "client" ? "New Client Rate" : "New Vendor Rate"}
            </DialogTitle>
            <DialogDescription>
              {editing?.status === "approved"
                ? "This rate is live. Changing it creates a new version for approval — the current rate keeps pricing dispatches until then."
                : tab === "client"
                  ? "What you charge this client for this route."
                  : "What you pay this vendor for this route."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{tab === "client" ? "Client" : "Vendor"} <span className="text-destructive">*</span></Label>
              <Select
                value={form.party_id}
                onValueChange={(v) => setForm((f) => ({ ...f, party_id: v }))}
                disabled={!!editing}
              >
                <SelectTrigger>
                  <SelectValue placeholder={parties.length ? `Select ${tab === "client" ? "client" : "vendor"}` : "None registered yet"} />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pickup <span className="text-destructive">*</span></Label>
              <AddressAutocomplete
                value={form.pickup_address}
                onChange={(v) => setForm((f) => ({ ...f, pickup_address: v }))}
                onPlaceSelect={(d) =>
                  setForm((f) => ({ ...f, pickup_address: d.formattedAddress, pickup_lat: d.lat, pickup_lng: d.lng }))
                }
                placeholder="Start typing a pickup location..."
                disabled={!!editing}
              />
            </div>

            <div className="space-y-2">
              <Label>Destination <span className="text-destructive">*</span></Label>
              <AddressAutocomplete
                value={form.destination_address}
                onChange={(v) => setForm((f) => ({ ...f, destination_address: v }))}
                onPlaceSelect={(d) =>
                  setForm((f) => ({ ...f, destination_address: d.formattedAddress, destination_lat: d.lat, destination_lng: d.lng }))
                }
                placeholder="Start typing a destination..."
                disabled={!!editing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Truck type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.truck_type}
                  onValueChange={(v) => setForm((f) => ({ ...f, truck_type: v }))}
                  disabled={!!editing}
                >
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {TRUCK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rate (NGN) <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min={0}
                  value={form.rate_amount}
                  onChange={(e) => setForm((f) => ({ ...f, rate_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Context for the approver"
              />
            </div>

            {editing?.status === "approved" && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Only the amount can be changed on a live rate. To change the route or truck
                  type, add a new rate instead — otherwise past dispatches would no longer match
                  what they were priced against.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? "Saving..." : editing ? "Save" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
