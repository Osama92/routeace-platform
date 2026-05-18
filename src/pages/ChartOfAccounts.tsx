import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Plus, Search, Edit, Trash2, ChevronRight, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ACCOUNT_TYPES = [
  { value: "asset", label: "Asset", color: "bg-blue-500/15 text-blue-600" },
  { value: "liability", label: "Liability", color: "bg-red-500/15 text-red-600" },
  { value: "equity", label: "Equity", color: "bg-purple-500/15 text-purple-600" },
  { value: "revenue", label: "Revenue", color: "bg-green-500/15 text-green-600" },
  { value: "cogs", label: "COGS", color: "bg-orange-500/15 text-orange-600" },
  { value: "expense", label: "Expense", color: "bg-amber-500/15 text-amber-600" },
  { value: "other_income", label: "Other Income", color: "bg-emerald-500/15 text-emerald-600" },
  { value: "other_expense", label: "Other Expense", color: "bg-rose-500/15 text-rose-600" },
];

const typeBadge = (type: string) => {
  const t = ACCOUNT_TYPES.find(a => a.value === type);
  return <Badge className={t?.color || "bg-muted"}>{t?.label || type}</Badge>;
};

export default function ChartOfAccounts() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ account_code: "", account_name: "", account_type: "asset", account_group: "", normal_balance: "Dr", description: "", parent_account_id: "none" });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chart_of_accounts").select("*").order("account_code");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (values: typeof form) => {
      const payload = {
        account_code: values.account_code,
        account_name: values.account_name,
        account_type: values.account_type,
        account_group: values.account_group || null,
        normal_balance: values.normal_balance,
        description: values.description || null,
        parent_account_id: values.parent_account_id === "none" || !values.parent_account_id ? null : values.parent_account_id,
      };
      if (editing) {
        const { error } = await supabase.from("chart_of_accounts").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chart_of_accounts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: editing ? "Account Updated" : "Account Created" });
      closeDialog();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chart_of_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
      toast({ title: "Account Deleted" });
    },
  });

  const closeDialog = () => {
    setDialog(false);
    setEditing(null);
    setForm({ account_code: "", account_name: "", account_type: "asset", account_group: "", normal_balance: "Dr", description: "", parent_account_id: "none" });
  };

  const openEdit = (acct: any) => {
    setEditing(acct);
    setForm({
      account_code: acct.account_code,
      account_name: acct.account_name,
      account_type: acct.account_type,
      account_group: acct.account_group || "",
      normal_balance: acct.normal_balance,
      description: acct.description || "",
      parent_account_id: acct.parent_account_id || "none",
    });
    setDialog(true);
  };

  const filtered = accounts.filter(a => {
    const matchSearch = !search || a.account_name.toLowerCase().includes(search.toLowerCase()) || a.account_code.includes(search);
    const matchType = filterType === "all" || a.account_type === filterType;
    return matchSearch && matchType;
  });

  // Group by account_type for summary
  const typeSummary = ACCOUNT_TYPES.map(t => ({
    ...t,
    count: accounts.filter(a => a.account_type === t.value).length,
  }));

  return (
    <DashboardLayout title="Chart of Accounts" subtitle="IFRS-compliant account hierarchy - configurable per tenant">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {typeSummary.filter(t => t.count > 0).map(t => (
          <Card key={t.value} className="border-border/50 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setFilterType(t.value)}>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{t.count}</p>
                <p className="text-xs text-muted-foreground">{t.label} Accounts</p>
              </div>
              <Badge className={t.color}>{t.label}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-secondary/50" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button onClick={() => { setEditing(null); setDialog(true); }}><Plus className="w-4 h-4 mr-1" />Add Account</Button>
        <Button variant="outline"><Download className="w-4 h-4 mr-1" />Export</Button>
      </div>

      {/* Accounts Table */}
      <Card className="border-border/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50">
                <TableHead>Code</TableHead>
                <TableHead>Account Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Normal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No accounts found</TableCell></TableRow>
              ) : filtered.map(acct => (
                <TableRow key={acct.id} className="border-border/50">
                  <TableCell className="font-mono text-sm font-medium">{acct.account_code}</TableCell>
                  <TableCell className="font-medium">{acct.account_name}</TableCell>
                  <TableCell>{typeBadge(acct.account_type)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{acct.account_group || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{acct.normal_balance}</Badge></TableCell>
                  <TableCell>{acct.is_active ? <Badge className="bg-green-500/15 text-green-600">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
                  <TableCell className="text-right">
                    {!acct.is_system && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(acct)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteMutation.mutate(acct.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                    {acct.is_system && <span className="text-xs text-muted-foreground">System</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialog} onOpenChange={v => { if (!v) closeDialog(); else setDialog(true); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Account Code *</Label><Input value={form.account_code} onChange={e => setForm(p => ({ ...p, account_code: e.target.value }))} placeholder="e.g. 1000" /></div>
              <div className="space-y-1"><Label>Normal Balance</Label>
                <Select value={form.normal_balance} onValueChange={v => setForm(p => ({ ...p, normal_balance: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Dr">Debit (Dr)</SelectItem><SelectItem value="Cr">Credit (Cr)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Account Name *</Label><Input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="e.g. Cash & Bank" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Account Type *</Label>
                <Select value={form.account_type} onValueChange={v => setForm(p => ({ ...p, account_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Group</Label><Input value={form.account_group} onChange={e => setForm(p => ({ ...p, account_group: e.target.value }))} placeholder="e.g. Current Assets" /></div>
            </div>
            <div className="space-y-1"><Label>Parent Account</Label>
              <Select value={form.parent_account_id} onValueChange={v => setForm(p => ({ ...p, parent_account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {accounts.filter(a => a.id !== editing?.id).map(a => <SelectItem key={a.id} value={a.id}>{a.account_code} - {a.account_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
