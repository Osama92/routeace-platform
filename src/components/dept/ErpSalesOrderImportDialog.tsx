import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertTriangle, CheckCircle2, Loader2, XCircle, Calendar as CalIcon, RotateCw } from "lucide-react";
import { toast } from "sonner";

type ProviderState = {
  provider: string;
  status: "idle" | "running" | "ok" | "error";
  fetched?: number;
  newCount?: number;
  skipped?: number;
  incomplete?: number;
  error?: string;
  orders?: PreviewOrder[];
};

type PreviewOrder = {
  external_id: string;
  customer_name?: string | null;
  customer_id?: string | null;
  destination_address: string;
  requested_date?: string | null;
  sku?: string | null;
  already_imported?: boolean;
  address_incomplete?: boolean;
};

type Selection = Record<string, { selected: boolean; address: string }>;

const todayIso = () => new Date().toISOString().slice(0, 10);
const daysAgoIso = (d: number) => new Date(Date.now() - d * 86400_000).toISOString().slice(0, 10);

export default function ErpSalesOrderImportDialog({
  open, onOpenChange, organizationId, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  organizationId: string | null;
  onImported: () => void;
}) {
  const [step, setStep] = useState<"filters" | "preview">("filters");
  const [since, setSince] = useState<string>(daysAgoIso(1));
  const [until, setUntil] = useState<string>(todayIso());
  const [providers, setProviders] = useState<ProviderState[]>([]);
  const [selections, setSelections] = useState<Record<string, Selection>>({}); // provider -> selection map
  const [committing, setCommitting] = useState(false);
  const [commitResults, setCommitResults] = useState<Record<string, { inserted: number; skipped: number; error?: string }>>({});

  useEffect(() => {
    if (!open) {
      // reset on close
      setStep("filters");
      setProviders([]);
      setSelections({});
      setCommitResults({});
      setCommitting(false);
    }
  }, [open]);

  const setProviderState = (provider: string, patch: Partial<ProviderState>) => {
    setProviders((prev) => prev.map((p) => (p.provider === provider ? { ...p, ...patch } : p)));
  };

  const loadProviders = async (): Promise<string[]> => {
    if (!organizationId) {
      toast.error("No organization context");
      return [];
    }
    const { data, error } = await supabase
      .from("integration_configs" as any)
      .select("provider")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .not("provider", "is", null);
    if (error) {
      toast.error(error.message);
      return [];
    }
    const list = Array.from(new Set((data ?? []).map((c: any) => c.provider).filter(Boolean)));
    if (list.length === 0) {
      toast.info("No active ERP/WMS connector linked yet.");
    }
    return list;
  };

  const fetchPreviewFor = async (provider: string) => {
    setProviderState(provider, { status: "running", error: undefined });
    try {
      const { data, error } = await supabase.functions.invoke("erp-sync", {
        body: {
          organization_id: organizationId,
          provider,
          sync_type: "import_sales_orders",
          mode: "preview",
          since, until,
        },
      });
      if (error) throw error;
      const s: any = data?.summary ?? {};
      const orders: PreviewOrder[] = Array.isArray(s.orders) ? s.orders : [];
      setProviderState(provider, {
        status: "ok",
        fetched: Number(s.fetched ?? 0),
        newCount: Number(s.new_count ?? 0),
        skipped: Number(s.skipped ?? 0),
        incomplete: Number(s.incomplete_addresses ?? 0),
        orders,
      });
      // Default selection: every NEW order selected, address pre-filled
      setSelections((prev) => ({
        ...prev,
        [provider]: orders.reduce<Selection>((acc, o) => {
          acc[o.external_id] = {
            selected: !o.already_imported,
            address: o.destination_address ?? "",
          };
          return acc;
        }, {}),
      }));
    } catch (e: any) {
      setProviderState(provider, { status: "error", error: e?.message ?? "Failed to fetch preview" });
    }
  };

  const startPreview = async () => {
    const list = await loadProviders();
    if (list.length === 0) return;
    setProviders(list.map((p) => ({ provider: p, status: "idle" })));
    setStep("preview");
    // Sequential per-provider so the user sees real-time progress
    for (const p of list) {
      await fetchPreviewFor(p);
    }
  };

  const retryFailed = async () => {
    const failed = providers.filter((p) => p.status === "error").map((p) => p.provider);
    for (const p of failed) await fetchPreviewFor(p);
  };

  const togglePick = (provider: string, id: string, selected: boolean) => {
    setSelections((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [id]: { ...prev[provider][id], selected } },
    }));
  };
  const editAddress = (provider: string, id: string, address: string) => {
    setSelections((prev) => ({
      ...prev,
      [provider]: { ...prev[provider], [id]: { ...prev[provider][id], address } },
    }));
  };

  const totals = useMemo(() => {
    let selected = 0, missing = 0;
    for (const p of providers) {
      const sel = selections[p.provider] ?? {};
      for (const o of p.orders ?? []) {
        const s = sel[o.external_id];
        if (s?.selected) {
          selected++;
          if (!s.address || s.address.trim().length < 8) missing++;
        }
      }
    }
    return { selected, missing };
  }, [providers, selections]);

  const commit = async () => {
    if (totals.selected === 0) {
      toast.info("Pick at least one sales order to import.");
      return;
    }
    if (totals.missing > 0) {
      toast.error(`${totals.missing} selected order(s) still have an incomplete address. Please complete or unselect them.`);
      return;
    }
    setCommitting(true);
    const results: Record<string, { inserted: number; skipped: number; error?: string }> = {};
    for (const p of providers) {
      const sel = selections[p.provider] ?? {};
      const orders = (p.orders ?? [])
        .filter((o) => sel[o.external_id]?.selected)
        .map((o) => ({ external_id: o.external_id, destination_address: sel[o.external_id].address }));
      if (orders.length === 0) continue;
      try {
        const { data, error } = await supabase.functions.invoke("erp-sync", {
          body: {
            organization_id: organizationId,
            provider: p.provider,
            sync_type: "import_sales_orders",
            mode: "commit",
            since, until,
            orders,
          },
        });
        if (error) throw error;
        const s: any = data?.summary ?? {};
        results[p.provider] = { inserted: Number(s.inserted ?? 0), skipped: Number(s.skipped ?? 0) };
      } catch (e: any) {
        results[p.provider] = { inserted: 0, skipped: 0, error: e?.message ?? "Failed" };
      }
      setCommitResults({ ...results });
    }
    setCommitting(false);
    const totalInserted = Object.values(results).reduce((a, r) => a + r.inserted, 0);
    const errs = Object.entries(results).filter(([, r]) => r.error);
    if (totalInserted > 0) {
      toast.success(`Imported ${totalInserted} sales order${totalInserted === 1 ? "" : "s"}` + (errs.length ? ` · ${errs.length} provider error(s)` : ""));
      onImported();
    } else if (errs.length) {
      toast.error(`Import failed: ${errs.map(([p, r]) => `${p}: ${r.error}`).join(" · ")}`);
    } else {
      toast.info("No new orders inserted.");
    }
  };

  const setQuickRange = (d: number) => {
    setSince(daysAgoIso(d));
    setUntil(todayIso());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Import Sales Orders from ERP
          </DialogTitle>
          <DialogDescription>
            Pulls open sales orders from your connected ERP/WMS providers. Preview, validate addresses, then convert to dispatches.
          </DialogDescription>
        </DialogHeader>

        {step === "filters" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setQuickRange(1)}>Last 24h</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickRange(7)}>Last 7 days</Button>
              <Button size="sm" variant="outline" onClick={() => setQuickRange(30)}>Last 30 days</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalIcon className="w-3.5 h-3.5" /> From</Label>
                <Input type="date" value={since} onChange={(e) => setSince(e.target.value)} max={until} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CalIcon className="w-3.5 h-3.5" /> To</Label>
                <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} min={since} max={todayIso()} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Only sales orders with a requested-delivery date in this range will be considered.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={startPreview} disabled={!since || !until}>Fetch Preview</Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                Range: <span className="font-mono">{since}</span> → <span className="font-mono">{until}</span>
              </div>
              <div className="flex items-center gap-2">
                {providers.some((p) => p.status === "error") && (
                  <Button size="sm" variant="outline" onClick={retryFailed} className="gap-1.5">
                    <RotateCw className="w-3.5 h-3.5" /> Retry failed
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setStep("filters")}>Change dates</Button>
              </div>
            </div>

            <div className="space-y-4">
              {providers.map((p) => (
                <div key={p.provider} className="border rounded-lg">
                  <div className="flex items-center justify-between p-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2">
                      <ProviderStatusIcon status={p.status} />
                      <span className="font-semibold uppercase text-xs">{p.provider}</span>
                      {p.status === "ok" && (
                        <div className="flex items-center gap-1.5 text-xs">
                          <Badge variant="outline">Fetched: {p.fetched}</Badge>
                          <Badge variant="outline" className="border-emerald-500/30 text-emerald-700">New: {p.newCount}</Badge>
                          {p.skipped! > 0 && <Badge variant="outline">Skipped: {p.skipped}</Badge>}
                          {p.incomplete! > 0 && (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-700">
                              <AlertTriangle className="w-3 h-3 mr-1" /> {p.incomplete} need address
                            </Badge>
                          )}
                        </div>
                      )}
                      {p.status === "running" && <span className="text-xs text-muted-foreground">Fetching…</span>}
                      {p.status === "error" && <span className="text-xs text-destructive">{p.error}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {commitResults[p.provider] && (
                        <span className="text-xs text-muted-foreground">
                          Inserted {commitResults[p.provider].inserted} · Skipped {commitResults[p.provider].skipped}
                          {commitResults[p.provider].error ? ` · ${commitResults[p.provider].error}` : ""}
                        </span>
                      )}
                      {p.status === "error" && (
                        <Button size="sm" variant="outline" onClick={() => fetchPreviewFor(p.provider)} className="gap-1.5">
                          <RotateCw className="w-3.5 h-3.5" /> Retry
                        </Button>
                      )}
                    </div>
                  </div>

                  {p.status === "ok" && (p.orders?.length ?? 0) > 0 && (
                    <ScrollArea className="max-h-72">
                      <table className="w-full text-xs">
                        <thead className="bg-background sticky top-0">
                          <tr className="text-left text-muted-foreground border-b">
                            <th className="p-2 w-8"></th>
                            <th className="p-2">Order #</th>
                            <th className="p-2">Customer</th>
                            <th className="p-2 min-w-[260px]">Shipping Address</th>
                            <th className="p-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.orders!.map((o) => {
                            const sel = selections[p.provider]?.[o.external_id];
                            const dup = o.already_imported;
                            const incomplete = (sel?.address ?? "").trim().length < 8;
                            return (
                              <tr key={o.external_id} className={`border-b ${dup ? "opacity-50" : ""}`}>
                                <td className="p-2">
                                  <Checkbox
                                    checked={sel?.selected ?? false}
                                    disabled={dup}
                                    onCheckedChange={(v) => togglePick(p.provider, o.external_id, !!v)}
                                  />
                                </td>
                                <td className="p-2 font-mono">
                                  {o.external_id}
                                  {dup && <Badge variant="outline" className="ml-2 text-[10px]">already imported</Badge>}
                                </td>
                                <td className="p-2">
                                  <div className="font-medium">{o.customer_name ?? "-"}</div>
                                  {o.customer_id && <div className="text-muted-foreground">{o.customer_id}</div>}
                                </td>
                                <td className="p-2">
                                  <Input
                                    value={sel?.address ?? ""}
                                    onChange={(e) => editAddress(p.provider, o.external_id, e.target.value)}
                                    disabled={dup}
                                    className={`h-8 text-xs ${sel?.selected && incomplete ? "border-amber-500" : ""}`}
                                    placeholder="Enter complete shipping address"
                                  />
                                  {sel?.selected && incomplete && (
                                    <div className="mt-1 text-[10px] text-amber-700 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Address looks incomplete
                                    </div>
                                  )}
                                </td>
                                <td className="p-2 whitespace-nowrap">
                                  {o.requested_date ? new Date(o.requested_date).toLocaleDateString() : "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </ScrollArea>
                  )}
                  {p.status === "ok" && (p.orders?.length ?? 0) === 0 && (
                    <div className="p-4 text-xs text-muted-foreground text-center">No matching sales orders.</div>
                  )}
                </div>
              ))}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
              <div className="text-xs text-muted-foreground">
                {totals.selected} selected
                {totals.missing > 0 && (
                  <span className="text-amber-700 ml-2">
                    · {totals.missing} need a valid address
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={committing}>Close</Button>
                <Button
                  onClick={commit}
                  disabled={committing || totals.selected === 0 || providers.every((p) => p.status !== "ok")}
                  className="gap-2"
                >
                  {committing ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : `Import ${totals.selected} order${totals.selected === 1 ? "" : "s"}`}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProviderStatusIcon({ status }: { status: ProviderState["status"] }) {
  if (status === "running") return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (status === "ok") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === "error") return <XCircle className="w-4 h-4 text-destructive" />;
  return <RefreshCw className="w-4 h-4 text-muted-foreground" />;
}
