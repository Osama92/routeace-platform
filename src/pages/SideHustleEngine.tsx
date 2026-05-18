import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Briefcase, DollarSign, Users, TrendingUp, Plus, CheckCircle, XCircle, Clock, Loader2, Percent
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const SideHustleEngine = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState({
    driver_id: "",
    pickup_address: "",
    delivery_address: "",
    revenue: 0,
    notes: "",
  });

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("side_hustle_trips")
        .select("*, drivers(full_name)")
        .order("created_at", { ascending: false })
        .limit(100);
      setTrips(data || []);
    } catch (error) {
      console.error("Failed to fetch side hustle trips:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.pickup_address || !form.delivery_address || form.revenue <= 0) {
      toast({ title: "Fill all required fields", variant: "destructive" });
      return;
    }
    setProcessing(true);
    try {
      const platformCommission = form.revenue * 0.10;
      const driverNet = form.revenue - platformCommission;

      const { error } = await supabase.from("side_hustle_trips").insert({
        driver_id: form.driver_id || null,
        pickup_address: form.pickup_address,
        delivery_address: form.delivery_address,
        revenue: form.revenue,
        platform_commission_percent: 10,
        platform_commission_amount: platformCommission,
        driver_net_amount: driverNet,
        notes: form.notes,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Side Hustle Trip Created" });
      setCreateOpen(false);
      setForm({ driver_id: "", pickup_address: "", delivery_address: "", revenue: 0, notes: "" });
      fetchTrips();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async (id: string) => {
    await supabase.from("side_hustle_trips").update({
      status: "approved", approved_by: user?.id, approved_at: new Date().toISOString()
    }).eq("id", id);
    toast({ title: "Trip Approved" });
    fetchTrips();
  };

  const totals = {
    totalRevenue: trips.reduce((a, t) => a + (t.revenue || 0), 0),
    platformEarnings: trips.reduce((a, t) => a + (t.platform_commission_amount || 0), 0),
    driverEarnings: trips.reduce((a, t) => a + (t.driver_net_amount || 0), 0),
    tripCount: trips.length,
  };

  const statusColor: Record<string, string> = {
    pending: "bg-warning/10 text-warning",
    approved: "bg-primary/10 text-primary",
    in_transit: "bg-info/10 text-info",
    delivered: "bg-success/10 text-success",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <DashboardLayout title="Side Hustle Engine" subtitle="Driver side jobs, revenue splits & transparency dashboard">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: formatCurrency(totals.totalRevenue), icon: DollarSign, color: "text-success bg-success/10" },
          { label: "Platform (10%)", value: formatCurrency(totals.platformEarnings), icon: Percent, color: "text-primary bg-primary/10" },
          { label: "Driver Earnings", value: formatCurrency(totals.driverEarnings), icon: Users, color: "text-warning bg-warning/10" },
          { label: "Total Trips", value: totals.tripCount, icon: Briefcase, color: "text-muted-foreground bg-muted" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card>
              <CardContent className="pt-6">
                <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-2`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex justify-end mb-4">
        <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-2" />New Side Hustle Trip</Button>
      </div>

      {/* Trips Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Side Hustle Trips</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Pickup</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Platform Cut</TableHead>
                <TableHead>Driver Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trips.map((trip) => (
                <TableRow key={trip.id}>
                  <TableCell className="font-medium">{trip.drivers?.full_name || "Unassigned"}</TableCell>
                  <TableCell className="text-sm max-w-32 truncate">{trip.pickup_address}</TableCell>
                  <TableCell className="text-sm max-w-32 truncate">{trip.delivery_address}</TableCell>
                  <TableCell>{formatCurrency(trip.revenue)}</TableCell>
                  <TableCell className="text-destructive">{formatCurrency(trip.platform_commission_amount)}</TableCell>
                  <TableCell className="text-success">{formatCurrency(trip.driver_net_amount)}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[trip.status] || ""}>{trip.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {trip.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => handleApprove(trip.id)}>
                        <CheckCircle className="w-4 h-4 text-success" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Side Hustle Trip</DialogTitle><DialogDescription>Record a new side hustle trip with revenue split.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Pickup Address</Label>
              <Input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Revenue (₦)</Label>
              <Input type="number" value={form.revenue} onChange={(e) => setForm({ ...form, revenue: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            {form.revenue > 0 && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between"><span>Revenue</span><span>{formatCurrency(form.revenue)}</span></div>
                <div className="flex justify-between text-destructive"><span>Platform (10%)</span><span>-{formatCurrency(form.revenue * 0.1)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Driver Net</span><span>{formatCurrency(form.revenue * 0.9)}</span></div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Trip
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default SideHustleEngine;
