import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Filter,
  Download,
  FileText,
  Send,
  MoreVertical,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  Plus,
  RefreshCw,
  CloudUpload,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InvoicePreviewDialog } from "@/components/invoice/InvoicePreviewDialog";
import { InvoiceCreationDialog } from "@/components/invoice/InvoiceCreationDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Invoice {
  id: string;
  invoice_number: string;
  customer_id: string;
  dispatch_id: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  notes: string | null;
  created_at: string;
  zoho_invoice_id?: string | null;
  zoho_synced_at?: string | null;
  status_updated_at?: string | null;
  customers?: { company_name: string };
  dispatches?: { pickup_address: string; delivery_address: string; distance_km: number | null } | null;
}

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; color: string; bg: string }> = {
  paid: { label: "Paid", icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  posted: { label: "Posted", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  partially_paid: { label: "Partial", icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  draft: { label: "Draft", icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-muted-foreground", bg: "bg-muted" },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0 }).format(amount);

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { hasAnyRole } = useAuth();

  const canManage = hasAnyRole(["admin", "operations", "finance_manager", "org_admin", "super_admin"]);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`*, customers(company_name), dispatches(pickup_address, delivery_address, distance_km)`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const processedInvoices = (data || []).map((inv: any) => {
        if (inv.status === "pending" && inv.due_date && new Date(inv.due_date) < now) {
          return { ...inv, status: "overdue" };
        }
        return inv;
      });

      setInvoices(processedInvoices);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const updateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      const updateData: any = { status: newStatus, status_updated_at: new Date().toISOString() };
      if (newStatus === "paid") updateData.paid_date = new Date().toISOString();
      const { error } = await supabase.from("invoices").update(updateData).eq("id", invoiceId);
      if (error) throw error;
      toast({ title: "Status Updated", description: `Invoice marked as ${newStatus}` });
      fetchInvoices();
      setSelectedInvoice(null);
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    }
  };

  const syncToZoho = async (invoiceId?: string) => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('zoho-sync', {
        body: { action: invoiceId ? 'sync_invoice' : 'sync_all_invoices', invoiceId },
      });
      if (error) throw error;
      if (data.success) {
        toast({ title: "Synced to Zoho", description: invoiceId ? "Invoice synced" : `Synced ${data.synced} invoices` });
        fetchInvoices();
      } else throw new Error(data.error);
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to sync", variant: "destructive" });
    } finally { setSyncing(false); }
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.customers?.company_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = {
    total: invoices.reduce((acc, inv) => acc + inv.total_amount, 0),
    paid: invoices.filter(inv => inv.status === "paid").reduce((acc, inv) => acc + inv.total_amount, 0),
    pending: invoices.filter(inv => inv.status === "pending").reduce((acc, inv) => acc + inv.total_amount, 0),
    overdue: invoices.filter(inv => inv.status === "overdue").reduce((acc, inv) => acc + inv.total_amount, 0),
  };

  const collectionRate = totals.total > 0 ? Math.round((totals.paid / totals.total) * 100) : 0;

  return (
    <DashboardLayout title="Invoices" subtitle="Manage billing, track payments, and optimize collections">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total Revenue", value: formatCurrency(totals.total), icon: DollarSign, iconColor: "text-primary", iconBg: "bg-primary/10", change: null },
          { label: "Collected", value: formatCurrency(totals.paid), icon: CheckCircle, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10", change: null },
          { label: "Pending", value: formatCurrency(totals.pending), icon: Clock, iconColor: "text-amber-500", iconBg: "bg-amber-500/10", change: null },
          { label: "Overdue", value: formatCurrency(totals.overdue), icon: AlertTriangle, iconColor: "text-destructive", iconBg: "bg-destructive/10", change: null },
          { label: "Collection Rate", value: `${collectionRate}%`, icon: TrendingUp, iconColor: collectionRate > 70 ? "text-emerald-500" : "text-amber-500", iconBg: collectionRate > 70 ? "bg-emerald-500/10" : "bg-amber-500/10", change: null },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Card className="border-border/50 hover:border-border transition-colors">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                  {stat.change && (
                    <Badge variant="secondary" className="text-xs">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" />{stat.change}
                    </Badge>
                  )}
                </div>
                <p className="text-2xl font-bold font-heading">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Actions Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          {hasAnyRole(["admin"]) && (
            <Button variant="outline" size="sm" onClick={() => syncToZoho()} disabled={syncing}>
              {syncing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <CloudUpload className="w-4 h-4 mr-2" />}
              Sync to Zoho
            </Button>
          )}
          {canManage && (
            <>
              <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
              <InvoiceCreationDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onSuccess={fetchInvoices} />
            </>
          )}
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Export</Button>
        </div>
      </div>

      {/* Invoices Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/30">
                  <TableHead className="text-muted-foreground font-medium">Invoice</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Client</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Route</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Amount</TableHead>
                  <TableHead className="text-muted-foreground font-medium">Status</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden md:table-cell">Due Date</TableHead>
                  <TableHead className="text-muted-foreground font-medium hidden lg:table-cell">Zoho</TableHead>
                  <TableHead className="text-right text-muted-foreground font-medium">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground font-medium">No invoices found</p>
                      <p className="text-sm text-muted-foreground/70 mt-1">Create your first invoice to get started</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((invoice, index) => {
                    const status = statusConfig[invoice.status] || statusConfig.draft;
                    const StatusIcon = status.icon;
                    return (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.2, delay: index * 0.02 }}
                        className="border-border/30 hover:bg-muted/30 transition-colors group cursor-pointer"
                        onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true); }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-semibold text-sm">{invoice.invoice_number}</p>
                            <p className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleDateString()}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">{invoice.customers?.company_name || 'N/A'}</p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {invoice.dispatches ? (
                            <span className="text-xs text-muted-foreground">
                              {invoice.dispatches.pickup_address?.split(',')[0]} → {invoice.dispatches.delivery_address?.split(',')[0]}
                            </span>
                          ) : <span className="text-muted-foreground/50">-</span>}
                        </TableCell>
                        <TableCell>
                          <p className="font-bold text-sm">{formatCurrency(invoice.total_amount)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${status.bg} ${status.color} border-0 font-medium`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {invoice.zoho_invoice_id ? (
                            <Badge variant="outline" className="text-xs text-emerald-500 border-emerald-500/30">Synced</Badge>
                          ) : (
                            <span className="text-muted-foreground/50 text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedInvoice(invoice); setIsPreviewOpen(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canManage && (
                                  <DropdownMenuItem onClick={() => toast({ title: "Invoice Sent", description: `Sent to ${invoice.customers?.company_name}` })}>
                                    <Send className="w-4 h-4 mr-2" />Send Invoice
                                  </DropdownMenuItem>
                                )}
                                {hasAnyRole(["admin", "finance_manager", "org_admin", "super_admin"]) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'paid')}>
                                      <CheckCircle className="w-4 h-4 mr-2 text-emerald-500" />Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'pending')}>
                                      <Clock className="w-4 h-4 mr-2 text-amber-500" />Mark as Pending
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => updateInvoiceStatus(invoice.id, 'overdue')}>
                                      <XCircle className="w-4 h-4 mr-2 text-destructive" />Mark as Overdue
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {!invoice.zoho_invoice_id && (
                                      <DropdownMenuItem onClick={() => syncToZoho(invoice.id)}>
                                        <CloudUpload className="w-4 h-4 mr-2" />Sync to Zoho
                                      </DropdownMenuItem>
                                    )}
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>

      <InvoicePreviewDialog
        invoice={selectedInvoice}
        open={isPreviewOpen}
        onClose={() => { setIsPreviewOpen(false); setSelectedInvoice(null); }}
        onStatusUpdate={fetchInvoices}
      />
    </DashboardLayout>
  );
};

export default InvoicesPage;
