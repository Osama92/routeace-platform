import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSalesOS } from "@/hooks/useSalesOS";
import { UserPlus, Search, Filter, ArrowLeft, Plus, Phone, Mail, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stageColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-indigo-100 text-indigo-800",
  qualified: "bg-violet-100 text-violet-800",
  converted: "bg-emerald-100 text-emerald-800",
  lost: "bg-red-100 text-red-800",
};

const SalesLeads = () => {
  const navigate = useNavigate();
  const { leads, createLead, loading } = useSalesOS();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [form, setForm] = useState({
    company_name: "", contact_name: "", contact_title: "", email: "", phone: "",
    source: "manual", stage: "new", expected_value: "", territory: "", industry: "", notes: "",
  });

  const filtered = leads.filter(l => {
    const matchSearch = !search || l.company_name.toLowerCase().includes(search.toLowerCase()) || l.contact_name.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "all" || l.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const handleCreate = async () => {
    if (!form.company_name || !form.contact_name) return;
    await createLead({
      ...form,
      expected_value: form.expected_value ? parseFloat(form.expected_value) : 0,
    } as any);
    setOpen(false);
    setForm({ company_name: "", contact_name: "", contact_title: "", email: "", phone: "", source: "manual", stage: "new", expected_value: "", territory: "", industry: "", notes: "" });
  };

  const stageCounts = {
    all: leads.length,
    new: leads.filter(l => l.stage === "new").length,
    contacted: leads.filter(l => l.stage === "contacted").length,
    qualified: leads.filter(l => l.stage === "qualified").length,
    converted: leads.filter(l => l.stage === "converted").length,
    lost: leads.filter(l => l.stage === "lost").length,
  };

  return (
    <DashboardLayout title="Lead Management" subtitle="Capture, qualify, and convert leads into revenue">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Lead</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Lead</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Company *</Label><Input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} placeholder="Acme Ltd" /></div>
                  <div><Label>Contact Name *</Label><Input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))} placeholder="Jane Obi" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></div>
                  <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Source</Label>
                    <Select value={form.source} onValueChange={v => setForm(p => ({ ...p, source: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["manual", "web", "referral", "whatsapp", "trade_fair", "partner", "api"].map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Industry</Label><Input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} placeholder="FMCG" /></div>
                  <div><Label>Expected Value (₦)</Label><Input type="number" value={form.expected_value} onChange={e => setForm(p => ({ ...p, expected_value: e.target.value }))} /></div>
                </div>
                <div><Label>Territory</Label><Input value={form.territory} onChange={e => setForm(p => ({ ...p, territory: e.target.value }))} placeholder="Lagos West" /></div>
                <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Lead</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stage tabs */}
        <Tabs value={stageFilter} onValueChange={setStageFilter}>
          <TabsList className="flex-wrap h-auto gap-1">
            {Object.entries(stageCounts).map(([k, v]) => (
              <TabsTrigger key={k} value={k} className="gap-1">{k === "all" ? "All" : k.charAt(0).toUpperCase() + k.slice(1)} <Badge variant="secondary" className="text-[10px] ml-1">{v}</Badge></TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search leads..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Leads table */}
        <Card>
          {filtered.length === 0 ? (
            <CardContent className="py-12 text-center">
              <UserPlus className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No leads found</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first lead to start building your pipeline</p>
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add First Lead</Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead className="text-right">Expected Value</TableHead>
                  <TableHead>Territory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(l => (
                  <TableRow key={l.id} className="hover:bg-muted/30 cursor-pointer">
                    <TableCell>
                      <p className="font-semibold text-sm">{l.company_name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.industry || "-"}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{l.contact_name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {l.email && <Mail className="w-3 h-3 text-muted-foreground" />}
                        {l.phone && <Phone className="w-3 h-3 text-muted-foreground" />}
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{l.source}</Badge></TableCell>
                    <TableCell><Badge className={`text-[10px] ${stageColors[l.stage || "new"] || "bg-muted"}`}>{l.stage}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500" />
                        <span className="text-sm font-medium">{l.score || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">₦{((l.expected_value || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.territory || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default SalesLeads;
