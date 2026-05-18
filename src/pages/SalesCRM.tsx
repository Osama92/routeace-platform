import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Users, Target, DollarSign, Brain, CheckCircle, Clock, Truck,
  Phone, Mail, Building2, ArrowUpRight, Star, Filter,
  UserPlus, AlertTriangle, Zap, TrendingUp, Calendar,
  Eye, BarChart3, Globe, Sparkles, ArrowLeft, Plus,
} from "lucide-react";

const pipelineStages = [
  { stage: "New Lead", count: 0, value: "$0", color: "bg-blue-500" },
  { stage: "Contacted", count: 0, value: "$0", color: "bg-indigo-500" },
  { stage: "Qualified", count: 0, value: "$0", color: "bg-violet-500" },
  { stage: "Demo Done", count: 0, value: "$0", color: "bg-purple-500" },
  { stage: "Proposal Sent", count: 0, value: "$0", color: "bg-pink-500" },
  { stage: "Negotiation", count: 0, value: "$0", color: "bg-rose-500" },
  { stage: "Closed Won", count: 0, value: "$0", color: "bg-emerald-500" },
];

const aiRecommendations = [
  { priority: "High", company: "New Leads", reason: "Add your first leads to the CRM to start getting AI-powered recommendations for outreach timing and deal strategy.", action: "Add Lead" },
  { priority: "Medium", company: "Pipeline", reason: "Build your sales pipeline by importing contacts from your customer database or adding leads manually.", action: "Import" },
];

const fade = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

const SalesCRM = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    company: "", contact: "", title: "", email: "", phone: "",
    stage: "new_lead", value: "", industry: "", notes: "",
  });

  // Fetch real customers as leads source
  const { data: customers = [] } = useQuery({
    queryKey: ["crm-customers"],
    queryFn: async () => {
      const { data } = await supabase.from("customers")
        .select("id, company_name, contact_name, email, phone, city, country, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  // Fetch dispatches for revenue calculation
  const { data: dispatches = [] } = useQuery({
    queryKey: ["crm-dispatches"],
    queryFn: async () => {
      const { data } = await supabase.from("dispatches")
        .select("id, status, cost, customer_id, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      return data || [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["crm-invoices"],
    queryFn: async () => {
      const { data } = await supabase.from("invoices")
        .select("id, total_amount, status, customer_id")
        .limit(100);
      return data || [];
    },
  });

  const totalRevenue = invoices.reduce((s, inv) => s + (inv.total_amount || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "paid");
  const activeDeals = customers.length;

  const handleCreateLead = async () => {
    if (!newLead.company || !newLead.contact || !newLead.email) {
      toast({ title: "Missing fields", description: "Company, contact, and email are required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("customers").insert([{
      company_name: newLead.company,
      contact_name: newLead.contact,
      email: newLead.email,
      phone: newLead.phone || "N/A",
      city: newLead.industry,
      country: "Nigeria",
    }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Lead created", description: `${newLead.company} added to CRM` });
    setCreateOpen(false);
    setNewLead({ company: "", contact: "", title: "", email: "", phone: "", stage: "new_lead", value: "", industry: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: ["crm-customers"] });
  };

  return (
    <DashboardLayout title="Sales CRM" subtitle="Lead pipeline, company intelligence, and AI-powered sales recommendations">
      <div className="space-y-6">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Lead</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company *</Label><Input value={newLead.company} onChange={e => setNewLead(p => ({ ...p, company: e.target.value }))} placeholder="Acme Ltd" /></div>
                  <div><Label>Contact Name *</Label><Input value={newLead.contact} onChange={e => setNewLead(p => ({ ...p, contact: e.target.value }))} placeholder="John Doe" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email *</Label><Input type="email" value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} placeholder="john@acme.com" /></div>
                  <div><Label>Phone</Label><Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} placeholder="+234..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Industry</Label><Input value={newLead.industry} onChange={e => setNewLead(p => ({ ...p, industry: e.target.value }))} placeholder="FMCG, Pharma..." /></div>
                  <div><Label>Deal Value</Label><Input value={newLead.value} onChange={e => setNewLead(p => ({ ...p, value: e.target.value }))} placeholder="$50,000" /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} placeholder="Additional context..." rows={2} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateLead}>Create Lead</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: "Total Customers", value: customers.length.toString(), icon: Users },
            { label: "Active Deals", value: activeDeals.toString(), icon: Target },
            { label: "Revenue (Invoiced)", value: `₦${(totalRevenue / 1000).toFixed(0)}K`, icon: DollarSign },
            { label: "Paid Invoices", value: paidInvoices.length.toString(), icon: CheckCircle },
            { label: "Total Dispatches", value: dispatches.length.toString(), icon: Truck },
            { label: "Avg Deal Cycle", value: "-", icon: Clock },
          ].map((k, i) => (
            <motion.div key={k.label} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.04 }}>
              <Card>
                <CardContent className="p-3">
                  <k.icon className="w-4 h-4 text-primary mb-1" />
                  <p className="text-xl font-bold">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground">{k.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="leads" className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="leads">Customer Pipeline</TabsTrigger>
            <TabsTrigger value="intelligence">Company Intelligence</TabsTrigger>
            <TabsTrigger value="ai">AI Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="leads">
            <Card>
              {customers.length === 0 ? (
                <CardContent className="py-12 text-center">
                  <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-muted-foreground text-sm mb-2">No leads yet</p>
                  <p className="text-xs text-muted-foreground mb-4">Add your first lead to start building your sales pipeline</p>
                  <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add First Lead</Button>
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Dispatches</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map(c => {
                      const custDispatches = dispatches.filter(d => d.customer_id === c.id);
                      const custRevenue = invoices.filter(i => i.customer_id === c.id).reduce((s, i) => s + (i.total_amount || 0), 0);
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/30">
                          <TableCell>
                            <p className="font-semibold text-sm">{c.company_name}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</p>
                          </TableCell>
                          <TableCell className="text-sm">{c.contact_name}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                          <TableCell className="text-xs">{c.city || c.country || "-"}</TableCell>
                          <TableCell className="text-center">{custDispatches.length}</TableCell>
                          <TableCell className="text-right font-bold text-primary">₦{(custRevenue / 1000).toFixed(0)}K</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-3">
            <p className="text-sm text-muted-foreground">Customer profiles with dispatch history and revenue intelligence</p>
            {customers.slice(0, 5).map((c, i) => {
              const custDispatches = dispatches.filter(d => d.customer_id === c.id);
              const custRevenue = invoices.filter(inv => inv.customer_id === c.id).reduce((s, inv) => s + (inv.total_amount || 0), 0);
              return (
                <motion.div key={c.id} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-lg">{c.company_name}</p>
                          <p className="text-xs text-muted-foreground">{c.contact_name} • {c.email}</p>
                        </div>
                        <Badge variant="outline">{custDispatches.length} dispatches</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Location</p>
                          <p className="text-sm font-medium">{c.city || c.country || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
                          <p className="text-sm font-medium">₦{(custRevenue / 1000).toFixed(0)}K</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Engagement</p>
                          <div className="flex items-center gap-2">
                            <Progress value={Math.min(100, custDispatches.length * 20)} className="flex-1 h-2" />
                            <span className="text-sm font-bold">{Math.min(100, custDispatches.length * 20)}%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {customers.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Add customers to see company intelligence</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ai" className="space-y-3">
            <p className="text-sm text-muted-foreground">AI-powered next-best-action recommendations</p>
            {aiRecommendations.map((r, i) => (
              <motion.div key={r.company} variants={fade} initial="hidden" animate="show" transition={{ delay: i * 0.05 }}>
                <Card className={`border-l-4 ${r.priority === "High" ? "border-l-rose-500" : "border-l-amber-500"}`}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <Brain className={`w-5 h-5 mt-0.5 shrink-0 ${r.priority === "High" ? "text-rose-500" : "text-amber-500"}`} />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold">{r.company}</p>
                          <Badge className={r.priority === "High" ? "bg-rose-500/15 text-rose-600" : "bg-amber-500/15 text-amber-600"}>{r.priority}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{r.reason}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="shrink-0 ml-4" onClick={() => setCreateOpen(true)}>
                      <Zap className="w-3 h-3 mr-1" /> {r.action}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SalesCRM;
