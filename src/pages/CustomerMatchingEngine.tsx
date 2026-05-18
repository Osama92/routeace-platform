import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MapPin, Clock, Star, Truck, Zap, TrendingUp, Package, DollarSign,
  Navigation, Users, BarChart3, CheckCircle, AlertTriangle, Upload,
  Search, ArrowRight, RefreshCw, Globe, Building2, CreditCard
} from "lucide-react";

interface MockDriver {
  id: string;
  name: string;
  distance: number;
  rating: number;
  eta: number;
  vehicle: string;
  price: number;
  matchScore: number;
  verified: boolean;
}

// Live matches come from the smart-matching service; empty until backend wired.
const mockDriverMatches: MockDriver[] = [];


const CustomerMatchingEngine = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("match");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const { data: myDispatches } = useQuery({
    queryKey: ["customer-dispatches", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("dispatches")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const handleSearch = () => {
    if (!pickupAddress || !deliveryAddress) return;
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setShowMatches(true);
    }, 2000);
  };

  const dynamicPrice = (base: number) => {
    const surge = 1.0 + (Math.random() * 0.3);
    return Math.round(base * surge);
  };

  return (
    <DashboardLayout title="Smart Matching Engine" subtitle="AI-powered proximity matching for nearest available drivers">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="match">Book a Delivery</TabsTrigger>
          <TabsTrigger value="tracking">Live Tracking</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Upload</TabsTrigger>
          <TabsTrigger value="enterprise">Enterprise</TabsTrigger>
          <TabsTrigger value="analytics">Shipment Analytics</TabsTrigger>
        </TabsList>

        {/* Book a Delivery */}
        <TabsContent value="match" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" />Request a Delivery</CardTitle>
              <CardDescription>Our AI matches you with the nearest best-value driver in real time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pickup Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                    <Input className="pl-10" placeholder="Enter pickup address..." value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Delivery Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                    <Input className="pl-10" placeholder="Enter delivery address..." value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Category</Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger>
                      <Truck className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bike">Motorcycle (Up to 50kg)</SelectItem>
                      <SelectItem value="van">Van (Up to 1.5T)</SelectItem>
                      <SelectItem value="truck3t">Truck 3T</SelectItem>
                      <SelectItem value="truck10t">Truck 10T</SelectItem>
                      <SelectItem value="truck20t">Truck 20T</SelectItem>
                      <SelectItem value="truck40t">Articulated 40T</SelectItem>
                      <SelectItem value="fridge">Refrigerated Truck</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cargo Weight (kg)</Label>
                  <Input type="number" placeholder="e.g. 5000" value={cargoWeight} onChange={e => setCargoWeight(e.target.value)} />
                </div>
              </div>
              <Button onClick={handleSearch} disabled={isSearching || !pickupAddress || !deliveryAddress} className="w-full">
                {isSearching ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Finding nearest drivers...</> : <><Search className="w-4 h-4 mr-2" />Find Best Match</>}
              </Button>
            </CardContent>
          </Card>

          {/* AI Match Results */}
          {showMatches && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">AI Match Results - {mockDriverMatches.length} drivers found</h3>
              </div>
              {mockDriverMatches.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center text-sm text-muted-foreground">
                    No nearby drivers matched your request yet. As drivers come online in your pickup zone, live matches will appear here.
                  </CardContent>
                </Card>
              )}
              {mockDriverMatches.map((driver, i) => (
                <Card key={driver.id} className={`cursor-pointer transition-all border-2 ${selectedDriver === driver.id ? "border-primary" : "border-transparent hover:border-primary/30"}`}
                  onClick={() => setSelectedDriver(driver.id)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">{driver.name.charAt(0)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{driver.name}</p>
                            {driver.verified && <Badge className="bg-green-500/15 text-green-500 text-xs">Verified</Badge>}
                            {i === 0 && <Badge className="bg-primary/15 text-primary text-xs">Best Match</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{driver.vehicle} · {driver.distance} km away</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-bold text-yellow-500 flex items-center gap-1"><Star className="w-3 h-3" />{driver.rating}</p>
                          <p className="text-xs text-muted-foreground">Rating</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold"><Clock className="w-3 h-3 inline mr-1" />{driver.eta} min</p>
                          <p className="text-xs text-muted-foreground">ETA</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-primary">₦{dynamicPrice(driver.price).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Dynamic Price</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-500">{driver.matchScore}%</p>
                          <p className="text-xs text-muted-foreground">AI Match</p>
                        </div>
                      </div>
                    </div>
                    {selectedDriver === driver.id && (
                      <div className="mt-4 pt-4 border-t border-border flex gap-2">
                        <Button className="flex-1">
                          <CheckCircle className="w-4 h-4 mr-2" />Book This Driver
                        </Button>
                        <Button variant="outline">View Profile</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Live Tracking */}
        <TabsContent value="tracking">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Navigation className="w-5 h-5 text-primary" />Live Shipment Tracking</CardTitle>
              <CardDescription>Real-time updates on your active deliveries</CardDescription>
            </CardHeader>
            <CardContent>
              {myDispatches && myDispatches.length > 0 ? (
                <div className="space-y-4">
                  {myDispatches.slice(0, 5).map(dispatch => (
                    <div key={dispatch.id} className="p-4 rounded-lg bg-secondary/30 flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <p className="font-semibold">{dispatch.dispatch_number}</p>
                        <p className="text-sm text-muted-foreground">{dispatch.pickup_address} → {dispatch.delivery_address}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{dispatch.status}</Badge>
                        {dispatch.sla_status === "at_risk" && <Badge className="bg-yellow-500/15 text-yellow-500">⚠ SLA Risk</Badge>}
                        <Button size="sm" variant="outline"><MapPin className="w-4 h-4 mr-1" />Track</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No active shipments to track</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SLA Visibility */}
          <Card className="mt-4">
            <CardHeader><CardTitle>SLA Guarantee Status</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { route: "Lagos → Abuja", sla: "48h", remaining: "22h", pct: 54, status: "on_track" },
                  { route: "Port Harcourt → Kano", sla: "72h", remaining: "6h", pct: 92, status: "at_risk" },
                ].map(item => (
                  <div key={item.route} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.route}</span>
                      <span className={item.status === "at_risk" ? "text-yellow-500 font-medium" : "text-green-500 font-medium"}>
                        {item.remaining} remaining / {item.sla} SLA
                      </span>
                    </div>
                    <Progress value={item.pct} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Upload */}
        <TabsContent value="bulk">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" />Bulk Order Upload</CardTitle>
              <CardDescription>Upload multiple orders via Excel or API injection for enterprise customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium mb-2">Drop your Excel / CSV file here</p>
                <p className="text-sm text-muted-foreground mb-4">Supports .xlsx, .csv - max 10,000 orders per upload</p>
                <Button variant="outline">Browse Files</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Template Download", desc: "Standard order template", icon: Package },
                  { label: "API Injection", desc: "POST /api/orders/bulk", icon: Globe },
                  { label: "Multi-Drop Bundle", desc: "Auto-route optimization", icon: Navigation },
                ].map(item => (
                  <Card key={item.label} className="cursor-pointer hover:border-primary/50 transition-colors">
                    <CardContent className="p-4 text-center">
                      <item.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
                <p className="text-sm font-medium">Multi-Drop Bulk Discount</p>
                <div className="space-y-1">
                  {[{ drops: "5–10 drops", discount: "5% off" }, { drops: "11–25 drops", discount: "10% off" }, { drops: "26+ drops", discount: "15% off" }].map(d => (
                    <div key={d.drops} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{d.drops}</span>
                      <span className="text-green-500 font-medium">{d.discount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Enterprise Features */}
        <TabsContent value="enterprise" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" />Department Billing</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { dept: "Sales & Distribution", orders: 142, spend: "₦4.2M" },
                  { dept: "Warehouse Operations", orders: 89, spend: "₦2.8M" },
                  { dept: "E-commerce Fulfilment", orders: 217, spend: "₦6.1M" },
                ].map(d => (
                  <div key={d.dept} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm">{d.dept}</p>
                      <p className="text-xs text-muted-foreground">{d.orders} orders this month</p>
                    </div>
                    <span className="font-bold text-primary">{d.spend}</span>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Manage Cost Centers</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-primary" />Approval Workflows</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Orders < ₦50K", approver: "Auto-approved", status: "active" },
                  { label: "Orders ₦50K–₦500K", approver: "Manager approval", status: "active" },
                  { label: "Orders > ₦500K", approver: "Director + Finance", status: "active" },
                ].map(rule => (
                  <div key={rule.label} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm">{rule.label}</p>
                      <p className="text-xs text-muted-foreground">{rule.approver}</p>
                    </div>
                    <Badge className="bg-green-500/15 text-green-500">{rule.status}</Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full">Configure Rules</Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" />Payment & SLA Terms</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Credit Limit", value: "₦25M" },
                  { label: "Payment Terms", value: "Net 30" },
                  { label: "Active SLA Zones", value: "6" },
                  { label: "Avg Breach Penalty", value: "₦50K/day" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-lg bg-secondary/30 text-center">
                    <p className="text-xl font-bold text-primary">{item.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Shipment Analytics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "On-Time Delivery Rate", value: 87, color: "bg-green-500" },
                  { label: "SLA Compliance", value: 92, color: "bg-blue-500" },
                  { label: "Order Fulfilment Rate", value: 96, color: "bg-primary" },
                  { label: "Cost Efficiency Score", value: 78, color: "bg-yellow-500" },
                ].map(metric => (
                  <div key={metric.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{metric.label}</span>
                      <span className="font-bold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Spend Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { period: "This Month", amount: "₦13.1M", trend: "+12%" },
                  { period: "Last Month", amount: "₦11.7M", trend: "+5%" },
                  { period: "YTD", amount: "₦94.3M", trend: "+18%" },
                ].map(item => (
                  <div key={item.period} className="flex justify-between items-center p-3 rounded-lg bg-secondary/30">
                    <div>
                      <p className="font-medium text-sm">{item.period}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{item.amount}</p>
                      <p className="text-xs text-green-500">{item.trend} vs prev</p>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full mt-2">
                  <ArrowRight className="w-4 h-4 mr-2" />Export Full Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CustomerMatchingEngine;
