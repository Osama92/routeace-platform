import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import {
  Package, Truck, Warehouse, Globe, TrendingUp, ArrowRight,
  Search, MapPin, ShieldCheck, Zap, BarChart3, Users,
  ArrowUpRight, CheckCircle, Clock, DollarSign, Filter, Plus, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DistributionExchange = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [supplyListings, setSupplyListings] = useState<any[]>([]);
  const [demandListings, setDemandListings] = useState<any[]>([]);
  const [warehouseListings, setWarehouseListings] = useState<any[]>([]);
  const [logisticsListings, setLogisticsListings] = useState<any[]>([]);
  const [tradeMatches, setTradeMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSupplyDialog, setShowSupplyDialog] = useState(false);
  const [showDemandDialog, setShowDemandDialog] = useState(false);
  const [activeTab, setActiveTab] = useState("supply");
  const [submitting, setSubmitting] = useState(false);

  // Aggregate stats from real data
  const [stats, setStats] = useState({
    supplyCount: 0, demandCount: 0, matchedToday: 0,
    logisticsCount: 0, warehouseSqm: 0, exchangeValue: 0,
  });

  // Form state
  const [supplyForm, setSupplyForm] = useState({
    commodity: "", location: "", quantity_tonnes: "", packaging: "",
    certification: "", price_per_tonne: "", currency: "USD",
  });
  const [demandForm, setDemandForm] = useState({
    commodity: "", buyer_name: "", destination: "", quantity_tonnes: "",
    delivery_window: "",
  });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [supply, demand, warehouse, logistics, matches] = await Promise.all([
      supabase.from("exchange_supply_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("exchange_demand_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("exchange_warehouse_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("exchange_logistics_listings").select("*").order("created_at", { ascending: false }),
      supabase.from("exchange_trade_matches").select("*, exchange_supply_listings(commodity, location, quantity_tonnes), exchange_demand_listings(commodity, buyer_name, destination, quantity_tonnes)").order("created_at", { ascending: false }),
    ]);
    setSupplyListings(supply.data || []);
    setDemandListings(demand.data || []);
    setWarehouseListings(warehouse.data || []);
    setLogisticsListings(logistics.data || []);
    setTradeMatches(matches.data || []);

    // Compute real stats
    const todayMatches = (matches.data || []).filter((m: any) => new Date(m.created_at).toDateString() === new Date().toDateString());
    setStats({
      supplyCount: (supply.data || []).length,
      demandCount: (demand.data || []).length,
      matchedToday: todayMatches.length,
      logisticsCount: (logistics.data || []).length,
      warehouseSqm: (warehouse.data || []).length,
      exchangeValue: (supply.data || []).reduce((s: number, l: any) => s + ((l.price_per_tonne || 0) * (l.quantity_tonnes || 0)), 0),
    });
    setLoading(false);
  };

  const submitSupply = async () => {
    if (!supplyForm.commodity || !supplyForm.location || !supplyForm.quantity_tonnes) {
      toast({ title: "Missing fields", description: "Commodity, location, and quantity are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("exchange_supply_listings").insert({
      commodity: supplyForm.commodity,
      location: supplyForm.location,
      quantity_tonnes: parseFloat(supplyForm.quantity_tonnes),
      packaging: supplyForm.packaging || null,
      certification: supplyForm.certification || null,
      price_per_tonne: supplyForm.price_per_tonne ? parseFloat(supplyForm.price_per_tonne) : null,
      currency: supplyForm.currency,
      listed_by: user?.id,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Supply Listing Created", description: "Your listing is pending verification" });
      setShowSupplyDialog(false);
      setSupplyForm({ commodity: "", location: "", quantity_tonnes: "", packaging: "", certification: "", price_per_tonne: "", currency: "USD" });
      fetchAll();
    }
  };

  const submitDemand = async () => {
    if (!demandForm.commodity || !demandForm.buyer_name || !demandForm.destination || !demandForm.quantity_tonnes) {
      toast({ title: "Missing fields", description: "All fields are required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("exchange_demand_listings").insert({
      commodity: demandForm.commodity,
      buyer_name: demandForm.buyer_name,
      destination: demandForm.destination,
      quantity_tonnes: parseFloat(demandForm.quantity_tonnes),
      delivery_window: demandForm.delivery_window || null,
      listed_by: user?.id,
      status: "open",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Demand Listing Created" });
      setShowDemandDialog(false);
      setDemandForm({ commodity: "", buyer_name: "", destination: "", quantity_tonnes: "", delivery_window: "" });
      fetchAll();
    }
  };

  const filteredSupply = supplyListings.filter(s =>
    !searchQuery || s.commodity?.toLowerCase().includes(searchQuery.toLowerCase()) || s.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const filteredDemand = demandListings.filter(d =>
    !searchQuery || d.commodity?.toLowerCase().includes(searchQuery.toLowerCase()) || d.buyer_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (val: number) => val >= 1000000 ? `$${(val / 1000000).toFixed(1)}M` : val >= 1000 ? `$${(val / 1000).toFixed(0)}K` : `$${val}`;

  // Build weekly match chart from real data
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const matchData = days.map((day, i) => {
    const count = tradeMatches.filter((m: any) => new Date(m.created_at).getDay() === (i + 1) % 7).length;
    return { day, matches: count };
  });

  return (
    <DashboardLayout title="Distribution Exchange" subtitle="Africa's Supply–Demand Clearing Network">
      <div className="space-y-6">
        {/* Live Activity Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Supply Listings", value: stats.supplyCount.toLocaleString(), icon: Package, color: "text-emerald-500" },
            { label: "Demand Orders", value: stats.demandCount.toLocaleString(), icon: ShieldCheck, color: "text-blue-500" },
            { label: "Matched Today", value: stats.matchedToday.toLocaleString(), icon: Zap, color: "text-amber-500" },
            { label: "Logistics Capacity", value: `${stats.logisticsCount} routes`, icon: Truck, color: "text-purple-500" },
            { label: "Warehouses", value: `${stats.warehouseSqm} listed`, icon: Warehouse, color: "text-teal-500" },
            { label: "Exchange Value", value: formatCurrency(stats.exchangeValue), icon: DollarSign, color: "text-rose-500" },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card/80 backdrop-blur border-border/50">
              <CardContent className="p-3 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search + Actions */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search commodities, routes, warehouses..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <Dialog open={showSupplyDialog} onOpenChange={setShowSupplyDialog}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 text-white hover:bg-emerald-700"><Plus className="w-4 h-4 mr-1" />Post Supply</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post Supply Listing</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Commodity (e.g. Sesame Seeds)" value={supplyForm.commodity} onChange={e => setSupplyForm(p => ({ ...p, commodity: e.target.value }))} />
                <Input placeholder="Location (e.g. Kano, Nigeria)" value={supplyForm.location} onChange={e => setSupplyForm(p => ({ ...p, location: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Quantity (tonnes)" value={supplyForm.quantity_tonnes} onChange={e => setSupplyForm(p => ({ ...p, quantity_tonnes: e.target.value }))} />
                  <Input type="number" placeholder="Price per tonne ($)" value={supplyForm.price_per_tonne} onChange={e => setSupplyForm(p => ({ ...p, price_per_tonne: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Packaging (e.g. Bagged)" value={supplyForm.packaging} onChange={e => setSupplyForm(p => ({ ...p, packaging: e.target.value }))} />
                  <Input placeholder="Certification (e.g. Organic)" value={supplyForm.certification} onChange={e => setSupplyForm(p => ({ ...p, certification: e.target.value }))} />
                </div>
                <Button onClick={submitSupply} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Supply Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={showDemandDialog} onOpenChange={setShowDemandDialog}>
            <DialogTrigger asChild>
              <Button variant="outline"><Plus className="w-4 h-4 mr-1" />Post Demand</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Post Demand Listing</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Commodity" value={demandForm.commodity} onChange={e => setDemandForm(p => ({ ...p, commodity: e.target.value }))} />
                <Input placeholder="Buyer Name" value={demandForm.buyer_name} onChange={e => setDemandForm(p => ({ ...p, buyer_name: e.target.value }))} />
                <Input placeholder="Destination (e.g. Rotterdam, NL)" value={demandForm.destination} onChange={e => setDemandForm(p => ({ ...p, destination: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="number" placeholder="Quantity (tonnes)" value={demandForm.quantity_tonnes} onChange={e => setDemandForm(p => ({ ...p, quantity_tonnes: e.target.value }))} />
                  <Input placeholder="Delivery Window" value={demandForm.delivery_window} onChange={e => setDemandForm(p => ({ ...p, delivery_window: e.target.value }))} />
                </div>
                <Button onClick={submitDemand} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Demand Listing
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="supply">Supply ({stats.supplyCount})</TabsTrigger>
            <TabsTrigger value="demand">Demand ({stats.demandCount})</TabsTrigger>
            <TabsTrigger value="logistics">Logistics</TabsTrigger>
            <TabsTrigger value="warehouse">Warehouse</TabsTrigger>
            <TabsTrigger value="matched">Matched</TabsTrigger>
          </TabsList>

          <TabsContent value="supply" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredSupply.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No supply listings yet</p>
                <p className="text-sm">Click "Post Supply" to create the first listing</p>
              </CardContent></Card>
            ) : filteredSupply.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.commodity}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" /> {item.location} · {item.quantity_tonnes}t
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      {item.certification && <Badge variant="outline">{item.certification}</Badge>}
                      <Badge className={item.status === "verified" ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}>
                        {item.status === "verified" ? <><CheckCircle className="w-3 h-3 mr-1" /> Verified</> : <><Clock className="w-3 h-3 mr-1" /> {item.status}</>}
                      </Badge>
                      {item.price_per_tonne && <span className="font-bold text-sm">${item.price_per_tonne}/t</span>}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="demand" className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredDemand.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No demand listings yet</p>
                <p className="text-sm">Click "Post Demand" to create the first buyer request</p>
              </CardContent></Card>
            ) : filteredDemand.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:border-primary/30 transition-all cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.commodity} - {item.quantity_tonnes}t</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Users className="w-3 h-3" /> {item.buyer_name} · <MapPin className="w-3 h-3" /> {item.destination}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.delivery_window && <Badge variant="outline">{item.delivery_window}</Badge>}
                      {item.is_verified && <Badge className="bg-emerald-500/15 text-emerald-600"><ShieldCheck className="w-3 h-3 mr-1" /> Verified</Badge>}
                      <Button size="sm">Match Supply</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="logistics" className="space-y-3">
            {logisticsListings.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No logistics capacity listed</p>
                <p className="text-sm">Logistics operators can post available routes and capacity</p>
              </CardContent></Card>
            ) : logisticsListings.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Truck className="w-5 h-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.route}</p>
                        <p className="text-sm text-muted-foreground">{item.operator_name} · {item.vehicle_type} · {item.capacity_tonnes}t</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {item.departure_schedule && <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {item.departure_schedule}</Badge>}
                      <Button size="sm" variant="outline">Book</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="warehouse" className="space-y-3">
            {warehouseListings.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                <Warehouse className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No warehouse listings available</p>
                <p className="text-sm">Warehouse operators can list available storage capacity</p>
              </CardContent></Card>
            ) : warehouseListings.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="hover:border-primary/30 transition-all">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                        <Warehouse className="w-5 h-5 text-teal-500" />
                      </div>
                      <div>
                        <p className="font-semibold">{item.location}</p>
                        <p className="text-sm text-muted-foreground">{item.capacity_description} · {item.warehouse_type} · {item.rate_description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-20">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${(item.utilization_percent || 0) > 80 ? "bg-rose-500" : (item.utilization_percent || 0) > 60 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${item.utilization_percent || 0}%` }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-center mt-0.5">{item.utilization_percent || 0}% used</p>
                      </div>
                      <Button size="sm" variant="outline">Reserve</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          <TabsContent value="matched" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Trade Matches This Week</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={matchData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip />
                    <Bar dataKey="matches" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {tradeMatches.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                <Zap className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>No trade matches yet. Matches are created when supply meets demand.</p>
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tradeMatches.map((match: any) => (
                  <Card key={match.id} className="border-primary/20">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-muted-foreground">Supply</p>
                          <p className="text-sm font-medium">
                            {match.exchange_supply_listings?.commodity} - {match.exchange_supply_listings?.quantity_tonnes}t ({match.exchange_supply_listings?.location})
                          </p>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-primary" />
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Demand</p>
                          <p className="text-sm font-medium">
                            {match.exchange_demand_listings?.buyer_name} - {match.exchange_demand_listings?.quantity_tonnes}t
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${match.progress_percent || 0}%` }} />
                        </div>
                        <Badge variant="outline" className="text-[10px]">{match.match_status} - {match.progress_percent || 0}%</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default DistributionExchange;
