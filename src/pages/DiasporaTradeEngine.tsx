import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import usePermissions from "@/hooks/usePermissions";
import { useToast } from "@/hooks/use-toast";
import { Globe, Package, Users, TrendingUp, Plus, MapPin, Shield, CreditCard } from "lucide-react";

const ORIGIN_COUNTRIES = [
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
];

const DEST_COUNTRIES = [
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    created: "bg-muted text-muted-foreground",
    picked_up: "bg-blue-500/10 text-blue-700",
    export_clearance: "bg-amber-500/10 text-amber-700",
    in_transit_international: "bg-purple-500/10 text-purple-700",
    import_clearance: "bg-orange-500/10 text-orange-700",
    inland_dispatch: "bg-cyan-500/10 text-cyan-700",
    out_for_delivery: "bg-indigo-500/10 text-indigo-700",
    delivered: "bg-emerald-500/10 text-emerald-700",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const DiasporaTradeEngine = () => {
  const { user } = useAuth();
  const { isSuperAdmin, isOpsManager, isFinanceManager } = usePermissions();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [vendorRatings, setVendorRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    origin_country: "",
    destination_country: "",
    receiver_name: "",
    receiver_phone: "",
    receiver_address: "",
    description: "",
    weight_kg: "",
    total_value: "",
    currency: "USD",
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [shipRes, agentRes, vendorRes] = await Promise.all([
      supabase.from("global_shipments").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("agent_profiles").select("*").order("rating", { ascending: false }).limit(50),
      supabase.from("vendor_credit_ratings").select("*").order("credit_score", { ascending: false }).limit(20),
    ]);
    setShipments((shipRes.data as any[]) || []);
    setAgents((agentRes.data as any[]) || []);
    setVendorRatings((vendorRes.data as any[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const createShipment = async () => {
    if (!user || !form.origin_country || !form.destination_country || !form.receiver_name) {
      toast({ title: "Missing fields", variant: "destructive" }); return;
    }
    const weight = parseFloat(form.weight_kg) || 0;
    const value = parseFloat(form.total_value) || 0;
    const dutyRate = form.destination_country === "NG" ? 0.2 : 0.1;
    const vatRate = form.destination_country === "NG" ? 0.075 : 0.15;

    const { error } = await supabase.from("global_shipments").insert({
      sender_user_id: user.id,
      origin_country: form.origin_country,
      destination_country: form.destination_country,
      receiver_name: form.receiver_name,
      receiver_phone: form.receiver_phone,
      receiver_address: form.receiver_address,
      description: form.description,
      weight_kg: weight,
      total_value: value,
      currency: form.currency,
      duty_estimate: value * dutyRate,
      vat_estimate: value * vatRate,
      total_landed_cost: value + value * dutyRate + value * vatRate,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Shipment Created", description: "Cross-border shipment registered successfully." });
    setShowCreate(false);
    setForm({ origin_country: "", destination_country: "", receiver_name: "", receiver_phone: "", receiver_address: "", description: "", weight_kg: "", total_value: "", currency: "USD" });
    fetchAll();
  };

  return (
    <DashboardLayout title="Diaspora Trade Engine" subtitle="Cross-border commerce, agent network & freight financialization">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Globe className="h-7 w-7 text-primary" />
              Diaspora Trade Engine
            </h1>
            <p className="text-muted-foreground mt-1">Cross-border commerce, agent network & freight financialization</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> New Shipment</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Cross-Border Shipment</DialogTitle>
                <DialogDescription>Register a new diaspora trade shipment with landed cost estimation</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Origin Country</Label>
                    <Select value={form.origin_country} onValueChange={v => setForm(f => ({ ...f, origin_country: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select origin" /></SelectTrigger>
                      <SelectContent>
                        {ORIGIN_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Destination Country</Label>
                    <Select value={form.destination_country} onValueChange={v => setForm(f => ({ ...f, destination_country: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                      <SelectContent>
                        {DEST_COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Receiver Name</Label><Input value={form.receiver_name} onChange={e => setForm(f => ({ ...f, receiver_name: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Phone</Label><Input value={form.receiver_phone} onChange={e => setForm(f => ({ ...f, receiver_phone: e.target.value }))} /></div>
                  <div><Label>Weight (kg)</Label><Input type="number" value={form.weight_kg} onChange={e => setForm(f => ({ ...f, weight_kg: e.target.value }))} /></div>
                </div>
                <div><Label>Receiver Address</Label><Input value={form.receiver_address} onChange={e => setForm(f => ({ ...f, receiver_address: e.target.value }))} /></div>
                <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Declared Value</Label><Input type="number" value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} /></div>
                  <div>
                    <Label>Currency</Label>
                    <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="CAD">CAD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {form.total_value && form.destination_country && (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <h4 className="text-sm font-semibold mb-2">Landed Cost Estimate</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between"><span>Declared Value</span><span>{form.currency} {parseFloat(form.total_value || "0").toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Est. Duty ({form.destination_country === "NG" ? "20%" : "10%"})</span><span>{form.currency} {(parseFloat(form.total_value || "0") * (form.destination_country === "NG" ? 0.2 : 0.1)).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span>Est. VAT ({form.destination_country === "NG" ? "7.5%" : "15%"})</span><span>{form.currency} {(parseFloat(form.total_value || "0") * (form.destination_country === "NG" ? 0.075 : 0.15)).toLocaleString()}</span></div>
                        <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total Landed Cost</span><span>{form.currency} {(parseFloat(form.total_value || "0") * (1 + (form.destination_country === "NG" ? 0.275 : 0.25))).toLocaleString()}</span></div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <Button onClick={createShipment} className="w-full">Create Shipment</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div><div><p className="text-sm text-muted-foreground">Total Shipments</p><p className="text-2xl font-bold">{shipments.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><MapPin className="h-5 w-5 text-emerald-600" /></div><div><p className="text-sm text-muted-foreground">Active Agents</p><p className="text-2xl font-bold">{agents.filter(a => a.is_active).length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-500/10"><Shield className="h-5 w-5 text-amber-600" /></div><div><p className="text-sm text-muted-foreground">Vendor Ratings</p><p className="text-2xl font-bold">{vendorRatings.length}</p></div></CardContent></Card>
          <Card><CardContent className="pt-6 flex items-center gap-3"><div className="p-2 rounded-lg bg-blue-500/10"><CreditCard className="h-5 w-5 text-blue-600" /></div><div><p className="text-sm text-muted-foreground">In Transit</p><p className="text-2xl font-bold">{shipments.filter(s => s.status === "in_transit_international").length}</p></div></CardContent></Card>
        </div>

        <Tabs defaultValue="shipments">
          <TabsList>
            {/* Ops Manager: shipments + agents only */}
            {(isSuperAdmin || isOpsManager) && <TabsTrigger value="shipments">Shipments</TabsTrigger>}
            {(isSuperAdmin || isOpsManager) && <TabsTrigger value="agents">Agent Network</TabsTrigger>}
            {/* Finance Manager: vendor credit only */}
            {(isSuperAdmin || isFinanceManager) && <TabsTrigger value="vendors">Vendor Credit</TabsTrigger>}
          </TabsList>

          <TabsContent value="shipments">
            <Card>
              <CardHeader><CardTitle>Cross-Border Shipments</CardTitle><CardDescription>Diaspora trade shipments with end-to-end tracking</CardDescription></CardHeader>
              <CardContent>
                {shipments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No shipments yet. Create your first cross-border shipment above.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Route</TableHead>
                        <TableHead>Receiver</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Landed Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.origin_country} → {s.destination_country}</TableCell>
                          <TableCell>{s.receiver_name}</TableCell>
                          <TableCell>{s.currency} {(s.total_value || 0).toLocaleString()}</TableCell>
                          <TableCell className="font-semibold">{s.currency} {(s.total_landed_cost || 0).toLocaleString()}</TableCell>
                          <TableCell><Badge variant="outline" className={statusColor(s.status)}>{(s.status || "").replace(/_/g, " ")}</Badge></TableCell>
                          <TableCell><Badge variant="outline">{s.risk_score || 0}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="agents">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Agent Network</CardTitle><CardDescription>Pickup, drop-off & clearance agents across corridors</CardDescription></CardHeader>
              <CardContent>
                {agents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No agents registered yet. Agent registration coming soon.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Verification</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Deliveries</TableHead>
                        <TableHead>Compliance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agents.map(a => (
                        <TableRow key={a.id}>
                          <TableCell>{a.country}</TableCell>
                          <TableCell><Badge variant="outline">{a.service_type}</Badge></TableCell>
                          <TableCell><Badge variant={a.verification_level === "verified" || a.verification_level === "premium" ? "default" : "outline"}>{a.verification_level}</Badge></TableCell>
                          <TableCell>{a.rating}/5</TableCell>
                          <TableCell>{a.total_deliveries}</TableCell>
                          <TableCell>{a.compliance_score}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vendors">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Vendor Credit Ratings</CardTitle><CardDescription>AI-powered credit scoring for logistics vendors</CardDescription></CardHeader>
              <CardContent>
                {vendorRatings.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No vendor ratings computed yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Credit Score</TableHead>
                        <TableHead>On-Time %</TableHead>
                        <TableHead>Damage Rate</TableHead>
                        <TableHead>Payout Tier</TableHead>
                        <TableHead>Freight Finance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorRatings.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.vendor_name}</TableCell>
                          <TableCell>
                            <span className={`font-bold ${v.credit_score >= 700 ? "text-emerald-600" : v.credit_score >= 400 ? "text-amber-600" : "text-destructive"}`}>
                              {v.credit_score}/1000
                            </span>
                          </TableCell>
                          <TableCell>{v.on_time_delivery_rate}%</TableCell>
                          <TableCell>{v.damage_rate}%</TableCell>
                          <TableCell><Badge variant="outline">{v.payout_speed_tier}</Badge></TableCell>
                          <TableCell>{v.eligible_for_freight_finance ? <Badge className="bg-emerald-500/10 text-emerald-700">Eligible</Badge> : <Badge variant="outline">Not Eligible</Badge>}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DiasporaTradeEngine;
