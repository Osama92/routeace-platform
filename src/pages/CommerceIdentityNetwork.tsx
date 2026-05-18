import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Users, Globe, CheckCircle, AlertTriangle, Key,
  Building2, Truck, FileCheck, Lock, Network, Star, BarChart3,
  Plus, ArrowLeft, Loader2,
} from "lucide-react";

const TRUST_COMPONENTS = [
  { label: "Delivery Reliability", weight: "25%", icon: Truck },
  { label: "Payment Performance", weight: "25%", icon: BarChart3 },
  { label: "Contract Fulfillment", weight: "20%", icon: FileCheck },
  { label: "Customer Ratings", weight: "15%", icon: Star },
  { label: "Platform Activity", weight: "15%", icon: Network },
];

const ROLES = [
  { role: "SuperAdmin", access: "Full platform infrastructure", level: "Platform" },
  { role: "Platform Admin", access: "Platform management & monitoring", level: "Platform" },
  { role: "Enterprise Admin", access: "Company-wide data & settings", level: "Organization" },
  { role: "Operations Manager", access: "Dispatch, fleet, driver management", level: "Organization" },
  { role: "Finance Manager", access: "Invoices, payments, fleet CCC", level: "Organization" },
  { role: "Dispatcher", access: "Route planning, delivery monitoring", level: "Operations" },
  { role: "Driver", access: "Delivery assignments, POD", level: "Execution" },
  { role: "Warehouse Manager", access: "Stock, shipments, inventory", level: "Operations" },
  { role: "Distributor Admin", access: "Distribution operations & exchange", level: "Organization" },
  { role: "Retailer Admin", access: "Order tracking, invoices", level: "Organization" },
];

const VERIFICATION_STEPS = [
  { step: "Business Registration", desc: "CAC or equivalent registration verification", icon: Building2 },
  { step: "Document Upload", desc: "Business license, tax clearance, insurance", icon: FileCheck },
  { step: "Bank Verification", desc: "Bank account ownership confirmation", icon: Shield },
  { step: "Operational Verification", desc: "Fleet inspection, warehouse audit", icon: CheckCircle },
];

export default function CommerceIdentityNetwork() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newIdentity, setNewIdentity] = useState({
    business_name: "", entity_type: "manufacturer", country_code: "NG",
    registration_number: "", tax_id: "",
  });

  // Fetch real commerce identities
  const { data: identities = [], isLoading } = useQuery({
    queryKey: ["commerce-identities"],
    queryFn: async () => {
      const { data, error } = await supabase.from("commerce_identities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const avgTrustScore = identities.length > 0
    ? (identities.reduce((s, i) => s + (i.trust_score || 0), 0) / identities.length).toFixed(1)
    : "0";
  const verifiedCount = identities.filter(i => i.verification_level === "verified").length;

  const handleCreate = async () => {
    if (!newIdentity.business_name) {
      toast({ title: "Missing fields", description: "Business name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    const rcid = `RCID-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("commerce_identities").insert([{
      rcid,
      business_name: newIdentity.business_name,
      entity_type: newIdentity.entity_type,
      country_code: newIdentity.country_code,
      registration_number: newIdentity.registration_number || null,
      tax_id: newIdentity.tax_id || null,
      trust_score: 50,
      trust_grade: "C",
      verification_level: "pending",
      is_active: true,
    }]);
    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Identity created", description: `${newIdentity.business_name} registered as ${rcid}` });
    setCreateOpen(false);
    setNewIdentity({ business_name: "", entity_type: "manufacturer", country_code: "NG", registration_number: "", tax_id: "" });
    queryClient.invalidateQueries({ queryKey: ["commerce-identities"] });
  };

  return (
    <DashboardLayout title="Commerce Identity & Trust Network" subtitle="Unified identity, access control, and trust infrastructure">
      {/* Back + Create */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Create Commerce Identity</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register Commerce Identity (RCID)</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div><Label>Business Name *</Label><Input value={newIdentity.business_name} onChange={e => setNewIdentity(p => ({ ...p, business_name: e.target.value }))} placeholder="Acme Distribution Ltd" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Entity Type</Label>
                  <Select value={newIdentity.entity_type} onValueChange={v => setNewIdentity(p => ({ ...p, entity_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manufacturer">Manufacturer</SelectItem>
                      <SelectItem value="distributor">Distributor</SelectItem>
                      <SelectItem value="retailer">Retailer</SelectItem>
                      <SelectItem value="logistics">Logistics Provider</SelectItem>
                      <SelectItem value="exporter">Exporter</SelectItem>
                      <SelectItem value="importer">Importer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Country</Label>
                  <Select value={newIdentity.country_code} onValueChange={v => setNewIdentity(p => ({ ...p, country_code: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NG">Nigeria</SelectItem>
                      <SelectItem value="GH">Ghana</SelectItem>
                      <SelectItem value="KE">Kenya</SelectItem>
                      <SelectItem value="ZA">South Africa</SelectItem>
                      <SelectItem value="TZ">Tanzania</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Registration No. (CAC)</Label><Input value={newIdentity.registration_number} onChange={e => setNewIdentity(p => ({ ...p, registration_number: e.target.value }))} placeholder="RC-123456" /></div>
                <div><Label>Tax ID (TIN)</Label><Input value={newIdentity.tax_id} onChange={e => setNewIdentity(p => ({ ...p, tax_id: e.target.value }))} placeholder="TIN-000000" /></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />} Register Identity
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Identities", value: identities.length.toString(), icon: Shield },
          { label: "Trust Score Avg", value: avgTrustScore, icon: Star },
          { label: "Verified", value: verifiedCount.toString(), icon: CheckCircle },
          { label: "Active Roles", value: "10", icon: Users },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><s.icon className="w-5 h-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="identities" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="identities">Registered Identities</TabsTrigger>
          <TabsTrigger value="trust">Trust Scoring</TabsTrigger>
          <TabsTrigger value="permissions">Permission Matrix</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="cross-os">Cross-OS Access</TabsTrigger>
          <TabsTrigger value="api-auth">API Authentication</TabsTrigger>
        </TabsList>

        {/* Registered Identities */}
        <TabsContent value="identities">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Commerce Identities (RCID Registry)</CardTitle>
              <CardDescription>All registered commerce participants in the network</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : identities.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm mb-2">No commerce identities registered yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Register your first business identity to start building the trust network</p>
                  <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" /> Register First Identity</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {identities.map(id => (
                    <div key={id.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10"><Building2 className="w-4 h-4 text-primary" /></div>
                        <div>
                          <p className="font-medium text-sm">{id.business_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{id.rcid} • {id.entity_type} • {id.country_code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold">{id.trust_score || 0}</p>
                          <p className="text-[10px] text-muted-foreground">Trust Score</p>
                        </div>
                        <Badge variant={id.verification_level === "verified" ? "default" : "secondary"}>
                          {id.verification_level || "pending"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Trust Scoring */}
        <TabsContent value="trust">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribution Trust Score (DTS)</CardTitle>
              <CardDescription>Multi-signal trust scoring based on operational performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {TRUST_COMPONENTS.map(t => (
                  <div key={t.label} className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-muted"><t.icon className="w-4 h-4 text-primary" /></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{t.label}</span>
                        <span className="text-xs text-muted-foreground">Weight: {t.weight}</span>
                      </div>
                      <Progress value={identities.length > 0 ? Math.min(100, Math.max(0, parseInt(t.weight, 10))) : 0} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Permission Matrix */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role-Based Access Control (RBAC)</CardTitle>
              <CardDescription>10-role permission system across all platform modules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ROLES.map(r => (
                  <div key={r.role} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Users className="w-4 h-4 text-primary" />
                      <span className="font-medium text-sm">{r.role}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{r.access}</span>
                      <Badge variant="outline">{r.level}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Verification */}
        <TabsContent value="verification">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Identity Verification Layers</CardTitle>
              <CardDescription>Multi-step verification for business credibility</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {VERIFICATION_STEPS.map((v, i) => (
                  <div key={v.step} className="flex items-start gap-3 p-4 rounded-lg border">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{i + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{v.step}</p>
                      <p className="text-xs text-muted-foreground">{v.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cross-OS */}
        <TabsContent value="cross-os">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cross-OS Identity Infrastructure</CardTitle>
              <CardDescription>Single RCID works across all RouteAce operating systems</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium mb-2">Multi-Tenant Data Isolation</p>
                  <p className="text-xs text-muted-foreground">Companies can only access their own operational data. Cross-tenant access is strictly prohibited and logged.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["FMCG ↔ Logistics", "Pharma ↔ Trade Finance", "Agri ↔ Distribution Exchange", "All OS ↔ Embedded APIs"].map(flow => (
                    <div key={flow} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                      <Lock className="w-4 h-4 text-primary" />
                      <span className="text-sm">{flow}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Auth */}
        <TabsContent value="api-auth">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">API Authentication</CardTitle>
              <CardDescription>Secure external system integration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { method: "API Keys", desc: "Secure key-based authentication with scoped permissions", icon: Key },
                  { method: "OAuth 2.0", desc: "Industry-standard OAuth authentication flow", icon: Shield },
                  { method: "Permission Scopes", desc: "Granular API access control per endpoint", icon: Lock },
                ].map(m => (
                  <div key={m.method} className="p-4 rounded-lg border text-center space-y-2">
                    <m.icon className="w-6 h-6 mx-auto text-primary" />
                    <p className="font-semibold text-sm">{m.method}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
