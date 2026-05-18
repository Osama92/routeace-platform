import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  Building2,
  Plus,
  DollarSign,
  TrendingUp,
  Users,
  Key,
  Percent,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";

interface Reseller {
  id: string;
  reseller_name: string;
  reseller_code: string;
  commission_rate: number;
  status: string;
  api_access_tier: string;
  total_sales: number;
  total_commission: number;
  created_at: string;
}

interface ResellerSale {
  id: string;
  reseller_id: string;
  sale_type: string;
  sale_amount: number;
  commission_amount: number;
  routeace_share: number;
  sale_date: string;
  status: string;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0
  }).format(amount);
};

const WhiteLabelResellerPanel = () => {
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("resellers");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [salesDialogOpen, setSalesDialogOpen] = useState(false);
  
  const [form, setForm] = useState({
    reseller_name: "",
    reseller_code: "",
    commission_rate: "20",
    api_access_tier: "basic"
  });

  // Only Super Admin can access this
  if (!["super_admin", "admin"].includes(userRole as string)) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <p className="text-muted-foreground">Only Super Admins can access the White-Label Reseller Management.</p>
        </CardContent>
      </Card>
    );
  }

  // Fetch resellers
  const { data: resellers } = useQuery({
    queryKey: ["white-label-resellers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("white_label_resellers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Reseller[];
    }
  });

  // Fetch all sales
  const { data: allSales } = useQuery({
    queryKey: ["reseller-sales-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_sales")
        .select(`
          *,
          white_label_resellers (reseller_name)
        `)
        .order("sale_date", { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  // Create reseller
  const createResellerMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("white_label_resellers").insert({
        reseller_name: form.reseller_name,
        reseller_code: form.reseller_code.toUpperCase(),
        commission_rate: parseFloat(form.commission_rate),
        api_access_tier: form.api_access_tier,
        status: "active",
        onboarded_by: user?.id
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["white-label-resellers"] });
      toast({ title: "Success", description: "Reseller created successfully" });
      setAddDialogOpen(false);
      setForm({ reseller_name: "", reseller_code: "", commission_rate: "20", api_access_tier: "basic" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Summary stats
  const totalResellers = resellers?.length || 0;
  const activeResellers = resellers?.filter(r => r.status === "active").length || 0;
  const totalSalesAmount = resellers?.reduce((sum, r) => sum + (r.total_sales || 0), 0) || 0;
  const totalCommissions = resellers?.reduce((sum, r) => sum + (r.total_commission || 0), 0) || 0;
  const routeaceRevenue = allSales?.reduce((sum, s) => sum + (s.routeace_share || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge variant="default"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case "suspended": return <Badge variant="destructive">Suspended</Badge>;
      case "terminated": return <Badge variant="secondary">Terminated</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "enterprise": return <Badge className="bg-purple-500">Enterprise</Badge>;
      case "professional": return <Badge className="bg-blue-500">Professional</Badge>;
      default: return <Badge variant="outline">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Resellers</p>
              <p className="text-2xl font-bold">{totalResellers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <Users className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{activeResellers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <p className="text-xl font-bold">{formatCurrency(totalSalesAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Percent className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commissions Paid</p>
              <p className="text-xl font-bold">{formatCurrency(totalCommissions)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">RouteAce Revenue</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(routeaceRevenue)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Key className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium">White-Label API Reseller Model</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Resellers get their own branded portal and API access. RouteAce takes <strong>20% commission</strong> on all reseller revenue.
                Each reseller's data is completely isolated-no reseller can see another's data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="resellers">Resellers</TabsTrigger>
            <TabsTrigger value="sales">Sales & Revenue</TabsTrigger>
            <TabsTrigger value="pricing">Enterprise Pricing</TabsTrigger>
          </TabsList>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Reseller
          </Button>
        </div>

        <TabsContent value="resellers">
          <Card>
            <CardHeader>
              <CardTitle>Registered Resellers</CardTitle>
              <CardDescription>White-label partners with API access</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reseller</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resellers?.map((reseller) => (
                    <TableRow key={reseller.id}>
                      <TableCell className="font-medium">{reseller.reseller_name}</TableCell>
                      <TableCell className="font-mono">{reseller.reseller_code}</TableCell>
                      <TableCell>{getTierBadge(reseller.api_access_tier)}</TableCell>
                      <TableCell>{reseller.commission_rate}%</TableCell>
                      <TableCell>{formatCurrency(reseller.total_sales || 0)}</TableCell>
                      <TableCell>{getStatusBadge(reseller.status)}</TableCell>
                      <TableCell>{format(new Date(reseller.created_at), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))}
                  {(!resellers || resellers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No resellers yet. Click "Add Reseller" to onboard your first partner.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Sales & Revenue Tracking</CardTitle>
              <CardDescription>All sales through reseller channels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reseller</TableHead>
                    <TableHead>Sale Type</TableHead>
                    <TableHead>Sale Amount</TableHead>
                    <TableHead>Reseller Commission</TableHead>
                    <TableHead>RouteAce Share</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allSales?.map((sale: any) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.white_label_resellers?.reseller_name}</TableCell>
                      <TableCell className="capitalize">{sale.sale_type}</TableCell>
                      <TableCell>{formatCurrency(sale.sale_amount)}</TableCell>
                      <TableCell className="text-yellow-600">{formatCurrency(sale.commission_amount)}</TableCell>
                      <TableCell className="text-green-600 font-medium">{formatCurrency(sale.routeace_share)}</TableCell>
                      <TableCell>{format(new Date(sale.sale_date), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={sale.status === "paid" ? "default" : "secondary"}>{sale.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!allSales || allSales.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No sales recorded yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Basic
                  <Badge variant="outline">Free</Badge>
                </CardTitle>
                <CardDescription>For small logistics providers</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    API Access (100 calls/day)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    "Powered by RouteAce" branding
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Basic tracking portal
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-500/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Professional
                  <Badge className="bg-blue-500">₦5,000/mo</Badge>
                </CardTitle>
                <CardDescription>For growing logistics companies</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    API Access (1,000 calls/day)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Custom branding (with suffix)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Multi-user access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Zoho/QuickBooks sync
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-500/50 bg-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Enterprise
                  <Badge className="bg-purple-500">₦10,000/mo</Badge>
                </CardTitle>
                <CardDescription>For large-scale operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Unlimited API calls
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Full white-label (no suffix)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    WhatsApp + Web order ingestion
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    Priority support
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Reseller Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add White-Label Reseller</DialogTitle>
            <DialogDescription>Onboard a new logistics partner with API access</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reseller Name</Label>
              <Input
                value={form.reseller_name}
                onChange={(e) => setForm(prev => ({ ...prev, reseller_name: e.target.value }))}
                placeholder="e.g., DDhaul Logistics"
              />
            </div>
            <div className="space-y-2">
              <Label>Reseller Code (unique)</Label>
              <Input
                value={form.reseller_code}
                onChange={(e) => setForm(prev => ({ ...prev, reseller_code: e.target.value.toUpperCase() }))}
                placeholder="e.g., DDHAUL"
                className="font-mono uppercase"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input
                  type="number"
                  value={form.commission_rate}
                  onChange={(e) => setForm(prev => ({ ...prev, commission_rate: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">RouteAce takes remaining {100 - parseFloat(form.commission_rate || "0")}%</p>
              </div>
              <div className="space-y-2">
                <Label>API Access Tier</Label>
                <Select value={form.api_access_tier} onValueChange={(v) => setForm(prev => ({ ...prev, api_access_tier: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic (Free)</SelectItem>
                    <SelectItem value="professional">Professional (₦5,000)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (₦10,000)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => createResellerMutation.mutate()} disabled={!form.reseller_name || !form.reseller_code}>
              Create Reseller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WhiteLabelResellerPanel;
