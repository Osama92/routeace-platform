import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useSalesOS } from "@/hooks/useSalesOS";
import { Building2, Search, Plus, ArrowLeft, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SalesAccounts = () => {
  const navigate = useNavigate();
  const { accounts, createAccount } = useSalesOS();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({
    account_name: "", account_type: "retailer", address: "", city: "", state: "",
    country: "Nigeria", tier: "standard", credit_limit: "", territory: "",
  });

  const filtered = accounts.filter(a => !search || a.account_name.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    if (!form.account_name) return;
    await createAccount({ ...form, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : 0 } as any);
    setOpen(false);
    setForm({ account_name: "", account_type: "retailer", address: "", city: "", state: "", country: "Nigeria", tier: "standard", credit_limit: "", territory: "" });
  };

  return (
    <DashboardLayout title="Sales Accounts" subtitle="Manage customer, distributor, and outlet accounts">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/sales/dashboard")}><ArrowLeft className="w-4 h-4 mr-1" /> Sales OS</Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> New Account</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create Account</DialogTitle></DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Account Name *</Label><Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} /></div>
                  <div><Label>Type</Label>
                    <Select value={form.account_type} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["retailer", "distributor", "dealer", "wholesaler", "hospital", "pharmacy", "contractor", "enterprise"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Address</Label><Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>City</Label><Input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></div>
                  <div><Label>State</Label><Input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} /></div>
                  <div><Label>Tier</Label>
                    <Select value={form.tier} onValueChange={v => setForm(p => ({ ...p, tier: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["standard", "silver", "gold", "platinum", "strategic"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Credit Limit (₦)</Label><Input type="number" value={form.credit_limit} onChange={e => setForm(p => ({ ...p, credit_limit: e.target.value }))} /></div>
                  <div><Label>Territory</Label><Input value={form.territory} onChange={e => setForm(p => ({ ...p, territory: e.target.value }))} /></div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate}>Create Account</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <Card>
          {filtered.length === 0 ? (
            <CardContent className="py-12 text-center">
              <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm mb-2">No accounts yet</p>
              <Button size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-1" /> Add First Account</Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Territory</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id} className="hover:bg-muted/30">
                    <TableCell className="font-semibold text-sm">{a.account_name}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.account_type}</Badge></TableCell>
                    <TableCell className="text-xs"><MapPin className="w-3 h-3 inline mr-1" />{a.city || a.state || a.country || "-"}</TableCell>
                    <TableCell><Badge className={`text-[10px] ${a.tier === "strategic" ? "bg-amber-100 text-amber-800" : a.tier === "platinum" ? "bg-violet-100 text-violet-800" : "bg-muted text-muted-foreground"}`}>{a.tier}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.territory || "-"}</TableCell>
                    <TableCell className="text-right font-bold text-sm">₦{((a.total_revenue || 0) / 1000).toFixed(0)}K</TableCell>
                    <TableCell className="text-right text-sm">{a.total_orders || 0}</TableCell>
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

export default SalesAccounts;
