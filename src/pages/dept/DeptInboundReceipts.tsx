import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, PackageCheck, Plus, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function DeptInboundReceipts() {
  const { organizationId, user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ supplier_name: "", purchase_order_ref: "", warehouse_name: "", expected_date: "", total_items: 0 });
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [recvForm, setRecvForm] = useState({ received_items: 0, received_date: new Date().toISOString().slice(0, 10), discrepancy_notes: "" });

  useEffect(() => { if (organizationId) void load(); /* eslint-disable-next-line */ }, [organizationId]);

  async function load() {
    setLoading(true);
    if (!organizationId) { setLoading(false); return; }
    const { data } = await supabase.from("inbound_receipts" as any).select("*").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(300);
    setItems((data as any) || []);
    setLoading(false);
  }

  async function create() {
    if (!organizationId || !form.supplier_name) { toast.error("Supplier required"); return; }
    const { error } = await (supabase.from("inbound_receipts" as any) as any).insert({
      organization_id: organizationId, ...form, expected_date: form.expected_date || null,
      created_by: user?.id, status: "expected",
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Expected receipt created");
    setForm({ supplier_name: "", purchase_order_ref: "", warehouse_name: "", expected_date: "", total_items: 0 });
    void load();
  }

  async function confirmReceipt(item: any) {
    const status = recvForm.received_items === 0 ? "rejected" :
      recvForm.received_items < item.total_items ? (recvForm.discrepancy_notes ? "discrepancy" : "partial") : "received";
    const { error } = await (supabase.from("inbound_receipts" as any) as any).update({
      received_items: recvForm.received_items,
      received_date: recvForm.received_date,
      discrepancy_notes: recvForm.discrepancy_notes || null,
      received_by: user?.id, status,
    }).eq("id", item.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Receipt marked as ${status}`);
    setReceivingId(null);
    void load();
  }

  function exportCsv() {
    const header = ["GRN", "Supplier", "PO Ref", "Warehouse", "Expected", "Received", "Status", "Items", "Received"];
    const rows = items.map((i: any) => [i.receipt_number, i.supplier_name, i.purchase_order_ref || "", i.warehouse_name || "", i.expected_date || "", i.received_date || "", i.status, i.total_items, i.received_items].join(","));
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "inbound-receipts.csv"; a.click(); URL.revokeObjectURL(url);
  }

  const expected = items.filter((i: any) => i.status === "expected");
  const today = new Date().toISOString().slice(0, 10);
  const kpis = useMemo(() => ({
    expectedToday: items.filter((i: any) => i.expected_date === today && i.status === "expected").length,
    receivedToday: items.filter((i: any) => i.received_date === today && i.status === "received").length,
    partial: items.filter((i: any) => i.status === "partial").length,
    discrepancies: items.filter((i: any) => i.status === "discrepancy").length,
  }), [items]);

  return (
    <DashboardLayout title="Inbound Receipts (GRN)" subtitle="Track supplier deliveries to your warehouse - scoped to your organization.">
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
        <div className="grid gap-4 md:grid-cols-4">
          <Kpi label="Expected Today" value={kpis.expectedToday} />
          <Kpi label="Received Today" value={kpis.receivedToday} />
          <Kpi label="Partial" value={kpis.partial} />
          <Kpi label="Discrepancies" value={kpis.discrepancies} />
        </div>

        <Tabs defaultValue="expected">
          <TabsList>
            <TabsTrigger value="expected">Expected Inbounds</TabsTrigger>
            <TabsTrigger value="create">Create Expected Receipt</TabsTrigger>
            <TabsTrigger value="history">Receipt History</TabsTrigger>
          </TabsList>

          <TabsContent value="expected">
            <Card>
              <CardHeader><CardTitle className="text-base">Expected ({expected.length})</CardTitle></CardHeader>
              <CardContent>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : expected.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">No expected inbounds.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-xs text-muted-foreground border-b"><tr>
                      <th className="text-left py-2">GRN #</th><th className="text-left">Supplier</th><th>PO</th><th>Warehouse</th>
                      <th>Expected</th><th className="text-right">Items</th><th></th>
                    </tr></thead>
                    <tbody>
                      {expected.map((i: any) => (
                        <>
                          <tr key={i.id} className="border-b">
                            <td className="py-2 font-mono text-xs">{i.receipt_number}</td>
                            <td>{i.supplier_name}</td><td>{i.purchase_order_ref || "-"}</td>
                            <td>{i.warehouse_name || "-"}</td><td>{i.expected_date || "-"}</td>
                            <td className="text-right">{i.total_items}</td>
                            <td><Button size="sm" variant="outline" onClick={() => { setReceivingId(receivingId === i.id ? null : i.id); setRecvForm({ received_items: i.total_items, received_date: today, discrepancy_notes: "" }); }}><PackageCheck className="h-4 w-4 mr-1" />Receive</Button></td>
                          </tr>
                          {receivingId === i.id && (
                            <tr><td colSpan={7} className="bg-muted/30 p-3">
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                <Input type="number" value={recvForm.received_items} onChange={(e) => setRecvForm({ ...recvForm, received_items: Number(e.target.value) })} placeholder="Received items" />
                                <Input type="date" value={recvForm.received_date} onChange={(e) => setRecvForm({ ...recvForm, received_date: e.target.value })} />
                                <Button size="sm" onClick={() => confirmReceipt(i)}>Confirm Receipt</Button>
                              </div>
                              {recvForm.received_items < i.total_items && (
                                <Textarea placeholder="Discrepancy notes (required for discrepancy status)" value={recvForm.discrepancy_notes} onChange={(e) => setRecvForm({ ...recvForm, discrepancy_notes: e.target.value })} rows={2} />
                              )}
                            </td></tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="create">
            <Card>
              <CardHeader><CardTitle className="text-base">Create Expected Receipt</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-w-2xl">
                <div><label className="text-xs text-muted-foreground">Supplier *</label><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">PO Ref</label><Input value={form.purchase_order_ref} onChange={(e) => setForm({ ...form, purchase_order_ref: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Warehouse</label><Input value={form.warehouse_name} onChange={(e) => setForm({ ...form, warehouse_name: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs text-muted-foreground">Expected Date</label><Input type="date" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></div>
                  <div><label className="text-xs text-muted-foreground">Total Items</label><Input type="number" value={form.total_items} onChange={(e) => setForm({ ...form, total_items: Number(e.target.value) })} /></div>
                </div>
                <Button onClick={create}><Plus className="h-4 w-4 mr-2" />Create</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">All Receipts</CardTitle><Button size="sm" variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />CSV</Button></div></CardHeader>
              <CardContent>
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b"><tr>
                    <th className="text-left py-2">GRN</th><th className="text-left">Supplier</th><th>Status</th>
                    <th>Expected</th><th>Received</th><th className="text-right">Items</th>
                  </tr></thead>
                  <tbody>
                    {items.map((i: any) => (
                      <tr key={i.id} className="border-b">
                        <td className="py-2 font-mono text-xs">{i.receipt_number}</td>
                        <td>{i.supplier_name}</td>
                        <td><Badge variant={i.status === "received" ? "default" : i.status === "discrepancy" || i.status === "rejected" ? "destructive" : "outline"}>{i.status}</Badge></td>
                        <td>{i.expected_date || "-"}</td><td>{i.received_date || "-"}</td>
                        <td className="text-right">{i.received_items} / {i.total_items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="pt-6">
    <div className="text-xs text-muted-foreground uppercase">{label}</div>
    <div className="text-2xl font-bold">{value}</div>
  </CardContent></Card>;
}
